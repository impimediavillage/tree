
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { DispensaryType } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Heart, Image as ImageIconPlaceholder } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
        // Assuming it's a path relative to public that needs a leading slash
        finalBannerPathToUse = '/' + bannerPath.replace(/^\/+/, '');
      } else {
        finalBannerPathToUse = bannerPath;
      }
    }
    
    setCurrentBannerUrl(finalBannerPathToUse);

    // Handle Icon Path
    let iconPathToUse = dispensaryType.iconPath;
    if (iconPathToUse && iconPathToUse.trim() !== "" ) {
      if (!iconPathToUse.startsWith('http') && !iconPathToUse.startsWith('/') && !iconPathToUse.includes('<svg')) {
         iconPathToUse = '/' + iconPathToUse.replace(/^\/+/, '');
      }
    }
    setCurrentIconPath(iconPathToUse);

    // console.log(
    //   `DispensaryTypeCard for "${dispensaryType.name}":\n` +
    //   `  Firestore 'image' field: "${dispensaryType.image}"\n` +
    //   `  Effective Banner URL: "${finalBannerPathToUse}"\n` +
    //   `  Firestore 'iconPath' field: "${dispensaryType.iconPath}"\n` +
    //   `  Effective Icon Path: "${iconPathToUse || 'None'}"`
    // );

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
            <Button 
                variant="ghost" 
                className={cn(
                    "w-full h-auto p-2 flex items-center justify-center text-foreground hover:bg-accent/10 focus-visible:ring-primary",
                    !currentIconPath && "justify-center" // Center text if no icon
                )}
            >
                {currentIconPath && (currentIconPath.startsWith('http') || currentIconPath.startsWith('/')) ? (
                    <Image 
                        src={currentIconPath} 
                        alt="" 
                        width={40} 
                        height={40}
                        className="mr-2"
                        onError={handleIconImageError}
                        data-ai-hint={`${dispensaryType.name} icon`}
                    />
                ) : currentIconPath && currentIconPath.includes('<svg') ? (
                    <span
                        className="mr-2 h-10 w-10 inline-block" // Adjusted size
                        dangerouslySetInnerHTML={{ __html: currentIconPath }}
                    />
                ) : currentIconPath ? ( // Fallback for non-URL/non-SVG strings, perhaps just text
                    <Store className="mr-2 h-10 w-10" /> // Default icon if path is invalid but not empty
                ) : null } {/* No icon at all if currentIconPath is explicitly null/undefined */}
                
                <span className={cn(
                    "bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-md",
                    currentIconPath && "ml-2" // Add margin only if icon is present
                )}>
                    Browse stores
                </span>
            </Button>
        </div>
      </Link>
    </Card>
  );
}

