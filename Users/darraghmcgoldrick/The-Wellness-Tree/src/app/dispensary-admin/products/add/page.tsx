
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query as firestoreQuery, where, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData, type ProductAttribute } from '@/lib/schemas';
import type { DispensaryTypeProductCategoriesDoc, ProductCategory } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Gift, Flame, Leaf as LeafIconLucide, Shirt, Sparkles } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { StrainFinder } from '@/components/dispensary-admin/StrainFinder';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

type CannabinoidStreamKey = 'Cannibinoid (other)' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set';

const cannibinoidStreamDisplayMapping: Record<CannabinoidStreamKey, { text: string; icon: React.ElementType; color: string }> = {
    'Cannibinoid (other)': { text: 'THC Products', icon: Flame, color: 'text-red-500' },
    'CBD': { text: 'CBD Products', icon: LeafIconLucide, color: 'text-green-500' },
    'Apparel': { text: 'Apparel', icon: Shirt, color: 'text-blue-500' },
    'Smoking Gear': { text: 'Accessories', icon: Sparkles, color: 'text-purple-500' },
    'Sticker Promo Set': { text: 'Sticker Promo', icon: Gift, color: 'text-yellow-500' },
};


export default function AddProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [categoryStructure, setCategoryStructure] = useState<any | null>(null);

  const [selectedProductStream, setSelectedProductStream] = useState<CannabinoidStreamKey | null>(null);
  
  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);

  const [showStrainFinder, setShowStrainFinder] = useState(false);
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null, subSubcategory: null,
      priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      stickerProgramOptIn: 'no',
      currency: currentDispensary?.currency || 'ZAR',
      effects: [], flavors: [], medicalUses: [],
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchLabTested = form.watch('labTested');
  const watchStickerProgramOptIn = form.watch('stickerProgramOptIn');

  const handleProductStreamSelect = (streamName: CannabinoidStreamKey) => {
    setSelectedProductStream(streamName);
    form.reset({
      ...form.getValues(),
      name: '', description: '', subcategory: null, subSubcategory: null,
      priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [], isAvailableForPool: false, tags: [], labTested: false, labTestReportUrl: null,
      stickerProgramOptIn: 'no',
      effects: [], flavors: [], medicalUses: [],
      category: streamName,
    });
    setFiles([]); 
    setLabTestFile(null);
    setShowStrainFinder(false);
    
    if (streamName === 'Cannibinoid (other)') {
      // Logic for opt-in will handle showing next steps
    } else if (streamName === 'CBD') {
      setShowStrainFinder(true);
    }
  };

  useEffect(() => {
    if (watchStickerProgramOptIn === 'yes') {
        setShowStrainFinder(true);
    } else if (selectedProductStream === 'Cannibinoid (other)' && watchStickerProgramOptIn === 'no') {
        setShowStrainFinder(false);
    }
  }, [watchStickerProgramOptIn, selectedProductStream]);
  
  
  const fetchInitialData = useCallback(async () => {
    if (authLoading || !currentDispensary) return;
    if (currentDispensary.dispensaryType !== "Cannibinoid store") {
      setIsLoadingInitialData(false);
      // Here you would render a different workflow for other store types
      // For now, we just stop.
      return;
    }
    
    setIsLoadingInitialData(true);
    try {
        const categoriesQuery = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', "Cannibinoid store"), limit(1));
        const querySnapshot = await getDocs(categoriesQuery);
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const categoriesDoc = docSnap.data() as DispensaryTypeProductCategoriesDoc;
            const thcCbdCategories = (categoriesDoc.categoriesData as any)?.find((c: any) => c.name === 'thcCbdProductCategories');
            setCategoryStructure(thcCbdCategories?.data || null);
        } else {
            toast({ title: "Configuration Missing", description: "Could not find the product category configuration for 'Cannibinoid store'.", variant: "destructive" });
        }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load necessary category data for this store type.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [toast, authLoading, currentDispensary]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
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

        const totalStock = data.priceTiers.reduce((acc, tier) => acc + (Number(tier.quantityInStock) || 0), 0);
        const productData = { ...data, dispensaryId: currentUser.dispensaryId, dispensaryName: currentDispensary.dispensaryName, dispensaryType: currentDispensary.dispensaryType, productOwnerEmail: currentUser.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), quantityInStock: totalStock, imageUrls: uploadedImageUrls, labTestReportUrl: uploadedLabTestUrl };
        await addDoc(collection(db, 'products'), productData);
        toast({ title: "Success!", description: `Product "${data.name}" has been created.` });
        router.push('/dispensary-admin/products');
    } catch (error) {
        console.error("Error creating product:", error);
        toast({ title: "Creation Failed", description: "An error occurred while creating the product.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };
  
  const handleStrainSelect = (strainData: any) => {
    form.setValue('name', strainData.name);
    form.setValue('strain', strainData.name);
    form.setValue('strainType', strainData.type);
    form.setValue('description', strainData.description);
    form.setValue('thcContent', strainData.thc_level);
    form.setValue('mostCommonTerpene', strainData.most_common_terpene);
    
    const effects: ProductAttribute[] = [];
    if (strainData.effects) {
       Object.entries(strainData.effects).forEach(([key, value]) => {
           if(value && parseInt(value as string) > 0) {
              effects.push({ name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), percentage: value as string });
           }
       });
    }
    
    const medical: ProductAttribute[] = [];
     if (strainData.medical) {
       Object.entries(strainData.medical).forEach(([key, value]) => {
           if(value && parseInt(value as string) > 0) {
              medical.push({ name: key.toUpperCase(), percentage: value as string });
           }
       });
    }

    form.setValue('effects', effects);
    form.setValue('medicalUses', medical);
    
    if (strainData.flavor) {
      form.setValue('flavors', strainData.flavor);
    }

    toast({ title: "Strain Loaded", description: `${strainData.name} details have been filled in.` });
    setShowStrainFinder(false);
  };
  
  if (authLoading || isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <Card className="shadow-xl animate-pulse"> <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader> <CardContent className="p-6 space-y-6"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> <CardFooter><Skeleton className="h-12 w-full" /></CardFooter> </Card> </div> );
  }

  // This check ensures we only render for the specified store type
  if (currentDispensary?.dispensaryType !== "Cannibinoid store") {
    return <div className="p-8 text-center"><h2 className="text-xl font-semibold">Product workflow for '{currentDispensary?.dispensaryType}' coming soon.</h2></div>
  }

  const renderCategoryCards = () => {
      if (!categoryStructure || !selectedProductStream) return null;
      
      const streamKey = selectedProductStream === 'Cannibinoid (other)' ? 'THC' : 'CBD';
      const deliveryMethods = categoryStructure[streamKey]?.['Delivery Methods'];
      if (!deliveryMethods) return null;

      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(deliveryMethods).map(([key, value]) => {
              const items = value as string[];
              const imageUrl = items.find(item => item.startsWith('imageUrl: '))?.split(': ')[1];
              const options = items.filter(item => !item.startsWith('imageUrl: '));
              
              return (
                  <Card key={key} className="p-3">
                      {imageUrl && <div className="relative h-24 mb-2"><Image src={imageUrl} alt={key} layout="fill" objectFit="cover" /></div>}
                      <CardTitle className="text-base font-semibold mb-2">{key}</CardTitle>
                      <Select onValueChange={(val) => {
                          form.setValue('deliveryMethod', key);
                          form.setValue('productSubCategory', val);
                      }} required>
                          <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                          <SelectContent>
                              {options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </Card>
              )
          })}
        </div>
      );
  };

  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> <PackagePlus className="mr-3 h-8 w-8 text-primary" /> Add New Product </CardTitle>
            <Button variant="outline" size="sm" asChild> <Link href="/dispensary-admin/products"> <ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link> </Button>
        </div>
        <CardDescription className="text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select a product stream, then fill in the details. Fields marked with * are required. </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Product Stream Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
                {(Object.keys(cannibinoidStreamDisplayMapping) as CannabinoidStreamKey[]).map((stream) => { 
                    const { text, icon: IconComponent, color } = cannibinoidStreamDisplayMapping[stream];
                    return ( 
                        <Button key={stream} type="button" variant={selectedProductStream === stream ? 'default' : 'outline'} className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedProductStream === stream && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleProductStreamSelect(stream)}>
                           <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2 mx-auto", color)} /> 
                           <span className="text-lg sm:text-xl font-semibold text-center">{text}</span>
                        </Button> 
                    );
                })}
            </div>
            
            {/* Conditional Rendering based on selections */}
            <div className="space-y-6 mt-4">
                {selectedProductStream === 'Cannibinoid (other)' && (
                 <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner">
                    <CardHeader><CardTitle className="flex items-center gap-3 text-orange-800"><Gift className="text-yellow-500 fill-yellow-400"/>The Triple S (Strain-Sticker-Sample) Club</CardTitle></CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="stickerProgramOptIn" render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel className="text-lg font-semibold text-gray-800">Participate in this programme for this product?</FormLabel>
                                <FormDescription className="text-orange-900/90 text-sm">Sell a sticker and attach a free sample of your garden delights.</FormDescription>
                                <FormControl>
                                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'no'} className="flex flex-col sm:flex-row gap-4 pt-2">
                                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal text-lg text-green-700">Yes, I'm in!</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal text-lg">No, standard product</FormLabel></FormItem>
                                  </RadioGroup>
                                </FormControl><FormMessage />
                              </FormItem>
                          )}/>
                    </CardContent>
                  </Card>
                )}

                {showStrainFinder && (
                    <StrainFinder
                        onStrainSelect={handleStrainSelect}
                        onClose={() => setShowStrainFinder(false)}
                    />
                )}
                
                {categoryStructure && (selectedProductStream === 'CBD' || (selectedProductStream === 'Cannibinoid (other)' && watchStickerProgramOptIn === 'yes')) && renderCategoryCards()}

                {/* The rest of the form appears when a stream is selected and conditions are met */}
                {(selectedProductStream && (selectedProductStream !== 'Cannibinoid (other)' || watchStickerProgramOptIn === 'yes' || watchStickerProgramOptIn === 'no')) && (
                  <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                    <Separator />
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Details</h2>
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                    
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

                    <h2 className="text-xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Images & Details</h2>
                     <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags placeholder="e.g., Organic, Sativa, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="labTested" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Lab Tested?</FormLabel><FormDescription>Check this if you have a lab report for this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                    {watchLabTested && (
                      <FormField control={form.control} name="labTestReportUrl" render={() => ( <FormItem><FormLabel>Lab Test Report</FormLabel><FormControl><SingleImageDropzone value={labTestFile} onChange={(file) => setLabTestFile(file || null)} /></FormControl><FormDescription>Upload the lab test certificate (PDF or Image).</FormDescription><FormMessage /></FormItem>)} />
                    )}
                    
                    <h2 className="text-xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Pool</h2>
                    <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other stores to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                    {watchIsAvailableForPool && (
                      <Card className="p-4 bg-muted/50"><CardHeader className="p-0 mb-2"><CardTitle className="text-lg">Pool Pricing Tiers *</CardTitle><CardDescription>Define pricing for bulk transfers to other stores.</CardDescription></CardHeader>
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
                     <CardFooter className="p-0 pt-6">
                        <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                            Add Product
                        </Button>
                     </CardFooter>
                  </div>
                )}
            </div>
          </form>
        </Form>
        <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
        <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
      </CardContent>
    </Card>
  );
}
