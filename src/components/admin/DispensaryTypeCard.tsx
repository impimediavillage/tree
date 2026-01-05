
'use client';

import { useState } from 'react';
import type { DispensaryType } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, ImageIcon as ImageIconLucideSvg, Tag, Info, MessageSquareText, ListPlus, Power } from 'lucide-react';
import Image from 'next/image';
import { DispensaryTypeDialog } from './DispensaryTypeDialog';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface DispensaryTypeCardProps {
  dispensaryType: DispensaryType;
  onSave: () => void;
  onDelete: (typeId: string, typeName: string) => Promise<void>;
  isSuperAdmin: boolean;
}

export function DispensaryTypeCard({ dispensaryType, onSave, onDelete, isSuperAdmin }: DispensaryTypeCardProps) {
  const { toast } = useToast();
  const [isToggling, setIsToggling] = useState(false);
  
  const handleToggleActive = async (checked: boolean) => {
    if (!dispensaryType.id || !isSuperAdmin) return;
    
    setIsToggling(true);
    try {
      await updateDoc(doc(db, 'dispensaryTypes', dispensaryType.id), {
        isActive: checked,
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: checked ? 'Type Activated' : 'Type Deactivated',
        description: `${dispensaryType.name} is now ${checked ? 'visible to public users' : 'hidden from public users'}`
      });
      
      onSave(); // Refresh the list
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update type status',
        variant: 'destructive'
      });
    } finally {
      setIsToggling(false);
    }
  };
  
  const renderImagePreview = (pathOrUrl: string | null | undefined, altText: string, hint: string) => {
    if (!pathOrUrl) {
      return <ImageIconLucideSvg className="h-10 w-10 text-muted-foreground flex-shrink-0" />;
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
      className="shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col bg-muted/50 border-border/50"
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
            <Tag className="h-6 w-6 text-[#006B3E]" />
            {dispensaryType.name}
          </CardTitle>
        </div>
        {dispensaryType.id && <CardDescription className="text-xs text-[#5D4E37] font-medium">ID: {dispensaryType.id.substring(0,10)}...</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm font-medium">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-[#006B3E] flex-shrink-0 mt-0.5" />
          <p className="text-[#3D2E17] font-semibold line-clamp-3" title={dispensaryType.description || "No description"}>
            {dispensaryType.description || "No description provided."}
          </p>
        </div>

        {dispensaryType.advisorFocusPrompt && (
          <div className="flex items-start gap-2 pt-2 border-t mt-2">
            <MessageSquareText className="h-5 w-5 text-[#006B3E] flex-shrink-0 mt-0.5" />
            <div>
                <p className="text-xs font-bold text-[#5D4E37]">Advisor Focus:</p>
                <p className="text-[#3D2E17] font-semibold line-clamp-2" title={dispensaryType.advisorFocusPrompt}>
                    {dispensaryType.advisorFocusPrompt}
                </p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3 mt-2 pt-2 border-t">
          <div className="space-y-1">
             <p className="text-xs font-bold text-[#5D4E37]">Icon:</p>
            {renderImagePreview(dispensaryType.iconPath, `${dispensaryType.name} icon`, "type icon")}
          </div>
           <div className="space-y-1">
            <p className="text-xs font-bold text-[#5D4E37]">Image:</p>
            {renderImagePreview(dispensaryType.image, `${dispensaryType.name} image`, "type image")}
          </div>
        </div>
         {dispensaryType.createdAt && (
            <p className="text-xs text-[#5D4E37] font-semibold pt-1">
                Created: {new Date(typeof dispensaryType.createdAt === 'string' ? dispensaryType.createdAt : (dispensaryType.createdAt as any)?.toDate ? (dispensaryType.createdAt as any).toDate() : Date.now()).toLocaleDateString()}
            </p>
        )}
      </CardContent>
      {isSuperAdmin && (
        <CardFooter className="flex flex-col gap-3 border-t pt-4 mt-auto">
          {/* Active/Inactive Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg w-full">
            <div className="flex items-center gap-2">
              <Power className={`h-5 w-5 ${dispensaryType.isActive !== false ? 'text-[#006B3E]' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-bold text-[#3D2E17]">Status</p>
                <p className="text-xs text-[#5D4E37]">
                  {dispensaryType.isActive !== false ? 'Visible to public' : 'Hidden from public'}
                </p>
              </div>
            </div>
            <Switch
              checked={dispensaryType.isActive !== false} // Default to true if undefined
              onCheckedChange={handleToggleActive}
              disabled={isToggling || !dispensaryType.id}
              className="data-[state=checked]:bg-[#006B3E]"
            />
          </div>
          
          {/* Edit and Delete Buttons */}
          <div className="flex gap-2 w-full">
            <DispensaryTypeDialog
                dispensaryType={dispensaryType}
                onSave={onSave}
                isSuperAdmin={isSuperAdmin}
            >
                <Button variant="outline" className="w-full font-bold border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white">
                  <Edit className="mr-2 h-5 w-5" /> Edit
                </Button>
            </DispensaryTypeDialog>

            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full font-bold" disabled={!dispensaryType.id}>
                    <Trash2 className="mr-2 h-5 w-5" /> Delete
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the store type &quot;{dispensaryType.name}&quot;.
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
        </CardFooter>
      )}
    </Card>
  );
}
