
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
import type { Dispensary, DispensaryTypeProductCategoriesDoc, ProductCategory } from '@/types';
import { findStrainImage } from '@/ai/flows/generate-thc-promo-designs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Flame, Leaf as LeafIconLucide, Shirt, Sparkles, Search as SearchIcon, Palette, Brain, Info, X as XIcon, HelpCircle, Star, Gift, CornerDownLeft, BookOpen } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME = "Cannibinoid store";
const TRADITIONAL_MEDICINE_WELLNESS_TYPE_NAME = "Traditional Medicine dispensary";

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set';

const cannibinoidStreamDisplayMapping: Record<StreamKey, { text: string; icon: React.ElementType; color: string }> = {
    'THC': { text: 'Cannibinoid (other)', icon: Flame, color: 'text-red-500' },
    'CBD': { text: 'CBD', icon: LeafIconLucide, color: 'text-green-500' },
    'Apparel': { text: 'Apparel', icon: Shirt, color: 'text-blue-500' },
    'Smoking Gear': { text: 'Accessories', icon: Sparkles, color: 'text-purple-500' },
    'Sticker Promo Set': { text: 'Sticker Promo Set', icon: Palette, color: 'text-yellow-500' },
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

export default function AddProductPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [wellnessData, setWellnessData] = useState<Dispensary | null>(null);
  const [isThcCbdSpecialType, setIsThcCbdSpecialType] = useState(false);
  const [isTraditionalMedicineType, setIsTraditionalMedicineType] = useState(false);
  
  const [categoryStructureDoc, setCategoryStructureDoc] = useState<DispensaryTypeProductCategoriesDoc | null>(null);
  
  // State for Cannabinoid workflow
  const [selectedCannabinoidStream, setSelectedCannabinoidStream] = useState<StreamKey | null>(null);
  const [deliveryMethodOptions, setDeliveryMethodOptions] = useState<string[]>([]);
  const [productSubCategoryOptions, setProductSubCategoryOptions] = useState<string[]>([]);
  const [showTripleSOptIn, setShowTripleSOptIn] = useState(false);

  // State for Traditional Medicine workflow
  const [traditionalMedicineStreams, setTraditionalMedicineStreams] = useState<any[]>([]);
  const [selectedTradMedStream, setSelectedTradMedStream] = useState<string | null>(null);
  const [tradMedTypeOptions, setTradMedTypeOptions] = useState<string[]>([]);
  const [tradMedSubtypeOptions, setTradMedSubtypeOptions] = useState<string[]>([]);


  const [files, setFiles] = useState<File[]>([]);
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', deliveryMethod: null, productSubCategory: null,
      productType: null, subSubcategory: null, 
      mostCommonTerpene: '', strain: null, thcContent: '0', cbdContent: '0',
      currency: 'ZAR', priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any }],
      poolPriceTiers: [], quantityInStock: undefined, imageUrls: [],
      isAvailableForPool: false,
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchStickerProgramOptIn = form.watch('stickerProgramOptIn');
  const watchDeliveryMethod = form.watch('deliveryMethod');
  const watchTradMedProductType = form.watch('productType');

  const showProductDetailsForm = 
    !isThcCbdSpecialType || 
    (isThcCbdSpecialType && selectedCannabinoidStream && (selectedCannabinoidStream !== 'THC' || watchStickerProgramOptIn === 'yes')) || 
    isTraditionalMedicineType;


  const handleCannabinoidStreamSelect = (stream: StreamKey) => {
    // Basic reset logic can be shared if needed
    setSelectedCannabinoidStream(stream);
    form.setValue('category', stream); 

    const deliveryMethodsMap = categoryStructureDoc?.categoriesData.thcCbdProductCategories?.[stream]?.['Delivery Methods'];
        
    if (deliveryMethodsMap && typeof deliveryMethodsMap === 'object' && !Array.isArray(deliveryMethodsMap)) {
        const options = Object.keys(deliveryMethodsMap).sort();
        setDeliveryMethodOptions(options);
    } else {
        setDeliveryMethodOptions([]);
        if (stream === 'THC' || stream === 'CBD') {
            toast({ title: "Config Warning", description: `Could not load types for ${stream}. Please check wellness type category configuration.`, variant: "destructive" });
        }
    }
    if (stream === 'THC') { setShowTripleSOptIn(true); } else { setShowTripleSOptIn(false); }
  };

  const handleTradMedStreamSelect = (useCaseName: string) => {
    setSelectedTradMedStream(useCaseName);
    form.setValue('category', useCaseName); // Set main category
    form.setValue('productType', null); // Reset subsequent dropdowns
    form.setValue('subSubcategory', null);
    
    const selectedStreamData = traditionalMedicineStreams.find(s => s.useCase === useCaseName);
    if (selectedStreamData?.categories) {
      setTradMedTypeOptions(selectedStreamData.categories.map((c: any) => c.type).sort());
    } else {
      setTradMedTypeOptions([]);
    }
  };

  const fetchInitialData = useCallback(async () => {
    if (authLoading || !currentUser?.dispensaryId) { if (!authLoading) setIsLoadingInitialData(false); return; }
    setIsLoadingInitialData(true);
    try {
      const dispensaryDocRef = doc(db, 'dispensaries', currentUser.dispensaryId);
      const dispensarySnap = await getDoc(dispensaryDocRef);
      if (dispensarySnap.exists()) {
        const dispensaryData = dispensarySnap.data() as Dispensary;
        setWellnessData(dispensaryData);
        form.setValue('currency', dispensaryData.currency || 'ZAR');
        
        const isCannabinoid = dispensaryData.dispensaryType === THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME;
        const isTradMed = dispensaryData.dispensaryType === TRADITIONAL_MEDICINE_WELLNESS_TYPE_NAME;
        setIsThcCbdSpecialType(isCannabinoid);
        setIsTraditionalMedicineType(isTradMed);

        if (dispensaryData.dispensaryType) {
            const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', dispensaryData.dispensaryType);
            const docSnap = await getDoc(categoriesDocRef);
            if (docSnap.exists()) {
                const docData = docSnap.data() as DispensaryTypeProductCategoriesDoc;
                setCategoryStructureDoc(docData);
                if(isTradMed && docData.categoriesData.traditionalMedicineCategories) {
                  setTraditionalMedicineStreams(docData.categoriesData.traditionalMedicineCategories);
                }
            } else {
                console.warn(`No product category structure found for type: ${dispensaryData.dispensaryType}`);
            }
        }

      } else { toast({ title: "Error", description: "Your wellness profile data could not be found.", variant: "destructive" }); }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [currentUser?.dispensaryId, form, toast, authLoading]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
  // Effect for Cannabinoid Sub-Category Dropdown
  useEffect(() => {
    if (watchDeliveryMethod && selectedCannabinoidStream) {
        const deliveryMethodsMap = categoryStructureDoc?.categoriesData.thcCbdProductCategories?.[selectedCannabinoidStream]?.['Delivery Methods'];
        const subcategories = deliveryMethodsMap?.[watchDeliveryMethod];
        setProductSubCategoryOptions(Array.isArray(subcategories) ? subcategories.sort() : []);
        form.setValue('productSubCategory', null);
    } else {
        setProductSubCategoryOptions([]);
    }
  }, [watchDeliveryMethod, categoryStructureDoc, form, selectedCannabinoidStream]);

  // Effect for Traditional Medicine Sub-Category (Type) Dropdown
  useEffect(() => {
    if (watchTradMedProductType && selectedTradMedStream) {
        const selectedStreamData = traditionalMedicineStreams.find(s => s.useCase === selectedTradMedStream);
        const selectedTypeData = selectedStreamData?.categories.find((c: any) => c.type === watchTradMedProductType);
        setTradMedSubtypeOptions(selectedTypeData?.subtypes?.sort() || []);
        form.setValue('subSubcategory', null);
    } else {
        setTradMedSubtypeOptions([]);
    }
  }, [watchTradMedProductType, selectedTradMedStream, traditionalMedicineStreams, form]);


  const onSubmit = async (data: ProductFormData) => {
    if (!wellnessData || !currentUser) { toast({ title: "Error", description: "Cannot submit without wellness profile data.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        let uploadedImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading Images...", description: "Please wait while your product images are uploaded.", variant: "default" });
            const uploadPromises = files.map(file => { const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`); return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref)); });
            uploadedImageUrls = await Promise.all(uploadPromises);
        }

        const productData = { ...data, dispensaryId: currentUser.dispensaryId, dispensaryName: wellnessData.dispensaryName, dispensaryType: wellnessData.dispensaryType, productOwnerEmail: currentUser.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), quantityInStock: data.priceTiers.reduce((acc, tier) => acc + (tier.quantityInStock || 0), 0), imageUrls: uploadedImageUrls };
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
            <Button variant="default" onClick={() => router.push('/dispensary-admin/products')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Button>
        </div>
        <CardDescription className="text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select a product stream, then fill in the details. Fields marked with * are required. {wellnessData?.dispensaryType && ( <span className="block mt-1">Categories for: <span className="font-semibold text-primary">{wellnessData.dispensaryType}</span></span> )} </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isThcCbdSpecialType && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Product Stream * </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
                        {(Object.keys(cannibinoidStreamDisplayMapping) as StreamKey[]).map((stream) => { const { text, icon: IconComponent, color } = cannibinoidStreamDisplayMapping[stream]; return ( <Button key={stream} type="button" variant={selectedCannabinoidStream === stream ? 'default' : 'outline'} className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedCannabinoidStream === stream && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleCannabinoidStreamSelect(stream)}> <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2", color)} /> <span className="text-lg sm:text-xl font-semibold">{text}</span> </Button> ); })}
                    </div>
                </FormItem>
            )}

            {isTraditionalMedicineType && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Product Stream * </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                      {traditionalMedicineStreams.map((stream) => (
                        <Button key={stream.useCase} type="button" variant={selectedTradMedStream === stream.useCase ? 'default' : 'outline'} className={cn("h-auto p-4 text-left flex items-start gap-3 transform transition-all duration-200 hover:scale-105 shadow-md", selectedTradMedStream === stream.useCase && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleTradMedStreamSelect(stream.useCase)}> 
                          <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold">{stream.useCase}</span>
                            <span className="text-xs text-muted-foreground whitespace-normal">{stream.description}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                </FormItem>
            )}
             
            {showTripleSOptIn && (
                <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner">
                    <CardHeader className="p-6">
                       <div className="grid grid-cols-2 gap-4 w-full max-w-lg mx-auto">
                           <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md"> <Image src="/images/2025-triple-s/t44.jpg" alt="Sticker promo placeholder 1" layout="fill" objectFit='cover' data-ai-hint="sticker design"/> </div>
                           <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md"> <Image src="/images/2025-triple-s/t42.jpg" alt="Sticker promo placeholder 2" layout="fill" objectFit='cover' data-ai-hint="apparel mockup"/> </div>
                       </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 text-center">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-orange-800">The Triple S Canna club</h3>
                            <p className="text-lg italic text-orange-900/80">
                                <span className="text-base">Your</span>{' '}
                                <span className="font-bold text-xl not-italic">Strain-Sticker-Sample</span>{' '}
                                <span className="text-base">club.</span>
                            </p>
                        </div>
                        <div className='space-y-3 text-orange-900/90 text-sm leading-relaxed max-w-2xl mx-auto pt-4'>
                            <p>Attach your garden delights to a sticker. Set your sticker design price and offer free samples to fellow cannabis enthusiasts.</p>
                            <p>Shoppers can generate and purchase stickers for caps, hoodies, t-shirts and as standalone stickers.</p>
                            <p className='font-semibold'>Happy sharing your free samples, and awesome on the fly AI strain sticker designs with fellow cannabis enthusiasts. OneLove</p>
                        </div>
                         <FormField control={form.control} name="stickerProgramOptIn" render={({ field }) => (
                            <FormItem className="space-y-3 pt-6 mt-6 border-t border-orange-200/50">
                            <FormLabel className="text-base font-semibold text-gray-800 block text-center">Do you want to participate for this product?</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value ?? undefined} className="flex flex-col sm:flex-row gap-4 pt-2 max-w-md mx-auto">
                                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm">
                                        <FormControl><RadioGroupItem value="yes" /></FormControl>
                                        <FormLabel className="font-normal text-lg text-green-700">Yes, include my product</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm">
                                        <FormControl><RadioGroupItem value="no" /></FormControl>
                                        <FormLabel className="font-normal text-lg">No, this is a standard product</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage className="text-center" />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            )}

            <Separator className={cn("my-6", !showProductDetailsForm && 'hidden')} />

            {showProductDetailsForm && (
                <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>1. Product Details</h2>
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <div className="grid md:grid-cols-2 gap-4">
                       {isThcCbdSpecialType && (
                           <>
                             <FormField control={form.control} name="deliveryMethod" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select product type: *</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); }} value={field.value || ''} disabled={deliveryMethodOptions.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a product type..." /></SelectTrigger></FormControl>
                                        <SelectContent>{deliveryMethodOptions.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            {productSubCategoryOptions.length > 0 && (
                                <FormField control={form.control} name="productSubCategory" render={({ field }) => (
                                    <FormItem><FormLabel>Product Sub Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-category" /></SelectTrigger></FormControl>
                                        <SelectContent>{productSubCategoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )} />
                            )}
                           </>
                        )}
                        {isTraditionalMedicineType && (
                           <>
                             <FormField control={form.control} name="productType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Type *</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); }} value={field.value || ''} disabled={tradMedTypeOptions.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select product type" /></SelectTrigger></FormControl>
                                        <SelectContent>{tradMedTypeOptions.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                              )} />
                              {tradMedSubtypeOptions.length > 0 && (
                                <FormField control={form.control} name="subSubcategory" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sub-Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-type" /></SelectTrigger></FormControl>
                                            <SelectContent>{tradMedSubtypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>
                                )} />
                              )}
                           </>
                        )}
                    </div>
                    
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>2. Pricing & Stock *</h2>
                    <div className="space-y-4">
                        {priceTierFields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 border rounded-md relative">
                                <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Price ({wellnessData?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any })}>Add Another Price Tier</Button>
                    </div>

                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>3. Images</h2>
                     <FormField control={form.control} name="imageUrls" render={({ field }) => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                    
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>4. Sharing & Visibility</h2>
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
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPoolPriceTier({ unit: '', price: '' as any })}>Add Pool Price Tier</Button>
                       </CardContent>
                       </Card>
                    )}
                    <CardFooter>
                        <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                            Add Product
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
