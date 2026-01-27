'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, TrendingUp, Users, DollarSign, Target, Download, Crown, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function AdminInfluencerAnalyticsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/influencers/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange })
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!analyticsData) return;

    const report = {
      generated: new Date().toISOString(),
      timeRange,
      summary: analyticsData.summary,
      topInfluencers: analyticsData.topInfluencers
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `influencer-program-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    toast({
      title: 'Exported',
      description: 'Analytics report exported successfully'
    });
  };

  if (loading || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const COLORS = ['#006B3E', '#3D2E17', '#5D4E37', '#8B7355', '#A0826D'];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-lg opacity-50" />
              <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                <Crown className="h-12 w-12 text-yellow-600" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-2">
                👑 Influencer Program Analytics
              </h1>
              <p className="text-white/90 text-lg">
                Program-wide performance insights and metrics
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-48 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">📅 Last 7 Days</SelectItem>
                <SelectItem value="30d">📅 Last 30 Days</SelectItem>
                <SelectItem value="90d">📅 Last 90 Days</SelectItem>
                <SelectItem value="all">📊 All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} className="bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg">
              <Download className="h-5 w-5 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none">💰 Revenue</Badge>
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Total Revenue Generated</p>
            <div className="text-4xl font-extrabold text-white mb-2">
              R{analyticsData.summary.totalRevenue.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-sm text-white/80">
              From {analyticsData.summary.totalOrders} referred orders
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <Award className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none">🎁 Paid Out</Badge>
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Total Commissions Paid</p>
            <div className="text-4xl font-extrabold text-white mb-2">
              R{analyticsData.summary.totalCommissions.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-sm text-white/80">
              {analyticsData.summary.totalRevenue > 0 ? ((analyticsData.summary.totalCommissions / analyticsData.summary.totalRevenue) * 100).toFixed(1) : '0.0'}% of revenue
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <Users className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none">👥 Active</Badge>
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Active Influencers</p>
            <div className="text-4xl font-extrabold text-white mb-2">
              {analyticsData.summary.activeInfluencers}
            </div>
            <p className="text-sm text-white/80">
              of {analyticsData.summary.totalInfluencers} total registered
            </p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <Target className="h-8 w-8 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none">🎯 Rate</Badge>
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Avg Conversion Rate</p>
            <div className="text-4xl font-extrabold text-white mb-2">
              {analyticsData.summary.avgConversionRate.toFixed(2)}%
            </div>
            <p className="text-sm text-white/80">
              Across all active influencers
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 bg-gradient-to-r from-purple-100 to-pink-100 p-1">
          <TabsTrigger value="revenue" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 font-semibold">📊 Revenue</TabsTrigger>
          <TabsTrigger value="influencers" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 font-semibold">👥 Influencers</TabsTrigger>
          <TabsTrigger value="tiers" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 font-semibold">🏆 Tiers</TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-white data-[state=active]:text-purple-700 font-semibold">🥇 Leaderboard</TabsTrigger>
        </TabsList>

        {/* Revenue Over Time */}
        <TabsContent value="revenue">
          <Card className="border-2 border-green-300 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Revenue & Commission Trends
              </CardTitle>
              <CardDescription className="text-white/90">Daily revenue generated vs commissions paid</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `R${value.toFixed(2)}`} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#006B3E" 
                      strokeWidth={2}
                      name="Revenue Generated"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="commissions" 
                      stroke="#FF6B35" 
                      strokeWidth={2}
                      name="Commissions Paid"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Influencer Growth */}
        <TabsContent value="influencers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2 border-purple-300 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Influencer Growth
                </CardTitle>
                <CardDescription className="text-white/90">New influencers over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.influencerGrowth}>
                      <defs>
                        <linearGradient id="colorInfluencers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        fillOpacity={1} 
                        fill="url(#colorInfluencers)"
                        name="Total Influencers"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-300 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  Status Distribution
                </CardTitle>
                <CardDescription className="text-white/90">Influencer status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analyticsData.statusDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tier Distribution */}
        <TabsContent value="tiers">
          <Card className="border-2 border-yellow-300 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Award className="h-6 w-6" />
                Tier Distribution & Performance
              </CardTitle>
              <CardDescription className="text-white/90">Influencers by tier and their contribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.tierDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tier" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Influencer Count" />
                    <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue (R)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard */}
        <TabsContent value="leaderboard">
          <Card className="border-2 border-yellow-300 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 text-white">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6" />
                Top Performers
              </CardTitle>
              <CardDescription className="text-white/90">Highest earning influencers this period</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {analyticsData.topInfluencers.map((influencer: any, index: number) => (
                  <div 
                    key={influencer.id}
                    className="flex items-center gap-4 p-5 bg-gradient-to-r from-yellow-50 via-orange-50 to-white rounded-xl border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white font-extrabold text-2xl shadow-lg">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-bold text-xl text-orange-900">{influencer.displayName}</div>
                      <div className="text-sm font-semibold text-gray-600 flex items-center gap-3 mt-1">
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                          {influencer.tier.toUpperCase()} Tier
                        </Badge>
                        <span>📦 {influencer.sales} sales</span>
                        <span>🎯 {influencer.conversionRate.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        R{influencer.earnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </div>
                      <Badge className="bg-orange-100 text-orange-700 border-orange-300 mt-1">
                        {influencer.commissionRate}% commission
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-blue-300 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              📊 ROI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue Generated:</span>
                <span className="font-bold">R{analyticsData.summary.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Commissions Paid:</span>
                <span className="font-bold text-orange-600">-R{analyticsData.summary.totalCommissions.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Net Profit:</span>
                <span className="font-bold text-green-600">
                  R{(analyticsData.summary.totalRevenue - analyticsData.summary.totalCommissions).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">ROI:</span>
                <span className="font-bold text-blue-600">
                  {(((analyticsData.summary.totalRevenue - analyticsData.summary.totalCommissions) / analyticsData.summary.totalCommissions) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-300 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              💰 Payout Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Payouts:</span>
                <span className="font-bold text-orange-500">R{analyticsData.summary.pendingPayouts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed Payouts:</span>
                <span className="font-bold text-green-600">R{analyticsData.summary.completedPayouts.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Payout (Friday):</span>
                <span className="font-bold">R{analyticsData.summary.nextPayoutAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-300 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              ❤️ Program Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Rate:</span>
                <span className="font-bold">
                  {((analyticsData.summary.activeInfluencers / analyticsData.summary.totalInfluencers) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Sales/Influencer:</span>
                <span className="font-bold">
                  {(analyticsData.summary.totalOrders / analyticsData.summary.activeInfluencers).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top Tier Count:</span>
                <span className="font-bold">
                  {analyticsData.tierDistribution.find((t: any) => t.tier === 'Forest')?.count || 0} Forest
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

