'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Tv, TrendingUp, Eye, MousePointer, ShoppingCart, DollarSign, 
  Users, Store, Award, BarChart3, Calendar, CheckCircle, XCircle, Clock, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, Timestamp, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Advertisement, AdStatus } from '@/types/advertising';
import { formatDistanceToNow } from 'date-fns';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PlatformStats {
  totalAds: number;
  activeAds: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  avgCTR: number;
  avgConversionRate: number;
  topDispensaries: Array<{ id: string; name: string; revenue: number; ads: number }>;
  topInfluencers: Array<{ id: string; name: string; revenue: number; conversions: number }>;
}

const COLORS = ['#006B3E', '#3D2E17', '#FFD700', '#8B4513', '#2E8B57'];

export default function AdminAdvertisingPage() {
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalAds: 0,
    activeAds: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    avgCTR: 0,
    avgConversionRate: 0,
    topDispensaries: [],
    topInfluencers: []
  });
  const [selectedTab, setSelectedTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    fetchAdvertisingData();
  }, []);

  const fetchAdvertisingData = async () => {
    try {
      setLoading(true);

      // Fetch all ads
      const adsQuery = query(
        collection(db, 'advertisements'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const adsSnapshot = await getDocs(adsQuery);
      const adsData = adsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Advertisement));

      setAds(adsData);

      // Calculate platform stats
      const platformStats: PlatformStats = {
        totalAds: adsData.length,
        activeAds: adsData.filter(ad => ad.status === 'active').length,
        totalImpressions: adsData.reduce((sum, ad) => sum + (ad.analytics?.impressions || 0), 0),
        totalClicks: adsData.reduce((sum, ad) => sum + (ad.analytics?.clicks || 0), 0),
        totalConversions: adsData.reduce((sum, ad) => sum + (ad.analytics?.conversions || 0), 0),
        totalRevenue: adsData.reduce((sum, ad) => sum + (ad.analytics?.revenue || 0), 0),
        avgCTR: 0,
        avgConversionRate: 0,
        topDispensaries: [],
        topInfluencers: []
      };

      // Calculate averages
      if (platformStats.totalImpressions > 0) {
        platformStats.avgCTR = (platformStats.totalClicks / platformStats.totalImpressions) * 100;
      }
      if (platformStats.totalClicks > 0) {
        platformStats.avgConversionRate = (platformStats.totalConversions / platformStats.totalClicks) * 100;
      }

      // Group by dispensary
      const dispensaryMap = new Map<string, { name: string; revenue: number; ads: number }>();
      adsData.forEach(ad => {
        if (!ad.dispensaryId) return; // Skip ads without dispensary ID
        const existing = dispensaryMap.get(ad.dispensaryId) || { name: ad.dispensaryName || 'Unknown', revenue: 0, ads: 0 };
        existing.revenue += ad.analytics?.revenue || 0;
        existing.ads += 1;
        dispensaryMap.set(ad.dispensaryId, existing);
      });

      platformStats.topDispensaries = Array.from(dispensaryMap.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats(platformStats);
    } catch (error) {
      console.error('Error fetching advertising data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load advertising data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAdStatus = async (adId: string, newStatus: AdStatus) => {
    try {
      await updateDoc(doc(db, 'advertisements', adId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      });

      toast({
        title: 'Success',
        description: `Ad ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
      });

      fetchAdvertisingData();
    } catch (error) {
      console.error('Error updating ad status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ad status',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: AdStatus) => {
    const config = {
      draft: { variant: 'secondary' as const, icon: Clock, label: 'Draft' },
      active: { variant: 'default' as const, icon: CheckCircle, label: 'Active' },
      paused: { variant: 'outline' as const, icon: AlertCircle, label: 'Paused' },
      expired: { variant: 'destructive' as const, icon: XCircle, label: 'Expired' }
    };

    const { variant, icon: Icon, label } = config[status] || config.draft;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const chartData = ads.slice(0, 10).map(ad => ({
    name: ad.title.substring(0, 20),
    impressions: ad.analytics?.impressions || 0,
    clicks: ad.analytics?.clicks || 0,
    conversions: ad.analytics?.conversions || 0
  }));

  const statusData = [
    { name: 'Active', value: ads.filter(ad => ad.status === 'active').length },
    { name: 'Paused', value: ads.filter(ad => ad.status === 'paused').length },
    { name: 'Draft', value: ads.filter(ad => ad.status === 'draft').length },
    { name: 'Expired', value: ads.filter(ad => ad.status === 'expired').length }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tv className="h-8 w-8 text-primary" />
            Advertising System
          </h1>
          <p className="text-muted-foreground mt-1">Platform-wide advertising analytics and management</p>
        </div>
        <Button 
          size="lg" 
          onClick={() => router.push('/admin/dashboard/advertising/create')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Create Platform Ad
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-400/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-600" />
              Total Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{stats.totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all ads</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-400/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-blue-600" />
              Total Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgCTR.toFixed(2)}% CTR average
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-400/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
              Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{stats.totalConversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgConversionRate.toFixed(2)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-400/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">R{stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">From ad conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ads">All Ads ({ads.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="dispensaries">Top Stores</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ad Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ad Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Tv className="h-4 w-4" />
                    Total Campaigns
                  </span>
                  <span className="text-2xl font-bold">{stats.totalAds}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active Now
                  </span>
                  <span className="text-2xl font-bold text-green-600">{stats.activeAds}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Active Stores
                  </span>
                  <span className="text-2xl font-bold">{stats.topDispensaries.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Avg Performance
                  </span>
                  <span className="text-lg font-bold text-blue-600">{stats.avgCTR.toFixed(2)}% CTR</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          <div className="grid gap-4">
            {ads.map((ad) => (
              <Card key={ad.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {ad.title}
                        {getStatusBadge(ad.status)}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {ad.dispensaryName} • {ad.type}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {ad.status === 'paused' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateAdStatus(ad.id, 'active')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      {ad.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAdStatus(ad.id, 'paused')}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Impressions</p>
                      <p className="text-xl font-bold">{ad.analytics?.impressions?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clicks</p>
                      <p className="text-xl font-bold">{ad.analytics?.clicks?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CTR</p>
                      <p className="text-xl font-bold">
                        {ad.analytics?.impressions 
                          ? ((ad.analytics.clicks / ad.analytics.impressions) * 100).toFixed(2)
                          : '0.00'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conversions</p>
                      <p className="text-xl font-bold">{ad.analytics?.conversions?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-xl font-bold text-green-600">
                        R{ad.analytics?.revenue?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                  {ad.description && (
                    <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{ad.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Ads</CardTitle>
              <CardDescription>Performance comparison across campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="impressions" fill="#006B3E" name="Impressions" />
                  <Bar dataKey="clicks" fill="#3D2E17" name="Clicks" />
                  <Bar dataKey="conversions" fill="#FFD700" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Dispensaries Tab */}
        <TabsContent value="dispensaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Top Performing Stores
              </CardTitle>
              <CardDescription>Stores ranked by advertising revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topDispensaries.map((dispensary, index) => (
                  <div key={dispensary.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{dispensary.name}</p>
                        <p className="text-sm text-muted-foreground">{dispensary.ads} active campaigns</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">R{dispensary.revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">total revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
