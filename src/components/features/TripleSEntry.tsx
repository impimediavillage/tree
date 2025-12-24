'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// All images in growers-onboard folder
const GROWERS_IMAGES = [
  '/images/growers-onboard/8.jpg', // Triple S - always first
  '/images/growers-onboard/aunty-shans-perfume.png',
  '/images/growers-onboard/bob-fela-smoking-with-mary-jane.png',
  '/images/growers-onboard/franks-boom.png',
  '/images/growers-onboard/green-ad.png',
  '/images/growers-onboard/uncle-trichome.png',
];

export function TripleSEntry() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      // Wait for fade out transition
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % GROWERS_IMAGES.length);
        setIsTransitioning(false);
      }, 500); // Half second for fade out
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow bg-muted/50 relative group">
      {/* Animated Background Images */}
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-gradient-to-br from-[#006B3E]/10 to-[#3D2E17]/10">
        {GROWERS_IMAGES.map((imageSrc, index) => (
          <div
            key={imageSrc}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex && !isTransitioning
                ? 'opacity-100'
                : 'opacity-0'
            }`}
          >
            <Image
              src={imageSrc}
              alt={`Triple S Canna Club - Slide ${index + 1}`}
              fill
              className="object-contain"
              priority={index === 0}
            />
          </div>
        ))}
        
        {/* Overlay gradient for better text visibility at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content Overlay */}
      <div className="p-6 text-center bg-white/95 backdrop-blur-sm">
        <h3 className="text-2xl font-black text-[#3D2E17] mb-3">
          Triple S Canna Club
        </h3>
        <p className="text-[#3D2E17] font-bold mb-4">
          Join our AI stoners club! A safe space for cannabis enthusiasts and home growers.
        </p>
        <Button
          asChild
          className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-white transition-all duration-200 active:scale-95 text-lg py-6"
        >
          <Link href="/triple-s-club">Enter Triple S Canna Club</Link>
        </Button>
      </div>
      
      {/* Progress Indicator Dots */}
      <div className="absolute top-4 right-4 flex gap-1.5 z-10">
        {GROWERS_IMAGES.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentImageIndex
                ? 'w-8 bg-[#006B3E]'
                : 'w-2 bg-white/60'
            }`}
          />
        ))}
      </div>
    </Card>
  );
}
