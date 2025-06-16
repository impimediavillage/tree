
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query as firestoreQuery, where, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { productSchema, type ProductFormData } from '@/lib/schemas';
import type { Dispensary, DispensaryTypeProductCategoriesDoc, ProductCategory } from '@/types';

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

  const [categoryStructureObject, setCategoryStructureObject] = useState<Record<string, any> | null>(null);
  const [mainCategoryOptions, setMainCategoryOptions] = useState<string[]>([]);
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | null>(null);

  const [subCategoryL1Options, setSubCategoryL1Options] = useState<string[]>([]);
  const [selectedSubCategoryL1Name, setSelectedSubCategoryL1Name] = useState<string | null>(null);
  
  const [subCategoryL2Options, setSubCategoryL2Options] = useState<string[]>([]);


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

  const fetchInitialData = useCallback(async () => {
    if (!currentUser?.dispensaryId) {
        setIsLoadingInitialData(false);
        return;
    }
    setIsLoadingInitialData(true);
    try {
      const dispensaryDocRef = doc(db, "dispensaries", currentUser.dispensaryId);
      const dispensarySnap = await getDoc(dispensaryDocRef);

      if (dispensarySnap.exists()) {
        const fetchedDispensary = dispensarySnap.data() as Dispensary;
        setDispensaryData(fetchedDispensary);
        form.setValue('currency', fetchedDispensary.currency || 'ZAR');

        if (fetchedDispensary.dispensaryType) {
          const categoriesCollectionRef = collection(db, 'dispensaryTypeProductCategories');
          const q = firestoreQuery(categoriesCollectionRef, where('name', '==', fetchedDispensary.dispensaryType), limit(1));
          const categoriesSnapshot = await getDocs(q);

          if (!categoriesSnapshot.empty) {
            const categoriesDoc = categoriesSnapshot.docs[0].data() as DispensaryTypeProductCategoriesDoc;
             if (categoriesDoc.categoriesData && typeof categoriesDoc.categoriesData === 'object' && Object.keys(categoriesDoc.categoriesData).length > 0) {
              setCategoryStructureObject(categoriesDoc.categoriesData);
              setMainCategoryOptions(Object.keys(categoriesDoc.categoriesData).filter(key => key.trim() !== '').sort());
            } else {
              toast({ title: "Info", description: `No product categories defined or structure is not an object for dispensary type "${fetchedDispensary.dispensaryType}". Please enter category manually or contact admin.`, variant: "default", duration: 8000 });
              setCategoryStructureObject(null);
              setMainCategoryOptions([]);
            }
          } else {
             toast({ title: "Category Setup Missing", description: `Product category structure for type "${fetchedDispensary.dispensaryType}" not found. Product categories may be limited. Please ensure a Super Admin has set them up in 'Admin Dashboard > Dispensary Types > Manage Categories'.`, variant: "default", duration: 10000 });
            setCategoryStructureObject(null);
            setMainCategoryOptions([]);
          }
        } else {
           toast({ title: "Dispensary Type Missing", description: "Your dispensary profile is missing a 'type'. This is needed for structured category selection. Please update your profile or contact admin.", variant: "destructive", duration: 10000 });
           setCategoryStructureObject(null);
           setMainCategoryOptions([]);
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
  }, [currentUser?.dispensaryId, form, router, toast]);


  useEffect(() => {
    if (authLoading || !currentUser) {
      if (!authLoading && !currentUser) {
          toast({title: "Authentication Error", description: "Please sign in.", variant: "destructive"});
          router.push("/auth/signin");
      }
      return;
    }
    fetchInitialData();
  }, [currentUser, authLoading, router, toast, fetchInitialData]);

  // Effect for Main Category change
  useEffect(() => {
    const mainCategoryValue = selectedMainCategoryName;
    if (mainCategoryValue && categoryStructureObject && categoryStructureObject[mainCategoryValue] && typeof categoryStructureObject[mainCategoryValue] === 'object') {
      setSubCategoryL1Options(Object.keys(categoryStructureObject[mainCategoryValue]).filter(key => key.trim() !== '').sort());
    } else {
      setSubCategoryL1Options([]);
    }
    form.setValue('subcategory', null); // Reset dependent field
    setSelectedSubCategoryL1Name(null); // Reset state for L1
    form.setValue('subSubcategory', null); // Reset L2 field
    setSubCategoryL2Options([]); // Reset L2 options
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMainCategoryName, categoryStructureObject, form]);

  // Effect for L1 Subcategory change
  useEffect(() => {
    const mainCategoryValue = selectedMainCategoryName;
    const subCategoryL1Value = selectedSubCategoryL1Name;

    if (mainCategoryValue && subCategoryL1Value && categoryStructureObject &&
        categoryStructureObject[mainCategoryValue] &&
        categoryStructureObject[mainCategoryValue][subCategoryL1Value] &&
        typeof categoryStructureObject[mainCategoryValue][subCategoryL1Value] === 'object') {
      
      const nextLevel = categoryStructureObject[mainCategoryValue][subCategoryL1Value];
      if (typeof nextLevel === 'object' && !Array.isArray(nextLevel) && Object.keys(nextLevel).length > 0) {
         setSubCategoryL2Options(Object.keys(nextLevel).filter(key => key.trim() !== '').sort());
      } else {
        setSubCategoryL2Options([]);
      }
    } else {
      setSubCategoryL2Options([]);
    }
    form.setValue('subSubcategory', null); // Reset L2 field
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubCategoryL1Name, selectedMainCategoryName, categoryStructureObject, form]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
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
     if (!data.category || data.category.trim() === "") {
        toast({ title: "Category Required", description: "Please select or enter a main product category.", variant: "destructive"});
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
    setUploadProgress(100); 

    try {
      const productData = { ...data, dispensaryId: currentUser.dispensaryId, dispensaryName: dispensaryData.dispensaryName,
        dispensaryType: dispensaryData.dispensaryType, productOwnerEmail: dispensaryData.ownerEmail,
        imageUrl: uploadedImageUrl,
        thcContent: data.thcContent ?? null,
        cbdContent: data.cbdContent ?? null,
        price: data.price ?? 0,
        quantityInStock: data.quantityInStock ?? 0,
        subcategory: data.subcategory || null,
        subSubcategory: data.subSubcategory || null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'products'), productData);
      toast({ title: "Product Added!", description: `${data.name} has been successfully added to your inventory.` });
      form.reset(); // Reset form fields
      // Reset category selection states
      setSelectedMainCategoryName(null);
      setSelectedSubCategoryL1Name(null);
      setSubCategoryL1Options([]);
      setSubCategoryL2Options([]);
      
      setImageFile(null); setImagePreview(null); setUploadProgress(null);
      // No need to re-fetch initial data if we are navigating away or just want to clear form.
      // If staying on page to add another, fetchInitialData() might be desired, but typical flow is to navigate.
      router.push('/dispensary-admin/products');
    } catch (error) {
      toast({ title: "Add Product Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      console.error("Error adding product to Firestore:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingInitialData || authLoading) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <div className="space-y-4"> <Skeleton className="h-12 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-12 w-full" /> <Skeleton className="h-32 w-full" /> <Skeleton className="h-12 w-full" /> </div> </div> );
  }


  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle 
                className="text-3xl flex items-center text-foreground" 
                style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}
            > 
                <PackagePlus className="mr-3 h-8 w-8 text-primary" /> Add New Product 
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dispensary-admin/products">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
              </Link>
            </Button>
        </div>
        <CardDescription 
            className="text-foreground"
            style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}
        >Fill in the product details. Fields marked with * are required.
        {dispensaryData?.dispensaryType && ( <span className="block mt-1">Categories for: <span className="font-semibold text-primary">{dispensaryData.dispensaryType}</span></span> )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {(!categoryStructureObject && !isLoadingInitialData && dispensaryData?.dispensaryType) && (
                 <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700 flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6" />
                    <div>
                        <h4 className="font-semibold">Category Structure Not Found for &quot;{dispensaryData.dispensaryType}&quot;</h4>
                        <p className="text-sm">Please manually enter a main category name below. For a structured list, ask a Super Admin to define categories for your dispensary type in 'Admin Dashboard &gt; Dispensary Types &gt; Manage Categories'.</p>
                    </div>
                </div>
            )}
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input placeholder="e.g., Premium OG Kush Flower" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem> <FormLabel>Main Category *</FormLabel>
                {mainCategoryOptions.length > 0 ? (
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value === "none" ? "" : value); // Handle "none" as empty string for RHF
                            setSelectedMainCategoryName(value === "none" ? null : value);
                        }} 
                        value={field.value ?? undefined}
                    >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="none">None (or type custom)</SelectItem>
                            {mainCategoryOptions.map((catName) => ( <SelectItem key={catName} value={catName}>{catName}</SelectItem> ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input placeholder="Enter main category (e.g., Flower, Edible)" {...field} value={field.value ?? ''} />
                )}
                <FormMessage />
              </FormItem> )} />

            {selectedMainCategoryName && subCategoryL1Options.length > 0 && (
              <FormField control={form.control} name="subcategory" render={({ field }) => (
                <FormItem> <FormLabel>Subcategory (Level 1)</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                        field.onChange(value === "none" ? null : value);
                        setSelectedSubCategoryL1Name(value === "none" ? null : value);
                    }} 
                    value={field.value ?? undefined}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select L1 subcategory (optional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {subCategoryL1Options.map((subCatName) => ( <SelectItem key={subCatName} value={subCatName}>{subCatName}</SelectItem> ))}
                    </SelectContent>
                  </Select> <FormMessage />
                </FormItem> )} />
            )}

            {selectedSubCategoryL1Name && subCategoryL2Options.length > 0 && (
              <FormField control={form.control} name="subSubcategory" render={({ field }) => (
                <FormItem> <FormLabel>Subcategory (Level 2)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                    value={field.value ?? undefined}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select L2 subcategory (optional)" /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {subCategoryL2Options.map((subSubCatName) => ( <SelectItem key={subSubCatName} value={subSubCatName}>{subSubCatName}</SelectItem> ))}
                    </SelectContent>
                  </Select> <FormMessage />
                </FormItem> )} />
            )}

            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Detailed description of the product, its benefits, and usage instructions..." {...field} rows={4} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem><FormLabel>Currency *</FormLabel><FormControl><Input placeholder="ZAR" {...field} maxLength={3} readOnly disabled value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="unit" render={({ field }) => ( <FormItem><FormLabel>Unit *</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl> <SelectContent> {sampleUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)} </SelectContent> </Select> <FormMessage /></FormItem> )} />
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="quantityInStock" render={({ field }) => ( <FormItem><FormLabel>Stock Qty *</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="strain" render={({ field }) => ( <FormItem><FormLabel>Strain (if applicable)</FormLabel><FormControl><Input placeholder="e.g., Blue Dream, OG Kush" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium text-foreground" style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}>Additional Product Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC Content (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 22.5" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD Content (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 0.8" {...field} value={typeof field.value === 'number' && isNaN(field.value) ? '' : (field.value ?? '')} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="space-y-4">
              <Controller control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add effect (e.g., Relaxed, Happy, Uplifted)" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add flavor (e.g., Earthy, Sweet, Citrus)" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add medical use (e.g., Pain Relief, Insomnia)" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>General Tags</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add tag (e.g., Organic, Indoor, Popular)" disabled={isLoading} /><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium text-foreground" style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}>Product Image</h3>
            <FormField control={form.control} name="imageUrl" render={() => ( <FormItem> <div className="flex items-center gap-4"> {imagePreview ? ( <div className="relative w-32 h-32 rounded border p-1 bg-muted"> <Image src={imagePreview} alt="Product preview" layout="fill" objectFit="cover" className="rounded" data-ai-hint="product image"/> </div> ) : ( <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center"> <ImageIconLucide className="w-12 h-12 text-muted-foreground" /> </div> )} <div className="flex flex-col gap-2"> <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isLoading}> <UploadCloud className="mr-2 h-4 w-4" /> {imageFile ? "Change Image" : "Upload Image"} </Button> <Input id="imageUpload" type="file" className="hidden" ref={imageInputRef} accept="image/*" onChange={handleImageChange} disabled={isLoading} /> {imagePreview && ( <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10" disabled={isLoading}> <Trash2 className="mr-2 h-4 w-4" /> Remove Image </Button> )} </div> </div> {uploadProgress !== null && uploadProgress < 100 && ( <div className="mt-2"> <Progress value={uploadProgress} className="w-full h-2" /> <p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadProgress)}%</p> </div> )} {uploadProgress === 100 && <p className="text-xs text-green-600 mt-1">Upload complete. Click "Add Product" to save.</p>} <FormDescription>Recommended: Clear, well-lit photo. PNG, JPG, WEBP. Max 5MB.</FormDescription> <FormMessage /> </FormItem> )} />
            <Separator />
            <div className="space-y-4">
                <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Lab Tested</FormLabel><FormDescription>Check this if the product has been independently lab tested for quality and potency.</FormDescription></div> </FormItem> )} />
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Available for Product Sharing Pool</FormLabel><FormDescription>Allow other dispensaries of the same type to request this product from you.</FormDescription></div> </FormItem> )} />
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

    
