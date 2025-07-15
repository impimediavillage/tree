
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Loader2, PackagePlus, ArrowLeft, Trash2, Flame, Leaf as LeafIconLucide, Shirt, Sparkles, Search as SearchIcon, Palette, Brain, Info, X as XIcon, HelpCircle, Star, Gift, CornerDownLeft, BookOpen } from 'lucide-react';
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
const TRADITIONAL_MEDICINE_WELLNESS_TYPE_NAME = "Traditional Medicine dispensary";
const MUSHROOM_STORE_WELLNESS_TYPE_NAME = "Mushroom store";


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

const cannibinoidStreamDisplayMapping: Record<StreamKey, { text: string; icon: React.ElementType; color: string }> = {
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
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [wellnessData, setWellnessData] = useState<Dispensary | null>(null);
  
  const [isThcCbdSpecialType, setIsThcCbdSpecialType] = useState(false);
  const [isTraditionalMedicineType, setIsTraditionalMedicineType] = useState(false);
  const [isMushroomStoreType, setIsMushroomStoreType] = useState(false);

  const [categoryStructureDoc, setCategoryStructureDoc] = useState<DispensaryTypeProductCategoriesDoc | null>(null);
  
  const [selectedCannabinoidStream, setSelectedCannabinoidStream] = useState<StreamKey | null>(null);
  const [deliveryMethodOptions, setDeliveryMethodOptions] = useState<string[]>([]);
  const [productSubCategoryOptions, setProductSubCategoryOptions] = useState<string[]>([]);
  const [showTripleSOptIn, setShowTripleSOptIn] = useState(false);

  const [traditionalMedicineStreams, setTraditionalMedicineStreams] = useState<any[]>([]);
  const [selectedTradMedStream, setSelectedTradMedStream] = useState<string | null>(null);
  const [tradMedTypeOptions, setTradMedTypeOptions] = useState<string[]>([]);
  const [tradMedSubtypeOptions, setTradMedSubtypeOptions] = useState<string[]>([]);

  const [mushroomStreams, setMushroomStreams] = useState<any>({});
  const [selectedMushroomStream, setSelectedMushroomStream] = useState<string | null>(null);
  const [mushroomTypeOptions, setMushroomTypeOptions] = useState<string[]>([]);
  const [mushroomSubtypeOptions, setMushroomSubtypeOptions] = useState<string[]>([]);

  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);
  const [strainQuery, setStrainQuery] = useState('');
  const [strainSearchResults, setStrainSearchResults] = useState<any[]>([]);
  const [isFetchingStrain, setIsFetchingStrain] = useState(false);
  const [selectedStrainData, setSelectedStrainData] = useState<any | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  
  const effectKeys = ["relaxed", "happy", "euphoric", "uplifted", "sleepy", "dry_mouth", "dry_eyes", "dizzy", "paranoid", "anxious", "creative", "energetic", "focused", "giggly", "tingly", "aroused", "hungry", "talkative"];
  const medicalKeys = ["stress", "pain", "depression", "anxiety", "insomnia", "ptsd", "fatigue", "lack_of_appetite", "nausea", "headaches", "bipolar_disorder", "cancer", "cramps", "gastrointestinal_disorder", "inflammation", "muscle_spasms", "eye_pressure", "migraines", "asthma", "anorexia", "arthritis", "add/adhd", "muscular_dystrophy", "hypertension", "glaucoma", "pms", "seizures", "spasticity", "spinal_cord_injury", "fibromyalgia", "crohn's_disease", "phantom_limb_pain", "epilepsy", "multiple_sclerosis", "parkinson's", "tourette's_syndrome", "alzheimer's", "hiv/aids", "tinnitus"];
  const commonFlavors = [ "earthy", "sweet", "citrus", "pungent", "pine", "woody", "flowery", "spicy", "herbal", "pepper", "berry", "tropical", "lemon", "lime", "orange", "grape", "diesel", "chemical", "ammonia", "cheese", "skunk", "coffee", "nutty", "vanilla", "mint", "menthol", "blueberry", "mango", "strawberry", "pineapple", "lavender", "rose", "tar", "grapefruit", "apple", "apricot", "chestnut", "honey", "plum" ];

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', deliveryMethod: null, productSubCategory: null,
      productType: null, subSubcategory: null,
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
  const watchTradMedProductType = form.watch('productType');
  const watchMushroomProductType = form.watch('productType');


  const showProductDetailsForm = 
    (!isThcCbdSpecialType && !isTraditionalMedicineType && !isMushroomStoreType) ||
    (isThcCbdSpecialType && selectedCannabinoidStream && (selectedCannabinoidStream !== 'THC' || watchStickerProgramOptIn === 'yes')) || 
    (isTraditionalMedicineType && selectedTradMedStream) ||
    (isMushroomStoreType && selectedMushroomStream);

  const showStrainFetchUI = isThcCbdSpecialType && (selectedCannabinoidStream === 'THC' || selectedCannabinoidStream === 'CBD') && watchStickerProgramOptIn !== 'no';

  const resetProductStreamSpecificFields = () => {
    form.reset({
      ...form.getValues(),
      name: form.getValues('name'), description: form.getValues('description'), priceTiers: form.getValues('priceTiers'), poolPriceTiers: form.getValues('poolPriceTiers'), isAvailableForPool: form.getValues('isAvailableForPool'), tags: form.getValues('tags'),
      category: '', deliveryMethod: null, productSubCategory: null,
      productType: null, subSubcategory: null,
      mostCommonTerpene: '', strain: null, strainType: null, homeGrow: [], feedingType: null, thcContent: '0', cbdContent: '0', effects: [], flavors: [], medicalUses: [], gender: null, sizingSystem: null, sizes: [], stickerProgramOptIn: null, labTested: false, labTestReportUrl: null,
    });
    setLabTestFile(null); 
    setAvailableStandardSizes([]); 
    setSelectedStrainData(null); 
    setStrainQuery(''); 
    setStrainSearchResults([]);
    
    setSelectedCannabinoidStream(null);
    setDeliveryMethodOptions([]); 
    setProductSubCategoryOptions([]);
    setShowTripleSOptIn(false);

    setSelectedTradMedStream(null);
    setTradMedTypeOptions([]);
    setTradMedSubtypeOptions([]);

    setSelectedMushroomStream(null);
    setMushroomTypeOptions([]);
    setMushroomSubtypeOptions([]);
  };

  const handleCannabinoidStreamSelect = (stream: StreamKey) => {
    resetProductStreamSpecificFields();
    setSelectedCannabinoidStream(stream);
    form.setValue('category', stream);

    const deliveryMethodsMap = categoryStructureDoc?.categoriesData.thcCbdProductCategories?.[stream]?.['Delivery Methods'];
        
    if (deliveryMethodsMap && typeof deliveryMethodsMap === 'object' && !Array.isArray(deliveryMethodsMap)) {
        const options = Object.keys(deliveryMethodsMap).sort();
        setDeliveryMethodOptions(options);
    } else {
        setDeliveryMethodOptions([]);
        if (stream === 'THC' || stream === 'CBD') {
            toast({ title: "Config Warning", description: `Could not load types for ${stream}. Please check wellness type category configuration.`, variant: "destructive" });
        }
    }
    setShowTripleSOptIn(stream === 'THC');
  };
  
  const handleTradMedStreamSelect = (useCaseName: string) => {
    resetProductStreamSpecificFields();
    setSelectedTradMedStream(useCaseName);
    form.setValue('category', useCaseName);
    form.setValue('productType', null);
    form.setValue('subSubcategory', null);
    
    const selectedStreamData = traditionalMedicineStreams.find(s => s.useCase === useCaseName);
    if (selectedStreamData?.categories) {
      setTradMedTypeOptions(selectedStreamData.categories.map((c: any) => c.type).sort());
    } else {
      setTradMedTypeOptions([]);
    }
  };

  const handleMushroomStreamSelect = (streamName: string) => {
    resetProductStreamSpecificFields();
    setSelectedMushroomStream(streamName);
    form.setValue('category', streamName);
    form.setValue('productType', null);
    form.setValue('subSubcategory', null);
    
    if (mushroomStreams && mushroomStreams[streamName]) {
      const types = Object.keys(mushroomStreams[streamName]).sort();
      setMushroomTypeOptions(types);
    } else {
      setMushroomTypeOptions([]);
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
        
        const isCannabinoid = dispensaryData.dispensaryType === THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME;
        const isTradMed = dispensaryData.dispensaryType === TRADITIONAL_MEDICINE_WELLNESS_TYPE_NAME;
        const isMushroom = dispensaryData.dispensaryType === MUSHROOM_STORE_WELLNESS_TYPE_NAME;
        
        setIsThcCbdSpecialType(isCannabinoid);
        setIsTraditionalMedicineType(isTradMed);
        setIsMushroomStoreType(isMushroom);

        if (dispensaryData.dispensaryType) {
            const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', dispensaryData.dispensaryType);
            const docSnap = await getDoc(categoriesDocRef);
            if (docSnap.exists()) {
                const docData = docSnap.data() as DispensaryTypeProductCategoriesDoc;
                setCategoryStructureDoc(docData);

                if (isTradMed && Array.isArray(docData.categoriesData?.traditionalMedicineCategories?.traditionalMedicineCategories)) {
                  setTraditionalMedicineStreams(docData.categoriesData.traditionalMedicineCategories.traditionalMedicineCategories);
                }
                if (isMushroom && typeof docData.categoriesData?.mushroomProductCategories === 'object') {
                    setMushroomStreams(docData.categoriesData.mushroomProductCategories);
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

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  
  useEffect(() => {
    const gender = form.getValues('gender'); const system = form.getValues('sizingSystem');
    if (gender && system && standardSizesData[gender] && standardSizesData[gender][system]) { setAvailableStandardSizes(standardSizesData[gender][system]); } else { setAvailableStandardSizes([]); }
  }, [watchGender, watchSizingSystem, form]);

  useEffect(() => {
    if (watchDeliveryMethod && selectedCannabinoidStream) {
        const deliveryMethodsMap = categoryStructureDoc?.categoriesData.thcCbdProductCategories?.[selectedCannabinoidStream]?.['Delivery Methods'];
        const subcategories = deliveryMethodsMap?.[watchDeliveryMethod];
        setProductSubCategoryOptions(Array.isArray(subcategories) ? subcategories.sort() : []);
        form.setValue('productSubCategory', null);
    } else {
        setProductSubCategoryOptions([]);
    }
  }, [watchDeliveryMethod, categoryStructureDoc, form, selectedCannabinoidStream]);

  useEffect(() => {
    if (watchTradMedProductType && selectedTradMedStream) {
        const selectedStreamData = traditionalMedicineStreams.find(s => s.useCase === selectedTradMedStream);
        const selectedTypeData = selectedStreamData?.categories.find((c: any) => c.type === watchTradMedProductType);
        setTradMedSubtypeOptions(selectedTypeData?.subtypes?.sort() || []);
        form.setValue('subSubcategory', null);
    } else {
        setTradMedSubtypeOptions([]);
    }
  }, [watchTradMedProductType, selectedTradMedStream, traditionalMedicineStreams, form]);
  
  useEffect(() => {
    if(watchMushroomProductType && selectedMushroomStream && mushroomStreams) {
        const subtypes = mushroomStreams[selectedMushroomStream]?.[watchMushroomProductType];
        setMushroomSubtypeOptions(Array.isArray(subtypes) ? subtypes.sort() : []);
        form.setValue('subSubcategory', null);
    } else {
        setMushroomSubtypeOptions([]);
    }
  }, [watchMushroomProductType, selectedMushroomStream, mushroomStreams, form]);

  
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
            <Button variant="outline" size="sm" onClick={() => router.push('/dispensary-admin/products')}>
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
                        {(Object.keys(cannibinoidStreamDisplayMapping) as StreamKey[]).map((stream) => { const { text, icon: IconComponent, color } = cannibinoidStreamDisplayMapping[stream]; return ( <Button key={stream} type="button" variant={selectedCannabinoidStream === stream ? 'default' : 'outline'} className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedCannabinoidStream === stream && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleCannabinoidStreamSelect(stream)}> <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2", color)} /> <span className="text-lg sm:text-xl font-semibold">{text}</span> </Button> ); })}
                    </div>
                </FormItem>
            )}

            {isTraditionalMedicineType && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Product Stream * </FormLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                      {Array.isArray(traditionalMedicineStreams) && traditionalMedicineStreams.map((stream) => (
                        <Button key={stream.useCase} type="button" variant={selectedTradMedStream === stream.useCase ? 'default' : 'outline'} className={cn("h-auto p-4 text-left flex items-start gap-3 transform transition-all duration-200 hover:scale-105 shadow-md", selectedTradMedStream === stream.useCase && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleTradMedStreamSelect(stream.useCase)}> 
                          <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                          <div className="flex flex-col">
                            <span className="text-lg font-semibold">{stream.useCase}</span>
                            <span className="text-xs text-muted-foreground whitespace-normal">{stream.description}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                </FormItem>
            )}

            {isMushroomStoreType && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}> Select Mushroom Stream * </FormLabel>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                      {Object.keys(mushroomStreams).map((streamName) => (
                        <Button key={streamName} type="button" variant={selectedMushroomStream === streamName ? 'default' : 'outline'} className={cn("h-auto p-6 text-xl font-semibold transform transition-all duration-200 hover:scale-105 shadow-md", selectedMushroomStream === streamName && 'ring-2 ring-primary ring-offset-2')} onClick={() => handleMushroomStreamSelect(streamName)}>
                          <Brain className="mr-3 h-6 w-6"/> {streamName}
                        </Button>
                      ))}
                    </div>
                </FormItem>
            )}
             
            {showTripleSOptIn && (
                 <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-orange-800"><Star className="text-yellow-500 fill-yellow-400"/>The Triple S (Strain-Sticker-Sample) Club</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-4">
                            <FormField control={form.control} name="stickerProgramOptIn" render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel className="text-lg font-semibold text-gray-800">Do you want to participate in this programme for this product?</FormLabel>
                                 <FormDescription className="text-orange-900/90 text-sm">
                                    The Wellness Tree complies fully with South African law regarding the sale of T.H.C products. The Wellness Tree Strain Sticker Club offers Cannabis enthusiasts the opportunity to share their home grown flowers and extracts as samples to attach to Strain stickers that shoppers will buy. Its a great way to share the toke and strain you grow or want to add as a sample. The best part is the Sticker can represent your Wellness store or apparel brand name or strain name. Funky Funky Funky People. The Triple S (Strain-Sticker-Sample) club allows You to set your Sticker price and attach your product/s to the free sample of your garden delights, easily categorized by weight, by joint, by unit by, bottle, by pack. Happy sharing of your free samples, and i am totally excited to share the Please chnage the section Sticker Promo Programme text to the The Triple S (Strain-Sticker-Sample) club. Please add some modern ui styling to the section and add placeholders to add some promo images
                                </FormDescription>
                                <FormControl> <RadioGroup onValueChange={field.onChange} value={field.value ?? undefined} className="flex flex-col sm:flex-row gap-4 pt-2"> <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm"> <FormControl><RadioGroupItem value="yes" /></FormControl> <FormLabel className="font-normal text-lg text-green-700">Yes, include my product</FormLabel> </FormItem> <FormItem className="flex items-center space-x-3 space-y-0 p-3 rounded-md border border-input bg-background flex-1 shadow-sm"> <FormControl><RadioGroupItem value="no" /></FormControl> <FormLabel className="font-normal text-lg">No, this is a standard product</FormLabel> </FormItem> </RadioGroup> </FormControl> <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md"> <Image src="https://placehold.co/400x400.png" alt="Sticker promo placeholder" layout="fill" objectFit='cover' data-ai-hint="sticker design"/> </div>
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-md"> <Image src="https://placehold.co/400x400.png" alt="Apparel promo placeholder" layout="fill" objectFit='cover' data-ai-hint="apparel mockup"/> </div>
                         </div>
                    </CardContent>
                </Card>
            )}

            <Separator className={cn("my-6", !showProductDetailsForm && 'hidden')} />
            
            {showProductDetailsForm && (
                 <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                    {/* All form fields will be rendered here... */}
                 </div>
            )}
            
            <CardFooter>
              <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                <span>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                    Add Product
                </span>
              </Button>
            </CardFooter>
          </form>
        </Form>
        <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
         <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
      </CardContent>
    </Card>
  );
}
