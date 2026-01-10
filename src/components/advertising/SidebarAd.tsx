'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveAdsForPlacement } from '@/hooks/use-advertising';
import { trackAdImpression, trackAdClick } from '@/lib/advertising-utils';
import type { AdPlacement } from '@/types/advertising';
import { Sparkles, ExternalLink, X } from 'lucide-react';

interface SidebarAdProps {
  dispensaryId?: string;
  placement?: AdPlacement;
  className?: string;
}

export function SidebarAd({ 
  dispensaryId, 
  placement = 'sidebar',
  className = '' 
}: SidebarAdProps) {
  const router = useRouter();
  const { ads, loading } = useActiveAdsForPlacement(dispensaryId || '', placement);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const currentAd = ads[currentIndex];

  // Track impression when ad is displayed
  useEffect(() => {
    if (currentAd && !hasTrackedImpression && !isDismissed) {
      const trackingCode = new URLSearchParams(window.location.search).get('tc') || undefined;
      trackAdImpression(currentAd.id!, placement, undefined, trackingCode);
      setHasTrackedImpression(true);
    }
  }, [currentAd, hasTrackedImpression, placement, isDismissed]);

  // Auto-rotate ads every 15 seconds
  useEffect(() => {
    if (ads.length > 1 && !isDismissed) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
        setHasTrackedImpression(false);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [ads.length, isDismissed]);

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

  if (loading || !currentAd || isDismissed) return null;

  const animationClass = {
    fade: 'animate-fade-in',
    slide: 'animate-slide-in',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce-in',
    zoom: 'animate-zoom-in',
    flip: 'animate-flip',
    none: ''
  }[currentAd.design.animation || 'slide'] || '';

  const gradientClass = 
    currentAd.design.template === 'gradient_hero'
      ? 'from-purple-500 to-pink-500'
      : currentAd.design.template === 'product_showcase'
      ? 'from-blue-500 to-cyan-500'
      : 'from-orange-500 to-red-500';

  return (
    <div className={`sticky top-4 ${className}`}>
      <Card 
        className={`relative overflow-hidden shadow-xl border-2 border-purple-200 ${animationClass}`}
      >
        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute top-2 right-2 z-20 p-1 rounded-full bg-white/80 hover:bg-white transition-colors"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>

        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-90`} />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} className="w-full h-full" />
        </div>

        <CardContent className="relative p-6 space-y-4">
          {/* Badge */}
          <div className="flex justify-center">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-none">
              <Sparkles className="h-3 w-3 mr-1" />
              Sponsored
            </Badge>
          </div>

          {/* Content */}
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-black text-white leading-tight">
              {currentAd.title}
            </h3>
            
            {currentAd.subtitle && (
              <p className="text-lg font-bold text-white/90">
                {currentAd.subtitle}
              </p>
            )}
            
            {currentAd.description && (
              <p className="text-sm text-white/80 line-clamp-3">
                {currentAd.description}
              </p>
            )}
          </div>

          {/* Bundle info */}
          {currentAd.isBundle && currentAd.bundleConfig && (
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
              <p className="text-center text-sm font-black text-white">
                💰 Save R{currentAd.bundleConfig.discountAmount.toFixed(0)}
              </p>
              <p className="text-center text-xs text-white/80">
                {currentAd.bundleConfig.discountPercent}% OFF Bundle
              </p>
            </div>
          )}

          {/* CTA Button */}
          <Button
            onClick={handleAdClick}
            className="w-full bg-white text-purple-600 hover:bg-white/90 font-bold"
          >
            {currentAd.ctaText || 'Learn More'}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>

          {/* Tagline */}
          {currentAd.tagline && (
            <p className="text-center text-xs text-white/70 italic">
              {currentAd.tagline}
            </p>
          )}

          {/* Ad indicator dots */}
          {ads.length > 1 && (
            <div className="flex justify-center gap-1.5">
              {ads.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                    setHasTrackedImpression(false);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white w-6'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
