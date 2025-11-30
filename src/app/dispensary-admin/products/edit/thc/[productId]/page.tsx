'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDispensaryAdmin } from '@/contexts/DispensaryAdminContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { productSchema, type ProductFormData, type ProductAttribute } from '@/lib/schemas';
import type { Product as ProductType, Dispensary } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Trash2, Shirt, Sparkles, Flame, Leaf as LeafIconLucide, Gift, Brush, Palette, Home, Brain, ChevronsUpDown, Check, Package } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn, getProductCollectionName } from '@/lib/utils';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const apparelGenders = ['Mens', 'Womens', 'Unisex'];
const apparelSizingSystemOptions = ['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other'];
const apparelTypes = ['T-Shirt', 'Hoodie', 'Cap', 'Jacket', 'Pants', 'Footwear', 'Underwear', 'Shorts', 'Scarves', 'Socks', 'Jewelry', 'Other'];

const standardSizesData: Record<string, Record<string, string[]>> = {
  'Mens': { 'UK/SA': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'], 'US': ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14', '15'], 'EURO': ['40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46', '47'], 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] },
  'Womens': { 'UK/SA': ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '9', '10'], 'US': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11', '12'], 'EURO': ['35.5', '36', '36.5', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '43'], 'Alpha (XS-XXXL)': ['XXS','XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  'Unisex': { 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] }
};

