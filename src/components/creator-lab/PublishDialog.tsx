'use client';

import { useState } from 'react';
import { Check, ShoppingBag, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { CreatorDesign, ApparelType } from '@/types/creator-lab';
import { calculateCustomerPrice, calculateCreatorCommission, DEFAULT_APPAREL_RETAIL_PRICES } from '@/types/creator-lab';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  design: CreatorDesign;
  onPublished: () => void;
}

export function PublishDialog({ open, onOpenChange, design, onPublished }: PublishDialogProps) {
  const [selectedApparel, setSelectedApparel] = useState<ApparelType[]>(['T-Shirt']);
  const [isPublishing, setIsPublishing] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const apparelOptions: ApparelType[] = ['T-Shirt', 'Long T-Shirt', 'Hoodie', 'Cap', 'Beanie'];

  const toggleApparel = (type: ApparelType) => {
    setSelectedApparel((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handlePublish = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to publish designs.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedApparel.length === 0) {
      toast({
        title: 'Select Apparel',
        description: 'Please select at least one apparel type to publish.',
        variant: 'destructive',
      });
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/creator-lab/publish-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: design.id,
          apparelTypes: selectedApparel,
          userId: currentUser.uid,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Published Successfully! 🎉',
          description: `Your design is now live on ${selectedApparel.length} apparel type(s).`,
        });
        onPublished();
      } else {
        toast({
          title: 'Publish Failed',
          description: data.message || 'Failed to publish your design.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish design. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#006B3E]" />
            <DialogTitle className="text-2xl font-extrabold text-[#3D2E17]">
              Publish to The Treehouse
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#5D4E37] font-semibold">
            Select which apparel items to list your design on. You earn 25% commission on every sale!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Design preview */}
          <div className="relative rounded-lg overflow-hidden border-2 border-[#006B3E]">
            <img
              src={design.imageUrl}
              alt="Your design"
              className="w-full h-auto"
            />
          </div>

          {/* Commission info */}
          <div className="bg-[#006B3E]/10 border border-[#006B3E] rounded-lg p-4">
            <h4 className="font-extrabold text-[#3D2E17] mb-2 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#006B3E]" />
              Your Earnings
            </h4>
            <p className="text-[#5D4E37] font-semibold text-sm">
              You receive <span className="font-extrabold text-[#006B3E]">25% commission</span> on every sale. 
              The platform handles printing, shipping, and customer service.
            </p>
          </div>

          {/* Apparel selection */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#3D2E17]">Select Apparel Types</h4>
            <div className="grid gap-3">
              {apparelOptions.map((type) => {
                const retailPrice = DEFAULT_APPAREL_RETAIL_PRICES[type];
                const customerPrice = calculateCustomerPrice(retailPrice);
                const earnings = calculateCreatorCommission(retailPrice);
                const isSelected = selectedApparel.includes(type);

                return (
                  <div
                    key={type}
                    onClick={() => toggleApparel(type)}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                      ${isSelected
                        ? 'border-[#006B3E] bg-[#006B3E]/5 shadow-md'
                        : 'border-[#5D4E37]/30 hover:border-[#5D4E37] hover:bg-[#5D4E37]/5'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleApparel(type)}
                        className="border-[#5D4E37]"
                      />
                      <div>
                        <p className="font-bold text-[#3D2E17]">{type}</p>
                        <p className="text-xs text-[#5D4E37] font-semibold">Black color</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-[#3D2E17]">R{customerPrice.toFixed(2)}</p>
                      <p className="text-xs text-[#006B3E] font-bold">
                        You earn: R{earnings.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          {selectedApparel.length > 0 && (
            <div className="bg-[#5D4E37]/5 rounded-lg p-4">
              <h4 className="font-extrabold text-[#3D2E17] mb-2">Publishing Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5D4E37] font-semibold">Apparel types:</span>
                  <span className="font-bold text-[#3D2E17]">{selectedApparel.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D4E37] font-semibold">Your commission rate:</span>
                  <span className="font-bold text-[#006B3E]">25%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D4E37] font-semibold">Potential earnings per sale:</span>
                  <span className="font-extrabold text-[#006B3E]">
                    R{calculateCreatorCommission(DEFAULT_APPAREL_RETAIL_PRICES[selectedApparel[0]]).toFixed(2)} - R{calculateCreatorCommission(DEFAULT_APPAREL_RETAIL_PRICES['Hoodie']).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 border-[#5D4E37] text-[#5D4E37] hover:bg-[#5D4E37] hover:text-white font-bold"
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || selectedApparel.length === 0}
              className="flex-1 bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold transition-all duration-300"
            >
              {isPublishing ? (
                <>Publishing...</>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Publish {selectedApparel.length} Item{selectedApparel.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
