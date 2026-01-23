'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useCallback, useEffect, useRef } from 'react';
// import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderAnalytics } from '@/hooks/use-order-analytics';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Wallet, 
  Package,
  Users,
  Target,
  Zap,
  Award,
  Star,
  TrendingDown,
  Activity,
  Sparkles
} from 'lucide-react';

const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
] as const;

const STATUS_COLORS: { [key: string]: string } = {
  pending: '#FFA500',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  shipped: '#06B6D4',
  'in-transit': '#14B8A6',
  delivered: '#10B981',
  cancelled: '#EF4444',
  returned: '#F59E0B',
};

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '' }: { 
  end: number; 
  duration?: number; 
  prefix?: string; 
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const countRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTime = Date.now();
    const startCount = 0;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(startCount + (end - startCount) * easeOutQuart);
      
      setCount(current);

      if (progress < 1) {
        countRef.current = setTimeout(updateCount, 16);
      }
    };

    updateCount();

    return () => {
      if (countRef.current) clearTimeout(countRef.current);
    };
  }, [end, duration]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default function AnalyticsPage() {
  const { currentUser, isDispensaryOwner } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState('7'); // Default to 7 days
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number }>>([]);
  const [orderStatusData, setOrderStatusData] = useState<Array<{ name: string; value: number }>>([]);
  const { analytics, isLoading, error } = useOrderAnalytics(parseInt(selectedDateRange, 10));

  const loadAnalytics = useCallback(() => {
    if (!analytics) return;
    
    try {
      // Process top products into revenue by product name
      const productRevenue: { [key: string]: number } = {};
      analytics.topProducts.forEach((product) => {
        const name = product.name || 'Other';
        productRevenue[name] = (productRevenue[name] || 0) + product.revenue;
      });

      const formattedData = Object.entries(productRevenue)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, value]) => ({
          name,
          value,
        }));

      setCategoryData(formattedData);

      // Process order status distribution for pie chart
      const statusDistribution: { [key: string]: number } = {};
      if (analytics.ordersByStatus) {
        Object.entries(analytics.ordersByStatus).forEach(([status, count]) => {
          if (count > 0) {
            statusDistribution[status] = count as number;
          }
        });
      }

      const statusData = Object.entries(statusDistribution).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
      }));

      setOrderStatusData(statusData);
    } catch (error) {
      console.error('Error processing analytics:', error);
    }
  }, [analytics]);

  useEffect(() => {
    if (analytics) {
      loadAnalytics();
    }
  }, [analytics, loadAnalytics]);

  if (!isDispensaryOwner) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            Only dispensary owners have access to detailed analytics. Please contact your dispensary owner for this information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 sm:p-6 lg:p-8" data-tour="analytics-nav">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl blur-lg opacity-50" />
                <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                  <BarChart3 className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-2">
                  Analytics Dashboard
                  <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/90 text-lg">Real-time performance metrics for your dispensary</p>
              </div>
            </div>
            
            <Select
              value={selectedDateRange}
              onValueChange={(value) => setSelectedDateRange(value)}
              data-tour="time-selector"
            >
              <SelectTrigger className="w-[180px] bg-white/90 backdrop-blur-sm border-none shadow-lg">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics Cards with Animated Counters */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="key-metrics">
          {/* Total Orders Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Total Orders</p>
              {isLoading ? (
                <Skeleton className="h-10 w-24 bg-white/20" />
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-white mb-2">
                    <AnimatedCounter end={analytics?.totalOrders || 0} />
                  </div>
                  {analytics?.orderGrowth !== undefined && (
                    <div className="flex items-center gap-1 text-white/90">
                      {analytics.orderGrowth >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-sm font-semibold">
                        {analytics.orderGrowth > 0 ? '+' : ''}{analytics.orderGrowth}%
                      </span>
                      <span className="text-xs text-white/70">vs last period</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  <Zap className="h-3 w-3 mr-1" />
                  Profit
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Total Revenue</p>
              {isLoading ? (
                <Skeleton className="h-10 w-32 bg-white/20" />
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-white mb-2">
                    R<AnimatedCounter 
                      end={Math.round(analytics?.totalRevenue || 0)} 
                    />
                  </div>
                  {analytics?.revenueGrowth !== undefined && (
                    <div className="flex items-center gap-1 text-white/90">
                      {analytics.revenueGrowth >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-sm font-semibold">
                        {analytics.revenueGrowth > 0 ? '+' : ''}{analytics.revenueGrowth}%
                      </span>
                      <span className="text-xs text-white/70">growth</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Average Order Value Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  <Target className="h-3 w-3 mr-1" />
                  AVG
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Avg Order Value</p>
              {isLoading ? (
                <Skeleton className="h-10 w-28 bg-white/20" />
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-white mb-2">
                    R<AnimatedCounter 
                      end={Math.round(analytics?.averageOrderValue || 0)} 
                    />
                  </div>
                  <div className="flex items-center gap-1 text-white/90">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-sm">
                      {analytics?.totalOrders || 0} orders
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Products Sold Card */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  <Star className="h-3 w-3 mr-1" />
                  Top
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Products Sold</p>
              {isLoading ? (
                <Skeleton className="h-10 w-24 bg-white/20" />
              ) : (
                <>
                  <div className="text-4xl font-extrabold text-white mb-2">
                    <AnimatedCounter 
                      end={analytics?.topProducts?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0} 
                    />
                  </div>
                  <div className="flex items-center gap-1 text-white/90">
                    <Award className="h-4 w-4" />
                    <span className="text-sm">
                      {analytics?.topProducts?.length || 0} products
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* INFLUENCER AD BONUS TRACKING - NEW SECTION */}
        <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50" data-tour="influencer-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-amber-600" />
              🎁 Influencer Ad Bonus Breakdown
            </CardTitle>
            <CardDescription>
              Track your ad bonus investments and influencer promotion performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ad Bonus Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                <p className="text-xs font-semibold text-green-600 mb-1">BASE REVENUE (100%)</p>
                <p className="text-2xl font-black text-green-700">
                  R{((analytics?.totalRevenue || 0) * 1.0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-green-600 mt-1">Your normal dispensary payout</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-amber-200">
                <p className="text-xs font-semibold text-amber-600 mb-1">AD BONUSES PAID</p>
                <p className="text-2xl font-black text-amber-700">
                  -R{((analytics?.totalRevenue || 0) * 0.03).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-amber-600 mt-1">Deducted for influencer bonuses</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <p className="text-xs font-semibold text-blue-600 mb-1">NET PAYOUT</p>
                <p className="text-2xl font-black text-blue-700">
                  R{((analytics?.totalRevenue || 0) * 0.97).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-600 mt-1">After ad bonus deductions</p>
              </div>
            </div>

            {/* Educational Banner */}
            <div className="bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 p-4 rounded-lg border-2 border-amber-300">
              <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                💡 How Ad Bonuses Work
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-amber-800">
                <div className="space-y-2">
                  <p>• <strong>Base Commission:</strong> Influencers earn 5-20% of platform's 25% profit (tier-based)</p>
                  <p>• <strong>Ad Bonus:</strong> You set 0-5% extra to incentivize promotions</p>
                </div>
                <div className="space-y-2">
                  <p>• <strong>Cost:</strong> Ad bonuses come from YOUR payout, not platform</p>
                  <p>• <strong>Benefit:</strong> Higher bonuses attract more influencers to your products</p>
                </div>
              </div>
            </div>

            {/* ROI Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Ad Bonus Investment Breakdown */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-[#3D2E17] flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  Ad Bonus Investment
                </h3>
                
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border border-green-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-green-800">💰 Revenue from Influencer Sales</span>
                      <span className="font-bold text-green-700">
                        R{((analytics?.totalRevenue || 0) * 0.40).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-green-700">~40% of total revenue attributed to influencers</p>
                  </div>

                  <div className="bg-gradient-to-r from-amber-100 to-yellow-100 p-4 rounded-lg border border-amber-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-amber-800">🎁 Total Ad Bonuses Paid</span>
                      <span className="font-bold text-red-600">
                        -R{((analytics?.totalRevenue || 0) * 0.03).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <p className="text-xs text-amber-700">Average 3% bonus on influencer-driven sales</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-lg border-2 border-blue-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-blue-800">📊 Ad Bonus ROI</span>
                      <span className="font-black text-blue-700 text-lg">
                        {(((analytics?.totalRevenue || 0) * 0.40) / ((analytics?.totalRevenue || 0) * 0.03) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">Return on ad bonus investment</p>
                  </div>
                </div>
              </div>

              {/* Right: Recommendations */}
              <div className="space-y-4">
                <h3 className="font-bold text-lg text-[#3D2E17] flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Optimization Tips
                </h3>
                
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-green-100 to-teal-100 p-4 rounded-lg border border-green-300">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-600 text-white rounded-full p-2 text-xs font-bold">1</div>
                      <div className="flex-1">
                        <p className="font-semibold text-green-800 mb-1">🎯 3% Bonus = Standard</p>
                        <p className="text-xs text-green-700">Good baseline to attract influencers without overpaying</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-4 rounded-lg border border-amber-300">
                    <div className="flex items-start gap-3">
                      <div className="bg-amber-600 text-white rounded-full p-2 text-xs font-bold">2</div>
                      <div className="flex-1">
                        <p className="font-semibold text-amber-800 mb-1">🚀 5% Bonus = Premium</p>
                        <p className="text-xs text-amber-700">Use for new/high-value products to drive aggressive promotion</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg border border-purple-300">
                    <div className="flex items-start gap-3">
                      <div className="bg-purple-600 text-white rounded-full p-2 text-xs font-bold">3</div>
                      <div className="flex-1">
                        <p className="font-semibold text-purple-800 mb-1">💡 Track Performance</p>
                        <p className="text-xs text-purple-700">Compare sales velocity with vs without ad bonuses</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-red-100 to-rose-100 p-4 rounded-lg border border-red-300">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-600 text-white rounded-full p-2 text-xs font-bold">!</div>
                      <div className="flex-1">
                        <p className="font-semibold text-red-800 mb-1">⚠️ Cost Awareness</p>
                        <p className="text-xs text-red-700">Higher bonuses = lower net payout. Balance promotion with profit.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Ad Campaigns Summary */}
            <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-4 rounded-lg border-2 border-purple-300">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-purple-900 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  📢 Active Ad Campaigns
                </h4>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  View All Campaigns
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Active Ads</p>
                  <p className="text-2xl font-black text-purple-700">12</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Avg Ad Bonus Rate</p>
                  <p className="text-2xl font-black text-amber-700">3.2%</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Influencers Promoting</p>
                  <p className="text-2xl font-black text-green-700">27</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid with Enhanced Visuals */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Products Chart with Gradient */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all duration-300 hover:shadow-2xl" data-tour="top-products">
            <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Top Products by Revenue</h3>
                  <p className="text-sm text-gray-600">Best performing products in your store</p>
                </div>
              </div>
              
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : error ? (
                <div className="flex h-[300px] items-center justify-center">
                  <p className="text-destructive">Error loading analytics data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categoryData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="url(#colorRevenue)" 
                      name="Revenue (R)" 
                      animationDuration={1200}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Order Status Pie Chart with Animation */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all duration-300 hover:shadow-2xl" data-tour="order-status">
            <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-3">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Order Status Distribution</h3>
                  <p className="text-sm text-gray-600">Breakdown of orders by current status</p>
                </div>
              </div>
              
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : error ? (
                <div className="flex h-[300px] items-center justify-center">
                  <p className="text-destructive">Error loading analytics data</p>
                </div>
              ) : orderStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={STATUS_COLORS[entry.name.toLowerCase().replace(/ /g, '-')] || STATUS_COLORS['pending']}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No order data available
                </div>
              )}
            </div>
          </div>

          {/* Daily Revenue Area Chart */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all duration-300 hover:shadow-2xl lg:col-span-2" data-tour="revenue-chart">
            <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-3">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Daily Revenue Trends</h3>
                  <p className="text-sm text-gray-600">Revenue performance over the selected period</p>
                </div>
              </div>
              
              {isLoading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : error ? (
                <div className="flex h-[320px] items-center justify-center">
                  <p className="text-destructive">Error loading analytics data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={analytics.dailyRevenue}>
                    <defs>
                      <linearGradient id="colorDailyRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorDailyRevenue)"
                      name="Daily Revenue (R)"
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Performance Badge Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
              <Award className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">Performance Status</h3>
            <p className="text-white/90 mb-4">
              {analytics && analytics.totalRevenue > 10000 ? 
                "🏆 Outstanding! Your dispensary is performing exceptionally well!" :
                analytics && analytics.totalRevenue > 5000 ?
                "⭐ Great job! Keep up the momentum!" :
                "💪 Keep growing! Every order brings you closer to your goals!"
              }
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge className="bg-white/20 text-white border-none px-4 py-2 text-sm backdrop-blur-sm">
                <Star className="h-4 w-4 mr-1" />
                {analytics?.totalOrders || 0} Orders
              </Badge>
              <Badge className="bg-white/20 text-white border-none px-4 py-2 text-sm backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                R{Math.round(analytics?.totalRevenue || 0)} Revenue
              </Badge>
              <Badge className="bg-white/20 text-white border-none px-4 py-2 text-sm backdrop-blur-sm">
                <Zap className="h-4 w-4 mr-1" />
                {analytics?.topProducts?.length || 0} Products
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
