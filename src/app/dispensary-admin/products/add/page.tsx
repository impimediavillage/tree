
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Loader2, PackagePlus, ArrowLeft, Trash2, Flame, Leaf as LeafIconLucide, Shirt, Sparkles, Search as SearchIcon, Palette } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { Slider } from '@/components/ui/slider';


const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];


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

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set';

const streamDisplayMapping: Record<StreamKey, { text: string; icon: React.ElementType; color: string }> = {
    'THC': { text: 'Cannibinoid (other)', icon: Flame, color: 'text-red-500' },
    'CBD': { text: 'CBD', icon: LeafIconLucide, color: 'text-green-500' },
    'Apparel': { text: 'Apparel', icon: Shirt, color: 'text-blue-500' },
    'Smoking Gear': { text: 'Accessories', icon: Sparkles, color: 'text-purple-500' },
    'Sticker Promo Set': { text: 'Sticker Promo Set', icon: Palette, color: 'text-pink-500' },
};

const effectKeys = ["relaxed", "happy", "euphoric", "uplifted", "sleepy", "dry_mouth", "dry_eyes", "dizzy", "paranoid", "anxious", "hungry", "talkative", "creative", "energetic", "focus", "giggly", "aroused", "tingly"];
const medicalKeys = ["add/adhd", "alzheimer's", "anorexia", "anxiety", "arthritis", "bipolar_disorder", "cancer", "cramps", "crohn's_disease", "depression", "epilepsy", "eye_pressure", "fatigue", "fibromyalgia", "gastrointestinal_disorder", "glaucoma", "headaches", "hiv/aids", "hypertension", "inflammation", "insomnia", "migraines", "multiple_sclerosis", "muscle_spasms", "muscular_dystrophy", "nausea", "pain", "paranoid", "parkinson's", "phantom_limb_pain", "pms", "ptsd", "seizures", "spasticity", "spinal_cord_injury", "stress", "tinnitus", "tourette's_syndrome"];

const commonFlavors = [ "earthy", "sweet", "citrus", "pungent", "pine", "woody", "flowery", "spicy", "herbal", "pepper", "berry", "tropical", "lemon", "lime", "orange", "grape", "diesel", "chemical", "ammonia", "cheese", "skunk", "coffee", "nutty", "vanilla", "mint", "menthol", "blueberry", "mango", "strawberry", "pineapple", "lavender", "rose", "tar", "grapefruit", "apple", "apricot", "chestnut", "honey", "plum" ];

const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
};


