'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Store, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, query, where, getDocs, collection } from 'firebase/firestore';
import type { CreatorStore } from '@/types/creator-store';

interface StoreEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: CreatorStore;
  onStoreUpdated: (store: CreatorStore) => void;
}

export function StoreEditModal({ open, onOpenChange, store, onStoreUpdated }: StoreEditModalProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [storeName, setStoreName] = useState(store.storeName);
  const [storeDescription, setStoreDescription] = useState(store.storeDescription || '');
  const [creatorNickname, setCreatorNickname] = useState(store.creatorNickname);
  const [storeSlug, setStoreSlug] = useState(store.storeSlug);

  // Auto-generate slug from store name
  useEffect(() => {
    if (storeName && storeName !== store.storeName) {
      const slug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      setStoreSlug(slug);
    }
  }, [storeName, store.storeName]);

  const handleUpdate = async () => {
    if (!storeName.trim() || !creatorNickname.trim()) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in store name and creator nickname.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Check if slug changed and if new slug already exists
      if (storeSlug !== store.storeSlug) {
        const storesRef = collection(db, 'creator_stores');
        const slugQuery = query(storesRef, where('storeSlug', '==', storeSlug));
        const slugSnapshot = await getDocs(slugQuery);

        if (!slugSnapshot.empty) {
          toast({
            title: 'Store Name Taken',
            description: 'This store name is already in use. Please try another.',
            variant: 'destructive',
          });
          setIsUpdating(false);
          return;
        }
      }

      // Update store
      const storeRef = doc(db, 'creator_stores', store.id);
      const updateData = {
        storeName: storeName.trim(),
        storeSlug,
        storeDescription: storeDescription.trim(),
        creatorNickname: creatorNickname.trim(),
        updatedAt: new Date(),
      };

      await updateDoc(storeRef, updateData);

      const updatedStore: CreatorStore = {
        ...store,
        ...updateData,
      };

      toast({
        title: '✅ Store Updated!',
        description: 'Your store information has been saved.',
      });

      onStoreUpdated(updatedStore);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating store:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update store. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl font-extrabold text-[#3D2E17] flex items-center gap-2">
            <Store className="h-8 w-8 text-[#006B3E]" />
            Edit Store Details
          </DialogTitle>
          <DialogDescription className="text-[#5D4E37] text-base font-semibold">
            Update your store information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Creator Nickname */}
          <div className="space-y-2">
            <Label htmlFor="creatorNickname" className="text-sm font-bold text-[#3D2E17]">
              Creator Nickname * 🎨
            </Label>
            <Input
              id="creatorNickname"
              value={creatorNickname}
              onChange={(e) => setCreatorNickname(e.target.value)}
              placeholder="e.g., Urban Roots"
              className="border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={40}
            />
            <p className="text-xs text-[#5D4E37]">{creatorNickname.length}/40 characters</p>
          </div>

          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="storeName" className="text-sm font-bold text-[#3D2E17]">
              Store Name * 🏪
            </Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g., Urban Roots Creations"
              className="border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={60}
            />
            <p className="text-xs text-[#5D4E37]">{storeName.length}/60 characters</p>
          </div>

          {/* Store URL Preview */}
          {storeSlug && (
            <div className="bg-[#006B3E]/10 border-2 border-[#006B3E]/30 rounded-lg p-4">
              <p className="text-sm font-bold text-[#3D2E17] mb-1">Store URL:</p>
              <p className="text-[#006B3E] font-bold break-all">
                thewellnesstree.co.za/treehouse/store/{storeSlug}
              </p>
              {storeSlug !== store.storeSlug && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Changing your store name will update your URL
                </p>
              )}
            </div>
          )}

          {/* Store Description */}
          <div className="space-y-2">
            <Label htmlFor="storeDescription" className="text-sm font-bold text-[#3D2E17]">
              Store Description (Optional)
            </Label>
            <Textarea
              id="storeDescription"
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Tell people about your style and what makes your designs unique..."
              rows={4}
              className="resize-none border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={500}
            />
            <p className="text-xs text-[#5D4E37]">{storeDescription.length}/500 characters</p>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 border-[#5D4E37]/30"
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!storeName.trim() || !creatorNickname.trim() || isUpdating}
            className="bg-[#006B3E] hover:bg-[#005230] font-extrabold"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
