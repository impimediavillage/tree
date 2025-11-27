
'use client';

import { useState } from 'react';
import type { StickerSet } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { StickerSetDetailDialog } from '@/components/dialogs/StickerSetDetailDialog';

interface FeaturedStickerCardProps {
  stickerSet: StickerSet;
}

const themeDisplay: Record<StickerSet['theme'], string> = {
  clay: '3D Clay',
  comic: '2D Comic',
  rasta: 'Retro 420',
  farmstyle: 'Farmstyle',
  imaginative: 'Imaginative',
};

export function FeaturedStickerCard({ stickerSet }: FeaturedStickerCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const placeholderUrl = `https://placehold.co/400x400.png?text=${encodeURIComponent(stickerSet.name)}`;
  const imageUrl = stickerSet.assets.circularStickerUrl || placeholderUrl;

  return (
    <>
      <Card className="group overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
        <CardHeader className="p-0 relative h-56">
          <Image
            src={imageUrl}
            alt={`Sticker for ${stickerSet.name}`}
            layout="fill"
            style={{ objectFit: 'cover' }}
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={`sticker ${stickerSet.name.toLowerCase()}`}
          />
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-primary/80 text-primary-foreground backdrop-blur-sm">R60.00</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow flex flex-col">
          <h3 className="font-extrabold text-lg text-foreground truncate" title={stickerSet.name}>{stickerSet.name}</h3>
          <p className="text-sm font-semibold text-foreground/80">
            Theme: <span className="font-bold">{themeDisplay[stickerSet.theme]}</span>
          </p>
          <p className="text-xs font-semibold text-foreground/70 mt-1">
            By: <span className="font-bold">{stickerSet.creatorDisplayName}</span>
          </p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button className="w-full" variant="outline" onClick={() => setIsDialogOpen(true)}>
            <Eye className="mr-2 h-4 w-4" /> View Details
          </Button>
        </CardFooter>
      </Card>
      <StickerSetDetailDialog
        stickerSet={stickerSet}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}
    
