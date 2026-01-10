'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Zap, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  BarChart3,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { useDispensaryAds, useAdAnalytics } from '@/hooks/use-advertising';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DispensaryAdvertisingPage() {
  const { currentUser, currentDispensary, isDispensaryOwner, canAccessDispensaryPanel } = useAuth();
  const router = useRouter();
  const { ads, loading: adsLoading } = useDispensaryAds(currentDispensary?.id);
  const { analytics, loading: analyticsLoading } = useAdAnalytics(currentDispensary?.id);
  
  const [selectedTab, setSelectedTab] = useState<'active' | 'scheduled' | 'drafts' | 'ended'>('active');

  useEffect(() => {
    if (!isDispensaryOwner || !canAccessDispensaryPanel) {
      router.push('/dispensary-admin/dashboard');
    }
  }, [isDispensaryOwner, canAccessDispensaryPanel, router]);

  if (!isDispensaryOwner || !canAccessDispensaryPanel) {
    return null;
  }

  const activeAds = ads.filter(ad => ad.status === 'active');
  const scheduledAds = ads.filter(ad => ad.status === 'scheduled');
  const draftAds = ads.filter(ad => ad.status === 'draft');
  const endedAds = ads.filter(ad => ad.status === 'ended');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-lg opacity-50" />
                <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                  <Sparkles className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-2">
                  📢 Ad Campaign Studio
                  <Zap className="h-8 w-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/90 text-lg">Create magical ads & connect with influencers</p>
              </div>
            </div>
            
            <Link href="/dispensary-admin/advertising/create">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-white/90 font-bold shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-5 w-5 mr-2" />
                Create New Ad
              </Button>
            </Link>
          </div>
        </div>

        {/* Performance Dashboard */}
        {!analyticsLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Impressions */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">
                    👁️ Views
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white/80 mb-2">Total Impressions</p>
                <div className="text-4xl font-extrabold text-white mb-2">
                  {analytics.totalImpressions.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-white/90">
                  <span className="text-sm">
                    {analytics.averageCTR.toFixed(2)}% CTR
                  </span>
                </div>
              </div>
            </div>

            {/* Total Clicks */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">
                    🖱️ Clicks
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white/80 mb-2">Total Clicks</p>
                <div className="text-4xl font-extrabold text-white mb-2">
                  {analytics.totalClicks.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-white/90">
                  <span className="text-sm">
                    {analytics.averageConversionRate.toFixed(2)}% Convert
                  </span>
                </div>
              </div>
            </div>

            {/* Conversions */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">
                    🎯 Sales
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white/80 mb-2">Conversions</p>
                <div className="text-4xl font-extrabold text-white mb-2">
                  {analytics.totalConversions.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-white/90">
                  <span className="text-sm">
                    From {activeAds.length} ads
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">
                    💰 Money
                  </Badge>
                </div>
                <p className="text-sm font-medium text-white/80 mb-2">Total Revenue</p>
                <div className="text-4xl font-extrabold text-white mb-2">
                  R{Math.round(analytics.totalRevenue).toLocaleString()}
                </div>
                <div className="flex items-center gap-1 text-white/90">
                  <span className="text-sm">
                    R{Math.round(analytics.totalInfluencerRevenue)} from influencers
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ad Management Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-[#5D4E37]/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-[#5D4E37]">Your Ad Campaigns</h2>
            <div className="flex gap-2">
              {(['active', 'scheduled', 'drafts', 'ended'] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={selectedTab === tab ? 'default' : 'outline'}
                  onClick={() => setSelectedTab(tab)}
                  className="capitalize"
                >
                  {tab === 'active' && '🟢'}
                  {tab === 'scheduled' && '📅'}
                  {tab === 'drafts' && '📝'}
                  {tab === 'ended' && '⏹️'}
                  {' '}{tab} ({
                    tab === 'active' ? activeAds.length :
                    tab === 'scheduled' ? scheduledAds.length :
                    tab === 'drafts' ? draftAds.length :
                    endedAds.length
                  })
                </Button>
              ))}
            </div>
          </div>

          {adsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
            </div>
          ) : (
            <div className="space-y-4">
              {selectedTab === 'active' && activeAds.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No active ads yet. Create your first ad campaign to start driving sales!
                  </AlertDescription>
                </Alert>
              )}
              
              {selectedTab === 'active' && activeAds.map(ad => (
                <AdCampaignCard key={ad.id} ad={ad} />
              ))}
              
              {selectedTab === 'scheduled' && scheduledAds.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No scheduled ads. Schedule ads to go live automatically!
                  </AlertDescription>
                </Alert>
              )}
              
              {selectedTab === 'drafts' && draftAds.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No draft ads. Start creating an ad to save it as a draft!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Ad Campaign Card Component
function AdCampaignCard({ ad }: { ad: any }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white border border-[#5D4E37]/10 p-6 shadow-md hover:shadow-xl transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-[#5D4E37]">{ad.title}</h3>
            <Badge className="bg-green-100 text-green-700 border-none">
              {ad.type.replace('_', ' ').toUpperCase()}
            </Badge>
            {ad.isBundle && (
              <Badge className="bg-purple-100 text-purple-700 border-none">
                📦 Bundle
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#5D4E37]/70 mb-4 line-clamp-2">{ad.description}</p>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-[#5D4E37]/50 font-semibold">Impressions</p>
              <p className="text-lg font-black text-[#5D4E37]">{ad.analytics.impressions.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D4E37]/50 font-semibold">Clicks</p>
              <p className="text-lg font-black text-[#006B3E]">{ad.analytics.clicks.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-[#5D4E37]/50 font-semibold">CTR</p>
              <p className="text-lg font-black text-purple-600">{ad.analytics.ctr.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-[#5D4E37]/50 font-semibold">Revenue</p>
              <p className="text-lg font-black text-orange-600">R{Math.round(ad.analytics.revenue)}</p>
            </div>
          </div>
          
          {ad.availableToInfluencers && (
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-100 text-blue-700 border-none">
                🌟 Available to Influencers
              </Badge>
              {ad.selectedByInfluencers && ad.selectedByInfluencers.length > 0 && (
                <Badge className="bg-pink-100 text-pink-700 border-none">
                  👥 {ad.selectedByInfluencers.length} influencer{ad.selectedByInfluencers.length > 1 ? 's' : ''} promoting
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Link href={`/dispensary-admin/advertising/${ad.id}`}>
            <Button size="sm" className="w-full">
              View Details
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href={`/dispensary-admin/advertising/${ad.id}/edit`}>
            <Button size="sm" variant="outline" className="w-full">
              Edit Ad
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
