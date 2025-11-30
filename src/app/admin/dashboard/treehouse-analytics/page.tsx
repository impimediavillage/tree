'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, DollarSign, Users, Package, ShoppingBag, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TreehouseProduct } from '@/types/creator-lab';
import { CREATOR_COMMISSION_RATE, PLATFORM_COMMISSION_RATE } from '@/types/creator-lab';

interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  totalUnits: number;
  platformRevenue: number;
  creatorPayouts: number;
  pendingPayouts: number;
  topCreators: Array<{
    userId: string;
    userName: string;
    totalSales: number;
    commission: number;
    productsSold: number;
  }>;
  topProducts: Array<{
    productId: string;
    designImageUrl: string;
    apparelType: string;
    creatorName: string;
    sales: number;
    units: number;
  }>;
  apparelBreakdown: Array<{
    apparelType: string;
    unitsSold: number;
    revenue: number;
    percentage: number;
  }>;
}

export default function TreehouseAnalyticsPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'This page is for Super Admins only.',
        variant: 'destructive',
      });
      router.replace('/');
    } else if (!authLoading && isSuperAdmin) {
      loadAnalytics();
    }
  }, [authLoading, isSuperAdmin]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch Treehouse orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('orderType', '==', 'treehouse')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch creator earnings
      const earningsSnapshot = await getDocs(collection(db, 'creatorEarnings'));
      const earnings = earningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all Treehouse products
      const productsQuery = query(
        collection(db, 'treehouseProducts'),
        where('isActive', '==', true)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TreehouseProduct[];

      // Calculate totals
      const totalSales = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const totalUnits = orders.reduce((sum: number, o: any) => {
        return sum + (o.items || []).reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0);
      }, 0);
      const platformRevenue = Math.round(totalSales * PLATFORM_COMMISSION_RATE);
      const creatorPayouts = Math.round(totalSales * CREATOR_COMMISSION_RATE);
      const pendingPayouts = earnings.reduce((sum: number, e: any) => sum + (e.pendingPayout || 0), 0);

      // Top creators
      const topCreators = earnings
        .sort((a: any, b: any) => (b.totalCommission || 0) - (a.totalCommission || 0))
        .slice(0, 5)
        .map((e: any) => ({
          userId: e.userId || e.id,
          userName: e.userName || 'Anonymous',
          totalSales: e.totalSales || 0,
          commission: e.totalCommission || 0,
          productsSold: e.productsSold || 0,
        }));

      // Top products
      const topProducts = products
        .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
        .slice(0, 5)
        .map(p => ({
          productId: p.id,
          designImageUrl: p.designImageUrl,
          apparelType: p.apparelType,
          creatorName: p.creatorName,
          sales: p.totalRevenue || 0,
          units: p.salesCount || 0,
        }));

      // Apparel breakdown
      const apparelMap = new Map<string, { units: number; revenue: number }>();
      products.forEach(p => {
        const existing = apparelMap.get(p.apparelType) || { units: 0, revenue: 0 };
        apparelMap.set(p.apparelType, {
          units: existing.units + (p.salesCount || 0),
          revenue: existing.revenue + (p.totalRevenue || 0),
        });
      });

      const apparelBreakdown = Array.from(apparelMap.entries()).map(([type, data]) => ({
        apparelType: type,
        unitsSold: data.units,
        revenue: data.revenue,
        percentage: totalSales > 0 ? (data.revenue / totalSales) * 100 : 0,
      }));

      setAnalytics({
        totalSales,
        totalOrders,
        totalUnits,
        platformRevenue,
        creatorPayouts,
        pendingPayouts,
        topCreators,
        topProducts,
        apparelBreakdown,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Failed to Load Analytics',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-[#006B3E]/10">
            <TrendingUp className="h-12 w-12 text-[#006B3E]" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-[#3D2E17]">Treehouse Analytics</h1>
            <p className="text-lg text-[#5D4E37] font-semibold mt-1">
              Marketplace Performance Dashboard
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-[#006B3E] mx-auto mb-4" />
          <p className="text-[#5D4E37] font-semibold">Loading analytics...</p>
        </div>
      ) : !analytics ? (
        <Card className="border-[#5D4E37]">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 text-[#5D4E37]/30 mx-auto mb-4" />
            <h3 className="text-xl font-extrabold text-[#3D2E17] mb-2">No Data Available</h3>
            <p className="text-[#5D4E37] font-semibold">Analytics will appear once orders are placed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-[#006B3E] bg-[#006B3E]/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5D4E37] font-semibold">Total Sales</p>
                    <p className="text-3xl font-extrabold text-[#006B3E]">
                      R{analytics.totalSales.toFixed(0)}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-[#006B3E]" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-600 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5D4E37] font-semibold">Platform Revenue (75%)</p>
                    <p className="text-3xl font-extrabold text-green-600">
                      R{analytics.platformRevenue.toFixed(0)}
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-600 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5D4E37] font-semibold">Creator Payouts (25%)</p>
                    <p className="text-3xl font-extrabold text-blue-600">
                      R{analytics.creatorPayouts.toFixed(0)}
                    </p>
                  </div>
                  <Users className="h-10 w-10 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-600 bg-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5D4E37] font-semibold">Pending Payouts</p>
                    <p className="text-3xl font-extrabold text-orange-600">
                      R{analytics.pendingPayouts.toFixed(0)}
                    </p>
                  </div>
                  <DollarSign className="h-10 w-10 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-[#5D4E37]">
              <CardContent className="p-6 text-center">
                <ShoppingBag className="h-8 w-8 text-[#006B3E] mx-auto mb-2" />
                <p className="text-sm text-[#5D4E37] font-semibold">Total Orders</p>
                <p className="text-2xl font-extrabold text-[#3D2E17]">{analytics.totalOrders}</p>
              </CardContent>
            </Card>

            <Card className="border-[#5D4E37]">
              <CardContent className="p-6 text-center">
                <Package className="h-8 w-8 text-[#006B3E] mx-auto mb-2" />
                <p className="text-sm text-[#5D4E37] font-semibold">Units Sold</p>
                <p className="text-2xl font-extrabold text-[#3D2E17]">{analytics.totalUnits}</p>
              </CardContent>
            </Card>

            <Card className="border-[#5D4E37]">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-[#006B3E] mx-auto mb-2" />
                <p className="text-sm text-[#5D4E37] font-semibold">Average Order Value</p>
                <p className="text-2xl font-extrabold text-[#3D2E17]">
                  R{analytics.totalOrders > 0 ? (analytics.totalSales / analytics.totalOrders).toFixed(0) : 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Creators */}
          <Card className="border-[#5D4E37]">
            <CardHeader>
              <CardTitle className="text-2xl font-extrabold text-[#3D2E17] flex items-center gap-2">
                <Users className="h-6 w-6 text-[#006B3E]" />
                Top Creators
              </CardTitle>
              <CardDescription className="text-[#5D4E37] font-semibold">
                Highest earning creators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topCreators.length === 0 ? (
                <p className="text-center text-[#5D4E37] font-semibold py-8">No creators yet</p>
              ) : (
                <div className="space-y-4">
                  {analytics.topCreators.map((creator, index) => (
                    <div
                      key={creator.userId}
                      className="flex items-center justify-between p-4 bg-[#5D4E37]/5 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#006B3E] text-white flex items-center justify-center font-extrabold">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-[#3D2E17]">{creator.userName}</p>
                          <p className="text-sm text-[#5D4E37] font-semibold">
                            {creator.productsSold} products sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold text-[#006B3E]">
                          R{creator.commission.toFixed(0)}
                        </p>
                        <p className="text-xs text-[#5D4E37] font-semibold">
                          earned (25%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border-[#5D4E37]">
            <CardHeader>
              <CardTitle className="text-2xl font-extrabold text-[#3D2E17] flex items-center gap-2">
                <Package className="h-6 w-6 text-[#006B3E]" />
                Top Products
              </CardTitle>
              <CardDescription className="text-[#5D4E37] font-semibold">
                Best-selling designs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topProducts.length === 0 ? (
                <p className="text-center text-[#5D4E37] font-semibold py-8">No products yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.topProducts.map((product) => (
                    <div key={product.productId} className="border-2 border-[#5D4E37]/30 rounded-lg overflow-hidden">
                      <div className="aspect-square bg-black flex items-center justify-center p-4">
                        <img
                          src={product.designImageUrl}
                          alt={product.apparelType}
                          className="max-w-[70%] max-h-[70%] object-contain"
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-[#3D2E17]">{product.apparelType}</p>
                        <p className="text-sm text-[#5D4E37] font-semibold">by {product.creatorName}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[#006B3E] font-bold">R{product.sales.toFixed(0)}</span>
                          <span className="text-xs text-[#5D4E37] font-semibold">{product.units} sold</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Apparel Breakdown */}
          <Card className="border-[#5D4E37]">
            <CardHeader>
              <CardTitle className="text-2xl font-extrabold text-[#3D2E17] flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-[#006B3E]" />
                Sales by Apparel Type
              </CardTitle>
              <CardDescription className="text-[#5D4E37] font-semibold">
                Performance breakdown by product type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.apparelBreakdown.length === 0 ? (
                <p className="text-center text-[#5D4E37] font-semibold py-8">No sales yet</p>
              ) : (
                <div className="space-y-4">
                  {analytics.apparelBreakdown.map((item) => (
                    <div key={item.apparelType} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#3D2E17]">{item.apparelType}</span>
                        <span className="text-[#006B3E] font-bold">R{item.revenue.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-grow h-4 bg-[#5D4E37]/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#006B3E] rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-[#5D4E37] font-semibold w-16 text-right">
                          {item.unitsSold} units
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
