
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
import type { Product as ProductType, Dispensary, DispensaryType as AppDispensaryType, ProductCategory } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, UploadCloud, Trash2, Image as ImageIcon } from 'lucide-react';
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
  
  const [definedProductCategories, setDefinedProductCategories] = useState<ProductCategory[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('');
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [oldImageUrl, setOldImageUrl] = useState<string | null | undefined>(null);


  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { 
      name: '', description: '', category: '', subcategory: null, strain: '',
      thcContent: undefined, cbdContent: undefined,
      price: undefined, currency: 'ZAR', unit: '',
      quantityInStock: undefined, imageUrl: null,
      labTested: false, effects: [], flavors: [], medicalUses: [],
      isAvailableForPool: false, tags: [],
    },
  });

  const fetchDispensaryAndProductData = useCallback(async () => {
    if (!currentUser?.dispensaryId || !productId) {
        setIsLoadingInitialData(false);
        return;
    }
    setIsLoadingInitialData(true);
    try {
      // Fetch dispensary data
      const dispensaryDocRef = doc(db, "dispensaries", currentUser.dispensaryId);
      const dispensarySnap = await getDoc(dispensaryDocRef);
      if (!dispensarySnap.exists()) {
        toast({ title: "Error", description: "Dispensary data not found.", variant: "destructive" });
        router.push("/dispensary-admin/dashboard");
        return;
      }
      const fetchedDispensary = dispensarySnap.data() as Dispensary;
      setDispensaryData(fetchedDispensary);

      // Fetch DispensaryType details for categories
      if (fetchedDispensary.dispensaryType) {
        const typeQuery = firestoreQuery(collection(db, 'dispensaryTypes'), where('name', '==', fetchedDispensary.dispensaryType));
        const typeSnapshot = await getDocs(typeQuery);
        if (!typeSnapshot.empty) {
          const typeData = typeSnapshot.docs[0].data() as AppDispensaryType;
          setDefinedProductCategories(typeData.productCategories || []);
        }
      }

      // Fetch product data
      const productDocRef = doc(db, "products", productId);
      const productSnap = await getDoc(productDocRef);
      if (productSnap.exists()) {
        const productData = productSnap.data() as ProductType;
        if (productData.dispensaryId !== currentUser.dispensaryId) {
          toast({ title: "Access Denied", description: "You can only edit your own products.", variant: "destructive" });
          router.push("/dispensary-admin/products");
          return;
        }
        setExistingProduct(productData);
        form.reset({
          ...productData,
          thcContent: productData.thcContent ?? undefined,
          cbdContent: productData.cbdContent ?? undefined,
          effects: productData.effects || [],
          flavors: productData.flavors || [],
          medicalUses: productData.medicalUses || [],
          tags: productData.tags || [],
          subcategory: productData.subcategory || null,
        });
        setImagePreview(productData.imageUrl || null);
        setOldImageUrl(productData.imageUrl);
        if(productData.category) setSelectedMainCategory(productData.category); 
      } else {
        toast({ title: "Error", description: "Product not found.", variant: "destructive" });
        router.push("/dispensary-admin/products");
      }
    } catch (error) {
      console.error("Error fetching data for edit page:", error);
      toast({ title: "Error", description: "Failed to load product data.", variant: "destructive" });
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [currentUser?.dispensaryId, productId, router, toast, form]);


  useEffect(() => {
    if (!authLoading && currentUser) {
        fetchDispensaryAndProductData();
    } else if (!authLoading && !currentUser) {
        router.push("/auth/signin");
    }
  }, [currentUser, authLoading, fetchDispensaryAndProductData, router]);

  useEffect(() => {
    if (selectedMainCategory && definedProductCategories.length > 0) {
      const categoryData = definedProductCategories.find(cat => cat.name === selectedMainCategory);
      setAvailableSubcategories(categoryData?.subcategories || []);
      // Reset subcategory only if the current one is not valid for the new main category
      // This prevents resetting when loading existing data where subcategory is already correct.
      const currentSubcategory = form.getValues('subcategory');
      if (currentSubcategory && categoryData && !categoryData.subcategories?.includes(currentSubcategory)) {
        form.setValue('subcategory', null);
      } else if (currentSubcategory && !categoryData) { // Main category selected doesn't exist in defined (edge case)
        form.setValue('subcategory', null);
      }
    } else {
      setAvailableSubcategories([]);
       form.setValue('subcategory', null);
    }
  }, [selectedMainCategory, definedProductCategories, form]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('imageUrl', ''); 
    }
  };

  const handleRemoveImage = async () => {
    setImageFile(null);
    setImagePreview(null);
    form.setValue('imageUrl', null); 
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser?.dispensaryId || !dispensaryData || !existingProduct?.id) {
      toast({ title: "Error", description: "Required data missing for update.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setUploadProgress(null);

    let newImageUrl: string | null | undefined = form.getValues('imageUrl'); // Get current form value (could be existing URL or null if removed)

    if (imageFile) { // A new file was selected
      const filePath = `dispensary-products/${currentUser.dispensaryId}/${Date.now()}_${imageFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, imageFile);

      try {
        newImageUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => reject(error),
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
          );
        });
        // If a new image was uploaded and there was an old one, delete the old one
        if (oldImageUrl && oldImageUrl !== newImageUrl) { 
            try {
                const oldImageStorageRef = storageRef(storage, oldImageUrl);
                await deleteObject(oldImageStorageRef);
            } catch (deleteError: any) {
                if (deleteError.code !== 'storage/object-not-found') { 
                    console.warn("Could not delete old product image from storage:", deleteError);
                }
            }
        }
      } catch (error) {
        toast({ title: "Image Upload Failed", description: "Could not upload new product image.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    } else if (form.getValues('imageUrl') === null && oldImageUrl) { 
      // Image was explicitly removed (imageUrl set to null by handleRemoveImage) and there was an old image
      try {
        const oldImageStorageRef = storageRef(storage, oldImageUrl);
        await deleteObject(oldImageStorageRef);
        newImageUrl = null; 
      } catch (deleteError: any) {
         if (deleteError.code !== 'storage/object-not-found') {
            console.warn("Could not delete product image from storage:", deleteError);
         } else { // Object already gone, so it's effectively removed
            newImageUrl = null; 
         }
      }
    }


    try {
      const productDocRef = doc(db, "products", existingProduct.id);
      const productUpdateData = {
        ...data,
        imageUrl: newImageUrl, 
        thcContent: data.thcContent === undefined ? null : data.thcContent,
        cbdContent: data.cbdContent === undefined ? null : data.cbdContent,
        subcategory: data.subcategory || null,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(productDocRef, productUpdateData);
      toast({ title: "Product Updated!", description: `${data.name} has been successfully updated.` });
      router.push('/dispensary-admin/products');
    } catch (error) {
      console.error("Error updating product:", error);
      toast({ title: "Update Failed", description: "Could not update product.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };
  
  if (authLoading || isLoadingInitialData) {
    return (
        <div className="max-w-4xl mx-auto my-8 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-9 w-24" />
            </div>
            <Skeleton className="h-8 w-1/2" />
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
  }

  if (!dispensaryData || !existingProduct) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading product data...</p></div>;
  }

  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center">
                <Save className="mr-3 h-8 w-8 text-primary" /> Edit Product
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
                <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Products</Link>
            </Button>
        </div>
        <CardDescription>Modify the details for &quot;{existingProduct.name}&quot;.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input placeholder="e.g., Premium OG Kush Flower" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedMainCategory(value);
                        // form.setValue('subcategory', null); // Keep existing if valid
                      }}
                      value={field.value || ''}
                      disabled={isLoadingInitialData || definedProductCategories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={definedProductCategories.length === 0 ? "No categories defined" : "Select category"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {definedProductCategories.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={isLoadingInitialData || availableSubcategories.length === 0 || !selectedMainCategory}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedMainCategory ? "Select main category first" : (availableSubcategories.length === 0 ? "No subcategories" : "Select subcategory")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSubcategories.map((subCat) => (
                          <SelectItem key={subCat} value={subCat}>
                            {subCat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Detailed description of the product..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="currency" render={({ field }) => ( 
                <FormItem><FormLabel>Currency *</FormLabel><FormControl><Input placeholder="e.g., ZAR" {...field} maxLength={3} readOnly disabled /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>Unit *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sampleUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="quantityInStock" render={({ field }) => (
                <FormItem><FormLabel>Quantity in Stock *</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="strain" render={({ field }) => (
                <FormItem><FormLabel>Strain (Optional)</FormLabel><FormControl><Input placeholder="e.g., Blue Dream" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            <Separator />
            <h3 className="text-lg font-medium">Product Details (Optional)</h3>

            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="thcContent" render={({ field }) => (
                    <FormItem><FormLabel>THC Content (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 22.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="cbdContent" render={({ field }) => (
                    <FormItem><FormLabel>CBD Content (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 0.8" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            
            <div className="space-y-4">
              <Controller control={form.control} name="effects" render={({ field }) => (
                <FormItem><FormLabel>Effects</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add effect (e.g., Relaxed, Happy)" disabled={isLoading} /><FormMessage /></FormItem>
              )} />
              <Controller control={form.control} name="flavors" render={({ field }) => (
                <FormItem><FormLabel>Flavors</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add flavor (e.g., Earthy, Sweet)" disabled={isLoading} /><FormMessage /></FormItem>
              )} />
              <Controller control={form.control} name="medicalUses" render={({ field }) => (
                <FormItem><FormLabel>Medical Uses</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add medical use (e.g., Pain Relief)" disabled={isLoading} /><FormMessage /></FormItem>
              )} />
               <Controller control={form.control} name="tags" render={({ field }) => (
                <FormItem><FormLabel>General Tags</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add tag (e.g., Organic, Indoor)" disabled={isLoading} /><FormMessage /></FormItem>
              )} />
            </div>

            <Separator />
             <h3 className="text-lg font-medium">Product Image</h3>
            <FormField control={form.control} name="imageUrl" render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 rounded border p-1 bg-muted">
                      <Image src={imagePreview} alt="Product preview" layout="fill" objectFit="cover" className="rounded" data-ai-hint="product image" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isLoading}>
                      <UploadCloud className="mr-2 h-4 w-4" /> {imageFile || imagePreview ? "Change Image" : "Upload Image"}
                    </Button>
                    <Input 
                        id="imageUpload"
                        type="file" 
                        className="hidden" 
                        ref={imageInputRef} 
                        accept="image/png, image/jpeg, image/webp" 
                        onChange={handleImageChange} 
                        disabled={isLoading}
                    />
                    {(imagePreview || field.value) && ( 
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10" disabled={isLoading}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remove Image
                      </Button>
                    )}
                  </div>
                </div>
                {uploadProgress !== null && uploadProgress < 100 && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} className="w-full h-2" />
                    <p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadProgress)}%</p>
                  </div>
                )}
                {uploadProgress === 100 && <p className="text-xs text-green-600 mt-1">Upload complete. Save changes to finalize.</p>}
                <FormDescription>Upload a clear image of your product (PNG, JPG, WEBP). Max 5MB.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />


            <Separator />
            <div className="space-y-4">
                <FormField control={form.control} name="labTested" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel>Lab Tested</FormLabel><FormDescription>Indicates if the product has been lab tested for quality and potency.</FormDescription></div>
                    </FormItem>
                )} />
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel>Available for Product Pool</FormLabel><FormDescription>Allow this product to be requested by other dispensaries in the sharing pool.</FormDescription></div>
                    </FormItem>
                )} />
            </div>

            <CardFooter className="px-0 pt-8">
              <div className="flex gap-4 w-full">
                <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save Changes
                </Button>
                <Link href="/dispensary-admin/products" passHref legacyBehavior>
                  <Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}>Cancel</Button>
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
