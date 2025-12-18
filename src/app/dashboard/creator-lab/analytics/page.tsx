'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Package,
  Eye,
  ShoppingCart,
  Calendar,
  BarChart3,
  Star,
  Users,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Store,
  Award,
  Target,
  Zap,
  Trophy
} from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { TreehouseProduct } from '@/types/creator-lab';
import type { CreatorStore } from '@/types/creator-store';
import Image from 'next/image';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalViews: number;
  avgOrderValue: number;
  conversionRate: number;
  topProducts: Array<{
    product: TreehouseProduct;
    revenue: number;
    orders: number;
    views: number;
  }>;
  revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
  revenueByWeek: Array<{ week: string; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  productPerformance: Array<{
    productId: string;
    name: string;
    views: number;
    addToCarts: number;
    orders: number;
    revenue: number;
    conversionRate: number;
  }>;
}

interface Order {
  id: string;
  creatorId: string;
  creatorEarnings: number;
  platformFee: number;
  total: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  createdAt: Timestamp;
  status: string;
}

export default function CreatorAnalyticsPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [store, setStore] = useState<CreatorStore | null>(null);
  const [products, setProducts] = useState<TreehouseProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!authLoading && currentUser?.uid) {
      loadAnalytics();
    }
  }, [authLoading, currentUser, dateRange]);

  const loadAnalytics = async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    try {
      // Load creator store
      const storesRef = collection(db, 'creator_stores');
      const storeQuery = query(storesRef, where('ownerId', '==', currentUser.uid));
      const storeSnapshot = await getDocs(storeQuery);
      
      if (!storeSnapshot.empty) {
        const storeData = { id: storeSnapshot.docs[0].id, ...storeSnapshot.docs[0].data() } as CreatorStore;
        setStore(storeData);
      }

      // Load products
      const productsRef = collection(db, 'treehouseProducts');
      const productsQuery = query(
        productsRef,
        where('creatorId', '==', currentUser.uid)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TreehouseProduct[];
      setProducts(productsData);

      // Load orders with date filtering
      const ordersRef = collection(db, 'orders');
      let ordersQuery = query(
        ordersRef,
        where('orderType', '==', 'treehouse')
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      let ordersData = ordersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((order: any) => order.creatorId === currentUser.uid) as Order[];

      // Apply date filter
      if (dateRange !== 'all') {
        const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const cutoffDate = subDays(new Date(), daysAgo);
        ordersData = ordersData.filter(order => order.createdAt.toDate() >= cutoffDate);
      }

      setOrders(ordersData);

      // Calculate analytics
      const analyticsData = calculateAnalytics(ordersData, productsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (orders: Order[], products: TreehouseProduct[]): AnalyticsData => {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.creatorEarnings || 0), 0);
    const totalOrders = orders.length;
    const totalProducts = products.filter(p => p.isActive).length;
    const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);
    const totalAddToCarts = products.reduce((sum, p) => sum + (p.addToCartCount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const conversionRate = totalViews > 0 ? (totalAddToCarts / totalViews) * 100 : 0;

    // Top products by revenue
    const productRevenue = new Map<string, { revenue: number; orders: number; product: TreehouseProduct; views: number }>();
    
    orders.forEach(order => {
      order.items?.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const current = productRevenue.get(item.productId) || { revenue: 0, orders: 0, product, views: product.viewCount || 0 };
          current.revenue += (item.price * item.quantity * 0.25); // 25% creator commission
          current.orders += item.quantity;
          productRevenue.set(item.productId, current);
        }
      });
    });

    const topProducts = Array.from(productRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Revenue by day (last 7 days)
    const dailyRevenue = new Map<string, { revenue: number; orders: number }>();
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MMM dd');
      dailyRevenue.set(date, { revenue: 0, orders: 0 });
    }

    orders.forEach(order => {
      const dateKey = format(order.createdAt.toDate(), 'MMM dd');
      if (dailyRevenue.has(dateKey)) {
        const current = dailyRevenue.get(dateKey)!;
        current.revenue += order.creatorEarnings;
        current.orders += 1;
      }
    });

    const revenueByDay = Array.from(dailyRevenue.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orders: data.orders
    }));

    // Revenue by week (last 8 weeks)
    const weeklyRevenue = new Map<string, number>();
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7));
      const weekKey = format(weekStart, 'MMM dd');
      weeklyRevenue.set(weekKey, 0);
    }

    orders.forEach(order => {
      const weekStart = startOfWeek(order.createdAt.toDate());
      const weekKey = format(weekStart, 'MMM dd');
      if (weeklyRevenue.has(weekKey)) {
        weeklyRevenue.set(weekKey, (weeklyRevenue.get(weekKey) || 0) + order.creatorEarnings);
      }
    });

    const revenueByWeek = Array.from(weeklyRevenue.entries()).map(([week, revenue]) => ({
      week,
      revenue
    }));

    // Revenue by month (last 6 months)
    const monthlyRevenue = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      const monthKey = format(monthStart, 'MMM yyyy');
      monthlyRevenue.set(monthKey, 0);
    }

    orders.forEach(order => {
      const monthKey = format(order.createdAt.toDate(), 'MMM yyyy');
      if (monthlyRevenue.has(monthKey)) {
        monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + order.creatorEarnings);
      }
    });

    const revenueByMonth = Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
      month,
      revenue
    }));

    // Product performance
    const productPerformance = products.map(product => {
      const orders = Array.from(productRevenue.values())
        .find(p => p.product.id === product.id)?.orders || 0;
      const revenue = Array.from(productRevenue.values())
        .find(p => p.product.id === product.id)?.revenue || 0;
      const views = product.viewCount || 0;
      const addToCarts = product.addToCartCount || 0;
      const conversionRate = views > 0 ? (addToCarts / views) * 100 : 0;

      return {
        productId: product.id || '',
        name: product.productName || product.apparelType || 'Unnamed Product',
        views,
        addToCarts,
        orders,
        revenue,
        conversionRate
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalViews,
      avgOrderValue,
      conversionRate,
      topProducts,
      revenueByDay,
      revenueByWeek,
      revenueByMonth,
      productPerformance
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="container py-8 px-4 max-w-7xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-6 w-6 text-[#006B3E]" />
              No Store Found
            </CardTitle>
            <CardDescription>
              Create your Treehouse store to access analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard/creator-lab')} className="bg-[#006B3E] hover:bg-[#005230]">
              Create Store
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card className="shadow-lg bg-gradient-to-r from-green-50 to-blue-50 border-2 border-[#006B3E]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-4xl font-extrabold text-[#3D2E17] flex items-center gap-3">
                <Sparkles className="h-10 w-10 text-[#006B3E]" />
                {store.storeName} Analytics
              </CardTitle>
              <CardDescription className="text-lg font-semibold text-[#5D4E37] mt-2">
                Your mini store performance dashboard
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/creator-lab')}
            >
              Back to Creator Lab
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-[#006B3E]" />
            <span className="font-semibold text-[#3D2E17]">Time Period:</span>
            <div className="flex gap-2">
              {([
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
                { value: 'all', label: 'All Time' }
              ] as const).map(range => (
                <Button
                  key={range.value}
                  variant={dateRange === range.value ? 'default' : 'outline'}
                  onClick={() => setDateRange(range.value)}
                  className={dateRange === range.value ? 'bg-[#006B3E] hover:bg-[#005230]' : ''}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-green-200 bg-green-50/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-green-700">
              R {analytics?.totalRevenue.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              25% commission on sales
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-700">
              {analytics?.totalOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: R {analytics?.avgOrderValue.toFixed(2) || '0.00'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              Active Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-purple-700">
              {analytics?.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In your store
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-orange-50/50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-orange-600" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-orange-700">
              {analytics?.totalViews || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Conversion: {analytics?.conversionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="font-bold">
            <TrendingUp className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="best-sellers" className="font-bold">
            <Award className="h-4 w-4 mr-2" />
            Best Sellers
          </TabsTrigger>
          <TabsTrigger value="performance" className="font-bold">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="trends" className="font-bold">
            <Zap className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Daily Revenue Chart */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#006B3E]" />
                Daily Revenue (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics?.revenueByDay.map(day => {
                  const maxRevenue = Math.max(...(analytics.revenueByDay.map(d => d.revenue)));
                  const width = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{day.date}</span>
                        <span className="font-bold text-[#006B3E]">R {day.revenue.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-6 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#006B3E] to-[#3D2E17] rounded-full flex items-center justify-end px-2"
                          style={{ width: `${width}%` }}
                        >
                          <span className="text-xs font-bold text-white">{day.orders} orders</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Avg Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#006B3E]">
                  R {analytics?.avgOrderValue.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#006B3E]">
                  {analytics?.conversionRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Products Listed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#006B3E]">
                  {analytics?.totalProducts}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Best Sellers Tab */}
        <TabsContent value="best-sellers" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Performing Products
              </CardTitle>
              <CardDescription>
                Your best-selling products by revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topProducts.slice(0, 10).map((item, index) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border hover:border-[#006B3E] transition-colors"
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-[#006B3E]'
                    }`}>
                      {index + 1}
                    </div>
                    
                    {item.product.designImageUrl && (
                      <Image
                        src={item.product.designImageUrl}
                        alt={item.product.productName || ''}
                        width={60}
                        height={60}
                        className="rounded object-cover"
                      />
                    )}

                    <div className="flex-1">
                      <h4 className="font-semibold">{item.product.productName || item.product.apparelType}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.orders} sales • {item.views} views
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-[#006B3E]">
                        R {item.revenue.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">revenue</p>
                    </div>
                  </div>
                ))}

                {(analytics?.topProducts.length || 0) === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No sales data yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#006B3E]" />
                Product Performance Metrics
              </CardTitle>
              <CardDescription>
                Detailed analytics for all your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.productPerformance.map(product => (
                  <div key={product.productId} className="p-4 bg-muted/30 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-[#3D2E17]">{product.name}</h4>
                      <Badge variant={product.orders > 0 ? 'default' : 'outline'}>
                        {product.orders} orders
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Views</div>
                        <div className="font-bold text-[#006B3E]">{product.views}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Add to Carts</div>
                        <div className="font-bold text-[#006B3E]">{product.addToCarts}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Revenue</div>
                        <div className="font-bold text-[#006B3E]">R {product.revenue.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Conversion</div>
                        <div className="font-bold text-[#006B3E]">{product.conversionRate.toFixed(1)}%</div>
                      </div>
                    </div>

                    {/* Conversion Bar */}
                    {product.views > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">View → Cart → Purchase</div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-green-700 h-2 rounded-full"
                            style={{ width: `${product.conversionRate}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {/* Monthly Trend */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#006B3E]" />
                Monthly Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                {analytics?.revenueByMonth.map(month => (
                  <div key={month.month} className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{month.month}</div>
                    <div className="text-base font-bold text-[#006B3E]">
                      R {month.revenue.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Trend */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#006B3E]" />
                Weekly Revenue (Last 8 Weeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics?.revenueByWeek.map(week => {
                  const maxRevenue = Math.max(...(analytics.revenueByWeek.map(w => w.revenue)));
                  const width = maxRevenue > 0 ? (week.revenue / maxRevenue) * 100 : 0;

                  return (
                    <div key={week.week} className="flex items-center gap-3">
                      <div className="text-sm font-medium text-muted-foreground w-20">{week.week}</div>
                      <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#006B3E] to-[#3D2E17] rounded-full flex items-center justify-end px-3"
                          style={{ width: `${width}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            R {week.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
