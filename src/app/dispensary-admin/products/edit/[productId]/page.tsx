
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query as firestoreQuery, where, limit, getDocs } from 'firebase/firestore';
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
import { Loader2, Save, ArrowLeft, UploadCloud, Trash2, Image as ImageIconLucide, AlertTriangle, PlusCircle } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const sampleUnits = [
  "gram", "10 grams", "100 grams", "200 grams", "500 grams",
  "1kg", "2kg", "5kg", "10kg", "10kg+",
  "oz", "0.5 oz", "0.25 oz",
  "ml", "mg", "piece", "unit", "pack", "joint", "seed", "clone"
].sort();


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
  const [oldImageUrl, setOldImageUrl] = useState<string | null | undefined>(null);


  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
        priceTiers: [{ unit: '', price: undefined as any }], // Default for new tier
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier, replace: replacePriceTiers } = useFieldArray({
    control: form.control,
    name: "priceTiers",
  });


  const fetchDispensaryAndProductData = useCallback(async () => {
    if (!currentUser?.dispensaryId || !productId) { 
        setIsLoadingInitialData(false); 
        return; 
    }
    setIsLoadingInitialData(true);
    let fetchedDispensary: Dispensary | null = null;
    let localCategoryStructureObject: Record<string, any> | null = null;

    try {
      const dispensaryDocRef = doc(db, "dispensaries", currentUser.dispensaryId);
      const dispensarySnap = await getDoc(dispensaryDocRef);
      if (!dispensarySnap.exists()) {
        toast({ title: "Error", description: "Dispensary data not found.", variant: "destructive" });
        router.push("/dispensary-admin/dashboard"); 
        setIsLoadingInitialData(false);
        return;
      }
      fetchedDispensary = dispensarySnap.data() as Dispensary;
      setDispensaryData(fetchedDispensary);

      if (fetchedDispensary.dispensaryType) {
        const categoriesCollectionRef = collection(db, 'dispensaryTypeProductCategories');
        const q = firestoreQuery(categoriesCollectionRef, where('name', '==', fetchedDispensary.dispensaryType), limit(1));
        const categoriesSnapshot = await getDocs(q);
        if (!categoriesSnapshot.empty) {
          const categoriesDoc = categoriesSnapshot.docs[0].data() as DispensaryTypeProductCategoriesDoc;
          // Assuming categoriesData is an object for general types, or needs specific handling for THC/CBD
          // For simplicity, let's assume it's an object of main categories.
          let dataToProcess = categoriesDoc.categoriesData;
          if (typeof dataToProcess === 'object' && dataToProcess !== null && !Array.isArray(dataToProcess)) {
             if (fetchedDispensary.dispensaryType === "THC - CBD - Mushrooms dispensary" && dataToProcess.hasOwnProperty('thcCbdProductCategories')) {
                dataToProcess = (dataToProcess as any).thcCbdProductCategories;
                // Further processing if thcCbdProductCategories is an array
                if (Array.isArray(dataToProcess)) {
                    const thcData = dataToProcess.find((item: any) => item.name === 'THC');
                    const cbdData = dataToProcess.find((item: any) => item.name === 'CBD');
                    const tempStructure: Record<string, any> = {};
                    if (thcData) tempStructure.THC = thcData;
                    if (cbdData) tempStructure.CBD = cbdData;
                    localCategoryStructureObject = Object.keys(tempStructure).length > 0 ? tempStructure : null;
                } else if (typeof dataToProcess === 'object' && (dataToProcess.THC || dataToProcess.CBD)) {
                    localCategoryStructureObject = dataToProcess;
                }
             } else if (typeof dataToProcess === 'object' && Object.keys(dataToProcess).length > 0) {
                 localCategoryStructureObject = dataToProcess;
             }
          } else if (Array.isArray(dataToProcess)) { // Fallback if it's an array for general type
                const generalCategoryStructure: Record<string, any> = {};
                dataToProcess.forEach((cat: ProductCategory) => {
                    if (cat.name) generalCategoryStructure[cat.name] = cat.subcategories || [];
                });
                localCategoryStructureObject = generalCategoryStructure;
          }


          if (localCategoryStructureObject) {
            setCategoryStructureObject(localCategoryStructureObject);
            // For non-THC/CBD types, populate main category options
            if (fetchedDispensary.dispensaryType !== "THC - CBD - Mushrooms dispensary") {
              setMainCategoryOptions(Object.keys(localCategoryStructureObject).filter(key => key.trim() !== '').sort());
            }
          } else {
             toast({ title: "Info", description: `Category structure for "${fetchedDispensary.dispensaryType}" might be missing or in an unexpected format. Manual category entry may be needed.`, variant: "default", duration: 8000 });
             setCategoryStructureObject(null); setMainCategoryOptions([]);
          }
        } else {
          toast({ title: "Category Setup Missing", description: `Product category structure for type "${fetchedDispensary.dispensaryType}" not found.`, variant: "default", duration: 10000 });
          setCategoryStructureObject(null); setMainCategoryOptions([]);
        }
      } else {
        toast({ title: "Dispensary Type Missing", description: "Your dispensary profile is missing a 'type'.", variant: "destructive", duration: 10000 });
        setCategoryStructureObject(null); setMainCategoryOptions([]);
      }

      const productDocRef = doc(db, "products", productId);
      const productSnap = await getDoc(productDocRef);
      if (productSnap.exists()) {
        const productData = productSnap.data() as ProductType;
        if (productData.dispensaryId !== currentUser.dispensaryId) {
          toast({ title: "Access Denied", description: "You do not have permission to edit this product.", variant: "destructive" });
          router.push("/dispensary-admin/products"); 
          setIsLoadingInitialData(false); 
          return;
        }
        setExistingProduct(productData);
        form.reset({
          name: productData.name,
          description: productData.description,
          category: productData.category,
          subcategory: productData.subcategory || null,
          subSubcategory: productData.subSubcategory || null,
          strain: productData.strain || '',
          thcContent: productData.thcContent ?? undefined,
          cbdContent: productData.cbdContent ?? undefined,
          currency: productData.currency || (fetchedDispensary ? fetchedDispensary.currency : 'ZAR'),
          priceTiers: productData.priceTiers && productData.priceTiers.length > 0 ? productData.priceTiers : [{ unit: '', price: undefined as any }],
          quantityInStock: productData.quantityInStock ?? undefined,
          imageUrl: productData.imageUrl || null,
          labTested: productData.labTested || false,
          effects: productData.effects || [],
          flavors: productData.flavors || [],
          medicalUses: productData.medicalUses || [],
          isAvailableForPool: productData.isAvailableForPool || false,
          tags: productData.tags || [],
        });
        if (productData.priceTiers && productData.priceTiers.length > 0) {
            replacePriceTiers(productData.priceTiers);
        } else {
            replacePriceTiers([{ unit: '', price: undefined as any }]);
        }

        setImagePreview(productData.imageUrl || null);
        setOldImageUrl(productData.imageUrl);

        // Initialize dynamic selects based on fetched product data and category structure
        if (productData.category && localCategoryStructureObject) {
            setSelectedMainCategoryName(productData.category);
            const mainCatVal = productData.category;
            // This logic needs to be robust for both THC/CBD (direct key) and general (array)
            const mainCatData = localCategoryStructureObject[mainCatVal];
            if (mainCatData) { // Assuming mainCatData is an array of subcategories for general, or object for THC/CBD
                let l1Options: string[] = [];
                if (Array.isArray(mainCatData)) { // General type
                    l1Options = mainCatData.map((sub: any) => sub.name).filter(Boolean).sort();
                } else if (typeof mainCatData === 'object' && mainCatData['Delivery Methods']) { // THC/CBD type
                    l1Options = Object.keys(mainCatData['Delivery Methods']).sort();
                }
                setSubCategoryL1Options(l1Options);

                if (productData.subcategory && l1Options.includes(productData.subcategory)) {
                    setSelectedSubCategoryL1Name(productData.subcategory); 
                    const subCatL1Val = productData.subcategory;
                    let subCatL1Data;
                    if (Array.isArray(mainCatData)) {
                        subCatL1Data = mainCatData.find((sub: any) => sub.name === subCatL1Val)?.subcategories;
                    } else if (mainCatData['Delivery Methods'] && mainCatData['Delivery Methods'][subCatL1Val]) {
                        subCatL1Data = mainCatData['Delivery Methods'][subCatL1Val];
                    }

                    if (Array.isArray(subCatL1Data)) { // For general sub-subcategories or THC/CBD specific product types
                        const l2Options = subCatL1Data.map((subSub: any) => typeof subSub === 'string' ? subSub : subSub.name).filter(Boolean).sort();
                        setSubCategoryL2Options(l2Options);
                    }
                }
            }
        }
      } else { 
        toast({ title: "Error", description: "Product not found.", variant: "destructive" }); 
        router.push("/dispensary-admin/products");
      }
    } catch (error) {
      console.error("Error fetching data for edit product:", error);
      toast({ title: "Error", description: "Failed to load product data.", variant: "destructive" });
    } finally {
      setIsLoadingInitialData(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.dispensaryId, productId, router, toast, form, replacePriceTiers]);


  useEffect(() => {
    if (!authLoading && currentUser) { fetchDispensaryAndProductData(); }
    else if (!authLoading && !currentUser) { 
      toast({title: "Not Authenticated", description: "Please log in to edit products.", variant: "destructive"});
      router.push("/auth/signin"); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading, router, toast]);

  // Effect for Main Category change (for general types)
  useEffect(() => {
    if (dispensaryData?.dispensaryType === THC_CBD_MUSHROOM_DISPENSARY_TYPE_NAME) return; // Skip for special type

    const mainCategoryValue = selectedMainCategoryName;
    if (mainCategoryValue && categoryStructureObject) {
        const mainCatData = categoryStructureObject[mainCategoryValue];
        if (Array.isArray(mainCatData)) {
            setSubCategoryL1Options(mainCatData.map((sub: ProductCategory) => sub.name).filter(name => name && name.trim() !== '').sort());
        } else { setSubCategoryL1Options([]); }
    } else {
        setSubCategoryL1Options([]);
    }
    // Reset subsequent selections if main category changes
    if (form.formState.isDirty && selectedMainCategoryName !== existingProduct?.category) {
        form.setValue('subcategory', null); setSelectedSubCategoryL1Name(null);
        form.setValue('subSubcategory', null); setSubCategoryL2Options([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMainCategoryName, categoryStructureObject, dispensaryData?.dispensaryType]);


  // Effect for L1 Subcategory change (for general types)
  useEffect(() => {
    if (dispensaryData?.dispensaryType === THC_CBD_MUSHROOM_DISPENSARY_TYPE_NAME) return; // Skip for special type
    
    const mainCategoryValue = selectedMainCategoryName;
    const subCategoryL1Value = selectedSubCategoryL1Name;

    if (mainCategoryValue && subCategoryL1Value && categoryStructureObject) {
        const mainCatData = categoryStructureObject[mainCategoryValue];
        if (Array.isArray(mainCatData)) {
            const subCatL1Object = mainCatData.find((sub: ProductCategory) => sub.name === subCategoryL1Value);
            if (subCatL1Object && Array.isArray(subCatL1Object.subcategories)) {
                setSubCategoryL2Options(subCatL1Object.subcategories.map((subSub: ProductCategory) => subSub.name).filter(name => name && name.trim() !== '').sort());
            } else { setSubCategoryL2Options([]); }
        } else { setSubCategoryL2Options([]); }
    } else {
      setSubCategoryL2Options([]);
    }
    if (form.formState.isDirty && selectedSubCategoryL1Name !== existingProduct?.subcategory) {
        form.setValue('subSubcategory', null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubCategoryL1Name, selectedMainCategoryName, categoryStructureObject, dispensaryData?.dispensaryType]);
  
    // Effect for THC/CBD Primary Compound change (similar to add page)
    useEffect(() => {
        if (dispensaryData?.dispensaryType !== THC_CBD_MUSHROOM_DISPENSARY_TYPE_NAME || !existingProduct) return;
        const primaryCompound = existingProduct.category === 'THC' || existingProduct.category === 'CBD' ? existingProduct.category : null;

        if (primaryCompound && categoryStructureObject) {
            const compoundDetails = categoryStructureObject[primaryCompound];
            if (compoundDetails && compoundDetails['Delivery Methods'] && typeof compoundDetails['Delivery Methods'] === 'object') {
                setSubCategoryL1Options(Object.keys(compoundDetails['Delivery Methods']).sort()); // L1 options are delivery methods
            } else { setSubCategoryL1Options([]); }
        } else { setSubCategoryL1Options([]); }

        // If the category (primary compound) changes from initial load, reset subcategories
        if (form.formState.isDirty && existingProduct.category !== form.getValues('category')) {
            form.setValue('subcategory', null); setSelectedSubCategoryL1Name(null);
            form.setValue('subSubcategory', null); setSubCategoryL2Options([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.getValues('category'), categoryStructureObject, existingProduct, dispensaryData?.dispensaryType]);

    // Effect for THC/CBD Delivery Method change (L1 subcategory)
    useEffect(() => {
        if (dispensaryData?.dispensaryType !== THC_CBD_MUSHROOM_DISPENSARY_TYPE_NAME || !existingProduct) return;
        const primaryCompound = form.getValues('category');
        const deliveryMethod = selectedSubCategoryL1Name; // For THC/CBD, subcategory is delivery method

        if (primaryCompound && deliveryMethod && categoryStructureObject && categoryStructureObject[primaryCompound]) {
            const compoundDetails = categoryStructureObject[primaryCompound];
            if (compoundDetails['Delivery Methods'] && compoundDetails['Delivery Methods'][deliveryMethod]) {
                const types = compoundDetails['Delivery Methods'][deliveryMethod];
                if (Array.isArray(types)) {
                    setSubCategoryL2Options(types.sort()); // L2 options are specific product types
                } else { setSubCategoryL2Options([]); }
            } else { setSubCategoryL2Options([]); }
        } else { setSubCategoryL2Options([]); }
        
        if (form.formState.isDirty && existingProduct.subcategory !== deliveryMethod) {
            form.setValue('subSubcategory', null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSubCategoryL1Name, form.getValues('category'), categoryStructureObject, existingProduct, dispensaryData?.dispensaryType]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      form.setValue('imageUrl', ''); // Clear existing URL if new file is chosen
    }
  };

  const handleRemoveImage = async () => {
    setImageFile(null);
    setImagePreview(null);
    form.setValue('imageUrl', null); 
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser?.dispensaryId || !dispensaryData || !existingProduct?.id) {
      toast({ title: "Error", description: "Critical data missing. Cannot update product.", variant: "destructive" }); return;
    }
     if (!data.category || data.category.trim() === "") {
        toast({ title: "Category Required", description: "Please select or enter a main product category.", variant: "destructive"});
        form.setError("category", { type: "manual", message: "Category is required." }); return;
    }

    setIsLoading(true); setUploadProgress(null);
    let finalImageUrl: string | null | undefined = form.getValues('imageUrl'); 

    if (imageFile) { 
      const filePath = `dispensary-products/${currentUser.dispensaryId}/${Date.now()}_${imageFile.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, imageFile);
      try {
        finalImageUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', (s) => setUploadProgress((s.bytesTransferred / s.totalBytes) * 100), reject,
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)));
        });
        if (oldImageUrl && oldImageUrl !== finalImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
            try { await deleteObject(storageRef(storage, oldImageUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old image delete failed:", e); }
        }
        setOldImageUrl(finalImageUrl); 
      } catch (error) { toast({ title: "Image Upload Failed", variant: "destructive" }); setIsLoading(false); return; }
    } else if (form.getValues('imageUrl') === null && oldImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
      try { await deleteObject(storageRef(storage, oldImageUrl)); finalImageUrl = null; setOldImageUrl(null); }
      catch (e: any) {
        if (e.code !== 'storage/object-not-found') console.warn("Old image delete failed (on removal):", e);
        else {finalImageUrl = null; setOldImageUrl(null);} 
      }
    }
    
    try {
      const productDocRef = doc(db, "products", existingProduct.id);
      const productUpdateData = { ...data, imageUrl: finalImageUrl,
        thcContent: data.thcContent ?? null,
        cbdContent: data.cbdContent ?? null,
        priceTiers: data.priceTiers.filter(tier => tier.unit && tier.price > 0), // Ensure valid tiers
        quantityInStock: data.quantityInStock ?? 0,
        subcategory: data.subcategory || null,
        subSubcategory: data.subSubcategory || null,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(productDocRef, productUpdateData);
      toast({ title: "Product Updated!", description: `${data.name} has been successfully updated.` });
      router.push('/dispensary-admin/products');
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update product. Please try again.", variant: "destructive" });
      console.error("Error updating product:", error);
    } finally { setIsLoading(false); setUploadProgress(null); }
  };

  if (authLoading || isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <div className="space-y-4"> <Skeleton className="h-12 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-12 w-full" /> <Skeleton className="h-32 w-full" /> <Skeleton className="h-12 w-full" /> </div> </div> );
  }
  if (!dispensaryData || !existingProduct) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading product data...</p></div>;
  }

  const isThcCbdSpecialType = dispensaryData?.dispensaryType === "THC - CBD - Mushrooms dispensary";


  return (
    <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle 
                className="text-3xl flex items-center text-foreground" 
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            > 
                <Save className="mr-3 h-8 w-8 text-primary" /> Edit Product 
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
                <Link href="/dispensary-admin/products">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                </Link>
            </Button>
        </div>
        <CardDescription 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >
            Modify details for &quot;{existingProduct.name}&quot;. Current type: <span className="font-semibold text-primary">{dispensaryData.dispensaryType || 'Not Set'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {(!categoryStructureObject && !isLoadingInitialData && dispensaryData?.dispensaryType && !isThcCbdSpecialType) && (
                <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700 flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6" />
                    <div><h4 className="font-semibold">Category Structure Not Found for &quot;{dispensaryData.dispensaryType}&quot;</h4>
                        <p className="text-sm">Please manually enter a main category name below. For a structured list, ask a Super Admin to define categories for your dispensary type.</p>
                    </div>
                </div>
            )}
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input placeholder="Premium OG Kush Flower" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
            
            {isThcCbdSpecialType ? (
                 <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem> <FormLabel>Primary Compound *</FormLabel>
                    <Select 
                        onValueChange={(value) => field.onChange(value)} 
                        value={field.value || undefined}
                        disabled // Cannot change primary compound after creation for THC/CBD type for now
                    >
                        <FormControl><SelectTrigger><SelectValue placeholder="Primary Compound (THC/CBD)" /></SelectTrigger></FormControl>
                        <SelectContent>
                           {categoryStructureObject?.THC && <SelectItem value="THC">THC</SelectItem>}
                           {categoryStructureObject?.CBD && <SelectItem value="CBD">CBD</SelectItem>}
                        </SelectContent>
                    </Select>
                    <FormDescription>Primary compound cannot be changed after product creation for this dispensary type.</FormDescription>
                    <FormMessage /> </FormItem>
                )} />
            ) : (
                 <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem> <FormLabel>Main Category *</FormLabel>
                    {mainCategoryOptions.length > 0 ? (
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value === "none" ? "" : value);
                            setSelectedMainCategoryName(value === "none" ? null : value);
                        }} 
                        value={field.value || undefined} 
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
            )}


            {/* Subcategory Level 1 (Delivery Method for THC/CBD, or L1 Sub for General) */}
            {(isThcCbdSpecialType && subCategoryL1Options.length > 0) || (!isThcCbdSpecialType && selectedMainCategoryName && subCategoryL1Options.length > 0) ? (
              <FormField control={form.control} name="subcategory" render={({ field }) => (
                <FormItem> 
                  <FormLabel>{isThcCbdSpecialType ? 'Delivery Method *' : 'Subcategory (Level 1)'}</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                        field.onChange(value === "none" ? null : value);
                        setSelectedSubCategoryL1Name(value === "none" ? null : value); // Used for general types
                    }} 
                    value={field.value ?? undefined}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder={`Select ${isThcCbdSpecialType ? 'Delivery Method' : 'L1 Subcategory (optional)'}`} /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {subCategoryL1Options.map((optName) => ( <SelectItem key={optName} value={optName}>{optName}</SelectItem> ))}
                    </SelectContent>
                  </Select> <FormMessage />
                </FormItem> )} />
            ): null}

            {/* Subcategory Level 2 (Specific Product Type for THC/CBD, or L2 Sub for General) */}
             {(isThcCbdSpecialType && selectedSubCategoryL1Name && subCategoryL2Options.length > 0) || (!isThcCbdSpecialType && selectedSubCategoryL1Name && subCategoryL2Options.length > 0) ? (
              <FormField control={form.control} name="subSubcategory" render={({ field }) => (
                <FormItem> 
                    <FormLabel>{isThcCbdSpecialType ? 'Specific Product Type *' : 'Subcategory (Level 2)'}</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                    value={field.value ?? undefined}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder={`Select ${isThcCbdSpecialType ? 'Specific Product Type' : 'L2 Subcategory (optional)'}`} /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {subCategoryL2Options.map((optName) => ( <SelectItem key={optName} value={optName}>{optName}</SelectItem> ))}
                    </SelectContent>
                  </Select> <FormMessage />
                </FormItem> )} />
            ): null}


            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Detailed description..." {...field} rows={4} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
            
             {/* Pricing Tiers Section */}
            <div className="space-y-3 pt-2">
                <h3 className="text-lg font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Pricing Tiers *</h3>
                {priceTierFields.map((tierField, index) => (
                    <div key={tierField.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-2 items-end p-4 border rounded-md shadow-sm bg-muted/30">
                        <FormField
                            control={form.control}
                            name={`priceTiers.${index}.unit`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                                <SelectContent>{sampleUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`priceTiers.${index}.price`}
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        {priceTierFields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="text-destructive hover:bg-destructive/10 self-center md:self-end mt-2 md:mt-0 md:mb-1.5">
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendPriceTier({ unit: '', price: undefined as any })} className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Price Tier
                </Button>
                 <FormMessage>{form.formState.errors.priceTiers?.root?.message || form.formState.errors.priceTiers?.message}</FormMessage>
            </div>
            <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem><FormLabel>Currency *</FormLabel><FormControl><Input placeholder="ZAR" {...field} maxLength={3} readOnly disabled value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
            
            <div className="grid md:grid-cols-3 gap-6">
              <FormField control={form.control} name="quantityInStock" render={({ field }) => ( <FormItem><FormLabel>Stock Qty *</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="strain" render={({ field }) => ( <FormItem><FormLabel>Strain</FormLabel><FormControl><Input placeholder="Blue Dream" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Additional Product Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="22.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD (%)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="0.8" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem> )} />
            </div>
            <div className="space-y-4">
              <Controller control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Relaxed, Happy" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Earthy, Sweet" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Pain Relief" disabled={isLoading} /><FormMessage /></FormItem> )} />
              <Controller control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>General Tags</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Organic, Indoor" disabled={isLoading} /><FormMessage /></FormItem> )} />
            </div>
            <Separator /> <h3 className="text-lg font-medium text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Image</h3>
            <FormField control={form.control} name="imageUrl" render={() => ( <FormItem> <div className="flex items-center gap-4"> {imagePreview ? ( <div className="relative w-32 h-32 rounded border p-1 bg-muted"> <Image src={imagePreview} alt="Product preview" layout="fill" objectFit="cover" className="rounded" data-ai-hint="product image" /> </div> ) : ( <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center"> <ImageIconLucide className="w-12 h-12 text-muted-foreground" /> </div> )} <div className="flex flex-col gap-2"> <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isLoading}> <UploadCloud className="mr-2 h-4 w-4" /> {imageFile || imagePreview ? "Change Image" : "Upload Image"} </Button> <Input id="imageUpload" type="file" className="hidden" ref={imageInputRef} accept="image/*" onChange={handleImageChange} disabled={isLoading} /> {(imagePreview || form.getValues('imageUrl')) && ( <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10" disabled={isLoading}> <Trash2 className="mr-2 h-4 w-4" /> Remove Image </Button> )} </div> </div> {uploadProgress !== null && uploadProgress < 100 && ( <div className="mt-2"> <Progress value={uploadProgress} className="w-full h-2" /> <p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadProgress)}%</p> </div> )} {uploadProgress === 100 && <p className="text-xs text-green-600 mt-1">Upload complete. Save changes.</p>} <FormDescription>Recommended: Clear, well-lit photo. PNG, JPG, WEBP. Max 5MB.</FormDescription> <FormMessage /> </FormItem> )} />
            <Separator />
            <div className="space-y-4">
                <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Lab Tested</FormLabel><FormDescription>Check this if the product has been independently lab tested for quality and potency.</FormDescription></div> </FormItem> )} />
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Available for Product Sharing Pool</FormLabel><FormDescription>Allow other dispensaries of the same type to request this product from you.</FormDescription></div> </FormItem> )} />
            </div>
            <CardFooter className="px-0 pt-8"> <div className="flex gap-4 w-full"> <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}> {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Save Changes </Button> <Link href="/dispensary-admin/products" passHref legacyBehavior><Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}>Cancel</Button></Link> </div> </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

