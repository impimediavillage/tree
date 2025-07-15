
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Dispensary } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Trees } from 'lucide-react';
import { useState, useEffect } from 'react';

const hardcodedTypeImages: Record<string, string> = {
  "THC - CBD - Mushrooms wellness": "/images/dispensary-types/thc-cbd-mushroom-banner.jpg",
  "Homeopathic wellness": "/images/dispensary-types/homeopathy-banner.jpg",
  "African Traditional Medicine wellness": "/images/dispensary-types/traditional-banner.jpg",
  "Permaculture & gardening store": "/images/dispensary-types/permaculture-banner.jpg",
  "Flower Store": "/images/dispensary-types/flower-store-banner.jpg",
};

interface DispensaryListingCardProps {
  dispensary: Dispensary;
  typeBannerImageUrl?: string | null; 
}

export function DispensaryListingCard({ dispensary, typeBannerImageUrl }: DispensaryListingCardProps) {
  const placeholderText = encodeURIComponent(dispensary.dispensaryName);
  const defaultPlaceholderUrl = `https://placehold.co/600x400.png?text=${placeholderText}`;
  
  const [currentBannerUrl, setCurrentBannerUrl] = useState(defaultPlaceholderUrl);

  useEffect(() => {
    let bannerUrl = defaultPlaceholderUrl; 

    if (typeBannerImageUrl && typeof typeBannerImageUrl === 'string' && typeBannerImageUrl.trim() !== '') {
      bannerUrl = typeBannerImageUrl;
    } 
    else if (dispensary.dispensaryType && hardcodedTypeImages[dispensary.dispensaryType]) {
      bannerUrl = hardcodedTypeImages[dispensary.dispensaryType]!;
    }
    
    setCurrentBannerUrl(bannerUrl);
  }, [typeBannerImageUrl, dispensary.dispensaryType, dispensary.dispensaryName, defaultPlaceholderUrl]);

  const handleImageError = () => {
    if (currentBannerUrl !== defaultPlaceholderUrl) {
      setCurrentBannerUrl(defaultPlaceholderUrl);
    }
  };
  
  const dataAiHint = `wellness ${dispensary.dispensaryType} ${dispensary.dispensaryName.split(" ")[0] || ""}`;

  return (
    <Card 
        className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-card text-card-foreground group border border-border hover:border-primary/50 animate-fade-in-scale-up"
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
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold text-primary truncate" title={dispensary.dispensaryName}>
          {dispensary.dispensaryName}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {dispensary.dispensaryType}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2" title={dispensary.message || dispensary.location}>
          {dispensary.message || dispensary.location?.split(',').slice(0,2).join(', ') || 'Visit us!'}
        </p>
        {dispensary.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {dispensary.location.split(',').slice(0,2).join(',')}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white">
          <Link href={`/store/${dispensary.id}`}>
            <Trees className="mr-2 h-4 w-4" /> Climb this tree
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
