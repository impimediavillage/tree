
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDispensaryAdmin } from '@/contexts/DispensaryAdminContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { httpsCallable } from 'firebase/functions';
import { productSchema, type ProductFormData, type ProductAttribute } from '@/lib/schemas';
import type { Product as ProductType, Dispensary } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PackagePlus, ArrowLeft, Trash2, Leaf, Flame, Droplets, Microscope, Gift, Shirt, Sparkles, Check, ImageIcon as ImageIconLucide, Plus, Info, SkipForward, Brush, Palette, Home, Paintbrush, Users } from 'lucide-react';
import { MultiInputTags } from '@/components/ui/multi-input-tags';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MultiImageDropzone } from '@/components/ui/multi-image-dropzone';
import { SingleImageDropzone } from '@/components/ui/single-image-dropzone';
import { StrainFinder } from '@/components/dispensary-admin/StrainFinder';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { functions } from '@/lib/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown } from 'lucide-react';


const getCannabinoidProductCategoriesCallable = httpsCallable(functions, 'getCannabinoidProductCategories');


const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

const apparelGenders = ['Mens', 'Womens', 'Unisex'];
const apparelTypes = ['T-Shirt', 'Hoodie', 'Cap', 'Jacket', 'Pants', 'Footwear', 'Underwear', 'Shorts', 'Scarves', 'Socks', 'Jewelry', 'Other'];
const sizingSystemOptions = ['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other'];
const standardSizesData: Record<string, Record<string, string[]>> = {
  'Mens': { 'UK/SA': ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14'], 'US': ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13', '14', '15'], 'EURO': ['40', '40.5', '41', '41.5', '42', '42.5', '43', '43.5', '44', '44.5', '45', '46', '47'], 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] },
  'Womens': { 'UK/SA': ['3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '9', '10'], 'US': ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '11', '12'], 'EURO': ['35.5', '36', '36.5', '37.5', '38', '38.5', '39', '40', '40.5', '41', '42', '43'], 'Alpha (XS-XXXL)': ['XXS','XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
  'Unisex': { 'Alpha (XS-XXXL)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'] }
};


type ProductStream = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Art' | 'Furniture';

const tripleSImages = Array.from({ length: 36 }, (_, i) => `/images/2025-triple-s/t${i + 1}.jpg`);

