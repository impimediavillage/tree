
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Dispensary } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Trees, Route, Store, Leaf, Flower, Sprout, Droplet, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useState, useEffect } from 'react';

const hardcodedTypeImages: Record<string, string> = {
  "Cannibinoid store": "/images/cannibinoid-store/canna1.jpg",
  "Homeopathic store": "/images/homeopathy/homeopathy.png",
  "Traditional Medicine dispensary": "/images/traditional-medicine/traditional-medicine.png",
  "Permaculture & gardening store": "/images/permaculture/garden.png",
  "Flower Store": "/images/flowers-permaculture.png",
  "Mushroom store": "/images/mushrooms/mushroom.png",
};

// Map dispensary types to Lucide icons
const typeIconMap: Record<string, string> = {
  "Cannibinoid store": "Leaf",
  "Homeopathic store": "Droplet",
  "Traditional Medicine dispensary": "Flower",
  "Permaculture & gardening store": "Sprout",
  "Flower Store": "Flower",
  "Mushroom store": "Sparkles",
};

interface DispensaryListingCardProps {
  dispensary: Dispensary;
  typeBannerImageUrl?: string | null;
  typeIconPath?: string | null;
  distance?: number;
}

export function DispensaryListingCard({ dispensary, typeBannerImageUrl, typeIconPath, distance }: DispensaryListingCardProps) {
  const placeholderText = encodeURIComponent(dispensary.dispensaryName);
  const defaultPlaceholderUrl = `https://placehold.co/600x400.png?text=${placeholderText}`;
  
  const [currentBannerUrl, setCurrentBannerUrl] = useState(defaultPlaceholderUrl);

  // Render icon dynamically based on typeIconPath or fallback to type mapping
  const renderIcon = () => {
    // If typeIconPath is provided and is an image URL, render it as an image
    if (typeIconPath && (typeIconPath.startsWith('http') || typeIconPath.startsWith('/'))) {
      return (
        <div className="relative h-8 w-8">
          <Image
            src={typeIconPath}
            alt="Store type icon"
            fill
            className="object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Fallback to Lucide icon based on dispensaryType
    const iconName = dispensary.dispensaryType ? typeIconMap[dispensary.dispensaryType] : null;
    const IconComponent = iconName ? (LucideIcons as any)[iconName] : null;
    
    if (IconComponent) {
      return <IconComponent className="h-8 w-8 text-[#006B3E]" />;
    }

    // Default fallback icon
    return <Trees className="h-8 w-8 text-[#006B3E]" />;
  };

  useEffect(() => {
    let bannerUrl = defaultPlaceholderUrl; 

    // First priority: dispensary's own bannerUrl
    if (dispensary.bannerUrl && typeof dispensary.bannerUrl === 'string' && dispensary.bannerUrl.trim() !== '') {
      bannerUrl = dispensary.bannerUrl;
    }
    // Second priority: typeBannerImageUrl prop
    else if (typeBannerImageUrl && typeof typeBannerImageUrl === 'string' && typeBannerImageUrl.trim() !== '') {
      bannerUrl = typeBannerImageUrl;
    } 
    // Third priority: hardcoded type images
    else if (dispensary.dispensaryType && hardcodedTypeImages[dispensary.dispensaryType]) {
      bannerUrl = hardcodedTypeImages[dispensary.dispensaryType]!;
    }
    
    setCurrentBannerUrl(bannerUrl);
  }, [typeBannerImageUrl, dispensary.dispensaryType, dispensary.bannerUrl, dispensary.dispensaryName, defaultPlaceholderUrl]);

  const handleImageError = () => {
    if (currentBannerUrl !== defaultPlaceholderUrl) {
      setCurrentBannerUrl(defaultPlaceholderUrl);
    }
  };
  
  const dataAiHint = `wellness ${dispensary.dispensaryType} ${dispensary.dispensaryName.split(" ")[0] || ""}`;

  return (
    <Card 
        className="flex flex-col hover:shadow-xl transition-shadow duration-300 bg-muted/50 border-border/50 overflow-hidden animate-fade-in-scale-up"
        style={{ animationFillMode: 'backwards' }}
        data-ai-hint={dataAiHint}
    >
      <div className="relative h-64 w-full bg-muted">
        <Image
          src={currentBannerUrl}
          alt={dispensary.dispensaryName}
          fill
          className="object-cover"
          data-ai-hint={`${dispensary.dispensaryName} storefront`}
          onError={handleImageError}
        />
        {distance !== undefined && (
            <div className="absolute top-2 right-2 bg-[#006B3E] text-white text-xs font-bold py-1 px-2 rounded-full flex items-center gap-1 shadow-lg">
                <Route className="h-4 w-4" />
                {distance.toFixed(1)} km away
            </div>
        )}
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
          {renderIcon()}
          {dispensary.dispensaryName}
        </CardTitle>
        <CardDescription className="text-sm font-bold text-[#3D2E17]/80">
          {dispensary.dispensaryType}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <p className="text-sm font-bold text-[#3D2E17] line-clamp-2" title={dispensary.message || `${dispensary.city}, ${dispensary.province}`}>
          {dispensary.message || `${dispensary.city || ''}, ${dispensary.province || ''}`.trim() || 'Visit us!'}
        </p>
        {(dispensary.city || dispensary.province) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-5 w-5 text-[#006B3E]" />
            <span className="font-bold text-[#3D2E17]">
              {[dispensary.city, dispensary.province].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button asChild className="w-full font-bold bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white">
          <Link href={`/store/${dispensary.id}`}>
            Climb this tree
            <Trees className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
