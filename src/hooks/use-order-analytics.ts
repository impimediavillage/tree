import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Order, OrderItem } from '@/types/order';
import type { User } from '@/types/user';
import type { EnhancedOrderShipment, OrderHandler } from '@/types/enhanced-shipping';
import { useAuth } from '@/contexts/AuthContext';

export interface StaffPerformance {
  userId: string;
  displayName: string;
  ordersHandled: number;
  totalRevenue: number;
  averageProcessingTime: number; // in minutes
  customerRating?: number;
  ordersByStatus: Record<string, number>;
}

export interface ProductAnalytics {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  growth: number;
  averageRating?: number;
  stockLevel?: number;
  reorderPoint?: number;
  profitMargin?: number;
}

export interface TimeMetrics {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  uniqueCustomers: number;
}

export interface OrderAnalytics {
  // Key Performance Indicators
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  todayOrders: number;
  todayRevenue: number;
  
  // Growth Metrics
  revenueGrowth: number;
  orderGrowth: number;
  customerGrowth: number;
  
  // Time-based Analysis
  hourlyTrends: TimeMetrics[];
  dailyRevenue: TimeMetrics[];
  weeklyTrends: TimeMetrics[];
  
  // Product Performance
  topProducts: ProductAnalytics[];
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    growth: number;
    topProducts: string[];
  }>;
  
  // Customer Insights
  customerRetentionRate: number;
  repeatCustomerRate: number;
  averageCustomerLifetimeValue: number;
  
  // Operational Metrics
  ordersByStatus: Record<string, number>;
  averageProcessingTime: number;
  peakOrderingHours: Array<{
    hour: number;
    orderCount: number;
  }>;
  
  // Staff Performance (Owner Only)
  staffPerformance?: StaffPerformance[];
  
  // Recent Activity
  recentOrders: Order[];
  
  // Inventory Insights
  lowStockProducts: ProductAnalytics[];
  inventoryTurnoverRate: number;
  
  // Financial Metrics
  grossProfitMargin: number;
  operatingExpenses: number;
  netProfit: number;
  
  // Geographic Data
  ordersByRegion: Array<{
    region: string;
    orders: number;
    revenue: number;
  }>;
}

