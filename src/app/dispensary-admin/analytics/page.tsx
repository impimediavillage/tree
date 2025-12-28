'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useState, useCallback, useEffect } from 'react';
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
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderAnalytics } from '@/hooks/use-order-analytics';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Wallet } from 'lucide-react';

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
    <div className="space-y-4 p-8">
      {/* Header */}
      <div className="p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-[#3D2E17]">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your dispensary performance</p>
          </div>
          <div className="flex items-center gap-4">
            <BarChart3 className="h-14 w-14 text-[#006B3E]" />
            <Select
              value={selectedDateRange}
              onValueChange={(value) => setSelectedDateRange(value)}
            >
              <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Total Orders</CardTitle>
            <ShoppingCart className="h-6 w-6 text-[#006B3E]" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-extrabold text-[#3D2E17]">{analytics?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.orderGrowth > 0 ? '+' : ''}{analytics?.orderGrowth || 0}% from previous period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Total Revenue</CardTitle>
            <DollarSign className="h-6 w-6 text-[#006B3E]" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-extrabold text-[#3D2E17]">
                  R{analytics?.totalRevenue?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.revenueGrowth > 0 ? '+' : ''}{analytics?.revenueGrowth || 0}% from previous period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Average Order Value</CardTitle>
            <TrendingUp className="h-6 w-6 text-[#006B3E]" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-extrabold text-[#3D2E17]">
                  R{analytics?.averageOrderValue?.toFixed(2) || '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {analytics?.totalOrders || 0} orders
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Products Chart */}
        <Card className="bg-muted/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#3D2E17]">Top Products by Revenue</CardTitle>
            <CardDescription>Best performing products in your store</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : error ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-destructive">Error loading analytics data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#006B3E" name="Revenue (R)" animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Pie Chart */}
        <Card className="bg-muted/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#3D2E17]">Order Status Distribution</CardTitle>
            <CardDescription>Breakdown of orders by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : error ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-destructive">Error loading analytics data</p>
              </div>
            ) : orderStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.name.toLowerCase().replace(/ /g, '-')] || STATUS_COLORS['pending']}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No order data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Revenue Chart */}
        <Card className="bg-muted/50 border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#3D2E17]">Daily Revenue</CardTitle>
            <CardDescription>Revenue trends over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : error ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-destructive">Error loading analytics data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10B981" name="Daily Revenue" animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
