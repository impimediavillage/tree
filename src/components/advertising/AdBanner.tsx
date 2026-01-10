'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveAdsForPlacement } from '@/hooks/use-advertising';
import { trackAdImpression, trackAdClick } from '@/lib/advertising-utils';
import type { AdPlacement } from '@/types/advertising';
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, Gift } from 'lucide-react';

interface AdBannerProps {
  dispensaryId?: string;
  placement?: AdPlacement;
  className?: string;
}

export function AdBanner({ 
  dispensaryId, 
  placement = 'hero_banner',
  className = '' 
}: AdBannerProps) {
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

  // Auto-rotate ads every 10 seconds
  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length);
        setHasTrackedImpression(false); // Reset to track new ad
      }, 10000);
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

  const nextAd = () => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
    setHasTrackedImpression(false);
  };

  const prevAd = () => {
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
    setHasTrackedImpression(false);
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

  return (
    <div className={`relative group ${className}`}>
      <Card 
        className={`overflow-hidden border-none shadow-2xl ${animationClass}`}
        style={{
          background: currentAd.design.template === 'gradient_hero'
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : currentAd.design.template === 'product_showcase'
            ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        }}
      >
        <div className="relative h-[400px] md:h-[500px] flex items-center justify-center p-8">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Badge for type */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {currentAd.type === 'special_deal' && (
                <Badge className="bg-orange-500 text-white border-none text-lg px-4 py-2">
                  🔥 Special Deal
                </Badge>
              )}
              {currentAd.isBundle && (
                <Badge className="bg-purple-500 text-white border-none text-lg px-4 py-2">
                  📦 Bundle Deal
                </Badge>
              )}
            </div>

            {/* Main content */}
            <h2 className="text-5xl md:text-7xl font-black text-white mb-4 drop-shadow-lg">
              {currentAd.title}
            </h2>
            
            {currentAd.subtitle && (
              <p className="text-2xl md:text-3xl font-bold text-white/90 mb-6">
                {currentAd.subtitle}
              </p>
            )}
            
            {currentAd.description && (
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                {currentAd.description}
              </p>
            )}

            {/* Bundle savings */}
            {currentAd.isBundle && currentAd.bundleConfig && (
              <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 mb-8">
                <Gift className="h-6 w-6 text-white" />
                <span className="text-2xl font-black text-white">
                  Save R{currentAd.bundleConfig.discountAmount.toFixed(0)}
                </span>
                <Badge className="bg-yellow-400 text-yellow-900 border-none">
                  {currentAd.bundleConfig.discountPercent}% OFF
                </Badge>
              </div>
            )}

            {/* CTA Button */}
            <Button
              onClick={handleAdClick}
              size="lg"
              className="bg-white text-purple-600 hover:bg-white/90 text-xl font-black px-8 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
            >
              {currentAd.ctaText || 'Shop Now'}
              <ExternalLink className="ml-2 h-6 w-6" />
            </Button>

            {/* Tagline */}
            {currentAd.tagline && (
              <p className="mt-6 text-white/70 text-sm font-semibold">
                {currentAd.tagline}
              </p>
            )}
          </div>

          {/* Navigation arrows */}
          {ads.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={prevAd}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextAd}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Indicator dots */}
          {ads.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {ads.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setHasTrackedImpression(false);
                  }}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
