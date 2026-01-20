
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, Image as ImageIconLucideSvg, Trash2, ListPlus, ChevronRight, ChevronLeft, Sparkles, Brain, Zap } from 'lucide-react'; 
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import type { DispensaryType, AIAdvisor } from '@/types';
import { dispensaryTypeSchema, type DispensaryTypeFormData } from '@/lib/schemas';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import CategoryStructureBuilder from '@/components/admin/CategoryStructureBuilder';
import type { CategoryStructureMetadata } from '@/lib/categoryStructureAnalyzer';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface DispensaryTypeDialogProps {
  dispensaryType?: DispensaryType | null;
  onSave: () => void;
  children: React.ReactNode;
  isSuperAdmin: boolean;
}

export function DispensaryTypeDialog({
  dispensaryType,
  onSave,
  children,
  isSuperAdmin,
}: DispensaryTypeDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const isEditing = !!dispensaryType;

  const iconFileRef = React.useRef<HTMLInputElement>(null);
  const imageFileRef = React.useRef<HTMLInputElement>(null);

  const [selectedIconFile, setSelectedIconFile] = React.useState<File | null>(null);
  const [selectedImageFile, setSelectedImageFile] = React.useState<File | null>(null);
  const [iconUploadProgress, setIconUploadProgress] = React.useState<number | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = React.useState<number | null>(null);

  const [iconPreview, setIconPreview] = React.useState<string | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);

  const [availableAdvisors, setAvailableAdvisors] = React.useState<AIAdvisor[]>([]);
  const [isLoadingAdvisors, setIsLoadingAdvisors] = React.useState(false);

  // Category Structure State
  const [useGenericWorkflow, setUseGenericWorkflow] = React.useState(false);
  const [categoriesJSON, setCategoriesJSON] = React.useState<any>(null);
  const [categoryMetadata, setCategoryMetadata] = React.useState<CategoryStructureMetadata | null>(null);
  const [currentTab, setCurrentTab] = React.useState('basic');

  const form = useForm<DispensaryTypeFormData>({
    resolver: zodResolver(dispensaryTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      iconPath: null,
      image: null,
      advisorFocusPrompt: '',
      recommendedAdvisorIds: [],
    },
  });

  const fetchExistingCategoryStructure = async (typeName: string) => {
    try {
      const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
      const docRef = firestoreDoc(db, 'dispensaryTypeProductCategories', typeName);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.categoriesData) {
          setCategoriesJSON(data.categoriesData);
          console.log('Loaded existing category structure for', typeName);
        }
      }
    } catch (error) {
      console.error('Error fetching existing categories:', error);
    }
  };

  React.useEffect(() => {
    const fetchAdvisors = async () => {
      if (isOpen) {
        setIsLoadingAdvisors(true);
        try {
          const advisorsSnapshot = await getDocs(collection(db, 'aiAdvisors'));
          const advisorsData: AIAdvisor[] = advisorsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as AIAdvisor));
          setAvailableAdvisors(advisorsData);
        } catch (error) {
          console.error('Error fetching advisors:', error);
        } finally {
          setIsLoadingAdvisors(false);
        }
      }
    };
    fetchAdvisors();
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      if (isEditing && dispensaryType) {
        form.reset({
          name: dispensaryType.name || '',
          description: dispensaryType.description || '',
          iconPath: dispensaryType.iconPath === "" ? null : (dispensaryType.iconPath || null),
          image: dispensaryType.image === "" ? null : (dispensaryType.image || null),
          advisorFocusPrompt: dispensaryType.advisorFocusPrompt || '',
          recommendedAdvisorIds: dispensaryType.recommendedAdvisorIds || [],
        });
        setIconPreview(dispensaryType.iconPath || null);
        setImagePreview(dispensaryType.image || null);
        
        // Load existing workflow flag and category structure
        setUseGenericWorkflow(dispensaryType.useGenericWorkflow === true);
        
        // Fetch existing category structure if available
        if (dispensaryType.useGenericWorkflow) {
          fetchExistingCategoryStructure(dispensaryType.name);
        }
      } else {
        form.reset({
          name: '', description: '', iconPath: null, image: null, advisorFocusPrompt: '', recommendedAdvisorIds: [],
        });
        setIconPreview(null);
        setImagePreview(null);
      }
      setSelectedIconFile(null);
      setSelectedImageFile(null);
      setIconUploadProgress(null);
      setImageUploadProgress(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispensaryType, isOpen, isEditing]);


  const handleDialogTriggerClick = (e: React.MouseEvent) => {
    if (!isSuperAdmin && !isEditing) {
      e.preventDefault();
      const action = isEditing ? "edit" : "add new";
      toast({ title: "Permission Denied", description: `Only Super Admins can ${action} types.`, variant: "destructive" });
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'image') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'icon') {
          setSelectedIconFile(file);
          setIconPreview(reader.result as string);
          form.setValue('iconPath', null, { shouldValidate: true }); 
        } else {
          setSelectedImageFile(file);
          setImagePreview(reader.result as string);
          form.setValue('image', null, { shouldValidate: true }); 
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAsset = (type: 'icon' | 'image') => {
    if (type === 'icon') {
      setSelectedIconFile(null);
      setIconPreview(null);
      form.setValue('iconPath', null, { shouldValidate: true }); 
      if (iconFileRef.current) iconFileRef.current.value = "";
    } else {
      setSelectedImageFile(null);
      setImagePreview(null);
      form.setValue('image', null, { shouldValidate: true }); 
      if (imageFileRef.current) imageFileRef.current.value = "";
    }
  };

  const handleFileUpload = async (file: File, storagePath: string, progressSetter: (value: number | null) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileStorageRef = storageRef(storage, `${storagePath}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(fileStorageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          progressSetter(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          progressSetter(null);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          progressSetter(null); 
          resolve(downloadURL);
        }
      );
    });
  };

  const onSubmit = async (formData: DispensaryTypeFormData) => {
    if (!isSuperAdmin) {
        toast({ title: "Permission Denied", description: "Only Super Admins can save types.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);

    // formData.iconPath and formData.image will be string (URL), null, or undefined after Zod processing
    // Normalize undefined to null for Firestore and deletion logic
    let currentIconPath: string | null = formData.iconPath === undefined ? null : formData.iconPath;
    let currentImagePath: string | null = formData.image === undefined ? null : formData.image;
    
    const oldIconUrl = dispensaryType?.iconPath;
    const oldImageUrl = dispensaryType?.image;

    try {
      if (selectedIconFile) {
        toast({ title: "Uploading Icon...", description: selectedIconFile.name, variant: "default" });
        const uploadedUrl = await handleFileUpload(selectedIconFile, 'dispensary-type-assets/icons', setIconUploadProgress);
        if (oldIconUrl && oldIconUrl.startsWith('https://firebasestorage.googleapis.com')) {
            try { await deleteObject(storageRef(storage, oldIconUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old icon not found or delete failed:", e); }
        }
        currentIconPath = uploadedUrl; // This is now the URL to save
        toast({ title: "Icon Uploaded!", description: selectedIconFile.name, variant: "default" });
      } else if (currentIconPath === null && oldIconUrl && oldIconUrl.startsWith('https://firebasestorage.googleapis.com')) {
        // User explicitly removed the icon (currentIconPath is null) and there was an old one
        try { await deleteObject(storageRef(storage, oldIconUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old icon not found or delete failed:", e); }
      }
      // If currentIconPath is neither a new upload nor null (meaning it's an existing URL that wasn't cleared), it's kept as is.

      if (selectedImageFile) {
        toast({ title: "Uploading Image...", description: selectedImageFile.name, variant: "default" });
        const uploadedUrl = await handleFileUpload(selectedImageFile, 'dispensary-type-assets/images', setImageUploadProgress);
        if (oldImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
            try { await deleteObject(storageRef(storage, oldImageUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old image not found or delete failed:", e); }
        }
        currentImagePath = uploadedUrl; // This is now the URL to save
        toast({ title: "Image Uploaded!", description: selectedImageFile.name, variant: "default" });
      } else if (currentImagePath === null && oldImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        // User explicitly removed the image (currentImagePath is null) and there was an old one
        try { await deleteObject(storageRef(storage, oldImageUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old image not found or delete failed:", e); }
      }
      // If currentImagePath is neither a new upload nor null, it's kept.

      const dataToSave: Omit<DispensaryType, 'id' | 'createdAt' | 'updatedAt'> & {updatedAt: any} = {
        name: formData.name,
        description: formData.description || null,
        iconPath: currentIconPath, // Use the determined icon path
        image: currentImagePath,   // Use the determined image path
        advisorFocusPrompt: formData.advisorFocusPrompt || null,
        recommendedAdvisorIds: formData.recommendedAdvisorIds || [],
        useGenericWorkflow: useGenericWorkflow, // Add generic workflow flag
        categoryStructure: categoryMetadata || null, // FIXED: Firestore doesn't accept undefined
        updatedAt: serverTimestamp(),
      };

      let dispensaryTypeId: string | undefined = dispensaryType?.id;

      if (isEditing && dispensaryType?.id) {
        const typeDocRef = doc(db, 'dispensaryTypes', dispensaryType.id);
        await updateDoc(typeDocRef, dataToSave);
        toast({ title: 'Store Type Updated', description: `"${formData.name}" has been updated.` });
      } else {
        const newDocRef = await addDoc(collection(db, 'dispensaryTypes'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        dispensaryTypeId = newDocRef.id;
        toast({ title: 'Store Type Created', description: `"${formData.name}" has been added.` });
      }

      // If using generic workflow and has category structure, create/update the category document
      if (useGenericWorkflow && categoriesJSON) {
        try {
          const actionText = isEditing ? 'Updating' : 'Creating';
          toast({ title: `${actionText} Category Structure...`, description: 'Setting up product categories.' });
          
          const functions = getFunctions();
          const createCategoryFn = httpsCallable(functions, 'createCategoryFromTemplate');
          
          await createCategoryFn({
            dispensaryTypeName: formData.name,
            templateData: categoriesJSON
          });

          // Analyze the structure
          const analyzeFn = httpsCallable(functions, 'analyzeCategoryStructureAndUpdate');
          await analyzeFn({
            dispensaryTypeName: formData.name
          });

          toast({ 
            title: 'Category Structure Created!', 
            description: `Categories configured for "${formData.name}".` 
          });
        } catch (error: any) {
          console.error('Error creating category structure:', error);
          toast({
            title: 'Category Creation Warning',
            description: 'Store type created but category setup failed. You can configure it later.',
            variant: 'default'
          });
        }
      }

      onSave();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error saving wellness type:', error);
      toast({ title: 'Save Failed', description: error.message || 'Could not save store type.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setIconUploadProgress(null);
      setImageUploadProgress(null);
    }
  };
  
  const renderAssetPreview = (previewUrl: string | null, assetType: 'icon' | 'image') => {
    const displayUrl = previewUrl;
    const altText = `${assetType} preview`;
    const dataAiHint = `wellness type ${assetType}`;

    if (!displayUrl) {
      return <div className="w-20 h-20 rounded border bg-muted flex items-center justify-center"><ImageIconLucideSvg className="w-8 h-8 text-muted-foreground" /></div>;
    }
    return (
      <div className="w-20 h-20 rounded border p-1 relative bg-muted">
        <Image src={displayUrl} alt={altText} layout="fill" objectFit="contain" className="rounded" data-ai-hint={dataAiHint} />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={handleDialogTriggerClick}>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] flex flex-col p-0 gap-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-2 border-[#3D2E17]/10">
        {/* Animated Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#006B3E]/5 via-blue-500/5 to-purple-500/5 animate-pulse" />
          <DialogHeader className="relative px-6 pt-6 pb-4 border-b border-[#3D2E17]/10 backdrop-blur-sm">
            <DialogTitle className="text-2xl md:text-3xl font-black flex items-center gap-3 text-[#3D2E17] dark:text-white">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#006B3E] to-green-600 flex items-center justify-center shadow-lg">
                <ListPlus className="h-5 w-5 text-white" />
              </div>
              {isEditing ? 'Edit' : 'Create New'} Wellness Type
            </DialogTitle>
            <DialogDescription className="text-base text-[#3D2E17]/70 dark:text-slate-300 font-semibold">
              {isEditing ? 'Update the details for this wellness type.' : 'Configure a new wellness type with visual category builder ✨'}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Progress Indicator */}
        {!isEditing && useGenericWorkflow && (
          <div className="px-6 py-4 bg-muted/30 backdrop-blur-sm border-b border-[#3D2E17]/10">
            <div className="flex items-center justify-center gap-2">
              <div className={`flex items-center gap-2 transition-all duration-300 ${currentTab === 'basic' ? 'scale-110' : 'scale-90 opacity-50'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentTab === 'basic' ? 'bg-gradient-to-br from-[#006B3E] to-blue-600 text-white shadow-lg' : 'bg-muted/50 text-[#3D2E17]/40 dark:text-slate-500'}`}>
                  1
                </div>
                <span className="hidden sm:inline font-bold text-[#3D2E17] dark:text-white">Basic Info</span>
              </div>
              <div className="h-1 w-12 bg-gradient-to-r from-[#006B3E]/50 to-purple-500/50 rounded-full" />
              <div className={`flex items-center gap-2 transition-all duration-300 ${currentTab === 'categories' ? 'scale-110' : 'scale-90 opacity-50'}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentTab === 'categories' ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-muted/50 text-[#3D2E17]/40 dark:text-slate-500'}`}>
                  2
                </div>
                <span className="hidden sm:inline font-bold text-[#3D2E17] dark:text-white">Categories</span>
              </div>
            </div>
          </div>
        )}
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-grow flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-[#006B3E]/50 scrollbar-track-transparent">
            <TabsContent value="basic" className="mt-0 p-6 space-y-6 animate-in fade-in-0 duration-500">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Basic Details Card */}
                  <div className="group relative p-6 rounded-2xl bg-muted/50 backdrop-blur-md border-2 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#006B3E] to-blue-600 flex items-center justify-center shadow-lg">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-xl font-black text-[#3D2E17] dark:text-white">Basic Details</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-[#3D2E17] dark:text-white">Wellness Type Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., Ayurvedic Medicine" 
                                  {...field} 
                                  disabled={!isSuperAdmin || isSubmitting}
                                  className="bg-white/80 dark:bg-slate-800/80 border-[#3D2E17]/20 focus:border-[#006B3E] transition-all"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-[#3D2E17] dark:text-white">Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Brief description of this wellness type" 
                                  {...field} 
                                  value={field.value ?? ''} 
                                  disabled={!isSuperAdmin || isSubmitting}
                                  rows={3}
                                  className="bg-white/80 dark:bg-slate-800/80 border-[#3D2E17]/20 focus:border-[#006B3E] transition-all resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Integration Card */}
                  <div className="group relative p-6 rounded-2xl bg-muted/50 backdrop-blur-md border-2 border-green-500/20 hover:border-green-500/40 transition-all duration-300 shadow-lg hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#006B3E] to-green-600 flex items-center justify-center shadow-lg">
                          <Brain className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-xl font-black text-[#3D2E17] dark:text-white">AI Advisor Settings</h3>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="advisorFocusPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-bold text-[#3D2E17] dark:text-white">Advisor Focus Prompt</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g., 'Focus on holistic wellness and natural remedies...'"
                                {...field}
                                value={field.value ?? ''}
                                rows={3}
                                disabled={!isSuperAdmin || isSubmitting}
                                className="bg-white/80 dark:bg-slate-800/80 border-[#3D2E17]/20 focus:border-[#006B3E] transition-all resize-none"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-[#3D2E17]/60 font-medium">Guides the AI advisor's responses for this wellness type</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recommendedAdvisorIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-bold text-[#3D2E17] dark:text-white">Recommended AI Advisors</FormLabel>
                            <FormDescription className="text-xs mb-2 text-[#3D2E17]/60 font-medium">
                              Select advisors to recommend for this wellness type
                            </FormDescription>
                            {isLoadingAdvisors ? (
                              <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/30 border-2 border-[#006B3E]/20">
                                <Loader2 className="h-4 w-4 animate-spin text-[#006B3E]" />
                                <span className="text-sm text-[#3D2E17]/70 font-semibold">Loading advisors...</span>
                              </div>
                            ) : availableAdvisors.length === 0 ? (
                              <div className="p-4 rounded-xl bg-muted/30 border-2 border-dashed border-[#3D2E17]/20 text-sm text-[#3D2E17]/60 font-medium">
                                💡 No advisors available. Create some in the AI Advisors section first.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-xl bg-white/50 dark:bg-slate-800/30 border-2 border-[#006B3E]/20 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-[#006B3E]/50">
                                {availableAdvisors.map((advisor) => (
                                  <label
                                    key={advisor.id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border-2 border-[#3D2E17]/10 hover:border-[#006B3E]/30 cursor-pointer transition-all hover:shadow-md group"
                                  >
                                    <Checkbox
                                      checked={field.value?.includes(advisor.id!)}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentValue, advisor.id!]);
                                        } else {
                                          field.onChange(currentValue.filter((id) => id !== advisor.id));
                                        }
                                      }}
                                      disabled={!isSuperAdmin || isSubmitting}
                                      className="border-[#006B3E]/50"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-sm truncate text-[#3D2E17] dark:text-white group-hover:text-[#006B3E] transition-colors">
                                        {advisor.name}
                                      </div>
                                      <div className="text-xs text-[#006B3E] font-semibold">
                                        {advisor.tier}
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Generic Workflow Toggle Card */}
                  {isSuperAdmin && (
                    <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-500/30 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">✨</span>
                              <FormLabel className="text-lg font-black text-[#3D2E17] dark:text-white">Use Generic Workflow</FormLabel>
                              {isEditing && (
                                <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">LOCKED</span>
                              )}
                            </div>
                            <FormDescription className="text-[#3D2E17]/70 font-semibold">
                              {isEditing 
                                ? 'Workflow type cannot be changed after creation to prevent data inconsistencies'
                                : 'Enable visual drag-and-drop category builder with AI-powered structure detection'
                              }
                            </FormDescription>
                                </div>
                          <Switch
                            checked={useGenericWorkflow}
                            onCheckedChange={(checked) => {
                              if (!isEditing) {
                                setUseGenericWorkflow(checked);
                                if (checked) {
                                  setCurrentTab('categories');
                                }
                              }
                            }}
                            disabled={isEditing || isSubmitting}
                            className="data-[state=checked]:bg-purple-500"
                          />
                        </div>
                        {useGenericWorkflow && (
                          <div className="mt-4 p-3 bg-white/60 dark:bg-slate-800/30 rounded-lg border border-purple-300/30">
                            <p className="font-bold text-[#3D2E17] dark:text-white mb-2 flex items-center gap-2">
                              <span>🎮</span> This enables:
                            </p>
                            <ul className="space-y-2 ml-6">
                              <li className="text-sm text-[#3D2E17]/80 dark:text-slate-300 font-semibold flex items-start gap-2">
                                <span className="text-purple-500 mt-0.5">▶</span>
                                <span>Visual drag-and-drop category builder</span>
                              </li>
                              <li className="text-sm text-[#3D2E17]/80 dark:text-slate-300 font-semibold flex items-start gap-2">
                                <span className="text-purple-500 mt-0.5">▶</span>
                                <span>Automatic structure analysis & validation</span>
                              </li>
                              <li className="text-sm text-[#3D2E17]/80 dark:text-slate-300 font-semibold flex items-start gap-2">
                                <span className="text-purple-500 mt-0.5">▶</span>
                                <span>Dynamic product add/edit forms</span>
                              </li>
                            </ul>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentTab('categories')}
                              className="mt-3 w-full bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-[#3D2E17] dark:text-white font-bold"
                            >
                              Configure categories now <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}


                  {/* Visual Assets Card */}
                  <Card className="bg-muted/50 border-2 border-orange-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xl font-black text-[#3D2E17] dark:text-white flex items-center gap-2">
                        <span className="text-2xl">🎨</span> Visual Assets
                      </CardTitle>
                      <CardDescription className="text-[#3D2E17]/70 dark:text-slate-300 font-semibold">
                        Upload icon and banner image for your store type
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormItem>
                        <FormLabel className="text-[#3D2E17] dark:text-white font-bold">Store Icon</FormLabel>
                        <div className="flex items-center gap-4">
                  {renderAssetPreview(iconPreview, 'icon')}
                  {isSuperAdmin && (
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => iconFileRef.current?.click()} disabled={isSubmitting} className="border-[#3D2E17]/20 text-[#3D2E17] dark:text-white font-semibold hover:border-[#006B3E] hover:text-[#006B3E]">
                        <UploadCloud className="mr-2 h-4 w-4" /> {selectedIconFile ? "Change Icon" : (iconPreview ? "Replace Icon" : "Upload Icon")}
                      </Button>
                      <Input type="file" className="hidden" ref={iconFileRef} accept="image/png, image/svg+xml, image/jpeg, image/webp" onChange={(e) => handleFileSelect(e, 'icon')} />
                      {(iconPreview || selectedIconFile) && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAsset('icon')} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 font-semibold">
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Icon
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {iconUploadProgress !== null && <Progress value={iconUploadProgress} className="w-full h-2 mt-2" />}
                 <FormDescription className="text-[#3D2E17]/60 font-medium">Square SVG/PNG, transparent bg, &lt;1MB recommended.</FormDescription>
                 <FormField control={form.control} name="iconPath" render={() => <FormMessage>{form.formState.errors.iconPath?.message}</FormMessage>} />
              </FormItem>

              <FormItem>
                <FormLabel className="text-[#3D2E17] dark:text-white font-bold">Image (Banner)</FormLabel>
                 <div className="flex items-center gap-4">
                  {renderAssetPreview(imagePreview, 'image')}
                  {isSuperAdmin && (
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => imageFileRef.current?.click()} disabled={isSubmitting} className="border-[#3D2E17]/20 text-[#3D2E17] dark:text-white font-semibold hover:border-[#006B3E] hover:text-[#006B3E]">
                        <UploadCloud className="mr-2 h-4 w-4" /> {selectedImageFile ? "Change Image" : (imagePreview ? "Replace Image" : "Upload Image")}
                      </Button>
                      <Input type="file" className="hidden" ref={imageFileRef} accept="image/png, image/jpeg, image/webp, image/gif" onChange={(e) => handleFileSelect(e, 'image')} />
                      {(imagePreview || selectedImageFile) && (
                         <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAsset('image')} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 font-semibold">
                           <Trash2 className="mr-2 h-4 w-4" /> Remove Image
                         </Button>
                       )}
                    </div>
                  )}
                </div>
                        {imageUploadProgress !== null && <Progress value={imageUploadProgress} className="w-full h-2 mt-2" />}
                        <FormDescription className="text-[#3D2E17]/60 font-medium">Landscape format (e.g., 600x400px), &lt;2MB recommended.</FormDescription>
                        <FormField control={form.control} name="image" render={() => <FormMessage>{form.formState.errors.image?.message}</FormMessage>} />
                      </FormItem>
                    </CardContent>
                  </Card>

                </form>
              </Form>
            </TabsContent>

            {/* Category Structure Tab */}
            {useGenericWorkflow && (
              <TabsContent value="categories" className="mt-4">
                <CategoryStructureBuilder
                  initialJSON={categoriesJSON}
                  onStructureChange={(json, metadata) => {
                    setCategoriesJSON(json);
                    setCategoryMetadata(metadata);
                  }}
                />
              </TabsContent>
            )}
          </ScrollArea>

          {/* Footer Buttons */}
          {isSuperAdmin && (
            <DialogFooter className="border-t bg-muted/30 px-6 py-4 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)} 
                disabled={isSubmitting}
                className="font-bold text-[#3D2E17] dark:text-white"
              >
                Cancel
              </Button>
              {useGenericWorkflow && currentTab === 'basic' && (
                <Button
                  type="button"
                  onClick={() => setCurrentTab('categories')}
                  disabled={isSubmitting || !form.formState.isValid}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg"
                >
                  Next: Configure Categories <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              {useGenericWorkflow && currentTab === 'categories' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentTab('basic')}
                  disabled={isSubmitting}
                  className="font-bold text-[#3D2E17] dark:text-white"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back to Basic Info
                </Button>
              )}
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
                className="bg-[#006B3E] hover:bg-[#3D2E17] text-white font-bold shadow-lg transition-all duration-300"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? '💾 Save Changes' : '✨ Create Store Type'}
              </Button>
            </DialogFooter>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
