'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveAdsForPlacement } from '@/hooks/use-advertising';
import { trackAdImpression, trackAdClick } from '@/lib/advertising-utils';
import type { AdPlacement } from '@/types/advertising';
import { Sparkles, Gift, ArrowRight } from 'lucide-react';

interface InlineAdProps {
  dispensaryId?: string;
  placement?: AdPlacement;
  className?: string;
}

export function InlineAd({ 
  dispensaryId, 
  placement = 'inline',
  className = '' 
}: InlineAdProps) {
  const router = useRouter();
  const { ads, loading } = useActiveAdsForPlacement(dispensaryId || '', placement);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);

  const currentAd = ads[currentIndex];

  // Track impression when ad is displayed
  useEffect(() => {
    if (currentAd && !hasTrackedImpression) {
      const trackingCode = new URLSearchParams(window.location.search).get('tc') || undefined;
      trackAdImpression(currentAd.id!, placement, undefined, trackingCode);
      setHasTrackedImpression(true);
    }
  }, [currentAd, hasTrackedImpression, placement]);

  // Auto-rotate ads every 20 seconds
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
        setHasTrackedImpression(false);
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [ads.length]);

  const handleAdClick = () => {
    if (!currentAd) return;

    const trackingCode = new URLSearchParams(window.location.search).get('tc') || undefined;
    
    trackAdClick(
      currentAd.id!,
      currentAd.ctaLink || `/dispensary/${currentAd.dispensaryId}`,
      undefined,
      trackingCode
    );

    if (currentAd.ctaLink) {
      router.push(currentAd.ctaLink);
    } else {
      router.push(`/dispensary/${currentAd.dispensaryId}`);
    }
  };

  if (loading || !currentAd) return null;

  const animationClass = {
    fade: 'animate-fade-in',
    slide: 'animate-slide-in',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce-in',
    zoom: 'animate-zoom-in',
    flip: 'animate-flip',
    none: ''
  }[currentAd.design.animation || 'fade'] || '';

  const gradientClass = 
    currentAd.design.template === 'gradient_hero'
      ? 'from-purple-500 via-pink-500 to-purple-600'
      : currentAd.design.template === 'product_showcase'
      ? 'from-blue-500 via-cyan-500 to-blue-600'
      : 'from-orange-500 via-red-500 to-orange-600';

  return (
    <Card 
      className={`group relative overflow-hidden bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all border-2 border-purple-200 hover:border-purple-400 cursor-pointer ${animationClass} ${className}`}
      onClick={handleAdClick}
    >
      {/* Gradient border effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradientClass} opacity-0 group-hover:opacity-10 transition-opacity`} />
      
      <CardContent className="relative p-6">
        <div className="flex items-center gap-6">
          {/* Left side - Icon/Badge */}
          <div className="shrink-0">
            <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${gradientClass}`}>
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <Sparkles className="relative h-10 w-10 text-white" />
            </div>
          </div>

          {/* Middle - Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-purple-100 text-purple-700 border-none">
                Sponsored
              </Badge>
              {currentAd.isBundle && (
                <Badge className="bg-orange-100 text-orange-700 border-none">
                  📦 Bundle
                </Badge>
              )}
            </div>
            
            <h3 className="text-2xl font-black text-[#5D4E37] group-hover:text-[#006B3E] transition-colors line-clamp-1">
              {currentAd.title}
            </h3>
            
            {currentAd.subtitle && (
              <p className="text-lg font-bold text-[#006B3E] line-clamp-1">
                {currentAd.subtitle}
              </p>
            )}
            
            {currentAd.description && (
              <p className="text-sm text-[#5D4E37]/70 line-clamp-2">
                {currentAd.description}
              </p>
            )}

            {/* Bundle savings */}
            {currentAd.isBundle && currentAd.bundleConfig && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-full">
                <Gift className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-black text-orange-700">
                  Save R{currentAd.bundleConfig.discountAmount.toFixed(0)} ({currentAd.bundleConfig.discountPercent}% OFF)
                </span>
              </div>
            )}
          </div>

          {/* Right side - CTA */}
          <div className="shrink-0">
            <Button 
              className={`bg-gradient-to-r ${gradientClass} text-white font-bold hover:opacity-90 transform group-hover:scale-105 transition-all`}
            >
              {currentAd.ctaText || 'Shop Now'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Ad rotation indicator */}
        {ads.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                  setHasTrackedImpression(false);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-purple-500 w-8'
                    : 'bg-gray-300 w-1.5 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
