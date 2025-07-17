
'use client';

import * as React from 'react';
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
import { Loader2, PackagePlus, ArrowLeft, Trash2, Flame, Leaf as LeafIconLucide, Shirt, Sparkles, Search as SearchIcon, Palette, Brain, Info, X as XIcon, HelpCircle, Star, Gift, CornerDownLeft, Check, AlertTriangle } from 'lucide-react';
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
import { MushroomProductCard } from '@/components/dispensary-admin/MushroomProductCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME = "Cannibinoid store";
const MUSHROOM_WELLNESS_TYPE_NAME = "Mushroom store";
const TRADITIONAL_MEDICINE_WELLNESS_TYPE_NAME = "Traditional Medicine dispensary";


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

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set' | 'Medicinal' | 'Gourmet' | 'Psychedelic' | 'Plants' | 'Animals' | 'Spiritual';

const streamDisplayMapping: Record<string, { text: string; icon: React.ElementType; color: string, imageUrl?: string }> = {
    'THC': { text: 'Cannibinoid (other)', icon: Flame, color: 'text-red-500' },
    'CBD': { text: 'CBD', icon: LeafIconLucide, color: 'text-green-500' },
    'Apparel': { text: 'Apparel', icon: Shirt, color: 'text-blue-500' },
    'Smoking Gear': { text: 'Accessories', icon: Sparkles, color: 'text-purple-500' },
    'Sticker Promo Set': { text: 'Sticker Promo Set', icon: Palette, color: 'text-yellow-500' },
    'Medicinal': { text: 'Medicinal', icon: Brain, color: 'text-blue-500' },
    'Gourmet': { text: 'Gourmet', icon: LeafIconLucide, color: 'text-orange-500' },
    'Psychedelic': { text: 'Psychedelic', icon: Sparkles, color: 'text-indigo-500' },
    'Plants': { text: 'Plants', icon: LeafIconLucide, color: 'text-green-500' },
    'Animals': { text: 'Animals', icon: Brain, color: 'text-red-500' },
    'Spiritual': { text: 'Spiritual', icon: Sparkles, color: 'text-purple-500' },
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const getBadgeColor = (itemType: 'effect' | 'flavor' | 'medical' | 'thc' | 'terpene', index: number): string => {
    const colors = {
        effect: ["bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800", "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800"],
        flavor: ["bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800"],
        medical: ["bg-green-100 text-green-800", "bg-teal-100 text-teal-800", "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800", "bg-stone-200 text-stone-800", "bg-gray-200 text-gray-800"],
        terpene: ["bg-orange-100 text-orange-800", "bg-red-200 text-red-900"],
        thc: ["bg-red-100 text-red-800", "bg-rose-100 text-rose-800"],
    };
    const colorKey = itemType as keyof typeof colors;
    return colors[colorKey][index % colors[colorKey].length];
}

const AddAttributeInputs = ({ onAdd }: { onAdd: (name: string, percentage: string) => void }) => {
    const [name, setName] = React.useState('');
    const [percentage, setPercentage] = React.useState('');

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
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = React.useState(true);
  const [wellnessData, setWellnessData] = React.useState<Dispensary | null>(null);
  
  // Specific store type flags
  const [isThcCbdSpecialType, setIsThcCbdSpecialType] = React.useState(false);
  const [isMushroomStore, setIsMushroomStore] = React.useState(false);
  const [isTraditionalMedicineStore, setIsTraditionalMedicineStore] = React.useState(false);

  const [categoryStructureDoc, setCategoryStructureDoc] = React.useState<DispensaryTypeProductCategoriesDoc | null>(null);
  const [selectedProductStream, setSelectedProductStream] = React.useState<string | null>(null);
  
  // State for dynamic dropdowns
  const [productTypeOptions, setProductTypeOptions] = React.useState<any[]>([]);
  const [subCategoryL2Options, setSubCategoryL2Options] = React.useState<string[]>([]);
  const [selectedProductType, setSelectedProductType] = React.useState<any | null>(null);


  // State for Mushroom Store workflow
  const [mushroomStreamOptions, setMushroomStreamOptions] = React.useState<any[]>([]);
  const [mushroomProducts, setMushroomProducts] = React.useState<any[]>([]);
  const [selectedMushroomBaseProduct, setSelectedMushroomBaseProduct] = React.useState<any | null>(null);

  // State for Traditional Medicine Store workflow
  const [tradMedStreamOptions, setTradMedStreamOptions] = React.useState<any[]>([]);

  // General form state
  const [availableStandardSizes, setAvailableStandardSizes] = React.useState<string[]>([]);
  const [strainQuery, setStrainQuery] = React.useState('');
  const [strainSearchResults, setStrainSearchResults] = React.useState<any[]>([]);
  const [isFetchingStrain, setIsFetchingStrain] = React.useState(false);
  const [selectedStrainData, setSelectedStrainData] = React.useState<any | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [labTestFile, setLabTestFile] = React.useState<File | null>(null);
  
  const effectKeys = ["relaxed", "happy", "euphoric", "uplifted", "sleepy", "dry_mouth", "dry_eyes", "dizzy", "paranoid", "anxious", "creative", "energetic", "focused", "giggly", "tingly", "aroused", "hungry", "talkative"];
  const medicalKeys = ["stress", "pain", "depression", "anxiety", "insomnia", "ptsd", "fatigue", "lack_of_appetite", "nausea", "headaches", "bipolar_disorder", "cancer", "cramps", "gastrointestinal_disorder", "inflammation", "muscle_spasms", "eye_pressure", "migraines", "asthma", "anorexia", "arthritis", "add/adhd", "muscular_dystrophy", "hypertension", "glaucoma", "pms", "seizures", "spasticity", "spinal_cord_injury", "fibromyalgia", "crohn's_disease", "phantom_limb_pain", "epilepsy", "multiple_sclerosis", "parkinson's", "tourette's_syndrome", "alzheimer's", "hiv/aids", "tinnitus"];
  const commonFlavors = [ "earthy", "sweet", "citrus", "pungent", "pine", "woody", "flowery", "spicy", "herbal", "pepper", "berry", "tropical", "lemon", "lime", "orange", "grape", "diesel", "chemical", "ammonia", "cheese", "skunk", "coffee", "nutty", "vanilla", "mint", "menthol", "blueberry", "mango", "strawberry", "pineapple", "lavender", "rose", "tar", "grapefruit", "apple", "apricot", "chestnut", "honey", "plum" ];

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', productType: null, productSubCategory: null,
      mostCommonTerpene: '',
      strain: null, strainType: null, homeGrow: [], feedingType: null,
      thcContent: '0', cbdContent: '0',
      gender: null, sizingSystem: null, sizes: [],
      currency: 'ZAR', priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      quantityInStock: undefined, imageUrls: [],
      labTested: false, labTestReportUrl: null, effects: [], flavors: [], medicalUses: [],
      isAvailableForPool: false, tags: [], stickerProgramOptIn: null,
      baseProductData: null,
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
  const watchProductType = form.watch('productType');

  const showProductDetailsForm = !isThcCbdSpecialType && !isMushroomStore && !isTraditionalMedicineStore || 
                                (isThcCbdSpecialType && selectedProductStream) ||
                                (isMushroomStore && selectedProductStream) ||
                                (isTraditionalMedicineStore && selectedProductStream);
                                
  const showStrainFetchUI = isThcCbdSpecialType && (selectedProductStream === 'THC' || selectedProductStream === 'CBD') && watchStickerProgramOptIn !== 'no';

  const resetProductStreamSpecificFields = () => {
    form.reset({
      ...form.getValues(),
      name: form.getValues('name'), description: form.getValues('description'), priceTiers: form.getValues('priceTiers'), poolPriceTiers: form.getValues('poolPriceTiers'), isAvailableForPool: form.getValues('isAvailableForPool'), tags: form.getValues('tags'),
      category: '', productType: null, productSubCategory: null,
      mostCommonTerpene: '', strain: null, strainType: null, homeGrow: [], feedingType: null, thcContent: '0', cbdContent: '0', effects: [], flavors: [], medicalUses: [], gender: null, sizingSystem: null, sizes: [], stickerProgramOptIn: null, labTested: false, labTestReportUrl: null, baseProductData: null,
    });
    setLabTestFile(null); setProductTypeOptions([]); setSubCategoryL2Options([]);
    setAvailableStandardSizes([]); setSelectedStrainData(null); setStrainQuery(''); setStrainSearchResults([]);
    setMushroomProducts([]); setSelectedMushroomBaseProduct(null);
    setSelectedProductType(null);
  };

  const handleMushroomProductSelect = (product: any, format: string) => {
    setSelectedMushroomBaseProduct(product);
    form.setValue('name', product.name, { shouldValidate: true });
    form.setValue('description', product.description, { shouldValidate: true });
    form.setValue('productType', format, { shouldValidate: true });
    form.setValue('baseProductData', product, { shouldValidate: true });
    toast({ title: "Product Selected", description: `${product.name} details have been loaded into the form.`});
  };

  const handleProductStreamSelect = (stream: string) => {
    resetProductStreamSpecificFields();
    setSelectedProductStream(stream);

    if (isMushroomStore) {
      form.setValue('category', 'Mushrooms');
      form.setValue('productSubCategory', stream);
      const categories = (categoryStructureDoc?.categoriesData as any)?.mushroomProductCategories;
      const selectedCategoryData = categories?.find((cat: any) => cat.category_name === stream);
      if (selectedCategoryData && Array.isArray(selectedCategoryData.products)) {
        setMushroomProducts(selectedCategoryData.products);
      } else {
        setMushroomProducts([]);
      }
      return;
    }
    
    if (isTraditionalMedicineStore) {
        form.setValue('category', stream);
        const tradMedData = (categoryStructureDoc?.categoriesData as any)?.traditionalMedicineCategories?.traditionalMedicineCategories;
        const selectedCategoryData = tradMedData?.find((cat: any) => cat.useCase === stream);
        if (selectedCategoryData && Array.isArray(selectedCategoryData.categories)) {
            const types = selectedCategoryData.categories.map((c: any) => ({ name: c.type, imageUrl: c.imageUrl, subtypes: c.subtypes || [] })).filter(Boolean);
            const uniqueTypes = Array.from(new Map(types.map(item => [item['name'], item])).values());
            setProductTypeOptions(uniqueTypes);
        } else {
            setProductTypeOptions([]);
        }
        return;
    }

    if (isThcCbdSpecialType) {
        let categoryName = '';
        const streamKey = stream as StreamKey;
        switch(streamKey) {
            case 'THC': categoryName = 'THC'; break;
            case 'CBD': categoryName = 'CBD'; break;
            case 'Apparel': categoryName = 'Apparel'; break;
            case 'Smoking Gear': categoryName = 'Smoking Gear'; break;
            case 'Sticker Promo Set': categoryName = 'Sticker Promo Set'; break;
        }
        form.setValue('category', categoryName);

        const deliveryMethodsMap = (categoryStructureDoc?.categoriesData as any)?.thcCbdProductCategories?.[streamKey]?.['Delivery Methods'];
        
        if (deliveryMethodsMap && typeof deliveryMethodsMap === 'object' && !Array.isArray(deliveryMethodsMap)) {
            const types = Object.keys(deliveryMethodsMap);
            const uniqueTypes = [...new Set(types)].sort();
            setProductTypeOptions(uniqueTypes.map(t => ({name: t}))); // Make it an object array
        } else {
            setProductTypeOptions([]);
            toast({ title: "Config Warning", description: `Could not load product types for ${stream}. Please check category configuration.`, variant: "destructive" });
        }
    }
  };
  
  const handleProductTypeSelect = (type: any) => {
    if (selectedProductType?.name === type.name) {
      // Toggle off if the same button is clicked
      setSelectedProductType(null);
      form.setValue('productType', null);
      form.setValue('productSubCategory', null);
      setSubCategoryL2Options([]);
    } else {
      // Select new type
      setSelectedProductType(type);
      form.setValue('productType', type.name, { shouldValidate: true });
      form.setValue('productSubCategory', null); // Reset subcategory when type changes
      if (isTraditionalMedicineStore) {
        if (type.subtypes && Array.isArray(type.subtypes) && type.subtypes.length > 0) {
            const subtypeNames = type.subtypes.map((s: any) => s).filter(Boolean);
            const uniqueSubtypes = [...new Set(subtypeNames)].sort();
            setSubCategoryL2Options(uniqueSubtypes);
        } else {
            setSubCategoryL2Options([]);
        }
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
        
        const isCbdStore = dispensaryData.dispensaryType === THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME;
        const isMushStore = dispensaryData.dispensaryType === MUSHROOM_WELLNESS_TYPE_NAME;
        const isTradMedStore = dispensaryData.dispensaryType === TRADITIONAL_MEDICINE_WELLNESS_TYPE_NAME;
        
        setIsThcCbdSpecialType(isCbdStore);
        setIsMushroomStore(isMushStore);
        setIsTraditionalMedicineStore(isTradMedStore);

        if ((isCbdStore || isMushStore || isTradMedStore) && dispensaryData.dispensaryType) {
            const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', dispensaryData.dispensaryType);
            const docSnap = await getDoc(categoriesDocRef);
            if (docSnap.exists()) {
                const categoriesDoc = docSnap.data() as DispensaryTypeProductCategoriesDoc;
                setCategoryStructureDoc(categoriesDoc);

                if (isMushStore && Array.isArray((categoriesDoc.categoriesData as any)?.mushroomProductCategories)) {
                    const streams = (categoriesDoc.categoriesData as any).mushroomProductCategories
                        .map((cat: any) => ({name: cat.category_name, imageUrl: cat.imageUrl}))
                        .filter((cat: any) => cat.name);
                    setMushroomStreamOptions(streams);
                }
                
                if (isTradMedStore && (categoriesDoc.categoriesData as any)?.traditionalMedicineCategories?.traditionalMedicineCategories) {
                  const data = (categoriesDoc.categoriesData as any).traditionalMedicineCategories.traditionalMedicineCategories;
                  if (Array.isArray(data)) {
                    const streams = data
                        .map((cat: any) => ({ name: cat.useCase, imageUrl: cat.imageUrl }))
                        .filter((cat: any) => cat.name);
                    setTradMedStreamOptions(streams);
                  } else {
                    console.warn("traditionalMedicineCategories is not an array as expected.");
                  }
                }

            } else {
                console.warn(`No product category structure found for type: ${dispensaryData.dispensaryType}`);
            }
        }
      } else { toast({ title: "Error", description: "Your wellness profile data could not be found.", variant: "destructive" }); }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast({ title: "Error", description: "Could not load necessary data.", variant: "destructive" });
    } finally { setIsLoadingInitialData(false); }
  }, [currentUser?.dispensaryId, form, toast, authLoading]);

  React.useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
  React.useEffect(() => {
    const gender = form.getValues('gender'); const system = form.getValues('sizingSystem');
    if (gender && system && standardSizesData[gender] && standardSizesData[gender][system]) { setAvailableStandardSizes(standardSizesData[gender][system]); } else { setAvailableStandardSizes([]); }
  }, [watchGender, watchSizingSystem, form]);

  React.useEffect(() => {
    if (watchProductType) {
        if(isThcCbdSpecialType) {
            const deliveryMethodsMap = (categoryStructureDoc?.categoriesData as any)?.thcCbdProductCategories?.[selectedProductStream as StreamKey]?.['Delivery Methods'];
            const subcategories = deliveryMethodsMap?.[watchProductType] || [];
            if (Array.isArray(subcategories) && subcategories.length > 0) {
                const uniqueSubcategories = [...new Set(subcategories)];
                setSubCategoryL2Options(uniqueSubcategories.sort());
            } else {
                setSubCategoryL2Options([]);
            }
        }
        form.setValue('productSubCategory', null);
    } else {
        setSubCategoryL2Options([]);
    }
  }, [watchProductType, categoryStructureDoc, form, selectedProductStream, isThcCbdSpecialType]);
  
  React.useEffect(() => {
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

  const cannibinoidStreams: StreamKey[] = ['THC', 'CBD', 'Apparel', 'Smoking Gear', 'Sticker Promo Set'];

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
                        {cannibinoidStreams.map((stream) => { const { text, icon: IconComponent, color } = streamDisplayMapping[stream]; return ( <Button key={stream} type="button" variant={selectedProductStream === stream ? 'default' : 'outline'} className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedProductStream === stream && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleProductStreamSelect(stream as StreamKey)}> <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2", color)} /> <span className="text-lg sm:text-xl font-semibold">{text}</span> </Button> ); })}
                    </div>
                </FormItem>
            )}

            {isTraditionalMedicineStore && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Product Stream * </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                        {tradMedStreamOptions.map((stream) => (
                          <Button
                            key={stream.name}
                            type="button"
                            variant={selectedProductStream === stream.name ? 'default' : 'outline'}
                            className={cn("h-56 p-0 text-left flex flex-col w-full items-center justify-end space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md overflow-hidden relative group", selectedProductStream === stream.name && 'ring-2 ring-primary ring-offset-2')}
                            onClick={() => handleProductStreamSelect(stream.name)}
                          >
                            <Image
                              src={stream.imageUrl || `https://placehold.co/400x400.png?text=${encodeURIComponent(stream.name)}`}
                              alt={stream.name}
                              layout="fill"
                              objectFit="cover"
                              className="transition-transform duration-300 group-hover:scale-110"
                              data-ai-hint={`traditional medicine ${stream.name}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                            <span className="text-lg sm:text-xl font-semibold z-10 text-white p-2 text-center bg-black/50 w-full">{stream.name}</span>
                          </Button>
                        ))}
                    </div>
                </FormItem>
            )}

            {isMushroomStore && (
                 <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Mushroom Stream * </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                        {mushroomStreamOptions.map((stream) => {
                             const defaultImageUrl = `https://placehold.co/400x400.png?text=${encodeURIComponent(stream.name)}`;
                             return (
                                <Button
                                    key={stream.name}
                                    type="button"
                                    variant={selectedProductStream === stream.name ? 'default' : 'outline'}
                                    className={cn("h-40 p-0 text-left flex flex-col items-center justify-end space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md overflow-hidden relative group", selectedProductStream === stream.name && 'ring-2 ring-primary ring-offset-2')}
                                    onClick={() => handleProductStreamSelect(stream.name)}
                                >
                                    <Image
                                        src={stream.imageUrl || defaultImageUrl}
                                        alt={stream.name}
                                        fill
                                        sizes="(max-width: 640px) 90vw, 33vw"
                                        style={{objectFit: 'cover'}}
                                        className="transition-transform duration-300 group-hover:scale-110"
                                        data-ai-hint={`mushroom type ${stream.name}`}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                    <span className="text-lg sm:text-xl font-semibold z-10 text-white p-2 text-center bg-black/50 w-full">{stream.name}</span>
                                </Button>
                             );
                        })}
                    </div>
                </FormItem>
            )}
            
            <Separator className={cn("my-6", !selectedProductStream && 'hidden')} />
            
            {isTraditionalMedicineStore && selectedProductStream && (
                <div className="space-y-4">
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Product Type * </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                        {productTypeOptions.map((type, index) => (
                          <div key={`${type.name}-${index}`} className="animate-fade-in-scale-up" style={{animationDuration: '0.3s'}}>
                            <Button
                                type="button"
                                variant={selectedProductType?.name === type.name ? 'default' : 'outline'}
                                className={cn("h-56 p-0 text-left flex flex-col w-full items-center justify-end space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md overflow-hidden relative group", selectedProductType?.name === type.name && 'ring-2 ring-primary ring-offset-2')}
                                onClick={() => handleProductTypeSelect(type)}
                            >
                                <Image
                                src={type.imageUrl || `https://placehold.co/400x400.png?text=${encodeURIComponent(type.name)}`}
                                alt={type.name}
                                layout="fill"
                                objectFit="cover"
                                className="transition-transform duration-300 group-hover:scale-110"
                                data-ai-hint={`traditional medicine type ${type.name}`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                <span className="text-base font-semibold z-10 text-white p-2 text-center bg-black/50 w-full">{type.name}</span>
                            </Button>
                            
                            {selectedProductType?.name === type.name && subCategoryL2Options.length > 0 && (
                                <div className="mt-2 animate-accordion-down">
                                <FormField control={form.control} name="productSubCategory" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="sr-only">Sub-type for {type.name}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a Sub-type" /></SelectTrigger></FormControl>
                                            <SelectContent>{subCategoryL2Options.map((cat, index) => <SelectItem key={`${cat}-${index}`} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>
                                )} />
                                </div>
                            )}
                          </div>
                        ))}
                    </div>
                </div>
            )}


            {isMushroomStore && selectedProductStream && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>1. Select a Base Product (Optional)</h2>
                    {mushroomProducts.length > 0 ? (
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex space-x-4 p-4">
                                {mushroomProducts.map(prod => <MushroomProductCard key={prod.name} product={prod} onSelect={handleMushroomProductSelect} />)}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground">No pre-defined products found for this stream. Please add product details manually.</p>
                    )}
                     {selectedMushroomBaseProduct && (
                        <Card className="mt-4 border-primary/30 bg-muted/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Check className="h-6 w-6 text-green-500"/>
                                    Selected Base Product: {selectedMushroomBaseProduct.name}
                                </CardTitle>
                                <CardDescription>
                                    The following details have been auto-populated. You can adjust them below.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{selectedMushroomBaseProduct.description}</p>
                            </CardContent>
                        </Card>
                     )}
                </div>
            )}
            
            <Separator className={cn("my-6", !showProductDetailsForm && 'hidden')} />

            {showProductDetailsForm && (
                <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                    
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Details</h2>
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                    
                     {isThcCbdSpecialType && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="productType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Type *</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); form.setValue('productSubCategory', null); }} value={field.value || ''} disabled={productTypeOptions.length === 0}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a product type..." /></SelectTrigger></FormControl>
                                        <SelectContent>{productTypeOptions.map((opt, index) => <SelectItem key={`${opt.name}-${index}`} value={opt.name}>{opt.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        {subCategoryL2Options.length > 0 && (
                            <FormField control={form.control} name="productSubCategory" render={({ field }) => (
                                <FormItem><FormLabel>Product Sub Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-category" /></SelectTrigger></FormControl>
                                    <SelectContent>{subCategoryL2Options.map((cat, index) => <SelectItem key={`${cat}-${index}`} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )} />
                        )}
                        </div>
                    )}
                    
                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Pricing & Stock *</h2>
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

                    <h2 className="text-2xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Images & Tags</h2>
                     <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags placeholder="e.g., Organic, Sativa, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                    
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
