
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, functions } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query as firestoreQuery, where, limit, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { httpsCallable } from 'firebase/functions';
import { productSchema, type ProductFormData, type ProductAttribute } from '@/lib/schemas';
import type { Dispensary, DispensaryTypeProductCategoriesDoc, ProductCategory } from '@/types';
import { findStrainImage } from '@/ai/flows/generate-thc-promo-designs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Flame, Leaf as LeafIconLucide, Shirt, Sparkles, Search as SearchIcon, Palette, Brain, Info, X as XIcon, HelpCircle, Star, Gift, CornerDownLeft } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Image from 'next/image';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME = "Cannibinoid store";

const apparelGenders = ['Mens', 'Womens', 'Unisex'];
const sizingSystemOptions = ['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other'];

const feedingTypeOptions = [
    'Organic feed in Pots', 'Organic feed Hydro', 'Chemical feed in Pots with flush',
    'Chemical feed hydro with flush', 'Organic & Chemical in Pots Flushed', 'Organic & Chemical hydro Flushed'
];


const standardSizesData: Record<string, Record<string, string[]>> = {
  'Mens': { 'UK/SA': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'], 'US': ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14', '15'], 'EURO': ['40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46', '47'], 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] },
  'Womens': { 'UK/SA': ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '9', '10'], 'US': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11', '12'], 'EURO': ['35.5', '36', '36.5', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '43'], 'Alpha (XS-XXXL)': ['XXS','XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  'Unisex': { 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] }
};

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set';

