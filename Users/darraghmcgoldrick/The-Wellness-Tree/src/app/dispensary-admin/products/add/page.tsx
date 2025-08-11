
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query as firestoreQuery, where, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData, type ProductAttribute } from '@/lib/schemas';
import type { Dispensary, DispensaryTypeProductCategoriesDoc, ProductCategory } from 'functions/src/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Flame, Leaf as LeafIconLucide, Shirt, Sparkles, X as XIcon, Gift } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import Image from 'next/image';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const apparelGenders = ['Mens', 'Womens', 'Unisex'];
const sizingSystemOptions = ['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other'];

const standardSizesData: Record<string, Record<string, string[]>> = {
  'Mens': { 'UK/SA': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'], 'US': ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14', '15'], 'EURO': ['40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46', '47'], 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] },
  'Womens': { 'UK/SA': ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '9', '10'], 'US': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11', '12'], 'EURO': ['35.5', '36', '36.5', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '43'], 'Alpha (XS-XXXL)': ['XXS','XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  'Unisex': { 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] }
};

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set';

const streamDisplayMapping: Record<StreamKey, { text: string; icon: React.ElementType; color: string, categoryMatch: string }> = {
    'THC': { text: 'THC Products', icon: Flame, color: 'text-red-500', categoryMatch: 'THC' },
    'CBD': { text: 'CBD Products', icon: LeafIconLucide, color: 'text-green-500', categoryMatch: 'CBD' },
    'Apparel': { text: 'Apparel', icon: Shirt, color: 'text-blue-500', categoryMatch: 'Apparel' },
    'Smoking Gear': { text: 'Accessories', icon: Sparkles, color: 'text-purple-500', categoryMatch: 'Smoking Gear' },
    'Sticker Promo Set': { text: 'Sticker Promo Set', icon: Gift, color: 'text-yellow-500', categoryMatch: 'Sticker Promo Set'},
};

