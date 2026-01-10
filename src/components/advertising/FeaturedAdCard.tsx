'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveAdsForPlacement } from '@/hooks/use-advertising';
import { trackAdImpression, trackAdClick } from '@/lib/advertising-utils';
import type { AdPlacement } from '@/types/advertising';
import { Star, TrendingUp, Gift, Zap, Package } from 'lucide-react';

interface FeaturedAdCardProps {
  dispensaryId?: string;
  placement?: AdPlacement;
  limit?: number;
  className?: string;
}

export function FeaturedAdCard({ 
  dispensaryId, 
  placement = 'product_grid',
  limit = 3,
  className = '' 
}: FeaturedAdCardProps) {
  const router = useRouter();
  const { ads, loading } = useActiveAdsForPlacement(dispensaryId || '', placement);
  const [trackedAds, setTrackedAds] = useState<Set<string>>(new Set());

  const displayAds = ads.slice(0, limit);

  // Track impressions for visible ads
  useEffect(() => {
    displayAds.forEach(ad => {
      if (!trackedAds.has(ad.id!)) {
        const trackingCode = new URLSearchParams(window.location.search).get('tc') || undefined;
        trackAdImpression(ad.id!, placement, undefined, trackingCode);
        setTrackedAds(prev => new Set(prev).add(ad.id!));
      }
    });
  }, [displayAds, placement, trackedAds]);

  const handleAdClick = (adId: string, ctaLink?: string, dispensaryId?: string) => {
    const trackingCode = new URLSearchParams(window.location.search).get('tc') || undefined;
    
    trackAdClick(
      adId,
      ctaLink || `/dispensary/${dispensaryId}`,
      undefined,
      trackingCode
    );

    if (ctaLink) {
      router.push(ctaLink);
    } else {
      router.push(`/dispensary/${dispensaryId}`);
    }
  };

  if (loading || displayAds.length === 0) return null;

  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {displayAds.map((ad) => {
        const animationClass = {
          fade: 'animate-fade-in',
          slide: 'animate-slide-in',
          pulse: 'animate-pulse',
          bounce: 'animate-bounce-in',
          zoom: 'animate-zoom-in',
          flip: 'animate-flip',
          none: ''
        }[ad.design.animation || 'fade'] || '';

        const gradientClass = 
          ad.design.template === 'gradient_hero'
            ? 'from-purple-500 to-pink-500'
            : ad.design.template === 'product_showcase'
            ? 'from-blue-500 to-cyan-500'
            : 'from-orange-500 to-red-500';

        return (
          <Card 
            key={ad.id}
            className={`group relative overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-purple-300 ${animationClass}`}
            onClick={() => handleAdClick(ad.id!, ad.ctaLink, ad.dispensaryId)}
          >
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-5 group-hover:opacity-10 transition-opacity`} />
            
            {/* Badges */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
              {ad.type === 'special_deal' && (
                <Badge className="bg-orange-500 text-white border-none">
                  🔥 Deal
                </Badge>
              )}
              {ad.isBundle && (
                <Badge className="bg-purple-500 text-white border-none">
                  📦 Bundle
                </Badge>
              )}
              {ad.type === 'featured_product' && (
                <Badge className="bg-yellow-500 text-white border-none">
                  ⭐ Featured
                </Badge>
              )}
            </div>

            <CardContent className="relative p-6 space-y-4">
              {/* Icon */}
              <div className="flex items-center justify-center">
                <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${gradientClass}`}>
                  <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
                  {ad.type === 'special_deal' && <Zap className="relative h-12 w-12 text-white" />}
                  {ad.type === 'featured_product' && <Star className="relative h-12 w-12 text-white" />}
                  {ad.type === 'product_bundle' && <Gift className="relative h-12 w-12 text-white" />}
                  {ad.type === 'social_campaign' && <TrendingUp className="relative h-12 w-12 text-white" />}
                  {ad.type === 'custom' && <Package className="relative h-12 w-12 text-white" />}
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-[#5D4E37] line-clamp-2 group-hover:text-[#006B3E] transition-colors">
                  {ad.title}
                </h3>
                
                {ad.subtitle && (
                  <p className="text-lg font-bold text-[#006B3E] line-clamp-1">
                    {ad.subtitle}
                  </p>
                )}
                
                {ad.description && (
                  <p className="text-sm text-[#5D4E37]/70 line-clamp-2">
                    {ad.description}
                  </p>
                )}
              </div>

              {/* Bundle savings */}
              {ad.isBundle && ad.bundleConfig && (
                <div className="flex items-center justify-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <Gift className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-black text-purple-700">
                    Save R{ad.bundleConfig.discountAmount.toFixed(0)} ({ad.bundleConfig.discountPercent}% OFF)
                  </span>
                </div>
              )}

              {/* Products count */}
              {ad.products && ad.products.length > 0 && (
                <p className="text-center text-sm text-[#5D4E37]/60">
                  {ad.products.length} product{ad.products.length > 1 ? 's' : ''}
                </p>
              )}

              {/* CTA Button */}
              <Button 
                className={`w-full bg-gradient-to-r ${gradientClass} text-white font-bold hover:opacity-90 transform group-hover:scale-105 transition-all`}
              >
                {ad.ctaText || 'View Deal'}
              </Button>

              {/* Tagline */}
              {ad.tagline && (
                <p className="text-center text-xs text-[#5D4E37]/50 italic">
                  {ad.tagline}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
