'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ApparelType } from '@/types/creator-lab';
import { APPAREL_PRICES } from '@/types/creator-lab';

interface ApparelSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (apparelType: ApparelType, surface?: 'front' | 'back') => void;
}

const apparelItems: Array<{
  type: ApparelType;
  label: string;
  image: string;
  hasSurface: boolean; // Can choose front/back
  restrictions?: string;
}> = [
  {
    type: 'Cap',
    label: 'Cap',
    image: '/images/apparel/black-cap.jpg',
    hasSurface: false,
    restrictions: '⭕ Circular badge (20cm diameter) - Front or peak position',
  },
  {
    type: 'Beanie',
    label: 'Beanie',
    image: '/images/apparel/black-beannie.jpg',
    hasSurface: false,
    restrictions: '⭕ Circular badge (20cm diameter) - Center fold area',
  },
  {
    type: 'T-Shirt',
    label: 'T-Shirt',
    image: '/images/apparel/black-tshirt-front.jpg',
    hasSurface: true,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
  },
  {
    type: 'Long T-Shirt',
    label: 'Long Sleeve',
    image: '/images/apparel/black-long-sleeve-sweatshirt-front.jpg',
    hasSurface: true,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
  },
  {
    type: 'Hoodie',
    label: 'Hoodie',
    image: '/images/apparel/black-hoodie-front.jpg',
    hasSurface: true,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
  },
  {
    type: 'Backpack',
    label: 'Backpack',
    image: '/images/apparel/black-backpack.jpg',
    hasSurface: false,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front panel',
  },
];

export function ApparelSelector({ open, onOpenChange, onSelect }: ApparelSelectorProps) {
  const [selectedItem, setSelectedItem] = useState<ApparelType | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<'front' | 'back'>('front');

  const selectedApparelItem = apparelItems.find((item) => item.type === selectedItem);

  const handleSelect = () => {
    if (!selectedItem) return;
    
    const item = apparelItems.find((i) => i.type === selectedItem);
    if (item?.hasSurface) {
      onSelect(selectedItem, selectedSurface);
    } else {
      onSelect(selectedItem);
    }
    
    // Reset state
    setSelectedItem(null);
    setSelectedSurface('front');
  };

  const calculateCommission = (price: number) => {
    // Price includes 25% commission, so commission = price * (25/125) = price * 0.2
    return Math.round(price * 0.2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-extrabold text-[#3D2E17]">
            Choose Your Apparel Canvas 👕
          </DialogTitle>
          <DialogDescription className="text-[#5D4E37] text-base font-semibold">
            Pick your favorite apparel item to design on. Each item has a fixed price and you'll earn 25% commission on every sale! 🎨💰
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Apparel Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {apparelItems.map((item) => {
              const isSelected = selectedItem === item.type;
              const price = APPAREL_PRICES[item.type];
              const commission = calculateCommission(price);

              return (
                <button
                  key={item.type}
                  onClick={() => setSelectedItem(item.type)}
                  className={`relative rounded-lg overflow-hidden border-4 transition-all ${
                    isSelected
                      ? 'border-[#006B3E] shadow-lg scale-105'
                      : 'border-[#5D4E37]/20 hover:border-[#006B3E]/50'
                  }`}
                >
                  <div className="aspect-square relative bg-black">
                    <Image
                      src={item.image}
                      alt={item.label}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3 bg-white">
                    <p className="font-extrabold text-[#3D2E17]">{item.label}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-lg font-bold text-[#006B3E]">R{price.toFixed(2)}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 font-bold">
                        Earn R{commission}
                      </Badge>
                    </div>
                    {item.restrictions && (
                      <p className="text-xs text-[#5D4E37] mt-2">{item.restrictions}</p>
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

          {/* Surface Selection (for T-Shirt, Long Sleeve, Hoodie) */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
