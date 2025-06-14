
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query as firestoreQuery, where, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Product as ProductType, Dispensary, DispensaryTypeProductCategoriesDoc, ProductCategory } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, UploadCloud, Trash2, Image as ImageIconLucide, AlertTriangle } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const sampleUnits = ["gram", "oz", "ml", "mg", "piece", "unit", "pack", "joint", "seed", "clone"];

export default function EditProductPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [dispensaryData, setDispensaryData] = useState<Dispensary | null>(null);
  const [existingProduct, setExistingProduct] = useState<ProductType | null>(null);
  
  const [definedCategories, setDefinedCategories] = useState<ProductCategory[]>([]);
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | null>(null);
  const [availableSubcategoriesL1, setAvailableSubcategoriesL1] = useState<ProductCategory[]>([]);
  const [selectedSubcategoryL1Name, setSelectedSubcategoryL1Name] = useState<string | null>(null);
  const [availableSubcategoriesL2, setAvailableSubcategoriesL2] = useState<ProductCategory[]>([]);


  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [oldImageUrl, setOldImageUrl] = useState<string | null | undefined>(null);


  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { 
      name: '', description: '', category: '', subcategory: null, subSubcategory: null,
      strain: '', thcContent: undefined, cbdContent: undefined, price: undefined,
      currency: 'ZAR', unit: '', quantityInStock: undefined, imageUrl: null,
      labTested: false, effects: [], flavors: [], medicalUses: [],
      isAvailableForPool: false, tags: [],
    },
  });

  const fetchDispensaryAndProductData = useCallback(async () => {
    if (!currentUser?.dispensaryId || !productId) { setIsLoadingInitialData(false); return; }
    setIsLoadingInitialData(true);
    try {
      const dispensaryDocRef = doc(db, "dispensaries", currentUser.dispensaryId);
      const dispensarySnap = await getDoc(dispensaryDocRef);
      if (!dispensarySnap.exists()) {
        toast({ title: "Error", description: "Dispensary data not found.", variant: "destructive" });
        router.push("/dispensary-admin/dashboard"); return;
      }
      const fetchedDispensary = dispensarySnap.data() as Dispensary;
      setDispensaryData(fetchedDispensary);

      if (fetchedDispensary.dispensaryType) {
        const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', fetchedDispensary.dispensaryType);
        const categoriesSnap = await getDoc(categoriesDocRef);
        if (categoriesSnap.exists()) {
          const categoriesData = categoriesSnap.data() as DispensaryTypeProductCategoriesDoc;
          setDefinedCategories(categoriesData.categories || []);
        } else { setDefinedCategories([]); }
      }

      const productDocRef = doc(db, "products", productId);
      const productSnap = await getDoc(productDocRef);
      if (productSnap.exists()) {
        const productData = productSnap.data() as ProductType;
        if (productData.dispensaryId !== currentUser.dispensaryId) {
          toast({ title: "Access Denied", variant: "destructive" }); router.push("/dispensary-admin/products"); return;
        }
        setExistingProduct(productData);
        form.reset({
          ...productData, thcContent: productData.thcContent ?? undefined, cbdContent: productData.cbdContent ?? undefined,
          effects: productData.effects || [], flavors: productData.flavors || [], medicalUses: productData.medicalUses || [],
          tags: productData.tags || [], subcategory: productData.subcategory || null, subSubcategory: productData.subSubcategory || null,
        });
        setImagePreview(productData.imageUrl || null); setOldImageUrl(productData.imageUrl);
        if(productData.category) setSelectedMainCategoryName(productData.category);
        if(productData.subcategory) setSelectedSubcategoryL1Name(productData.subcategory);

      } else {
        toast({ title: "Error", description: "Product not found.", variant: "destructive" }); router.push("/dispensary-admin/products");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load product data.", variant: "destructive" });
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [currentUser?.dispensaryId, productId, router, toast, form]);


  useEffect(() => {
    if (!authLoading && currentUser) { fetchDispensaryAndProductData(); } 
    else if (!authLoading && !currentUser) { router.push("/auth/signin"); }
  }, [currentUser, authLoading, fetchDispensaryAndProductData, router]);

  // Update L1 Subcategories when Main Category changes OR when definedCategories load
  useEffect(() => {
    if (selectedMainCategoryName && definedCategories.length > 0) {
        const selectedCategory = definedCategories.find(cat => cat.name === selectedMainCategoryName);
        setAvailableSubcategoriesL1(selectedCategory?.subcategories || []);
        
        // If not editing an existing product with this main category, reset subcategories
        if (existingProduct?.category !== selectedMainCategoryName || !form.getValues('subcategory')) {
          form.setValue('subcategory', null);
          setSelectedSubcategoryL1Name(null);
          form.setValue('subSubcategory', null);
        } else if (existingProduct?.category === selectedMainCategoryName && form.getValues('subcategory')) {
          // If editing and main category matches, retain L1 selection if valid
          const currentSubL1 = form.getValues('subcategory');
          if (!selectedCategory?.subcategories?.find(s => s.name === currentSubL1)) {
            form.setValue('subcategory', null);
            setSelectedSubcategoryL1Name(null);
            form.setValue('subSubcategory', null);
          } else {
             setSelectedSubcategoryL1Name(currentSubL1); // Ensure state is synced with form
          }
        }

    } else if (!selectedMainCategoryName) { // If main category is cleared
        setAvailableSubcategoriesL1([]);
        form.setValue('subcategory', null);
        setSelectedSubcategoryL1Name(null);
        form.setValue('subSubcategory', null);
    }
  }, [selectedMainCategoryName, definedCategories, form, existingProduct]);

  // Update L2 Subcategories when L1 Subcategory changes OR when L1 subs become available
  useEffect(() => {
    if (selectedSubcategoryL1Name && availableSubcategoriesL1.length > 0) {
        const selectedSubCategoryL1 = availableSubcategoriesL1.find(subCat => subCat.name === selectedSubcategoryL1Name);
        setAvailableSubcategoriesL2(selectedSubCategoryL1?.subcategories || []);
        
        if (existingProduct?.subcategory !== selectedSubcategoryL1Name || !form.getValues('subSubcategory')) {
            form.setValue('subSubcategory', null);
        } else if (existingProduct?.subcategory === selectedSubcategoryL1Name && form.getValues('subSubcategory')) {
          // Retain L2 selection if valid
          const currentSubL2 = form.getValues('subSubcategory');
           if (!selectedSubCategoryL1?.subcategories?.find(s => s.name === currentSubL2)) {
            form.setValue('subSubcategory', null);
          }
        }
    } else if (!selectedSubcategoryL1Name) { // If L1 subcategory is cleared
        setAvailableSubcategoriesL2([]);
        form.setValue('subSubcategory', null);
    }
  }, [selectedSubcategoryL1Name, availableSubcategoriesL1, form, existingProduct]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { setImageFile(file); const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result as string); reader.readAsDataURL(file); form.setValue('imageUrl', ''); }
  };

  const handleRemoveImage = async () => {
    setImageFile(null); setImagePreview(null); form.setValue('imageUrl', null); 
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser?.dispensaryId || !dispensaryData || !existingProduct?.id) { toast({ title: "Error", variant: "destructive" }); return; }
    setIsLoading(true); setUploadProgress(null);
    let newImageUrl: string | null | undefined = form.getValues('imageUrl');

    if (imageFile) {
      const filePath = `dispensary-products/${currentUser.dispensaryId}/${Date.now()}_${imageFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, imageFile);
      try {
        newImageUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (s) => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100), reject, 
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)));
        });
        if (oldImageUrl && oldImageUrl !== newImageUrl) { 
            try { await deleteObject(storageRef(storage, oldImageUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old image delete failed:", e); }
        }
      } catch (error) { toast({ title: "Image Upload Failed", variant: "destructive" }); setIsLoading(false); return; }
    } else if (form.getValues('imageUrl') === null && oldImageUrl) { 
      try { await deleteObject(storageRef(storage, oldImageUrl)); newImageUrl = null; } 
      catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old image delete failed:", e); else newImageUrl = null; }
    }

    try {
      const productDocRef = doc(db, "products", existingProduct.id);
      const productUpdateData = { ...data, imageUrl: newImageUrl, thcContent: data.thcContent ?? null, cbdContent: data.cbdContent ?? null,
        subcategory: data.subcategory || null, subSubcategory: data.subSubcategory || null, updatedAt: serverTimestamp(),
      };
      await updateDoc(productDocRef, productUpdateData);
      toast({ title: "Product Updated!", description: `${data.name} updated.` }); router.push('/dispensary-admin/products');
    } catch (error) { toast({ title: "Update Failed", variant: "destructive" });
    } finally { setIsLoading(false); setUploadProgress(null); }
  };
  
  if (authLoading || isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <div className="space-y-4"> <Skeleton className="h-12 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-12 w-full" /> <Skeleton className="h-32 w-full" /> <Skeleton className="h-12 w-full" /> </div> </div> );
  }
  if (!dispensaryData || !existingProduct) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading product data...</p></div>;
  }

  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center"> <Save className="mr-3 h-8 w-8 text-primary" /> Edit Product </CardTitle>
            <Button variant="outline" size="sm" asChild> <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link> </Button>
        </div>
        <CardDescription>Modify details for &quot;{existingProduct.name}&quot;.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {definedCategories.length === 0 && !isLoadingInitialData && (
                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700 flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6" />
                    <div><h4 className="font-semibold">No Product Categories Defined</h4>
                        <p className="text-sm">Categories for your dispensary type ({dispensaryData?.dispensaryType}) are not set up. Defaulting to text input or contact admin.</p>
                    </div>
                </div>
            )}
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input placeholder="Premium OG Kush Flower" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
            
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem> <FormLabel>Main Category *</FormLabel>
                <Select onValueChange={(value) => { field.onChange(value); setSelectedMainCategoryName(value); form.setValue('subcategory', null); form.setValue('subSubcategory', null); }} value={field.value || ''} disabled={definedCategories.length === 0}>
                  <FormControl><SelectTrigger><SelectValue placeholder={definedCategories.length === 0 ? "No categories available" : "Select main category"} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {definedCategories.length > 0 ? definedCategories.map((cat) => ( <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem> )) : <SelectItem value="-" disabled>No categories available</SelectItem>}
                  </SelectContent>
                </Select> <FormMessage />
              </FormItem> )} />

            {selectedMainCategoryName && availableSubcategoriesL1.length > 0 && (
              <FormField control={form.control} name="subcategory" render={({ field }) => (
                <FormItem> <FormLabel>Subcategory (Level 1)</FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); setSelectedSubcategoryL1Name(value); form.setValue('subSubcategory', null); }} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select subcategory (L1)" /></SelectTrigger></FormControl>
                    <SelectContent> {availableSubcategoriesL1.map((subCat) => ( <SelectItem key={subCat.name} value={subCat.name}>{subCat.name}</SelectItem> ))} </SelectContent>
                  </Select> <FormMessage />
                </FormItem> )} />
            )}

            {selectedSubcategoryL1Name && availableSubcategoriesL2.length > 0 && (
              <FormField control={form.control} name="subSubcategory" render={({ field }) => (
                <FormItem> <FormLabel>Subcategory (Level 2)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select subcategory (L2)" /></SelectTrigger></FormControl>
                    <SelectContent> {availableSubcategoriesL2.map((subSubCat) => ( <SelectItem key={subSubCat.name} value={subSubCat.name}>{subSubCat.name}</SelectItem> ))} </SelectContent>
                  </Select> <FormMessage />
                </FormItem> )} />
            )}

            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Detailed description..." {...field} rows={4} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem><FormLabel>Currency *</FormLabel><FormControl><Input placeholder="ZAR" {...field} maxLength={3} readOnly disabled value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem><FormLabel>Unit *</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''}> <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl> <SelectContent> {sampleUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)} </SelectContent> </Select> <FormMessage /></FormItem> )} />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="quantityInStock" render={({ field }) => ( <FormItem><FormLabel>Stock Qty *</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="strain" render={({ field }) => ( <FormItem><FormLabel>Strain</FormLabel><FormControl><Input placeholder="Blue Dream" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium">Product Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="22.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="0.8" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="space-y-4">
              <Controller control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Relaxed, Happy" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Earthy, Sweet" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Pain Relief" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>General Tags</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Organic, Indoor" disabled={isLoading} /><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium">Product Image</h3>
            <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem> <div className="flex items-center gap-4"> {imagePreview ? ( <div className="relative w-32 h-32 rounded border p-1 bg-muted"> <Image src={imagePreview} alt="Product preview" layout="fill" objectFit="cover" className="rounded" data-ai-hint="product image" /> </div> ) : ( <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center"> <ImageIconLucide className="w-12 h-12 text-muted-foreground" /> </div> )} <div className="flex flex-col gap-2"> <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isLoading}> <UploadCloud className="mr-2 h-4 w-4" /> {imageFile || imagePreview ? "Change" : "Upload"} </Button> <Input id="imageUpload" type="file" className="hidden" ref={imageInputRef} accept="image/*" onChange={handleImageChange} disabled={isLoading} /> {(imagePreview || field.value) && ( <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10" disabled={isLoading}> <Trash2 className="mr-2 h-4 w-4" /> Remove </Button> )} </div> </div> {uploadProgress !== null && uploadProgress < 100 && ( <div className="mt-2"> <Progress value={uploadProgress} className="w-full h-2" /> <p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadProgress)}%</p> </div> )} {uploadProgress === 100 && <p className="text-xs text-green-600 mt-1">Upload complete. Save changes.</p>} <FormDescription>PNG, JPG, WEBP. Max 5MB.</FormDescription> <FormMessage /> </FormItem> )} />
            <Separator />
            <div className="space-y-4">
                <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Lab Tested</FormLabel><FormDescription>Indicates lab testing for quality/potency.</FormDescription></div> </FormItem> )} />
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Available for Product Pool</FormLabel><FormDescription>Allow other dispensaries to request this product.</FormDescription></div> </FormItem> )} />
            </div>
            <CardFooter className="px-0 pt-8"> <div className="flex gap-4 w-full"> <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}> {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Save Changes </Button> <Link href="/dispensary-admin/products" passHref legacyBehavior><Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}>Cancel</Button></Link> </div> </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