export default function AddTHCProductPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { allDispensaries, isLoadingDispensaries } = useDispensaryAdmin();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(false);
  
  const [deliveryMethods, setDeliveryMethods] = useState<Record<string, any>>({});
  const [selectedProductStream, setSelectedProductStream] = useState<ProductStream | null>(null);

  const [zeroPercentEffects, setZeroPercentEffects] = useState<string[]>([]);
  const [zeroPercentMedical, setZeroPercentMedical] = useState<string[]>([]);
  
  const [files, setFiles] = useState<File[]>([]);
  const [labTestFile, setLabTestFile] = useState<File | null>(null);
  
  const [showOptInSection, setShowOptInSection] = useState(false);
  const [showStrainFinder, setShowStrainFinder] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [availableStandardSizes, setAvailableStandardSizes] = useState<string[]>([]);
  const [randomTripleSImage, setRandomTripleSImage] = useState<string>('');

  const optInSectionRef = useRef<HTMLDivElement>(null);
  const strainFinderRef = useRef<HTMLDivElement>(null);
  const productDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRandomTripleSImage(tripleSImages[Math.floor(Math.random() * tripleSImages.length)]!);
  }, []);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', category: '', subcategory: null,
      priceTiers: [{ unit: '', price: '' as any, quantityInStock: '' as any, description: '' }],
      poolPriceTiers: [],
      isAvailableForPool: false, tags: [],
      labTested: false, labTestReportUrl: null,
      currency: currentDispensary?.currency || 'ZAR',
      effects: [], flavors: [], medicalUses: [],
      stickerProgramOptIn: null,
      productType: '',
      gender: undefined, sizingSystem: undefined, sizes: [],
      growingMedium: undefined, feedingType: undefined,
      poolSharingRule: 'same_type',
      allowedPoolDispensaryIds: [],
    },
  });

  const { fields: priceTierFields, append: appendPriceTier, remove: removePriceTier } = useFieldArray({ control: form.control, name: "priceTiers" });
  const { fields: poolPriceTierFields, append: appendPoolPriceTier, remove: removePoolPriceTier } = useFieldArray({ control: form.control, name: "poolPriceTiers" });
  
  const watchIsAvailableForPool = form.watch('isAvailableForPool');
  const watchStickerOptIn = form.watch('stickerProgramOptIn');
  const watchCategory = form.watch('category');
  const watchSubcategory = form.watch('subcategory');
  const watchGender = form.watch('gender');
  const watchSizingSystem = form.watch('sizingSystem');
  const watchPoolSharingRule = form.watch('poolSharingRule');
  const watchAllowedPoolIds = form.watch('allowedPoolDispensaryIds');
  
  const fetchCannabinoidCategories = useCallback(async (stream: 'THC' | 'CBD') => {
      setIsLoadingInitialData(true);
      try {
          const result = await getCannabinoidProductCategoriesCallable({ stream });
          setDeliveryMethods(result.data as Record<string, any>);
      } catch (error) {
          console.error(`Error fetching categories for ${stream}:`, error);
          toast({ title: 'Error', description: 'Failed to load product categories.', variant: 'destructive' });
      } finally {
          setIsLoadingInitialData(false);
      }
  }, [toast]);
  
  const scrollToRef = (ref: React.RefObject<HTMLDivElement>, block: 'start' | 'center' = 'center') => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block });
  };

  const handleProductStreamSelect = (stream: ProductStream) => {
    form.reset({
      ...form.getValues(),
      name: '', description: '', category: '', subcategory: null,
      effects: [], flavors: [], medicalUses: [],
      thcContent: '', cbdContent: '', mostCommonTerpene: '',
      strain: '', strainType: '', homeGrow: [], feedingType: undefined,
      stickerProgramOptIn: null,
      productType: stream,
      gender: undefined, sizingSystem: undefined, sizes: [],
      growingMedium: undefined,
    });
    
    setShowCategorySelector(false);
    setZeroPercentEffects([]);
    setZeroPercentMedical([]);
    setSelectedProductStream(stream);

    if (stream === 'THC') {
        setShowOptInSection(true);
        setShowStrainFinder(false);
        setTimeout(() => scrollToRef(optInSectionRef), 100);
    } else if (stream === 'CBD') {
        setShowOptInSection(false);
        fetchCannabinoidCategories(stream);
        setShowStrainFinder(true);
        setTimeout(() => scrollToRef(strainFinderRef), 100);
    } else {
      setShowOptInSection(false);
      setShowStrainFinder(false);
      form.setValue('category', stream, { shouldValidate: true });
      setTimeout(() => scrollToRef(productDetailsRef, 'start'), 100);
    }
  };
  
  const handleStrainSelect = (strainData: any) => {
    form.setValue('name', strainData.name);
    form.setValue('strain', strainData.name);
    form.setValue('strainType', strainData.strainType);
    form.setValue('description', strainData.description);
    form.setValue('thcContent', strainData.thcContent);
    form.setValue('cbdContent', strainData.cbdContent);
    form.setValue('mostCommonTerpene', strainData.mostCommonTerpene);
    
    form.setValue('effects', strainData.effects);
    form.setValue('medicalUses', strainData.medicalUses);
    form.setValue('flavors', strainData.flavors);
    
    setZeroPercentEffects(strainData.zeroPercentEffects || []);
    setZeroPercentMedical(strainData.zeroPercentMedical || []);
    setShowCategorySelector(true); 

    toast({ title: "Strain Loaded", description: `${strainData.name} details have been filled in. Please select a product category.` });
  };

  const handleSkipStrainFinder = () => {
    setShowCategorySelector(true);
  }
  
  const handleCategorySelect = (categoryName: string) => {
      form.setValue('category', categoryName, { shouldValidate: true });
      form.setValue('subcategory', null);
  };
  
   const handleSubcategorySelect = () => {
    setTimeout(() => {
        scrollToRef(productDetailsRef, 'start');
    }, 100);
  };

  const getProductCollectionName = (type: string | undefined): string => {
      if (!type) return 'products'; 
      return 'cannibinoid_store_products';
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!currentDispensary || !currentUser || !currentDispensary.dispensaryType) {
      toast({ title: "Error", description: "Cannot submit without dispensary data and type.", variant: "destructive" });
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

        const totalStock = data.priceTiers.reduce((acc, tier) => acc + (Number(tier.quantityInStock) || 0), 0);
        
        const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value === undefined ? null : value])
        );

        const productData: Omit<ProductType, 'id'> = {
            ...(sanitizedData as ProductFormData),
            dispensaryId: currentUser.dispensaryId!,
            dispensaryName: currentDispensary.dispensaryName,
            dispensaryType: currentDispensary.dispensaryType,
            productOwnerEmail: currentUser.email,
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
            quantityInStock: totalStock,
            imageUrls: uploadedImageUrls,
            imageUrl: uploadedImageUrls[0] || null,
            labTestReportUrl: uploadedLabTestUrl,
        };
        
        const collectionName = getProductCollectionName(currentDispensary.dispensaryType);
        await addDoc(collection(db, collectionName), productData);

        toast({ title: "Success!", description: `Product "${data.name}" has been created.` });
        router.push('/dispensary-admin/products');
    } catch (error) {
        console.error("Error creating product:", error);
        toast({ title: "Creation Failed", description: "An error occurred while creating the product.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const productStreams: { key: ProductStream; title: string; imageUrl: string; }[] = [
    { key: 'THC', title: 'Cannibinoid (other)', imageUrl: '/images/cannibinoid-store/canna1.jpg' },
    { key: 'CBD', title: 'CBD', imageUrl: '/images/cannibinoid-store/cbd1.jpg' },
    { key: 'Apparel', title: 'Apparel', imageUrl: '/images/cannibinoid-store/apparel1.jpg' },
    { key: 'Smoking Gear', title: 'Smoking Gear', imageUrl: '/images/cannibinoid-store/gear1.jpg' },
    { key: 'Art', title: 'Art', imageUrl: '/images/cannibinoid-store/art1.jpg' },
    { key: 'Furniture', title: 'Furniture', imageUrl: '/images/cannibinoid-store/furn1.jpg' },
  ];

  const isCannabinoidStream = selectedProductStream === 'THC' || selectedProductStream === 'CBD';
  const showProductForm = (selectedProductStream && !isCannabinoidStream) || (isCannabinoidStream && showCategorySelector && watchCategory && watchSubcategory);
  
  const handleAddAttribute = (type: 'effects' | 'medicalUses', name: string) => {
    if (!name) return;
    const currentValues = form.getValues(type) || [];
    if (currentValues.some(item => item.name === name)) return;
    form.setValue(type, [...currentValues, { name, percentage: '1%' }]);
    
    if (type === 'effects') {
        setZeroPercentEffects(prev => prev.filter(item => item !== name));
    } else {
        setZeroPercentMedical(prev => prev.filter(item => item !== name));
    }
  };
  
  useEffect(() => {
    if (watchStickerOptIn === 'yes' || watchStickerOptIn === 'no') {
      setShowStrainFinder(true);
      fetchCannabinoidCategories('THC');
    } else {
      setShowStrainFinder(false);
      setShowCategorySelector(false); 
    }
  }, [watchStickerOptIn, fetchCannabinoidCategories]);
  
  useEffect(() => {
    if (watchGender && watchSizingSystem && standardSizesData[watchGender] && standardSizesData[watchGender][watchSizingSystem]) {
        setAvailableStandardSizes(standardSizesData[watchGender][watchSizingSystem]!);
    } else {
        setAvailableStandardSizes([]);
    }
  }, [watchGender, watchSizingSystem]);


  if (authLoading) {
    return ( <div className="max-w-4xl mx-auto my-8 p-6 space-y-6"> <div className="flex items-center justify-between"> <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-9 w-24" /> </div> <Skeleton className="h-8 w-1/2" /> <Card className="shadow-xl animate-pulse"> <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader> <CardContent className="p-6 space-y-6"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-24 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> <CardFooter><Skeleton className="h-12 w-full" /></CardFooter> </Card> </div> );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add a New Product</h1>
          <p className="text-muted-foreground mt-1">Select a product stream to begin.</p>
        </div>
        <Button variant="outline" asChild>
            <Link href="/dispensary-admin/products"><ArrowLeft className="mr-2 h-4 w-4" />Back to Products</Link>
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productStreams.map(stream => (
                  <Card 
                    key={stream.key} 
                    onClick={() => handleProductStreamSelect(stream.key)}
                    className={cn(
                        "overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow",
                        selectedProductStream === stream.key && "ring-2 ring-primary border-primary"
                    )}
                  >
                    <CardHeader className="p-0">
                      <div className="relative w-full">
                        <Image 
                            src={stream.imageUrl} 
                            alt={stream.title} 
                            width={768}
                            height={432}
                            layout="responsive"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </CardHeader>
                    <CardFooter className="p-3 bg-card/80 backdrop-blur-sm">
                        <p className="text-center font-semibold w-full text-foreground">{stream.title}</p>
                    </CardFooter>
                  </Card>
              ))}
          </div>
          
          <div ref={optInSectionRef}>
            {showOptInSection && (
              <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-orange-200 shadow-inner animate-fade-in-scale-up overflow-hidden">
                  <div className="relative w-full max-w-[768px] mx-auto">
                    {randomTripleSImage ? (
                        <Image
                            src={randomTripleSImage}
                            alt="The Triple S Club banner"
                            width={768}
                            height={432}
                            className="object-contain"
                            data-ai-hint="cannabis plants creative"
                        />
                    ) : (
                      <div className="w-full max-w-[768px] mx-auto aspect-[16/9] bg-muted animate-pulse"></div>
                    )}
                  </div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-orange-800">
                    <Gift className="text-yellow-500 fill-yellow-400" />The Triple S (Strain-Sticker-Sample) Club
                  </CardTitle>
                  <CardDescription className="text-orange-700/80 !mt-4 space-y-3 text-base">
                      <p>
                          The Wellness Tree fully complies with South African Law and prohibits the sale of THC products.
                      </p>
                      <p>
                          The Triple S Club is an opportunity for Home growers and fellow Cannabis enthusiasts to share their legal grow, by selling strain specific sticker designs promoting the strain and The Wellness tree attached to your product.
                      </p>
                      <p>
                          The public buys a UNIQUE sticker and recieves the sample amounts you create as a grower for FREE.
                          The sticker price is paid to You less our 25% per transaction. Payments are sent you to Your Payfast sub account
                          attached to our main Payfast account once the Leafblower driver has succesfully dropped off the sticker design confirmation and free sample package,
                          or the Store it self has confirmed succesful collection or drop off of the particular sticker and sample purchased.
                          We know that Your legal grow deserves to be shared and its always awesome to have a few different strains around the house, so get creating your products and let the Sticker design sales roll in.
                      </p>
                      <p>
                          Whats cool about the Triple S Club is each sticker is uniquely created with the help of Open AI&apos;s Dalle 3, and each sticker is truly unique.
                          We also have a dedicated already created Triple S Sticker card set for fellow ganga enthusiasts to enjoy.
                      </p>
                      <p>
                          The Promo Sticker set Programme is additional fun for You as the grower to create your own tshirts, cap, hoodie, sticker merchandise and promote your grow,
                          and of course the strains you love to grow.
                      </p>
                       <p>
                          Your create Sticker sets that fellow cannabis entusisasts can then purchase creating an additional revenue generation opportunity for your
                          Cannabinoid store.
                      </p>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="stickerProgramOptIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold text-gray-800">Participate in this programme?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="yes">Yes, include my product</SelectItem>
                            <SelectItem value="no">No, this is a standard product</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          <div ref={strainFinderRef}>
            {showStrainFinder && (
              <div className="animate-fade-in-scale-up">
                <StrainFinder onStrainSelect={handleStrainSelect} onSkip={handleSkipStrainFinder} />
              </div>
            )}
          </div>
          
          {showCategorySelector && (
              <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                  <Separator />
                  <h3 className="text-xl font-semibold border-b pb-2">Category Selection *</h3>
                  
                  {isLoadingInitialData ? <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(deliveryMethods).map(([categoryName, items]) => {
                          if (!Array.isArray(items)) return null;
                          const lastItem = items.length > 0 ? items[items.length - 1] : null;
                          const isLastItemImageMap = typeof lastItem === 'object' && lastItem !== null && lastItem.hasOwnProperty('imageUrl');
                          const imageUrl = isLastItemImageMap ? lastItem.imageUrl : null;
                          const subOptions = isLastItemImageMap ? items.slice(0, -1) : [...items];

                          return (
                              <div key={categoryName} className="flex flex-col gap-2">
                                  <Card 
                                      onClick={() => handleCategorySelect(categoryName)} 
                                      className={cn("cursor-pointer hover:border-primary flex-grow flex flex-col group overflow-hidden", watchCategory === categoryName && "border-primary ring-2 ring-primary")}
                                  >
                                    <CardHeader className="p-0">
                                      <div className="relative w-full">
                                        {imageUrl ? (
                                            <Image 
                                                src={imageUrl} 
                                                alt={categoryName} 
                                                width={768}
                                                height={432}
                                                layout="responsive"
                                                className="object-contain transition-transform group-hover:scale-105"
                                                data-ai-hint={`category ${categoryName}`} 
                                            />
                                        ) : (
                                            <div className="w-full aspect-video flex items-center justify-center bg-muted">
                                                <ImageIconLucide className="h-12 w-12 text-muted-foreground/30"/>
                                            </div>
                                        )}
                                      </div>
                                    </CardHeader>
                                      <CardContent className="p-3">
                                          <CardTitle className="text-center text-base">{categoryName}</CardTitle>
                                      </CardContent>
                                  </Card>
                                  {watchCategory === categoryName && Array.isArray(subOptions) && subOptions.length > 0 && (
                                      <FormField
                                          control={form.control}
                                          name="subcategory"
                                          render={({ field }) => (
                                          <FormItem>
                                              <Select onValueChange={(value) => { field.onChange(value); handleSubcategorySelect(); }} value={field.value ?? ''}>
                                                  <FormControl><SelectTrigger><SelectValue placeholder={`Select ${categoryName} type`} /></SelectTrigger></FormControl>
                                                  <SelectContent>{subOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                              </Select>
                                              <FormMessage />
                                          </FormItem>
                                      )} />
                                  )}
                              </div>
                          );
                      })}
                  </div>}
              </div>
          )}

          <div ref={productDetailsRef}>
            {showProductForm && (
                <div className="space-y-6 animate-fade-in-scale-up" style={{animationDuration: '0.4s'}}>
                    <Separator />
                    <h3 className="text-2xl font-bold border-b pb-2">Product Details</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-muted/50 p-3 rounded-md border">
                        <FormItem><FormLabel>Product Stream</FormLabel><Input value={form.getValues('productType') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                        <FormItem><FormLabel>Category</FormLabel><Input value={form.getValues('category')} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                        <FormItem><FormLabel>Subcategory</FormLabel><Input value={form.getValues('subcategory') || ''} disabled className="font-bold text-primary disabled:opacity-100 disabled:cursor-default" /></FormItem>
                      </div>

                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Product Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Product Description *</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                    
                    {selectedProductStream === 'Apparel' && (
                      <>
                        <Separator/>
                        <h3 className="text-xl font-semibold border-b pb-2">Apparel Details</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                              <FormField control={form.control} name="subcategory" render={({ field }) => ( <FormItem><FormLabel>Apparel Type *</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{apparelTypes.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                              <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent>{apparelGenders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                              <FormField control={form.control} name="sizingSystem" render={({ field }) => ( <FormItem><FormLabel>Sizing System</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select sizing system" /></SelectTrigger></FormControl><SelectContent>{sizingSystemOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                          </div>
                          <FormField control={form.control} name="sizes" render={({ field }) => ( <FormItem><FormLabel>Available Sizes</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="Add a size..." value={field.value || []} onChange={field.onChange} availableStandardSizes={availableStandardSizes} /></FormControl><FormMessage /></FormItem> )} />
                      </>
                    )}
                    {isCannabinoidStream && (
                      <>
                          <Separator/>
                          <h3 className="text-xl font-semibold border-b pb-2">Cannabinoid Details (Optional)</h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="thcContent" render={({ field }) => ( <FormItem><FormLabel>THC Content</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g., 22%" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="cbdContent" render={({ field }) => ( <FormItem><FormLabel>CBD Content</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g., <1%" /></FormControl><FormMessage /></FormItem> )} />
                          </div>
                          <FormField control={form.control} name="mostCommonTerpene" render={({ field }) => ( <FormItem><FormLabel>Most Common Terpene</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="e.g., Myrcene" /></FormControl><FormMessage /></FormItem> )} />
                      
                          <Separator/>
                          <h3 className="text-xl font-semibold border-b pb-2">Cultivation Details (Optional)</h3>
                          <div className="grid md:grid-cols-2 gap-4">
                              <FormField control={form.control} name="growingMedium" render={({ field }) => ( <FormItem><FormLabel>Growing Medium</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select growing medium" /></SelectTrigger></FormControl><SelectContent>{['Organic Soil', 'Hydroponic', 'Coco Coir', 'Aeroponic', 'Living Soil'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                              <FormField control={form.control} name="feedingType" render={({ field }) => ( <FormItem><FormLabel>Feeding Type</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select feeding type" /></SelectTrigger></FormControl><SelectContent>{['Organic feed in Pots', 'Organic feed Hydro', 'Chemical feed in Pots with flush', 'Chemical feed hydro with flush', 'Organic & Chemical in Pots Flushed', 'Organic & Chemical hydro Flushed'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                          </div>
                          <FormField control={form.control} name="homeGrow" render={({ field }) => ( <FormItem><FormLabel>Home Grow Conditions</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Indoor, Greenhouse" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />

                          <Separator />
                          <h3 className="text-xl font-semibold border-b pb-2">Effects & Flavors (Optional)</h3>
                          <div className="space-y-4">
                              <FormField control={form.control} name="effects" render={({ field }) => ( <FormItem><FormLabel>Effects</FormLabel><FormControl><MultiInputTags inputType="attribute" placeholder="e.g., Happy, Relaxed" value={field.value || []} onChange={field.onChange} /></FormControl><FormDescription>Tags you selected from the strain finder that have a 0% rating will appear below. Add them if they apply.</FormDescription><FormMessage /></FormItem> )} />
                              {zeroPercentEffects.length > 0 && <div className="flex flex-wrap gap-2 p-2 border-dashed border rounded-md">{zeroPercentEffects.map(name => <Button key={name} type="button" variant="outline" size="sm" onClick={() => handleAddAttribute('effects', name)}>{name} <Plus className="ml-1 h-3 w-3"/></Button>)}</div>}
                              <FormField control={form.control} name="medicalUses" render={({ field }) => ( <FormItem><FormLabel>Medical Uses</FormLabel><FormControl><MultiInputTags inputType="attribute" placeholder="e.g., Pain, Anxiety" value={field.value || []} onChange={field.onChange} /></FormControl><FormDescription>Tags you selected from the strain finder that have a 0% rating will appear below. Add them if they apply.</FormDescription><FormMessage /></FormItem> )} />
                              {zeroPercentMedical.length > 0 && <div className="flex flex-wrap gap-2 p-2 border-dashed border rounded-md">{zeroPercentMedical.map(name => <Button key={name} type="button" variant="outline" size="sm" onClick={() => handleAddAttribute('medicalUses', name)}>{name} <Plus className="ml-1 h-3 w-3"/></Button>)}</div>}
                              <FormField control={form.control} name="flavors" render={({ field }) => ( <FormItem><FormLabel>Flavors</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Pine, Citrus" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                          </div>
                          <Separator />
                          <h3 className="text-xl font-semibold border-b pb-2">Lab Testing (Optional)</h3>
                          <FormField control={form.control} name="labTested" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Lab Tested</FormLabel><FormDescription>Check this if you have a lab report for this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                          {form.watch('labTested') && (
                          <Card className="p-4 bg-muted/50"><CardContent className="p-0">
                              <FormField control={form.control} name="labTestReportUrl" render={({}) => ( <FormItem><FormLabel>Upload Lab Report</FormLabel><FormControl><SingleImageDropzone value={labTestFile} onChange={(file) => setLabTestFile(file)} /></FormControl><FormDescription>Upload a PDF or image of the lab test results.</FormDescription><FormMessage /></FormItem> )} />
                          </CardContent></Card>)}
                      </>
                    )}

                    <div className="space-y-6">
                        <Separator />
                        <h3 className="text-xl font-semibold border-b pb-2">Pricing, Stock & Pool Visibility</h3>
                        <div className="space-y-4">
                        {priceTierFields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-3 border rounded-md relative bg-muted/30">
                                <FormField control={form.control} name={`priceTiers.${index}.unit`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list="regular-units-list" /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.price`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Price ({currentDispensary?.currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={form.control} name={`priceTiers.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem className="md:col-span-1"><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
                                {priceTierFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendPriceTier({ unit: '', price: '' as any, quantityInStock: '' as any, description: '' })}>Add Price Tier</Button>
                        </div>
                        <FormField control={form.control} name="isAvailableForPool" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm"><div className="space-y-0.5"><FormLabel className="text-base">Available for Product Pool</FormLabel><FormDescription>Allow other stores of the same type to request this product.</FormDescription></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )} />
                        {watchIsAvailableForPool && (
                          <Card className="p-4 bg-muted/50 space-y-4">
                            <FormField control={form.control} name="poolSharingRule" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">Pool Sharing Rule *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'same_type'}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select how to share this product" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="same_type">Share with all dispensaries in my Wellness type</SelectItem>
                                            <SelectItem value="all_types">Share with all Wellness types</SelectItem>
                                            <SelectItem value="specific_stores">Share with specific stores only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            {watchPoolSharingRule === 'specific_stores' && (
                                <FormField control={form.control} name="allowedPoolDispensaryIds" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Select Specific Stores</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" className="w-full justify-between" disabled={isLoadingDispensaries}>
                                                    {watchAllowedPoolIds && watchAllowedPoolIds.length > 0 ? `${watchAllowedPoolIds.length} store(s) selected` : "Select stores..."}
                                                    {isLoadingDispensaries ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search for a store..." />
                                                    <CommandList>
                                                        <CommandEmpty>No stores found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {allDispensaries.map(dispensary => (
                                                                <CommandItem
                                                                    key={dispensary.id}
                                                                    value={dispensary.id}
                                                                    onSelect={(currentValue) => {
                                                                        const currentIds = field.value || [];
                                                                        const newIds = currentIds.includes(currentValue)
                                                                            ? currentIds.filter(id => id !== currentValue)
                                                                            : [...currentIds, currentValue];
                                                                        field.onChange(newIds);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", field.value?.includes(dispensary.id!) ? "opacity-100" : "opacity-0")} />
                                                                    {dispensary.dispensaryName}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <div className="flex flex-wrap gap-1 pt-2">
                                            {watchAllowedPoolIds?.map(id => {
                                                const dispensary = allDispensaries.find(d => d.id === id);
                                                return dispensary ? <Badge key={id} variant="secondary">{dispensary.dispensaryName}</Badge> : null;
                                            })}
                                        </div>
                                        <FormMessage/>
                                    </FormItem>
                                )}/>
                            )}

                            <CardHeader className="p-0 mb-2"><CardTitle className="text-lg">Pool Pricing Tiers *</CardTitle><CardDescription>Define pricing for bulk transfers to other stores.</CardDescription></CardHeader>
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
                        <Separator />
                        <h3 className="text-xl font-semibold border-b pb-2">Images & Tags</h3>
                        <FormField control={form.control} name="imageUrls" render={() => ( <FormItem><FormLabel>Product Images</FormLabel><FormControl><MultiImageDropzone value={files} onChange={(files) => setFiles(files)} /></FormControl><FormDescription>Upload up to 5 images. First image is the main one.</FormDescription><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="tags" render={({ field }) => ( <FormItem><FormLabel>Tags</FormLabel><FormControl><MultiInputTags inputType="string" placeholder="e.g., Organic, Potent" value={field.value || []} onChange={field.onChange} /></FormControl><FormMessage /></FormItem> )} />
                        <CardFooter className="p-0 pt-6">
                            <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackagePlus className="mr-2 h-5 w-5" />}
                                Add Product
                            </Button>
                        </CardFooter>
                    </div>
                </div>
            )}
          </div>
          <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
          <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
        </form>
      </Form>
    </div>
  );
}
