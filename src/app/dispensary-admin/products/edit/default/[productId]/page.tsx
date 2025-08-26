
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
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Product as ProductType, Dispensary } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const getProductCollectionName = (dispensaryType?: string | null): string => {
    if (!dispensaryType) return 'products';
    if (dispensaryType === "Homeopathic store") return 'homeopathy_store_products';
    if (dispensaryType === "Mushroom store") return 'mushroom_store_products';
    return dispensaryType.toLowerCase().replace(/[\s-&]+/g, '_') + '_products';
};

export default function DefaultEditProductPage() {
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

  
  const productCollectionName = getProductCollectionName(currentDispensary?.dispensaryType);
  
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
        setExistingImageUrls(productData.imageUrls || []);
        
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load data for editing.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [productId, authLoading, toast, router, form, currentUser, productCollectionName]);
  

  useEffect(() => { 
    fetchInitialData(); 
  }, [fetchInitialData]);
  
  const onSubmit = async (data: ProductFormData) => {
    if (!currentDispensary || !currentUser || !productId) { toast({ title: "Error", description: "Cannot update without required data.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        let uploadedImageUrls: string[] = [...existingImageUrls];
        if (files.length > 0) {
            toast({ title: "Uploading Images...", description: "Please wait while new product images are uploaded.", variant: "default" });
            const uploadPromises = files.map(file => { const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`); return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref)); });
            const newUrls = await Promise.all(uploadPromises);
            uploadedImageUrls = [...uploadedImageUrls, ...newUrls];
        }
        
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
        );

        const productData = { 
            ...sanitizedData, 
            updatedAt: serverTimestamp(), 
            imageUrls: uploadedImageUrls, 
            imageUrl: uploadedImageUrls[0] || null,
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
            <CardTitle className="text-3xl flex items-center text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> <Save className="mr-3 h-8 w-8 text-primary" /> Edit Product </CardTitle>
            <Button variant="outline" size="sm" onClick={() => router.push('/dispensary-admin/products')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Button>
        </div>
        <CardDescription className="text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Modify details for &quot;{form.getValues('name')}&quot;. </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Details</h2>
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Category *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="subcategory" render={({ field }) => ( <FormItem><FormLabel>Subcategory</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />

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
                    </Card>
                    )}
                    <Separator />
                    <h3 className="text-xl font-semibold border-b pb-2">Images & Tags</h3>
                    <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} existingImageUrls={existingImageUrls} onExistingImageDelete={(url) => setExistingImageUrls(prev => prev.filter(u => u !== url))} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                </div>
            </div>
            
            <CardFooter>
                <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Save Changes
                </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}







    
