
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { DispensaryType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Heart } from 'lucide-react';
import { useState, useEffect } from 'react'; // Import useState and useEffect

interface DispensaryTypeCardProps {
  dispensaryType: DispensaryType;
  isPreferred?: boolean;
  basePath: string; // e.g., "/dashboard/leaf/dispensaries" or "/dispensaries/by-type"
}

export function DispensaryTypeCard({ dispensaryType, isPreferred, basePath }: DispensaryTypeCardProps) {
  const defaultImageUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(dispensaryType.name)}`;
  const initialImageUrl = dispensaryType.image || defaultImageUrl;
  
  const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl);

  useEffect(() => {
    // This effect updates the image URL if the dispensaryType prop changes,
    // ensuring the card reflects the most current data.
    setCurrentImageUrl(dispensaryType.image || defaultImageUrl);
  }, [dispensaryType.image, dispensaryType.name, defaultImageUrl]);

  const handleImageError = () => {
    // If the currentImageUrl (which might be from dispensaryType.image) fails,
    // and it's not already the default placeholder, switch to the default placeholder.
    if (currentImageUrl !== defaultImageUrl) {
      setCurrentImageUrl(defaultImageUrl);
    }
  };

  const dataAiHint = `dispensary type ${dispensaryType.name.toLowerCase().replace(/\s+/g, ' ')}`;

  return (
    <Card 
        className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden bg-card text-card-foreground border border-border hover:border-primary/50 relative animate-fade-in-scale-up"
        style={{ animationFillMode: 'backwards' }}
        data-ai-hint={dataAiHint}
    >
      {isPreferred && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="default" className="bg-pink-500 hover:bg-pink-600 text-white px-2 py-1 text-xs">
            <Heart className="mr-1 h-3 w-3" /> Preferred
          </Badge>
        </div>
      )}
      <Link href={`${basePath}/${encodeURIComponent(dispensaryType.name)}`} className="flex flex-col h-full">
        <div className="relative w-full h-48">
          <Image
            src={currentImageUrl}
            alt={dispensaryType.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={dataAiHint + " banner"}
            onError={handleImageError}
            priority={isPreferred} // Conditionally set priority
          />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-semibold text-primary truncate" title={dispensaryType.name}>
            {dispensaryType.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardDescription className="text-sm text-muted-foreground line-clamp-3" title={dispensaryType.description}>
            {dispensaryType.description || "Explore products and services from this type of dispensary."}
          </CardDescription>
        </CardContent>
        <div className="p-4 pt-0 mt-auto">
            <Button variant="outline" className="w-full text-accent border-accent hover:bg-accent/10">
                View Dispensaries <Store className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </Link>
    </Card>
  );
}

