"use client";

import { useState, useRef, useCallback } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, AlertCircle, Check } from "lucide-react";
import Image from "next/image";

interface ImageUploadFieldProps {
  label: string;
  value?: string; // Current image URL
  onChange: (url: string) => void;
  onRemove?: () => void;
  storagePath: string; // e.g., "apparel-items/{itemId}"
  maxSizeKB?: number; // Max file size in KB (default 100KB)
  maxDimensionPx?: number; // Max width/height in pixels (default 1000px)
  required?: boolean;
  helpText?: string;
  aspectRatio?: "square" | "free"; // Enforce square images
}

export function ImageUploadField({
  label,
  value,
  onChange,
  onRemove,
  storagePath,
  maxSizeKB = 100,
  maxDimensionPx = 1000,
  required = false,
  helpText = "Upload a square image (1000x1000px max, <100KB). Flat 2D product image recommended.",
  aspectRatio = "square",
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateImage = useCallback(
    (file: File): Promise<{ valid: boolean; error?: string }> => {
      return new Promise((resolve) => {
        // Check file type
        if (!file.type.startsWith("image/")) {
          resolve({ valid: false, error: "Please upload an image file (JPG, PNG, or WebP)" });
          return;
        }

        // Check file size
        const fileSizeKB = file.size / 1024;
        if (fileSizeKB > maxSizeKB) {
          resolve({
            valid: false,
            error: `Image size (${Math.round(fileSizeKB)}KB) exceeds ${maxSizeKB}KB limit. Please compress your image.`,
          });
          return;
        }

        // Check dimensions
        const img = new window.Image();
        img.onload = () => {
          if (img.width > maxDimensionPx || img.height > maxDimensionPx) {
            resolve({
              valid: false,
              error: `Image dimensions (${img.width}x${img.height}px) exceed ${maxDimensionPx}x${maxDimensionPx}px limit.`,
            });
            return;
          }

          if (aspectRatio === "square" && img.width !== img.height) {
            resolve({
              valid: false,
              error: `Image must be square. Current: ${img.width}x${img.height}px. Please crop to 1:1 aspect ratio.`,
            });
            return;
          }

          resolve({ valid: true });
        };
        img.onerror = () => {
          resolve({ valid: false, error: "Failed to load image" });
        };
        img.src = URL.createObjectURL(file);
      });
    },
    [aspectRatio, maxDimensionPx, maxSizeKB]
  );

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Validate image
      const validation = await validateImage(file);
      if (!validation.valid) {
        setError(validation.error || "Invalid image");
        toast({
          title: "Invalid Image",
          description: validation.error,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop();
      const fileName = `${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `${storagePath}/${fileName}`);

      // Upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload error:", error);
          setError("Upload failed. Please try again.");
          toast({
            title: "Upload Failed",
            description: error.message,
            variant: "destructive",
          });
          setUploading(false);
        },
        async () => {
          // Get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onChange(downloadURL);
          toast({
            title: "Upload Successful",
            description: "Image uploaded successfully",
          });
          setUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (error: any) {
      console.error("Upload error:", error);
      setError("Upload failed. Please try again.");
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Delete from storage if it's a Firebase Storage URL
      if (value.includes("firebasestorage.googleapis.com")) {
        const storageRef = ref(storage, value);
        await deleteObject(storageRef);
      }

      if (onRemove) {
        onRemove();
      } else {
        onChange("");
      }

      toast({
        title: "Image Removed",
        description: "Image deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-[#3D2E17]">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {value ? (
        // Show uploaded image with remove button
        <div className="relative group">
          <div className="relative w-full h-48 rounded-xl border-2 border-[#006B3E]/30 overflow-hidden bg-white/60">
            <Image
              src={value}
              alt={label}
              fill
              className="object-contain p-2"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
          <div className="flex items-center gap-2 mt-2 text-sm text-green-600 font-bold">
            <Check className="h-4 w-4" />
            Image uploaded successfully
          </div>
        </div>
      ) : (
        // Show upload zone
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragOver
              ? "border-[#006B3E] bg-[#006B3E]/10"
              : "border-[#006B3E]/30 bg-muted/50 hover:bg-[#006B3E]/5"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            {uploading ? (
              <>
                <Upload className="h-12 w-12 text-[#006B3E] animate-bounce" />
                <p className="font-bold text-[#3D2E17]">Uploading... {uploadProgress}%</p>
                <Progress value={uploadProgress} className="w-full max-w-xs" />
              </>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 text-[#006B3E]" />
                <div>
                  <p className="font-bold text-[#3D2E17] mb-1">
                    Drop image here or click to browse
                  </p>
                  <p className="text-sm text-[#5D4E37] font-bold">{helpText}</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-2">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 font-bold">{error}</p>
        </div>
      )}
    </div>
  );
}
