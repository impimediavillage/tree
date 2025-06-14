
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { DispensaryType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DispensaryTypeCardProps {
  dispensaryType: DispensaryType;
  isPreferred?: boolean;
  basePath: string;
}

export function DispensaryTypeCard({ dispensaryType, isPreferred, basePath }: DispensaryTypeCardProps) {
  const [defaultImageUrl, setDefaultImageUrl] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    const newDefaultImageUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(dispensaryType.name)}`;
    setDefaultImageUrl(newDefaultImageUrl);

    let imagePath = dispensaryType.image;
    let finalPathToUse = newDefaultImageUrl; // Start with placeholder

    if (imagePath && imagePath.trim() !== "") {
      // Normalize local paths to ensure they start with a slash
      if (!imagePath.startsWith('/') && !imagePath.toLowerCase().startsWith('http')) {
        imagePath = '/' + imagePath;
      }
      finalPathToUse = imagePath;
    }
    
    setCurrentImageUrl(finalPathToUse);
    setImageLoadFailed(false); // Reset error state on prop change

    console.log(
      `DispensaryTypeCard for "${dispensaryType.name}":\n` +
      `  Firestore 'image' field: "${dispensaryType.image}" (type: ${typeof dispensaryType.image})\n` +
      `  Effective URL for <Image> src: "${finalPathToUse}"`
    );

  }, [dispensaryType.name, dispensaryType.image]);


  const handleImageError = () => {
    if (currentImageUrl !== defaultImageUrl) {
      console.warn(`Image failed to load for type "${dispensaryType.name}" from: "${currentImageUrl}". Falling back to placeholder.`);
      setCurrentImageUrl(defaultImageUrl);
      setImageLoadFailed(true);
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
          {currentImageUrl && (
            <Image
              src={currentImageUrl}
              alt={dispensaryType.name}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" // Added sizes prop
              style={{ objectFit: 'cover' }} // Modern way to specify objectFit with fill
              data-ai-hint={dataAiHint + " banner"}
              onError={handleImageError}
              priority={isPreferred}
            />
          )}
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
