
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
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
import { Loader2, UploadCloud, Image as ImageIconLucideSvg, Trash2 } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import type { DispensaryType } from '@/types'; // ProductCategories are now in a separate collection
import { dispensaryTypeSchema, type DispensaryTypeFormData } from '@/lib/schemas'; // productCategories removed from this schema
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
// MultiInputTags for productCategories is REMOVED as this is now managed separately

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

  const form = useForm<DispensaryTypeFormData>({
    resolver: zodResolver(dispensaryTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      iconPath: null,
      image: null,
      advisorFocusPrompt: '',
      // productCategories: [], // REMOVED from default values
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (isEditing && dispensaryType) {
        form.reset({
          name: dispensaryType.name || '',
          description: dispensaryType.description || '',
          iconPath: dispensaryType.iconPath === "" ? null : (dispensaryType.iconPath || null),
          image: dispensaryType.image === "" ? null : (dispensaryType.image || null),
          advisorFocusPrompt: dispensaryType.advisorFocusPrompt || '',
          // productCategories: dispensaryType.productCategories || [], // REMOVED
        });
        setIconPreview(dispensaryType.iconPath || null);
        setImagePreview(dispensaryType.image || null);
      } else {
        form.reset({
          name: '', description: '', iconPath: null, image: null, advisorFocusPrompt: '', // productCategories: [], // REMOVED
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

    let newIconUrl: string | null = form.getValues('iconPath');
    let newImageUrl: string | null = form.getValues('image');
    const oldIconUrl = dispensaryType?.iconPath;
    const oldImageUrl = dispensaryType?.image;

    try {
      if (selectedIconFile) {
        toast({ title: "Uploading Icon...", description: selectedIconFile.name, variant: "default" });
        const uploadedUrl = await handleFileUpload(selectedIconFile, 'dispensary-type-assets/icons', setIconUploadProgress);
        if (oldIconUrl && oldIconUrl.startsWith('https://firebasestorage.googleapis.com')) {
            try { await deleteObject(storageRef(storage, oldIconUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old icon not found or delete failed:", e); }
        }
        newIconUrl = uploadedUrl;
        toast({ title: "Icon Uploaded!", description: selectedIconFile.name, variant: "default" });
      } else if (formData.iconPath === null && oldIconUrl && oldIconUrl.startsWith('https://firebasestorage.googleapis.com')) {
        try { await deleteObject(storageRef(storage, oldIconUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old icon not found or delete failed:", e); }
        newIconUrl = null; 
      }

      if (selectedImageFile) {
        toast({ title: "Uploading Image...", description: selectedImageFile.name, variant: "default" });
        const uploadedUrl = await handleFileUpload(selectedImageFile, 'dispensary-type-assets/images', setImageUploadProgress);
        if (oldImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
            try { await deleteObject(storageRef(storage, oldImageUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old image not found or delete failed:", e); }
        }
        newImageUrl = uploadedUrl;
        toast({ title: "Image Uploaded!", description: selectedImageFile.name, variant: "default" });
      } else if (formData.image === null && oldImageUrl && oldImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        try { await deleteObject(storageRef(storage, oldImageUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.warn("Old image not found or delete failed:", e); }
        newImageUrl = null; 
      }

      // productCategories is no longer part of DispensaryType, so it's removed from dataToSave
      const dataToSave: Omit<DispensaryType, 'id' | 'createdAt' | 'updatedAt'> & {updatedAt: any} = {
        name: formData.name,
        description: formData.description || null,
        iconPath: newIconUrl,
        image: newImageUrl,
        advisorFocusPrompt: formData.advisorFocusPrompt || null,
        updatedAt: serverTimestamp(),
      };

      if (isEditing && dispensaryType?.id) {
        const typeDocRef = doc(db, 'dispensaryTypes', dispensaryType.id);
        await updateDoc(typeDocRef, dataToSave);
        toast({ title: 'Dispensary Type Updated', description: `"${formData.name}" has been updated.` });
      } else {
        await addDoc(collection(db, 'dispensaryTypes'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Dispensary Type Created', description: `"${formData.name}" has been added.` });
      }
      onSave();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error saving dispensary type:', error);
      toast({ title: 'Save Failed', description: error.message || 'Could not save dispensary type.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setIconUploadProgress(null);
      setImageUploadProgress(null);
    }
  };
  
  const renderAssetPreview = (previewUrl: string | null, assetType: 'icon' | 'image') => {
    const displayUrl = previewUrl;
    const altText = `${assetType} preview`;
    const dataAiHint = `dispensary type ${assetType}`;

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{isEditing ? 'Edit' : 'Add New'} Dispensary Type</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this dispensary type.' : 'Enter the details for the new dispensary type.'}
            {!isSuperAdmin && isEditing ? ' (Viewing details)' : ''}
            {!isSuperAdmin && !isEditing ? ' (Requires Super Admin)' : ''}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto px-6 pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent scrollbar-thumb-rounded-full">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., THC - CBD - Mushrooms" {...field} disabled={!isSuperAdmin || isSubmitting} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Briefly describe this dispensary type" {...field} value={field.value ?? ''} disabled={!isSuperAdmin || isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="advisorFocusPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advisor Focus Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Focus on medical applications...' or 'Provide gentle advice...'"
                        {...field}
                        value={field.value ?? ''}
                        rows={3}
                        disabled={!isSuperAdmin || isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>Guides the AI advisor for this type. (Optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product Categories Management REMOVED from here */}
              {/* It will be managed in a separate UI for the 'dispensaryTypeProductCategories' collection */}
              {isSuperAdmin && (
                <div className="p-3 border-t border-b border-dashed my-4 text-sm text-muted-foreground">
                    <ListPlus className="inline h-4 w-4 mr-1.5" />
                    Product categories and subcategories for this Dispensary Type are now managed in a dedicated section (coming soon) or directly in Firestore under the <code className="bg-muted px-1 py-0.5 rounded text-xs">dispensaryTypeProductCategories</code> collection with a document ID matching this type&apos;s name.
                </div>
              )}


              <FormItem>
                <FormLabel>Icon</FormLabel>
                <div className="flex items-center gap-4">
                  {renderAssetPreview(iconPreview, 'icon')}
                  {isSuperAdmin && (
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => iconFileRef.current?.click()} disabled={isSubmitting}>
                        <UploadCloud className="mr-2 h-4 w-4" /> {selectedIconFile ? "Change Icon" : (iconPreview ? "Replace Icon" : "Upload Icon")}
                      </Button>
                      <Input type="file" className="hidden" ref={iconFileRef} accept="image/png, image/svg+xml, image/jpeg, image/webp" onChange={(e) => handleFileSelect(e, 'icon')} />
                      {(iconPreview || selectedIconFile) && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAsset('icon')} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" /> Remove Icon
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {iconUploadProgress !== null && <Progress value={iconUploadProgress} className="w-full h-2 mt-2" />}
                 <FormDescription>Square SVG/PNG, transparent bg, &lt;1MB recommended.</FormDescription>
                 <FormField control={form.control} name="iconPath" render={() => <FormMessage>{form.formState.errors.iconPath?.message}</FormMessage>} />
              </FormItem>

              <FormItem>
                <FormLabel>Image (Banner)</FormLabel>
                 <div className="flex items-center gap-4">
                  {renderAssetPreview(imagePreview, 'image')}
                  {isSuperAdmin && (
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => imageFileRef.current?.click()} disabled={isSubmitting}>
                        <UploadCloud className="mr-2 h-4 w-4" /> {selectedImageFile ? "Change Image" : (imagePreview ? "Replace Image" : "Upload Image")}
                      </Button>
                      <Input type="file" className="hidden" ref={imageFileRef} accept="image/png, image/jpeg, image/webp, image/gif" onChange={(e) => handleFileSelect(e, 'image')} />
                      {(imagePreview || selectedImageFile) && (
                         <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAsset('image')} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10">
                           <Trash2 className="mr-2 h-4 w-4" /> Remove Image
                         </Button>
                       )}
                    </div>
                  )}
                </div>
                {imageUploadProgress !== null && <Progress value={imageUploadProgress} className="w-full h-2 mt-2" />}
                <FormDescription>Landscape (e.g., 600x400px), &lt;2MB recommended.</FormDescription>
                <FormField control={form.control} name="image" render={() => <FormMessage>{form.formState.errors.image?.message}</FormMessage>} />
              </FormItem>

              {isSuperAdmin && (
                <div className="pt-4">
                  <DialogFooter className="bg-transparent sticky bottom-0 py-4 px-6 border-t -mx-6">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? 'Save Changes' : 'Create Type'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

    