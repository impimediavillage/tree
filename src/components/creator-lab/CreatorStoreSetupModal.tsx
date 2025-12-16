'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Store, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import type { CreatorStore } from '@/types/creator-store';

interface CreatorStoreSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoreCreated: (store: CreatorStore) => void;
}

export function CreatorStoreSetupModal({ open, onOpenChange, onStoreCreated }: CreatorStoreSetupModalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [creatorNickname, setCreatorNickname] = useState('');
  const [storeSlug, setStoreSlug] = useState('');

  useEffect(() => {
    if (currentUser?.displayName && !creatorNickname) {
      setCreatorNickname(currentUser.displayName);
    }
  }, [currentUser, creatorNickname]);

  // Auto-generate slug from store name
  useEffect(() => {
    if (storeName) {
      const slug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50);
      setStoreSlug(slug);
    }
  }, [storeName]);

  const storeNameSuggestions = [
    'Urban Roots Creations',
    'Sacred Vibes Studio',
    'Natural Flow Designs',
    'Conscious Creations',
    'Unity Art House',
    'Earthbound Apparel',
  ];

  const creatorNicknames = [
    'Urban Roots',
    'Sacred Vibes',
    'Natural Flow',
    'Conscious Creator',
    'Unity Designs',
    'Earth Walker',
    'Irie Spirit',
    'Peace Maker',
  ];

  const handleCreate = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to create a store.',
        variant: 'destructive',
      });
      return;
    }

    if (!storeName.trim() || !creatorNickname.trim()) {
      toast({
        title: 'Required Fields',
        description: 'Please fill in store name and creator nickname.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Check if slug already exists
      const storesRef = collection(db, 'creator_stores');
      const slugQuery = query(storesRef, where('storeSlug', '==', storeSlug));
      const slugSnapshot = await getDocs(slugQuery);

      if (!slugSnapshot.empty) {
        toast({
          title: 'Store Name Taken',
          description: 'This store name is already in use. Please try another.',
          variant: 'destructive',
        });
        setIsCreating(false);
        return;
      }

      // Create store
      const storeData = {
        ownerId: currentUser.uid,
        storeName: storeName.trim(),
        storeSlug,
        storeDescription: storeDescription.trim(),
        creatorNickname: creatorNickname.trim(),
        ownerEmail: currentUser.email || '',
        userRole: currentUser.role || 'LeafUser',
        dispensaryId: currentUser.dispensaryId || null,
        dispensaryName: currentUser.dispensary?.dispensaryName || null,
        dispensaryType: currentUser.dispensary?.dispensaryType || null,
        stats: {
          totalProducts: 0,
          totalSales: 0,
          totalRevenue: 0,
        },
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'creator_stores'), storeData);

      const newStore: CreatorStore = {
        ...storeData,
        id: docRef.id,
      } as CreatorStore;

      toast({
        title: '🎉 Store Created!',
        description: `${storeName} is now live! Start creating your first product.`,
      });

      onStoreCreated(newStore);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating store:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create store. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl font-extrabold text-[#3D2E17] flex items-center gap-2">
            <Store className="h-8 w-8 text-[#006B3E]" />
            Create Your Treehouse Store
          </DialogTitle>
          <DialogDescription className="text-[#5D4E37] text-base font-semibold">
            Set up your own storefront in The Treehouse! This is a one-time setup. ✨
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Creator Nickname */}
          <div className="space-y-2">
            <Label htmlFor="creatorNickname" className="text-sm font-bold text-[#3D2E17]">
              Your Creator Nickname * 🎨
            </Label>
            <Input
              id="creatorNickname"
              value={creatorNickname}
              onChange={(e) => setCreatorNickname(e.target.value)}
              placeholder="e.g., Urban Roots, Sacred Vibes..."
              className="border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={40}
            />
            <p className="text-xs text-[#5D4E37]">{creatorNickname.length}/40 characters</p>
          </div>

          {/* Nickname Suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#3D2E17]">🎨 Nickname Ideas:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {creatorNicknames.map((nickname, index) => (
                <button
                  key={index}
                  onClick={() => setCreatorNickname(nickname)}
                  className="text-left text-xs sm:text-sm p-2 rounded-lg border-2 border-[#5D4E37]/20 hover:border-[#006B3E] hover:bg-[#006B3E]/5 transition-all"
                >
                  {nickname}
                </button>
              ))}
            </div>
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
              <p className="text-sm font-bold text-[#3D2E17] mb-1">Your Store URL:</p>
              <p className="text-[#006B3E] font-bold break-all">
                thewellnesstree.co.za/treehouse/store/{storeSlug}
              </p>
            </div>
          )}

          {/* Store Name Suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#3D2E17]">💡 Store Name Ideas:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {storeNameSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setStoreName(suggestion)}
                  className="text-left text-sm p-2 rounded-lg border-2 border-[#5D4E37]/20 hover:border-[#006B3E] hover:bg-[#006B3E]/5 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Store Description */}
          <div className="space-y-2">
            <Label htmlFor="storeDescription" className="text-sm font-bold text-[#3D2E17]">
              Store Description (Optional)
            </Label>
            <Textarea
              id="storeDescription"
              value={storeDescription}
              onChange={(e) => setStoreDescription(e.target.value)}
              placeholder="Tell people about your style, inspiration, and what makes your designs unique..."
              rows={4}
              className="resize-none border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={500}
            />
            <p className="text-xs text-[#5D4E37]">{storeDescription.length}/500 characters</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <Sparkles className="inline h-4 w-4 mr-1" />
              <strong>Your store is your brand!</strong> Choose a name that represents your creative vision and will be easy for customers to remember and share.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 border-[#5D4E37]/30"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!storeName.trim() || !creatorNickname.trim() || isCreating}
            className="bg-[#006B3E] hover:bg-[#005230] font-extrabold"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Store...
              </>
            ) : (
              <>
                <Store className="mr-2 h-4 w-4" />
                Create Store
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
