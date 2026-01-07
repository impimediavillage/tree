'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ImageUploadProps {
  label: string;
  description?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  storagePath: string; // e.g., 'dispensaries/[id]/store-images'
  maxSizeMB?: number;
  maxDimensions?: { width: number; height: number };
  aspectRatio?: string; // e.g., '1:1', '16:9'
  disabled?: boolean;
}

export function ImageUpload({
  label,
  description,
  value,
  onChange,
  storagePath,
  maxSizeMB = 5,
  maxDimensions,
  aspectRatio,
  disabled = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateImage = (file: File): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        resolve({ valid: false, error: 'File must be an image' });
        return;
      }

      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        resolve({ valid: false, error: `Image must be less than ${maxSizeMB}MB` });
        return;
      }

      // Check dimensions if specified
      if (maxDimensions) {
        const img = new window.Image();
        img.onload = () => {
          if (img.width > maxDimensions.width || img.height > maxDimensions.height) {
            resolve({ 
              valid: false, 
              error: `Image dimensions must be ${maxDimensions.width}x${maxDimensions.height} or smaller` 
            });
          } else {
            resolve({ valid: true });
          }
        };
        img.onerror = () => {
          resolve({ valid: false, error: 'Failed to load image' });
        };
        img.src = URL.createObjectURL(file);
      } else {
        resolve({ valid: true });
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image
    const validation = await validateImage(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid Image',
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      // Create storage reference with timestamp to ensure uniqueness
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storageRef = ref(storage, `${storagePath}/${fileName}`);

      // Upload file
      await uploadBytes(storageRef, file);

      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Update preview and call onChange
      setPreviewUrl(downloadUrl);
      onChange(downloadUrl);

      toast({
        title: 'Image Uploaded',
        description: 'Your image has been uploaded successfully.',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!previewUrl) return;

    try {
      // Try to delete from storage (may fail if user doesn't have permission, but that's okay)
      try {
        const storageRef = ref(storage, previewUrl);
        await deleteObject(storageRef);
      } catch (deleteError) {
        console.warn('Could not delete old image:', deleteError);
        // Continue anyway - the main goal is to remove the reference
      }

      setPreviewUrl(null);
      onChange(null);

      toast({
        title: 'Image Removed',
        description: 'Your image has been removed.',
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Remove Failed',
        description: 'Failed to remove image. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor={`image-upload-${storagePath}`} className="text-sm font-semibold">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {maxDimensions && (
          <p className="text-xs text-muted-foreground mt-1">
            Max dimensions: {maxDimensions.width}x{maxDimensions.height}px
          </p>
        )}
      </div>

      {previewUrl ? (
        <Card className="relative overflow-hidden">
          <div className={`relative ${aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'} w-full max-w-sm bg-muted`}>
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 384px"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            id={`image-upload-${storagePath}`}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </>
            )}
          </Button>
          <div className={`border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center ${aspectRatio === '1:1' ? 'aspect-square max-w-sm' : ''}`}>
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No image uploaded yet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
