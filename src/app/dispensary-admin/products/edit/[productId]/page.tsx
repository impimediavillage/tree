
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
import { Loader2, Save, ArrowLeft, UploadCloud, Trash2, Image as ImageIconLucide, AlertTriangle, PlusCircle, Shirt, Cigarette, Flame, Leaf as LeafIconLucide, Palette, Ruler, Sparkles, Brush, Delete, Info } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const sampleUnits = [
  "gram", "10 grams", "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+",
  "1kg", "2kg", "5kg", "10kg", "10kg+",
  "0.25 oz", "0.5 oz", "oz",
  "3ml", "5ml", "10ml", "50ml", "100ml", "ml", 
  "1 litre", "2 litres", "5 litres", "10 litres",
  "clone", "joint", "mg", "pack", "piece", "seed", "unit"
];


const THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME = "Cannibinoid store";

const apparelTypes = [ 
  "Head Gear / Neck Wear", "Hoodies / Jackets / Sweaters", "Long Sleeve / Short Sleeve Shirts",
  "Streetwear Trousers / Shorts / Track Pants", "Socks", "Footwear", "Jewelry & Accessories"
];
const apparelGenders = ['Mens', 'Womens', 'Unisex']; 
const sizingSystemOptions = ['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other'];

const standardSizesData: Record<string, Record<string, string[]>> = {
  'Mens': {
    'UK/SA': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'],
    'US': ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14', '15'],
    'EURO': ['40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46', '47'],
    'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL']
  },
  'Womens': {
    'UK/SA': ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '9', '10'],
    'US': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11', '12'],
    'EURO': ['35.5', '36', '36.5', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '43'],
    'Alpha (XS-XXXL)': ['XXS','XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
  },
  'Unisex': { 
    'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'],
  }
};


