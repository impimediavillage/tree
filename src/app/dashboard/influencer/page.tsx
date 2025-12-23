'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TreePine, TrendingUp, Users, Sparkles, DollarSign, Copy, Check, 
  Video, Package, Radio, Target, Calendar, Award, Zap, Share2, GraduationCap
} from 'lucide-react';
import type { InfluencerProfile, InfluencerTransaction, DailyQuest } from '@/types/influencer';
import { getCommissionRateForTier, createReferralLink } from '@/lib/influencer-utils';
import Link from 'next/link';
import { InfluencerOnboarding } from '@/components/influencer/InfluencerOnboarding';

const ONBOARDING_KEY = 'influencer_onboarding_completed';

export default function InfluencerDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<(InfluencerProfile & { id: string }) | null>(null);
  const [transactions, setTransactions] = useState<(InfluencerTransaction & { id: string })[]>([]);
  const [quests, setQuests] = useState<(DailyQuest & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadInfluencerData();
    
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      // Delay showing onboarding slightly to let page load
      setTimeout(() => setShowOnboarding(true), 500);
    }
  }, [user]);

  const loadInfluencerData = async () => {
    if (!user) return;

    try {
      // Load profile
      const profilesRef = collection(db, 'influencers');
      const q = query(profilesRef, where('userId', '==', user.uid));
      const profileSnapshot = await getDocs(q);

      if (!profileSnapshot.empty) {
        const profileDoc = profileSnapshot.docs[0];
        setProfile({ id: profileDoc.id, ...profileDoc.data() } as InfluencerProfile & { id: string });

        // Load recent commissions
        const commissionsRef = collection(db, 'influencerCommissions');
        const tq = query(
          commissionsRef, 
          where('influencerId', '==', profileDoc.id),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const commissionsSnapshot = await getDocs(tq);
        setTransactions(
          commissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InfluencerTransaction & { id: string }))
        );

        // Load active quests
        const questsRef = collection(db, 'dailyQuests');
        const qq = query(
          questsRef,
          where('influencerId', '==', profileDoc.id),
          where('expiresAt', '>', new Date())
        );
        const questsSnapshot = await getDocs(qq);
        setQuests(
          questsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyQuest & { id: string }))
        );
      }
    } catch (error) {
      console.error('Error loading influencer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleReopenOnboarding = () => {
    setShowOnboarding(true);
  };

  const getTierColor = (tier: string) => {
    const colors = {
      seed: 'bg-amber-100 text-amber-800 border-amber-300',
      sprout: 'bg-green-100 text-green-800 border-green-300',
      growth: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      bloom: 'bg-teal-100 text-teal-800 border-teal-300',
      forest: 'bg-[#006B3E] text-white border-[#006B3E]'
    };
    return colors[tier as keyof typeof colors] || colors.seed;
  };

  const getNextTierRequirement = (tier: string) => {
    const requirements = {
      seed: { sales: 11, name: 'Sprout' },
      sprout: { sales: 51, name: 'Growth' },
      growth: { sales: 101, name: 'Bloom' },
      bloom: { sales: 251, name: 'Forest' },
      forest: { sales: 0, name: 'Forest (Max)' }
    };
    return requirements[tier as keyof typeof requirements] || requirements.seed;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <TreePine className="w-16 h-16 text-[#006B3E] animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your forest...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <TreePine className="w-12 h-12 text-[#006B3E] mx-auto mb-2" />
            <CardTitle className="text-center text-[#3D2E17]">Join the Influencer Program</CardTitle>
            <CardDescription className="text-center">
              Share the wellness journey and earn commissions on every sale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-[#006B3E] hover:bg-[#005530]" asChild>
              <Link href="/dashboard/influencer/apply">Apply Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const nextTier = getNextTierRequirement(profile.tier);
  const progress = nextTier.sales > 0 ? Math.min((profile.stats.currentMonthSales / nextTier.sales) * 100, 100) : 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="bg-muted/50 rounded-lg p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#3D2E17] flex items-center gap-2">
                <TreePine className="w-8 h-8 text-[#006B3E]" />
                {profile.displayName}'s Forest
              </h1>
              <p className="text-muted-foreground mt-1">{profile.bio}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopenOnboarding}
                className="gap-2 border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white"
              >
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Training Guide</span>
              </Button>
              <Badge className={`${getTierColor(profile.tier)} text-lg px-4 py-2 border-2`}>
                <Award className="w-4 h-4 mr-2" />
                {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)} Tier
              </Badge>
            </div>
          </div>

          {/* Referral Code & Link */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background/80 rounded-lg p-4 border border-border">
              <label className="text-sm text-muted-foreground">Your Referral Code</label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-muted px-4 py-2 rounded font-mono text-lg font-bold text-[#006B3E]">
                  {profile.referralCode}
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(profile.referralCode, 'code')}
                >
                  {copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="bg-background/80 rounded-lg p-4 border border-border">
              <label className="text-sm text-muted-foreground">Your Referral Link</label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-muted px-4 py-2 rounded text-xs truncate">
                  {createReferralLink(profile.referralCode)}
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(createReferralLink(profile.referralCode), 'link')}
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  asChild
                >
                  <a 
                    href={`https://twitter.com/intent/tweet?text=Check out The Wellness Tree!&url=${encodeURIComponent(createReferralLink(profile.referralCode))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Share2 className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#006B3E]">
                R{profile.stats.totalEarnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available: R{(profile.payoutInfo?.availableBalance || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">
                {profile.stats.totalSales}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This month: {profile.stats.currentMonthSales}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Tribe Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-700">
                {profile.stats.tribeMembers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Growing your community
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Level & XP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700">
                Level {profile.stats.level}
              </div>
              <div className="mt-2">
                <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${(profile.stats.xp % 1000) / 10}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.stats.xp} XP
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tier Progress */}
        {profile.tier !== 'forest' && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-[#3D2E17] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#006B3E]" />
                Next Tier: {nextTier.name}
              </CardTitle>
              <CardDescription>
                You need {nextTier.sales - profile.stats.currentMonthSales} more sales this month to reach {nextTier.name} tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#006B3E] to-[#00AB5E] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{profile.stats.currentMonthSales} sales</span>
                  <span className="font-semibold text-[#006B3E]">{nextTier.sales} sales</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button asChild className="h-auto py-6 flex-col gap-2 bg-[#006B3E] hover:bg-[#005530]">
            <Link href="/dashboard/influencer/bundles/create">
              <Package className="w-6 h-6" />
              <span>Create Bundle</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-6 flex-col gap-2 border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white">
            <Link href="/dashboard/influencer/live-events/schedule">
              <Radio className="w-6 h-6" />
              <span>Schedule Live</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-6 flex-col gap-2 border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white">
            <Link href="/dashboard/influencer/tribe">
              <Users className="w-6 h-6" />
              <span>My Tribe</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-6 flex-col gap-2 border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white">
            <Link href="/dashboard/influencer/journey">
              <Video className="w-6 h-6" />
              <span>My Journey</span>
            </Link>
          </Button>
        </div>

        {/* Daily Quests */}
        {quests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-[#3D2E17] flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Daily Quests
              </CardTitle>
              <CardDescription>Complete quests to earn XP and level up</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quests.map((quest) => (
                <div key={quest.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-[#3D2E17]">{quest.title}</p>
                    <p className="text-sm text-muted-foreground">{quest.description}</p>
                  </div>
                  <Badge className="bg-amber-500 text-white">
                    +{quest.xpReward} XP
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-[#3D2E17]">Recent Transactions</CardTitle>
            <CardDescription>Your latest commissions and bonuses</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Start sharing your referral link to earn commissions!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-[#3D2E17] capitalize">{transaction.type.replace('-', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#006B3E]">R{transaction.amount.toFixed(2)}</p>
                      <Badge variant={transaction.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Onboarding Modal */}
      <InfluencerOnboarding
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
