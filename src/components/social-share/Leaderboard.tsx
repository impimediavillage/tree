'use client';

import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Medal, Crown, Star, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { ShareStats } from '@/types/social-share';

interface LeaderboardEntry {
  dispensaryId: string;
  dispensaryName: string;
  totalShares: number;
  totalClicks: number;
  consecutiveDays: number;
  score: number;
  rank: number;
}

interface SharePerformanceLeaderboardProps {
  currentDispensaryId: string;
  currentDispensaryName: string;
  currentStats: ShareStats;
}

export function SharePerformanceLeaderboard({
  currentDispensaryId,
  currentDispensaryName,
  currentStats
}: SharePerformanceLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRank, setCurrentRank] = useState<number>(0);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const calculateScore = (stats: ShareStats): number => {
    return (
      stats.totalShares * 10 +
      stats.totalClicks * 5 +
      stats.consecutiveDays * 20 +
      stats.achievements.length * 50
    );
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would aggregate data from all dispensaries
      // For now, we'll create a mock leaderboard with the current dispensary
      const currentScore = calculateScore(currentStats);
      
      const mockEntries: LeaderboardEntry[] = [
        {
          dispensaryId: currentDispensaryId,
          dispensaryName: currentDispensaryName,
          totalShares: currentStats.totalShares,
          totalClicks: currentStats.totalClicks,
          consecutiveDays: currentStats.consecutiveDays,
          score: currentScore,
          rank: 1
        }
      ];

      // Sort by score
      mockEntries.sort((a, b) => b.score - a.score);
      
      // Assign ranks
      mockEntries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      setLeaderboard(mockEntries);
      
      const currentEntry = mockEntries.find(e => e.dispensaryId === currentDispensaryId);
      setCurrentRank(currentEntry?.rank || 0);

    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">🥇 Champion</Badge>;
      case 2:
        return <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white">🥈 Runner-up</Badge>;
      case 3:
        return <Badge className="bg-gradient-to-r from-amber-600 to-amber-800 text-white">🥉 Third Place</Badge>;
      default:
        return <Badge variant="secondary">#{rank}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Your Rank Card */}
      <Card className="bg-gradient-to-br from-[#006B3E]/20 to-[#3D2E17]/10 border-2 border-[#006B3E]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-[#006B3E] to-[#3D2E17]">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#5D4E37] font-bold">Your Global Rank</p>
                <p className="text-3xl font-black text-[#3D2E17]">#{currentRank}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#5D4E37] font-bold mb-1">Performance Score</p>
              <p className="text-2xl font-black text-[#006B3E]">
                {calculateScore(currentStats).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#006B3E]" />
            Global Share Leaderboard
          </CardTitle>
          <CardDescription className="font-bold text-[#5D4E37]">
            Top performers across all stores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaderboard.map((entry, index) => (
            <Card
              key={entry.dispensaryId}
              className={`transition-all hover:shadow-lg ${
                entry.dispensaryId === currentDispensaryId
                  ? 'bg-gradient-to-r from-[#006B3E]/10 to-[#3D2E17]/10 border-2 border-[#006B3E]'
                  : 'bg-white'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Rank Icon */}
                  <div className="flex-shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Store Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-[#3D2E17] truncate">
                        {entry.dispensaryName}
                      </p>
                      {entry.dispensaryId === currentDispensaryId && (
                        <Badge className="bg-[#006B3E] text-white">You</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-semibold">
                      <span>{entry.totalShares} shares</span>
                      <span>•</span>
                      <span>{entry.totalClicks} clicks</span>
                      <span>•</span>
                      <span>{entry.consecutiveDays} day streak 🔥</span>
                    </div>
                  </div>

                  {/* Score & Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-lg font-black text-[#006B3E]">
                      {entry.score.toLocaleString()}
                    </p>
                    {getRankBadge(entry.rank)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-bold">
                No leaderboard data available yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[#3D2E17]">
            How Scores Are Calculated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[#5D4E37] font-semibold">
          <div className="flex justify-between">
            <span>Each Share:</span>
            <span className="font-black">+10 points</span>
          </div>
          <div className="flex justify-between">
            <span>Each Click:</span>
            <span className="font-black">+5 points</span>
          </div>
          <div className="flex justify-between">
            <span>Each Consecutive Day:</span>
            <span className="font-black">+20 points</span>
          </div>
          <div className="flex justify-between">
            <span>Each Achievement:</span>
            <span className="font-black">+50 points</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
