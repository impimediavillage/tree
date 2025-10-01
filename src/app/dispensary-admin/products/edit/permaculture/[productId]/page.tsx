

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Trash2, Leaf, Check } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';

const regularUnits = [ "gram", "kg", "ml", "litre", "unit", "pack", "box", "seedling", "cutting", "plant", "bag" ];
const poolUnits = [ "10kg", "25kg", "50kg", "100 litres", "200 litres", "pallet", "crate" ];

const allShippingMethods = [
  { id: "dtd", label: "DTD - Door to Door (The Courier Guy)" },
  { id: "dtl", label: "DTL - Door to Locker (Pudo)" },
  { id: "ltd", label: "LTD - Locker to Door (Pudo)" },
  { id: "ltl", label: "LTL - Locker to Locker (Pudo)" },
  { id: "collection", label: "Collection from store" },
  { id: "in_house", label: "In-house delivery service" },
];

const getProductCollectionName = (): string => {
    return 'permaculture_store_products';
};

export default function EditPermacultureProductPage() {
  const { currentUser, loading: authLoading } = useAuth();
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
  
  const productCollectionName = getProductCollectionName();
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchPoolSharingRule = form.watch('poolSharingRule');

  const fetchInitialData = useCallback(async () => {
    if (authLoading || !productId || !productCollectionName) {
      if (!authLoading) setIsLoadingInitialData(false);
      return;
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
        
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load data for editing.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [productId, authLoading, toast, router, form, currentUser, productCollectionName]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser || !productId) { toast({ title: "Error", description: "Cannot update without required data.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        // --- Image Deletion Logic ---
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
        
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
        );

        const productData = { 
            ...sanitizedData, 
            updatedAt: serverTimestamp(), 
            imageUrls: finalImageUrls, 
            imageUrl: finalImageUrls[0] || null,
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
            <CardTitle className="text-3xl flex items-center text-foreground"> <Leaf className="mr-3 h-8 w-8 text-primary" /> Edit Permaculture Product </CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push('/dispensary-admin/products')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Button>
        </div>
        <CardDescription className="text-foreground"> Modify details for &quot;{form.getValues('name')}&quot;. </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2 text-foreground">Product Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <FormItem><FormLabel>Category</FormLabel><Input value={form.getValues('category')} disabled /></FormItem>
                  <FormItem><FormLabel>Subcategory</FormLabel><Input value={form.getValues('subcategory') || ''} disabled /></FormItem>
                </div>
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
                     <Separator />
                           <h3 className="text-xl font-semibold border-b pb-2">Shipping</h3>
                            <FormField control={form.control} name="shippingMethods" render={() => (
                            <FormItem>
                                <FormLabel>Public Shipping Methods</FormLabel>
                                <FormDescription>Select shipping options for direct customer sales.</FormDescription>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {allShippingMethods.map((method) => (
                                    <FormField key={method.id} control={form.control} name="shippingMethods" render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-muted/30">
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(method.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), method.id])
                                                : field.onChange(field.value?.filter((value) => value !== method.id))
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal text-sm">{method.label}</FormLabel>
                                    </FormItem>
                                    )}/>
                                ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}/>
                          <Separator />
                    <h3 className="text-xl font-semibold border-b pb-2">Product Pool Settings</h3>
                    <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other stores of the same type to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                    {watchIsAvailableForPool && (
                    <Card className="p-4 bg-muted/50 space-y-4">
                        <FormField
                            control={form.control}
                            name="poolSharingRule"
                            render={({ field }) => (
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
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 border rounded-md relative bg-background">
                                <FormField control={form.control} name={`poolPriceTiers.${index}.unit`} render={({ field: f }) => (<FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="pool-units-list" /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`poolPriceTiers.${index}.price`} render={({ field: f }) => (<FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`poolPriceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                {poolPriceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePoolPriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendPoolPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '' })}>Add Pool Price Tier</Button>
                        </CardContent>
                        <FormField control={form.control} name="poolShippingMethods" render={() => (
                                <FormItem className="pt-4 border-t">
                                    <FormLabel>Pool Shipping Methods</FormLabel>
                                    <FormDescription>Select shipping options for store-to-store transfers.</FormDescription>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {allShippingMethods.map((method) => (
                                        <FormField key={method.id} control={form.control} name="poolShippingMethods" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 bg-background">
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(method.id)}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), method.id])
                                                    : field.onChange(field.value?.filter((value) => value !== method.id))
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className="font-normal text-sm">{method.label}</FormLabel>
                                        </FormItem>
                                        )}/>
                                    ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}/>
                    </Card>
                    )}
                    <Separator />
                    <h3 className="text-xl font-semibold border-b pb-2">Images & Tags</h3>
                    <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} existingImageUrls={existingImageUrls} onExistingImageDelete={(url) => setExistingImageUrls(prev => prev.filter(u => u !== url))} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, High-Yield" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </div>
            
            <CardFooter>
                <div className="flex w-full">
                    <Button type="submit" size="lg" className="w-full text-lg bg-green-600 hover:bg-green-700" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Save Changes
                    </Button>
                </div>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    
