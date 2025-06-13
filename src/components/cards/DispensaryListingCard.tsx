
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Dispensary } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Eye } from 'lucide-react';

// This could be fetched or passed as a prop if it needs to be dynamic
// For now, it's a fallback if dispensary.dispensaryType.image is not available.
const dispensaryTypeImages: Record<string, string> = {
  "THC - CBD - Mushrooms dispensary": "/images/dispensary-types/thc-cbd-mushroom-banner.jpg",
  "Homeopathic dispensary": "/images/dispensary-types/homeopathy-banner.jpg",
  "African Traditional Medicine dispensary": "/images/dispensary-types/traditional-banner.jpg",
  "Permaculture & gardening store": "/images/dispensary-types/permaculture-banner.jpg",
  "Flower Store": "/images/dispensary-types/flower-store-banner.jpg",
  // Add more as needed or fetch dynamically
};

interface DispensaryListingCardProps {
  dispensary: Dispensary;
}

export function DispensaryListingCard({ dispensary }: DispensaryListingCardProps) {
  // Attempt to use a specific image for the dispensary type, otherwise use a placeholder.
  // This assumes your DispensaryType objects might eventually have an 'image' field.
  // For now, it uses the hardcoded map or a generic placeholder.
  const typeImage = dispensary.dispensaryType ? dispensaryTypeImages[dispensary.dispensaryType] : null;
  const displayImage = typeImage || `https://placehold.co/600x400.png?text=${encodeURIComponent(dispensary.dispensaryName)}`;
  const dataAiHint = `store ${dispensary.dispensaryType} ${dispensary.dispensaryName.split(" ")[0] || ""}`;

  return (
    <Card 
        className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-card text-card-foreground border border-border hover:border-primary/50 animate-fade-in-scale-up"
        style={{ animationFillMode: 'backwards' }}
        data-ai-hint={dataAiHint}
    >
      <div className="relative w-full h-48">
        <Image
          src={displayImage}
          alt={dispensary.dispensaryName}
          layout="fill"
          objectFit="cover"
          data-ai-hint={`${dispensary.dispensaryName} storefront`}
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
            <Eye className="mr-2 h-4 w-4" /> Visit Store
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
