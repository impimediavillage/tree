

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useDispensaryAdmin } from '@/contexts/DispensaryAdminContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query as firestoreQuery, where, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Product as ProductType, Dispensary } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Leaf, ChevronsUpDown, Check, Users } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const regularUnits = [ "gram", "kg", "ml", "litre", "unit", "pack", "box", "seedling", "cutting", "plant", "bag" ];
const poolUnits = [ "10kg", "25kg", "50kg", "100 litres", "200 litres", "pallet", "crate" ];

interface PermacultureCategory {
  imageUrl: string;
  description: string;
  subcategories: Record<string, {
    imageUrl: string;
    description: string;
  }>;
}

export default function AddPermacultureProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { allDispensaries, isLoadingDispensaries } = useDispensaryAdmin();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [categoryStructure, setCategoryStructure] = useState<Record<string, PermacultureCategory>>({});
  const [selectedTopLevelCategory, setSelectedTopLevelCategory] = useState<string | null>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const secondStepRef = useRef<HTMLDivElement>(null);
  const finalFormRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null,
      priceTiers: [],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      currency: currentDispensary?.currency || 'ZAR',
      productType: 'Permaculture & Gardening',
      poolSharingRule: 'same_type',
      allowedPoolDispensaryIds: [],
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchPoolSharingRule = form.watch('poolSharingRule');
  
  const fetchCategoryStructure = useCallback(async () => {
    setIsLoadingInitialData(true);
    try {
      const q = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', "Permaculture & gardening store"), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const categories = data?.categoriesData?.PermacultureOrganicProducts?.PermacultureOrganicProducts || {};
        setCategoryStructure(categories);
      } else {
        toast({ title: 'Error', description: 'Could not find category structure for "Permaculture & gardening store".', variant: 'destructive' });
      }
    } catch (error) {
      console.error("Error fetching category structure:", error);
      toast({ title: 'Error', description: 'Failed to load product categories.', variant: 'destructive' });
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchCategoryStructure();
  }, [fetchCategoryStructure]);


  const scrollToRef = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleTopLevelSelect = (categoryName: string) => {
    setSelectedTopLevelCategory(categoryName);
    form.setValue('category', categoryName, { shouldValidate: true });
    form.setValue('subcategory', null); // Reset subcategory when top level changes
    setTimeout(() => scrollToRef(secondStepRef), 100);
  };
  
  const handleSubCategorySelect = (subCategoryName: string) => {
    form.setValue('subcategory', subCategoryName, { shouldValidate: true });
    setTimeout(() => scrollToRef(finalFormRef), 100);
  }

  const getProductCollectionName = (): string => {
    return 'permaculture_store_products';
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentDispensary || !currentUser || !currentDispensary.dispensaryType) {
      toast({ title: "Error", description: "Cannot submit without dispensary data and type.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
        let uploadedImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading Images...", description: "Please wait...", variant: "default" });
            const uploadPromises = files.map(file => {
                const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`);
                return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
            uploadedImageUrls = await Promise.all(uploadPromises);
        }

        const totalStock = data.priceTiers.reduce((acc, tier) => acc + (Number(tier.quantityInStock) || 0), 0);
        
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
        );

        const productData: Omit<ProductType, 'id'> = {
            ...(sanitizedData as ProductFormData),
            dispensaryId: currentUser.dispensaryId!,
            dispensaryName: currentDispensary.dispensaryName,
            dispensaryType: currentDispensary.dispensaryType,
            productOwnerEmail: currentUser.email,
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
            quantityInStock: totalStock,
            imageUrls: uploadedImageUrls,
            imageUrl: uploadedImageUrls[0] || null,
        };
        
        const collectionName = getProductCollectionName();
        await addDoc(collection(db, collectionName), productData);

        toast({ title: "Success!", description: `Product "${data.name}" has been created.` });
        router.push('/dispensary-admin/products');
    } catch (error) {
        console.error("Error creating product:", error);
        toast({ title: "Creation Failed", description: "An error occurred while creating the product.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (authLoading || isLoadingInitialData) {
     return (
        <div className="max-w-4xl mx-auto my-8 p-6 space-y-6">
            <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div>
            <Skeleton className="h-8 w-1/2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                <Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" />
            </div>
        </div>
     );
  }

  const showSubcategories = selectedTopLevelCategory && categoryStructure[selectedTopLevelCategory]?.subcategories;
  const showFinalForm = selectedTopLevelCategory && form.watch('subcategory');

  return (
    <div className="max-w-5xl mx-auto my-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Leaf className="h-8 w-8 text-primary"/> Add Permaculture Product</h1>
          <p className="text-muted-foreground mt-1">Follow the steps to add your product.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
                <CardHeader><CardTitle>Step 1: Select a Top-Level Category</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(categoryStructure).map(([categoryName, categoryData]) => {
                         const placeholderUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(categoryName)}`;
                         const imageUrl = categoryData.imageUrl && categoryData.imageUrl.trim() !== '' ? categoryData.imageUrl : placeholderUrl;
                        return (
                            <Card 
                                key={categoryName} 
                                onClick={() => handleTopLevelSelect(categoryName)} 
                                className={cn(
                                    "cursor-pointer hover:border-primary flex flex-col group overflow-hidden transition-all duration-200", 
                                    form.watch('category') === categoryName && 'border-primary ring-2 ring-primary'
                                )}
                            >
                                <CardHeader className="p-0">
                                    <div className="w-full bg-muted">
                                        <Image
                                            src={imageUrl}
                                            alt={categoryName}
                                            width={768}
                                            height={512}
                                            layout="responsive"
                                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => { e.currentTarget.srcset = placeholderUrl; e.currentTarget.src = placeholderUrl; }}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow flex flex-col">
                                    <h3 className="text-lg font-semibold">{categoryName}</h3>
                                    <p className="text-sm text-muted-foreground mt-1 flex-grow">{categoryData.description}</p>
                                </CardContent>
                            </Card>
                        )
                    })}
                </CardContent>
            </Card>

            {showSubcategories && (
                <div className="animate-fade-in-scale-up" ref={secondStepRef}>
                    <Card>
                        <CardHeader>
                          <CardTitle>
                            Step 2: Select a Subcategory for <span className="text-primary">{selectedTopLevelCategory}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(showSubcategories).map(([subCategoryName, subCategoryData]) => {
                                const placeholderUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(subCategoryName)}`;
                                const imageUrl = subCategoryData.imageUrl && subCategoryData.imageUrl.trim() !== '' ? subCategoryData.imageUrl : placeholderUrl;
                                return (
                                    <Card 
                                        key={subCategoryName} 
                                        onClick={() => handleSubCategorySelect(subCategoryName)}
                                        className={cn(
                                            "cursor-pointer hover:border-primary flex flex-col group overflow-hidden transition-all duration-200",
                                            form.watch('subcategory') === subCategoryName && 'border-primary ring-2 ring-primary'
                                        )}
                                    >
                                        <CardHeader className="p-0">
                                            <div className="w-full bg-muted">
                                                <Image
                                                    src={imageUrl}
                                                    alt={subCategoryName}
                                                    width={768}
                                                    height={512}
                                                    layout="responsive"
                                                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                                                    onError={(e) => { e.currentTarget.srcset = placeholderUrl; e.currentTarget.src = placeholderUrl; }}
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 flex-grow flex flex-col">
                                            <h3 className="text-lg font-semibold">{subCategoryName}</h3>
                                            <p className="text-sm text-muted-foreground mt-1 flex-grow">{subCategoryData.description}</p>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
            )}

            <div ref={finalFormRef}>
              {showFinalForm && (
                  <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                      <Separator />
                      <h3 className="text-2xl font-semibold border-b pb-2">Step 3: Finalize Product Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-md border">
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Input value={form.getValues('category')} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" />
                        </FormItem>
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <Input value={form.getValues('subcategory') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" />
                        </FormItem>
                      </div>

                      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                      
                      <div className="space-y-6">
                          <Separator />
                          <h3 className="text-xl font-semibold border-b pb-2">Pricing & Stock</h3>
                          <div className="space-y-4">
                          {priceTierFields.map((field, index) => (
                             <Card key={field.id} className="p-4 bg-muted/30 relative">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                    <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                <Collapsible className="mt-4">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="flex items-center w-full justify-start p-2 -ml-2">
                                            <ChevronsUpDown className="h-4 w-4 mr-2" />
                                            <span className="text-md font-semibold">Packaging Details</span>
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="animate-fade-in-scale-up">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start pt-2">
                                            <FormField control={form.control} name={`priceTiers.${index}.weight`} render={({ field: f }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.001" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={form.control} name={`priceTiers.${index}.length`} render={({ field: f }) => ( <FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={form.control} name={`priceTiers.${index}.width`} render={({ field: f }) => ( <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                            <FormField control={form.control} name={`priceTiers.${index}.height`} render={({ field: f }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                                {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                              </Card>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '', weight: null, length: null, width: null, height: null })}>Add Price Tier</Button>
                          </div>
                          <Separator />
                            <h3 className="text-xl font-semibold border-b pb-2">Product Pool Settings</h3>
                            <FormField control={form.control} name="isAvailableForPool" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Available for Product Pool</FormLabel>
                                        <FormDescription>Make this product available for other dispensaries to purchase in bulk.</FormDescription>
                                    </div>
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />

                            {watchIsAvailableForPool && (
                                <Card className="p-4 bg-muted/50 animate-fade-in-scale-up">
                                    <CardHeader className="p-2 pt-0">
                                        <CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5" /> Pool Pricing Tiers</CardTitle>
                                        <CardDescription>Define pricing for bulk purchases by other dispensaries.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 p-2">
                                        {poolPriceTierFields.map((field, index) => (
                                            <Card key={field.id} className="p-4 bg-background relative">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                                    <FormField control={form.control} name={`poolPriceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="pool-units-list" /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name={`poolPriceTiers.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                                    <FormField control={form.control} name={`poolPriceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                                </div>
                                                <Collapsible className="mt-4">
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" className="flex items-center w-full justify-start p-2 -ml-2">
                                                            <ChevronsUpDown className="h-4 w-4 mr-2" />
                                                            <span className="text-md font-semibold">Packaging Details</span>
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="animate-fade-in-scale-up">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start pt-2">
                                                            <FormField control={form.control} name={`poolPriceTiers.${index}.weight`} render={({ field: f }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.001" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                                            <FormField control={form.control} name={`poolPriceTiers.${index}.length`} render={({ field: f }) => ( <FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                                            <FormField control={form.control} name={`poolPriceTiers.${index}.width`} render={({ field: f }) => ( <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                                            <FormField control={form.control} name={`poolPriceTiers.${index}.height`} render={({ field: f }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                                {poolPriceTierFields.length > 0 && <Button type="button" variant="ghost" size="icon" onClick={() => removePoolPriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                                            </Card>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={() => appendPoolPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '', weight: null, length: null, width: null, height: null })}>Add Pool Price Tier</Button>
                                    </CardContent>
                                </Card>
                            )}
                          <Separator />
                          <h3 className="text-xl font-semibold border-b pb-2">Images & Tags</h3>
                          <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, High-Yield" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                          <CardFooter className="p-0 pt-6">
                              <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                                  Add Product
                              </Button>
                          </CardFooter>
                      </div>
                  </div>
              )}
          </div>
          <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
          <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
        </form>
      </Form>
    </div>
  );
}
