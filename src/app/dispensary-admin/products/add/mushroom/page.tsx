
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Brain, AlertTriangle, ChevronsUpDown, Check as CheckIcon } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { cn } from '@/lib/utils';
import { MushroomProductCard } from '@/components/dispensary-admin/MushroomProductCard';
import { Alert } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';


const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit", "bottle" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

export default function AddMushroomProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { allDispensaries, isLoadingDispensaries } = useDispensaryAdmin();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [topLevelCategories, setTopLevelCategories] = useState<any[]>([]);
  const [selectedTopLevel, setSelectedTopLevel] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const secondStepRef = useRef<HTMLDivElement>(null);
  const finalFormRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: 'Mushroom', subcategory: null,
      priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      currency: currentDispensary?.currency || 'ZAR',
      productType: 'Mushroom',
      poolSharingRule: 'same_type',
      allowedPoolDispensaryIds: [],
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchPoolSharingRule = form.watch('poolSharingRule');
  const watchAllowedPoolIds = form.watch('allowedPoolDispensaryIds');
  
  const fetchCategoryStructure = useCallback(async () => {
    setIsLoadingInitialData(true);
    try {
      const q = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', "Mushroom store"), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const categories = data?.categoriesData?.mushroomProductCategories || [];
        setTopLevelCategories(categories);
      } else {
        toast({ title: 'Error', description: 'Could not find category structure for "Mushroom store".', variant: 'destructive' });
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
  
  const handleTopLevelSelect = (category: any) => {
    setSelectedTopLevel(category.category_name === selectedTopLevel?.category_name ? null : category);
    setSelectedProduct(null); // Reset product selection when top level changes
    form.setValue('name', '');
    form.setValue('description', '');
    form.setValue('subcategory', null);
    setTimeout(() => scrollToRef(secondStepRef), 100);
  };

  const handleProductSelect = (product: any, format: string) => {
    setSelectedProduct(product);
    form.setValue('name', `${product.name} (${format})`);
    form.setValue('description', product.description);
    form.setValue('subcategory', product.sub_category);
    form.setValue('baseProductData', product);
    form.setValue('tags', product.benefits || []);
    setTimeout(() => scrollToRef(finalFormRef), 100);
  };

  const getProductCollectionName = (): string => {
    return 'mushroom_store_products';
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
            imageUrl: uploadedImageUrls[0] || selectedProduct.imageUrl || null,
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
        <div className="max-w-5xl mx-auto my-8 p-6 space-y-6">
            <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div>
            <Skeleton className="h-8 w-1/2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                <Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" />
            </div>
        </div>
     );
  }
  
  const showFinalForm = !!selectedProduct;

  return (
    <div className="max-w-7xl mx-auto my-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Brain className="h-8 w-8 text-primary"/> Add Mushroom Product</h1>
          <p className="text-muted-foreground mt-1">Follow the steps to add your mushroom product.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
                <CardHeader><CardTitle>Step 1: Select a Product Category</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topLevelCategories.map((cat, index) => (
                        <Card 
                            key={index} 
                            onClick={() => handleTopLevelSelect(cat)}
                            className={cn(
                                "cursor-pointer hover:border-primary flex flex-col group overflow-hidden transition-all duration-200", 
                                selectedTopLevel?.category_name === cat.category_name && 'border-primary ring-2 ring-primary'
                            )}
                        >
                            <CardHeader className="p-0">
                                <div className="w-full bg-muted">
                                    <Image
                                        src={cat.imageUrl}
                                        alt={cat.category_name}
                                        width={768}
                                        height={512}
                                        layout="responsive"
                                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 flex-grow flex flex-col">
                                <h3 className="text-lg font-semibold">{cat.category_name}</h3>
                                <p className="text-sm text-muted-foreground mt-1 flex-grow">{cat.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>

            {selectedTopLevel && (
                <div className="animate-fade-in-scale-up space-y-6" ref={secondStepRef}>
                    <Separator />
                    <h3 className="text-2xl font-bold">Step 2: Select a Specific Product from <span className="text-primary">{selectedTopLevel.category_name}</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {selectedTopLevel.products.map((product: any, index: number) => (
                            <MushroomProductCard 
                                key={index} 
                                product={product} 
                                onSelect={handleProductSelect}
                            />
                        ))}
                    </div>
                </div>
            )}


            <div ref={finalFormRef}>
              {showFinalForm && (
                  <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                      <Separator />
                      <h3 className="text-2xl font-bold border-b pb-2">Step 3: Finalize Product Details</h3>

                      {selectedTopLevel?.category_name === 'Shamanic Mushrooms' && (
                        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <CardTitle className="text-red-700 text-lg">Legal & Responsibility Disclaimer</CardTitle>
                          <CardDescription className="text-red-600 space-y-2 mt-2">
                            <p>The Wellness Tree complies with South African Law, which prohibits the sale of certain psychoactive substances. Adding any illegal products to your store is strictly forbidden.</p>
                            <p className="font-semibold">The Wellness Tree does not monitor your store inventory. The sole responsibility for ensuring all listed products are legal rests with you, the store owner.</p>
                          </CardDescription>
                        </Alert>
                      )}

                      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                      
                      <div className="space-y-6">
                          <Separator />
                          <h3 className="text-xl font-semibold border-b pb-2">Pricing, Stock & Visibility</h3>
                          <div className="space-y-4">
                          {priceTierFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 border rounded-md relative bg-muted/30">
                                  <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                                  <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                  <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                  {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                              </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '' })}>Add Price Tier</Button>
                          </div>
                          <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other stores of the same type to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                          {watchIsAvailableForPool && (
                             <Card className="p-4 bg-muted/50 space-y-4">
                              <FormField control={form.control} name="poolSharingRule" render={({ field }) => (
                                  <FormItem>
                                      <FormLabel className="text-base">Pool Sharing Rule *</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value || 'same_type'}>
                                          <FormControl><SelectTrigger><SelectValue placeholder="Select how to share this product" /></SelectTrigger></FormControl>
                                          <SelectContent>
                                              <SelectItem value="same_type">Share with all dispensaries in my Wellness type</SelectItem>
                                              <SelectItem value="all_types">Share with all Wellness types</SelectItem>
                                              <SelectItem value="specific_stores">Share with specific stores only</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <FormMessage />
                                  </FormItem>
                              )}/>

                              {watchPoolSharingRule === 'specific_stores' && (
                                  <FormField control={form.control} name="allowedPoolDispensaryIds" render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Select Specific Stores</FormLabel>
                                          <Popover>
                                              <PopoverTrigger asChild>
                                                  <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isLoadingDispensaries}>
                                                      {watchAllowedPoolIds && watchAllowedPoolIds.length > 0 ? `${watchAllowedPoolIds.length} store(s) selected` : "Select stores..."}
                                                      {isLoadingDispensaries ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                                                  </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                  <Command>
                                                      <CommandInput placeholder="Search for a store..." />
                                                      <CommandList>
                                                          <CommandEmpty>No stores found.</CommandEmpty>
                                                          <CommandGroup>
                                                              {allDispensaries.map(dispensary => (
                                                                  <CommandItem
                                                                      key={dispensary.id}
                                                                      value={dispensary.id}
                                                                      onSelect={(currentValue) => {
                                                                          const currentIds = field.value || [];
                                                                          const newIds = currentIds.includes(currentValue)
                                                                              ? currentIds.filter(id => id !== currentValue)
                                                                              : [...currentIds, currentValue];
                                                                          field.onChange(newIds);
                                                                      }}
                                                                  >
                                                                      <CheckIcon className={cn("mr-2 h-4 w-4", field.value?.includes(dispensary.id!) ? "opacity-100" : "opacity-0")} />
                                                                      {dispensary.dispensaryName}
                                                                  </CommandItem>
                                                              ))}
                                                          </CommandGroup>
                                                      </CommandList>
                                                  </Command>
                                              </PopoverContent>
                                          </Popover>
                                          <div className="flex flex-wrap gap-1 pt-2">
                                              {watchAllowedPoolIds?.map(id => {
                                                  const dispensary = allDispensaries.find(d => d.id === id);
                                                  return dispensary ? <Badge key={id} variant="secondary">{dispensary.dispensaryName}</Badge> : null;
                                              })}
                                          </div>
                                          <FormMessage/>
                                      </FormItem>
                                  )}/>
                              )}

                              <CardHeader className="p-0 mb-2"><CardTitle className="text-lg">Pool Pricing Tiers *</CardTitle><CardDescription>Define pricing for bulk transfers to other stores.</CardDescription></CardHeader>
                              <CardContent className="p-0 space-y-2">
                                  {poolPriceTierFields.map((field, index) => (
                                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-3 border rounded-md relative bg-background">
                                      <FormField control={form.control} name={`poolPriceTiers.${index}.unit`} render={({ field: f }) => (<FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="pool-units-list" /></FormControl><FormMessage /></FormItem>)} />
                                      <FormField control={form.control} name={`poolPriceTiers.${index}.price`} render={({ field: f }) => (<FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                      {poolPriceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePoolPriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                                  </div>
                                  ))}
                                  <Button type="button" variant="outline" size="sm" onClick={() => appendPoolPriceTier({ unit: '', price: '' as any, quantityInStock: 0, description: '' })}>Add Pool Price Tier</Button>
                              </CardContent>
                            </Card>
                          )}
                          <Separator />
                          <h3 className="text-xl font-semibold border-b pb-2">Images & Tags</h3>
                          <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. The first will be the main one. If none are uploaded, the base product image will be used.</FormDescription><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
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