export default function AddProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [categoryStructure, setCategoryStructure] = useState<ProductCategory[]>([]);
  const [selectedProductStream, setSelectedProductStream] = useState<StreamKey | null>(null);
  
  const [mainCategoryOptions, setMainCategoryOptions] = useState<string[]>([]);
  const [subCategoryL1Options, setSubCategoryL1Options] = useState<string[]>([]);
  const [subCategoryL2Options, setSubCategoryL2Options] = useState<string[]>([]);
  
  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);
  
  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null, subSubcategory: null,
      priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      stickerProgramOptIn: null,
      currency: currentDispensary?.currency || 'ZAR',
      effects: [],
      flavors: [],
      medicalUses: [],
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchLabTested = form.watch('labTested');
  const watchSizingSystem = form.watch('sizingSystem');
  const watchGender = form.watch('gender');
  const watchStickerProgramOptIn = form.watch('stickerProgramOptIn');
  const watchCategory = form.watch('category');
  const watchSubCategory = form.watch('subcategory');

  const showProductDetailsForm = selectedProductStream && (selectedProductStream !== 'THC' || watchStickerProgramOptIn === 'no' || watchStickerProgramOptIn === 'yes');

  const resetFormFields = () => {
    const keptValues = {
        name: form.getValues('name'),
        description: form.getValues('description'),
        priceTiers: form.getValues('priceTiers'),
        isAvailableForPool: form.getValues('isAvailableForPool'),
        poolPriceTiers: form.getValues('poolPriceTiers'),
        tags: form.getValues('tags'),
        currency: form.getValues('currency'),
    };
    form.reset({ ...productSchema.strip()._def.defaultValue(), ...keptValues });
  };

  const handleProductStreamSelect = (stream: StreamKey) => {
    resetFormFields();
    setSelectedProductStream(stream);

    const categoryMatch = streamDisplayMapping[stream].categoryMatch;
    const matchingCategory = categoryStructure.find(c => c.name === categoryMatch);
    
    if (matchingCategory) {
        form.setValue('category', matchingCategory.name, { shouldValidate: true });
        setSubCategoryL1Options(matchingCategory.subcategories?.map(sc => sc.name).sort() || []);
    } else {
        form.setValue('category', '', { shouldValidate: true });
        setSubCategoryL1Options([]);
    }
    form.setValue('subcategory', null);
    form.setValue('subSubcategory', null);
    setSubCategoryL2Options([]);
  };

  useEffect(() => {
    if (watchCategory) {
      const mainCat = categoryStructure.find(c => c.name === watchCategory);
      setSubCategoryL1Options(mainCat?.subcategories?.map(sc => sc.name).sort() || []);
      form.setValue('subcategory', null); // Reset subcategory when main changes
    }
  // This dependency array is intentionally focused on watchCategory and the structure.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchCategory, categoryStructure]);

  useEffect(() => {
    if (watchSubCategory) {
      const mainCat = categoryStructure.find(c => c.name === watchCategory);
      const subCat = mainCat?.subcategories?.find(sc => sc.name === watchSubCategory);
      setSubCategoryL2Options(subCat?.subcategories?.map(ssc => ssc.name).sort() || []);
      form.setValue('subSubcategory', null); // Reset sub-subcategory when L1 changes
    } else {
      setSubCategoryL2Options([]);
    }
  // This dependency array is intentionally focused on the subcategory.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchSubCategory]);


  const fetchInitialData = useCallback(async () => {
    if (authLoading || !currentDispensary?.dispensaryType) {
      if (!authLoading) setIsLoadingInitialData(false);
      return;
    }
    setIsLoadingInitialData(true);
    try {
        const categoriesQuery = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', currentDispensary.dispensaryType), limit(1));
        const querySnapshot = await getDocs(categoriesQuery);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const categoriesDoc = docSnap.data() as DispensaryTypeProductCategoriesDoc;
          setCategoryStructure(categoriesDoc.categoriesData || []);
          setMainCategoryOptions((categoriesDoc.categoriesData || []).map(c => c.name));
        }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load necessary data for the form.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [currentDispensary, authLoading, toast]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
  useEffect(() => {
    const gender = form.getValues('gender'); const system = form.getValues('sizingSystem');
    if (gender && system && standardSizesData[gender] && standardSizesData[gender][system]) { setAvailableStandardSizes(standardSizesData[gender][system]); } else { setAvailableStandardSizes([]); }
  }, [watchGender, watchSizingSystem, form]);

  useEffect(() => {
    if(watchStickerProgramOptIn === 'yes') {
      handleProductStreamSelect('Sticker Promo Set');
    } else if (watchStickerProgramOptIn === 'no' && selectedProductStream === 'Sticker Promo Set') {
      handleProductStreamSelect('THC');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchStickerProgramOptIn]);


  const onSubmit = async (data: ProductFormData) => {
    if (!currentDispensary || !currentUser) { toast({ title: "Error", description: "Cannot submit without dispensary data.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        let uploadedImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading Images...", description: "Please wait while your product images are uploaded.", variant: "default" });
            const uploadPromises = files.map(file => { const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`); return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref)); });
            uploadedImageUrls = await Promise.all(uploadPromises);
        }

        let uploadedLabTestUrl: string | null = null;
        if (labTestFile) {
            toast({ title: "Uploading Lab Report...", description: "Please wait while your lab report is uploaded.", variant: "default" });
            const sRef = storageRef(storage, `lab-reports/${currentUser.uid}/${Date.now()}_${labTestFile.name}`);
            const snapshot = await uploadBytesResumable(sRef, labTestFile);
            uploadedLabTestUrl = await getDownloadURL(snapshot.ref);
        }

        const productData = { ...data, dispensaryId: currentUser.dispensaryId, dispensaryName: currentDispensary.dispensaryName, dispensaryType: currentDispensary.dispensaryType, productOwnerEmail: currentUser.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), quantityInStock: data.priceTiers.reduce((acc, tier) => acc + (tier.quantityInStock || 0), 0), imageUrls: uploadedImageUrls, labTestReportUrl: uploadedLabTestUrl };
        await addDoc(collection(db, 'products'), productData);
        toast({ title: "Success!", description: `Product "${data.name}" has been created.` });
        router.push('/dispensary-admin/products');
    } catch (error) {
        console.error("Error creating product:", error);
        toast({ title: "Creation Failed", description: "An error occurred while creating the product.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  if (isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <Card className="shadow-xl animate-pulse"> <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader> <CardContent className="p-6 space-y-6"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> <CardFooter><Skeleton className="h-12 w-full" /></CardFooter> </Card> </div> );
  }

  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> <PackagePlus className="mr-3 h-8 w-8 text-primary" /> Add New Product </CardTitle>
            <Button variant="outline" size="sm" asChild> <Link href="/dispensary-admin/products"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products </Link> </Button>
        </div>
        <CardDescription className="text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select a product stream, then fill in the details. Fields marked with * are required. {currentDispensary?.dispensaryType && ( <span className="block mt-1">Categories for: <span className="font-semibold text-primary">{currentDispensary.dispensaryType}</span></span> )} </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormItem>
                <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Product Stream * </FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
                    {(Object.keys(streamDisplayMapping) as StreamKey[]).map((stream) => { 
                        // Hide Sticker Promo set, it's handled by the THC flow
                        if (stream === 'Sticker Promo Set') return null;
                        const { text, icon: IconComponent, color } = streamDisplayMapping[stream]; 
                        return ( 
                            <Button key={stream} type="button" variant={selectedProductStream === stream ? 'default' : 'outline'} className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedProductStream === stream && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleProductStreamSelect(stream)}>
                                <div className="flex flex-col items-center text-center">
                                    <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2 mx-auto", color)} /> 
                                    <span className="text-lg sm:text-xl font-semibold">{text}</span>
                                </div>
                            </Button> 
                        ); 
                    })}
                </div>
            </FormItem>
            
            {selectedProductStream === 'THC' && (
                <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-orange-800"><Gift className="text-yellow-500 fill-yellow-400"/>The Triple S (Strain-Sticker-Sample) Club</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                          control={form.control}
                          name="stickerProgramOptIn"
                          render={({ field }) => (
                              <FormItem className="space-y-3">
                                  <FormLabel className="text-lg font-semibold text-gray-800">Participate in this program for this product?</FormLabel>
                                  <FormDescription className="text-orange-900/90 text-sm">
                                      The Triple S club allows you to sell a sticker and attach a free sample of your garden delights.
                                  </FormDescription>
                                  <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                      <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          <SelectItem value="yes">Yes, include my product</SelectItem>
                                          <SelectItem value="no">No, this is a standard product</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                    </CardContent>
                </Card>
            )}

            <Separator className={cn("my-6", !showProductDetailsForm && 'hidden')} />
            
            {showProductDetailsForm && (
              <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Details</h2>
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} disabled>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a category"/></SelectTrigger></FormControl>
                          <SelectContent>{mainCategoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                  )} />

                  {subCategoryL1Options.length > 0 && (
                      <FormField control={form.control} name="subcategory" render={({ field }) => (
                          <FormItem><FormLabel>Subcategory</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select a subcategory"/></SelectTrigger></FormControl>
                              <SelectContent>{subCategoryL1Options.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                          </Select><FormMessage /></FormItem>
                      )} />
                  )}
                </div>

                {subCategoryL2Options.length > 0 && (
                  <FormField control={form.control} name="subSubcategory" render={({ field }) => (
                      <FormItem><FormLabel>Sub-Subcategory</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-subcategory"/></SelectTrigger></FormControl>
                          <SelectContent>{subCategoryL2Options.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                )}
                
                {(selectedProductStream === 'THC' || selectedProductStream === 'CBD' || selectedProductStream === 'Sticker Promo Set') && (
                  <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                    <FormField control={form.control} name="thcContent" render={({ field }) => (<FormItem><FormLabel>THC Content (%)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="cbdContent" render={({ field }) => (<FormItem><FormLabel>CBD Content (%)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="labTested" render={({ field }) => (<FormItem className="flex items-center gap-2 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="lab-tested-check" /></FormControl><FormLabel htmlFor="lab-tested-check">Lab Tested?</FormLabel></FormItem>)} />
                    {watchLabTested && (<FormField control={form.control} name="labTestReportUrl" render={({ field }) => (<FormItem><FormLabel>Lab Report</FormLabel><FormControl><SingleImageDropzone value={labTestFile} onChange={setLabTestFile} /></FormControl><FormMessage /></FormItem>)} />)}
                  </div>
                )}
                
                {selectedProductStream === 'Apparel' && (
                  <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                    <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender *</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent>{apparelGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="sizingSystem" render={({ field }) => ( <FormItem><FormLabel>Sizing System *</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select sizing system" /></SelectTrigger></FormControl><SelectContent>{sizingSystemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                    {availableStandardSizes.length > 0 && <FormField control={form.control} name="sizes" render={() => (<FormItem><FormLabel>Standard Sizes Available</FormLabel><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">{availableStandardSizes.map((size) => (<FormField key={size} control={form.control} name="sizes" render={({ field }) => (<FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value?.includes(size)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), size]) : field.onChange(field.value?.filter((value) => value !== size))}} /></FormControl><FormLabel className="font-normal text-sm">{size}</FormLabel></FormItem>)} />))}</div><FormMessage /></FormItem>)}/>}
                  </div>
                )}
                
                <h2 className="text-xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Pricing & Stock *</h2>
                <div className="space-y-4">
                  {priceTierFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 border rounded-md relative">
                          <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                          {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '' })}>Add Price Tier</Button>
                </div>

                <h2 className="text-xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Images & Tags</h2>
                 <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags placeholder="e.g., Organic, Sativa, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />

                <h2 className="text-xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Final Step: Sharing & Visibility</h2>
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other wellness stores of the same type to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                {watchIsAvailableForPool && (
                  <Card className="p-4 bg-muted/50"><CardHeader className="p-0 mb-2"><CardTitle className="text-lg">Pool Pricing Tiers *</CardTitle><CardDescription>Define pricing for bulk transfers to other wellness stores.</CardDescription></CardHeader>
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

                <CardFooter className="mt-6 p-0">
                  <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                    <span className="flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <PackagePlus className="mr-2 h-5 w-5" />
                      )}
                      Add Product
                    </span>
                  </Button>
                </CardFooter>
              </div>
            )}
          </form>
        </Form>
        <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
        <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
      </CardContent>
    </Card>
  );
}