export const useOrderAnalytics = (daysRange: number = 30): {
  analytics: OrderAnalytics;
  isLoading: boolean;
  error: string | null;
} => {
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<OrderAnalytics>({
    // Key Performance Indicators
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    todayOrders: 0,
    todayRevenue: 0,
    
    // Growth Metrics
    revenueGrowth: 0,
    orderGrowth: 0,
    customerGrowth: 0,
    
    // Time-based Analysis
    hourlyTrends: [],
    dailyRevenue: [],
    weeklyTrends: [],
    
    // Product Performance
    topProducts: [],
    categoryPerformance: [],
    
    // Customer Insights
    customerRetentionRate: 0,
    repeatCustomerRate: 0,
    averageCustomerLifetimeValue: 0,
    
    // Operational Metrics
    ordersByStatus: {},
    averageProcessingTime: 0,
    peakOrderingHours: [],
    
    // Staff Performance
    staffPerformance: [],
    
    // Recent Activity
    recentOrders: [],
    
    // Inventory Insights
    lowStockProducts: [],
    inventoryTurnoverRate: 0,
    
    // Financial Metrics
    grossProfitMargin: 0,
    operatingExpenses: 0,
    netProfit: 0,
    
    // Geographic Data
    ordersByRegion: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.dispensaryId) {
      setError('No dispensary ID found');
      setIsLoading(false);
      return;
    }

    // For staff members, we'll add a filter for their user ID
    const isStaff = currentUser.role === 'DispensaryStaff';

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysRange);
    
    const ordersRef = collection(db, 'orders');
    // Build query based on user role
    let queryConstraints = [
      where(`shipments.${currentUser.dispensaryId}.dispensaryId`, '==', currentUser.dispensaryId),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    ];

    // Add staff-specific filter if user is staff
    if (isStaff) {
      queryConstraints.push(where('handledBy.userId', '==', currentUser.id));
    }

    const ordersQuery = query(
      ordersRef,
      ...queryConstraints
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));

        // Calculate analytics
        const ordersByStatus: Record<string, number> = {};
        const productStats: Record<string, { 
          name: string;
          quantity: number;
          revenue: number;
        }> = {};
        const previousProductStats: Record<string, {
          quantity: number;
          revenue: number;
        }> = {};
        const dailyRevenueMap: Record<string, number> = {};

        let totalRevenue = 0;
        let todayOrders = 0;
        let todayRevenue = 0;
        let previousPeriodOrders = 0;
        let previousPeriodRevenue = 0;

        // Get today's date at midnight for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get start of previous period
        const previousPeriodStart = new Date();
        previousPeriodStart.setDate(previousPeriodStart.getDate() - (daysRange * 2));

        orders.forEach(order => {
          // currentUser is already checked at the beginning of useEffect
          if (!currentUser?.dispensaryId) return;
          const dispensaryShipment = order.shipments[currentUser.dispensaryId];
          if (!dispensaryShipment) return;

          const orderDate = order.createdAt.toDate();
          const orderTotal = order.total;

          // Status counts
          const status = dispensaryShipment.status;
          ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;

          // Calculate metrics based on date
          if (orderDate >= today) {
            todayOrders++;
            todayRevenue += orderTotal;
          } else if (orderDate >= previousPeriodStart) {
            previousPeriodOrders++;
            previousPeriodRevenue += orderTotal;
          }

          // Overall revenue calculations
          totalRevenue += orderTotal;
          const dateStr = orderDate.toISOString().split('T')[0];
          dailyRevenueMap[dateStr] = (dailyRevenueMap[dateStr] || 0) + orderTotal;

          // Product statistics
          dispensaryShipment.items.forEach((item: OrderItem) => {
            if (!productStats[item.productId]) {
              productStats[item.productId] = {
                name: item.name,
                quantity: 0,
                revenue: 0,
              };
            }
            productStats[item.productId].quantity += item.quantity;
            productStats[item.productId].revenue += item.price * item.quantity;
          });
        });

        // Calculate daily metrics
        const dailyMetrics: Record<string, TimeMetrics> = {};
        const hourlyMetrics: Record<number, { orders: number; revenue: number }> = {};
        const customersByDate: Record<string, Set<string>> = {};
        
        orders.forEach(order => {
          const date = order.createdAt.toDate();
          const dateStr = date.toISOString().split('T')[0];
          const hour = date.getHours();
          
          // Initialize daily metrics
          if (!dailyMetrics[dateStr]) {
            dailyMetrics[dateStr] = {
              date: dateStr,
              revenue: 0,
              orders: 0,
              averageOrderValue: 0,
              uniqueCustomers: 0
            };
          }
          
          // Initialize hourly metrics
          if (!hourlyMetrics[hour]) {
            hourlyMetrics[hour] = { orders: 0, revenue: 0 };
          }
          
          // Initialize customer tracking
          if (!customersByDate[dateStr]) {
            customersByDate[dateStr] = new Set();
          }
          
          // Update metrics
          dailyMetrics[dateStr].revenue += order.total;
          dailyMetrics[dateStr].orders++;
          // Track unique customers by their order ID
          customersByDate[dateStr].add(order.userId);
          hourlyMetrics[hour].orders++;
          hourlyMetrics[hour].revenue += order.total;
        });
        
        // Calculate final metrics
        Object.keys(dailyMetrics).forEach(date => {
          const metrics = dailyMetrics[date];
          metrics.uniqueCustomers = customersByDate[date].size;
          metrics.averageOrderValue = metrics.revenue / metrics.orders;
        });
        
        // Transform into sorted arrays
        const dailyRevenue = Object.values(dailyMetrics)
          .sort((a, b) => a.date.localeCompare(b.date));
          
        const peakOrderingHours = Object.entries(hourlyMetrics)
          .map(([hour, metrics]) => ({
            hour: parseInt(hour),
            orderCount: metrics.orders
          }))
          .sort((a, b) => b.orderCount - a.orderCount);

        // Transform product stats into sorted array
        const topProducts = Object.entries(productStats)
          .map(([productId, stats]) => ({
            productId,
            ...stats,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Calculate growth percentages
        const orderGrowth = previousPeriodOrders ? 
          ((orders.length - previousPeriodOrders) / previousPeriodOrders) * 100 : 0;
        const revenueGrowth = previousPeriodRevenue ? 
          ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 : 0;

        // Calculate product growth
        const topProductsWithGrowth = topProducts.map(product => {
          const previousStats = previousProductStats[product.productId];
          const growth = previousStats?.revenue ? 
            ((product.revenue - previousStats.revenue) / previousStats.revenue) * 100 : 0;
          return { ...product, growth };
        });

        // Calculate weekly trends
        const weeklyTrends = Object.values(dailyMetrics)
          .reduce((acc, curr) => {
            const weekStart = new Date(curr.date);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!acc[weekKey]) {
              acc[weekKey] = {
                date: weekKey,
                revenue: 0,
                orders: 0,
                uniqueCustomers: new Set(),
                averageOrderValue: 0
              };
            }
            
            acc[weekKey].revenue += curr.revenue;
            acc[weekKey].orders += curr.orders;
            customersByDate[curr.date].forEach(id => 
              acc[weekKey].uniqueCustomers.add(id)
            );
            
            return acc;
          }, {} as Record<string, Omit<TimeMetrics, 'uniqueCustomers'> & { uniqueCustomers: Set<string> }>);

        // Transform weekly trends into final format
        const weeklyMetrics = Object.entries(weeklyTrends)
          .map(([date, data]) => ({
            date,
            revenue: data.revenue,
            orders: data.orders,
            uniqueCustomers: data.uniqueCustomers.size,
            averageOrderValue: data.revenue / data.orders
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate staff performance if user is owner
        const staffPerformance = !isStaff ? orders.reduce((acc, order) => {
          const shipment = order.shipments[0] as unknown as EnhancedOrderShipment | undefined;
          const handler = shipment?.handledBy;
          if (!handler) return acc;
          
          if (!acc[handler.userId]) {
            acc[handler.userId] = {
              userId: handler.userId,
              displayName: handler.displayName,
              ordersHandled: 0,
              totalRevenue: 0,
              averageProcessingTime: 0,
              ordersByStatus: {}
            };
          }
          
          const staff = acc[handler.userId];
          staff.ordersHandled++;
          staff.totalRevenue += order.total;
          
          // Track status
          const status = shipment.status || 'unknown';
          staff.ordersByStatus[status] = (staff.ordersByStatus[status] || 0) + 1;
          
          // Calculate processing time if available
          if (shipment.processingStartTime && shipment.processingEndTime) {
            const processingTime = shipment.processingEndTime.toMillis() - shipment.processingStartTime.toMillis();
            staff.averageProcessingTime = (staff.averageProcessingTime * (staff.ordersHandled - 1) + processingTime) / staff.ordersHandled;
          }
          
          return acc;
        }, {} as Record<string, StaffPerformance>) : {};

        // Calculate category performance
        const categoryPerformance = Object.entries(productStats)
          .reduce((acc, [_, product]) => {
            // Using a default category since we don't have category info yet
            const defaultCategory = 'All Products';
            if (!acc[defaultCategory]) {
              acc[defaultCategory] = {
                category: defaultCategory,
                revenue: 0,
                growth: 0,
                topProducts: []
              };
            }
            acc[defaultCategory].revenue += product.revenue;
            acc[defaultCategory].topProducts.push(product.name);
            return acc;
          }, {} as Record<string, { 
            category: string; 
            revenue: number; 
            growth: number; 
            topProducts: string[];
          }>);

        setAnalytics({
          // Key Performance Indicators
          totalOrders: orders.length,
          totalRevenue,
          averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
          todayOrders,
          todayRevenue,
          
          // Growth Metrics
          revenueGrowth,
          orderGrowth,
          customerGrowth: 0, // Calculated from unique customers
          
          // Time-based Analysis
          hourlyTrends: Object.entries(hourlyMetrics).map(([hour, data]) => ({
            date: hour.toString(),
            revenue: data.revenue,
            orders: data.orders,
            averageOrderValue: data.revenue / data.orders,
            uniqueCustomers: 0 // Need customer tracking per hour
          })),
          dailyRevenue,
          weeklyTrends: weeklyMetrics,
          
          // Product Performance
          topProducts: topProductsWithGrowth,
          categoryPerformance: Object.values(categoryPerformance),
          
          // Customer Insights
          customerRetentionRate: 0, // Need historical data
          repeatCustomerRate: 0, // Need historical data
          averageCustomerLifetimeValue: totalRevenue / Object.values(customersByDate).reduce((acc, set) => acc + set.size, 0),
          
          // Operational Metrics
          ordersByStatus,
          averageProcessingTime: 0, // Need processing time tracking
          peakOrderingHours,
          
          // Staff Performance
          staffPerformance: Object.values(staffPerformance),
          
          // Recent Activity
          recentOrders: orders.slice(0, 5),
          
          // Inventory Insights
          lowStockProducts: [], // Need inventory data
          inventoryTurnoverRate: 0, // Need inventory data
          
          // Financial Metrics
          grossProfitMargin: 0, // Need cost data
          operatingExpenses: 0, // Need expense data
          netProfit: 0, // Need complete financial data
          
          // Geographic Data
          ordersByRegion: [] // Need location data
        });

        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching order analytics:', error);
        setError(error.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.dispensaryId, daysRange]);

  return { analytics, isLoading, error };
};