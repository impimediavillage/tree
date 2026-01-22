'use client';

import { useState } from 'react';
import { Shirt, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ApparelType } from '@/types/creator-lab';
import { APPAREL_PRICES } from '@/types/creator-lab';

interface ApparelPreviewProps {
  designImageUrl: string;
  selectedType?: ApparelType;
  onAddToCart?: (apparelType: ApparelType) => void;
}

export function ApparelPreview({ designImageUrl, selectedType, onAddToCart }: ApparelPreviewProps) {
  const [activeTab, setActiveTab] = useState<ApparelType>(selectedType || 'T-Shirt');

  const apparelTypes: ApparelType[] = ['T-Shirt', 'Long T-Shirt', 'Hoodie', 'Cap', 'Beanie'];

  // Mock apparel templates (in production, these would be actual mockup images)
  const getApparelMockup = (type: ApparelType) => {
    // For now, we'll show the design on a black background simulating black apparel
    // In production, you'd have actual apparel mockup templates
    return (
      <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center p-8">
        <img
          src={designImageUrl}
          alt={`${type} preview`}
          className="max-w-[60%] max-h-[60%] object-contain"
        />
        <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded-full">
          <p className="text-xs font-bold text-black">{type}</p>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-[#5D4E37]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shirt className="h-8 w-8 text-[#006B3E]" />
            <CardTitle className="text-xl font-extrabold text-[#3D2E17]">
              Apparel Preview
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Apparel type selector */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ApparelType)}>
          <TabsList className="grid w-full grid-cols-5 bg-[#5D4E37]/10">
            {apparelTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="text-xs font-bold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white"
              >
                {type === 'T-Shirt' ? 'Tee' : type === 'Long T-Shirt' ? 'Long Tee' : type}
              </TabsTrigger>
            ))}
          </TabsList>

          {apparelTypes.map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {/* Mockup preview */}
              {getApparelMockup(type)}

              {/* Product details */}
              <div className="bg-[#5D4E37]/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-[#3D2E17]">{type} - Black</h4>
                    <p className="text-sm text-[#5D4E37] font-semibold">100% Cotton, Premium Quality</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-[#006B3E]">R{customerPrice.toFixed(2)}</p>
                    <p className="text-xs text-[#5D4E37] font-semibold">You earn: R{commission}</p>
                  </div>
                </div>

                {/* Features */}
                <div className="pt-3 border-t border-[#5D4E37]/20">
                  <ul className="space-y-1 text-sm text-[#5D4E37] font-semibold">
                    <li>✓ High-quality print on black {type.toLowerCase()}</li>
                    <li>✓ Durable, vibrant colors</li>
                    <li>✓ Comfortable fit</li>
                    <li>✓ Unique creator design</li>
                  </ul>
                </div>

                {/* Add to cart button */}
                {onAddToCart && (
                  <Button
                    onClick={() => onAddToCart(type)}
                    className="w-full bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold py-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Add to Cart - R{customerPrice.toFixed(2)}
                  </Button>
                )}
              </div>
            </TabsContent>
          )})}
        </Tabs>

        {/* Info note */}
        <div className="text-center text-xs text-[#5D4E37] font-semibold bg-[#006B3E]/5 rounded-lg p-3">
          <p>🌳 All items are printed on-demand to reduce waste.</p>
          <p className="mt-1">Creators earn 25% of platform retail price on every sale.</p>
        </div>
      </CardContent>
    </Card>
  );
}
