'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Star, Package, Truck, DollarSign } from 'lucide-react';
import type { DispensaryReview } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface ReviewAnalyticsProps {
  reviews: (DispensaryReview & { id: string })[];
}

export function ReviewAnalytics({ reviews }: ReviewAnalyticsProps) {
  const analytics = useMemo(() => {
    if (reviews.length === 0) {
      return {
        ratingDistribution: Array(10).fill(0),
        categoryAverages: {},
        ratingTrend: 0,
        topCategories: [],
        reviewVelocity: 0,
      };
    }

    // Rating distribution (1-10)
    const ratingDistribution = Array(10).fill(0);
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 10) {
        ratingDistribution[review.rating - 1]++;
      }
    });

    // Category averages
    const categoryMapping: Record<string, Record<string, number>> = {
      product_quality: { Excellent: 10, Good: 7, Poor: 3 },
      delivery_speed: { Fast: 10, 'On Time': 8, Slow: 5, 'Very Late': 2 },
      packaging: { Perfect: 10, Good: 7, Damaged: 2 },
      accuracy: { Perfect: 10, 'Minor Issues': 6, 'Major Issues': 2 },
      freshness: { 'Very Fresh': 10, Fresh: 8, Acceptable: 5, Stale: 2 },
      value: { Excellent: 10, Good: 7, Fair: 5, Poor: 2 },
      communication: { Excellent: 10, Good: 7, Poor: 3 },
    };

    const categorySums: Record<string, { total: number; count: number }> = {};
    reviews.forEach(review => {
      if (review.categories) {
        Object.entries(review.categories).forEach(([category, value]) => {
          if (!categorySums[category]) {
            categorySums[category] = { total: 0, count: 0 };
          }
          const numericValue = categoryMapping[category]?.[value] || 0;
          categorySums[category].total += numericValue;
          categorySums[category].count++;
        });
      }
    });

    const categoryAverages: Record<string, number> = {};
    Object.entries(categorySums).forEach(([category, data]) => {
      categoryAverages[category] = data.count > 0 ? data.total / data.count : 0;
    });

    // Rating trend (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentReviews = reviews.filter(r => {
      const date = r.createdAt instanceof Timestamp ? r.createdAt.toDate() : new Date(r.createdAt);
      return date >= thirtyDaysAgo;
    });

    const previousReviews = reviews.filter(r => {
      const date = r.createdAt instanceof Timestamp ? r.createdAt.toDate() : new Date(r.createdAt);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });

    const recentAvg = recentReviews.length > 0
      ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
      : 0;

    const previousAvg = previousReviews.length > 0
      ? previousReviews.reduce((sum, r) => sum + r.rating, 0) / previousReviews.length
      : 0;

    const ratingTrend = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    // Top categories by fill rate
    const categoryFillCounts: Record<string, number> = {};
    reviews.forEach(review => {
      if (review.categories) {
        Object.keys(review.categories).forEach(category => {
          categoryFillCounts[category] = (categoryFillCounts[category] || 0) + 1;
        });
      }
    });

    const topCategories = Object.entries(categoryFillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / reviews.length) * 100,
      }));

    // Review velocity (reviews per day in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysReviews = reviews.filter(r => {
      const date = r.createdAt instanceof Timestamp ? r.createdAt.toDate() : new Date(r.createdAt);
      return date >= sevenDaysAgo;
    }).length;
    const reviewVelocity = last7DaysReviews / 7;

    return {
      ratingDistribution,
      categoryAverages,
      ratingTrend,
      topCategories,
      reviewVelocity,
    };
  }, [reviews]);

  const categoryIcons: Record<string, any> = {
    product_quality: Package,
    delivery_speed: Truck,
    value: DollarSign,
  };

  const categoryLabels: Record<string, string> = {
    product_quality: 'Product Quality',
    delivery_speed: 'Delivery Speed',
    packaging: 'Packaging',
    accuracy: 'Order Accuracy',
    freshness: 'Product Freshness',
    value: 'Value for Money',
    communication: 'Communication',
  };

  return (
    <div className="space-y-6">
      {/* Rating Distribution */}
      <Card className="shadow-lg border-2 border-[#006B3E]/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#3D2E17] flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-400" />
            Rating Distribution
          </CardTitle>
          <CardDescription>
            How customers are rating dispensaries across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.ratingDistribution.map((count, index) => {
              const rating = index + 1;
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="w-12 text-sm font-bold text-[#3D2E17] text-right">
                    {rating} ⭐
                  </div>
                  <div className="flex-1 h-8 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        rating >= 9 ? 'bg-green-500' :
                        rating >= 7 ? 'bg-blue-500' :
                        rating >= 5 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-20 text-sm font-semibold text-[#5D4E37] text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <Card className="shadow-lg border-2 border-[#006B3E]/20">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#3D2E17]">Category Performance</CardTitle>
            <CardDescription>Average scores across review categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.categoryAverages)
                .sort((a, b) => b[1] - a[1])
                .map(([category, average]) => {
                  const Icon = categoryIcons[category] || Star;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[#006B3E]" />
                          <span className="text-sm font-semibold text-[#3D2E17]">
                            {categoryLabels[category] || category}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`${
                            average >= 8.5 ? 'bg-green-100 text-green-800' :
                            average >= 7 ? 'bg-blue-100 text-blue-800' :
                            average >= 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {average.toFixed(1)}/10
                        </Badge>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            average >= 8.5 ? 'bg-green-500' :
                            average >= 7 ? 'bg-blue-500' :
                            average >= 5 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${(average / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Trends & Insights */}
        <Card className="shadow-lg border-2 border-[#006B3E]/20">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#3D2E17]">Trends & Insights</CardTitle>
            <CardDescription>Platform performance over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rating Trend */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#3D2E17]">30-Day Rating Trend</span>
                {analytics.ratingTrend >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${
                  analytics.ratingTrend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {analytics.ratingTrend >= 0 ? '+' : ''}{analytics.ratingTrend.toFixed(1)}%
                </span>
                <span className="text-xs text-blue-700">vs. previous period</span>
              </div>
            </div>

            {/* Review Velocity */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#3D2E17]">Review Velocity</span>
                <Badge variant="secondary" className="bg-purple-200 text-purple-800">
                  7-Day Avg
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-600">
                  {analytics.reviewVelocity.toFixed(1)}
                </span>
                <span className="text-xs text-purple-700">reviews per day</span>
              </div>
            </div>

            {/* Top Categories */}
            <div>
              <h4 className="text-sm font-semibold text-[#3D2E17] mb-3">Most Filled Categories</h4>
              <div className="space-y-2">
                {analytics.topCategories.map((cat, idx) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center border-[#006B3E] text-[#006B3E]">
                      {idx + 1}
                    </Badge>
                    <span className="text-sm text-[#5D4E37] flex-1">
                      {categoryLabels[cat.category] || cat.category}
                    </span>
                    <span className="text-xs font-semibold text-[#006B3E]">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
