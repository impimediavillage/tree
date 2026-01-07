'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Check, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import type { SocialPlatform } from '@/types/social-share';
import { PLATFORM_CONFIGS } from '@/lib/social-share-config';

interface CustomShareImagesProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dispensaryId: string;
  currentImages: Partial<Record<SocialPlatform, string>>;
  onImagesUpdated: (images: Partial<Record<SocialPlatform, string>>) => void;
}

export function CustomShareImages({
  isOpen,
  onOpenChange,
  dispensaryId,
  currentImages,
  onImagesUpdated
}: CustomShareImagesProps) {
  const { toast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('facebook');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image under 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !preview) return;

    setUploading(true);

    try {
      // Upload to Firebase Storage
      const storageRef = ref(
        storage,
        `dispensaries/${dispensaryId}/share-images/${selectedPlatform}-${Date.now()}.jpg`
      );
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore
      const updatedImages = {
        ...currentImages,
        [selectedPlatform]: downloadURL
      };

      await updateDoc(doc(db, 'dispensaries', dispensaryId, 'shareConfig', 'settings'), {
        [`platformImages.${selectedPlatform}`]: downloadURL
      });

      onImagesUpdated(updatedImages);

      toast({
        title: '✨ Image Uploaded!',
        description: `Custom image set for ${PLATFORM_CONFIGS[selectedPlatform].name}`
      });

      // Reset
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Could not upload image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (platform: SocialPlatform) => {
    try {
      const updatedImages = { ...currentImages };
      delete updatedImages[platform];

      await updateDoc(doc(db, 'dispensaries', dispensaryId, 'shareConfig', 'settings'), {
        [`platformImages.${platform}`]: null
      });

      onImagesUpdated(updatedImages);

      toast({
        title: 'Image Removed',
        description: `Default image will be used for ${PLATFORM_CONFIGS[platform].name}`
      });
    } catch (error) {
      console.error('Remove failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-[#3D2E17] flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-[#006B3E]" />
            Custom Share Images
          </DialogTitle>
          <DialogDescription className="font-bold text-[#5D4E37]">
            Upload custom images for each platform to optimize engagement
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedPlatform} onValueChange={(val) => setSelectedPlatform(val as SocialPlatform)}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-5 w-full">
            {Object.entries(PLATFORM_CONFIGS).slice(0, 5).map(([key, config]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {config.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(PLATFORM_CONFIGS).map(([key, config]) => (
            <TabsContent key={key} value={key} className="space-y-4 mt-4">
              <Card className="bg-white border-2" style={{ borderColor: `${config.color}30` }}>
                <CardHeader>
                  <CardTitle className="text-lg font-black text-[#3D2E17]">
                    {config.name}
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    {config.ogImageSize 
                      ? `Recommended: ${config.ogImageSize.width}x${config.ogImageSize.height}px`
                      : 'Square format recommended (1:1 ratio)'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Image */}
                  {currentImages[key as SocialPlatform] && !preview && (
                    <div className="relative rounded-lg overflow-hidden border-2 border-border">
                      <Image
                        src={currentImages[key as SocialPlatform]!}
                        alt={`${config.name} share image`}
                        width={config.ogImageSize?.width || 1200}
                        height={config.ogImageSize?.height || 630}
                        className="w-full h-auto"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveImage(key as SocialPlatform)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Badge className="absolute bottom-2 left-2 bg-green-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  )}

                  {/* Preview */}
                  {preview && selectedPlatform === key && (
                    <div className="relative rounded-lg overflow-hidden border-2 border-[#006B3E]">
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-auto"
                      />
                      <Badge className="absolute top-2 left-2 bg-blue-500 text-white">
                        Preview
                      </Badge>
                    </div>
                  )}

                  {/* Upload Area */}
                  {!currentImages[key as SocialPlatform] && !preview && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 text-center cursor-pointer hover:border-[#006B3E] hover:bg-[#006B3E]/5 transition-colors"
                    >
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm font-bold text-[#3D2E17] mb-2">
                        Click to upload custom image
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG or WEBP • Max 5MB
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Actions */}
                  {preview && selectedPlatform === key && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="flex-1 bg-[#006B3E] hover:bg-[#3D2E17] text-white"
                      >
                        {uploading ? 'Uploading...' : 'Save Image'}
                      </Button>
                    </div>
                  )}

                  {currentImages[key as SocialPlatform] && !preview && (
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Image
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
