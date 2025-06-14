
'use client';

import type { DispensaryType } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, ImageIcon as ImageIconLucide, Tag, Info, MessageSquareText, ListPlus } from 'lucide-react';
import Image from 'next/image';
import { DispensaryTypeDialog } from './DispensaryTypeDialog';
import Link from 'next/link';

interface DispensaryTypeCardProps {
  dispensaryType: DispensaryType;
  onSave: () => void;
  onDelete: (typeId: string, typeName: string) => Promise<void>;
  isSuperAdmin: boolean;
}

export function DispensaryTypeCard({ dispensaryType, onSave, onDelete, isSuperAdmin }: DispensaryTypeCardProps) {
  
  const renderImagePreview = (pathOrUrl: string | null | undefined, altText: string, hint: string) => {
    if (!pathOrUrl) {
      return <ImageIconLucide className="h-10 w-10 text-muted-foreground flex-shrink-0" />;
    }
    const isRenderable = pathOrUrl.startsWith('http') || pathOrUrl.startsWith('/');
    
    if (isRenderable) {
      return (
        <div className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted flex-shrink-0">
          <Image 
            src={pathOrUrl} 
            alt={altText} 
            layout="fill" 
            objectFit="contain"
            data-ai-hint={hint}
            onError={(e) => (e.currentTarget.style.display = 'none')} 
          />
           <div 
            className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground"
            style={{ display: 'none' }} 
          >
            Invalid
          </div>
        </div>
      );
    }
    return <span className="text-xs truncate font-mono bg-muted p-1 rounded max-w-[100px]" title={pathOrUrl}>{pathOrUrl}</span>;
  };

  return (
    <Card 
      className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card text-card-foreground animate-fade-in-scale-up"
      style={{ animationFillMode: 'backwards' }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <Tag className="h-6 w-6" />
            {dispensaryType.name}
          </CardTitle>
        </div>
        {dispensaryType.id && <CardDescription className="text-xs text-muted-foreground">ID: {dispensaryType.id.substring(0,10)}...</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground line-clamp-3" title={dispensaryType.description || "No description"}>
            {dispensaryType.description || "No description provided."}
          </p>
        </div>

        {dispensaryType.advisorFocusPrompt && (
          <div className="flex items-start gap-2 pt-2 border-t mt-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-medium text-muted-foreground">Advisor Focus:</p>
                <p className="text-foreground line-clamp-2" title={dispensaryType.advisorFocusPrompt}>
                    {dispensaryType.advisorFocusPrompt}
                </p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3 mt-2 pt-2 border-t">
          <div className="space-y-1">
             <p className="text-xs font-medium text-muted-foreground">Icon:</p>
            {renderImagePreview(dispensaryType.iconPath, `${dispensaryType.name} icon`, "type icon")}
          </div>
           <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Image:</p>
            {renderImagePreview(dispensaryType.image, `${dispensaryType.name} image`, "type image")}
          </div>
        </div>
         {dispensaryType.createdAt && (
            <p className="text-xs text-muted-foreground pt-1">
                Created: {new Date(typeof dispensaryType.createdAt === 'string' ? dispensaryType.createdAt : (dispensaryType.createdAt as any)?.toDate ? (dispensaryType.createdAt as any).toDate() : Date.now()).toLocaleDateString()}
            </p>
        )}
      </CardContent>
      {isSuperAdmin && (
        <CardFooter className="flex flex-col gap-2 border-t pt-4 mt-auto">
          <div className="flex gap-2 w-full">
            <DispensaryTypeDialog
                dispensaryType={dispensaryType}
                onSave={onSave}
                isSuperAdmin={isSuperAdmin}
            >
                <Button variant="outline" className="w-full"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            </DispensaryTypeDialog>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={!dispensaryType.id}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the dispensary type &quot;{dispensaryType.name}&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => dispensaryType.id && onDelete(dispensaryType.id, dispensaryType.name)}>
                    Yes, delete
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
          {/* Manage Categories button is now hidden as requested 
          <Button variant="secondary" className="w-full" asChild>
            <Link href={`/admin/dashboard/dispensary-types/edit-categories/${encodeURIComponent(dispensaryType.name)}`}>
              <ListPlus className="mr-2 h-4 w-4" /> Manage Categories
            </Link>
          </Button>
          */}
        </CardFooter>
      )}
    </Card>
  );
}

