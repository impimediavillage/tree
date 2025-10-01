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
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Product as ProductType } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Trash2, Users, ChevronsUpDown } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const getProductCollectionName = (): string => {
    return 'cannibinoid_store_products';
};

export default function EditTHCProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { allDispensaries, isLoadingDispensaries } = useDispensaryAdmin();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  
  const [files, setFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [originalImageUrls, setOriginalImageUrls] = useState<string[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  const [existingLabTestUrl, setExistingLabTestUrl] = useState<string | null>(null);

  const productCollectionName = getProductCollectionName();
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null, priceTiers: [],
      poolPriceTiers: [], isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null, imageUrls: [],
      productType: 'THC',
      poolSharingRule: 'same_type', allowedPoolDispensaryIds: [],
    }
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });

  const watchLabTested = form.watch('labTested');
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchPoolSharingRule = form.watch('poolSharingRule');

  const fetchInitialData = useCallback(async () => {
    if (authLoading || !productId || !productCollectionName) {
      if (!authLoading) setIsLoadingInitialData(false); return;
    }
    setIsLoadingInitialData(true);
    try {
        const productDocRef = doc(db, productCollectionName, productId);
        const productSnap = await getDoc(productDocRef);
        if (!productSnap.exists() || productSnap.data().dispensaryId !== currentUser?.dispensaryId) {
            toast({ title: "Not Found", description: "Product not found or you don't have permission to edit it.", variant: "destructive" });
            router.push('/dispensary-admin/products');
            return;
        }

        const productData = productSnap.data() as ProductType;
        form.reset(productData as ProductFormData);
        const imageUrls = productData.imageUrls || [];
        setExistingImageUrls(imageUrls);
        setOriginalImageUrls(imageUrls);
        setExistingLabTestUrl(productData.labTestReportUrl || null);

    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load data for editing.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [productId, authLoading, toast, router, form, currentUser, productCollectionName]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  const onSubmit = async (data: ProductFormData) => {
    if (!currentDispensary || !currentUser || !productId) { toast({ title: "Error", description: "Cannot update without required data.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        const imagesToDelete = originalImageUrls.filter(url => !existingImageUrls.includes(url));
        if (imagesToDelete.length > 0) {
            toast({ title: "Deleting Old Images..." });
            const deletePromises = imagesToDelete.map(url => deleteObject(storageRef(storage, url)).catch(e => console.warn(`Failed to delete ${url}`, e)));
            await Promise.all(deletePromises);
        }

        let newImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading New Images..." });
            const uploadPromises = files.map(file => { const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`); return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref)); });
            newImageUrls = await Promise.all(uploadPromises);
        }

        const finalImageUrls = [...existingImageUrls, ...newImageUrls];
        
        let finalLabTestUrl = existingLabTestUrl;
        if (labTestFile) {
            toast({ title: "Uploading Lab Report..." });
            if(existingLabTestUrl) { try { await deleteObject(storageRef(storage, existingLabTestUrl)); } catch(e) { console.warn("Old lab report not found.")} }
            const sRef = storageRef(storage, `lab-reports/${currentUser.uid}/${Date.now()}_${labTestFile.name}`);
            finalLabTestUrl = await getDownloadURL((await uploadBytesResumable(sRef, labTestFile)).ref);
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

  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center text-foreground"> <Save className="mr-3 h-8 w-8 text-primary" /> Edit Product </CardTitle>
            <Button variant="outline" size="sm" asChild><Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
        </div>
        <CardDescription className="text-foreground">Modify details for &quot;{form.getValues('name')}&quot;.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2 text-foreground">Product Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/50 p-3 rounded-md border">
                  <FormItem><FormLabel>Product Stream</FormLabel><Input value={form.getValues('productType') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                  <FormItem><FormLabel>Category</FormLabel><Input value={form.getValues('category')} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                  <FormItem><FormLabel>Subcategory</FormLabel><Input value={form.getValues('subcategory') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
              </div>

              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormMessage> )} />
              
              <Separator/>
              <h3 className="text-xl font-semibold border-b pb-2">Cannabinoid & Terpene Profile</h3>
              <FormField control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects</FormLabel><FormControl><MultiInputTags inputType="attribute" placeholder="e.g., Happy, Relaxed" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses</FormLabel><FormControl><MultiInputTags inputType="attribute" placeholder="e.g., Pain, Anxiety" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Pine, Citrus" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Lab Tested</FormLabel><FormDescription>Check this if you have a lab report for this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
              {watchLabTested && (
                  <Card className="p-4 bg-muted/50"><CardContent className="p-0">
                      <FormItem><FormLabel>Lab Report</FormLabel>
                        {existingLabTestUrl && <div className="text-sm my-2"><a href={existingLabTestUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View current report</a></div>}
                        <FormControl><SingleImageDropzone value={labTestFile} onChange={setLabTestFile} /></FormControl>
                        <FormDescription>{existingLabTestUrl ? "Upload a new file to replace the existing one." : "Upload a PDF or image of the lab test results."}</FormDescription>
                      </FormItem>
                  </CardContent></Card>
              )}
              
              <Separator />
              <h3 className="text-xl font-semibold border-b pb-2">Pricing & Stock</h3>
              <div className="space-y-4">
              {priceTierFields.map((field, index) => (
                  <Card key={field.id} className="p-4 bg-muted/30 relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} onChange={e => f.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <Collapsible className="mt-4">
                        <CollapsibleTrigger asChild><Button variant="ghost" className="flex items-center w-full justify-start p-2 -ml-2"><ChevronsUpDown className="h-4 w-4 mr-2" /><span className="text-md font-semibold">Packaging Details</span></Button></CollapsibleTrigger>
                        <CollapsibleContent className="animate-fade-in-scale-up">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start pt-2">
                                <FormField control={form.control} name={`priceTiers.${index}.weight`} render={({ field: f }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.001" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.length`} render={({ field: f }) => ( <FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.width`} render={({ field: f }) => ( <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.height`} render={({ field: f }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                    {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                  </Card>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: 0, quantityInStock: 0, description: '', weight: null, length: null, width: null, height: null })}>Add Price Tier</Button>
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
                      <CardHeader className="p-2 pt-0"><CardTitle className="text-lg flex items-center"><Users className="mr-2 h-5 w-5" /> Pool Pricing & Sharing</CardTitle></CardHeader>
                      <CardContent className="space-y-4 p-2">
                          {poolPriceTierFields.map((field, index) => (
                              <Card key={field.id} className="p-4 bg-background relative">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                      <FormField control={form.control} name={`poolPriceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="pool-units-list" /></FormControl><FormMessage /></FormItem> )} />
                                      <FormField control={form.control} name={`poolPriceTiers.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} onChange={e => f.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )} />
                                      <FormField control={form.control} name={`poolPriceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                  </div>
                                  <Collapsible className="mt-4">
                                      <CollapsibleTrigger asChild><Button variant="ghost" className="flex items-center w-full justify-start p-2 -ml-2"><ChevronsUpDown className="h-4 w-4 mr-2" /><span className="text-md font-semibold">Packaging Details</span></Button></CollapsibleTrigger>
                                      <CollapsibleContent className="animate-fade-in-scale-up">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start pt-2">
                                              <FormField control={form.control} name={`poolPriceTiers.${index}.weight`} render={({ field: f }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.001" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormMessage> )} />
                                              <FormField control={form.control} name={`poolPriceTiers.${index}.length`} render={({ field: f }) => ( <FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                              <FormField control={form.control} name={`poolPriceTiers.${index}.width`} render={({ field: f }) => ( <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                              <FormField control={form.control} name={`poolPriceTiers.${index}.height`} render={({ field: f }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} onChange={e => f.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                          </div>
                                      </CollapsibleContent>
                                  </Collapsible>
                                  {poolPriceTierFields.length > 0 && <Button type="button" variant="ghost" size="icon" onClick={() => removePoolPriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                              </Card>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={() => appendPoolPriceTier({ unit: '', price: 0, quantityInStock: 0, description: '', weight: null, length: null, width: null, height: null })}>Add Pool Price Tier</Button>
                          <FormField control={form.control} name="poolSharingRule" render={({ field }) => ( <FormItem><FormLabel>Pool Sharing Rule</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a sharing rule" /></SelectTrigger></FormControl><SelectContent><SelectItem value="same_type">Share with all dispensaries of the same type</SelectItem><SelectItem value="specific_stores">Share with specific dispensaries only</SelectItem><SelectItem value="all_types">Share with all dispensaries</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                          {watchPoolSharingRule === 'specific_stores' && (
                            <FormField control={form.control} name="allowedPoolDispensaryIds" render={({ field }) => ( <FormItem><FormLabel>Allowed Dispensaries</FormLabel><FormControl><DispensarySelector allDispensaries={allDispensaries} isLoading={isLoadingDispensaries} selectedDispensaries={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                          )}
                      </CardContent>
                  </Card>
              )}

              <Separator />
              <h3 className="text-xl font-semibold border-b pb-2">Images & Tags</h3>
              <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={setFiles} existingImageUrls={existingImageUrls} onExistingImageDelete={(url) => setExistingImageUrls(prev => prev.filter(u => u !== url))} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
              
              <CardFooter className="p-0 pt-6">
                <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Save Changes
                </Button>
              </CardFooter>
          </form>
        </Form>
      </CardContent>
      <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
      <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
    </Card>
  );
}
