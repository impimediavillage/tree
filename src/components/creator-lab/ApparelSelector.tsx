'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader, AlertCircle } from 'lucide-react';
import type { ApparelType } from '@/types/creator-lab';
import { calculateCustomerPrice, calculateCreatorCommission } from '@/types/creator-lab';
import type { ApparelItem } from '@/types/apparel-items';

interface ApparelSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (apparelType: ApparelType, surface?: 'front' | 'back') => void;
}

export function ApparelSelector({ open, onOpenChange, onSelect }: ApparelSelectorProps) {
  const [selectedItem, setSelectedItem] = useState<ApparelType | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<'front' | 'back'>('front');
  const [apparelItems, setApparelItems] = useState<ApparelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map database itemType to ApparelType format
  const mapItemTypeToApparelType = (itemType: string): ApparelType => {
    const mapping: Record<string, ApparelType> = {
      'tshirt': 'T-Shirt',
      't-shirt': 'T-Shirt',
      't_shirt': 'T-Shirt',
      'hoodie': 'Hoodie',
      'cap': 'Cap',
      'beanie': 'Beanie',
      'long_sleeve': 'Long T-Shirt',
      'long-sleeve': 'Long T-Shirt',
      'longsleeve': 'Long T-Shirt',
      'sweatshirt': 'Long T-Shirt',
      'backpack': 'Backpack',
    };
    return mapping[itemType.toLowerCase()] || 'T-Shirt';
  };

  useEffect(() => {
    if (open) {
      fetchApparelItems();
    }
  }, [open]);

  const fetchApparelItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'apparel_items'),
        where('isActive', '==', true),
        where('inStock', '==', true),
        orderBy('itemType', 'asc')
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ApparelItem[];
      
      setApparelItems(items);
    } catch (err: any) {
      console.error('Error fetching apparel items:', err);
      setError('Failed to load apparel items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedApparelItem = apparelItems.find((item) => 
    mapItemTypeToApparelType(item.itemType) === selectedItem
  );

  const handleSelect = () => {
    if (!selectedItem) return;
    
    const item = apparelItems.find((i) => mapItemTypeToApparelType(i.itemType) === selectedItem);
    if (item?.hasSurface) {
      onSelect(selectedItem, selectedSurface);
    } else {
      onSelect(selectedItem);
    }
    
    // Reset state
    setSelectedItem(null);
    setSelectedSurface('front');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-[#3D2E17]">
            Choose Your Apparel Canvas 👕
          </DialogTitle>
          <DialogDescription className="text-[#5D4E37] text-sm sm:text-base font-semibold">
            Pick your favorite apparel item to design on. Each item has a fixed price and you'll earn 25% commission on every sale! 🎨💰
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="h-12 w-12 text-[#006B3E] mx-auto mb-4 animate-spin" />
                <p className="text-[#5D4E37] font-bold">Loading apparel items...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-700 font-bold mb-4">{error}</p>
                <Button onClick={fetchApparelItems} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          ) : apparelItems.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                <p className="text-[#5D4E37] font-bold">No apparel items available yet</p>
                <p className="text-sm text-[#5D4E37] mt-2">Please check back soon!</p>
              </div>
            </div>
          ) : (
            <>
              {/* Apparel Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {apparelItems.map((item) => {
                  const mappedType = mapItemTypeToApparelType(item.itemType);
                  const isSelected = selectedItem === mappedType;
                  const retailPrice = item.retailPrice;
                  const customerPrice = calculateCustomerPrice(retailPrice);
                  const commission = calculateCreatorCommission(retailPrice);
                  const displayImage = item.mockImageUrl || item.mockImageFront || '/images/apparel/placeholder.jpg';

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(mappedType)}
                      className={`relative rounded-lg overflow-hidden border-4 transition-all ${
                        isSelected
                          ? 'border-[#006B3E] shadow-lg scale-105'
                          : 'border-[#5D4E37]/20 hover:border-[#006B3E]/50'
                      }`}
                    >
                      <div className="aspect-square relative bg-black">
                        <Image
                          src={displayImage}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="p-2 sm:p-3 bg-white">
                        <p className="font-extrabold text-[#3D2E17] text-sm sm:text-base truncate">{item.name}</p>
                        <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                          <span className="text-base sm:text-lg font-bold text-[#006B3E]">R{customerPrice.toFixed(2)}</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700 font-bold text-[10px] sm:text-xs">
                            Earn R{commission}
                          </Badge>
                        </div>
                        {item.restrictions && (
                          <p className="text-[10px] sm:text-xs text-[#5D4E37] mt-2">{item.restrictions}</p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-[#006B3E] text-white rounded-full p-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Surface Selection (for items with hasSurface: true) */}
              {selectedApparelItem?.hasSurface && (
                <div className="border-2 border-[#006B3E] rounded-lg p-4 bg-[#006B3E]/5">
                  <p className="font-bold text-[#3D2E17] mb-3">
                    Choose Which Side to Design On:
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant={selectedSurface === 'front' ? 'default' : 'outline'}
                      onClick={() => setSelectedSurface('front')}
                      className={`h-auto py-4 ${
                        selectedSurface === 'front'
                          ? 'bg-[#006B3E] hover:bg-[#005230]'
                          : 'border-2 border-[#5D4E37]/30'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-extrabold">Front Side</p>
                        <p className="text-xs mt-1 opacity-90">Design on the front</p>
                      </div>
                    </Button>
                    <Button
                      variant={selectedSurface === 'back' ? 'default' : 'outline'}
                      onClick={() => setSelectedSurface('back')}
                      className={`h-auto py-4 ${
                        selectedSurface === 'back'
                          ? 'bg-[#006B3E] hover:bg-[#005230]'
                          : 'border-2 border-[#5D4E37]/30'
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-extrabold">Back Side</p>
                        <p className="text-xs mt-1 opacity-90">Design on the back</p>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {/* Info Banner */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-semibold">
                  💡 <strong>Pro Tip:</strong> Your design will be perfectly printed using our premium print-on-demand service. 
                  The Wellness Tree handles all the printing, shipping, and customer service — you just create and earn! 🌳✨
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleSelect}
                disabled={!selectedItem}
                className="w-full h-14 text-lg font-extrabold bg-[#006B3E] hover:bg-[#005230]"
              >
                {selectedItem ? `Create Design on ${selectedItem}` : 'Select an Item Above'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