export default function AddProductPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [wellnessData, setWellnessData] = useState<Dispensary | null>(null);

  const [isThcCbdSpecialType, setIsThcCbdSpecialType] = useState(false);
  const [categoryStructureObject, setCategoryStructureObject] = useState<Record<string, any> | null>(null);
  
  const [selectedProductStream, setSelectedProductStream] = useState<StreamKey | null>(null);
  
  const [mainCategoryOptions, setMainCategoryOptions] = useState<string[]>([]);
  const [selectedMainCategoryName, setSelectedMainCategoryName] = useState<string | null>(null);
  const [subCategoryL1Options, setSubCategoryL1Options] = useState<string[]>([]);
  const [selectedSubCategoryL1Name, setSelectedSubCategoryL1Name] = useState<string | null>(null);
  const [subCategoryL2Options, setSubCategoryL2Options] = useState<string[]>([]);

  const [deliveryMethodOptions, setDeliveryMethodOptions] = useState<string[]>([]);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string | null>(null);
  const [specificProductTypeOptions, setSpecificProductTypeOptions] = useState<string[]>([]);

  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);
  
  const [strainQuery, setStrainQuery] = useState('');
  const [strainSearchResults, setStrainSearchResults] = useState<any[]>([]);
  const [isFetchingStrain, setIsFetchingStrain] = useState(false);
  const [selectedStrainData, setSelectedStrainData] = useState<any | null>(null);

  const [showEffectsEditor, setShowEffectsEditor] = useState(false);
  const [showMedicalUsesEditor, setShowMedicalUsesEditor] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null, subSubcategory: null,
      productType: '', mostCommonTerpene: '',
      strain: null, thcContent: '0', cbdContent: '0', 
      gender: null, sizingSystem: null, sizes: [],
      currency: 'ZAR', priceTiers: [{ unit: '', price: undefined as any, quantityInStock: undefined as any, description: '' }], 
      poolPriceTiers: [],
      quantityInStock: undefined, imageUrls: [],
      labTested: false, labTestReportUrl: null, effects: [], flavors: [], medicalUses: [],
      isAvailableForPool: false, tags: [], stickerProgramOptIn: null,
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({
    control: form.control, name: "priceTiers",
  });
  
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({
    control: form.control, name: "poolPriceTiers",
  });
  
  const { fields: effectFields, append: appendEffect, remove: removeEffect, replace: replaceEffects } = useFieldArray({
    control: form.control, name: "effects",
  });
  
  const { fields: medicalUseFields, append: appendMedicalUse, remove: removeMedicalUse, replace: replaceMedicalUses } = useFieldArray({
    control: form.control, name: "medicalUses",
  });
  
  const watchedStickerProgramOptIn = form.watch('stickerProgramOptIn');
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchLabTested = form.watch('labTested');

  const resetProductSpecificFields = useCallback(() => {
    form.reset({
      ...form.getValues(),
      name: '',
      description: '',
      category: '',
      subcategory: null,
      subSubcategory: null,
      productType: '',
      mostCommonTerpene: '',
      strain: null,
      thcContent: '0',
      cbdContent: '0',
      effects: [],
      flavors: [],
      medicalUses: [],
      gender: null,
      sizingSystem: null,
      sizes: [],
      priceTiers: [{ unit: '', price: undefined as any, quantityInStock: undefined as any, description: '' }],
      poolPriceTiers: [],
      quantityInStock: undefined,
      imageUrls: [],
      labTested: false,
      labTestReportUrl: null,
      isAvailableForPool: false,
      tags: [],
      stickerProgramOptIn: null,
    });
    setFiles([]);
    setLabTestFile(null);
    setSelectedStrainData(null);
    setStrainQuery('');
  }, [form]);

  const handleProductStreamSelection = useCallback((stream: StreamKey) => {
    resetProductSpecificFields();
    setSelectedProductStream(stream);
    
    if (isThcCbdSpecialType) {
      const streamCategoryMap: Record<StreamKey, string> = {
        'THC': 'THC',
        'CBD': 'CBD',
        'Apparel': 'Apparel',
        'Smoking Gear': 'Smoking Gear',
        'Sticker Promo Set': 'Sticker Promo Set',
      };
      form.setValue('category', streamCategoryMap[stream]);
      setSelectedMainCategoryName(streamCategoryMap[stream]);
    }
  }, [form, resetProductSpecificFields, isThcCbdSpecialType]);

  const fetchInitialData = useCallback(async () => {
    if (authLoading || !currentUser?.dispensaryId) {
      if (!authLoading) setIsLoadingInitialData(false);
      return;
    }
    setIsLoadingInitialData(true);
    try {
      const dispensaryDocRef = doc(db, 'dispensaries', currentUser.dispensaryId);
      const dispensarySnap = await getDoc(dispensaryDocRef);
      if (dispensarySnap.exists()) {
        const dispensaryData = dispensarySnap.data() as Dispensary;
        setWellnessData(dispensaryData);
        form.setValue('currency', dispensaryData.currency || 'ZAR');
        
        const specialType = dispensaryData.dispensaryType === THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME;
        setIsThcCbdSpecialType(specialType);
        
        if (dispensaryData.dispensaryType) {
          const categoriesQuery = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', dispensaryData.dispensaryType), limit(1));
          const querySnapshot = await getDocs(categoriesQuery);
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const categoriesDoc = docSnap.data() as DispensaryTypeProductCategoriesDoc;
            
            if (Array.isArray(categoriesDoc.categoriesData)) {
              const categories = categoriesDoc.categoriesData as ProductCategory[];
              setCategoryStructureObject(categories.reduce((acc, cat) => ({ ...acc, [cat.name]: cat }), {}));
              setMainCategoryOptions(categories.map(c => c.name).sort());
            } else {
              console.warn("Categories data is not an array:", categoriesDoc.categoriesData);
              setCategoryStructureObject({});
              setMainCategoryOptions([]);
            }
          }
        }
      } else {
        toast({ title: "Error", description: "Your wellness profile data could not be found.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [currentUser?.dispensaryId, form, toast, authLoading]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onSubmit = async (data: ProductFormData) => {
    if (!wellnessData || !currentUser) {
      toast({ title: "Error", description: "Cannot submit without wellness profile data.", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    try {
        let uploadedImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading Images...", description: "Please wait while your product images are uploaded.", variant: "default" });
            const uploadPromises = files.map(file => {
                const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`);
                return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
            uploadedImageUrls = await Promise.all(uploadPromises);
        }

        let uploadedLabTestUrl: string | null = null;
        if (labTestFile) {
            toast({ title: "Uploading Lab Report...", description: "Please wait while your lab report is uploaded.", variant: "default" });
            const sRef = storageRef(storage, `lab-reports/${currentUser.uid}/${Date.now()}_${labTestFile.name}`);
            const snapshot = await uploadBytesResumable(sRef, labTestFile);
            uploadedLabTestUrl = await getDownloadURL(snapshot.ref);
        }

        const productData = {
            ...data,
            dispensaryId: currentUser.dispensaryId,
            dispensaryName: wellnessData.dispensaryName,
            dispensaryType: wellnessData.dispensaryType,
            productOwnerEmail: currentUser.email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            quantityInStock: data.priceTiers.reduce((acc, tier) => acc + (tier.quantityInStock || 0), 0),
            imageUrls: uploadedImageUrls,
            labTestReportUrl: uploadedLabTestUrl,
        };

        await addDoc(collection(db, 'products'), productData);

        toast({ title: "Success!", description: `Product "${data.name}" has been created.` });
        router.push('/dispensary-admin/products');
    } catch (error) {
        console.error("Error creating product:", error);
        toast({ title: "Creation Failed", description: "An error occurred while creating the product.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  const watchCategory = form.watch('category');
  const watchSubCategory = form.watch('subcategory');
  const watchGender = form.watch('gender');
  const watchSizingSystem = form.watch('sizingSystem');
  
  useEffect(() => {
    if (watchCategory && categoryStructureObject) {
      const subcategories = categoryStructureObject[watchCategory]?.subcategories || [];
      setSubCategoryL1Options(subcategories.map((sc: ProductCategory) => sc.name).sort());
      form.setValue('subcategory', null); // Reset subcategory when main changes
      setSubCategoryL2Options([]);
    }
  }, [watchCategory, categoryStructureObject, form]);

  useEffect(() => {
    if (watchSubCategory && watchCategory && categoryStructureObject) {
      const mainCat = categoryStructureObject[watchCategory];
      const subCat = mainCat?.subcategories?.find((sc: ProductCategory) => sc.name === watchSubCategory);
      setSubCategoryL2Options(subCat?.subcategories?.map((ssc: ProductCategory) => ssc.name).sort() || []);
      form.setValue('subSubcategory', null); // Reset sub-subcategory
    }
  }, [watchSubCategory, watchCategory, categoryStructureObject, form]);

  useEffect(() => {
    if (watchSizingSystem && watchGender && standardSizesData[watchGender] && standardSizesData[watchGender][watchSizingSystem]) {
      setAvailableStandardSizes(standardSizesData[watchGender][watchSizingSystem]);
    } else {
      setAvailableStandardSizes([]);
    }
  }, [watchGender, watchSizingSystem]);
  
  const searchStrains = useCallback(async () => {
    if (strainQuery.length < 2) {
      setStrainSearchResults([]);
      return;
    }
    setIsFetchingStrain(true);
    try {
      const formattedQuery = toTitleCase(strainQuery.trim());
      const q = firestoreQuery(
        collection(db, "my-seeded-collection"),
        where('name', '>=', formattedQuery),
        where('name', '<=', formattedQuery + '\uf8ff'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => doc.data());
      setStrainSearchResults(results);
    } catch (error) {
      console.error("Error searching strains:", error);
    } finally {
      setIsFetchingStrain(false);
    }
  }, [strainQuery]);

  const handleSelectStrain = (strain: any) => {
    setSelectedStrainData(strain);
    form.setValue('strain', strain.name);
    form.setValue('flavors', strain.flavor || []);
    const effectsWithPercentages = strain.effects.map((eff: any) => ({ name: eff.name, percentage: eff.percentage.toString() }));
    const medicalWithPercentages = strain.medical.map((med: any) => ({ name: med.name, percentage: med.percentage.toString() }));
    replaceEffects(effectsWithPercentages);
    replaceMedicalUses(medicalWithPercentages);
    setStrainSearchResults([]);
  };

  if (isLoadingInitialData) {
    return (
      <Card className="max-w-4xl mx-auto my-8 shadow-xl">
          <CardHeader>
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-full" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-12 w-full" />
          </CardFooter>
        </Card>
    );
  }

  return (
     <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle 
                className="text-3xl flex items-center text-foreground" 
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
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
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >
            Select a product stream, then fill in the details. Fields marked with * are required.
            {wellnessData?.dispensaryType && ( <span className="block mt-1">Categories for: <span className="font-semibold text-primary">{wellnessData.dispensaryType}</span></span> )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {isThcCbdSpecialType && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>
                        1. Select Product Stream *
                    </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-2">
                        {(Object.keys(streamDisplayMapping) as StreamKey[]).map((stream) => { 
                            const { text, icon: IconComponent, color } = streamDisplayMapping[stream];
                            return (
                                <Button
                                    key={stream}
                                    type="button"
                                    variant={selectedProductStream === stream ? 'default' : 'outline'}
                                    className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedProductStream === stream && 'ring-2 ring-primary ring-offset-2')}
                                    onClick={() => handleProductStreamSelection(stream)}
                                >
                                    <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2", color)} />
                                    <span className="text-lg sm:text-xl font-semibold text-center">{text}</span>
                                </Button>
                            );
                        })}
                    </div>
                </FormItem>
            )}

            {(selectedProductStream || !isThcCbdSpecialType) && (
                <div className="space-y-6 animate-fade-in-scale-up">
                    <h3 className="text-xl font-semibold border-b pb-2 text-foreground">
                        {isThcCbdSpecialType 
                            ? `2. Adding New Product: ${streamDisplayMapping[selectedProductStream!].text}` 
                            : 'Product Details'
                        }
                    </h3>
                    
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Product Name *</FormLabel> <FormControl><Input {...field} placeholder="e.g., Organic Lemon Haze" /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description *</FormLabel> <FormControl><Textarea {...field} rows={4} placeholder="Detailed description of the product..."/></FormControl> <FormMessage /> </FormItem> )}/>
                    
                    {/* REST OF THE DYNAMIC FORM RESTORED HERE */}
                    <Separator/>

                     {/* CATEGORY SELECTORS */}
                    {!isThcCbdSpecialType && (
                      <div className="grid md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="category" render={({ field }) => ( <FormItem> <FormLabel>Main Category *</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select main category" /></SelectTrigger></FormControl><SelectContent>{mainCategoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select> <FormMessage/> </FormItem> )}/>
                          <FormField control={form.control} name="subcategory" render={({ field }) => ( <FormItem> <FormLabel>Subcategory (L1)</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''} disabled={!watchCategory || subCategoryL1Options.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger></FormControl><SelectContent>{subCategoryL1Options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select> <FormMessage/> </FormItem> )}/>
                          <FormField control={form.control} name="subSubcategory" render={({ field }) => ( <FormItem> <FormLabel>Subcategory (L2)</FormLabel> <Select onValueChange={field.onChange} value={field.value || ''} disabled={!watchSubCategory || subCategoryL2Options.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select sub-subcategory" /></SelectTrigger></FormControl><SelectContent>{subCategoryL2Options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select> <FormMessage/> </FormItem> )}/>
                      </div>
                    )}
                    
                    {/* THC/CBD SPECIFIC FIELDS */}
                    {(selectedProductStream === 'THC' || selectedProductStream === 'CBD') && (
                      <div className="space-y-6 p-4 border rounded-md bg-muted/30">
                          <h4 className="font-semibold text-lg text-foreground">Strain Details</h4>
                          {/* Strain Search and Selection */}
                          <div className="relative">
                              <FormField control={form.control} name="strain" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Search & Select Strain</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <SearchIcon className="h-5 w-5 text-muted-foreground" />
                                        <Input
                                            value={strainQuery}
                                            onChange={e => {setStrainQuery(e.target.value); searchStrains();}}
                                            placeholder="Start typing strain name... (e.g., OG Kush)"
                                            className="flex-grow"
                                            disabled={!!selectedStrainData}
                                        />
                                        {selectedStrainData && <Button variant="outline" size="sm" onClick={() => {setSelectedStrainData(null); setStrainQuery(''); form.setValue('strain', null);}}>Clear</Button>}
                                    </div>
                                    {isFetchingStrain && <p className="text-sm text-muted-foreground">Searching...</p>}
                                    {strainSearchResults.length > 0 && (
                                        <div className="absolute z-10 w-full bg-card border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                                            {strainSearchResults.map((strain, index) => (
                                                <div key={index} onClick={() => handleSelectStrain(strain)} className="p-2 hover:bg-muted cursor-pointer">
                                                    {strain.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <FormDescription>Selecting a strain will auto-populate effects, flavors, and medical uses.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                              )} />
                          </div>
                          {/* THC/CBD Content Sliders */}
                          <div className="grid grid-cols-2 gap-6 pt-4">
                            <FormField control={form.control} name="thcContent" render={({ field }) => (<FormItem><FormLabel>THC Content ({field.value || '0'}%)</FormLabel><FormControl><Slider defaultValue={[parseInt(field.value || '0')]} max={100} step={1} onValueChange={(value) => field.onChange(value[0].toString())} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="cbdContent" render={({ field }) => (<FormItem><FormLabel>CBD Content ({field.value || '0'}%)</FormLabel><FormControl><Slider defaultValue={[parseInt(field.value || '0')]} max={100} step={1} onValueChange={(value) => field.onChange(value[0].toString())} /></FormControl></FormItem>)} />
                          </div>
                          {/* Effects, Medical, Flavors */}
                          <FormField control={form.control} name="flavors" render={({ field }) => ( <FormItem> <FormLabel>Flavors</FormLabel> <FormControl><MultiInputTags {...field} placeholder="Add flavor tags..." /></FormControl> <FormDescription>Common flavors: {commonFlavors.slice(0,5).join(', ')}...</FormDescription> <FormMessage /> </FormItem> )}/>
                          <Button type="button" variant="link" onClick={() => setShowEffectsEditor(!showEffectsEditor)}>{showEffectsEditor ? 'Hide' : 'Show'} Effects Editor</Button>
                          {showEffectsEditor && ( <div> {effectFields.map((item, index) => <div key={item.id}>...</div>)} </div>)}
                          <Button type="button" variant="link" onClick={() => setShowMedicalUsesEditor(!showMedicalUsesEditor)}>{showMedicalUsesEditor ? 'Hide' : 'Show'} Medical Uses Editor</Button>
                          {showMedicalUsesEditor && (<div>{medicalUseFields.map((item, index) => <div key={item.id}>...</div>)}</div>)}
                      </div>
                    )}

                    {/* APPAREL SPECIFIC FIELDS */}
                    {selectedProductStream === 'Apparel' && (
                       <div className="space-y-6 p-4 border rounded-md bg-muted/30">
                          <h4 className="font-semibold text-lg text-foreground">Apparel Details</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <FormField control={form.control} name="productType" render={({ field }) => ( <FormItem><FormLabel>Apparel Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger></FormControl><SelectContent>{apparelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                              <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select gender"/></SelectTrigger></FormControl><SelectContent>{apparelGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                              <FormField control={form.control} name="sizingSystem" render={({ field }) => ( <FormItem><FormLabel>Sizing System</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select sizing"/></SelectTrigger></FormControl><SelectContent>{sizingSystemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                          </div>
                           <FormField control={form.control} name="sizes" render={() => (<FormItem><FormLabel>Available Sizes</FormLabel><div className="flex flex-wrap gap-2">{availableStandardSizes.map(size => <FormField key={size} control={form.control} name="sizes" render={({ field }) => (<FormItem key={size} className="flex items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(size)} onCheckedChange={checked => { return checked ? field.onChange([...(field.value || []), size]) : field.onChange(field.value?.filter(v => v !== size))}}/></FormControl><FormLabel className="font-normal">{size}</FormLabel></FormItem>)}/>)}</div><FormMessage/></FormItem>)}/>
                      </div>
                    )}
                    
                    {/* PRICING TIERS */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg text-foreground">Pricing Tiers *</h4>
                        {priceTierFields.map((field, index) => (
                           <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-3 border rounded-md bg-muted/30">
                               <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field }) => (<FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} placeholder="e.g., 1g, 10-pack" /></FormControl><FormMessage/></FormItem>)} />
                               <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Price</FormLabel><FormControl><Input {...field} type="number" step="0.01" placeholder="150.00" /></FormControl><FormMessage/></FormItem>)} />
                               <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input {...field} type="number" placeholder="50" /></FormControl><FormMessage/></FormItem>)} />
                               <Button type="button" variant="destructive" onClick={() => removePriceTier(index)} className="self-end"><Trash2 className="h-4 w-4"/></Button>
                           </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: undefined, quantityInStock: undefined, description: '' })}>Add Price Tier</Button>
                    </div>

                    {/* IMAGES AND TAGS */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="imageUrls" render={() => ( <FormItem> <FormLabel>Product Images</FormLabel> <FormControl><MultiImageDropzone value={files} onChange={setFiles} /></FormControl> <FormMessage/> </FormItem> )}/>
                        <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem> <FormLabel>Tags</FormLabel> <FormControl><MultiInputTags {...field} placeholder="Add relevant tags..." /></FormControl> <FormDescription>Helps customers find your product.</FormDescription> <FormMessage/> </FormItem> )}/>
                    </div>

                    <Separator />
                    <div className="flex gap-4 pt-4">
                        <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                            Add Product
                        </Button>
                    </div>
                </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