export default function EditProductPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [wellnessData, setWellnessData] = useState<Dispensary | null>(null);
  const [existingProduct, setExistingProduct] = useState<ProductType | null>(null);

  const [isThcCbdSpecialType, setIsThcCbdSpecialType] = useState(false);
  const [categoryStructureObject, setCategoryStructureObject] = useState<Record<string, any> | null>(null);
  const [selectedProductStream, setSelectedProductStream] = useState<'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | null>(null); 
  
  const [mainCategoryOptions, setMainCategoryOptions] = useState<string[]>([]);
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | null>(null);

  const [subCategoryL1Options, setSubCategoryL1Options] = useState<string[]>([]);
  const [selectedSubCategoryL1Name, setSelectedSubCategoryL1Name] = useState<string | null>(null);
  
  const [subCategoryL2Options, setSubCategoryL2Options] = useState<string[]>([]);

  const [deliveryMethodOptions, setDeliveryMethodOptions] = useState<string[]>([]);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string | null>(null);
  const [specificProductTypeOptions, setSpecificProductTypeOptions] = useState<string[]>([]);

  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [oldImageUrl, setOldImageUrl] = useState<string | null | undefined>(null);


  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
        priceTiers: [{ unit: '', price: undefined as any }], 
        stickerProgramOptIn: null,
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier, replace: replacePriceTiers } = useFieldArray({
    control: form.control,
    name: "priceTiers",
  });


  const determineProductStream = (product: ProductType | null): 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | null => { 
    if (!product || !product.category) return null;
    if (product.category === 'THC' || product.category === 'CBD') return product.category;
    if (apparelTypes.includes(product.category)) return 'Apparel'; 
    if (product.category === 'Smoking Gear') return 'Smoking Gear';
    return null; 
  };

  const fetchWellnessAndProductData = useCallback(async () => {
    if (!currentUser?.dispensaryId || !productId) { 
        setIsLoadingInitialData(false); 
        return; 
    }
    setIsLoadingInitialData(true);
    let fetchedWellness: Dispensary | null = null;
    let localCategoryStructureObject: Record<string, any> | null = null;

    try {
      const wellnessDocRef = doc(db, "dispensaries", currentUser.dispensaryId);
      const wellnessSnap = await getDoc(wellnessDocRef);
      if (!wellnessSnap.exists()) {
        toast({ title: "Error", description: "Wellness data not found.", variant: "destructive" });
        router.push("/dispensary-admin/dashboard"); 
        setIsLoadingInitialData(false);
        return;
      }
      fetchedWellness = wellnessSnap.data() as Dispensary;
      setWellnessData(fetchedWellness);
      const isSpecialType = fetchedWellness.dispensaryType === THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME;
      setIsThcCbdSpecialType(isSpecialType);


      if (fetchedWellness.dispensaryType) {
        const categoriesCollectionRef = collection(db, 'dispensaryTypeProductCategories');
        const q = firestoreQuery(categoriesCollectionRef, where('name', '==', fetchedWellness.dispensaryType), limit(1));
        const categoriesSnapshot = await getDocs(q);
        if (!categoriesSnapshot.empty) {
          const categoriesDoc = categoriesSnapshot.docs[0].data() as DispensaryTypeProductCategoriesDoc;
          let rawCategoriesData = categoriesDoc.categoriesData;
          
          if (isSpecialType && rawCategoriesData && typeof rawCategoriesData === 'object' && rawCategoriesData.hasOwnProperty('thcCbdProductCategories')) {
             let specialTypeDataSource = (rawCategoriesData as any).thcCbdProductCategories;
             if (typeof specialTypeDataSource === 'object' && specialTypeDataSource !== null) {
                if (Array.isArray(specialTypeDataSource)) {
                  const tempStructure: Record<string, any> = {};
                  const streamsToParse = ['THC', 'CBD', 'Apparel', 'Smoking Gear'];
                  streamsToParse.forEach(streamName => {
                      const streamData = specialTypeDataSource.find((item: any) => item.name === streamName);
                      if (streamData) {
                          tempStructure[streamName] = streamData;
                      }
                  });
                  if (Object.keys(tempStructure).length > 0) localCategoryStructureObject = tempStructure;
                } else {
                  localCategoryStructureObject = specialTypeDataSource;
                }
            }
          } else if (!isSpecialType) { 
             let parsedCategoriesData = rawCategoriesData;
             if (typeof rawCategoriesData === 'string') {
                 try { parsedCategoriesData = JSON.parse(rawCategoriesData); } 
                 catch (jsonError) { console.error("Failed to parse general categoriesData JSON string for edit:", jsonError); parsedCategoriesData = null; }
             }
             if (parsedCategoriesData && Array.isArray(parsedCategoriesData) && parsedCategoriesData.length > 0) {
                 const generalCategoryStructure: Record<string, any> = {};
                 parsedCategoriesData.forEach((cat: ProductCategory) => {
                     if (cat.name) generalCategoryStructure[cat.name] = cat.subcategories || [];
                 });
                 localCategoryStructureObject = generalCategoryStructure;
             } else if (parsedCategoriesData && typeof parsedCategoriesData === 'object' && !Array.isArray(parsedCategoriesData) && Object.keys(parsedCategoriesData).length > 0) {
                 localCategoryStructureObject = parsedCategoriesData;
             }
          }
          setCategoryStructureObject(localCategoryStructureObject);
          if (!isSpecialType && localCategoryStructureObject) {
             setMainCategoryOptions(Object.keys(localCategoryStructureObject).filter(key => key.trim() !== '').sort());
          }
        } else {
          toast({ title: "Category Setup Missing", description: `Category structure for "${fetchedWellness.dispensaryType}" not found.`, variant: "default", duration: 10000 });
        }
      } else {
        toast({ title: "Wellness Type Missing", description: "Wellness profile missing 'type'.", variant: "destructive", duration: 10000 });
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
        const initialStream = determineProductStream(productData);
        setSelectedProductStream(initialStream);

        form.reset({
          name: productData.name,
          description: productData.description,
          category: productData.category,
          subcategory: productData.subcategory || null,
          subSubcategory: productData.subSubcategory || null,
          strain: productData.strain || '',
          thcContent: productData.thcContent ?? undefined,
          cbdContent: productData.cbdContent ?? undefined,
          gender: productData.gender || null,
          sizingSystem: productData.sizingSystem || null,
          sizes: productData.sizes || [],
          currency: productData.currency || (fetchedWellness ? fetchedWellness.currency : 'ZAR'),
          priceTiers: productData.priceTiers && productData.priceTiers.length > 0 ? productData.priceTiers : [{ unit: '', price: undefined as any }],
          quantityInStock: productData.quantityInStock ?? undefined,
          imageUrl: productData.imageUrl || null,
          labTested: productData.labTested || false,
          effects: productData.effects || [],
          flavors: productData.flavors || [],
          medicalUses: productData.medicalUses || [],
          isAvailableForPool: productData.isAvailableForPool || false,
          tags: productData.tags || [],
          stickerProgramOptIn: productData.stickerProgramOptIn || null,
        });
        if (productData.priceTiers && productData.priceTiers.length > 0) {
            replacePriceTiers(productData.priceTiers);
        } else {
            replacePriceTiers([{ unit: '', price: undefined as any }]);
        }

        setImagePreview(productData.imageUrl || null);
        setOldImageUrl(productData.imageUrl);

        if (isSpecialType && initialStream && localCategoryStructureObject) {
          if (initialStream === 'THC' || initialStream === 'CBD') {
            const compoundDetails = localCategoryStructureObject[initialStream];
            if (compoundDetails && compoundDetails['Delivery Methods']) {
              setDeliveryMethodOptions(Object.keys(compoundDetails['Delivery Methods']).sort());
              if (productData.subcategory && compoundDetails['Delivery Methods'][productData.subcategory]) {
                setSelectedDeliveryMethod(productData.subcategory);
                const types = compoundDetails['Delivery Methods'][productData.subcategory];
                if (Array.isArray(types)) setSpecificProductTypeOptions(types.sort());
              }
            }
          }
        } else if (!isSpecialType && productData.category && localCategoryStructureObject) {
            setSelectedMainCategoryName(productData.category);
            const mainCatData = localCategoryStructureObject[productData.category];
            if (Array.isArray(mainCatData)) {
                setSubCategoryL1Options(mainCatData.map((sub: ProductCategory) => sub.name).filter(name => name && name.trim() !== '').sort());
                if(productData.subcategory){
                    setSelectedSubCategoryL1Name(productData.subcategory);
                    const subCatL1Object = mainCatData.find((sub: ProductCategory) => sub.name === productData.subcategory);
                    if(subCatL1Object && Array.isArray(subCatL1Object.subcategories)){
                        setSubCategoryL2Options(subCatL1Object.subcategories.map((subSub: ProductCategory) => subSub.name).filter(name => name && name.trim() !== '').sort());
                    }
                }
            }
        }
        if (initialStream === 'Apparel' && productData.gender && productData.sizingSystem) {
          const sizes = standardSizesData[productData.gender]?.[productData.sizingSystem] || [];
          setAvailableStandardSizes(sizes);
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
  }, [currentUser?.dispensaryId, productId, router, toast, form, replacePriceTiers]);


  useEffect(() => {
    if (!authLoading && currentUser) { fetchWellnessAndProductData(); }
    else if (!authLoading && !currentUser) { 
      toast({title: "Not Authenticated", description: "Please log in to edit products.", variant: "destructive"});
      router.push("/auth/signin"); 
    }
  }, [currentUser, authLoading, router, toast, fetchWellnessAndProductData]);

  useEffect(() => {
    if (!isThcCbdSpecialType || (selectedProductStream !== 'THC' && selectedProductStream !== 'CBD') || !categoryStructureObject) {
      if (selectedProductStream !== 'THC' && selectedProductStream !== 'CBD') {
        setDeliveryMethodOptions([]);
        setSelectedDeliveryMethod(null);
        setSpecificProductTypeOptions([]);
        if (form.formState.isDirty || existingProduct?.category !== selectedProductStream) {
          form.setValue('subcategory', null);
          form.setValue('subSubcategory', null);
        }
      }
      return;
    }
    const compoundDetails = categoryStructureObject[selectedProductStream];
    if (compoundDetails && compoundDetails['Delivery Methods'] && typeof compoundDetails['Delivery Methods'] === 'object') {
        setDeliveryMethodOptions(Object.keys(compoundDetails['Delivery Methods']).sort());
    } else {
        setDeliveryMethodOptions([]);
    }
     if (form.formState.isDirty || existingProduct?.category !== selectedProductStream) {
        setSelectedDeliveryMethod(null);
        form.setValue('subcategory', null); 
        setSpecificProductTypeOptions([]);
        form.setValue('subSubcategory', null);
    }
  }, [selectedProductStream, categoryStructureObject, isThcCbdSpecialType, form, existingProduct]);

  useEffect(() => {
    if (!isThcCbdSpecialType || (selectedProductStream !== 'THC' && selectedProductStream !== 'CBD') || !selectedDeliveryMethod || !categoryStructureObject) {
      if (selectedProductStream !== 'THC' && selectedProductStream !== 'CBD') {
        setSpecificProductTypeOptions([]);
         if (form.formState.isDirty || existingProduct?.subcategory !== selectedDeliveryMethod) {
            form.setValue('subSubcategory', null);
        }
      }
      return;
    }
    const compoundDetails = categoryStructureObject[selectedProductStream!];
    if (compoundDetails && compoundDetails['Delivery Methods'] && compoundDetails['Delivery Methods'][selectedDeliveryMethod]) {
      const types = compoundDetails['Delivery Methods'][selectedDeliveryMethod];
      if (Array.isArray(types)) {
        setSpecificProductTypeOptions(types.sort());
      } else { setSpecificProductTypeOptions([]); }
    } else { setSpecificProductTypeOptions([]); }

    if (form.formState.isDirty || existingProduct?.subcategory !== selectedDeliveryMethod) {
       form.setValue('subSubcategory', null);
    }
  }, [selectedDeliveryMethod, selectedProductStream, categoryStructureObject, isThcCbdSpecialType, form, existingProduct]);


  useEffect(() => {
    if (isThcCbdSpecialType || !selectedMainCategoryName || !categoryStructureObject) {
      if (!isThcCbdSpecialType) {
        setSubCategoryL1Options([]);
        if (form.formState.isDirty || existingProduct?.category !== selectedMainCategoryName) {
          form.setValue('subcategory', null); setSelectedSubCategoryL1Name(null);
          form.setValue('subSubcategory', null); setSubCategoryL2Options([]);
        }
      }
      return;
    }
    const mainCatData = categoryStructureObject[selectedMainCategoryName];
    if (Array.isArray(mainCatData)) {
      setSubCategoryL1Options(mainCatData.map((sub: ProductCategory) => sub.name).filter(name => name && name.trim() !== '').sort());
    } else { setSubCategoryL1Options([]); }

    if (form.formState.isDirty || existingProduct?.category !== selectedMainCategoryName) {
        form.setValue('subcategory', null); setSelectedSubCategoryL1Name(null);
        form.setValue('subSubcategory', null); setSubCategoryL2Options([]);
    }
  }, [selectedMainCategoryName, categoryStructureObject, form, isThcCbdSpecialType, existingProduct]);

  useEffect(() => {
    if (isThcCbdSpecialType || !selectedMainCategoryName || !selectedSubCategoryL1Name || !categoryStructureObject) {
      if(!isThcCbdSpecialType) {
        setSubCategoryL2Options([]);
        if (form.formState.isDirty || existingProduct?.subcategory !== selectedSubCategoryL1Name) {
            form.setValue('subSubcategory', null);
        }
      }
      return;
    }
    const mainCatData = categoryStructureObject[selectedMainCategoryName];
    if (Array.isArray(mainCatData)) {
      const subCatL1Object = mainCatData.find((sub: ProductCategory) => sub.name === selectedSubCategoryL1Name);
      if (subCatL1Object && Array.isArray(subCatL1Object.subcategories)) {
        setSubCategoryL2Options(subCatL1Object.subcategories.map((subSub: ProductCategory) => subSub.name).filter(name => name && name.trim() !== '').sort());
      } else { setSubCategoryL2Options([]); }
    } else { setSubCategoryL2Options([]); }

    if (form.formState.isDirty || existingProduct?.subcategory !== selectedSubCategoryL1Name) {
        form.setValue('subSubcategory', null);
    }
  }, [selectedSubCategoryL1Name, selectedMainCategoryName, categoryStructureObject, form, isThcCbdSpecialType, existingProduct]);
  
  const watchedGender = form.watch('gender');
  const watchedSizingSystem = form.watch('sizingSystem');

  useEffect(() => {
    if (selectedProductStream === 'Apparel' && watchedGender && watchedSizingSystem) {
      const sizes = standardSizesData[watchedGender]?.[watchedSizingSystem] || [];
      setAvailableStandardSizes(sizes);
    } else {
      setAvailableStandardSizes([]);
    }
  }, [selectedProductStream, watchedGender, watchedSizingSystem]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
       if (file.size > 5 * 1024 * 1024) { 
        toast({ title: "Image Too Large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      form.setValue('imageUrl', ''); 
    }
  };

  const handleRemoveImage = async () => {
    setImageFile(null);
    setImagePreview(null);
    form.setValue('imageUrl', null); 
    if (imageInputRef.current) imageInputRef.current.value = "";
    
  };
  
  const handleProductStreamSelect = (stream: 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear') => { 
    
    console.warn("Product stream cannot be changed after creation.");
  };

  const toggleStandardSize = (size: string) => {
    const currentSizes = form.getValues('sizes') || [];
    const newSizes = currentSizes.includes(size)
      ? currentSizes.filter(s => s !== size)
      : [...currentSizes, size];
    form.setValue('sizes', newSizes, { shouldValidate: true });
  };

  const clearSelectedSizes = () => {
    form.setValue('sizes', [], { shouldValidate: true });
  };


  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser?.dispensaryId || !wellnessData || !existingProduct?.id) {
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
      const productUpdateData: Partial<ProductType> = { 
        name: data.name,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory || null,
        subSubcategory: data.subSubcategory || null,
        currency: data.currency,
        priceTiers: data.priceTiers.filter(tier => tier.unit && tier.price > 0), 
        quantityInStock: data.quantityInStock ?? 0,
        imageUrl: finalImageUrl,
        labTested: data.labTested || false,
        isAvailableForPool: data.isAvailableForPool || false,
        tags: data.tags || [],
        updatedAt: serverTimestamp() as any,
        stickerProgramOptIn: (selectedProductStream === 'THC' ? data.stickerProgramOptIn : null) || null,
      };

      if (selectedProductStream === 'THC' || selectedProductStream === 'CBD') {
        productUpdateData.strain = data.strain || null;
        productUpdateData.thcContent = data.thcContent ?? null;
        productUpdateData.cbdContent = data.cbdContent ?? null;
        productUpdateData.effects = data.effects || [];
        productUpdateData.flavors = data.flavors || [];
        productUpdateData.medicalUses = data.medicalUses || [];
        
        productUpdateData.gender = null; productUpdateData.sizingSystem = null; productUpdateData.sizes = [];
      } else if (selectedProductStream === 'Apparel') { 
        productUpdateData.gender = data.gender || null;
        productUpdateData.sizingSystem = data.sizingSystem || null;
        productUpdateData.sizes = data.sizes || [];
        
        productUpdateData.strain = null; productUpdateData.thcContent = null; productUpdateData.cbdContent = null;
        productUpdateData.effects = []; productUpdateData.flavors = []; productUpdateData.medicalUses = [];
        productUpdateData.stickerProgramOptIn = null;
      } else if (selectedProductStream === 'Smoking Gear') {
        
        productUpdateData.strain = null; productUpdateData.thcContent = null; productUpdateData.cbdContent = null;
        productUpdateData.effects = []; productUpdateData.flavors = []; productUpdateData.medicalUses = [];
        productUpdateData.gender = null; productUpdateData.sizingSystem = null; productUpdateData.sizes = [];
        productUpdateData.stickerProgramOptIn = null;
      }
       
      if (selectedProductStream === 'Apparel' || selectedProductStream === 'Smoking Gear') { 
        productUpdateData.subcategory = null; productUpdateData.subSubcategory = null;
      }
      if (!data.subcategory) productUpdateData.subcategory = null;
      if (!data.subSubcategory) productUpdateData.subSubcategory = null;


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
  if (!wellnessData || !existingProduct) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading product data...</p></div>;
  }


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
            Modify details for &quot;{existingProduct.name}&quot;. Current type: <span className="font-semibold text-primary">{wellnessData.dispensaryType || 'Not Set'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             {isThcCbdSpecialType && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>
                        Product Stream
                    </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                        {(['THC', 'CBD', 'Apparel', 'Smoking Gear'] as const).map((stream) => { 
                            let IconComponent = PackagePlus;
                            let iconColor = "text-gray-500";
                            if (stream === 'THC') { IconComponent = Flame; iconColor = "text-red-500"; }
                            else if (stream === 'CBD') { IconComponent = LeafIconLucide; iconColor = "text-green-500"; }
                            else if (stream === 'Apparel') { IconComponent = Shirt; iconColor = "text-blue-500"; } 
                            else if (stream === 'Smoking Gear') { IconComponent = Cigarette; iconColor = "text-orange-500"; }

                            return (
                                <Button
                                    key={stream}
                                    type="button"
                                    variant={selectedProductStream === stream ? 'default' : 'outline'}
                                    className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedProductStream === stream && 'ring-2 ring-primary ring-offset-2')}
                                    onClick={() => handleProductStreamSelect(stream)}
                                    disabled 
                                >
                                    <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2", iconColor)} />
                                    <span className="text-lg sm:text-xl font-semibold">{stream}</span>
                                </Button>
                            );
                        })}
                    </div>
                    <FormDescription>Product stream cannot be changed after creation for this wellness type.</FormDescription>
                </FormItem>
            )}

            {selectedProductStream && (
            <div className="mt-6 pt-6 border-t">
                {(selectedProductStream === 'THC' || selectedProductStream === 'CBD') && (
                    <>
                         {selectedProductStream === 'THC' && (
                            <Card className="mb-6 p-4 border-amber-500 bg-amber-50/50 shadow-sm">
                                <CardHeader className="p-0 pb-2">
                                    <CardTitle className="text-md flex items-center text-amber-700"><Info className="h-5 w-5 mr-2"/>Important Notice for THC Products</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 text-sm text-amber-600 space-y-2">
                                    <p>The Wellness Tree complies with South African Law regarding the trade of THC products. We invite Wellness Owners to offer THC products as a <strong className="font-semibold">FREE gift</strong> accompanying the sale of our exclusive "The Wellness Tree" sticker designs and cap designs.</p>
                                    <p>Our beautiful sticker and cap range, designed by leading artist Mary Janes Van Vuuren, can be offered through your wellness profile. By opting in, you agree to provide a FREE THC sample with each sticker/cap sold through the platform.</p>
                                    <p className="mt-2 font-semibold">Please remember: Any THC info is purely for recreational knowledge building for Cannibinoid enthusiasts, and is not relevant for Sticker sales.</p>
                                </CardContent>
                                 <FormField
                                    control={form.control}
                                    name="stickerProgramOptIn"
                                    render={({ field }) => (
                                        <FormItem className="mt-4">
                                        <FormLabel className="text-md font-semibold text-amber-700">Participate in Sticker and Cap Program & THC Gifting? *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                            <FormControl><SelectTrigger className="bg-white/70 border-amber-400"><SelectValue placeholder="Select your choice" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="yes">Yes, I want to participate</SelectItem>
                                                <SelectItem value="no">No, not at this time</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </Card>
                        )}
                        <FormField control={form.control} name="category" render={({ field }) => ( <FormItem className="hidden"><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem> )} />
                        
                        {deliveryMethodOptions.length > 0 && (
                        <FormField control={form.control} name="subcategory" render={({ field }) => (
                            <FormItem> <FormLabel>Delivery Method *</FormLabel>
                            <Select 
                                onValueChange={(value) => {
                                    field.onChange(value === "none" ? null : value);
                                    setSelectedDeliveryMethod(value === "none" ? null : value);
                                }} 
                                value={field.value ?? undefined}
                            >
                                <FormControl><SelectTrigger><SelectValue placeholder={`Select Delivery Method for ${selectedProductStream}`} /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {deliveryMethodOptions.map((method) => ( <SelectItem key={method} value={method}>{method}</SelectItem> ))}
                                </SelectContent>
                            </Select> <FormMessage />
                            </FormItem> )} />
                        )}

                        {selectedDeliveryMethod && specificProductTypeOptions.length > 0 && (
                        <FormField control={form.control} name="subSubcategory" render={({ field }) => (
                            <FormItem> <FormLabel>Specific Product Type *</FormLabel>
                            <Select 
                                onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                                value={field.value ?? undefined}
                            >
                                <FormControl><SelectTrigger><SelectValue placeholder={`Select Specific Type for ${selectedDeliveryMethod}`} /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {specificProductTypeOptions.map((type) => ( <SelectItem key={type} value={type}>{type}</SelectItem> ))}
                                </SelectContent>
                            </Select> <FormMessage />
                            </FormItem> )} />
                        )}
                         <FormField control={form.control} name="strain" render={({ field }) => ( <FormItem><FormLabel>Strain / Specific Type (if applicable)</FormLabel><FormControl><Input placeholder="e.g., Blue Dream, OG Kush" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This can be the specific product type if not covered by subcategories.</FormDescription><FormMessage /></FormItem> )} />
                         <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC Content (%)</FormLabel><FormControl><Input type="text" placeholder="e.g., 22.5" {...field} value={(typeof field.value === 'number' && !isNaN(field.value)) ? field.value.toString() : ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD Content (%)</FormLabel><FormControl><Input type="text" placeholder="e.g., 0.8" {...field} value={(typeof field.value === 'number' && !isNaN(field.value)) ? field.value.toString() : ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <Controller control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add effect (e.g., Relaxed, Happy, Uplifted)" disabled={isLoading} /><FormMessage /></FormItem> )} />
                        <Controller control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add flavor (e.g., Earthy, Sweet, Citrus)" disabled={isLoading} /><FormMessage /></FormItem> )} />
                        <Controller control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add medical use (e.g., Pain Relief, Insomnia)" disabled={isLoading} /><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Lab Tested</FormLabel><FormDescription>Check this if the product has been independently lab tested for quality and potency.</FormDescription></div> </FormItem> )} />
                    </>
                )}
                {selectedProductStream === 'Apparel' && ( 
                    <>
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem> <FormLabel>Apparel Type *</FormLabel> 
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select apparel type" /></SelectTrigger></FormControl>
                                <SelectContent>{apparelTypes.map((type) => ( <SelectItem key={type} value={type}>{type}</SelectItem> ))}</SelectContent>
                            </Select> <FormMessage />
                            </FormItem> )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem> <FormLabel>Gender *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                                <SelectContent>{apparelGenders.map((gender) => ( <SelectItem key={gender} value={gender}>{gender}</SelectItem> ))}</SelectContent>
                            </Select> <FormMessage />
                            </FormItem> )} />
                        <FormField control={form.control} name="sizingSystem" render={({ field }) => (
                            <FormItem> <FormLabel>Sizing System *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select sizing system" /></SelectTrigger></FormControl>
                                <SelectContent>{sizingSystemOptions.map((system) => ( <SelectItem key={system} value={system}>{system}</SelectItem> ))}</SelectContent>
                            </Select> <FormMessage />
                            </FormItem> )} />
                        
                        {availableStandardSizes.length > 0 && (
                            <FormItem>
                                <FormLabel>Select Standard Sizes</FormLabel>
                                <ScrollArea className="h-40 w-full rounded-md border p-2 bg-muted/20">
                                    <div className="flex flex-wrap gap-2">
                                        {availableStandardSizes.map(size => (
                                            <Badge
                                                key={size}
                                                variant={form.getValues('sizes')?.includes(size) ? 'default' : 'outline'}
                                                onClick={() => toggleStandardSize(size)}
                                                className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent/80"
                                            >
                                                {size}
                                            </Badge>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <Button type="button" variant="ghost" size="sm" onClick={clearSelectedSizes} className="mt-1 text-xs text-muted-foreground hover:text-destructive">
                                    <Delete className="mr-1 h-3 w-3" /> Clear Selected Sizes
                                </Button>
                            </FormItem>
                        )}
                        <Controller control={form.control} name="sizes" render={({ field }) => ( <FormItem><FormLabel>Selected/Custom Sizes (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add custom size or confirm selection" disabled={isLoading} /><FormDescription>Standard sizes selected above will appear here. You can also add custom sizes.</FormDescription><FormMessage /></FormItem> )} />
                    </>
                )}
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input placeholder="Premium OG Kush Flower" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
                 <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Detailed description..." {...field} rows={4} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
                <div className="space-y-3 pt-2">
                    <h3 className="text-lg font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Pricing Tiers *</h3>
                    {priceTierFields.map((tierField, index) => (
                        <div key={tierField.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-2 items-end p-4 border rounded-md shadow-sm bg-muted/30">
                            <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field }) => ( <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>{sampleUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>Price</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="text"
                                            placeholder="0.00" 
                                            {...field} 
                                            value={(typeof field.value === 'number' && !isNaN(field.value)) ? field.value.toString() : (field.value === null || field.value === undefined ? '' : String(field.value))}
                                            onChange={e => field.onChange(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )} />
                            {priceTierFields.length > 1 && ( <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="text-destructive hover:bg-destructive/10 self-center md:self-end mt-2 md:mt-0 md:mb-1.5"><Trash2 className="h-5 w-5" /></Button> )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendPriceTier({ unit: '', price: undefined as any })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Price Tier</Button>
                    <FormMessage>{form.formState.errors.priceTiers?.root?.message || form.formState.errors.priceTiers?.message}</FormMessage>
                </div>
                <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem><FormLabel>Currency *</FormLabel><FormControl><Input placeholder="ZAR" {...field} maxLength={3} readOnly disabled value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="quantityInStock" render={({ field }) => ( <FormItem><FormLabel>Stock Qty *</FormLabel><FormControl><Input type="text" placeholder="0" {...field} value={(typeof field.value === 'number' && !isNaN(field.value)) ? field.value.toString() : ''} onChange={e => field.onChange(e.target.value)} /></FormControl><FormMessage /></FormItem> )} />
                <Controller control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>General Tags</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add tag (e.g., Organic, Indoor, Popular)" disabled={isLoading} /><FormMessage /></FormItem> )} />
                <Separator /> <h3 className="text-lg font-medium text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Image</h3>
                <FormField control={form.control} name="imageUrl" render={() => ( <FormItem> <div className="flex items-center gap-4"> {imagePreview ? ( <div className="relative w-32 h-32 rounded border p-1 bg-muted"> <Image src={imagePreview} alt="Product preview" layout="fill" objectFit="cover" className="rounded" data-ai-hint="product image" /> </div> ) : ( <div className="w-32 h-32 rounded border bg-muted flex items-center justify-center"> <ImageIconLucide className="w-12 h-12 text-muted-foreground" /> </div> )} <div className="flex flex-col gap-2"> <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isLoading}> <UploadCloud className="mr-2 h-4 w-4" /> {imageFile || imagePreview ? "Change Image" : "Upload Image"} </Button> <Input id="imageUpload" type="file" className="hidden" ref={imageInputRef} accept="image/*" onChange={handleImageChange} disabled={isLoading} /> {(imagePreview || form.getValues('imageUrl')) && ( <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10" disabled={isLoading}> <Trash2 className="mr-2 h-4 w-4" /> Remove Image </Button> )} </div> </div> {uploadProgress !== null && uploadProgress < 100 && ( <div className="mt-2"> <Progress value={uploadProgress} className="w-full h-2" /> <p className="text-xs text-muted-foreground text-center mt-1">Uploading: {Math.round(uploadProgress)}%</p> </div> )} {uploadProgress === 100 && <p className="text-xs text-green-600 mt-1">Upload complete. Save changes.</p>} <FormDescription>Recommended: Clear, well-lit photo. PNG, JPG, WEBP. Max 5MB.</FormDescription> <FormMessage /> </FormItem> )} />
                <Separator />
                <div className="space-y-4">
                <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Lab Tested</FormLabel><FormDescription>Check this if the product has been independently lab tested for quality and potency.</FormDescription></div> </FormItem> )} />
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Available for Product Sharing Pool</FormLabel><FormDescription>Allow other wellness entities of the same type to request this product from you.</FormDescription></div> </FormItem> )} />
                </div>
            </div>
            )}
            {!isThcCbdSpecialType && !selectedProductStream && (
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
             <CardFooter className="px-0 pt-8"> <div className="flex gap-4 w-full"> <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData || (isThcCbdSpecialType && !selectedProductStream)}> {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Save Changes </Button> <Link href="/dispensary-admin/products" passHref legacyBehavior><Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}>Cancel</Button></Link> </div> </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
    
