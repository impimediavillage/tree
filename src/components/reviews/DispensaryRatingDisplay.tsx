'use client';

import { Star, TrendingUp, Award, Package, Zap, Heart, Leaf, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DispensaryReviewStats, DispensaryBadge } from '@/types';

interface DispensaryRatingDisplayProps {
  stats: DispensaryReviewStats | null;
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
}

const BADGE_CONFIG: Record<DispensaryBadge, { label: string; icon: React.ReactNode; color: string }> = {
  top_rated: {
    label: 'Top Rated',
    icon: <Award className="h-3.5 w-3.5" />,
    color: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
  },
  fast_delivery: {
    label: 'Fast Delivery',
    icon: <Zap className="h-3.5 w-3.5" />,
    color: 'bg-gradient-to-r from-blue-400 to-blue-600 text-white',
  },
  perfect_packaging: {
    label: 'Perfect Packaging',
    icon: <Package className="h-3.5 w-3.5" />,
    color: 'bg-gradient-to-r from-green-400 to-emerald-600 text-white',
  },
  consistent_quality: {
    label: 'Consistent',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    color: 'bg-gradient-to-r from-purple-400 to-purple-600 text-white',
  },
  community_favorite: {
    label: 'Community Favorite',
    icon: <Heart className="h-3.5 w-3.5" />,
    color: 'bg-gradient-to-r from-pink-400 to-rose-600 text-white',
  },
  excellent_value: {
    label: 'Great Value',
    icon: <DollarSign className="h-3.5 w-3.5" />,
    color: 'bg-gradient-to-r from-teal-400 to-cyan-600 text-white',
  },
  fresh_products: {
    label: 'Fresh Products',
    icon: <Leaf className="h-3.5 w-3.5" />,
    color: 'bg-gradient-to-r from-lime-400 to-green-600 text-white',
  },
};

export function DispensaryRatingDisplay({ stats, variant = 'compact', className }: DispensaryRatingDisplayProps) {
  if (!stats || stats.totalReviews === 0) {
    return null; // Don't show anything if no reviews
  }

  const { averageRating, totalReviews, badges } = stats;
  const roundedRating = Math.round(averageRating * 10) / 10;
  const fullStars = Math.floor(averageRating);
  const hasHalfStar = averageRating % 1 >= 0.5;

  // Minimal variant - just stars and count
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="flex items-center">
          {[...Array(10)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3 w-3",
                i < fullStars ? "fill-[#006B3E] text-[#006B3E]" :
                i === fullStars && hasHalfStar ? "fill-[#006B3E]/50 text-[#006B3E]" :
                "fill-gray-200 text-gray-200"
              )}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-gray-600">({totalReviews})</span>
      </div>
    );
  }

  // Compact variant - for cards
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-[#3D2E17]">{roundedRating}</span>
              <div className="flex flex-col">
                <div className="flex">
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < fullStars ? "fill-[#006B3E] text-[#006B3E]" :
                        i === fullStars && hasHalfStar ? "fill-[#006B3E]/50 text-[#006B3E]" :
                        "fill-gray-300 text-gray-300"
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{totalReviews} reviews</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.slice(0, 3).map((badge) => {
              const config = BADGE_CONFIG[badge];
              return (
                <Badge
                  key={badge}
                  className={cn(
                    "text-[10px] px-2 py-0.5 font-bold flex items-center gap-1",
                    config.color
                  )}
                >
                  {config.icon}
                  {config.label}
                </Badge>
              );
            })}
            {badges.length > 3 && (
              <Badge className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-700">
                +{badges.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed variant - for dispensary profile pages
  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Rating */}
      <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-2xl p-6 border-2 border-[#006B3E]/20 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-6xl font-bold text-[#3D2E17]">{roundedRating}</span>
              <div className="flex flex-col gap-1">
                <div className="flex">
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-5 w-5",
                        i < fullStars ? "fill-[#006B3E] text-[#006B3E]" :
                        i === fullStars && hasHalfStar ? "fill-[#006B3E]/50 text-[#006B3E]" :
                        "fill-gray-300 text-gray-300"
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>

            {/* Rating Breakdown */}
            {stats.ratingBreakdown && (
              <div className="space-y-1.5">
                {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.ratingBreakdown[rating as keyof typeof stats.ratingBreakdown] || 0;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  
                  if (percentage === 0) return null;
                  
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600 w-6">{rating}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            rating >= 9 ? "bg-green-500" :
                            rating >= 7 ? "bg-yellow-500" :
                            rating >= 5 ? "bg-orange-500" :
                            "bg-red-500"
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 w-12 text-right">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-[#3D2E17] mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-[#006B3E]" />
            Achievements
          </h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => {
              const config = BADGE_CONFIG[badge];
              return (
                <Badge
                  key={badge}
                  className={cn(
                    "text-xs px-3 py-1.5 font-bold flex items-center gap-1.5",
                    config.color
                  )}
                >
                  {config.icon}
                  {config.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Averages */}
      {stats.categoryAverages && Object.keys(stats.categoryAverages).length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-[#3D2E17] mb-3">Performance Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(stats.categoryAverages).map(([category, score]) => {
              if (!score) return null;
              const percentage = (score / 10) * 100;
              
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-bold text-[#006B3E]">{score.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#006B3E] to-[#004D2C] rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
