
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Dispensary } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Trees, Route } from 'lucide-react';
import { useState, useEffect } from 'react';

const hardcodedTypeImages: Record<string, string> = {
  "Cannibinoid store": "/images/cannibinoid-store/canna1.jpg",
  "Homeopathic store": "/images/homeopathy/homeopathy.png",
  "Traditional Medicine dispensary": "/images/traditional-medicine/traditional-medicine.png",
  "Permaculture & gardening store": "/images/permaculture/garden.png",
  "Flower Store": "/images/flowers-permaculture.png",
  "Mushroom store": "/images/mushrooms/mushroom.png",
};

interface DispensaryListingCardProps {
  dispensary: Dispensary;
  typeBannerImageUrl?: string | null; 
  distance?: number;
}

export function DispensaryListingCard({ dispensary, typeBannerImageUrl, distance }: DispensaryListingCardProps) {
  const placeholderText = encodeURIComponent(dispensary.dispensaryName);
  const defaultPlaceholderUrl = `https://placehold.co/600x400.png?text=${placeholderText}`;
  
  const [currentBannerUrl, setCurrentBannerUrl] = useState(defaultPlaceholderUrl);

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
        className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-muted/50 text-card-foreground group border border-primary/20 hover:border-primary/50 animate-fade-in-scale-up"
        style={{ animationFillMode: 'backwards' }}
        data-ai-hint={dataAiHint}
    >
      <div className="relative w-full h-48">
        <Image
          src={currentBannerUrl}
          alt={dispensary.dispensaryName}
          layout="fill"
          objectFit="cover"
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
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-extrabold text-[#3D2E17] truncate" title={dispensary.dispensaryName}>
          {dispensary.dispensaryName}
        </CardTitle>
        <CardDescription className="text-sm font-extrabold text-[#3D2E17]/90">
          {dispensary.dispensaryType}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm font-bold text-[#3D2E17] line-clamp-2 mb-2" title={dispensary.message || `${dispensary.city}, ${dispensary.province}`}>
          {dispensary.message || `${dispensary.city || ''}, ${dispensary.province || ''}`.trim() || 'Visit us!'}
        </p>
        {(dispensary.city || dispensary.province) && (
          <div className="flex items-center gap-1 text-xs font-extrabold text-[#3D2E17]">
            <MapPin className="h-5 w-5 text-[#006B3E]" /> {[dispensary.city, dispensary.province].filter(Boolean).join(', ')}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-green-600 hover:bg-[#5D4E37] active:bg-green-800 text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">
          <Link href={`/store/${dispensary.id}`}>
            <Trees className="mr-2 h-5 w-5" /> Climb this tree
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
