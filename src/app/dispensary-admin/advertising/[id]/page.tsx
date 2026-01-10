'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit,
  Pause, 
  Play,
  Trash2,
  Download,
  Eye,
  MousePointerClick,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Sparkles,
  Award,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useRealtimeAd, useAdAnalytics } from '@/hooks/use-advertising';
import { exportAdAnalyticsToCSV, getPerformanceBadge, calculateAdPerformanceScore } from '@/lib/advertising-utils';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { currentUser, isDispensaryOwner } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const { ad, loading: adLoading } = useRealtimeAd(resolvedParams.id);
  const { analytics, loading: analyticsLoading } = useAdAnalytics(resolvedParams.id);
  
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (!isDispensaryOwner) {
    router.push('/');
    return null;
  }

  const handleToggleStatus = async () => {
    if (!ad) return;
    
    setUpdating(true);
    try {
      const newStatus = ad.status === 'active' ? 'paused' : 'active';
      await updateDoc(doc(db, 'advertisements', resolvedParams.id), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      toast({
        title: `Ad ${newStatus === 'active' ? 'Activated' : 'Paused'}`,
        description: `Your ad is now ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update ad status',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleExport = async () => {
    if (!ad) return;
    
    setExporting(true);
    try {
      await exportAdAnalyticsToCSV([ad]);
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
      setExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard',
    });
  };

  if (adLoading || !ad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  // Calculate performance score
  const impressions = ad.analytics.impressions;
  const clicks = ad.analytics.clicks;
  const conversions = ad.analytics.conversions;
  const ctr = ad.analytics.ctr;
  
  // Simple performance score based on engagement
  const performanceScore = (
    (impressions > 0 ? Math.min(impressions / 1000, 20) : 0) +
    (clicks > 0 ? Math.min(clicks / 100, 30) : 0) +
    (conversions > 0 ? Math.min(conversions / 10, 30) : 0) +
    (ctr * 2)
  );
  
  const performanceBadge = getPerformanceBadge(performanceScore);
  
  // Mock data for charts (in production, would come from Firestore aggregation)
  const dailyData = [
    { date: 'Mon', impressions: 450, clicks: 32, conversions: 5 },
    { date: 'Tue', impressions: 520, clicks: 41, conversions: 7 },
    { date: 'Wed', impressions: 680, clicks: 54, conversions: 9 },
    { date: 'Thu', impressions: 590, clicks: 47, conversions: 8 },
    { date: 'Fri', impressions: 750, clicks: 67, conversions: 12 },
    { date: 'Sat', impressions: 890, clicks: 89, conversions: 15 },
    { date: 'Sun', impressions: 720, clicks: 72, conversions: 11 },
  ];

  const placementData = [
    { name: 'Hero Banner', value: 45 },
    { name: 'Product Grid', value: 30 },
    { name: 'Sidebar', value: 15 },
    { name: 'Inline', value: 10 },
  ];

  const COLORS = ['#667eea', '#f093fb', '#4facfe', '#43e97b'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="font-bold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Ads
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dispensary-admin/advertising/${resolvedParams.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              onClick={handleToggleStatus}
              disabled={updating}
              className={ad.status === 'active' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}
            >
              {updating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : ad.status === 'active' ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {ad.status === 'active' ? 'Pause' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Ad Info Card */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-black text-[#5D4E37] mb-2">
                  {ad.title}
                </CardTitle>
                <CardDescription className="text-lg">
                  {ad.description}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <Badge className={
                  ad.status === 'active' ? 'bg-green-500' :
                  ad.status === 'paused' ? 'bg-orange-500' :
                  ad.status === 'scheduled' ? 'bg-blue-500' :
                  'bg-gray-500'
                }>
                  {ad.status.toUpperCase()}
                </Badge>
                <Badge className="bg-purple-500">
                  {performanceBadge.name}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-[#5D4E37]/70 mb-1">Ad Type</p>
                <p className="text-lg font-bold text-[#5D4E37]">{ad.type.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#5D4E37]/70 mb-1">Campaign Dates</p>
                <p className="text-lg font-bold text-[#5D4E37]">
                  {ad.startDate.toDate().toLocaleDateString()} - {ad.endDate?.toDate().toLocaleDateString() || 'Ongoing'}
                </p>
              </div>
              {ad.isBundle && ad.bundleConfig && (
                <>
                  <div>
                    <p className="text-sm font-semibold text-[#5D4E37]/70 mb-1">Bundle Savings</p>
                    <p className="text-lg font-bold text-green-600">
                      R{ad.bundleConfig.discountAmount.toFixed(0)} ({ad.bundleConfig.discountPercent}% OFF)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#5D4E37]/70 mb-1">Products</p>
                    <p className="text-lg font-bold text-[#5D4E37]">{ad.products?.length || 0} items</p>
                  </div>
                </>
              )}
            </div>

            {ad.ctaLink && (
              <div className="p-3 bg-purple-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-mono text-purple-700">{ad.ctaLink}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(ad.ctaLink!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-blue-600 mb-1">Impressions</p>
              <p className="text-3xl font-black text-blue-700">{ad.analytics.impressions.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <MousePointerClick className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-green-600 mb-1">Clicks</p>
              <p className="text-3xl font-black text-green-700">{ad.analytics.clicks.toLocaleString()}</p>
              <p className="text-xs text-green-600/70 mt-1">{ad.analytics.ctr.toFixed(2)}% CTR</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-purple-600 mb-1">Conversions</p>
              <p className="text-3xl font-black text-purple-700">{ad.analytics.conversions.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-sm font-semibold text-orange-600 mb-1">Revenue</p>
              <p className="text-3xl font-black text-orange-700">R{ad.analytics.revenue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black text-[#5D4E37]">
                📈 Performance Trend
              </CardTitle>
              <CardDescription>Daily impressions, clicks, and conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="impressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="clicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#43e97b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#43e97b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="impressions" stroke="#667eea" fillOpacity={1} fill="url(#impressions)" />
                  <Area type="monotone" dataKey="clicks" stroke="#43e97b" fillOpacity={1} fill="url(#clicks)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black text-[#5D4E37]">
                🎯 Placement Performance
              </CardTitle>
              <CardDescription>Clicks by placement</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={placementData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {placementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Influencer Performance (if applicable) */}
        {ad.availableToInfluencers && ad.selectedByInfluencers && ad.selectedByInfluencers.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black text-[#5D4E37] flex items-center gap-2">
                <Users className="h-6 w-6" />
                Influencer Performance
              </CardTitle>
              <CardDescription>
                {ad.selectedByInfluencers.length} influencer{ad.selectedByInfluencers.length > 1 ? 's' : ''} promoting this ad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#5D4E37]/70">
                Detailed influencer breakdown available in full analytics
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
