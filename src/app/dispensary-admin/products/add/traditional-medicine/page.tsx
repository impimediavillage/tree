
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useDispensaryAdmin } from '@/contexts/DispensaryAdminContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query as firestoreQuery, where, getDocs, limit } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Product as ProductType, Dispensary } from '@/types';
import { getProductCollectionName } from '@/lib/utils'; 

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Leaf, Shirt, ChevronsUpDown, Check } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { cn } from '@/lib/utils';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';


const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const apparelGenders = ['Mens', 'Womens', 'Unisex'];
const apparelTypes = ['T-Shirt', 'Hoodie', 'Cap', 'Jacket', 'Pants', 'Footwear', 'Underwear', 'Shorts', 'Scarves', 'Socks', 'Jewelry', 'Other'];
const sizingSystemOptions = ['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other'];
const standardSizesData: Record<string, Record<string, string[]>> = {
  'Mens': { 'UK/SA': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'], 'US': ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14', '15'], 'EURO': ['40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46', '47'], 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] },
  'Womens': { 'UK/SA': ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '9', '10'], 'US': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11', '12'], 'EURO': ['35.5', '36', '36.5', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '43'], 'Alpha (XS-XXXL)': ['XXS','XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  'Unisex': { 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] }
};


interface Category {
  useCase: string;
  imageUrl: string;
  categories: SubCategory[];
}
interface SubCategory {
  type: string;
  imageUrl: string;
  subtypes: string[];
}

