
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { DispensaryType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Heart, Image as ImageIconPlaceholder } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DispensaryTypeCardProps {
  dispensaryType: DispensaryType;
  isPreferred?: boolean;
  basePath: string;
}

export function DispensaryTypeCard({ dispensaryType, isPreferred, basePath }: DispensaryTypeCardProps) {
  const [defaultBannerUrl, setDefaultBannerUrl] = useState('');
  const [currentBannerUrl, setCurrentBannerUrl] = useState('');
  
  const [currentIconPath, setCurrentIconPath] = useState<string | null | undefined>(null);


  useEffect(() => {
    const newDefaultBannerUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(dispensaryType.name)}`;
    setDefaultBannerUrl(newDefaultBannerUrl);

    let bannerPath = dispensaryType.image;
    let finalBannerPathToUse = newDefaultBannerUrl; 

    if (bannerPath && typeof bannerPath === 'string' && bannerPath.trim() !== "") {
      if (!bannerPath.startsWith('/') && !bannerPath.toLowerCase().startsWith('http')) {
        bannerPath = '/' + bannerPath;
      }
      finalBannerPathToUse = bannerPath;
    }
    
    setCurrentBannerUrl(finalBannerPathToUse);

    // Handle Icon Path
    let iconPathToUse = dispensaryType.iconPath;
    if (iconPathToUse && iconPathToUse.trim() !== "" && !iconPathToUse.startsWith('http') && !iconPathToUse.startsWith('/')) {
        iconPathToUse = '/' + iconPathToUse;
    }
    setCurrentIconPath(iconPathToUse);


    console.log(
      `DispensaryTypeCard for "${dispensaryType.name}":\n` +
      `  Firestore 'image' field: "${dispensaryType.image}"\n` +
      `  Effective Banner URL: "${finalBannerPathToUse}"\n` +
      `  Firestore 'iconPath' field: "${dispensaryType.iconPath}"\n` +
      `  Effective Icon Path: "${iconPathToUse || 'None'}"`
    );

  }, [dispensaryType.name, dispensaryType.image, dispensaryType.iconPath]);


  const handleBannerImageError = () => {
    if (currentBannerUrl !== defaultBannerUrl) {
      console.warn(`Banner image failed to load for type "${dispensaryType.name}" from: "${currentBannerUrl}". Falling back to placeholder.`);
      setCurrentBannerUrl(defaultBannerUrl);
    }
  };

  const handleIconImageError = () => {
    console.warn(`Custom icon failed to load for type "${dispensaryType.name}" from: "${currentIconPath}". Will use default Store icon.`);
    setCurrentIconPath(null); 
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
          {currentBannerUrl && (
            <Image
              src={currentBannerUrl}
              alt={dispensaryType.name}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              style={{ objectFit: 'cover' }}
              data-ai-hint={dataAiHint + " banner"}
              onError={handleBannerImageError}
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
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                {currentIconPath && (currentIconPath.startsWith('http') || currentIconPath.startsWith('/')) ? (
                    <Image 
                        src={currentIconPath} 
                        alt="" 
                        width={80} // 5 * 16px (original h-4 = 16px)
                        height={80} // 5 * 16px
                        className="mr-3" // Adjusted margin for larger icon
                        onError={handleIconImageError}
                        data-ai-hint={`${dispensaryType.name} icon`}
                    />
                ) : currentIconPath && currentIconPath.includes('<svg') ? (
                    <span
                        className="mr-3 h-20 w-20 inline-block" // 5 * h-4 w-4
                        dangerouslySetInnerHTML={{ __html: currentIconPath }}
                    />
                ) : (
                    <Store className="mr-3 h-20 w-20" /> // 5 * h-4 w-4
                )}
                View Dispensaries
            </Button>
        </div>
      </Link>
    </Card>
  );
}

