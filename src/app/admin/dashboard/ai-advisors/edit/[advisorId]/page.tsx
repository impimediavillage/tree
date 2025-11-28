'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Sparkles, Upload, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import Image from 'next/image';
import type { AIAdvisor } from '@/types';

const advisorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  shortDescription: z.string().min(10, 'Description must be at least 10 characters'),
  longDescription: z.string().min(20, 'Long description must be at least 20 characters'),
  iconName: z.string().min(1, 'Icon name is required'),
  systemPrompt: z.string().min(50, 'System prompt must be at least 50 characters'),
  isActive: z.boolean(),
  order: z.coerce.number().int().min(0, 'Order must be 0 or greater'),
  tier: z.enum(['basic', 'standard', 'premium']),
  creditCostBase: z.coerce.number().int().min(0, 'Base credit cost must be 0 or greater'),
  creditCostPerTokens: z.coerce.number().min(0, 'Credit cost per tokens must be 0 or greater'),
  model: z.enum(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']),
});

type AdvisorFormData = z.infer<typeof advisorSchema>;

export default function EditAdvisorPage() {
  const router = useRouter();
  const params = useParams();
  const advisorId = params?.advisorId as string;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const form = useForm<AdvisorFormData>({
    resolver: zodResolver(advisorSchema),
    defaultValues: {
      name: '',
      slug: '',
      shortDescription: '',
      longDescription: '',
      iconName: 'Brain',
      systemPrompt: '',
      isActive: true,
      order: 1,
      tier: 'basic',
      creditCostBase: 3,
      creditCostPerTokens: 0.0001,
      model: 'gpt-3.5-turbo',
    },
  });

  useEffect(() => {
    const fetchAdvisor = async () => {
      try {
        const advisorDoc = await getDoc(doc(db, 'aiAdvisors', advisorId));
        
        if (!advisorDoc.exists()) {
          toast({
            title: 'Error',
            description: 'Advisor not found',
            variant: 'destructive',
          });
          router.push('/admin/dashboard/ai-advisors');
          return;
        }

        const advisorData = advisorDoc.data() as AIAdvisor;
        
        // Normalize image URL - handle partial paths like "cbd1.png" by prepending /images/cbd/
        let normalizedImageUrl = advisorData.imageUrl || '';
        if (normalizedImageUrl && !normalizedImageUrl.startsWith('/') && !normalizedImageUrl.startsWith('http')) {
          // If it's just a filename, assume it's in the appropriate category folder
          // Extract category from advisor name or use a default
          const advisorName = advisorData.name.toLowerCase();
          let category = 'general';
          if (advisorName.includes('cbd') || advisorName.includes('cannabinoid')) category = 'cbd';
          else if (advisorName.includes('thc')) category = 'thc';
          else if (advisorName.includes('mushroom')) category = 'mushrooms';
          else if (advisorName.includes('flower') || advisorName.includes('homeopathy')) category = 'homeopathy';
          else if (advisorName.includes('aromatherapy')) category = 'aromatherapy';
          else if (advisorName.includes('traditional')) category = 'traditional-medicine';
          
          normalizedImageUrl = `/images/${category}/${normalizedImageUrl}`;
        }
        
        form.reset({
          name: advisorData.name,
          slug: advisorData.slug,
          shortDescription: advisorData.shortDescription,
          longDescription: advisorData.longDescription,
          iconName: advisorData.iconName,
          systemPrompt: advisorData.systemPrompt,
          isActive: advisorData.isActive,
          order: advisorData.order,
          tier: advisorData.tier,
          creditCostBase: advisorData.creditCostBase,
          creditCostPerTokens: advisorData.creditCostPerTokens,
          model: advisorData.model,
        });

        setCurrentImageUrl(normalizedImageUrl);
        setImagePreview(normalizedImageUrl);
        console.log('Loaded advisor image URL:', advisorData.imageUrl, '-> normalized:', normalizedImageUrl);
      } catch (error) {
        console.error('Error fetching advisor:', error);
        toast({
          title: 'Error',
          description: 'Failed to load advisor data',
          variant: 'destructive',
        });
        router.push('/admin/dashboard/ai-advisors');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvisor();
  }, [advisorId, form, router, toast]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Image must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(currentImageUrl);
    setUploadProgress(0);
  };

  const onSubmit = async (data: AdvisorFormData) => {
    setIsSubmitting(true);
    try {
      let imageSrc = currentImageUrl;

      // Upload new image if selected
      if (imageFile) {
        const imageRef = storageRef(storage, `advisors/${Date.now()}_${imageFile.name}`);
        const uploadTask = uploadBytesResumable(imageRef, imageFile);

        imageSrc = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error('Upload error:', error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });

        // Delete old image if it exists and was replaced
        if (currentImageUrl && currentImageUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const oldImageRef = storageRef(storage, currentImageUrl);
            await deleteObject(oldImageRef);
          } catch (error) {
            console.warn('Could not delete old image:', error);
          }
        }
      }

      // Update advisor document
      const advisorRef = doc(db, 'aiAdvisors', advisorId);
      await updateDoc(advisorRef, {
        ...data,
        imageUrl: imageSrc,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Advisor Updated',
        description: `${data.name} has been successfully updated.`,
      });

      router.push('/admin/dashboard/ai-advisors');
    } catch (error) {
      console.error('Error updating advisor:', error);
      toast({
        title: 'Error',
        description: 'Failed to update advisor. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const iconOptions = [
    'Sparkles', 'Brain', 'Leaf', 'Heart', 'Flower', 'Sun', 'Moon', 'Star',
    'Zap', 'Wind', 'Droplet', 'Flame', 'TreePine', 'Sprout', 'Activity',
    'Atom', 'Dna', 'Microscope', 'Beaker', 'Pill', 'Stethoscope', 'Eye',
    'Smile', 'Users', 'UserCheck', 'Waves', 'Mountain', 'Globe', 'Compass'
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/admin/dashboard/ai-advisors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to AI Advisors
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Edit AI Advisor
          </CardTitle>
          <CardDescription>
            Update the advisor settings and configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Cannabinoid Advisor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="cannabinoid-advisor" />
                      </FormControl>
                      <FormDescription>
                        URL-friendly identifier (lowercase, hyphens only)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shortDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Brief description shown on the card..." rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Long Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Detailed description shown on the advisor chat page..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Image</h3>
                
                <FormItem>
                  <FormLabel>Advisor Image</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <div className="relative w-full max-w-sm h-[300px] border rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={imagePreview}
                              alt="Preview"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageSelect}
                              className="hidden"
                              id="change-image"
                            />
                            <label htmlFor="change-image" className="flex-1">
                              <Button type="button" variant="outline" className="w-full" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  {imageFile ? 'Change New Image' : 'Replace Image'}
                                </span>
                              </Button>
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleRemoveImage}
                              className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4 mr-2" />
                              {imageFile ? 'Remove New' : 'Remove'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload">
                            <Button type="button" variant="outline" asChild>
                              <span>Select Image</span>
                            </Button>
                          </label>
                          <p className="text-sm text-muted-foreground mt-2">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                </FormItem>

                <FormField
                  control={form.control}
                  name="iconName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (Lucide)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Lucide React icon name for the advisor card</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* AI Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">AI Configuration</h3>
                
                <FormField
                  control={form.control}
                  name="systemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="You are an expert cannabinoid advisor..."
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormDescription>
                        Instructions that define the AI&apos;s behavior and expertise
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OpenAI Model</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest)</SelectItem>
                          <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Balanced)</SelectItem>
                          <SelectItem value="gpt-4">GPT-4 (Most Capable)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing & Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing & Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" />
                        </FormControl>
                        <FormDescription>Lower numbers appear first</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creditCostBase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Credit Cost</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" />
                        </FormControl>
                        <FormDescription>Fixed credits per interaction</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creditCostPerTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credits Per Token</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.0001" min="0" />
                        </FormControl>
                        <FormDescription>Variable cost based on usage</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Enable this advisor to display on homepage and accept interactions
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" size="lg" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Advisor...
                    </>
                  ) : (
                    'Update Advisor'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/admin/dashboard/ai-advisors')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
