'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Star, TrendingUp, Medal, Trophy, Loader2, ExternalLink } from 'lucide-react';
import type { DispensaryReviewStats, Dispensary } from '@/types';
import Link from 'next/link';

interface DispensaryWithStats {
  id: string;
  dispensaryName: string;
  dispensaryType: string;
  stats: DispensaryReviewStats;
}

export function DispensaryLeaderboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [topDispensaries, setTopDispensaries] = useState<DispensaryWithStats[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      // Fetch all review stats
      const statsRef = collection(db, 'dispensaryReviewStats');
      const statsSnapshot = await getDocs(statsRef);
      
      const statsData = statsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (DispensaryReviewStats & { id: string })[];

      // Sort by reviewScore
      statsData.sort((a, b) => (b.reviewScore || 0) - (a.reviewScore || 0));

      // Fetch dispensary details for top 20
      const top20Stats = statsData.slice(0, 20);
      const dispensaryPromises = top20Stats.map(async (stat) => {
        const dispensaryDoc = await getDoc(doc(db, 'dispensaries', stat.dispensaryId));
        if (dispensaryDoc.exists()) {
          const dispensaryData = dispensaryDoc.data() as Dispensary;
          return {
            id: stat.dispensaryId,
            dispensaryName: dispensaryData.dispensaryName || 'Unknown',
            dispensaryType: dispensaryData.dispensaryType || 'Unknown',
            stats: stat,
          };
        }
        return null;
      });

      const dispensaries = (await Promise.all(dispensaryPromises)).filter(Boolean) as DispensaryWithStats[];
      setTopDispensaries(dispensaries);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'top_rated': return '🏆';
      case 'fast_delivery': return '⚡';
      case 'perfect_packaging': return '📦';
      case 'consistent_quality': return '📈';
      case 'community_favorite': return '💖';
      case 'excellent_value': return '💰';
      case 'fresh_products': return '🍃';
      default: return '⭐';
    }
  };

  const getBadgeLabel = (badge: string) => {
    return badge.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-8 w-8 text-yellow-500 fill-yellow-400" />;
    if (rank === 2) return <Medal className="h-7 w-7 text-gray-400 fill-gray-300" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-600 fill-orange-400" />;
    return <span className="text-2xl font-bold text-[#5D4E37]">#{rank}</span>;
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-300';
    if (rank === 2) return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300';
    if (rank === 3) return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300';
    return 'bg-white border-gray-200';
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-2 border-[#006B3E]/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2 border-[#006B3E]/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
            <Award className="h-6 w-6 text-yellow-500" />
            Dispensary Leaderboard
          </CardTitle>
          <CardDescription>
            Top performing dispensaries ranked by composite review score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topDispensaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No dispensaries with reviews yet
            </div>
          ) : (
            topDispensaries.map((dispensary, index) => {
              const rank = index + 1;
              
              return (
                <Card key={dispensary.id} className={`border-2 ${getRankBgColor(rank)} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-16 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>

                      {/* Dispensary Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-[#3D2E17] truncate">
                            {dispensary.dispensaryName}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {dispensary.dispensaryType}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          {/* Rating */}
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
                            <span className="font-bold text-[#3D2E17]">
                              {dispensary.stats.averageRating.toFixed(1)}
                            </span>
                            <span className="text-[#5D4E37]">
                              ({dispensary.stats.totalReviews} reviews)
                            </span>
                          </div>

                          {/* Score */}
                          <Badge variant="secondary" className="bg-[#006B3E]/10 text-[#006B3E]">
                            Score: {dispensary.stats.reviewScore.toFixed(2)}
                          </Badge>
                        </div>

                        {/* Badges */}
                        {dispensary.stats.badges && dispensary.stats.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {dispensary.stats.badges.map(badge => (
                              <Badge
                                key={badge}
                                variant="secondary"
                                className="text-xs bg-gradient-to-r from-white to-gray-100 border"
                              >
                                {getBadgeIcon(badge)} {getBadgeLabel(badge)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/dashboard/dispensaries/edit/${dispensary.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#3D2E17] flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDispensaries.length > 0 && (
              <div>
                <p className="text-xl font-bold text-[#3D2E17] truncate">
                  {topDispensaries[0].dispensaryName}
                </p>
                <p className="text-sm text-[#5D4E37] mt-1">
                  {topDispensaries[0].stats.averageRating.toFixed(1)}/10 average rating
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Score: {topDispensaries[0].stats.reviewScore.toFixed(2)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#3D2E17] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Most Reviewed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDispensaries.length > 0 && (
              (() => {
                const mostReviewed = [...topDispensaries].sort((a, b) => 
                  b.stats.totalReviews - a.stats.totalReviews
                )[0];
                return (
                  <div>
                    <p className="text-xl font-bold text-[#3D2E17] truncate">
                      {mostReviewed.dispensaryName}
                    </p>
                    <p className="text-sm text-[#5D4E37] mt-1">
                      {mostReviewed.stats.totalReviews} total reviews
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {mostReviewed.stats.averageRating.toFixed(1)}/10 average rating
                    </p>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#3D2E17] flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Most Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDispensaries.length > 0 && (
              (() => {
                const mostBadges = [...topDispensaries].sort((a, b) => 
                  (b.stats.badges?.length || 0) - (a.stats.badges?.length || 0)
                )[0];
                return (
                  <div>
                    <p className="text-xl font-bold text-[#3D2E17] truncate">
                      {mostBadges.dispensaryName}
                    </p>
                    <p className="text-sm text-[#5D4E37] mt-1">
                      {mostBadges.stats.badges?.length || 0} badges earned
                    </p>
                    <div className="flex gap-1 mt-2">
                      {mostBadges.stats.badges?.slice(0, 5).map(badge => (
                        <span key={badge} className="text-lg">
                          {getBadgeIcon(badge)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
