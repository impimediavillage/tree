
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import type { Product as ProductType, Dispensary, DispensaryTypeProductCategoriesDoc, ProductCategory, ProductAttribute } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Trash2, ImageIcon as ImageIconLucideSvg, AlertTriangle, PlusCircle, Shirt, Sparkles, Flame, Leaf as LeafIconLucide, Brush, Delete, Info, Search as SearchIcon, X } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';


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

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear';

const streamDisplayMapping: Record<string, { text: string; icon: React.ElementType; color: string }> = {
    'THC': { text: 'Cannibinoid (other)', icon: Flame, color: 'text-red-500' },
    'CBD': { text: 'CBD', icon: LeafIconLucide, color: 'text-green-500' },
    'Apparel': { text: 'Apparel', icon: Shirt, color: 'text-blue-500' },
    'Smoking Gear': { text: 'Accessories', icon: Sparkles, color: 'text-purple-500' }
};

const effectKeys = ["relaxed", "happy", "euphoric", "uplifted", "sleepy", "dry_mouth", "dry_eyes", "dizzy", "paranoid", "anxious", "hungry", "talkative", "creative", "energetic", "focus", "giggly", "aroused", "tingly"];
const medicalKeys = ["add/adhd", "alzheimer's", "anorexia", "anxiety", "arthritis", "bipolar_disorder", "cancer", "cramps", "crohn's_disease", "depression", "epilepsy", "eye_pressure", "fatigue", "fibromyalgia", "gastrointestinal_disorder", "glaucoma", "headaches", "hiv/aids", "hypertension", "inflammation", "insomnia", "migraines", "multiple_sclerosis", "muscle_spasms", "muscular_dystrophy", "nausea", "pain", "paranoid", "parkinson's", "phantom_limb_pain", "pms", "ptsd", "seizures", "spasticity", "spinal_cord_injury", "stress", "tinnitus", "tourette's_syndrome"];
const commonFlavors = [ "earthy", "sweet", "citrus", "pungent", "pine", "woody", "flowery", "spicy", "herbal", "pepper", "berry", "tropical", "lemon", "lime", "orange", "grape", "diesel", "chemical", "ammonia", "cheese", "skunk", "coffee", "nutty", "vanilla", "mint", "menthol", "blueberry", "mango", "strawberry", "pineapple", "lavender", "rose", "tar", "grapefruit", "apple", "apricot", "chestnut", "honey", "plum" ];

const badgeColors = [
    "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200", 
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200", 
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200", 
    "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200", 
    "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200", 
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200"
];

const medicalBadgeColors = [
    "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
    "bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-200",
    "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-200",
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
    "bg-stone-200 text-stone-800 dark:bg-stone-700/50 dark:text-stone-200"
];


