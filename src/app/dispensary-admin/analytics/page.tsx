
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, DollarSign, Package, Users, ShoppingCart, TrendingUp, AlertTriangle, PackageSearch, ListOrdered } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Product, ProductRequest, ProductCategoryCount } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, isLoading }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-card-foreground">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <Skeleton className="h-7 w-20" />
      ) : (
        <div className="text-2xl font-bold text-primary">{value}</div>
      )}
      {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
    </CardContent>
  </Card>
);

// Define a consistent color palette for charts
const CHART_COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#FFBB28' 
];


export default function DispensaryAnalyticsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ProductRequest[]>([]);
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    activePoolItems: 0,
    pendingRequests: 0,
    // --- Placeholders for sales data ---
    totalSales: 0, // Example: 12345.67,
    totalOrders: 0, // Example: 150,
    averageOrderValue: 0, // Example: (12345.67 / 150),
    topSellingProduct: 'N/A', // Example: "Best Bud OG",
    // --- End Placeholders ---
  });

  useEffect(() => {
    if (authLoading || !currentUser?.dispensaryId) {
      if (!authLoading) setIsLoadingStats(false);
      return;
    }

    const fetchAnalyticsData = async () => {
      setIsLoadingStats(true);
      try {
        // Fetch products for the current dispensary
        const productsQuery = query(
          collection(db, "products"),
          where("dispensaryId", "==", currentUser.dispensaryId)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const fetchedProducts: Product[] = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAllProducts(fetchedProducts);
        const activePoolCount = fetchedProducts.filter(p => p.isAvailableForPool).length;

        // Fetch pending incoming product requests
        const requestsQuery = query(
          collection(db, "productRequests"),
          where("productOwnerDispensaryId", "==", currentUser.dispensaryId),
          where("requestStatus", "==", "pending_owner_approval")
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        setIncomingRequests(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest)));
        
        // Simulate fetching actual sales analytics data.
        // For now, these remain placeholders.
        const placeholderTotalSales = Math.floor(Math.random() * 20000) + 5000; // Random sales between 5k-25k
        const placeholderTotalOrders = Math.floor(Math.random() * 300) + 50;   // Random orders between 50-350
        const placeholderAvgOrderValue = placeholderTotalOrders > 0 ? placeholderTotalSales / placeholderTotalOrders : 0;

        setStats({
          totalProducts: fetchedProducts.length,
          activePoolItems: activePoolCount,
          pendingRequests: requestsSnapshot.size,
          totalSales: placeholderTotalSales,
          totalOrders: placeholderTotalOrders,
          averageOrderValue: placeholderAvgOrderValue,
          topSellingProduct: fetchedProducts.length > 0 ? fetchedProducts[0].name : 'N/A', // Simplistic top product
        });

      } catch (error) {
        console.error("Error fetching dispensary analytics data:", error);
        // Handle error (e.g., show toast)
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchAnalyticsData();
  }, [currentUser, authLoading]);
  
  const productCategoryData: ProductCategoryCount[] = useMemo(() => {
    if (allProducts.length === 0) return [];
    const categoryMap = new Map<string, number>();
    allProducts.forEach(product => {
      categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + 1);
    });
    return Array.from(categoryMap.entries()).map(([name, count], index) => ({
      name,
      count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    })).sort((a,b) => b.count - a.count); // Sort for better chart readability
  }, [allProducts]);


  if (authLoading) {
    return <div className="p-4"><Skeleton className="h-12 w-1/2 mb-6" /><Skeleton className="h-72 w-full" /></div>;
  }
  if (!currentUser || currentUser.role !== 'DispensaryOwner') {
    return (
      <div className="p-4 text-center text-destructive flex flex-col items-center justify-center h-full">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-xl">Access Denied.</p>
        <p>This section is for Dispensary Owners only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg bg-card border-primary/30">
        <CardHeader>
          <CardTitle 
            className="text-3xl font-bold text-foreground flex items-center"
            style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
          >
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Dispensary Analytics
          </CardTitle>
          <CardDescription 
            className="text-md text-foreground"
            style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
          >
            Track your sales, product performance, and customer engagement.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          description="Products listed by your dispensary."
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Active in Pool"
          value={stats.activePoolItems}
          icon={ShoppingCart}
          description="Products available in sharing pool."
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          icon={ListOrdered}
          description="Incoming product requests."
          isLoading={isLoadingStats}
        />
         <StatCard
          title="Total Sales (Demo)"
          value={`R ${stats.totalSales.toFixed(2)}`}
          icon={DollarSign}
          description="Total revenue generated (demo data)"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Total Orders (Demo)"
          value={stats.totalOrders}
          icon={ShoppingCart}
          description="Number of completed orders (demo data)"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Avg. Order Value (Demo)"
          value={`R ${stats.averageOrderValue.toFixed(2)}`}
          icon={TrendingUp}
          description="Average amount per order (demo data)"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Top Product (Demo)"
          value={stats.topSellingProduct}
          icon={PackageSearch}
          description="Most listed product (simplistic)"
          isLoading={isLoadingStats}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-md bg-card">
            <CardHeader>
            <CardTitle 
                className="text-foreground" 
                style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
            >Product Categories</CardTitle>
            <CardDescription 
                className="text-foreground"
                style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
            >Overview of products by category in your dispensary.</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoadingStats ? (
                <Skeleton className="h-72 w-full" />
            ) : productCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productCategoryData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                        }}
                        itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}/>
                    <Bar dataKey="count" name="Product Count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-72 w-full bg-muted rounded-md flex flex-col items-center justify-center">
                    <PackageSearch className="h-16 w-16 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No product data to display category chart.</p>
                </div>
            )}
            </CardContent>
        </Card>

        <Card className="shadow-md bg-card">
            <CardHeader>
            <CardTitle 
                className="text-foreground"
                style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
            >Sales Trends (Demo)</CardTitle>
            <CardDescription 
                className="text-foreground"
                style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
            >Visualize your sales performance over time. (Placeholder Chart)</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="h-72 w-full bg-muted rounded-md flex flex-col items-center justify-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Detailed sales chart coming soon.</p>
                <p className="text-xs text-muted-foreground/80">(Requires order tracking implementation)</p>
            </div>
            </CardContent>
        </Card>
      </div>
      
      <p 
        className="text-sm text-foreground text-center"
        style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
      >
        Note: Some analytics (Total Sales, Orders, Avg. Order Value) use demo data. Full analytics requires an orders system.
      </p>
    </div>
  );
}

