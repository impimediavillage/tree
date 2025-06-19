
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Dispensary } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';

const hardcodedTypeImages: Record<string, string> = {
  "THC - CBD - Mushrooms dispensary": "/images/dispensary-types/thc-cbd-mushroom-banner.jpg",
  "Homeopathic dispensary": "/images/dispensary-types/homeopathy-banner.jpg",
  "African Traditional Medicine dispensary": "/images/dispensary-types/traditional-banner.jpg",
  "Permaculture & gardening store": "/images/dispensary-types/permaculture-banner.jpg",
  "Flower Store": "/images/dispensary-types/flower-store-banner.jpg",
};

interface DispensaryListingCardProps {
  dispensary: Dispensary;
  typeBannerImageUrl?: string | null; // Optional prop for custom image URL from Firestore
}

export function DispensaryListingCard({ dispensary, typeBannerImageUrl }: DispensaryListingCardProps) {
  const placeholderText = encodeURIComponent(dispensary.dispensaryName);
  const defaultPlaceholderUrl = `https://placehold.co/600x400.png?text=${placeholderText}`;
  
  const [currentBannerUrl, setCurrentBannerUrl] = useState(defaultPlaceholderUrl);

  useEffect(() => {
    let bannerUrl = defaultPlaceholderUrl; // Start with the ultimate fallback

    // 1. Prioritize typeBannerImageUrl (from Firestore) if it's a valid string
    if (typeBannerImageUrl && typeof typeBannerImageUrl === 'string' && typeBannerImageUrl.trim() !== '') {
      bannerUrl = typeBannerImageUrl;
    } 
    // 2. Else, try hardcoded map if typeBannerImageUrl wasn't usable
    else if (dispensary.dispensaryType && hardcodedTypeImages[dispensary.dispensaryType]) {
      bannerUrl = hardcodedTypeImages[dispensary.dispensaryType]!;
    }
    // If neither, it remains defaultPlaceholderUrl

    setCurrentBannerUrl(bannerUrl);
  }, [typeBannerImageUrl, dispensary.dispensaryType, dispensary.dispensaryName, defaultPlaceholderUrl]);

  const handleImageError = () => {
    // If the currentBannerUrl (custom or hardcoded) fails, and it's not already the default placeholder, switch to default.
    if (currentBannerUrl !== defaultPlaceholderUrl) {
      setCurrentBannerUrl(defaultPlaceholderUrl);
    }
  };
  
  const dataAiHint = `store ${dispensary.dispensaryType} ${dispensary.dispensaryName.split(" ")[0] || ""}`;

  return (
    <Card 
        className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-card text-card-foreground border border-border hover:border-primary/50 animate-fade-in-scale-up"
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
        <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href={`/store/${dispensary.id}`}>
            <Eye className="mr-2 h-4 w-4" /> Visit Wellness Store
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
