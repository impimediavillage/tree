"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Lock, Star, TrendingUp, Target, Calendar, DollarSign, Zap, Award } from 'lucide-react';
import { DRIVER_ACHIEVEMENTS } from '@/types/driver';
import type { DriverAchievement, DriverStats } from '@/types/driver';
import { format } from 'date-fns';
import Confetti from 'react-confetti';

interface AchievementsCardProps {
  achievements: DriverAchievement[];
  stats: DriverStats;
}

export default function AchievementsCard({
  achievements,
  stats,
}: AchievementsCardProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Check if we just earned an achievement (from URL param or session storage)
    const params = new URLSearchParams(window.location.search);
    const newAchievement = params.get('newAchievement');
    
    if (newAchievement) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Set window size for confetti
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAchievementIcon = (id: string) => {
    switch (id) {
      case 'first_delivery':
        return <Star className="w-8 h-8" />;
      case 'speed_demon':
        return <Zap className="w-8 h-8" />;
      case 'perfect_record':
        return <Award className="w-8 h-8" />;
      case 'century_club':
        return <Target className="w-8 h-8" />;
      case 'streak_master':
        return <Calendar className="w-8 h-8" />;
      case 'money_maker':
        return <DollarSign className="w-8 h-8" />;
      default:
        return <Trophy className="w-8 h-8" />;
    }
  };

  const getAchievementProgress = (achievementId: string) => {
    const achievement = DRIVER_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return { progress: 0, total: 100, percentage: 0, label: 'Unknown' };

    switch (achievementId) {
      case 'first_delivery':
        return {
          progress: Math.min(stats.completedDeliveries, 1),
          total: 1,
          percentage: stats.completedDeliveries >= 1 ? 100 : 0,
          label: `${stats.completedDeliveries}/1 deliveries`,
        };
      
      case 'speed_demon':
        // Simplified: we'll track this via actual delivery times in the future
        return {
          progress: 0,
          total: 10,
          percentage: 0,
          label: '0/10 fast deliveries',
        };
      
      case 'perfect_record':
        const hasEnoughRatings = stats.totalRatings >= 20;
        const isPerfect = stats.averageRating === 5.0 && hasEnoughRatings;
        return {
          progress: hasEnoughRatings ? (isPerfect ? 20 : stats.totalRatings) : stats.totalRatings,
          total: 20,
          percentage: hasEnoughRatings && isPerfect ? 100 : (stats.totalRatings / 20) * 100,
          label: `${stats.averageRating.toFixed(1)}★ rating (${stats.totalRatings}/20 reviews)`,
        };
      
      case 'century_club':
        return {
          progress: Math.min(stats.completedDeliveries, 100),
          total: 100,
          percentage: (stats.completedDeliveries / 100) * 100,
          label: `${stats.completedDeliveries}/100 deliveries`,
        };
      
      case 'streak_master':
        return {
          progress: Math.min(stats.currentStreak, 7),
          total: 7,
          percentage: (stats.currentStreak / 7) * 100,
          label: `${stats.currentStreak}/7 days streak`,
        };
      
      case 'money_maker':
        return {
          progress: Math.min(stats.totalEarnings, 10000),
          total: 10000,
          percentage: (stats.totalEarnings / 10000) * 100,
          label: `R${stats.totalEarnings.toFixed(2)}/R10,000`,
        };
      
      default:
        return { progress: 0, total: 100, percentage: 0, label: 'Unknown' };
    }
  };

  const earnedAchievements = achievements.map(earned => {
    const definition = DRIVER_ACHIEVEMENTS.find(a => a.id === earned.id);
    return { ...earned, ...definition };
  });

  const lockedAchievements = DRIVER_ACHIEVEMENTS.filter(
    def => !achievements.some(earned => earned.id === def.id)
  );

  const totalPoints = earnedAchievements.reduce((sum, a) => sum + ((a.reward?.bonus || 0)), 0);

  return (
    <>
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      <div className="space-y-6">
        {/* Summary Stats */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-1">
                  {earnedAchievements.length} / {DRIVER_ACHIEVEMENTS.length}
                </h3>
                <p className="text-sm text-muted-foreground">Achievements Unlocked</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-600">{totalPoints}</span>
                </div>
                <p className="text-sm text-muted-foreground">Total Points</p>
              </div>
            </div>
            
            <Progress 
              value={(earnedAchievements.length / DRIVER_ACHIEVEMENTS.length) * 100} 
              className="mt-4 h-2"
            />
          </CardContent>
        </Card>

        {/* Earned Achievements */}
        {earnedAchievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Earned Achievements
              </CardTitle>
              <CardDescription>Your proud accomplishments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {earnedAchievements.map((achievement) => (
                  <Card
                    key={achievement.id}
                    className="cursor-pointer hover:border-primary transition-colors bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900"
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                          {getAchievementIcon(achievement.id)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold">{achievement.name}</h4>
                            {achievement.reward?.bonus && (
                              <Badge variant="secondary" className="bg-green-600 text-white">
                                +R{achievement.reward.bonus}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Earned {format(achievement.earnedAt.toDate(), 'MMM dd, yyyy')}</span>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              <Trophy className="w-3 h-3 mr-1" />
                              {achievement.reward?.bonus || 0} pts
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-muted-foreground" />
                Locked Achievements
              </CardTitle>
              <CardDescription>Keep delivering to unlock these!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lockedAchievements.map((achievement) => {
                  const progress = getAchievementProgress(achievement.id);
                  
                  return (
                    <Card
                      key={achievement.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors opacity-75"
                      onClick={() => setSelectedAchievement(achievement)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-3 bg-muted rounded-full text-muted-foreground">
                            {getAchievementIcon(achievement.id)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-bold flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                {achievement.name}
                              </h4>
                              {achievement.reward?.bonus && (
                                <Badge variant="outline">
                                  +R{achievement.reward.bonus}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {achievement.description}
                            </p>
                            
                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{progress.label}</span>
                                <span className="font-medium">{Math.round(progress.percentage)}%</span>
                              </div>
                              <Progress value={progress.percentage} className="h-2" />
                            </div>

                            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                              <span>{achievement.category}</span>
                              <Badge variant="outline">
                                <Trophy className="w-3 h-3 mr-1" />
                              {achievement.reward?.bonus || 0} pts
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Achievements Earned */}
        {earnedAchievements.length === DRIVER_ACHIEVEMENTS.length && (
          <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-300 dark:border-yellow-800">
            <CardContent className="p-6 text-center">
              <Trophy className="w-16 h-16 mx-auto text-yellow-600 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Achievement Master! 🎉</h3>
              <p className="text-muted-foreground">
                You've unlocked all available achievements! You're a delivery superstar!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Achievement Details Dialog */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 rounded-full ${
                selectedAchievement?.earnedAt 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {selectedAchievement && getAchievementIcon(selectedAchievement.id)}
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {selectedAchievement?.earnedAt && <Trophy className="w-5 h-5 text-yellow-600" />}
                  {selectedAchievement?.name}
                </DialogTitle>
                <Badge variant="outline" className="mt-1">
                  {selectedAchievement?.category}
                </Badge>
              </div>
            </div>
            <DialogDescription className="text-base">
              {selectedAchievement?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Requirements */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Requirements
              </h4>
              <p className="text-sm text-muted-foreground">
                {selectedAchievement?.requirement?.description || 'Complete the specified task'}
              </p>
            </div>

            {/* Reward */}
            {selectedAchievement?.reward && (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700 dark:text-green-300">
                  <DollarSign className="w-4 h-4" />
                  Rewards
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Points</span>
                    <span className="font-medium">{selectedAchievement.reward?.bonus || 0}</span>
                  </div>
                  {selectedAchievement.reward?.bonus && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Bonus</span>
                      <span className="font-medium text-green-600">
                        R{selectedAchievement.reward.bonus}
                      </span>
                    </div>
                  )}
                  {selectedAchievement.reward?.badge && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Badge</span>
                      <Award className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Earned Status */}
            {selectedAchievement?.earnedAt ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    ✅ Earned on
                  </span>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {format(selectedAchievement.earnedAt.toDate(), 'MMMM dd, yyyy')}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <TrendingUp className="w-4 h-4" />
                  Your Progress
                </h4>
                {selectedAchievement && (() => {
                  const progress = getAchievementProgress(selectedAchievement.id);
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{progress.label}</span>
                        <span className="font-medium">{Math.round(progress.percentage)}%</span>
                      </div>
                      <Progress value={progress.percentage} className="h-2" />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
