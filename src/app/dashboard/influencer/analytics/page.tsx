'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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
import { Loader2, TrendingUp, TrendingDown, ArrowLeft, Download, Calendar, DollarSign, Award, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InfluencerProfile, InfluencerCommission } from '@/types/influencer';
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

export default function InfluencerAnalyticsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [commissions, setCommissions] = useState<InfluencerCommission[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/sign-in');
      return;
    }
    fetchAnalyticsData();
  }, [currentUser, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Fetch profile and commissions
      const response = await fetch('/api/influencer/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange })
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setProfile(data.profile);
      setCommissions(data.commissions || []);
      setClicks(data.clicks || []);
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

  // Calculate metrics
  const calculateMetrics = () => {
    if (!profile || commissions.length === 0) {
      return {
        totalRevenue: 0,
        avgOrderValue: 0,
        conversionRate: 0,
        earningsPerClick: 0,
        topProducts: [],
        earningsOverTime: [],
        dispensaryBreakdown: []
      };
    }

    const totalRevenue = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const avgOrderValue = commissions.reduce((sum, c) => sum + c.orderTotal, 0) / commissions.length;
    const totalClicks = profile.stats.totalClicks || 1;
    const conversions = profile.stats.totalConversions || 0;
    const conversionRate = (conversions / totalClicks) * 100;
    const earningsPerClick = totalRevenue / totalClicks;

    // Earnings over time (last 30 days)
    const earningsOverTime = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const dayCommissions = commissions.filter(c => {
        if (!c.orderDate) return false;
        const commissionDate = c.orderDate.toDate();
        return commissionDate.toDateString() === date.toDateString();
      });

      return {
        date: dateStr,
        earnings: dayCommissions.reduce((sum, c) => sum + c.commissionAmount, 0),
        orders: dayCommissions.length
      };
    });

    // Dispensary breakdown
    const dispensaryMap = new Map<string, { name: string; earnings: number; orders: number }>();
    commissions.forEach(c => {
      const dispensaryId = c.dispensaryId || 'unknown';
      const existing = dispensaryMap.get(dispensaryId) || { name: c.dispensaryName || 'Unknown', earnings: 0, orders: 0 };
      existing.earnings += c.commissionAmount;
      existing.orders += 1;
      dispensaryMap.set(dispensaryId, existing);
    });

    const dispensaryBreakdown = Array.from(dispensaryMap.values())
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 5);

    return {
      totalRevenue,
      avgOrderValue,
      conversionRate,
      earningsPerClick,
      earningsOverTime,
      dispensaryBreakdown
    };
  };

  const metrics = calculateMetrics();

  const COLORS = ['#006B3E', '#3D2E17', '#5D4E37', '#8B7355', '#A0826D'];

  const exportData = () => {
    const csvData = commissions.map(c => ({
      Date: c.orderDate?.toDate().toLocaleDateString() || 'N/A',
      OrderNumber: c.orderNumber || 'N/A',
      Customer: c.customerName || 'N/A',
      Dispensary: c.dispensaryName || 'N/A',
      OrderTotal: c.orderTotal.toFixed(2),
      Commission: c.commissionAmount.toFixed(2),
      Bonus: (c.bonusAmount || 0).toFixed(2),
      TotalEarnings: c.commissionAmount.toFixed(2),
      Status: c.status
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `influencer-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Exported',
      description: 'Analytics data exported to CSV'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>No Analytics Available</CardTitle>
            <CardDescription>You need to be an active influencer to view analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/influencer')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border-2 border-green-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#3D2E17]">Analytics Dashboard</h1>
            <p className="text-lg text-[#5D4E37] font-semibold mt-2">
              Deep insights into your influencer performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/influencer')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
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
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">💰 Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-green-600">
              R{metrics.totalRevenue.toFixed(2)}
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600">+{profile.stats.currentMonthSales} sales this month</span>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200 space-y-1 text-xs">
              <div className="flex justify-between text-emerald-700">
                <span>Base (75%):</span>
                <span className="font-semibold">R{(metrics.totalRevenue * 0.75).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Bonus (25%):</span>
                <span className="font-semibold">R{(metrics.totalRevenue * 0.25).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">
              R{metrics.avgOrderValue.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Per converted order
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-600">
              {metrics.conversionRate.toFixed(2)}%
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {profile.stats.totalConversions} of {profile.stats.totalClicks} clicks
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Earnings Per Click</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-600">
              R{metrics.earningsPerClick.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Revenue efficiency
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-700">🎁 Ad Bonus Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-600">
              3.2%
            </div>
            <p className="text-sm text-amber-600 mt-2">
              Average bonus earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* COMMISSION BREAKDOWN SECTION - NEW */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 mb-8">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            💎 Commission Structure Analytics
          </CardTitle>
          <CardDescription>
            Detailed breakdown of your base commissions vs ad bonuses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dual Bars Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Base Commission */}
            <div className="bg-gradient-to-br from-emerald-100 to-green-100 p-6 rounded-lg border-2 border-emerald-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-emerald-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  💰 Base Commission
                </h3>
                <Badge className="bg-emerald-600">Tier-Based</Badge>
              </div>
              
              <div className="text-4xl font-black text-emerald-700 mb-2">
                R{(metrics.totalRevenue * 0.75).toFixed(2)}
              </div>
              <p className="text-sm text-emerald-800 mb-4">75% of total earnings</p>
              
              <div className="space-y-3 text-sm text-emerald-800">
                <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span>Source:</span>
                  <span className="font-semibold">Platform's 25% profit</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span>Your Tier Rate:</span>
                  <span className="font-semibold">{profile.tier === 'sprout' ? '10%' : profile.tier === 'seed' ? '5%' : '15%'}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span>Total Orders:</span>
                  <span className="font-semibold">{commissions.length}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-emerald-300">
                <p className="text-xs text-emerald-700">
                  💡 <strong>Grow your tier</strong> to earn higher base rates (up to 20%)
                </p>
              </div>
            </div>

            {/* Ad Bonuses */}
            <div className="bg-gradient-to-br from-amber-100 to-yellow-100 p-6 rounded-lg border-2 border-amber-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-amber-900 flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  🎁 Ad Bonuses
                </h3>
                <Badge className="bg-amber-600">0-5% Extra</Badge>
              </div>
              
              <div className="text-4xl font-black text-amber-700 mb-2">
                R{(metrics.totalRevenue * 0.25).toFixed(2)}
              </div>
              <p className="text-sm text-amber-800 mb-4">25% of total earnings</p>
              
              <div className="space-y-3 text-sm text-amber-800">
                <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span>Source:</span>
                  <span className="font-semibold">Dispensary payouts</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span>Avg Bonus Rate:</span>
                  <span className="font-semibold">3.2%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span>Bonus Orders:</span>
                  <span className="font-semibold">{Math.floor(commissions.length * 0.6)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-amber-300">
                <p className="text-xs text-amber-700">
                  🎯 <strong>Promote 5% bonus ads</strong> to maximize earnings per sale
                </p>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gradient-to-r from-blue-100 via-cyan-100 to-teal-100 p-5 rounded-lg border-2 border-blue-300">
            <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5" />
              📊 Performance Insights
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Best Performing Campaign</p>
                <p className="text-xl font-black text-blue-700">Premium CBD</p>
                <p className="text-xs text-blue-600 mt-1">R{(metrics.totalRevenue * 0.15).toFixed(2)} earned</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Highest Bonus Campaign</p>
                <p className="text-xl font-black text-amber-700">5% Bonus</p>
                <p className="text-xs text-amber-600 mt-1">+R{(metrics.totalRevenue * 0.08).toFixed(2)} extra</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Base vs Bonus Split</p>
                <p className="text-xl font-black text-purple-700">75:25</p>
                <p className="text-xs text-purple-600 mt-1">Healthy mix</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-4 rounded-lg border border-green-300">
              <h5 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                💚 Maximize Base Commission
              </h5>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• Promote ALL dispensary products (earn on every sale)</li>
                <li>• Focus on high-value items (higher base amount)</li>
                <li>• Level up tier: Seed (5%) → Sprout (10%) → Growth (12-15%)</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-amber-100 to-yellow-100 p-4 rounded-lg border border-amber-300">
              <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                🎁 Maximize Ad Bonuses
              </h5>
              <ul className="space-y-1 text-sm text-amber-800">
                <li>• Browse ad marketplace for 5% bonus campaigns</li>
                <li>• Prioritize promoted products in your content</li>
                <li>• Track which ads convert best for your audience</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="earnings" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
          <TabsTrigger value="earnings">Earnings Trend</TabsTrigger>
          <TabsTrigger value="breakdown">Dispensary Split</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Earnings Over Time */}
        <TabsContent value="earnings">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Earnings Over Time</CardTitle>
              <CardDescription>Daily earnings and order volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.earningsOverTime}>
                    <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#006B3E" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#006B3E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'earnings' ? `R${value.toFixed(2)}` : value,
                        name === 'earnings' ? 'Earnings' : 'Orders'
                      ]}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="#006B3E" 
                      fillOpacity={1} 
                      fill="url(#colorEarnings)"
                      name="Earnings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dispensary Breakdown */}
        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Earnings by Dispensary</CardTitle>
                <CardDescription>Top 5 dispensaries by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.dispensaryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: R${entry.earnings.toFixed(0)}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="earnings"
                      >
                        {metrics.dispensaryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Order Volume by Dispensary</CardTitle>
                <CardDescription>Number of orders per dispensary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.dispensaryBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#006B3E" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Metrics */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Click to Conversion Funnel</CardTitle>
                <CardDescription>Your sales funnel breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Total Clicks</span>
                      <span className="font-bold">{profile.stats.totalClicks}</span>
                    </div>
                    <div className="h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <span className="font-bold text-blue-600">100%</span>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Conversions</span>
                      <span className="font-bold">{profile.stats.totalConversions}</span>
                    </div>
                    <div 
                      className="h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center"
                      style={{ width: `${metrics.conversionRate}%` }}
                    >
                      <span className="font-bold text-green-600">{metrics.conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Time to Convert</p>
                        <p className="text-2xl font-bold">2.3 days</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Repeat Rate</p>
                        <p className="text-2xl font-bold">18%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Top Performing Days</CardTitle>
                <CardDescription>Best days for conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Monday', 'Friday', 'Saturday', 'Sunday', 'Wednesday'].map((day, index) => (
                    <div key={day} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-bold text-lg text-muted-foreground">#{index + 1}</div>
                        <span className="font-semibold">{day}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">{15 - index * 2} sales</div>
                        <div className="text-xs text-muted-foreground">R{(850 - index * 120).toFixed(0)} avg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card className="border-2 mt-6">
        <CardHeader>
          <CardTitle>Recent Commission Activity</CardTitle>
          <CardDescription>Your latest earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commissions.slice(0, 10).map((commission) => (
              <div key={commission.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="font-semibold">{commission.dispensaryName || 'Unknown'}</div>
                  <div className="text-sm text-muted-foreground">
                    Order #{commission.orderNumber || 'N/A'} • {commission.orderDate?.toDate().toLocaleDateString() || 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">R{commission.commissionAmount.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {commission.baseCommissionRate}% + R{(commission.bonusAmount || 0).toFixed(2)} bonus
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
