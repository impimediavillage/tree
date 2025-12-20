'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileImage, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import type { CreatorDesign } from '@/types/creator-lab';

interface DirectImageUploadProps {
  onImageUploaded?: (design: CreatorDesign) => void;
}

export function DirectImageUpload({ onImageUploaded }: DirectImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDesign, setUploadedDesign] = useState<CreatorDesign | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Validation constants
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const RECOMMENDED_SIZE = 1000; // 1000x1000px recommended

  const validateImage = async (file: File): Promise<{ valid: boolean; message?: string }> => {
    // Check file type
    if (!ALLOWED_FORMATS.includes(file.type)) {
      return {
        valid: false,
        message: 'Please upload PNG, JPG, or WEBP format. PNG with transparent background is recommended.',
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        message: `File size must be under ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    // Check image dimensions
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 500 || img.height < 500) {
          resolve({
            valid: false,
            message: 'Image should be at least 500x500px. For best results, use 1000x1000px.',
          });
        } else {
          resolve({ valid: true });
        }
      };
      img.onerror = () => {
        resolve({ valid: false, message: 'Invalid image file' });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const processFile = async (file: File) => {
    const validation = await validateImage(file);
    
    if (!validation.valid) {
      toast({
        title: 'Invalid Image',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setUploadedDesign(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadedDesign(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `creator-uploads/${timestamp}-${selectedFile.name}`;
      const storageRef = ref(storage, filename);

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          toast({
            title: 'Upload Failed',
            description: 'Failed to upload image. Please try again.',
            variant: 'destructive',
          });
          setIsUploading(false);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Create design object matching DALL-E workflow
          const design: CreatorDesign = {
            id: `upload-${timestamp}`,
            imageUrl: downloadURL,
            prompt: `User uploaded image: ${selectedFile.name}`,
            revisedPrompt: 'Direct upload - no AI generation',
            createdAt: new Date(),
            userId: '', // Will be set by API
            status: 'completed',
          };

          setUploadedDesign(design);
          setIsUploading(false);
          setUploadProgress(100);

          toast({
            title: 'Upload Successful! ✨',
            description: 'Your design is ready to be placed on apparel.',
          });

          // Callback for parent component
          if (onImageUploaded) {
            onImageUploaded(design);
          }
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const handleNewUpload = () => {
    handleRemoveFile();
  };

  return (
    <Card className="border-[#5D4E37]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/20">
              <Upload className="h-10 w-10 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-extrabold text-[#3D2E17]">
                Upload Your Design
              </CardTitle>
              <CardDescription className="text-[#5D4E37] font-semibold">
                Upload your own image with transparent background
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!uploadedDesign ? (
          <>
            {!selectedFile ? (
              <>
                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                    transition-all duration-300 hover:scale-[1.01]
                    ${isDragging 
                      ? 'border-[#006B3E] bg-[#006B3E]/5 scale-[1.01]' 
                      : 'border-[#5D4E37]/30 hover:border-[#006B3E] hover:bg-[#006B3E]/5'
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <FileImage className="h-16 w-16 mx-auto mb-4 text-[#5D4E37]/50" />
                  <h3 className="text-lg font-bold text-[#3D2E17] mb-2">
                    Drag & drop your design here
                  </h3>
                  <p className="text-sm text-[#5D4E37] font-semibold mb-4">
                    or click to browse files
                  </p>
                  <div className="text-xs text-[#5D4E37] space-y-1">
                    <p>Supported formats: PNG, JPG, WEBP</p>
                    <p>Recommended: 1000x1000px with transparent background</p>
                    <p>Maximum file size: 5MB</p>
                  </div>
                </div>

                {/* Tips */}
                <Alert className="border-purple-600 bg-purple-50 dark:bg-purple-950/20">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-[#5D4E37] font-semibold text-sm">
                    <strong className="text-[#3D2E17]">Pro Tips:</strong> Use PNG format with transparent background for best results. 
                    Your image will be positioned on the apparel mockup just like AI-generated designs - you can reposition and scale it.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                {/* Image Preview */}
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden border-4 border-purple-600 shadow-lg bg-white dark:bg-slate-900">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    )}
                    {!isUploading && (
                      <button
                        onClick={handleRemoveFile}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        User Upload
                      </span>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="bg-[#5D4E37]/5 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#3D2E17]">File:</span>
                      <span className="text-sm text-[#5D4E37] font-semibold">{selectedFile.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#3D2E17]">Size:</span>
                      <span className="text-sm text-[#5D4E37] font-semibold">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-sm text-center text-[#5D4E37] font-semibold">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}

                  {/* Upload Button */}
                  {!isUploading && (
                    <Button
                      onClick={handleUpload}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Upload className="mr-2 h-5 w-5" />
                      Upload & Use This Design
                    </Button>
                  )}

                  {isUploading && (
                    <Button
                      disabled
                      className="w-full bg-purple-600 text-white font-bold py-6 text-lg"
                    >
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Uploading...
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border-4 border-purple-600 shadow-lg">
                <img
                  src={uploadedDesign.imageUrl}
                  alt="Uploaded design"
                  className="w-full h-auto"
                />
                <div className="absolute top-2 right-2">
                  <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ready
                  </span>
                </div>
              </div>

              {/* Success message */}
              <Alert className="border-[#006B3E] bg-[#006B3E]/5">
                <CheckCircle2 className="h-4 w-4 text-[#006B3E]" />
                <AlertDescription className="text-[#5D4E37] font-semibold">
                  <strong className="text-[#3D2E17]">Upload Successful!</strong> Your design is ready. 
                  It will behave exactly like an AI-generated design - you can position and scale it on the apparel mockup.
                </AlertDescription>
              </Alert>

              {/* New Upload button */}
              <Button
                onClick={handleNewUpload}
                variant="outline"
                className="w-full border-[#5D4E37] text-[#5D4E37] hover:bg-[#5D4E37] hover:text-white font-bold py-6 transition-all duration-300"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Another Design
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
