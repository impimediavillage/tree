
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
      strain: null, thcContent: '', cbdContent: '', 
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
      thcContent: '',
      cbdContent: '',
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
    
    // Set category based on stream for special dispensary type
    if (isThcCbdSpecialType) {
      const streamCategoryMap: Record<StreamKey, string> = {
        'THC': 'THC',
        'CBD': 'CBD',
        'Apparel': 'Apparel',
        'Smoking Gear': 'Smoking Gear',
        'Sticker Promo Set': 'Sticker Promo Set',
      };
      form.setValue('category', streamCategoryMap[stream]);
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
        
        // Fetch category structure
        if (dispensaryData.dispensaryType) {
          const categoriesQuery = firestoreQuery(collection(db, 'dispensaryTypeProductCategories'), where('name', '==', dispensaryData.dispensaryType), limit(1));
          const querySnapshot = await getDocs(categoriesQuery);
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const categoriesDoc = docSnap.data() as DispensaryTypeProductCategoriesDoc;
            const categoriesData = categoriesDoc.categoriesData;
            if (Array.isArray(categoriesData)) {
              const categories = categoriesData as ProductCategory[];
              setCategoryStructureObject(categories.reduce((acc, cat) => ({ ...acc, [cat.name]: cat }), {}));
              setMainCategoryOptions(categories.map(c => c.name).sort());
            } else {
              console.warn("Categories data is not an array:", categoriesData);
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
  
   if (isLoadingInitialData) {
    return (
      <div className="max-w-4xl mx-auto my-8 p-6 space-y-6">
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-8 w-1/2" />
        <Card className="shadow-xl animate-pulse">
          <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-4 border bg-muted rounded-md space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="ml-4 pl-4 border-l space-y-3"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-8 w-1/4" /></div>
            </div>
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
          <CardFooter><Skeleton className="h-12 w-full" /></CardFooter>
        </Card>
      </div>
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
            
            {isThcCbdSpecialType && !selectedProductStream && (
                <FormItem>
                    <FormLabel className="text-xl font-semibold text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>
                        Select Product Stream *
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
                <>
                    {isThcCbdSpecialType && <Separator className="my-8" />}
                    <div className="space-y-6 animate-fade-in-scale-up">
                        {/* The rest of the form fields would be here... But are omitted for brevity. */}
                        <div className="flex gap-4 pt-4">
                            <Button type="submit" size="lg" className="flex-1 text-lg"
                            disabled={isLoading}
                            >
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                            Add Product
                            </Button>
                        </div>
                    </div>
                </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

