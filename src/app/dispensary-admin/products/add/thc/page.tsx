
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { httpsCallable } from 'firebase/functions';
import { productSchema, type ProductFormData, type ProductAttribute } from '@/lib/schemas';
import type { Product as ProductType } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Leaf, Flame, Droplets, Microscope, Gift, Shirt, Sparkles, Check, ImageIcon as ImageIconLucide, Plus, Info, SkipForward, Brush } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { StrainFinder } from '@/components/dispensary-admin/StrainFinder';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

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


type ProductStream = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Art' | 'Furniture';

export default function AddTHCProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  
  const [deliveryMethods, setDeliveryMethods] = useState<Record<string, any>>({});
  const [selectedProductStream, setSelectedProductStream] = useState<ProductStream | null>(null);

  const [zeroPercentEffects, setZeroPercentEffects] = useState<string[]>([]);
  const [zeroPercentMedical, setZeroPercentMedical] = useState<string[]>([]);
  
  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  
  const [showOptInSection, setShowOptInSection] = useState(false);
  const [showStrainFinder, setShowStrainFinder] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null,
      priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      currency: currentDispensary?.currency || 'ZAR',
      effects: [], flavors: [], medicalUses: [],
      stickerProgramOptIn: null,
      productType: '',
      gender: undefined, sizingSystem: undefined, sizes: [],
      growingMedium: undefined, feedingType: undefined
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchLabTested = form.watch('labTested');
  const watchStickerOptIn = form.watch('stickerProgramOptIn');
  const watchCategory = form.watch('category');
  const watchSubcategory = form.watch('subcategory');
  const watchGender = form.watch('gender');
  const watchSizingSystem = form.watch('sizingSystem');
  
  const handleProductStreamSelect = (stream: ProductStream) => {
    form.reset({
      ...form.getValues(),
      name: '', description: '', category: stream, subcategory: null,
      effects: [], flavors: [], medicalUses: [],
      thcContent: '', cbdContent: '', mostCommonTerpene: '',
      strain: '', strainType: '', homeGrow: [], feedingType: undefined,
      stickerProgramOptIn: null,
      productType: stream,
      gender: undefined, sizingSystem: undefined, sizes: [],
      growingMedium: undefined,
    });

    setShowCategorySelector(false);
    setShowStrainFinder(false);
    setZeroPercentEffects([]);
    setZeroPercentMedical([]);
    setSelectedProductStream(stream);

    if (stream === 'THC') {
        setShowOptInSection(true);
    } else if (stream === 'CBD') {
        setShowOptInSection(false);
        setShowStrainFinder(true);
    } else {
      setShowOptInSection(false);
      setShowStrainFinder(false);
    }
  };
  
  const handleStrainSelect = (strainData: any) => {
    form.setValue('name', strainData.name);
    form.setValue('strain', strainData.name);
    form.setValue('strainType', strainData.strainType);
    form.setValue('description', strainData.description);
    form.setValue('thcContent', strainData.thcContent);
    form.setValue('cbdContent', strainData.cbdContent);
    form.setValue('mostCommonTerpene', strainData.mostCommonTerpene);
    
    form.setValue('effects', strainData.effects);
    form.setValue('medicalUses', strainData.medicalUses);
    form.setValue('flavors', strainData.flavors);
    
    setZeroPercentEffects(strainData.zeroPercentEffects || []);
    setZeroPercentMedical(strainData.zeroPercentMedical || []);
    setShowCategorySelector(true);

    toast({ title: "Strain Loaded", description: `${strainData.name} details have been filled in. Please select a product category.` });
  };

  const handleSkipStrainFinder = () => {
    setShowCategorySelector(true);
  }
  
  const handleCategorySelect = (categoryName: string) => {
      form.setValue('category', categoryName, { shouldValidate: true });
      form.setValue('subcategory', null);
  };

  const getProductCollectionName = (type: string | undefined): string => {
      if (!type) return 'products'; // Fallback for safety
      return type.toLowerCase().replace(/[\s-&]+/g, '_') + '_products';
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
            toast({ title: "Uploading Images...", description: "Please wait while your product images are uploaded.", variant: "default" });
            const uploadPromises = files.map(file => {
                const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`);
                return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
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
            labTestReportUrl: uploadedLabTestUrl,
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
  
  const productStreams: { key: ProductStream; title: string; icon: React.ElementType }[] = [
    { key: 'THC', title: 'Cannibinoid (other)', icon: Flame },
    { key: 'CBD', title: 'CBD', icon: Leaf },
    { key: 'Apparel', title: 'Apparel', icon: Shirt },
    { key: 'Smoking Gear', title: 'Smoking Gear', icon: Sparkles },
    { key: 'Art', title: 'Art', icon: Brush },
    { key: 'Furniture', title: 'Furniture', icon: Brush },
  ];

  const isCannabinoidStream = selectedProductStream === 'THC' || selectedProductStream === 'CBD';
  const showProductForm = (selectedProductStream && !isCannabinoidStream) || (isCannabinoidStream && showCategorySelector && watchCategory && watchSubcategory);
  
  const handleAddAttribute = (type: 'effects' | 'medicalUses', name: string) => {
    if (!name) return;
    const currentValues = form.getValues(type) || [];
    if (currentValues.some(item => item.name === name)) return;
    form.setValue(type, [...currentValues, { name, percentage: '1%' }]);
    
    if (type === 'effects') {
        setZeroPercentEffects(prev => prev.filter(item => item !== name));
    } else {
        setZeroPercentMedical(prev => prev.filter(item => item !== name));
    }
  };
  
  useEffect(() => {
    if (watchStickerOptIn === 'yes' || watchStickerOptIn === 'no') {
      setShowStrainFinder(true);
    } else {
      setShowStrainFinder(false);
      setShowCategorySelector(false); // Also hide category selector if opt-in is cleared
    }
  }, [watchStickerOptIn]);
  
  useEffect(() => {
    if (watchGender && watchSizingSystem && standardSizesData[watchGender] && standardSizesData[watchGender][watchSizingSystem]) {
        setAvailableStandardSizes(standardSizesData[watchGender][watchSizingSystem]!);
    } else {
        setAvailableStandardSizes([]);
    }
  }, [watchGender, watchSizingSystem]);


  if (authLoading) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <Card className="shadow-xl animate-pulse"> <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader> <CardContent className="p-6 space-y-6"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> <CardFooter><Skeleton className="h-12 w-full" /></CardFooter> </Card> ... </div> );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add a New Product</h1>
          <p className="text-muted-foreground mt-1">Select a product stream to begin.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4">
              {productStreams.map(stream => (
                  <Button key={stream.key} type="button" variant={selectedProductStream === stream.key ? 'default' : 'outline'} className="h-24 flex-col gap-2" onClick={() => handleProductStreamSelect(stream.key)}>
                      <stream.icon className="h-8 w-8" />
                      <span className="text-xs text-center">{stream.title}</span>
                  </Button>
              ))}
          </div>
          
          {showOptInSection && (
            <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner animate-fade-in-scale-up overflow-hidden">
                <div className="relative w-full h-40">
                    <Image
                        src="/images/2025-triple-s/t36.jpg"
                        alt="The Triple S Club banner"
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="cannabis plants creative"
                    />
                </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-orange-800">
                  <Gift className="text-yellow-500 fill-yellow-400" />The Triple S (Strain-Sticker-Sample) Club
                </CardTitle>
                <CardDescription className="text-orange-700/80 !mt-4 space-y-3 text-base">
                    <p>
                        The Wellness Tree fully complies with South African Law and prohibits the sale of THC products. The Wellness Tree offers the The Triple S Club as an opportunity for Home growers and fellow Cannabis enthusiasts to be able to share and their grow with the public by selling strain specific stickers or stickers promoting the strain and Cannabinoid store.
                    </p>
                    <p>
                        The public buys the sticker and recieves the sample amounts you create as a grower for FREE. The sticker price is paid to You less our 20% per transaction. Payments are sent you to Your Payfast sub account attached to our main Payfast account once the Driver has succesfully dropped of the sticker and free sample package, or the Store it self has confirmed succesful collection or drop off of the particular sticker and sample purchased. We know that Yourr legal grow deserves to be shared and its always awesome to have a few different strains around the house, so get creating.
                    </p>
                    <p>
                        Whats cool about the Triple S Club is each sticker is uniquely created with the help of  Open AI's Dalle 3, and each sticker is truly unique. We also have a dedicated already created Triple S Sticker card set for fellow ganga enthusiasts to enjoy.
                    </p>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="stickerProgramOptIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold text-gray-800">Participate in this programme?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger></FormControl>
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

          {showStrainFinder && (
            <div className="animate-fade-in-scale-up">
              <StrainFinder onStrainSelect={handleStrainSelect} onSkip={handleSkipStrainFinder} />
            </div>
          )}
          
          {isCannabinoidStream && showCategorySelector && (
              <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                  <Separator />
                  <h3 className="text-xl font-semibold border-b pb-2">Category Selection *</h3>
                  
                  {isLoadingInitialData ? <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : 
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {Object.entries(deliveryMethods).map(([categoryName, items]) => {
                          if (!Array.isArray(items)) return null;
                          const lastItem = items.length > 0 ? items[items.length - 1] : null;
                          const isLastItemImageMap = typeof lastItem === 'object' && lastItem !== null && lastItem.hasOwnProperty('imageUrl');
                          const imageUrl = isLastItemImageMap ? lastItem.imageUrl : null;
                          const subOptions = isLastItemImageMap ? items.slice(0, -1) : [...items];

                          return (
                              <div key={categoryName} className="flex flex-col gap-2">
                                  <Card 
                                      onClick={() => handleCategorySelect(categoryName)} 
                                      className={cn("cursor-pointer hover:border-primary flex-grow flex flex-col group overflow-hidden", watchCategory === categoryName && "border-primary ring-2 ring-primary")}
                                  >
                                    <CardHeader className="p-0 flex-grow h-48 relative">
                                        <div className="relative h-full w-full bg-muted">
                                          {imageUrl ? (
                                              <Image src={imageUrl} alt={categoryName} layout="fill" objectFit="cover" className="transition-transform group-hover:scale-105" data-ai-hint={`category ${categoryName}`} />
                                          ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                  <ImageIconLucide className="h-12 w-12 text-muted-foreground/30"/>
                                              </div>
                                          )}
                                        </div>
                                      </CardHeader>
                                      <CardContent className="p-3">
                                          <CardTitle className="text-center text-base">{categoryName}</CardTitle>
                                      </CardContent>
                                  </Card>
                                  {watchCategory === categoryName && Array.isArray(subOptions) && subOptions.length > 0 && (
                                      <FormField
                                          control={form.control}
                                          name="subcategory"
                                          render={({ field }) => (
                                          <FormItem>
                                              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                                  <FormControl><SelectTrigger><SelectValue placeholder={`Select ${categoryName} type`} /></SelectTrigger></FormControl>
                                                  <SelectContent>{subOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                              </Select>
                                              <FormMessage />
                                          </FormItem>
                                      )} />
                                  )}
                              </div>
                          );
                      })}
                  </div>}
              </div>
          )}

          {showProductForm && (
              <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                  <Separator />
                  <h3 className="text-xl font-semibold border-b pb-2">Product Details</h3>
                  <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                  
                  {selectedProductStream === 'Apparel' && (
                    <>
                      <Separator/>
                      <h3 className="text-xl font-semibold border-b pb-2">Apparel Details</h3>
                       <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="subcategory" render={({ field }) => ( <FormItem><FormLabel>Apparel Type *</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{apparelTypes.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent>{apparelGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="sizingSystem" render={({ field }) => ( <FormItem><FormLabel>Sizing System</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select sizing system" /></SelectTrigger></FormControl><SelectContent>{sizingSystemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="sizes" render={({ field }) => ( <FormItem><FormLabel>Available Sizes</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="Add a size..." value={field.value || []} onChange={field.onChange} availableStandardSizes={availableStandardSizes} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
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
          <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
          <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
        </form>
      </Form>
    </div>
  );
}
