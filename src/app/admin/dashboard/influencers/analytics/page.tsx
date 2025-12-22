'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="container py-8 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border-2 border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#3D2E17] flex items-center gap-2">
              <Crown className="h-10 w-10 text-yellow-500" />
              Influencer Program Analytics
            </h1>
            <p className="text-lg text-[#5D4E37] font-semibold mt-2">
              Program-wide performance insights
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-green-600">
              R{analyticsData.summary.totalRevenue.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              From {analyticsData.summary.totalOrders} referred orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Commissions Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-600">
              R{analyticsData.summary.totalCommissions.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {((analyticsData.summary.totalCommissions / analyticsData.summary.totalRevenue) * 100).toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Influencers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">
              {analyticsData.summary.activeInfluencers}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              of {analyticsData.summary.totalInfluencers} total
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600">
              {analyticsData.summary.avgConversionRate.toFixed(2)}%
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Across all influencers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="influencers">Influencers</TabsTrigger>
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Revenue Over Time */}
        <TabsContent value="revenue">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Revenue & Commission Trends</CardTitle>
              <CardDescription>Daily revenue generated vs commissions paid</CardDescription>
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
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Influencer Growth</CardTitle>
                <CardDescription>New influencers over time</CardDescription>
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

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Influencer status breakdown</CardDescription>
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
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Tier Distribution & Performance</CardTitle>
              <CardDescription>Influencers by tier and their contribution</CardDescription>
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
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Highest earning influencers this period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.topInfluencers.map((influencer: any, index: number) => (
                  <div 
                    key={influencer.id}
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-muted/50 to-transparent rounded-lg border"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-extrabold text-xl">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-bold text-lg">{influencer.displayName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span>{influencer.tier.toUpperCase()} Tier</span>
                        <span>•</span>
                        <span>{influencer.sales} sales</span>
                        <span>•</span>
                        <span>{influencer.conversionRate.toFixed(1)}% conversion</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-green-600">
                        R{influencer.earnings.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {influencer.commissionRate}% commission
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm">ROI Analysis</CardTitle>
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

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm">Payout Summary</CardTitle>
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

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-sm">Program Health</CardTitle>
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
