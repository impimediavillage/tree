
'use client';

import { UploadCloud, X } from 'lucide-react';
import * as React from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { twMerge } from 'tailwind-merge';
import Image from 'next/image';
import { Button } from './button';

const variants = {
  base: 'relative rounded-md flex justify-center items-center flex-col cursor-pointer min-h-[150px] min-w-[200px] border-2 border-dashed border-muted-foreground/30 text-center hover:bg-muted/50 transition-colors',
  image: 'border-0 p-0 min-h-0 min-w-0 relative shadow-md bg-slate-200 dark:bg-slate-900 rounded-md',
  active: 'border-2 border-primary',
  disabled: 'bg-gray-200 border-gray-300 cursor-not-allowed opacity-60 dark:bg-gray-700 dark:border-gray-600',
  accept: 'border border-blue-500 bg-blue-500/10',
  reject: 'border border-red-700 bg-red-700/10',
};

type InputProps = {
  className?: string;
  value?: File | null;
  onChange?: (file?: File) => void | Promise<void>;
  disabled?: boolean;
  maxSize?: number; // in bytes
  dropzoneOptions?: Omit<DropzoneOptions, 'disabled' | 'maxFiles' | 'maxSize' | 'onDrop' | 'multiple'>;
};

const ERROR_MESSAGES = {
  'file-too-large': (maxSize: number) => `File is too large. Max size is ${Math.round(maxSize / 1024)}KB.`,
  'file-invalid-type': 'Invalid file type.',
  'too-many-files': () => `You can only upload one file.`,
};

const SingleImageDropzone = React.forwardRef<HTMLInputElement, InputProps>(
  ({ dropzoneOptions, value, className, disabled, onChange, maxSize = 200 * 1024 }, ref) => {
    const [customError, setCustomError] = React.useState<string>();

    const onDrop = React.useCallback(
      (acceptedFiles: File[], rejectedFiles: any[]) => {
        if (acceptedFiles[0]) {
          onChange?.(acceptedFiles[0]);
          setCustomError(undefined);
        }

        if (rejectedFiles.length > 0) {
          let errorMessage = '';
          rejectedFiles.forEach(({ errors }: any) => {
            errors.forEach((error: any) => {
              if (error.code === 'file-too-large') {
                errorMessage = ERROR_MESSAGES[error.code](maxSize);
              } else if (error.code === 'too-many-files') {
                errorMessage = ERROR_MESSAGES[error.code]();
              } else {
                errorMessage = ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES] || 'Upload error';
              }
            });
          });
          setCustomError(errorMessage);
        }
      },
      [onChange, maxSize],
    );

    const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } =
      useDropzone({
        onDrop,
        disabled,
        maxFiles: 1,
        maxSize,
        multiple: false,
        ...dropzoneOptions,
      });

    const dropZoneClassName = React.useMemo(
      () =>
        twMerge(
          variants.base,
          isDragActive && variants.active,
          disabled && variants.disabled,
          isDragAccept && variants.accept,
          isDragReject && variants.reject,
          className,
        ).trim(),
      [isDragActive, isDragAccept, isDragReject, disabled, className],
    );

    const removeFile = () => {
        onChange?.(undefined);
    };

    return (
      <div className="space-y-2">
        {value ? (
           <div className="relative w-full h-40 sm:h-56 rounded-md shadow-lg">
                <Image
                  src={URL.createObjectURL(value)}
                  alt={value.name}
                  fill
                  style={{ objectFit: 'contain' }}
                  className="rounded-md"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
            </div>
        ) : (
            <div {...getRootProps({ className: dropZoneClassName })}>
                <input ref={ref} {...getInputProps()} />
                <div className="flex flex-col items-center justify-center text-xs text-gray-400">
                    <UploadCloud className="mb-2 h-7 w-7" />
                    <div className="text-gray-400">Drag & drop or click to upload lab report</div>
                    <div className="mt-1 text-xs text-muted-foreground/80">Max 200KB</div>
                </div>
            </div>
        )}
        {customError && <p className="mt-2 text-sm text-destructive">{customError}</p>}
      </div>
    );
  },
);
SingleImageDropzone.displayName = 'SingleImageDropzone';

export { SingleImageDropzone };
