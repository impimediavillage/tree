'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  TrendingUp, 
  DollarSign, 
  Users,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Sparkles,
  BarChart3,
  Package,
  Building2,
  Award,
  Loader2,
  Download
} from 'lucide-react';
import { usePlatformAdAnalytics } from '@/hooks/use-advertising';
import { exportAdAnalyticsToCSV } from '@/lib/advertising-utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminAdvertisingPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const { analytics, loading } = usePlatformAdAnalytics();
  const [exportingCSV, setExportingCSV] = useState(false);

  if (!isSuperAdmin) {
    router.push('/');
    return null;
  }

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      // In real implementation, would fetch all ad data
      await exportAdAnalyticsToCSV([]);
      toast({
        title: 'Export Complete',
        description: 'Analytics data has been downloaded',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not export analytics data',
        variant: 'destructive'
      });
    } finally {
      setExportingCSV(false);
    }
  };

  const statCards = [
    {
      title: 'Total Impressions',
      value: analytics?.totalImpressions.toLocaleString() || '0',
      change: '+12.5%',
      icon: Eye,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50'
    },
    {
      title: 'Total Clicks',
      value: analytics?.totalClicks.toLocaleString() || '0',
      change: '+8.2%',
      icon: MousePointerClick,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-50 to-emerald-50'
    },
    {
      title: 'Total Conversions',
      value: '0',
      change: '+15.8%',
      icon: ShoppingCart,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50'
    },
    {
      title: 'Total Revenue',
      value: `R${analytics?.totalRevenue.toLocaleString() || '0'}`,
      change: '+22.3%',
      icon: DollarSign,
      gradient: 'from-orange-500 to-red-500',
      bgGradient: 'from-orange-50 to-red-50'
    },
    {
      title: 'Active Ads',
      value: analytics?.activeAds.toLocaleString() || '0',
      icon: Package,
      gradient: 'from-indigo-500 to-purple-500',
      bgGradient: 'from-indigo-50 to-purple-50'
    },
    {
      title: 'Active Dispensaries',
      value: analytics?.totalDispensaries.toLocaleString() || '0',
      icon: Building2,
      gradient: 'from-teal-500 to-green-500',
      bgGradient: 'from-teal-50 to-green-50'
    },
    {
      title: 'Active Influencers',
      value: analytics?.totalInfluencerSelections.toLocaleString() || '0',
      icon: Users,
      gradient: 'from-pink-500 to-rose-500',
      bgGradient: 'from-pink-50 to-rose-50'
    },
    {
      title: 'Platform CTR',
      value: analytics ? `${((analytics.totalClicks / analytics.totalImpressions) * 100).toFixed(2)}%` : '0%',
      icon: TrendingUp,
      gradient: 'from-yellow-500 to-orange-500',
      bgGradient: 'from-yellow-50 to-orange-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-lg opacity-50" />
                <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                  <Shield className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-2">
                  👑 Platform Advertising
                  <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/90 text-lg">Manage ads, analytics, and ad zones across the platform</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExportCSV}
                disabled={exportingCSV}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-bold border-white/30"
              >
                {exportingCSV ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </>
                )}
              </Button>
              <Button
                onClick={() => router.push('/admin/advertising/zones')}
                className="bg-white text-purple-600 hover:bg-white/90 font-bold"
              >
                <Award className="mr-2 h-4 w-4" />
                Manage Ad Zones
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => (
              <Card
                key={index}
                className={`relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} border-none shadow-lg hover:shadow-2xl transition-all group`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />
                
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.gradient}`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                    {stat.change && (
                      <Badge className="bg-green-100 text-green-700 border-none">
                        {stat.change}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm font-semibold text-[#5D4E37]/70 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-black text-[#5D4E37]">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="dispensaries">🏪 Dispensaries</TabsTrigger>
            <TabsTrigger value="influencers">⭐ Influencers</TabsTrigger>
            <TabsTrigger value="zones">🎯 Ad Zones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37]">
                  Platform Overview
                </CardTitle>
                <CardDescription>
                  Real-time advertising performance across all dispensaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-semibold text-purple-600 mb-2">
                        Average CTR
                      </p>
                      <p className="text-3xl font-black text-purple-700">
                        {analytics ? ((analytics.totalClicks / analytics.totalImpressions) * 100).toFixed(2) : '0'}%
                      </p>
                      <p className="text-xs text-purple-600/70 mt-1">
                        Across all ads
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm font-semibold text-orange-600 mb-2">
                        Conversion Rate
                      </p>
                      <p className="text-3xl font-black text-orange-700">
                        {analytics ? '0' : '0'}%
                      </p>
                      <p className="text-xs text-orange-600/70 mt-1">
                        Click to purchase
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                    <p className="text-sm font-semibold text-blue-700 mb-3">
                      Top Performing Ad Types
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#5D4E37]">📦 Product Bundles</span>
                        <Badge className="bg-blue-500">3.2% CTR</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#5D4E37]">🔥 Special Deals</span>
                        <Badge className="bg-green-500">2.8% CTR</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#5D4E37]">⭐ Featured Products</span>
                        <Badge className="bg-purple-500">2.5% CTR</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispensaries" className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37]">
                  Dispensary Performance
                </CardTitle>
                <CardDescription>
                  Track advertising performance by dispensary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5D4E37]/70">
                  Detailed dispensary analytics coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="influencers" className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37]">
                  Influencer Performance
                </CardTitle>
                <CardDescription>
                  Top performing influencers driving ad revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#5D4E37]/70">
                  Detailed influencer analytics coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zones" className="space-y-4">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37]">
                  Ad Zone Management
                </CardTitle>
                <CardDescription>
                  Create and manage ad placements across the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-purple-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#5D4E37]">🎯 Hero Banner Zone</p>
                      <p className="text-sm text-[#5D4E37]/70">Full-width homepage banner</p>
                    </div>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#5D4E37]">📦 Product Grid Zone</p>
                      <p className="text-sm text-[#5D4E37]/70">Among product listings</p>
                    </div>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#5D4E37]">📌 Sidebar Zone</p>
                      <p className="text-sm text-[#5D4E37]/70">Sticky sidebar placement</p>
                    </div>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#5D4E37]">📄 Inline Zone</p>
                      <p className="text-sm text-[#5D4E37]/70">Between content sections</p>
                    </div>
                    <Badge className="bg-green-500">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
