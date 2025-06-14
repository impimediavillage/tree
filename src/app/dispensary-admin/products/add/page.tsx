
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Dispensary, DispensaryTypeProductCategoriesDoc, ProductCategory } from '@/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, UploadCloud, Trash2, Image as ImageIconLucide, AlertTriangle } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const sampleUnits = ["gram", "oz", "ml", "mg", "piece", "unit", "pack", "joint", "seed", "clone"];

export default function AddProductPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [dispensaryData, setDispensaryData] = useState<Dispensary | null>(null);
  
  const [definedProductCategories, setDefinedProductCategories] = useState<ProductCategory[]>([]);
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | null>(null);
  const [availableSubcategoriesL1, setAvailableSubcategoriesL1] = useState<ProductCategory[]>([]);
  const [selectedSubcategoryL1Name, setSelectedSubcategoryL1Name] = useState<string | null>(null);
  const [availableSubcategoriesL2, setAvailableSubcategoriesL2] = useState<ProductCategory[]>([]);


  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (authLoading || !currentUser) {
      if (!authLoading && !currentUser) router.push("/auth/signin");
      return;
    }
    if (!currentUser.dispensaryId) {
      toast({ title: "Error", description: "No dispensary associated with your account.", variant: "destructive" });
      router.push("/dispensary-admin/dashboard");
      return;
    }

    const fetchInitialData = async () => {
      setIsLoadingInitialData(true);
      try {
        const dispensaryDocRef = doc(db, "dispensaries", currentUser.dispensaryId!);
        const dispensarySnap = await getDoc(dispensaryDocRef);

        if (dispensarySnap.exists()) {
          const fetchedDispensary = dispensarySnap.data() as Dispensary;
          setDispensaryData(fetchedDispensary);
          form.setValue('currency', fetchedDispensary.currency || 'ZAR');

          if (fetchedDispensary.dispensaryType) {
            const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', fetchedDispensary.dispensaryType);
            const categoriesSnap = await getDoc(categoriesDocRef);
            if (categoriesSnap.exists()) {
              const categoriesData = categoriesSnap.data() as DispensaryTypeProductCategoriesDoc;
              setDefinedProductCategories(categoriesData.categories || []);
              if (!categoriesData.categories || categoriesData.categories.length === 0) {
                 toast({ title: "Notice", description: `No product categories defined for "${fetchedDispensary.dispensaryType}". Add products by manually entering category, or request admin to set up categories.`, variant: "default", duration: 8000 });
              }
            } else {
              toast({ title: "Warning", description: `Product category structure for type "${fetchedDispensary.dispensaryType}" not found. Categories may be limited.`, variant: "default", duration: 8000 });
               setDefinedProductCategories([]);
            }
          }
        } else {
          toast({ title: "Error", description: "Dispensary data not found.", variant: "destructive" });
          router.push("/dispensary-admin/dashboard");
        }
      } catch (error) {
        console.error("Error fetching initial data for Add Product page:", error);
        toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
      } finally {
        setIsLoadingInitialData(false);
      }
    };

    fetchInitialData();
  }, [currentUser, authLoading, router, toast, form]);

  useEffect(() => {
    const selectedCategory = definedProductCategories.find(cat => cat.name === selectedMainCategoryName);
    setAvailableSubcategoriesL1(selectedCategory?.subcategories || []);
    form.setValue('subcategory', null); // Reset subcategory when main changes
    setSelectedSubcategoryL1Name(null); 
    form.setValue('subSubcategory', null); // Reset sub-subcategory
  }, [selectedMainCategoryName, definedProductCategories, form]);

  useEffect(() => {
    const selectedSubCategoryL1 = availableSubcategoriesL1.find(subCat => subCat.name === selectedSubcategoryL1Name);
    setAvailableSubcategoriesL2(selectedSubCategoryL1?.subcategories || []);
    form.setValue('subSubcategory', null); // Reset sub-subcategory when L1 changes
  }, [selectedSubcategoryL1Name, availableSubcategoriesL1, form]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null); setImagePreview(null); form.setValue('imageUrl', null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser?.dispensaryId || !dispensaryData) {
      toast({ title: "Error", description: "User or dispensary data not found.", variant: "destructive" }); return;
    }
    if (definedProductCategories.length > 0 && !data.category) { // Only enforce if predefined categories exist
        toast({ title: "Category Required", description: "Please select a main product category.", variant: "destructive"});
        form.setError("category", { type: "manual", message: "Category is required." }); return;
    }
    setIsLoading(true); setUploadProgress(null);
    let uploadedImageUrl: string | null = null;

    if (imageFile) {
      const filePath = `dispensary-products/${currentUser.dispensaryId}/${Date.now()}_${imageFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, imageFile);
      try {
        uploadedImageUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (s) => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100), reject, 
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)));
        });
      } catch (error) {
        toast({ title: "Image Upload Failed", variant: "destructive" }); setIsLoading(false); return;
      }
    }
    setUploadProgress(100); // Indicate upload complete before Firestore write

    try {
      const productData = { ...data, dispensaryId: currentUser.dispensaryId, dispensaryName: dispensaryData.dispensaryName,
        dispensaryType: dispensaryData.dispensaryType, productOwnerEmail: dispensaryData.ownerEmail,
        imageUrl: uploadedImageUrl, 
        thcContent: data.thcContent ?? null, 
        cbdContent: data.cbdContent ?? null,
        price: data.price ?? 0, 
        quantityInStock: data.quantityInStock ?? 0,
        subcategory: data.subcategory || null, // Ensure null if empty
        subSubcategory: data.subSubcategory || null, // Ensure null if empty
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'products'), productData);
      toast({ title: "Product Added!", description: `${data.name} added.` });
      form.reset(); setSelectedMainCategoryName(null); setSelectedSubcategoryL1Name(null);
      setImageFile(null); setImagePreview(null); setUploadProgress(null);
      router.push('/dispensary-admin/products');
    } catch (error) {
      toast({ title: "Add Product Failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <div className="space-y-4"> <Skeleton className="h-12 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-12 w-full" /> <Skeleton className="h-32 w-full" /> <Skeleton className="h-12 w-full" /> </div> </div> );
  }


  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center"> <PackagePlus className="mr-3 h-8 w-8 text-primary" /> Add New Product </CardTitle>
            <Button variant="outline" size="sm" asChild>
                <Link href="/dispensary-admin/products">
                    <span className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </span>
                </Link>
            </Button>
        </div>
        <CardDescription>Fill details. Fields marked * are required.
        {dispensaryData?.dispensaryType && ( <span className="block mt-1">Categories for: <span className="font-semibold text-primary">{dispensaryData.dispensaryType}</span></span> )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {definedProductCategories.length === 0 && !isLoadingInitialData && (
                 <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700 flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6" />
                    <div>
                        <h4 className="font-semibold">No Product Categories Defined</h4>
                        <p className="text-sm">No specific product categories have been set up for your dispensary type ({dispensaryData?.dispensaryType || 'Unknown Type'}). 
                        You can still add products by manually entering category, or contact an administrator to set up categories.</p>
                    </div>
                </div>
            )}
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input placeholder="e.g., Premium OG Kush Flower" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem> <FormLabel>Main Category {definedProductCategories.length > 0 ? '*' : '(Manual Entry If Needed)'}</FormLabel>
                {definedProductCategories.length > 0 ? (
                    <Select onValueChange={(value) => { field.onChange(value); setSelectedMainCategoryName(value); }} value={field.value || ''} >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {definedProductCategories.map((cat) => ( <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem> ))}
                    </SelectContent>
                    </Select>
                ) : (
                    <Input placeholder="Enter main category (e.g., Flower, Edible)" {...field} value={field.value ?? ''} />
                )}
                <FormMessage />
              </FormItem> )} />

            {selectedMainCategoryName && availableSubcategoriesL1.length > 0 && (
              <FormField control={form.control} name="subcategory" render={({ field }) => (
                <FormItem> <FormLabel>Subcategory (Level 1)</FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); setSelectedSubcategoryL1Name(value); }} value={field.value || ''}>
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
           
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Detailed description..." {...field} rows={4} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem><FormLabel>Currency *</FormLabel><FormControl><Input placeholder="ZAR" {...field} maxLength={3} readOnly disabled value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem><FormLabel>Unit *</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''}> <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl> <SelectContent> {sampleUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)} </SelectContent> </Select> <FormMessage /></FormItem> )} />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="quantityInStock" render={({ field }) => ( <FormItem><FormLabel>Stock Qty *</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="strain" render={({ field }) => ( <FormItem><FormLabel>Strain</FormLabel><FormControl><Input placeholder="e.g., Blue Dream" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium">Product Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="22.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="0.8" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="space-y-4">
              <Controller control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Relaxed, Happy" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Earthy, Sweet" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Pain Relief" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>General Tags</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Organic, Indoor" disabled={isLoading} /><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium">Product Image</h3>
            <FormField control={form.control} name="imageUrl" render={({ field }) => ( <FormItem> <div className="flex items-center gap-4"> {imagePreview ? ( <div className="relative w-32 h-32 rounded border p-1 bg-muted"> <Image src={imagePreview} alt="Product preview" layout="fill" objectFit="cover" className="rounded" data-ai-hint="product image"/> </div> ) : ( <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center"> <ImageIconLucide className="w-12 h-12 text-muted-foreground" /> </div> )} <div className="flex flex-col gap-2"> <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isLoading}> <UploadCloud className="mr-2 h-4 w-4" /> {imageFile ? "Change" : "Upload"} </Button> <Input id="imageUpload" type="file" className="hidden" ref={imageInputRef} accept="image/*" onChange={handleImageChange} disabled={isLoading} /> {imagePreview && ( <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10" disabled={isLoading}> <Trash2 className="mr-2 h-4 w-4" /> Remove </Button> )} </div> </div> {uploadProgress !== null && uploadProgress < 100 && ( <div className="mt-2"> <Progress value={uploadProgress} className="w-full h-2" /> <p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadProgress)}%</p> </div> )} {uploadProgress === 100 && <p className="text-xs text-green-600 mt-1">Upload complete. Click "Add Product" to save.</p>} <FormDescription>PNG, JPG, WEBP. Max 5MB.</FormDescription> <FormMessage /> </FormItem> )} />
            <Separator />
            <div className="space-y-4">
                <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Lab Tested</FormLabel><FormDescription>Indicates lab testing for quality/potency.</FormDescription></div> </FormItem> )} />
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Available for Product Pool</FormLabel><FormDescription>Allow other dispensaries to request this product.</FormDescription></div> </FormItem> )} />
            </div>
            <CardFooter className="px-0 pt-8">
                <div className="flex gap-4 w-full">
                    <Button type="submit" size="lg" className="flex-1 text-lg" 
                      disabled={isLoading || isLoadingInitialData}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                        Add Product
                    </Button>
                    <Button asChild type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}>
                        <Link href="/dispensary-admin/products">Cancel</Link>
                    </Button>
                </div>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
    

