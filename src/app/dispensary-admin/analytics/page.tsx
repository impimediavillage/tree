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
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderAnalytics } from '@/hooks/use-order-analytics';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DATE_RANGES = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
] as const;

export default function AnalyticsPage() {
  const { currentUser, isDispensaryOwner } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState('7'); // Default to 7 days
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number }>>([]);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Top Products by Revenue</h2>
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
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Revenue (R)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Daily Revenue</h2>
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
                <Bar dataKey="revenue" fill="#22c55e" name="Daily Revenue" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Orders</h3>
          <div className="mt-2 text-2xl font-bold">{analytics?.totalOrders || 0}</div>
          <p className="text-xs text-muted-foreground">
            {analytics?.orderGrowth > 0 ? '+' : ''}{analytics?.orderGrowth || 0}% from previous period
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
          <div className="mt-2 text-2xl font-bold">
            R{analytics?.totalRevenue?.toFixed(2) || '0.00'}
          </div>
          <p className="text-xs text-muted-foreground">
            {analytics?.revenueGrowth > 0 ? '+' : ''}{analytics?.revenueGrowth || 0}% from previous period
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Average Order Value</h3>
          <div className="mt-2 text-2xl font-bold">
            R{analytics?.averageOrderValue?.toFixed(2) || '0.00'}
          </div>
          <p className="text-xs text-muted-foreground">
            Based on {analytics?.totalOrders || 0} orders
          </p>
        </Card>
      </div>
    </div>
  );
}