export default function EditCannabinoidProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { allDispensaries, isLoadingDispensaries } = useDispensaryAdmin();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);
  
  const [files, setFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [originalImageUrls, setOriginalImageUrls] = useState<string[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  const [existingLabTestUrl, setExistingLabTestUrl] = useState<string | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      subcategory: '',
      subSubcategory: '',
      gender: '',
      sizingSystem: '',
      growingMedium: '',
      feedingType: '',
      labTestReportUrl: null,
      tags: [],
      sizes: [],
      effects: [],
      medicalUses: [],
      flavors: [],
      homeGrow: [],
      priceTiers: [],
      poolPriceTiers: [],
      allowedPoolDispensaryIds: [],
      isAvailableForPool: false,
      labTested: false,
      poolSharingRule: 'same_type',
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchLabTested = form.watch('labTested');
  const watchSizingSystem = form.watch('sizingSystem');
  const watchGender = form.watch('gender');
  const watchPoolSharingRule = form.watch('poolSharingRule');
  const watchAllowedPoolIds = form.watch('allowedPoolDispensaryIds');

  const fetchInitialData = useCallback(async () => {
    if (authLoading || !productId || !currentDispensary?.dispensaryType) {
      if (!authLoading) setIsLoadingInitialData(false);
      return;
    }
    setIsLoadingInitialData(true);
    try {
        const productCollectionName = getProductCollectionName(currentDispensary.dispensaryType);
        const productDocRef = doc(db, productCollectionName, productId);
        const productSnap = await getDoc(productDocRef);
        if (!productSnap.exists() || productSnap.data().dispensaryId !== currentUser?.dispensaryId) {
            toast({ title: "Not Found", description: "Product not found or you don't have permission to edit it.", variant: "destructive" });
            router.push('/dispensary-admin/products');
            return;
        }

        const productData = productSnap.data() as ProductType;

        const sanitizedData = {
          ...productData,
          gender: productData.gender || undefined,
          sizingSystem: productData.sizingSystem || undefined,
          growingMedium: productData.growingMedium || undefined,
          feedingType: productData.feedingType || undefined,
          labTestReportUrl: productData.labTestReportUrl || null,
          tags: productData.tags || [],
          sizes: productData.sizes || [],
          effects: productData.effects || [],
          medicalUses: productData.medicalUses || [],
          flavors: productData.flavors || [],
          homeGrow: productData.homeGrow || [],
          priceTiers: productData.priceTiers?.map(tier => ({ ...tier, price: tier.price ?? '', quantityInStock: tier.quantityInStock ?? '' })) || [],
          poolPriceTiers: productData.poolPriceTiers?.map(tier => ({ ...tier, price: tier.price ?? '', quantityInStock: tier.quantityInStock ?? '' })) || [],
          allowedPoolDispensaryIds: productData.allowedPoolDispensaryIds || [],
        };

        form.reset(sanitizedData as unknown as ProductFormData);
        const imageUrls = productData.imageUrls || [];
        setExistingImageUrls(imageUrls);
        setOriginalImageUrls(imageUrls);
        setExistingLabTestUrl(productData.labTestReportUrl || null);

    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load data for editing.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [productId, authLoading, toast, router, form, currentUser, currentDispensary]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
  useEffect(() => {
    const gender = form.getValues('gender'); 
    const system = form.getValues('sizingSystem');
    if (gender && system && standardSizesData[gender] && standardSizesData[gender][system]) { 
        setAvailableStandardSizes(standardSizesData[gender][system]!); 
    } else { 
        setAvailableStandardSizes([]); 
    }
  }, [watchGender, watchSizingSystem, form]);
  
  const onValidationErrors = (errors: any) => {
    console.error("Form validation errors:", errors);
    const errorKeys = Object.keys(errors);
    let firstErrorKey = errorKeys.find(key => errors[key] && typeof errors[key].message === 'string');
    let firstErrorMessage = firstErrorKey ? errors[firstErrorKey].message : 'An unknown validation error occurred.';
  
    if (!firstErrorKey) {
        const complexErrorKey = errorKeys[0];
        if (complexErrorKey && errors[complexErrorKey] && Array.isArray(errors[complexErrorKey])) {
            const index = errors[complexErrorKey].findIndex((e: any) => e);
            if (index !== -1) {
                const fieldError = errors[complexErrorKey][index];
                if(fieldError) {
                    const subKey = Object.keys(fieldError)[0];
                    if(subKey) {
                        firstErrorKey = `${complexErrorKey}[${index}].${subKey}`;
                        firstErrorMessage = fieldError[subKey].message;
                    }
                }
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
    if (!currentDispensary || !currentUser || !currentDispensary.dispensaryType) { toast({ title: "Error", description: "Cannot update without required data.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        // --- Image Deletion Logic ---
        const productCollectionName = getProductCollectionName(currentDispensary.dispensaryType);
        const imagesToDelete = originalImageUrls.filter(url => !existingImageUrls.includes(url));
        if (imagesToDelete.length > 0) {
            toast({ title: "Deleting Old Images...", description: `Removing ${imagesToDelete.length} image(s).`, variant: "default" });
            const deletePromises = imagesToDelete.map(url => {
                try {
                    const imageRef = storageRef(storage, url);
                    return deleteObject(imageRef);
                } catch (error) {
                    console.warn(`Failed to create ref for old image ${url}, it might have already been deleted.`, error);
                    return Promise.resolve(); // Continue if a ref fails
                }
            });
            await Promise.all(deletePromises);
        }

        // --- New Image Upload Logic ---
        let newImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading New Images...", description: "Please wait while new product images are uploaded.", variant: "default" });
            const uploadPromises = files.map(file => { const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`); return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref)); });
            newImageUrls = await Promise.all(uploadPromises);
        }

        const finalImageUrls = [...existingImageUrls, ...newImageUrls];
        
        let finalLabTestUrl = existingLabTestUrl;
        if (labTestFile) {
            toast({ title: "Uploading Lab Report...", description: "Please wait while your lab report is uploaded.", variant: "default" });
            if(existingLabTestUrl) {
                try { await deleteObject(storageRef(storage, existingLabTestUrl)); } catch(e) { console.warn("Old lab report not found, continuing.")}
            }
            const sRef = storageRef(storage, `lab-reports/${currentUser.uid}/${Date.now()}_${labTestFile.name}`);
            const snapshot = await uploadBytesResumable(sRef, labTestFile);
            finalLabTestUrl = await getDownloadURL(snapshot.ref);
        }
        
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
        );

        const productData = { 
            ...sanitizedData, 
            updatedAt: serverTimestamp(), 
            imageUrls: finalImageUrls, 
            imageUrl: finalImageUrls[0] || null,
            labTestReportUrl: finalLabTestUrl, 
            quantityInStock: data.priceTiers.reduce((acc, tier) => acc + (Number(tier.quantityInStock) || 0), 0) 
        };
        
        await updateDoc(doc(db, productCollectionName, productId), productData as any);

        toast({ title: "Success!", description: `Product "${data.name}" has been updated.` });
        router.push('/dispensary-admin/products');
    } catch (error) {
        console.error("Error updating product:", error);
        toast({ title: "Update Failed", description: "An error occurred while updating the product.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };
  
  if (isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <Card className="shadow-xl animate-pulse"> <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader> <CardContent className="p-6 space-y-6"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> <CardFooter><Skeleton className="h-12 w-full" /></CardFooter> </Card> </div> );
  }
  const isCannabinoidStream = form.getValues('productType') === 'THC' || form.getValues('productType') === 'CBD';

  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center text-[#5D4E37] font-extrabold"> <Save className="mr-3 h-10 w-10 text-[#006B3E]" /> Edit Product </CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push('/dispensary-admin/products')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Back to Products
            </Button>
        </div>
        <CardDescription className="text-[#5D4E37] font-semibold"> Modify details for &quot;{form.getValues('name')}&quot;. </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit, onValidationErrors)} className="space-y-6">
            <div className="space-y-6">
                <h2 className="text-2xl font-extrabold border-b pb-2 text-[#5D4E37]">Product Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/50 p-3 rounded-md border">
                    <FormItem><FormLabel>Product Stream</FormLabel><Input value={form.getValues('productType') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                    <FormItem><FormLabel>Category</FormLabel><Input value={form.getValues('category')} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                    <FormItem><FormLabel>Subcategory</FormLabel><Input value={form.getValues('subcategory') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                </div>

                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                
                {form.getValues('productType') === 'Apparel' && (
                  <>
                    <Separator/>
                    <h3 className="font-extrabold text-[#5D4E37] text-xl border-b pb-2">Apparel Details</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="subcategory" render={({ field }) => ( <FormItem><FormLabel>Apparel Type *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{apparelTypes.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent>{apparelGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="sizingSystem" render={({ field }) => ( <FormItem><FormLabel>Sizing System</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select sizing system" /></SelectTrigger></FormControl><SelectContent>{apparelSizingSystemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                      </div>
                      <FormField control={form.control} name="sizes" render={({ field }) => ( <FormItem><FormLabel>Available Sizes</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="Add a size..." value={field.value || []} onChange={field.onChange} availableStandardSizes={availableStandardSizes} /></FormControl><FormMessage /></FormItem> )} />
                  </>
                )}
                {isCannabinoidStream && (
                  <>
                      <Separator/>
                      <h3 className="font-extrabold text-[#5D4E37] text-xl border-b pb-2">Cannabinoid & Terpene Profile</h3>
                      <FormField control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects</FormLabel><FormControl><MultiInputTags inputType="attribute" placeholder="e.g., Happy, Relaxed" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses</FormLabel><FormControl><MultiInputTags inputType="attribute" placeholder="e.g., Pain, Anxiety" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Pine, Citrus" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Lab Tested</FormLabel><FormDescription>Check this if you have a lab report for this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                      {watchLabTested && (
                          <Card className="p-4 bg-muted/50"><CardContent className="p-0">
                              <FormItem><FormLabel>Lab Report</FormLabel>
                                {existingLabTestUrl && <div className="text-sm my-2"><a href={existingLabTestUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View current report</a></div>}
                                <FormControl><SingleImageDropzone value={labTestFile} onChange={(file) => setLabTestFile(file)} /></FormControl>
                                <FormDescription>{existingLabTestUrl ? "Upload a new file to replace the existing one." : "Upload a PDF or image of the lab test results."}</FormDescription>
                              </FormItem>
                          </CardContent></Card>
                      )}
                  </>
                )}
                
                <div className="space-y-6">
                    <Separator />
                    <h3 className="font-extrabold text-[#5D4E37] text-xl border-b pb-2">Pricing & Stock</h3>
                    <div className="space-y-4">
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
                                      </div>
                                     <Separator />
                    <h3 className="font-extrabold text-[#5D4E37] text-xl border-b pb-2">Product Pool Settings</h3>
                    <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other stores of the same type to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                    {watchIsAvailableForPool && (
                    <Card className="p-4 bg-muted/50 space-y-4">
                        <FormField
                            control={form.control}
                            name="poolSharingRule"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">Pool Sharing Rule *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || 'same_type'}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select how to share this product" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="same_type">Share with all dispensaries in my Wellness type</SelectItem>
                                            <SelectItem value="all_types">Share with all Wellness types</SelectItem>
                                            <SelectItem value="specific_stores">Share with specific stores only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {watchPoolSharingRule === 'specific_stores' && (
                             <DispensarySelector
                                allDispensaries={allDispensaries}
                                isLoading={isLoadingDispensaries}
                                selectedIds={form.watch('allowedPoolDispensaryIds') || []}
                                onSelectionChange={(ids) => form.setValue('allowedPoolDispensaryIds', ids)}
                            />
                        )}
                        <CardHeader className="p-0 mb-2"><CardTitle className="text-lg">Pool Pricing Tiers *</CardTitle><CardDescription>Define pricing for bulk transfers to other stores.</CardDescription></CardHeader>
                        <CardContent className="p-0 space-y-2">
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
                        </CardContent>
                        </Card>
                    )}
                    <Separator />
                    <h3 className="font-extrabold text-[#5D4E37] text-xl border-b pb-2">Images & Tags</h3>
                    <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} existingImageUrls={existingImageUrls} onExistingImageDelete={(url) => setExistingImageUrls(prev => prev.filter(u => u !== url))} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </div>
            
            <CardFooter>
              <div className="flex w-full">
                  <Button type="submit" size="lg" className="w-full text-lg font-bold bg-[#006B3E] hover:bg-[#5D4E37] active:bg-[#006B3E] text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
                      Save Changes
                  </Button>
              </div>
            </CardFooter>
            <datalist id="regular-units-list">
                {regularUnits.map(unit => <option key={unit} value={unit} />)}
            </datalist>
            <datalist id="pool-units-list">
                {poolUnits.map(unit => <option key={unit} value={unit} />)}
            </datalist>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