const StrainInfoPreview: React.FC<{ strainData: any; onSelect: (data: any) => void }> = ({ strainData, onSelect }) => {
    if (!strainData) return null;
    const { name, type, description, thc_level, cbd_level, most_common_terpene } = strainData;
    
    const getAttributesWithBadges = (keys: string[], data: any, colors: string[]) => {
        const badges: React.ReactNode[] = [];
        let colorIndex = 0;
        for (const key of keys) {
            const rawValue = data[key];
            let numericValue: number | null = null;
            let displayValue: string | null = null;

            if (rawValue && typeof rawValue === 'string') {
                const parsed = parseFloat(rawValue.replace('%', ''));
                if (!isNaN(parsed) && parsed > 0) {
                    numericValue = parsed;
                    displayValue = rawValue;
                }
            } else if (typeof rawValue === 'number' && rawValue > 0) {
                numericValue = rawValue;
                displayValue = `${rawValue}%`;
            }

            if (numericValue !== null && displayValue !== null) {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                badges.push(
                    <Badge key={key} variant="secondary" className={cn("text-xs font-normal border-none", colors[colorIndex % colors.length])}>
                        {formattedKey} <span className="ml-1.5 font-semibold">{displayValue}</span>
                    </Badge>
                );
                colorIndex++;
            }
        }
        return badges;
    };

    const effectBadges = getAttributesWithBadges(effectKeys, strainData, badgeColors);
    const medicalBadges = getAttributesWithBadges(medicalKeys, strainData, medicalBadgeColors);

    return (
        <Card className="mt-4 bg-muted/30">
            <CardHeader>
                <CardTitle>Selected Strain: {name}</CardTitle>
                <CardDescription>Review the details below. This data will populate the form.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                {description && <div><strong>Description:</strong> {description}</div>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><strong>Type:</strong> <Badge variant="secondary" className="bg-blue-100 text-blue-700">{type}</Badge></div>
                    {thc_level && <div><strong>THC:</strong> <Badge variant="secondary" className="bg-green-100 text-green-700">{thc_level}</Badge></div>}
                    {cbd_level && <div><strong>CBD:</strong> <Badge variant="secondary" className="bg-sky-100 text-sky-700">{cbd_level}</Badge></div>}
                    {most_common_terpene && <div><strong>Top Terpene:</strong> <Badge variant="secondary" className="bg-purple-100 text-purple-700">{most_common_terpene}</Badge></div>}
                </div>
                <div className="p-2 mt-3 mb-2 rounded-md border border-dashed bg-background/50 text-xs">
                  <p className="font-semibold text-muted-foreground mb-1.5">Effect & Medical Use Key:</p>
                  <p className="text-muted-foreground leading-snug">Percentages indicate the reported likelihood of an effect or its potential as a medical aid.</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
                    <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
                    <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
                  </div>
                </div>
                {effectBadges.length > 0 && <div><strong>Effects:</strong><div className="flex flex-wrap gap-1 mt-1">{effectBadges}</div></div>}
                {medicalBadges.length > 0 && <div><strong>Potential Medical Uses:</strong><div className="flex flex-wrap gap-1 mt-1">{medicalBadges}</div></div>}
            </CardContent>
        </Card>
    );
};

const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
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

  const [files, setFiles] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);

  const [strainQuery, setStrainQuery] = useState('');
  const [strainSearchResults, setStrainSearchResults] = useState<any[]>([]);
  const [isFetchingStrain, setIsFetchingStrain] = useState(false);
  const [selectedStrainData, setSelectedStrainData] = useState<any | null>(null);

  const [showEffectsEditor, setShowEffectsEditor] = useState(false);
  const [showMedicalUsesEditor, setShowMedicalUsesEditor] = useState(false);
  
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  const [existingLabReportUrl, setExistingLabReportUrl] = useState<string | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
        priceTiers: [{ unit: '', price: undefined as any, quantityInStock: undefined as any, description: '' }], 
        poolPriceTiers: [],
        stickerProgramOptIn: null,
        labTested: false,
        labTestReportUrl: null,
    },
  });
  
  const { setError } = form;

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier, replace: replacePriceTiers } = useFieldArray({
    control: form.control,
    name: "priceTiers",
  });
  
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier, replace: replacePoolPriceTiers } = useFieldArray({
    control: form.control,
    name: "poolPriceTiers",
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
  const [showProductDetailsForm, setShowProductDetailsForm] = useState(false);

  const determineProductStream = (product: ProductType | null): StreamKey | null => {
    if (!product || !product.category) return null;
    if (product.category === 'THC' || product.category === 'CBD') return product.category;
    if (apparelTypes.includes(product.category)) return 'Apparel';
    if (product.category === 'Smoking Gear' || product.category === 'Accessories') return 'Smoking Gear';
    return null;
  };
  
  useEffect(() => {
    if (!isThcCbdSpecialType) {
        setShowProductDetailsForm(true);
        return;
    }

    if (selectedProductStream === 'THC') {
        setShowProductDetailsForm(watchedStickerProgramOptIn === 'yes');
    } else if (selectedProductStream) { // Any other stream is selected
        setShowProductDetailsForm(true);
    } else { // No stream is selected for the special type
        setShowProductDetailsForm(false);
    }
  }, [isThcCbdSpecialType, selectedProductStream, watchedStickerProgramOptIn]);

  const handleFetchStrainInfo = async () => {
    if (!strainQuery.trim()) return;
    setIsFetchingStrain(true);
    setStrainSearchResults([]);
    setSelectedStrainData(null);
    try {
        const processedQuery = toTitleCase(strainQuery.trim());
        const q = firestoreQuery(
            collection(db, 'my-seeded-collection'),
            where('name', '>=', processedQuery),
            where('name', '<=', processedQuery + '\uf8ff'),
            limit(10)
        );
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

  const getFormattedAttributes = useCallback((keys: string[], data: any): ProductAttribute[] => {
    const attributes: ProductAttribute[] = [];
    for (const key of keys) {
      const rawValue = data[key];
      let displayValue: string | null = null;
      if (!rawValue) continue;
  
      if (typeof rawValue === 'string') {
        const parsed = parseFloat(rawValue.replace('%', ''));
        if (!isNaN(parsed) && parsed > 0) {
          displayValue = rawValue.includes('%') ? rawValue : `${rawValue}%`;
        }
      } else if (typeof rawValue === 'number' && rawValue > 0) {
        displayValue = `${rawValue}%`;
      }
      
      if (displayValue !== null) {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        attributes.push({ name: formattedKey, percentage: displayValue });
      }
    }
    return attributes;
  }, []);

  useEffect(() => {
    if (!selectedStrainData) return;
    
    form.setValue('thcContent', selectedStrainData.thc_level || '', { shouldValidate: true });
    form.setValue('productType', selectedStrainData.type || '', { shouldValidate: true });
    form.setValue('mostCommonTerpene', selectedStrainData.most_common_terpene || '', { shouldValidate: true });
    form.setValue('description', selectedStrainData.description || form.getValues('description'), { shouldValidate: true });
    form.setValue('strain', selectedStrainData.name || '', { shouldValidate: true });
    
    replaceEffects(getFormattedAttributes(effectKeys, selectedStrainData));
    replaceMedicalUses(getFormattedAttributes(medicalKeys, selectedStrainData));
    
    // Explicitly clear flavors before setting new ones to prevent state glitches
    form.setValue('flavors', [], { shouldDirty: false });

    const descriptionText = (selectedStrainData.description || "").toLowerCase();
    const foundFlavors = commonFlavors.filter(flavor => 
      new RegExp(`\\b${flavor}\\b`, 'i').test(descriptionText)
    ).map(flavor => flavor.charAt(0).toUpperCase() + flavor.slice(1));
    
    // Use a timeout to ensure the state updates after the reset.
    setTimeout(() => {
        form.setValue('flavors', foundFlavors, { shouldValidate: true, shouldDirty: true });
    }, 0);
    
  }, [selectedStrainData, form, getFormattedAttributes, replaceEffects, replaceMedicalUses]);

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
        setStrainQuery(productData.strain || '');
        const initialStream = determineProductStream(productData);
        setSelectedProductStream(initialStream);

        form.reset({
          name: productData.name,
          description: productData.description,
          category: productData.category,
          subcategory: productData.subcategory || null,
          subSubcategory: productData.subSubcategory || null,
          productType: productData.productType || '',
          mostCommonTerpene: productData.mostCommonTerpene || '',
          strain: productData.strain || '',
          thcContent: productData.thcContent ?? '',
          cbdContent: productData.cbdContent ?? '',
          effects: productData.effects || [],
          flavors: productData.flavors || [],
          medicalUses: productData.medicalUses || [],
          gender: productData.gender || null,
          sizingSystem: productData.sizingSystem || null,
          sizes: productData.sizes || [],
          currency: productData.currency || (fetchedWellness ? fetchedWellness.currency : 'ZAR'),
          priceTiers: productData.priceTiers && productData.priceTiers.length > 0 ? productData.priceTiers : [{ unit: '', price: undefined as any, quantityInStock: undefined as any, description: '' }],
          poolPriceTiers: productData.poolPriceTiers || [],
          quantityInStock: productData.quantityInStock ?? undefined,
          imageUrls: productData.imageUrls || [],
          labTested: productData.labTested || false,
          labTestReportUrl: productData.labTestReportUrl || null,
          isAvailableForPool: productData.isAvailableForPool || false,
          tags: productData.tags || [],
          stickerProgramOptIn: productData.stickerProgramOptIn || null,
        });
        setExistingLabReportUrl(productData.labTestReportUrl || null);
        if (productData.priceTiers && productData.priceTiers.length > 0) {
            replacePriceTiers(productData.priceTiers);
        } else {
            replacePriceTiers([{ unit: '', price: undefined as any, quantityInStock: undefined as any, description: '' }]);
        }
        if (productData.poolPriceTiers && productData.poolPriceTiers.length > 0) {
            replacePoolPriceTiers(productData.poolPriceTiers);
        } else {
            replacePoolPriceTiers([]);
        }
        setExistingImageUrls(productData.imageUrls || []);
        
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
  }, [currentUser?.dispensaryId, productId, router, toast, form, replacePriceTiers, replacePoolPriceTiers]);


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
    }
  }, [selectedProductStream, watchedGender, watchedSizingSystem]);
  
  const handleProductStreamSelect = (stream: StreamKey) => { 
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

  const handleRemoveExistingImage = (index: number) => {
    const urlToRemove = existingImageUrls[index];
    if (urlToRemove) {
      setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
      setDeletedImageUrls(prev => [...prev, urlToRemove]);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentUser?.dispensaryId || !wellnessData || !existingProduct?.id) {
      toast({ title: "Error", description: "Critical data missing. Cannot update product.", variant: "destructive" });
      return;
    }
    if (!data.category || data.category.trim() === "") {
        toast({ title: "Category Required", description: "Please select or enter a main product category.", variant: "destructive"});
        setError("category", { type: "manual", message: "Category is required." }); 
        return;
    }

    if (data.labTested && !labTestFile && !existingLabReportUrl) {
        toast({ title: "Lab Report Required", description: "Please upload a lab test report image.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    let finalImageUrls = [...existingImageUrls];
    let finalLabReportUrl = existingLabReportUrl;

    if (files.length > 0) {
        const uploadPromises = files.map(file => {
            const filePath = `dispensary-products/${currentUser.dispensaryId}/${Date.now()}_${file.name}`;
            const fileStorageRef = storageRef(storage, filePath);
            const uploadTask = uploadBytesResumable(fileStorageRef, file);
            return new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed', null, reject,
                    async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
                );
            });
        });

        try {
            toast({ title: `Uploading ${files.length} new image(s)...`, variant: "default" });
            const newUploadedUrls = await Promise.all(uploadPromises);
            finalImageUrls.push(...newUploadedUrls);
            toast({ title: "Upload Complete!", variant: "default" });
        } catch (error) {
            console.error("Image upload failed:", error);
            toast({ title: "Image Upload Failed", variant: "destructive" });
            setIsLoading(false);
            return;
        }
    }

     if (deletedImageUrls.length > 0) {
        const deletePromises = deletedImageUrls.map(url => {
            if (url && url.startsWith('https://firebasestorage.googleapis.com')) {
                return deleteObject(storageRef(storage, url)).catch(e => {
                    if (e.code !== 'storage/object-not-found') console.warn(`Failed to delete old image: ${url}`, e);
                });
            }
            return Promise.resolve();
        });
        await Promise.all(deletePromises);
    }

    if (labTestFile) {
      try {
        toast({ title: "Uploading Lab Report...", variant: "default" });
        const filePath = `dispensary-products/${currentUser.dispensaryId}/lab-reports/${Date.now()}_${labTestFile.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileStorageRef, labTestFile);
        finalLabReportUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed', null, reject,
            async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
          );
        });
        // If a new report is uploaded, delete the old one if it exists
        if (existingLabReportUrl && existingLabReportUrl.startsWith('https://firebasestorage.googleapis.com')) {
          await deleteObject(storageRef(storage, existingLabReportUrl)).catch(e => console.warn("Old lab report delete failed:", e));
        }
      } catch (error) {
        console.error("Lab report upload failed:", error);
        toast({ title: "Lab Report Upload Failed", variant: "destructive" });
        setIsLoading(false);
        return;
      }
    } else if (!data.labTested && existingLabReportUrl) {
      // If checkbox is unchecked, delete the existing report
      try {
        await deleteObject(storageRef(storage, existingLabReportUrl));
        finalLabReportUrl = null;
      } catch (e: any) {
        if (e.code !== 'storage/object-not-found') console.warn("Old lab report delete failed:", e);
      }
    }
    
    try {
      const productDocRef = doc(db, "products", existingProduct.id);
      
      const totalStock = data.priceTiers.reduce((sum, tier) => sum + (Number(tier.quantityInStock) || 0), 0);
      
      const productUpdateData: Partial<ProductType> = {
          ...data,
          imageUrls: finalImageUrls,
          labTestReportUrl: data.labTested ? finalLabReportUrl : null,
          priceTiers: data.priceTiers.filter(tier => tier.unit && tier.price > 0),
          poolPriceTiers: data.isAvailableForPool ? (data.poolPriceTiers?.filter(tier => tier.unit && tier.price > 0) || []) : [],
          quantityInStock: totalStock,
          updatedAt: serverTimestamp() as any,
      };

      if (selectedProductStream !== 'THC' && selectedProductStream !== 'CBD') {
        productUpdateData.strain = null;
        productUpdateData.thcContent = null;
        productUpdateData.cbdContent = null;
        productUpdateData.effects = [];
        productUpdateData.flavors = [];
        productUpdateData.medicalUses = [];
        productUpdateData.stickerProgramOptIn = null;
        productUpdateData.productType = '';
        productUpdateData.mostCommonTerpene = '';
      }

      if (selectedProductStream !== 'Apparel') {
        productUpdateData.gender = null;
        productUpdateData.sizingSystem = null;
        productUpdateData.sizes = [];
      }

      if (selectedProductStream === 'Apparel' || selectedProductStream === 'Smoking Gear') {
          productUpdateData.subcategory = null;
          productUpdateData.subSubcategory = null;
      }

      if (!data.subcategory) productUpdateData.subcategory = null;
      if (!data.subSubcategory) productUpdateData.subSubcategory = null;

      await updateDoc(productDocRef, productUpdateData as { [x: string]: any });
      toast({ title: "Product Updated!", description: `${data.name} has been successfully updated.` });
      router.push('/dispensary-admin/products');
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update product. Please try again.", variant: "destructive" });
      console.error("Error updating product:", error);
    } finally { setIsLoading(false); }
  };
  
  if (authLoading || isLoadingInitialData) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <div className="space-y-4"> <Skeleton className="h-12 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-12 w-full" /> <Skeleton className="h-32 w-full" /> <Skeleton className="h-12 w-full" /> </div> </div> );
  }
  if (!wellnessData || !existingProduct) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> <p className="ml-2">Loading product data...</p></div>;
  }

  const watchedEffects = form.watch('effects');
  const watchedMedicalUses = form.watch('medicalUses');


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
                        {(Object.keys(streamDisplayMapping) as (keyof typeof streamDisplayMapping)[]).map((stream) => { 
                            const { text, icon: IconComponent, color } = streamDisplayMapping[stream];
                            return (
                                <Button
                                    key={stream}
                                    type="button"
                                    variant={selectedProductStream === stream ? 'default' : 'outline'}
                                    className={cn("h-auto p-4 sm:p-6 text-left flex flex-col items-center justify-center space-y-2 transform transition-all duration-200 hover:scale-105 shadow-md", selectedProductStream === stream && 'ring-2 ring-primary ring-offset-2')}
                                    onClick={() => handleProductStreamSelect(stream)}
                                    disabled 
                                >
                                    <IconComponent className={cn("h-10 w-10 sm:h-12 sm:w-12 mb-2", color)} />
                                    <span className="text-lg sm:text-xl font-semibold">{text}</span>
                                </Button>
                            );
                        })}
                    </div>
                    <FormDescription>Product stream cannot be changed after creation for this wellness type.</FormDescription>
                </FormItem>
            )}

            {showProductDetailsForm && selectedProductStream && (
            <div className="mt-6 pt-6 border-t">
                {(selectedProductStream === 'THC' || selectedProductStream === 'CBD') && (
                    <>
                       <Alert className="mb-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Strain Information</AlertTitle>
                          <AlertDescription>
                            Fetching strain info will autopopulate data where possible. If adding a new strain, leave the Strain Name field blank and enter the new name when prompted in the form below.
                          </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <FormLabel htmlFor="strain-search">Strain Name</FormLabel>
                            <div className="flex gap-2">
                                <Input id="strain-search" placeholder="e.g., Blue Dream" value={strainQuery} onChange={(e) => setStrainQuery(e.target.value)} />
                                <Button type="button" onClick={handleFetchStrainInfo} disabled={!strainQuery.trim() || isFetchingStrain} className="bg-green-500 hover:bg-green-600 text-white">
                                    {isFetchingStrain ? <Loader2 className="h-4 w-4 animate-spin"/> : <SearchIcon className="h-4 w-4"/>}
                                    <span className="ml-2">Fetch Strain Info</span>
                                </Button>
                            </div>
                            <FormDescription>Note: Search is case-sensitive and works best with full strain names.</FormDescription>
                        </div>

                        {strainSearchResults.length > 0 && (
                             <div className="space-y-2 mt-4">
                                <FormLabel>Search Results</FormLabel>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {strainSearchResults.map(result => (
                                        <Card key={result.id} className="overflow-hidden">
                                            <CardContent className="p-0">
                                                <div className="relative h-40 w-full bg-muted flex flex-col items-center justify-center">
                                                    {result.img_url && result.img_url !== 'none' ? (
                                                        <Image
                                                            src={result.img_url}
                                                            alt={result.name}
                                                            layout="fill"
                                                            objectFit="cover"
                                                            onError={(e) => { e.currentTarget.src = `https://placehold.co/400x400.png` }}
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-center">
                                                            <Image 
                                                                src="/icons/thc-cbd.png"
                                                                alt="No image available"
                                                                width={64}
                                                                height={64}
                                                                className="animate-pulse-slow"
                                                            />
                                                            <p className="text-xs text-slate-500 mt-2">No image found</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <Button className="w-full" type="button" variant="outline" onClick={() => setSelectedStrainData(result)}>
                                                        {result.name}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {selectedStrainData && <StrainInfoPreview strainData={selectedStrainData} onSelect={setSelectedStrainData} />}

                        <Separator className="my-6"/>

                         {selectedProductStream === 'THC' && (
                            <Card className="mb-6 p-4 border-amber-500 bg-amber-50/50 shadow-sm">
                                <CardHeader className="p-0 pb-2">
                                    <CardTitle className="text-md flex items-center text-amber-700"><Info className="h-5 w-5 mr-2"/>Important Notice if adding THC Products</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 text-sm text-amber-600 space-y-2">
                                    <p>The Wellness Tree complies with South African Law regarding the trade of THC products. We therefore cannot sell THC product directly, however we invite Wellness Owners to offer THC products as a <strong className="font-semibold">FREE gift</strong> accompanying the sale of our exclusive "The Wellness Tree" promo design range.</p>
                                </CardContent>
                                 <FormField
                                    control={form.control}
                                    name="stickerProgramOptIn"
                                    render={({ field }) => (
                                        <FormItem className="mt-4">
                                        <FormLabel className="text-md font-semibold text-amber-700">Participate in Wellness Tree Promo design initiative? *</FormLabel>
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
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="productType" render={({ field }) => ( <FormItem><FormLabel>Product Type</FormLabel><FormControl><Input placeholder="e.g., Sativa, Indica" {...field} value={field.value ?? ''} readOnly /></FormControl><FormDescription>Auto-populated from strain data.</FormDescription><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="mostCommonTerpene" render={({ field }) => ( <FormItem><FormLabel>Most Common Terpene</FormLabel><FormControl><Input placeholder="e.g., Myrcene" {...field} value={field.value ?? ''} readOnly /></FormControl><FormDescription>Auto-populated from strain data.</FormDescription><FormMessage /></FormItem> )} />
                        </div>

                        {deliveryMethodOptions.length > 0 && (
                        <FormField control={form.control} name="subcategory" render={({ field }) => (
                            <FormItem> <FormLabel>Product Type *</FormLabel>
                            <Select 
                                onValueChange={(value) => {
                                    field.onChange(value === "other" ? null : value);
                                    setSelectedDeliveryMethod(value === "other" ? null : value);
                                }} 
                                value={field.value ?? undefined}
                            >
                                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {deliveryMethodOptions.map((method) => ( <SelectItem key={method} value={method}>{method}</SelectItem> ))}
                                    <SelectItem value="other">Other</SelectItem>
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
                                    <SelectItem value="none">Other</SelectItem>
                                    {specificProductTypeOptions.map((type) => ( <SelectItem key={type} value={type}>{type}</SelectItem> ))}
                                </SelectContent>
                            </Select> <FormMessage />
                            </FormItem> )} />
                        )}
                         <FormField control={form.control} name="strain" render={({ field }) => ( <FormItem><FormLabel>Strain / Specific Type (if applicable)</FormLabel><FormControl><Input placeholder="e.g., Blue Dream, OG Kush" {...field} value={field.value ?? ''} disabled={!!selectedStrainData} /></FormControl><FormDescription>{selectedStrainData ? 'Strain name is auto-populated and locked.' : 'This can be the specific product type if not covered by subcategories.'}</FormDescription><FormMessage /></FormItem> )} />
                         <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC Content (%)</FormLabel><FormControl><Input type="text" placeholder="e.g., 22.5%" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                            {selectedProductStream === 'CBD' && (
                                <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD Content (%)</FormLabel><FormControl><Input type="text" placeholder="e.g., 0.8%" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                            )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="p-2 mt-1 mb-2 rounded-md border border-dashed bg-background/50 text-xs">
                            <p className="font-semibold text-muted-foreground mb-1.5">Effect & Medical Use Key:</p>
                            <p className="text-muted-foreground leading-snug">Percentages indicate the reported likelihood of an effect or its potential as a medical aid.</p>
                             <div className="flex flex-wrap gap-1.5 mt-2">
                                <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
                                <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
                                <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
                            </div>
                          </div>
                          <FormLabel>Effects</FormLabel>
                           <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20 min-h-[40px]">
                            {(watchedEffects || []).length === 0 ? ( <span className="text-xs text-muted-foreground">No effects listed.</span> ) : (
                               (watchedEffects || []).map((effect, index) => (
                                <Badge key={`effect-${index}`} variant="secondary" className={cn("group relative pr-5 text-xs font-normal border-none", badgeColors[index % badgeColors.length])}>
                                  {effect.name}: <span className="ml-1 font-semibold">{effect.percentage}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeEffect(index)}
                                    className="absolute top-1/2 -translate-y-1/2 right-1 rounded-full p-0.5 opacity-0 transition-opacity bg-black/20 text-white/70 hover:opacity-100 hover:text-white group-hover:opacity-100"
                                    aria-label={`Remove ${effect.name}`}
                                  >
                                      <X className="h-3 w-3"/>
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                          <Button type="button" size="sm" onClick={() => setShowEffectsEditor(!showEffectsEditor)} className="mt-2 text-xs bg-green-500 hover:bg-green-600 text-white">
                            {showEffectsEditor ? 'Hide Editor' : 'Edit Effects'}
                          </Button>
                          {showEffectsEditor && (
                            <div className="space-y-3 mt-2 p-3 border-l-2 border-primary/20">
                                <Button type="button" variant="outline" size="sm" className="mb-2" onClick={() => appendEffect({ name: '', percentage: '' })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Effect </Button>
                                {effectFields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                                  <div className="grid grid-cols-2 gap-x-4 flex-grow">
                                    <FormField control={form.control} name={`effects.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Effect Name</FormLabel> <FormControl><Input placeholder="e.g., Relaxed" {...field} /></FormControl> <FormMessage className="text-xs" /> </FormItem> )}/>
                                    <FormField control={form.control} name={`effects.${index}.percentage`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Percentage</FormLabel> <FormControl><Input placeholder="e.g., 55%" {...field} /></FormControl> <FormMessage className="text-xs" /> </FormItem> )}/>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEffect(index)} className="text-destructive hover:bg-destructive/10 mt-6 shrink-0 h-9 w-9"> <Trash2 className="h-4 w-4" /> </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Controller control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors (tags)</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add flavor (e.g., Earthy, Sweet, Citrus)" disabled={isLoading} /><FormMessage /></FormItem> )} />
                        
                        <div className="space-y-1">
                          <FormLabel>Medical Uses</FormLabel>
                          <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20 min-h-[40px]">
                            {(watchedMedicalUses || []).length === 0 ? ( <span className="text-xs text-muted-foreground">No medical uses listed.</span> ) : (
                               (watchedMedicalUses || []).map((use, index) => (
                                <Badge key={`medical-${index}`} variant="secondary" className={cn("group relative pr-5 text-xs font-normal border-none", medicalBadgeColors[index % medicalBadgeColors.length])}>
                                  {use.name}: <span className="ml-1 font-semibold">{use.percentage}</span>
                                  <button
                                      type="button"
                                      onClick={() => removeMedicalUse(index)}
                                      className="absolute top-1/2 -translate-y-1/2 right-1 rounded-full p-0.5 opacity-0 transition-opacity bg-black/20 text-white/70 hover:opacity-100 hover:text-white group-hover:opacity-100"
                                      aria-label={`Remove ${use.name}`}
                                  >
                                      <X className="h-3 w-3"/>
                                  </button>
                                </Badge>
                              ))
                            )}
                          </div>
                          <Button type="button" size="sm" onClick={() => setShowMedicalUsesEditor(!showMedicalUsesEditor)} className="mt-2 text-xs bg-green-500 hover:bg-green-600 text-white">
                            {showMedicalUsesEditor ? 'Hide Editor' : 'Edit Medical Uses'}
                          </Button>
                           {showMedicalUsesEditor && (
                            <div className="space-y-3 mt-2 p-3 border-l-2 border-primary/20">
                                <Button type="button" variant="outline" size="sm" className="mb-2" onClick={() => appendMedicalUse({ name: '', percentage: '' })}> <PlusCircle className="mr-2 h-4 w-4" /> Add Medical Use </Button>
                                {medicalUseFields.map((field, index) => (
                                <div key={field.id} className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                                  <div className="grid grid-cols-2 gap-x-4 flex-grow">
                                    <FormField control={form.control} name={`medicalUses.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Medical Use</FormLabel> <FormControl><Input placeholder="e.g., Pain" {...field} /></FormControl> <FormMessage className="text-xs" /> </FormItem> )}/>
                                    <FormField control={form.control} name={`medicalUses.${index}.percentage`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Percentage</FormLabel> <FormControl><Input placeholder="e.g., 40%" {...field} /></FormControl> <FormMessage className="text-xs" /> </FormItem> )}/>
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" onClick={() => removeMedicalUse(index)} className="text-destructive hover:bg-destructive/10 mt-6 shrink-0 h-9 w-9"> <Trash2 className="h-4 w-4" /> </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
                
                <Separator className="my-6" />
                
                <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm"> <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} disabled={isLoading} /></FormControl> <div className="space-y-1 leading-none"><FormLabel>Available for Product Sharing Pool</FormLabel><FormDescription>Allow other wellness entities of the same type to request this product from you.</FormDescription></div> </FormItem> )} />
                
                <div className="space-y-3 pt-2">
                    <h3 className="text-lg font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Pricing Tiers *</h3>
                    <FormDescription>Pricing for sample attached to design price.</FormDescription>
                     <div className="text-sm p-3 border border-yellow-300 bg-yellow-50/50 rounded-md space-y-1">
                        <p className="font-bold text-yellow-800">24% is added on each transaction as a commission to the Wellness Tree.</p>
                        <p className="text-xs text-yellow-700">
                           The commission amount is calculated from deducting the TAX amount you gave when creating your store, from your product price. We then add 24% commission. Your E store will show the prices you give with the 24% added. <strong className="uppercase">!!!Important. Please add your prices with TAX.</strong>
                        </p>
                    </div>
                    {priceTierFields.map((tierField, index) => (
                        <div key={tierField.id} className="space-y-2 items-start p-3 border rounded-md bg-muted/30">
                            <div className="flex items-start gap-2">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 flex-grow">
                                    <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field }) => ( <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>{regularUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field }) => ( <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field }) => ( <FormItem><FormLabel>Stock Qty</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                {priceTierFields.length > 1 && ( <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="text-destructive hover:bg-destructive/10 mt-6"><Trash2 className="h-5 w-5" /></Button> )}
                            </div>
                            {(form.watch(`priceTiers.${index}.unit`) === 'pack' || form.watch(`priceTiers.${index}.unit`) === 'box') && (
                                <FormField control={form.control} name={`priceTiers.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Pack/Box Description</FormLabel><FormControl><Input placeholder="e.g., Pack of 10 pre-rolls" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                            )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendPriceTier({ unit: '', price: undefined as any, quantityInStock: undefined as any, description: '' })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Price Tier</Button>
                    <FormMessage>{form.formState.errors.priceTiers?.root?.message || form.formState.errors.priceTiers?.message}</FormMessage>
                </div>
                
                {watchIsAvailableForPool && (
                   <div className="space-y-3 pt-4 mt-4 border-t">
                    <h3 className="text-lg font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Product Pool Sharing Pricing *</h3>
                    <FormDescription>Pricing for bulk design sharing with other wellness stores in the pool.</FormDescription>
                    <div className="text-sm p-3 border border-blue-300 bg-blue-50/50 rounded-md space-y-1">
                        <p className="font-bold text-blue-800">12% is added on each transaction as a commission to the Wellness Tree.</p>
                        <p className="text-xs text-blue-700">
                           The commission amount is calculated from deducting the TAX amount you gave when creating your store, from your product price. We then add 12% commission. Your Pricing Pool will show the prices you give with the 12% added. <strong className="uppercase">!!!Important. Please add your prices with TAX.</strong>
                        </p>
                    </div>
                    {poolPriceTierFields.map((tierField, index) => (
                        <div key={tierField.id} className="space-y-2 items-start p-3 border rounded-md shadow-sm bg-blue-50/30">
                            <div className="flex items-start gap-2">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 flex-grow">
                                    <FormField control={form.control} name={`poolPriceTiers.${index}.unit`} render={({ field }) => ( <FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select bulk unit" /></SelectTrigger></FormControl><SelectContent>{poolUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`poolPriceTiers.${index}.price`} render={({ field }) => ( <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name={`poolPriceTiers.${index}.quantityInStock`} render={({ field }) => ( <FormItem><FormLabel>Stock Qty</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                                {poolPriceTierFields.length > 1 && ( <Button type="button" variant="ghost" size="icon" onClick={() => removePoolPriceTier(index)} className="text-destructive hover:bg-destructive/10 mt-6"><Trash2 className="h-5 w-5" /></Button> )}
                            </div>
                            {(form.watch(`poolPriceTiers.${index}.unit`) === 'pack' || form.watch(`poolPriceTiers.${index}.unit`) === 'box') && (
                                <FormField control={form.control} name={`poolPriceTiers.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Pack/Box Description</FormLabel><FormControl><Input placeholder="e.g., Pack of 10 seeds, Box of 100g bags" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )}/>
                            )}
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => appendPoolPriceTier({ unit: '', price: undefined as any, description: '', quantityInStock: undefined as any })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Pool Price Tier</Button>
                    <FormMessage>{form.formState.errors.poolPriceTiers?.root?.message || form.formState.errors.poolPriceTiers?.message}</FormMessage>
                </div>
                )}
                
                <FormField control={form.control} name="currency" render={({ field }) => ( <FormItem><FormLabel>Currency *</FormLabel><FormControl><Input placeholder="ZAR" {...field} maxLength={3} readOnly disabled value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
                <Controller control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>General Tags</FormLabel><MultiInputTags value={field.value || []} onChange={field.onChange} placeholder="Add tag (e.g., Organic, Indoor, Popular)" disabled={isLoading} /><FormMessage /></FormItem> )} />
                <Separator />
                <FormField
                    control={form.control}
                    name="imageUrls"
                    render={() => (
                        <FormItem>
                            <FormLabel>Product Images *</FormLabel>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Existing Images</p>
                                {existingImageUrls.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                    {existingImageUrls.map((url, i) => (
                                        <div key={url} className="relative aspect-square w-full rounded-md shadow-lg">
                                        <Image src={url} alt={`Existing image ${i + 1}`} layout="fill" objectFit="cover" className="rounded-md" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={() => handleRemoveExistingImage(i)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        </div>
                                    ))}
                                    </div>
                                ) : <p className="text-xs text-muted-foreground">No existing images.</p>}
                            </div>

                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Add New Images</p>
                                <MultiImageDropzone
                                    value={files}
                                    onChange={setFiles}
                                    maxFiles={5 - existingImageUrls.length}
                                    maxSize={100 * 1024}
                                    disabled={isLoading || existingImageUrls.length >= 5}
                                />
                            </div>
                            <FormDescription>Upload up to 5 images (max 100KB each). Drag & drop or click to select.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Separator />
                 <FormField
                    control={form.control}
                    name="labTested"
                    render={({ field }) => (
                        <div className="space-y-4 rounded-md border p-4 shadow-sm">
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={!!field.value}
                                        onCheckedChange={field.onChange}
                                        disabled={isLoading}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Lab Tested</FormLabel>
                                    <FormDescription>
                                        Product has been independently lab tested.
                                    </FormDescription>
                                </div>
                            </FormItem>
                            {watchLabTested && (
                                <div className="pl-9 animate-fade-in-scale-up" style={{ animationDuration: '0.3s' }}>
                                    <FormItem>
                                        <FormLabel>Lab Test Report</FormLabel>
                                        {existingLabReportUrl && !labTestFile && (
                                            <div className="relative w-48 h-48 my-2">
                                                <Image src={existingLabReportUrl} alt="Existing lab report" layout="fill" objectFit="contain" className="rounded-md border p-1" />
                                                 <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => { setExistingLabReportUrl(null); form.setValue('labTestReportUrl', null, {shouldValidate: true});}}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        )}
                                        <FormControl>
                                            <SingleImageDropzone 
                                                value={labTestFile} 
                                                onChange={setLabTestFile} 
                                                maxSize={200 * 1024} // 200KB
                                            />
                                        </FormControl>
                                        <FormDescription>Upload an image of the lab test results (max 200KB). A new upload will replace the existing one.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                </div>
                            )}
                        </div>
                    )}
                />

            </div>
            )}
            {!isThcCbdSpecialType && (
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
             <CardFooter className="px-0 pt-8">
                <div className="flex gap-4 w-full">
                  {showProductDetailsForm && (
                      <Button type="submit" size="lg" className="flex-1 text-lg" 
                        disabled={isLoading || isLoadingInitialData || (isThcCbdSpecialType && !selectedProductStream) || (selectedProductStream === 'THC' && watchedStickerProgramOptIn !== 'yes')}
                      >
                          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Save Changes
                      </Button>
                  )}
                  <Link href="/dispensary-admin/products" passHref legacyBehavior>
                    <Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading || isLoadingInitialData}>
                      Cancel
                    </Button>
                  </Link>
                </div>
             </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

    