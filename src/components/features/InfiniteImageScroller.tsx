'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface InfiniteImageScrollerProps {
  images: string[];
  speed?: 'slow' | 'normal' | 'fast';
}

export const InfiniteImageScroller: React.FC<InfiniteImageScrollerProps> = ({ images, speed = 'slow' }) => {
  const [scrollerImages, setScrollerImages] = useState<string[]>([]);

  useEffect(() => {
    if (images && images.length > 0) {
      // Duplicate images for a seamless loop
      setScrollerImages([...images, ...images]);
    }
  }, [images]);

  if (!images || images.length === 0) {
    return null;
  }

  const durationClasses = {
    slow: 'animate-scroll-slow',
    normal: 'animate-scroll-normal',
    fast: 'animate-scroll-fast',
  };

  return (
    <div className="w-full overflow-hidden relative group">
      <div 
        className={cn(
          "flex min-w-full shrink-0 gap-4 py-4 w-max flex-nowrap group-hover:pause",
          durationClasses[speed]
        )}
      >
        {scrollerImages.map((src, index) => (
          <figure key={index} className="shrink-0 mx-2 w-64">
            <div className="overflow-hidden rounded-lg border-2 border-primary/20 shadow-lg">
              <Image
                src={src}
                alt={`Showcase image ${index + 1}`}
                className="aspect-[3/4] h-auto w-full object-contain bg-muted/20"
                width={250}
                height={333}
                priority={index < 5} // Prioritize loading the first few images
              />
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
};
