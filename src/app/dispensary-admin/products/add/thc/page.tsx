
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, functions } from '@/lib/firebase';
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
import { Loader2, PackagePlus, ArrowLeft, Trash2, Leaf, Flame, Droplets, Microscope, Gift, Shirt, Sparkles, Check } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { StrainFinder } from '@/components/dispensary-admin/StrainFinder';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

type ProductStream = 'THC' | 'CBD';

const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const extractFlavorsFromDescription = (description: string): string[] => {
    const flavorKeywords = ['earthy', 'sweet', 'citrus', 'pine', 'skunky', 'grape', 'woody', 'diesel', 'berry', 'lemon', 'pungent', 'flowery', 'spicy', 'herbal', 'orange', 'vanilla', 'nutty', 'minty', 'honey', 'lavender', 'fruity'];
    const foundFlavors = new Set<string>();
    const lowercasedDescription = description.toLowerCase();
    
    flavorKeywords.forEach(flavor => {
        if (lowercasedDescription.includes(flavor)) {
            foundFlavors.add(toTitleCase(flavor));
        }
    });

    return Array.from(foundFlavors);
};

// Callable function reference
const getCategoriesCallable = httpsCallable(functions, 'getCannabinoidProductCategories');

export default function AddTHCProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  
  const [deliveryMethods, setDeliveryMethods] = useState<Record<string, any[]>>({});
  const [isStrainSelected, setIsStrainSelected] = useState(false);
  const [selectedProductStream, setSelectedProductStream] = useState<ProductStream | null>(null);
  const [showStrainFinder, setShowStrainFinder] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showStickerOptInSection, setShowStickerOptInSection] = useState(false);
  
  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  
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
      stickerProgramOptIn: 'no',
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchLabTested = form.watch('labTested');
  const watchStickerOptIn = form.watch('stickerProgramOptIn');
  const watchCategory = form.watch('category');

  const fetchInitialData = useCallback(async (stream: 'THC' | 'CBD') => {
    if (authLoading) return;
    setIsLoadingInitialData(true);
    setDeliveryMethods({});
    try {
        const result = await getCategoriesCallable({ stream });
        const methods = result.data as Record<string, any[]>;

        if (methods && typeof methods === 'object') {
            setDeliveryMethods(methods);
        } else {
            console.warn(`Could not find 'Delivery Methods' for stream '${stream}' in the fetched data.`, methods);
            toast({ title: "Configuration Warning", description: `Product categories for "${stream}" might not be fully configured.`, variant: "default" });
        }
    } catch (error) {
        console.error("Error fetching initial data via callable:", error);
        toast({ title: "Error", description: "Could not load necessary category data.", variant: "destructive" });
    } finally {
        setIsLoadingInitialData(false);
    }
  }, [toast, authLoading]);
  
  const handleProductStreamSelect = (stream: ProductStream) => {
    // Reset selections when stream changes
    form.reset({
      ...form.getValues(),
      name: '', description: '', category: '', subcategory: null,
      effects: [], flavors: [], medicalUses: [],
      thcContent: '', cbdContent: '', mostCommonTerpene: '',
      strain: '', strainType: '', homeGrow: [], feedingType: undefined,
      stickerProgramOptIn: 'no',
    });
    setIsStrainSelected(false);
    setShowCategorySelector(false);

    setSelectedProductStream(stream);
    fetchInitialData(stream);

    if (stream === 'THC') {
        setShowStickerOptInSection(true);
        setShowStrainFinder(false); // Hide until opt-in
    } else if (stream === 'CBD') {
        setShowStickerOptInSection(false);
        setShowStrainFinder(true); // Show immediately for CBD
        setShowCategorySelector(false); // Hide until strain selected
    }
  };
  
  // Effect for THC Sticker Opt-in
  useEffect(() => {
    if (selectedProductStream === 'THC') {
        setShowStrainFinder(watchStickerOptIn === 'yes');
        // Reset selections if they opt-out
        if (watchStickerOptIn === 'no') {
            setIsStrainSelected(false);
            setShowCategorySelector(false);
        }
    }
  }, [watchStickerOptIn, selectedProductStream]);
  
  
  const handleStrainSelect = (strainData: any) => {
    form.setValue('name', strainData.name);
    form.setValue('strain', strainData.name);
    form.setValue('strainType', strainData.type);
    form.setValue('description', strainData.description);
    form.setValue('thcContent', strainData.thc_level);
    form.setValue('mostCommonTerpene', strainData.most_common_terpene);
    
    const effects: ProductAttribute[] = Object.entries(strainData.effects || {})
        .map(([key, value]) => ({ name: toTitleCase(key.replace(/_/g, ' ')), percentage: String(value) }));

    const medical: ProductAttribute[] = Object.entries(strainData.medical || {})
        .map(([key, value]) => ({ name: toTitleCase(key.replace(/_/g, ' ')), percentage: String(value) }));

    form.setValue('effects', effects.filter(e => parseInt(e.percentage, 10) > 0));
    form.setValue('medicalUses', medical.filter(m => parseInt(m.percentage, 10) > 0));
    
    const autoFlavors = extractFlavorsFromDescription(strainData.description);
    const existingFlavors = Array.isArray(strainData.flavor) ? strainData.flavor : [];
    form.setValue('flavors', Array.from(new Set([...autoFlavors, ...existingFlavors])));

    setIsStrainSelected(true);
    setShowCategorySelector(true); // Show categories after strain is selected
    toast({ title: "Strain Loaded", description: `${strainData.name} details have been filled in. Please select a product category.` });
  };
  
  const handleCategorySelect = (categoryName: string) => {
      form.setValue('category', categoryName, { shouldValidate: true });
      form.setValue('subcategory', null);
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentDispensary || !currentUser) {
      toast({ title: "Error", description: "Cannot submit without dispensary data.", variant: "destructive" });
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

        const productData: Omit<ProductType, 'id'> = {
            ...data,
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
        await addDoc(collection(db, 'products'), productData);
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
    { key: 'THC', title: 'Cannabinoid (other)', icon: Flame },
    { key: 'CBD', title: 'CBD', icon: Leaf },
  ];
  
  const showProductForm = (selectedProductStream === 'THC' && watchStickerOptIn === 'no' && form.getValues('category') && form.getValues('subcategory')) || (selectedProductStream === 'THC' && watchStickerOptIn === 'yes' && isStrainSelected && form.getValues('category') && form.getValues('subcategory')) || (selectedProductStream === 'CBD' && isStrainSelected && form.getValues('category') && form.getValues('subcategory'));

  if (authLoading) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <Card className="shadow-xl animate-pulse"> <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader> <CardContent className="p-6 space-y-6"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> <CardFooter><Skeleton className="h-12 w-full" /></CardFooter> </Card> </div> );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add Cannabinoid Product</h1>
          <p className="text-muted-foreground mt-1">Select a product stream to begin.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
              {productStreams.map(stream => (
                  <Button key={stream.key} type="button" variant={selectedProductStream === stream.key ? 'default' : 'outline'} className="h-24 flex-col gap-2" onClick={() => handleProductStreamSelect(stream.key)}>
                      <stream.icon className="h-8 w-8" />
                      <span>{stream.title}</span>
                  </Button>
              ))}
          </div>
          
          {showStickerOptInSection && (
              <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner animate-fade-in-scale-up">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-orange-800"><Gift className="text-yellow-500 fill-yellow-400"/>The Triple S (Strain-Sticker-Sample) Club</CardTitle>
                      <CardDescription className="text-orange-700/80">Opt-in to include this product in our exclusive sticker promotion. Customers buy a sticker design and get a sample of your product for free!</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <FormField
                          control={form.control}
                          name="stickerProgramOptIn"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel className="text-lg font-semibold text-gray-800">Participate in this programme?</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? 'no'}>
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
                <StrainFinder onStrainSelect={handleStrainSelect} />
            </div>
          )}
          
          {(showCategorySelector || (selectedProductStream === 'THC' && watchStickerOptIn === 'no')) && (
              <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                  <Separator />
                  <h3 className="text-xl font-semibold border-b pb-2">Category Selection *</h3>
                  
                  {isLoadingInitialData ? <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : 
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {Object.entries(deliveryMethods).map(([categoryName, subArray]) => {
                          const lastItem = Array.isArray(subArray) && subArray.length > 0 ? subArray[subArray.length - 1] : null;
                          const isObjectWithImageUrl = lastItem && typeof lastItem === 'object' && lastItem !== null && 'imageUrl' in lastItem;
                          const imageUrl = isObjectWithImageUrl ? (lastItem as any).imageUrl : null;
                          const subOptions = Array.isArray(subArray) ? (isObjectWithImageUrl ? subArray.slice(0, -1) : subArray) : [];

                          return (
                              <div key={categoryName} className="flex flex-col gap-2">
                                  <Card 
                                      onClick={() => handleCategorySelect(categoryName)} 
                                      className={cn("cursor-pointer hover:border-primary flex-grow flex flex-col", watchCategory === categoryName && "border-primary ring-2 ring-primary")}
                                  >
                                      <CardHeader className="p-0">
                                          <div className="relative aspect-video w-full">
                                              {imageUrl ? (
                                                  <Image src={imageUrl} alt={categoryName} layout="fill" objectFit="cover" className="rounded-t-md" />
                                              ) : (
                                                  <div className="w-full h-full bg-muted rounded-t-md flex items-center justify-center">
                                                      <Flame className="h-12 w-12 text-muted-foreground/30"/>
                                                  </div>
                                              )}
                                          </div>
                                      </CardHeader>
                                      <CardContent className="p-3 mt-auto">
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
                  
                  <Separator />
                  <h3 className="text-xl font-semibold border-b pb-2">Cannabinoid & Terpene Profile</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC Content (%)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD Content (%)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="mostCommonTerpene" render={({ field }) => ( <FormItem><FormLabel>Most Common Terpene</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                  </div>
                  <div className="space-y-4">
                      <FormField control={form.control} name="effects" render={({ field }) => ( 
                          <FormItem>
                              <FormLabel>Effects</FormLabel>
                              <FormControl><MultiInputTags placeholder="e.g., Relaxed, Happy" value={field.value?.map(e => e.name) || []} onChange={(names) => field.onChange(names.map(name => ({name, percentage: '0'})))} getTagClassName={() => "bg-purple-100 text-purple-800 border-purple-300"} /></FormControl>
                              <FormMessage />
                          </FormItem> 
                      )} />
                      <FormField control={form.control} name="flavors" render={({ field }) => ( 
                          <FormItem>
                              <FormLabel>Flavors</FormLabel>
                              <FormControl><MultiInputTags placeholder="e.g., Earthy, Citrus" value={field.value || []} onChange={field.onChange} getTagClassName={() => "bg-sky-100 text-sky-800 border-sky-300"} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="medicalUses" render={({ field }) => ( 
                          <FormItem>
                              <FormLabel>Medical Uses</FormLabel>
                              <FormControl><MultiInputTags placeholder="e.g., Pain, Anxiety" value={field.value?.map(m => m.name) || []} onChange={(names) => field.onChange(names.map(name => ({name, percentage: '0'})))} getTagClassName={() => "bg-blue-100 text-blue-800 border-blue-300"} /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                  </div>
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
                      <h3 className="text-xl font-semibold border-b pb-2">Images, Tags & Lab Results</h3>
                      <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags placeholder="e.g., Organic, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Lab Tested</FormLabel><FormDescription>Indicate if the product has a lab test report.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                      {watchLabTested && (
                          <FormField control={form.control} name="labTestReportUrl" render={() => ( <FormItem><FormLabel>Lab Report</FormLabel><FormControl><SingleImageDropzone value={labTestFile} onChange={(file) => setLabTestFile(file)} /></FormControl><FormDescription>Upload the lab report PDF or image file.</FormDescription><FormMessage /></FormItem> )} />
                      )}
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

    