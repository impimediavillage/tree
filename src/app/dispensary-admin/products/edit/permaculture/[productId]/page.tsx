'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

import { useAuth } from '@/contexts/AuthContext';
import { useDispensaryAdmin } from '@/contexts/DispensaryAdminContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, query as firestoreQuery, where, limit, getDocs, collection } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Product as ProductType } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Trash2, Leaf, ChevronsUpDown, Package, Save } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { cn, getProductCollectionName } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

const regularUnits = [ "gram", "kg", "ml", "litre", "unit", "pack", "box", "punnet", "seedling", "cutting", "plant", "bag" ];
const poolUnits = [ "10kg", "25kg", "50kg", "100 litres", "200 litres", "pallet", "crate" ];

interface PermacultureCategory {
  imageUrl: string;
  description: string;
  subcategories: Record<string, {
    imageUrl: string;
    description: string;
  }>;
}

export default function EditPermacultureProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { allDispensaries, isLoadingDispensaries } = useDispensaryAdmin();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<ProductType | null>(null);
  const [categoryStructure, setCategoryStructure] = useState<Record<string, PermacultureCategory>>({});
  
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '',
      category: 'Permaculture & Gardening',
      subcategory: '',
      subSubcategory: '',
      priceTiers: [],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      currency: 'ZAR',
      productType: 'Permaculture',
      poolSharingRule: 'same_type',
      allowedPoolDispensaryIds: [],
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });

  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchPoolSharingRule = form.watch('poolSharingRule');

  const fetchCategoryStructure = useCallback(async () => {
    try {
      const q = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', "Permaculture & gardening store"), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        setCategoryStructure(data?.categoriesData?.PermacultureOrganicProducts?.PermacultureOrganicProducts || {});
      }
    } catch (error) {
      console.error("Error fetching category structure:", error);
      toast({ title: 'Error', description: 'Failed to load product categories.', variant: 'destructive' });
    }
  }, [toast]);

  const fetchProduct = useCallback(async () => {
    if (!currentUser || !currentDispensary?.dispensaryType) return;
    try {
      const collectionName = getProductCollectionName(currentDispensary.dispensaryType);
      const docRef = doc(db, collectionName, productId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const productData = { id: docSnap.id, ...docSnap.data() } as ProductType;
        setProduct(productData);

        form.reset({
          ...productData,
          category: 'Permaculture & Gardening',
          subcategory: productData.subcategory || '',
          subSubcategory: productData.subSubcategory || '',
          priceTiers: productData.priceTiers?.length > 0 ? productData.priceTiers : [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '', weightKgs: null, lengthCm: null, widthCm: null, heightCm: null }],
          poolPriceTiers: productData.poolPriceTiers || [],
          allowedPoolDispensaryIds: productData.allowedPoolDispensaryIds || [],
        });

        setExistingImageUrls(productData.imageUrls || []);
        
      } else {
        toast({ title: "Not Found", description: "Product could not be found.", variant: "destructive" });
        router.push('/dispensary-admin/products');
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
      toast({ title: "Error", description: "Failed to load product data.", variant: "destructive" });
    }
  }, [productId, currentUser, currentDispensary, form, router, toast]);

  useEffect(() => {
    fetchCategoryStructure();
    fetchProduct();
  }, [fetchCategoryStructure, fetchProduct]);

  const onValidationErrors = (errors: any) => {
    console.error("Form validation errors:", errors);
    const errorKeys = Object.keys(errors);
    let firstErrorKey = errorKeys.find(key => errors[key] && typeof errors[key].message === 'string');
    let firstErrorMessage = firstErrorKey ? errors[firstErrorKey].message : 'An unknown validation error occurred.';
    
    if (!firstErrorKey) {
        const complexErrorKey = errorKeys.find(key => Array.isArray(errors[key]));
        if (complexErrorKey && Array.isArray(errors[complexErrorKey])) {
            const errorIndex = errors[complexErrorKey].findIndex((e: any) => e);
            if (errorIndex !== -1) {
                const fieldError = Object.keys(errors[complexErrorKey][errorIndex])[0];
                firstErrorMessage = errors[complexErrorKey][errorIndex][fieldError].message;
                firstErrorKey = `${complexErrorKey}[${errorIndex}].${fieldError}`;
            }
        }
    }
    toast({
        title: "Form Incomplete",
        description: `Please fix the error on '${firstErrorKey}': ${firstErrorMessage}`,
        variant: "destructive"
    });
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser || !currentDispensary?.dispensaryType) {
      toast({ title: "Authentication Error", description: "Cannot update product without user and dispensary type.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const collectionName = getProductCollectionName(currentDispensary.dispensaryType);
      const docRef = doc(db, collectionName, productId);
      
      let uploadedNewImageUrls: string[] = [];
      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map(file => {
          const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`);
          return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref));
        });
        uploadedNewImageUrls = await Promise.all(uploadPromises);
      }
      
      const allImageUrls = [...existingImageUrls, ...uploadedNewImageUrls];

      const totalStock = data.priceTiers.reduce((acc, tier) => acc + (Number(tier.quantityInStock) || 0), 0);
      
      const sanitizedData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
      );
      
      const productData = {
          ...(sanitizedData as ProductFormData),
          updatedAt: serverTimestamp(),
          quantityInStock: totalStock,
          imageUrls: allImageUrls,
          imageUrl: allImageUrls[0] || null,
      };

      await updateDoc(docRef, productData);
      
      toast({ title: "Success!", description: `Product "${data.name}" has been updated.` });
      router.push('/dispensary-admin/products');
    } catch (error) {
      console.error("Error updating product:", error);
      toast({ title: "Update Failed", description: "An error occurred while saving the product.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !product) {
    return (
      <div className="max-w-4xl mx-auto my-8 p-6 space-y-6">
        <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div>
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto my-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Leaf className="h-8 w-8 text-primary"/> Edit Product</h1>
          <p className="text-muted-foreground mt-1">Update the details for your permaculture product.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onValidationErrors)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Category Selection</CardTitle>
              <CardDescription>The category for this product is fixed. To change it, you must recreate the product in the correct category.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg border">
                <FormItem>
                  <FormLabel>Main Category</FormLabel>
                  <Input value={form.getValues('category')} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" />
                </FormItem>
                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Top-Level Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a top-level category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(categoryStructure).map(catName => (
                            <SelectItem key={catName} value={catName}>{catName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subSubcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch('subcategory')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a subcategory" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch('subcategory') && categoryStructure[form.watch('subcategory')]?.subcategories &&
                            Object.keys(categoryStructure[form.watch('subcategory')].subcategories).map(subCatName => (
                              <SelectItem key={subCatName} value={subCatName}>{subCatName}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Core Product Details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Pricing & Stock</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {priceTierFields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-md relative bg-muted/30 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                  </div>
                  {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full flex items-center justify-center space-x-2"><Package className="h-4 w-4"/><span>Packaging Details (Required for Delivery)</span><ChevronsUpDown className="h-4 w-4"/></Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end p-3 border rounded-md bg-background">
                        <FormField control={form.control} name={`priceTiers.${index}.weightKgs`} render={({ field: f }) => ( <FormItem><FormLabel>Weight (kgs)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`priceTiers.${index}.lengthCm`} render={({ field: f }) => ( <FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`priceTiers.${index}.widthCm`} render={({ field: f }) => ( <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`priceTiers.${index}.heightCm`} render={({ field: f }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '', weightKgs: null, lengthCm: null, widthCm: null, heightCm: null })}>Add Price Tier</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Product Pool Settings</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other stores to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                {watchIsAvailableForPool && (
                  <Card className="p-4 bg-muted/50 space-y-4">
                    <FormField control={form.control} name="poolSharingRule" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Pool Sharing Rule *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'same_type'}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select how to share" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="same_type">Share with all in my Wellness type</SelectItem>
                            <SelectItem value="all_types">Share with all Wellness types</SelectItem>
                            <SelectItem value="specific_stores">Share with specific stores only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    {watchPoolSharingRule === 'specific_stores' && (
                      <FormField control={form.control} name="allowedPoolDispensaryIds" render={({ field }) => (
                        <DispensarySelector 
                          allDispensaries={allDispensaries}
                          isLoading={isLoadingDispensaries}
                          selectedIds={field.value || []}
                          onSelectionChange={field.onChange}
                        />
                      )}/>
                    )}
                    <h4 className="text-md font-semibold pt-2">Pool Pricing Tiers *</h4>
                    {poolPriceTierFields.map((field, index) => (
                      <div key={field.id} className="p-3 border rounded-md relative bg-background space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <FormField control={form.control} name={`poolPriceTiers.${index}.unit`} render={({ field: f }) => (<FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="pool-units-list" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`poolPriceTiers.${index}.price`} render={({ field: f }) => (<FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`poolPriceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        {poolPriceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePoolPriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                         <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full flex items-center justify-center space-x-2"><Package className="h-4 w-4"/><span>Packaging Details (Required for Delivery)</span><ChevronsUpDown className="h-4 w-4"/></Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end p-3 border rounded-md bg-background">
                                    <FormField control={form.control} name={`poolPriceTiers.${index}.weightKgs`} render={({ field: f }) => ( <FormItem><FormLabel>Weight (kgs)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`poolPriceTiers.${index}.lengthCm`} render={({ field: f }) => ( <FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`poolPriceTiers.${index}.widthCm`} render={({ field: f }) => ( <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`poolPriceTiers.${index}.heightCm`} render={({ field: f }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPoolPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '', weightKgs: null, lengthCm: null, widthCm: null, heightCm: null })}>Add Pool Price Tier</Button>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Images & Tags</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormItem>
                <FormLabel>Product Images</FormLabel>
                <FormControl>
                  <MultiImageDropzone
                    value={newFiles}
                    onChange={setNewFiles}
                    existingImageUrls={existingImageUrls}
                    onExistingImageDelete={(url) => 
                      setExistingImageUrls(prev => prev.filter(u => u !== url))
                    }
                  />
                </FormControl>
                <FormDescription>Upload up to 5 images. The first will be the main one.</FormDescription>
                <FormMessage />
              </FormItem>
              <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, High-Yield" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
            </CardContent>
          </Card>

          <CardFooter className="p-0 pt-4 flex justify-between">
              <Button type="submit" size="lg" className="w-full text-lg bg-green-600 hover:bg-green-700" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save Changes
              </Button>
          </CardFooter>
          
          <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
          <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
        </form>
      </Form>
    </div>
  );
}