const streamDisplayMapping: Record<StreamKey, { text: string; icon: React.ElementType; color: string }> = {
    'THC': { text: 'Cannibinoid (other)', icon: Flame, color: 'text-red-500' },
    'CBD': { text: 'CBD', icon: LeafIconLucide, color: 'text-green-500' },
    'Apparel': { text: 'Apparel', icon: Shirt, color: 'text-blue-500' },
    'Smoking Gear': { text: 'Accessories', icon: Sparkles, color: 'text-purple-500' },
    'Sticker Promo Set': { text: 'Sticker Promo Set', icon: Palette, color: 'text-yellow-500' },
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const getBadgeColor = (itemType: 'effect' | 'flavor' | 'medical' | 'thc' | 'terpene', index: number): string => {
    const colors = {
        effect: ["bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800", "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800"],
        flavor: ["bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800"],
        medical: ["bg-green-100 text-green-800", "bg-teal-100 text-teal-800", "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800"],
        terpene: ["bg-orange-100 text-orange-800", "bg-red-200 text-red-900"],
        thc: ["bg-red-100 text-red-800", "bg-rose-100 text-rose-800"],
    };
    const colorKey = itemType as keyof typeof colors;
    return colors[colorKey][index % colors[colorKey].length];
}

const AddAttributeInputs = ({ onAdd }: { onAdd: (name: string, percentage: string) => void }) => {
    const [name, setName] = useState('');
    const [percentage, setPercentage] = useState('');

    const handleAdd = () => {
        if (name.trim() && percentage.trim()) {
            onAdd(name, percentage);
            setName('');
            setPercentage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Relaxed" className="h-8"/>
            <Input value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="e.g., 55" className="h-8 w-24" onKeyDown={handleKeyDown}/>
            <Button type="button" size="icon" variant="outline" onClick={handleAdd} className="h-8 w-8 shrink-0">
                <CornerDownLeft className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
};

const PercentageKeyInfo = () => (
    <div className="p-2 mt-2 rounded-md border border-dashed bg-muted/50 text-xs w-full">
        <p className="font-semibold text-muted-foreground mb-1.5">Percentage Key:</p>
        <p className="text-muted-foreground leading-snug">
            Indicates the reported likelihood of an effect or its potential as a medical aid.
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
            <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
            <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
        </div>
    </div>
);


export default function AddProductPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [wellnessData, setWellnessData] = useState<Dispensary | null>(null);
  const [isThcCbdSpecialType, setIsThcCbdSpecialType] = useState(false);
  const [categoryStructureDoc, setCategoryStructureDoc] = useState<DispensaryTypeProductCategoriesDoc | null>(null);
  const [selectedProductStream, setSelectedProductStream] = useState<StreamKey | null>(null);
  
  const [deliveryMethodOptions, setDeliveryMethodOptions] = useState<string[]>([]);
  const [productSubCategoryOptions, setProductSubCategoryOptions] = useState<string[]>([]);

  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);
  const [strainQuery, setStrainQuery] = useState('');
  const [strainSearchResults, setStrainSearchResults] = useState<any[]>([]);
  const [isFetchingStrain, setIsFetchingStrain] = useState(false);
  const [selectedStrainData, setSelectedStrainData] = useState<any | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  
  const [showTripleSOptIn, setShowTripleSOptIn] = useState(false);
  
  const effectKeys = ["relaxed", "happy", "euphoric", "uplifted", "sleepy", "dry_mouth", "dry_eyes", "dizzy", "paranoid", "anxious", "creative", "energetic", "focused", "giggly", "tingly", "aroused", "hungry", "talkative"];
  const medicalKeys = ["stress", "pain", "depression", "anxiety", "insomnia", "ptsd", "fatigue", "lack_of_appetite", "nausea", "headaches", "bipolar_disorder", "cancer", "cramps", "gastrointestinal_disorder", "inflammation", "muscle_spasms", "eye_pressure", "migraines", "asthma", "anorexia", "arthritis", "add/adhd", "muscular_dystrophy", "hypertension", "glaucoma", "pms", "seizures", "spasticity", "spinal_cord_injury", "fibromyalgia", "crohn's_disease", "phantom_limb_pain", "epilepsy", "multiple_sclerosis", "parkinson's", "tourette's_syndrome", "alzheimer's", "hiv/aids", "tinnitus"];
  const commonFlavors = [ "earthy", "sweet", "citrus", "pungent", "pine", "woody", "flowery", "spicy", "herbal", "pepper", "berry", "tropical", "lemon", "lime", "orange", "grape", "diesel", "chemical", "ammonia", "cheese", "skunk", "coffee", "nutty", "vanilla", "mint", "menthol", "blueberry", "mango", "strawberry", "pineapple", "lavender", "rose", "tar", "grapefruit", "apple", "apricot", "chestnut", "honey", "plum" ];

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', deliveryMethod: null, productSubCategory: null,
      mostCommonTerpene: '',
      strain: null, strainType: null, homeGrow: [], feedingType: null,
      thcContent: '0', cbdContent: '0',
      gender: null, sizingSystem: null, sizes: [],
      currency: 'ZAR', priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      quantityInStock: undefined, imageUrls: [],
      labTested: false, labTestReportUrl: null, effects: [], flavors: [], medicalUses: [],
      isAvailableForPool: false, tags: [], stickerProgramOptIn: null,
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  const { fields: effectsFields, append: appendEffect, remove: removeEffect, replace: replaceEffects } = useFieldArray({ control: form.control, name: "effects" });
  const { fields: medicalUsesFields, append: appendMedicalUse, remove: removeMedicalUse, replace: replaceMedicalUses } = useFieldArray({ control: form.control, name: "medicalUses" });
  const { replace: replaceFlavors } = useFieldArray({ control: form.control, name: "flavors" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchLabTested = form.watch('labTested');
  const watchSizingSystem = form.watch('sizingSystem');
  const watchGender = form.watch('gender');
  const watchStickerProgramOptIn = form.watch('stickerProgramOptIn');
  const watchDeliveryMethod = form.watch('deliveryMethod');

  const showProductDetailsForm = !isThcCbdSpecialType || (isThcCbdSpecialType && selectedProductStream && (selectedProductStream !== 'THC' || watchStickerProgramOptIn === 'yes'));
  const showStrainFetchUI = isThcCbdSpecialType && selectedProductStream === 'THC' && watchStickerProgramOptIn === 'yes';

  const resetProductStreamSpecificFields = () => {
    form.reset({
      ...form.getValues(),
      name: form.getValues('name'), description: form.getValues('description'), priceTiers: form.getValues('priceTiers'), poolPriceTiers: form.getValues('poolPriceTiers'), isAvailableForPool: form.getValues('isAvailableForPool'), tags: form.getValues('tags'),
      category: '', deliveryMethod: null, productSubCategory: null,
      mostCommonTerpene: '', strain: null, strainType: null, homeGrow: [], feedingType: null, thcContent: '0', cbdContent: '0', effects: [], flavors: [], medicalUses: [], gender: null, sizingSystem: null, sizes: [], stickerProgramOptIn: null, labTested: false, labTestReportUrl: null,
    });
    setLabTestFile(null); setDeliveryMethodOptions([]); setProductSubCategoryOptions([]);
    setAvailableStandardSizes([]); setSelectedStrainData(null); setStrainQuery(''); setStrainSearchResults([]);
    setShowTripleSOptIn(false);
  };

  const handleProductStreamSelect = (stream: StreamKey) => {
    resetProductStreamSpecificFields();
    setSelectedProductStream(stream);

    if (stream === 'THC') {
        setShowTripleSOptIn(true);
        form.setValue('category', 'THC');

        const deliveryMethodsMap = categoryStructureDoc?.categoriesData?.thcCbdProductCategories?.THC?.['Delivery Methods'];
        
        if (deliveryMethodsMap && typeof deliveryMethodsMap === 'object' && !Array.isArray(deliveryMethodsMap)) {
            const options = Object.keys(deliveryMethodsMap).sort();
            setDeliveryMethodOptions(options);
        } else {
            setDeliveryMethodOptions([]);
            toast({ title: "Config Warning", description: "Could not load types for THC. Please check wellness type category configuration.", variant: "destructive" });
        }
    }
  };

  const handleFetchStrainInfo = async () => {
    if (!strainQuery.trim()) return;
    setIsFetchingStrain(true); setStrainSearchResults([]); setSelectedStrainData(null);
    try {
        const processedQuery = toTitleCase(strainQuery.trim());
        const q = firestoreQuery(collection(db, 'my-seeded-collection'), where('name', '>=', processedQuery), where('name', '<=', processedQuery + '\uf8ff'), limit(10));
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStrainSearchResults(results);
        if (results.length === 0) {
            toast({ title: "No strains found", description: "No exact or similar strain names found in the database. Please check spelling or enter manually.", variant: "default" });
        }
    } catch (error) {
        console.error("Error fetching strain info:", error);
        toast({ title: "Error", description: "Could not fetch strain information.", variant: "destructive" });
    } finally {
        setIsFetchingStrain(false);
    }
  };

  const fetchInitialData = useCallback(async () => {
    if (authLoading || !currentUser?.dispensaryId) { if (!authLoading) setIsLoadingInitialData(false); return; }
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
            const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', "Cannibinoid store");
            const docSnap = await getDoc(categoriesDocRef);
            if (docSnap.exists()) {
                setCategoryStructureDoc(docSnap.data() as DispensaryTypeProductCategoriesDoc);
            } else {
                console.warn(`No product category structure found for type: Cannibinoid store`);
            }
        }

      } else { toast({ title: "Error", description: "Your wellness profile data could not be found.", variant: "destructive" }); }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [currentUser?.dispensaryId, form, toast, authLoading]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
  useEffect(() => {
    const gender = form.getValues('gender'); const system = form.getValues('sizingSystem');
    if (gender && system && standardSizesData[gender] && standardSizesData[gender][system]) { setAvailableStandardSizes(standardSizesData[gender][system]); } else { setAvailableStandardSizes([]); }
  }, [watchGender, watchSizingSystem, form]);

  useEffect(() => {
    if (watchDeliveryMethod) {
        const deliveryMethodsMap = categoryStructureDoc?.categoriesData?.thcCbdProductCategories?.THC?.['Delivery Methods'];
        const subcategories = deliveryMethodsMap?.[watchDeliveryMethod];

        if (Array.isArray(subcategories) && subcategories.length > 0) {
            setProductSubCategoryOptions(subcategories.sort());
        } else {
            setProductSubCategoryOptions([]);
        }
        form.setValue('productSubCategory', null);
    } else {
        setProductSubCategoryOptions([]);
    }
  }, [watchDeliveryMethod, categoryStructureDoc, form]);
  
  useEffect(() => {
    if (selectedStrainData) {
        form.setValue('name', selectedStrainData.name, { shouldValidate: true });
        form.setValue('strain', selectedStrainData.name, { shouldValidate: true });
        form.setValue('description', selectedStrainData.description || '', { shouldValidate: true });
        form.setValue('thcContent', (selectedStrainData.thc_level || '0').replace('%',''), { shouldValidate: true });
        form.setValue('mostCommonTerpene', selectedStrainData.most_common_terpene || selectedStrainData.terpene || 'N/A', { shouldValidate: true });
        form.setValue('strainType', selectedStrainData.type || null, { shouldValidate: true });
        
        const flavorsFromDesc = (selectedStrainData.description || '').toLowerCase().split(/\W+/).filter((word: string) => commonFlavors.includes(word));
        const allPossibleFlavors = [...new Set([...(selectedStrainData.flavor || []), ...flavorsFromDesc])];
        replaceFlavors(allPossibleFlavors);
        
        const effects = effectKeys
            .map(key => ({ name: toTitleCase(key), percentage: selectedStrainData[key] || '0%' }))
            .filter(eff => parseInt(eff.percentage) > 0);
        replaceEffects(effects);

        const medical = medicalKeys
            .map(key => ({ name: toTitleCase(key), percentage: selectedStrainData[key] || '0%' }))
            .filter(med => parseInt(med.percentage) > 0);
        replaceMedicalUses(medical);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStrainData, form]);

  const onSubmit = async (data: ProductFormData) => {
    if (!wellnessData || !currentUser) { toast({ title: "Error", description: "Cannot submit without wellness profile data.", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
        let uploadedImageUrls: string[] = [];
        if (files.length > 0) {
            toast({ title: "Uploading Images...", description: "Please wait while your product images are uploaded.", variant: "default" });
            const uploadPromises = files.map(file => { const sRef = storageRef(storage, `products/${currentUser.uid}/${Date.now()}_${file.name}`); return uploadBytesResumable(sRef, file).then(snapshot => getDownloadURL(snapshot.ref)); });
            uploadedImageUrls = await Promise.all(uploadPromises);
        }

        let uploadedLabTestUrl: string | null = null;
        if (labTestFile) {
            toast({ title: "Uploading Lab Report...", description: "Please wait while your lab report is uploaded.", variant: "default" });
            const sRef = storageRef(storage, `lab-reports/${currentUser.uid}/${Date.now()}_${labTestFile.name}`);
            const snapshot = await uploadBytesResumable(sRef, labTestFile);
            uploadedLabTestUrl = await getDownloadURL(snapshot.ref);
        }

        const productData = { ...data, dispensaryId: currentUser.dispensaryId, dispensaryName: wellnessData.dispensaryName, dispensaryType: wellnessData.dispensaryType, productOwnerEmail: currentUser.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), quantityInStock: data.priceTiers.reduce((acc, tier) => acc + (tier.quantityInStock || 0), 0), imageUrls: uploadedImageUrls, labTestReportUrl: uploadedLabTestUrl };
        await addDoc(collection(db, 'products'), productData);
        toast({ title: "Success!", description: `Product "${data.name}" has been created.` });
        router.push('/dispensary-admin/products');
    } catch (error) {
        console.error("Error creating product:", error);
        toast({ title: "Creation Failed", description: "An error occurred while creating the product.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  if (isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <Card className="shadow-xl animate-pulse"> <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader> <CardContent className="p-6 space-y-6"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> <CardFooter><Skeleton className="h-12 w-full" /></CardFooter> </Card> </div> );
  }

  return (
     <Card className="max-w-4xl mx-auto my-8 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> <PackagePlus className="mr-3 h-8 w-8 text-primary" /> Add New Product </CardTitle>
            <Button variant="default" onClick={() => router.push('/dispensary-admin/products')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Button>
        </div>
        <CardDescription className="text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select a product stream, then fill in the details. Fields marked with * are required. {wellnessData?.dispensaryType && ( <span className="block mt-1">Categories for: <span className="font-semibold text-primary">{wellnessData.dispensaryType}</span></span> )} </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isThcCbdSpecialType && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Product Stream * </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
                        {(Object.keys(streamDisplayMapping) as StreamKey[]).map((stream) => { const { text, icon: IconComponent, color } = streamDisplayMapping[stream]; return ( <Button key={stream} type="button" variant={selectedProductStream === stream ? 'default' : 'outline'} className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedProductStream === stream && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleProductStreamSelect(stream)}> <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2", color)} /> <span className="text-lg sm:text-xl font-semibold">{text}</span> </Button> ); })}
                    </div>
                </FormItem>
            )}
             
            {selectedProductStream === 'THC' && (
                <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner">
                    <CardHeader className="p-6">
                       <div className="flex justify-center items-center h-full w-full mb-6">
                           <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                               <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md"> <Image src="/images/2025-triple-s/t44.jpg" alt="Sticker promo placeholder 1" layout="fill" objectFit='cover' data-ai-hint="sticker design"/> </div>
                               <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md"> <Image src="/images/2025-triple-s/t42.jpg" alt="Sticker promo placeholder 2" layout="fill" objectFit='cover' data-ai-hint="apparel mockup"/> </div>
                           </div>
                       </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 text-center">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-orange-800">The Triple S Canna club</h3>
                            <p className="text-lg italic text-orange-900/80">
                                <span className="text-base">Your</span>{' '}
                                <span className="font-bold text-xl not-italic">Strain-Sticker-Sample</span>{' '}
                                <span className="text-base">club.</span>
                            </p>
                        </div>
                        <div className='space-y-3 text-orange-900/90 text-sm leading-relaxed max-w-2xl mx-auto pt-4'>
                            <p>Attach your garden delights to a sticker. Set your sticker design price and offer free samples to fellow cannabis enthusiasts.</p>
                            <p>Shoppers can generate and purchase stickers for caps, hoodies, t-shirts and as standalone stickers.</p>
                            <p className='font-semibold'>Happy sharing your free samples, and awesome on the fly AI strain sticker designs with fellow cannabis enthusiasts. OneLove</p>
                        </div>
                         <FormField control={form.control} name="stickerProgramOptIn" render={({ field }) => (
                            <FormItem className="space-y-3 pt-6 mt-6 border-t border-orange-200/50">
                            <FormLabel className="text-base font-semibold text-gray-800 block text-center">Do you want to participate for this product?</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value ?? undefined} className="flex flex-col sm:flex-row gap-4 pt-2 max-w-md mx-auto">
                                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm">
                                        <FormControl><RadioGroupItem value="yes" /></FormControl>
                                        <FormLabel className="font-normal text-lg text-green-700">Yes, include my product</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm">
                                        <FormControl><RadioGroupItem value="no" /></FormControl>
                                        <FormLabel className="font-normal text-lg">No, this is a standard product</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage className="text-center" />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            )}

            <Separator className={cn("my-6", !showProductDetailsForm && 'hidden')} />

            {showProductDetailsForm && (
                <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                     {(selectedProductStream === 'THC') && (
                       <>
                         <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>1. Fetch Strain Information (Optional)</h2>
                          <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                            <FormItem>
                                <FormLabel>Search for a strain (e.g., Blue Dream)</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Input value={strainQuery} onChange={(e) => setStrainQuery(e.target.value)} placeholder="Search..." />
                                    <Button type="button" onClick={handleFetchStrainInfo} disabled={isFetchingStrain}>
                                        {isFetchingStrain ? <Loader2 className="animate-spin h-4 w-4" /> : <SearchIcon className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </FormItem>
                            
                            {strainSearchResults.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                  {strainSearchResults.map(strain => (
                                    <Card key={strain.id} className="flex flex-col overflow-hidden">
                                      <CardHeader className="p-0 relative aspect-video">
                                        {strain.img_url && strain.img_url !== 'none' ? (
                                          <Image src={strain.img_url} alt={strain.name} layout="fill" objectFit="cover" />
                                        ) : (
                                          <div className="w-full h-full bg-muted flex items-center justify-center">
                                            <LeafIconLucide className="h-12 w-12 text-primary/50 animate-pulse-slow" />
                                          </div>
                                        )}
                                      </CardHeader>
                                      <CardContent className="p-3 flex-grow"> <h3 className="font-semibold truncate">{strain.name}</h3> </CardContent>
                                      <CardFooter className="p-3 pt-0"> <Button type="button" size="sm" className="w-full" onClick={() => { setSelectedStrainData(strain); setStrainSearchResults([]); }}>Select this strain</Button> </CardFooter>
                                    </Card>
                                  ))}
                                </div>
                            )}
                            {selectedStrainData && (
                                <Card className="p-4 bg-background">
                                    <CardHeader className="p-0 mb-3"> <CardTitle className="text-lg text-primary">{selectedStrainData.name}</CardTitle> </CardHeader>
                                    <CardContent className="p-0 text-sm space-y-4">
                                      <p className="text-muted-foreground">{selectedStrainData.description}</p>
                                       <div className="flex flex-wrap gap-2">
                                          <Badge className={getBadgeColor('thc', 0)}>THC: {selectedStrainData.thc_level || 'N/A'}</Badge>
                                          <Badge className={getBadgeColor('terpene', 0)}>Terpene: {selectedStrainData.most_common_terpene || selectedStrainData.terpene || 'N/A'}</Badge>
                                      </div>
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-foreground">Effects</h4>
                                        <PercentageKeyInfo />
                                        <div className="flex flex-wrap gap-2">{form.getValues('effects')?.map((item: ProductAttribute, i: number) => <Badge key={i} className={cn("text-sm", getBadgeColor('effect', i))}>{item.name} ({item.percentage})</Badge>)}</div>
                                      </div>
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-foreground">Medical Uses</h4>
                                         <PercentageKeyInfo />
                                        <div className="flex flex-wrap gap-2">{form.getValues('medicalUses')?.map((item: ProductAttribute, i: number) => <Badge key={i} className={cn("text-sm", getBadgeColor('medical', i))}>{item.name} ({item.percentage})</Badge>)}</div>
                                      </div>
                                      <div className="space-y-2">
                                        <h4 className="font-semibold text-foreground">Flavors</h4>
                                        <div className="flex flex-wrap gap-2">{form.getValues('flavors')?.map((item: string, i: number) => <Badge key={i} className={cn("text-sm", getBadgeColor('flavor', i))}>{item}</Badge>)}</div>
                                      </div>
                                    </CardContent>
                                </Card>
                            )}
                         </div>
                       </>
                    )}
                    
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>2. Product Details</h2>
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                    
                    <div className="grid md:grid-cols-2 gap-4">
                       {isThcCbdSpecialType ? (
                           <>
                             <FormField control={form.control} name="deliveryMethod" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select product type: *</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); }} value={field.value || ''} disabled={deliveryMethodOptions.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a product type..." /></SelectTrigger></FormControl>
                                        <SelectContent>{deliveryMethodOptions.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            {productSubCategoryOptions.length > 0 && (
                                <FormField control={form.control} name="productSubCategory" render={({ field }) => (
                                    <FormItem><FormLabel>Product Sub Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-category" /></SelectTrigger></FormControl>
                                        <SelectContent>{productSubCategoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )} />
                            )}
                           </>
                        ) : (
                            <FormField control={form.control} name="category" render={({ field }) => ( <FormItem><FormLabel>Category *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        )}
                    </div>
                    
                    {(selectedProductStream === 'THC') && (
                       <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                          <FormField control={form.control} name="strainType" render={({ field }) => ( <FormItem><FormLabel>Strain Type</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g., Sativa Dominant Hybrid" /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="homeGrow" render={({ field }) => (<FormItem><FormLabel>Home Grow Method</FormLabel><FormControl><MultiInputTags placeholder="e.g., Indoor, Outdoor, Greenhouse" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name="feedingType" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Plant Feeding Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                  <FormControl><SelectTrigger className="bg-green-100 border-green-300 text-green-800"><SelectValue placeholder="Select feeding method" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {feedingTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          <Separator/>
                          <FormField control={form.control} name="mostCommonTerpene" render={({ field }) => ( <FormItem><FormLabel>Most Common Terpene</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          
                          <FormField control={form.control} name="effects" render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Effects</FormLabel>
                                  <PercentageKeyInfo />
                                  <AddAttributeInputs onAdd={(name, percentage) => appendEffect({ name: toTitleCase(name), percentage: percentage + '%' })} />
                                  <div className="flex flex-wrap gap-2 min-h-[34px] p-2 border rounded-md bg-background">
                                      {effectsFields.map((item, index) => (
                                          <Badge key={item.id} className={cn("flex items-center justify-between text-sm py-1.5", getBadgeColor('effect', index))}>
                                              <span>{form.getValues(`effects.${index}.name`)} ({form.getValues(`effects.${index}.percentage`)})</span>
                                              <button type="button" onClick={() => removeEffect(index)} className="ml-2 rounded-full opacity-50 hover:opacity-100"><XIcon className="h-3 w-3"/></button>
                                          </Badge>
                                      ))}
                                  </div>
                                  <FormMessage />
                              </FormItem>
                          )} />

                          <FormField control={form.control} name="medicalUses" render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Medical Uses</FormLabel>
                                  <PercentageKeyInfo />
                                  <AddAttributeInputs onAdd={(name, percentage) => appendMedicalUse({ name: toTitleCase(name), percentage: percentage + '%' })} />
                                  <div className="flex flex-wrap gap-2 min-h-[34px] p-2 border rounded-md bg-background">
                                      {medicalUsesFields.map((item, index) => (
                                          <Badge key={item.id} className={cn("flex items-center justify-between text-sm py-1.5", getBadgeColor('medical', index))}>
                                              <span>{form.getValues(`medicalUses.${index}.name`)} ({form.getValues(`medicalUses.${index}.percentage`)})</span>
                                              <button type="button" onClick={() => removeMedicalUse(index)} className="ml-2 rounded-full opacity-50 hover:opacity-100"><XIcon className="h-3 w-3"/></button>
                                          </Badge>
                                      ))}
                                  </div>
                                  <FormMessage />
                              </FormItem>
                          )} />

                           <FormField control={form.control} name="flavors" render={({ field }) => (<FormItem><FormLabel>Flavors</FormLabel><FormControl><MultiInputTags placeholder="Add flavor (e.g., Earthy, Pine)" value={field.value || []} onChange={field.onChange} getTagClassName={(_, index) => getBadgeColor('flavor', index)} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name="thcContent" render={({ field }) => (<FormItem><FormLabel>THC Content (%)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                           <FormField control={form.control} name="labTested" render={({ field }) => (<FormItem className="flex items-center gap-2 pt-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} id="lab-tested-check" /></FormControl><Label htmlFor="lab-tested-check">Lab Tested?</Label></FormItem>)} />
                           {watchLabTested && (<FormField control={form.control} name="labTestReportUrl" render={({ field }) => (<FormItem><FormLabel>Lab Report</FormLabel><FormControl><SingleImageDropzone value={labTestFile} onChange={setLabTestFile} /></FormControl><FormMessage /></FormItem>)} />)}
                       </div>
                    )}

                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>3. Pricing & Stock *</h2>
                    <div className="space-y-4">
                        {priceTierFields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 border rounded-md relative">
                                <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Price ({wellnessData?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '' })}>Add Another Price Tier</Button>
                    </div>

                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>4. Images & Tags</h2>
                     <FormField control={form.control} name="imageUrls" render={({ field }) => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags placeholder="e.g., Organic, Sativa, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                    
                    {selectedProductStream === 'Apparel' && (
                       <>
                          <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>5. Apparel Details</h2>
                           <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                              <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender *</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent>{apparelGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                              <FormField control={form.control} name="sizingSystem" render={({ field }) => ( <FormItem><FormLabel>Sizing System *</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select sizing system" /></SelectTrigger></FormControl><SelectContent>{sizingSystemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                               {availableStandardSizes.length > 0 && <FormField control={form.control} name="sizes" render={() => (<FormItem><FormLabel>Standard Sizes Available</FormLabel><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">{availableStandardSizes.map((size) => (<FormField key={size} control={form.control} name="sizes" render={({ field }) => (<FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value?.includes(size)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), size]) : field.onChange(field.value?.filter((value) => value !== size))}} /></FormControl><FormLabel className="font-normal text-sm">{size}</FormLabel></FormItem>)} />))}</div><FormMessage /></FormItem>)}/>}
                            </div>
                       </>
                    )}
                    {selectedProductStream === 'Sticker Promo Set' && (
                       <>
                          <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>5. Sticker Details</h2>
                           <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                              <FormField control={form.control} name="stickerProgramOptIn" render={({ field }) => ( <FormItem><FormLabel>Opt-in to Sticker Program? *</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select participation" /></SelectTrigger></FormControl><SelectContent><SelectItem value="yes">Yes, I want to sell this as a design pack</SelectItem><SelectItem value="no">No, this is a standard product</SelectItem></SelectContent></Select><FormDescription>Allows customers to purchase a design pack based on this product, receiving a sample for free.</FormDescription><FormMessage /></FormItem> )} />
                              {watchStickerProgramOptIn === 'yes' && (<div className="text-sm p-3 bg-primary/10 text-primary rounded-md">Great! This product will be flagged for the design generator. Ensure the name and description are compelling.</div>)}
                            </div>
                       </>
                    )}
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Final Step: Sharing & Visibility</h2>
                    <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other wellness stores of the same type to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                    {watchIsAvailableForPool && (
                       <Card className="p-4 bg-muted/50"><CardHeader className="p-0 mb-2"><CardTitle className="text-lg">Pool Pricing Tiers *</CardTitle><CardDescription>Define pricing for bulk transfers to other wellness stores.</CardDescription></CardHeader>
                       <CardContent className="p-0 space-y-2">
                        {poolPriceTierFields.map((field, index) => (
                           <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-3 border rounded-md relative bg-background">
                            <FormField control={form.control} name={`poolPriceTiers.${index}.unit`} render={({ field: f }) => (<FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="pool-units-list" /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name={`poolPriceTiers.${index}.price`} render={({ field: f }) => (<FormItem><FormLabel>Price *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>)} />
                            {poolPriceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePoolPriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                           </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPoolPriceTier({ unit: '', price: '' as any, quantityInStock: 0, description: '' })}>Add Pool Price Tier</Button>
                       </CardContent>
                       </Card>
                    )}
                    <CardFooter>
                        <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                            Add Product
                        </Button>
                    </CardFooter>
                </div>
            )}
          </form>
        </Form>
        <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
         <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
      </CardContent>
    </Card>
  );
}
