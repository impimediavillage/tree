'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Search, 
  TrendingUp, 
  DollarSign,
  Package,
  Star,
  Zap,
  Target,
  Check,
  ExternalLink,
  Copy,
  Share2,
  BarChart3,
  Loader2,
  Gift,
  Flame,
  Users,
  Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInfluencerAdMarketplace, useInfluencerSelectedAds } from '@/hooks/use-advertising';
import { influencerSelectAd } from '@/lib/advertising-utils';
import type { Advertisement } from '@/types/advertising';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';

export default function InfluencerAdMarketplacePage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'commission' | 'popularity' | 'newest' | 'revenue'>('commission');
  const [minCommission, setMinCommission] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'marketplace' | 'my-ads'>('marketplace');
  
  const { ads, loading } = useInfluencerAdMarketplace({
    searchQuery,
    sortBy,
    minCommissionRate: minCommission
  });
  
  const { selections, loading: selectionsLoading } = useInfluencerSelectedAds(currentUser?.uid);
  
  const [selectingAd, setSelectingAd] = useState<string | null>(null);
  const [selectedAdDetails, setSelectedAdDetails] = useState<any>(null);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);

  const handleSelectAd = async (ad: Advertisement) => {
    if (!currentUser?.uid) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to promote ads',
        variant: 'destructive'
      });
      return;
    }

    setSelectingAd(ad.id!);
    
    try {
      const selection = await influencerSelectAd(
        ad.id!,
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Influencer',
        'growth' // Would come from influencer profile
      );
      
      if (selection) {
        setSelectedAdDetails(selection);
        setShowTrackingDialog(true);
        
        toast({
          title: '🎉 Success!',
          description: 'You\'re now promoting this ad! Get your tracking link below.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to select ad',
        variant: 'destructive'
      });
    } finally {
      setSelectingAd(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard',
    });
  };

  const isAlreadySelected = (adId: string) => {
    return selections.some(s => s.adId === adId && s.status === 'active');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-lg opacity-50" />
                <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                  <Target className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-2">
                  🌟 Ad Marketplace
                  <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/90 text-lg">Browse & promote dispensary ads to earn commission</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-white/80 text-sm font-medium">Available Ads</p>
                <p className="text-3xl font-extrabold text-white">{ads.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-white/80 text-sm font-medium">Your Promotions</p>
                <p className="text-3xl font-extrabold text-white">{selections.length}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 space-y-1">
                <p className="text-white/80 text-sm font-medium">Total Earnings</p>
                <p className="text-3xl font-extrabold text-white">
                  R{selections.reduce((sum, s) => sum + (s.performance.totalCommission || 0), 0).toFixed(0)}
                </p>
                <div className="flex gap-3 text-xs mt-2">
                  <div className="bg-emerald-500/30 px-2 py-1 rounded">
                    <span className="text-white/70">Base: </span>
                    <span className="font-bold text-white">R{selections.reduce((sum, s) => sum + (s.performance.baseCommission || 0), 0).toFixed(0)}</span>
                  </div>
                  <div className="bg-amber-500/30 px-2 py-1 rounded">
                    <span className="text-white/70">Bonus: </span>
                    <span className="font-bold text-white">R{selections.reduce((sum, s) => sum + (s.performance.adBonus || 0), 0).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-[#5D4E37]/10">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search ads by title, dispensary..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-lg"
                  />
                </div>
              </div>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commission">💰 Highest Commission</SelectItem>
                  <SelectItem value="popularity">🔥 Most Popular</SelectItem>
                  <SelectItem value="newest">🆕 Newest First</SelectItem>
                  <SelectItem value="revenue">💵 Highest Revenue</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={minCommission.toString()} onValueChange={(value) => setMinCommission(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Commissions</SelectItem>
                  <SelectItem value="10">Min 10%</SelectItem>
                  <SelectItem value="15">Min 15%</SelectItem>
                  <SelectItem value="20">Min 20%</SelectItem>
                  <SelectItem value="25">Min 25%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(v: any) => setSelectedTab(v)}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="marketplace">
              🏪 Browse Ads ({ads.length})
            </TabsTrigger>
            <TabsTrigger value="my-ads">
              ⭐ My Promotions ({selections.length})
            </TabsTrigger>
          </TabsList>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
              </div>
            ) : ads.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-[#5D4E37]/70">No ads match your filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ads.map((ad) => {
                  const alreadySelected = isAlreadySelected(ad.id!);
                  const isSelecting = selectingAd === ad.id;
                  
                  return (
                    <Card key={ad.id} className="group relative overflow-hidden bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all border-[#5D4E37]/10">
                      {ad.isBundle && (
                        <div className="absolute top-3 right-3 z-10">
                          <Badge className="bg-purple-500 text-white border-none">
                            📦 Bundle
                          </Badge>
                        </div>
                      )}
                      
                      <div className={`absolute inset-0 bg-gradient-to-r ${
                        ad.type === 'special_deal' ? 'from-orange-500/5 to-red-500/5' :
                        ad.type === 'product_bundle' ? 'from-purple-500/5 to-pink-500/5' :
                        'from-blue-500/5 to-cyan-500/5'
                      } opacity-0 group-hover:opacity-100 transition-opacity`} />
                      
                      <CardHeader className="relative">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <CardTitle className="text-xl font-black text-[#5D4E37] line-clamp-2">
                            {ad.title}
                          </CardTitle>
                          <Badge className="bg-green-100 text-green-700 border-none shrink-0">
                            {ad.influencerCommission.rate}% 💰
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {ad.description}
                        </CardDescription>
                        <p className="text-sm font-semibold text-[#006B3E] mt-2">
                          🏪 {ad.dispensaryName}
                        </p>
                      </CardHeader>
                      
                      <CardContent className="relative space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-600 font-semibold">Views</p>
                            <p className="text-lg font-black text-blue-700">
                              {ad.analytics.impressions >= 1000
                                ? `${(ad.analytics.impressions / 1000).toFixed(1)}K`
                                : ad.analytics.impressions}
                            </p>
                          </div>
                          <div className="p-2 bg-purple-50 rounded-lg">
                            <p className="text-xs text-purple-600 font-semibold">CTR</p>
                            <p className="text-lg font-black text-purple-700">
                              {ad.analytics.ctr.toFixed(1)}%
                            </p>
                          </div>
                          <div className="p-2 bg-orange-50 rounded-lg">
                            <p className="text-xs text-orange-600 font-semibold">Sales</p>
                            <p className="text-lg font-black text-orange-700">
                              {ad.analytics.conversions}
                            </p>
                          </div>
                        </div>

                        {ad.isBundle && ad.bundleConfig && (
                          <div className="flex items-center justify-center gap-2 p-2 bg-purple-100 rounded-lg">
                            <Gift className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-bold text-purple-700">
                              Save R{ad.bundleConfig.discountAmount.toFixed(0)} ({ad.bundleConfig.discountPercent}% OFF)
                            </span>
                          </div>
                        )}

                        {ad.products && ad.products.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-[#5D4E37]/70">
                            <Package className="h-4 w-4" />
                            <span>{ad.products.length} product{ad.products.length > 1 ? 's' : ''}</span>
                          </div>
                        )}

                        <Button
                          onClick={() => handleSelectAd(ad)}
                          disabled={alreadySelected || isSelecting}
                          className={`w-full font-bold ${
                            alreadySelected
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                          }`}
                        >
                          {isSelecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Selecting...
                            </>
                          ) : alreadySelected ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Already Promoting
                            </>
                          ) : (
                            <>
                              <Zap className="mr-2 h-4 w-4" />
                              Promote This Ad
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* My Ads Tab */}
          <TabsContent value="my-ads" className="space-y-4">
            {selectionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
              </div>
            ) : selections.length === 0 ? (
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-[#5D4E37]/70 mb-4">
                    You haven't selected any ads to promote yet
                  </p>
                  <Button onClick={() => setSelectedTab('marketplace')}>
                    Browse Marketplace
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {selections.map((selection) => (
                  <Card key={selection.id} className="bg-white/90 backdrop-blur-sm shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-black text-[#5D4E37] mb-2">
                            {selection.adTitle}
                          </h3>
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-sm text-[#5D4E37]/70">🏪 {selection.dispensaryName}</span>
                            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-green-100 px-3 py-1 rounded-full border border-emerald-300">
                              <span className="text-xs font-bold text-emerald-700">
                                💰 {selection.influencerTierRate || 10}% Base
                              </span>
                              {selection.adBonusRate > 0 && (
                                <>
                                  <span className="text-emerald-600">+</span>
                                  <span className="text-xs font-bold text-amber-700">
                                    🎁 {selection.adBonusRate}% Bonus
                                  </span>
                                </>
                              )}
                              <span className="text-xs font-black text-green-800">
                                = {selection.commissionRate}% Total
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-[#5D4E37]/50 font-semibold">Views</p>
                              <p className="text-2xl font-black text-blue-600">
                                {selection.performance.impressions}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#5D4E37]/50 font-semibold">Clicks</p>
                              <p className="text-2xl font-black text-green-600">
                                {selection.performance.clicks}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#5D4E37]/50 font-semibold">Sales</p>
                              <p className="text-2xl font-black text-purple-600">
                                {selection.performance.conversions}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[#5D4E37]/50 font-semibold">Earned</p>
                              <p className="text-2xl font-black text-orange-600">
                                R{(selection.performance.totalCommission || selection.performance.commission || 0).toFixed(0)}
                              </p>
                              {selection.performance.adBonus > 0 && (
                                <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                                  +R{selection.performance.adBonus.toFixed(0)} bonus
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAdDetails(selection);
                                setShowTrackingDialog(true);
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Get Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(selection.trackingUrl)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy URL
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Tracking Dialog */}
        <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#5D4E37]">
                🎉 Your Tracking Link is Ready!
              </DialogTitle>
              <DialogDescription>
                Share this unique link to track your performance and earn commission
              </DialogDescription>
            </DialogHeader>
            
            {selectedAdDetails && (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <Label className="font-bold text-[#5D4E37] mb-2 block">
                    Your Unique Tracking URL
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedAdDetails.trackingUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button onClick={() => copyToClipboard(selectedAdDetails.trackingUrl)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <Label className="font-bold text-[#5D4E37] mb-2 block">
                    Tracking Code
                  </Label>
                  <code className="text-sm bg-white p-2 rounded block">
                    {selectedAdDetails.uniqueTrackingCode}
                  </code>
                </div>

                <div className="flex items-center justify-center p-6 bg-white rounded-lg">
                  <QRCodeSVG
                    value={selectedAdDetails.trackingUrl}
                    size={200}
                    level="H"
                  />
                </div>

                <p className="text-sm text-center text-[#5D4E37]/70">
                  📱 Share the QR code for easy mobile access
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
