'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

interface ProductDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apparelType: string;
  defaultName?: string;
  defaultDescription?: string;
  defaultCreatorName?: string;
  onComplete: (productName: string, productDescription: string, creatorName: string) => void;
}

export function ProductDetailsModal({ 
  open, 
  onOpenChange, 
  apparelType,
  defaultName,
  defaultDescription,
  defaultCreatorName,
  onComplete 
}: ProductDetailsModalProps) {
  const [productName, setProductName] = useState(defaultName || `Custom ${apparelType}`);
  const [productDescription, setProductDescription] = useState(defaultDescription || '');
  const [creatorName, setCreatorName] = useState(defaultCreatorName || '');

  const nameSuggestions = [
    `Irie ${apparelType} Vibes`,
    `Conscious ${apparelType} Creation`,
    `Natural ${apparelType} Flow`,
    `Unity ${apparelType} Design`,
    `Peaceful ${apparelType} Energy`,
    `Earthbound ${apparelType} Spirit`,
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

  const handleComplete = () => {
    if (!productName.trim() || !creatorName.trim()) {
      return;
    }
    onComplete(productName.trim(), productDescription.trim(), creatorName.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl font-extrabold text-[#3D2E17] flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-[#006B3E]" />
            Name Your Creation
          </DialogTitle>
          <DialogDescription className="text-[#5D4E37] text-base font-semibold">
            Name your {apparelType} and claim your creator identity! ✨
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Creator Nickname */}
          <div className="space-y-2">
            <Label htmlFor="creatorName" className="text-sm font-bold text-[#3D2E17]">
              Your Creator Nickname * 🎨
            </Label>
            <Input
              id="creatorName"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g., Urban Roots, Sacred Vibes, Natural Flow..."
              className="border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={40}
            />
            <p className="text-xs text-[#5D4E37]">{creatorName.length}/40 characters</p>
          </div>

          {/* Creator Nickname Suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#3D2E17]">🎨 Nickname Ideas:</p>
            <div className="grid grid-cols-2 gap-2">
              {creatorNicknames.map((nickname, index) => (
                <button
                  key={index}
                  onClick={() => setCreatorName(nickname)}
                  className="text-left text-sm p-2 rounded-lg border-2 border-[#5D4E37]/20 hover:border-[#006B3E] hover:bg-[#006B3E]/5 transition-all"
                >
                  {nickname}
                </button>
              ))}
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName" className="text-sm font-bold text-[#3D2E17]">
              Product Name *
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Unity Vibes Cap"
              className="border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={60}
            />
            <p className="text-xs text-[#5D4E37]">{productName.length}/60 characters</p>
          </div>

          {/* Name Suggestions */}
          <div className="space-y-2">
            <p className="text-sm font-bold text-[#3D2E17]">💡 Name Ideas:</p>
            <div className="grid grid-cols-2 gap-2">
              {nameSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setProductName(suggestion)}
                  className="text-left text-sm p-2 rounded-lg border-2 border-[#5D4E37]/20 hover:border-[#006B3E] hover:bg-[#006B3E]/5 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Product Description */}
          <div className="space-y-2">
            <Label htmlFor="productDescription" className="text-sm font-bold text-[#3D2E17]">
              Product Description (Optional)
            </Label>
            <Textarea
              id="productDescription"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe the vibe, inspiration, or story behind your design..."
              rows={4}
              className="resize-none border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
              maxLength={500}
            />
            <p className="text-xs text-[#5D4E37]">{productDescription.length}/500 characters</p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              💡 <strong>Tip:</strong> A catchy name and authentic description help your product stand out in The Treehouse Store!
            </p>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-2 border-[#5D4E37]/30"
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!productName.trim() || !creatorName.trim()}
            className="bg-[#006B3E] hover:bg-[#005230] font-extrabold"
          >
            Continue to Treehouse 🌳
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
