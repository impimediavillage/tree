
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DispensaryType } from '@/types';
import { ArrowRight, Trees, Store, Leaf, Flower, Sprout, Droplet, Sparkles } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Map dispensary type names to appropriate Lucide icon names
const typeIconMap: Record<string, string> = {
  "Cannibinoid store": "Leaf",
  "Homeopathic store": "Droplet",
  "Traditional Medicine dispensary": "Flower",
  "Permaculture & gardening store": "Sprout",
  "Flower Store": "Flower",
  "Mushroom store": "Sparkles"
};

interface DispensaryTypeCardProps {
  dispensaryType: DispensaryType;
  basePath: string;
  delay?: number;
  'data-tour'?: string;
}

export function DispensaryTypeCard({ dispensaryType, basePath, delay = 0, 'data-tour': dataTour }: DispensaryTypeCardProps) {
  const { name, description, storeCount } = dispensaryType;
  
  // Banner image for the top of the card
  const imageUrl = dispensaryType.image || (dispensaryType as any).imageUrl || null;
  
  // Icon path for the header icon (separate from banner image)
  const iconPath = dispensaryType.iconPath || null;

  const linkHref = `${basePath}/${encodeURIComponent(name)}`;

  // Render the icon with priority: iconPath (custom image) -> typeIconMap (Lucide icon) -> Trees (fallback)
  const renderIcon = () => {
    // Priority 1: If iconPath is provided and it's an image URL
    if (iconPath && (iconPath.startsWith('http') || iconPath.startsWith('/'))) {
      return (
        <div className="relative h-8 w-8 flex-shrink-0">
          <Image
            src={iconPath}
            alt={`${name} icon`}
            fill
            className="object-contain"
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Priority 2: Check if the dispensary type name maps to a Lucide icon
    const iconName = typeIconMap[name];
    if (iconName) {
      const IconComponent = (LucideIcons as any)[iconName];
      if (IconComponent) {
        return <IconComponent className="h-8 w-8" />;
      }
    }

    // Priority 3: Default fallback icon
    return <Trees className="h-8 w-8" />;
  };

  return (
    <Card 
        className="flex flex-col hover:shadow-xl transition-shadow duration-300 bg-muted/50 border-border/50 overflow-hidden animate-fade-in-scale-up"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
        data-ai-hint={`dispensary type ${name.toLowerCase()}`}
        data-tour={dataTour}
    >
      {/* Image at top with h-64 like AI advisor cards */}
      {imageUrl && (
        <div className="relative h-64 w-full bg-muted">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Header with dark brown text and dynamic icon */}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
            <div className="text-[#006B3E]">
              {renderIcon()}
            </div>
            {name}
          </CardTitle>
          {storeCount !== undefined && (
            <Badge variant="secondary" className="bg-[#3D2E17] text-white font-bold">
              {storeCount} {storeCount === 1 ? 'Store' : 'Stores'}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Content section */}
      <CardContent className="flex-grow space-y-3">
        <p className="text-sm font-bold text-[#3D2E17]/80 line-clamp-4">
          {description}
        </p>

        <div className="flex items-center gap-2 text-sm">
          <Store className="h-5 w-5 text-[#006B3E]" />
          <span className="font-bold text-[#3D2E17]">
            Browse all stores in this category
          </span>
        </div>
      </CardContent>

      {/* Footer with border-t like AI advisor cards */}
      <CardFooter className="border-t pt-4">
        <Button asChild className="w-full font-bold bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white">
          <Link href={linkHref}>
            View Stores
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