export default function AddTraditionalMedicineProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { allDispensaries, isLoadingDispensaries } = useDispensaryAdmin();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [categoryStructure, setCategoryStructure] = useState<Category[]>([]);
  const [selectedTopLevelCategory, setSelectedTopLevelCategory] = useState<Category | null>(null);
  const [selectedSecondLevelCategory, setSelectedSecondLevelCategory] = useState<SubCategory | null>(null);
  const [isClothingStream, setIsClothingStream] = useState(false);
  
  const [files, setFiles] = useState<File[]>([]);
  
  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);
  
  const secondStepRef = useRef<HTMLDivElement>(null);
  const finalFormRef = useRef<HTMLDivElement>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null, subSubcategory: null,
      priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      currency: currentDispensary?.currency || 'ZAR',
      productType: 'Traditional Medicine',
      gender: undefined, sizingSystem: undefined, sizes: [],
      poolSharingRule: 'same_type',
      allowedPoolDispensaryIds: [],
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchGender = form.watch('gender');
  const watchSizingSystem = form.watch('sizingSystem');
  const watchPoolSharingRule = form.watch('poolSharingRule');

  const fetchCategoryStructure = useCallback(async () => {
    setIsLoadingInitialData(true);
    try {
      const q = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', "Traditional Medicine dispensary"), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        const categoriesObject = data?.categoriesData?.traditionalMedicineCategories;
        if (categoriesObject && typeof categoriesObject === 'object') {
          // Correctly convert the object of categories into an array
          setCategoryStructure(Object.values(categoriesObject));
        } else {
          setCategoryStructure([]);
          toast({ title: 'Error', description: 'Category data for Traditional Medicine is missing or in the wrong format.', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Error', description: 'Could not find category structure for "Traditional Medicine dispensary".', variant: 'destructive' });
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

  const handleTopLevelSelect = (category: Category) => {
    setIsClothingStream(false);
    setSelectedTopLevelCategory(category);
    form.setValue('category', category.useCase, { shouldValidate: true });
    setSelectedSecondLevelCategory(null);
    form.setValue('subcategory', null);
    form.setValue('subSubcategory', null);
    setTimeout(() => scrollToRef(secondStepRef), 100);
  };
  
  const handleClothingSelect = () => {
    setIsClothingStream(true);
    setSelectedTopLevelCategory(null);
    setSelectedSecondLevelCategory(null);
    form.reset({ ...form.getValues(), category: 'Clothing', subcategory: null, subSubcategory: null, productType: 'Apparel' });
    setTimeout(() => scrollToRef(finalFormRef), 100);
  };

  const handleSecondLevelSelect = (category: SubCategory) => {
    setSelectedSecondLevelCategory(category);
    form.setValue('subcategory', category.type, { shouldValidate: true });
    form.setValue('subSubcategory', null);
  };

  const handleSubSubCategorySelect = (subType: string) => {
    form.setValue('subSubcategory', subType, { shouldValidate: true });
    setTimeout(() => scrollToRef(finalFormRef), 100);
  }

  const onSubmit = async (data: ProductFormData) => {
    if (!currentDispensary || !currentUser?.dispensaryId || !currentDispensary.dispensaryType) {
      toast({ title: "Error", description: "Cannot submit without dispensary data and type.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
        let uploadedImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading Images...", description: "Please wait...", variant: "default" });
            const uploadPromises = files.map(file => {
                const sRef = storageRef(storage, `products/${currentUser!.uid}/${Date.now()}_${file.name}`);
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
            dispensaryId: currentUser.dispensaryId,
            dispensaryName: currentDispensary.dispensaryName,
            dispensaryType: currentDispensary.dispensaryType,
            productOwnerEmail: currentUser.email,
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
            quantityInStock: totalStock,
            imageUrls: uploadedImageUrls,
            imageUrl: uploadedImageUrls[0] || null,
        };
        
        const collectionName = getProductCollectionName(currentDispensary.dispensaryType);
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
  
   useEffect(() => {
    if (watchGender && watchSizingSystem && standardSizesData[watchGender] && standardSizesData[watchGender][watchSizingSystem]) {
        setAvailableStandardSizes(standardSizesData[watchGender][watchSizingSystem]!);
    } else {
        setAvailableStandardSizes([]);
    }
  }, [watchGender, watchSizingSystem]);

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

  const showFinalForm = (selectedTopLevelCategory && selectedSecondLevelCategory && form.watch('subSubcategory')) || isClothingStream;
  
  const availableDispensaries = allDispensaries.filter(d => d.id !== currentUser?.dispensaryId);

  return (
    <div className="max-w-5xl mx-auto my-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add Traditional Medicine Product</h1>
          <p className="text-muted-foreground mt-1">Follow the steps to categorize and add your product.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/dispensary-admin/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Products
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Card>
                <CardHeader><CardTitle>Step 1: Select a Product Stream</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryStructure.map((cat, index) => (
                        <Card 
                            key={cat.useCase || index}
                            onClick={() => handleTopLevelSelect(cat)} 
                            className={cn(
                                "cursor-pointer hover:border-primary flex flex-col group overflow-hidden transition-all duration-200", 
                                form.watch('category') === cat.useCase && !isClothingStream && 'border-primary ring-2 ring-primary'
                            )}
                        >
                            <CardHeader className="p-0">
                                <div className="w-full bg-muted">
                                    <Image
                                        src={cat.imageUrl}
                                        alt={cat.useCase}
                                        width={768}
                                        height={512}
                                        layout="responsive"
                                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 flex items-center justify-center flex-grow">
                                <p className="text-center font-semibold text-base">{cat.useCase}</p>
                            </CardContent>
                        </Card>
                    ))}
                     <Card 
                        onClick={handleClothingSelect} 
                        className={cn(
                            "cursor-pointer hover:border-primary flex flex-col group overflow-hidden transition-all duration-200", 
                            isClothingStream && 'border-primary ring-2 ring-primary'
                        )}
                    >
                        <CardHeader className="p-0">
                            <div className="w-full bg-muted">
                                <Image
                                    src="/images/traditional-medicine/san1.jpg"
                                    alt="Clothing"
                                    width={768}
                                    height={512}
                                    layout="responsive"
                                    className="object-contain transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 flex items-center justify-center flex-grow">
                            <p className="text-center font-semibold text-base">Clothing</p>
                        </CardContent>
                    </Card>
                </CardContent>
            </Card>

            {selectedTopLevelCategory && (
                <div ref={secondStepRef}>
                    <Card className="animate-fade-in-scale-up">
                        <CardHeader>
                            <CardTitle>
                                Step 2: Select a Product Type for <span className="text-primary">{selectedTopLevelCategory.useCase}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {selectedTopLevelCategory.categories.map((cat, index) => (
                                <Card 
                                    key={cat.type || index}
                                    onClick={() => handleSecondLevelSelect(cat)} 
                                    className={cn(
                                        "cursor-pointer hover:border-primary flex flex-col group overflow-hidden transition-all duration-200", 
                                        form.watch('subcategory') === cat.type && 'border-primary ring-2 ring-primary'
                                    )}
                                >
                                    <CardHeader className="p-0">
                                        <div className="w-full bg-muted">
                                            <Image
                                                src={cat.imageUrl}
                                                alt={cat.type}
                                                width={768}
                                                height={512}
                                                layout="responsive"
                                                className="object-contain transition-transform duration-300 group-hover:scale-105"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 flex flex-col items-center flex-grow">
                                        <p className="text-center font-semibold text-base">{cat.type}</p>
                                        {form.watch('subcategory') === cat.type && (
                                            <div className="w-full mt-4 animate-fade-in-scale-up">
                                                <Select onValueChange={(value) => handleSubSubCategorySelect(value)}>
                                                    <SelectTrigger><SelectValue placeholder="Select a specific sub-type" /></SelectTrigger>
                                                    <SelectContent>
                                                        {cat.subtypes.map(subtype => <SelectItem key={subtype} value={subtype}>{subtype}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

          <div ref={finalFormRef}>
              {showFinalForm && (
                  <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                      <Separator />
                      <h3 className="text-2xl font-semibold border-b pb-2">Step 3: Finalize Product Details</h3>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/50 p-3 rounded-md border">
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Input value={form.getValues('category')} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" />
                        </FormItem>
                        <FormItem>
                          <FormLabel>Subcategory</FormLabel>
                          <Input value={form.getValues('subcategory') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" />
                        </FormItem>
                        {form.getValues('subSubcategory') && (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Input value={form.getValues('subSubcategory') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" />
                            </FormItem>
                        )}
                      </div>
                      
                      <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                      
                      {isClothingStream && (
                        <>
                          <Separator/>
                          <h3 className="text-xl font-semibold border-b pb-2">Apparel Details</h3>
                           <div className="grid md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="subcategory" render={({ field }) => ( <FormItem><FormLabel>Apparel Type *</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{apparelTypes.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent>{apparelGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name="sizingSystem" render={({ field }) => ( <FormItem><FormLabel>Sizing System</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select sizing system" /></SelectTrigger></FormControl><SelectContent>{sizingSystemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            </div>
                            <FormField control={form.control} name="sizes" render={({ field }) => ( <FormItem><FormLabel>Available Sizes</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="Add a size..." value={field.value || []} onChange={field.onChange} availableStandardSizes={availableStandardSizes} /></FormControl><FormMessage /></FormItem> )} />
                        </>
                      )}
                      
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
                                <DispensarySelector 
                                    allDispensaries={availableDispensaries}
                                    isLoading={isLoadingDispensaries}
                                    selectedIds={form.watch('allowedPoolDispensaryIds') || []}
                                    onSelectionChange={(ids) => form.setValue('allowedPoolDispensaryIds', ids)}
                                />
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
                          <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
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
