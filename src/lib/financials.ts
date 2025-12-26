/**
 * Financial Analytics Utility
 * Calculates platform revenue, dispensary earnings, and commission splits
 * Based on new pricing model: Dispensary sets price → Extract base → Add commission → Calculate tax
 */

import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order } from '@/types/order';
import type { InfluencerCommission } from '@/types/influencer';

export interface PlatformFinancials {
  // Core Revenue
  totalRevenue: number; // Total platform commission earned
  dispensaryEarnings: number; // Total dispensary base prices (what they get)
  customerSpending: number; // Total amount customers paid
  taxCollected: number; // Total tax collected
  
  // Commission Breakdown
  publicStoreCommission: number; // 25% commission from public stores
  productPoolCommission: number; // 5% commission from product pool
  treehouseCommission: number; // 75% commission from Treehouse
  
  // Influencer Program
  influencerEarnings: number; // Total paid to influencers
  influencerROI: number; // ROI percentage (revenue driven / earnings paid)
  
  // Operational
  shippingCosts: number;
  netProfit: number; // totalRevenue - influencerEarnings - shippingCosts
  profitMargin: number; // netProfit / totalRevenue
  
  // Order Stats
  totalOrders: number;
  averageOrderValue: number;
  
  // Period
  startDate: Date;
  endDate: Date;
}

export interface DispensaryFinancials {
  dispensaryId: string;
  dispensaryName: string;
  
  // Revenue
  totalSales: number; // Total base prices (their earnings)
  totalOrders: number;
  averageOrderValue: number;
  
  // Platform Fees
  platformCommissionPaid: number; // What they paid in commission
  effectiveCommissionRate: number; // Average commission rate
  
  // Product Performance
  publicStoreRevenue: number;
  productPoolRevenue: number;
  
  // Period
  month: string; // YYYY-MM format
  status: 'pending' | 'processing' | 'paid';
}

/**
 * Calculate platform financials for a date range
 */
export async function calculatePlatformFinancials(
  startDate: Date,
  endDate: Date
): Promise<PlatformFinancials> {
  
  // Fetch all orders in date range
  const ordersQuery = query(
    collection(db, 'orders'),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate)),
    where('paymentStatus', '==', 'completed')
  );
  
  const ordersSnap = await getDocs(ordersQuery);
  const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  
  // Calculate totals from orders
  let totalRevenue = 0;
  let dispensaryEarnings = 0;
  let customerSpending = 0;
  let taxCollected = 0;
  let publicStoreCommission = 0;
  let productPoolCommission = 0;
  let treehouseCommission = 0;
  let shippingCosts = 0;
  
  orders.forEach(order => {
    // New pricing model fields
    if (order.totalPlatformCommission) {
      totalRevenue += order.totalPlatformCommission;
      dispensaryEarnings += order.totalDispensaryEarnings || 0;
      customerSpending += order.total;
      taxCollected += order.tax || 0;
      shippingCosts += order.shippingTotal || 0;
      
      // Categorize by order type
      if (order.orderType === 'treehouse') {
        treehouseCommission += order.totalPlatformCommission;
      } else {
        // Check items for commission rates
        order.items?.forEach(item => {
          if ('commissionRate' in item) {
            if (item.commissionRate === 0.25) {
              publicStoreCommission += item.platformCommission || 0;
            } else if (item.commissionRate === 0.05) {
              productPoolCommission += item.platformCommission || 0;
            }
          }
        });
      }
    } else {
      // Legacy orders - estimate from total
      const estimatedCommission = (order.subtotal || 0) * 0.25;
      totalRevenue += estimatedCommission;
      dispensaryEarnings += (order.subtotal || 0) * 0.75;
      customerSpending += order.total;
      publicStoreCommission += estimatedCommission;
    }
  });
  
  // Fetch influencer commissions
  const influencerQuery = query(
    collection(db, 'influencerCommissions'),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate))
  );
  
  const influencerSnap = await getDocs(influencerQuery);
  const influencerEarnings = influencerSnap.docs.reduce((sum, doc) => {
    const data = doc.data() as InfluencerCommission;
    return sum + (data.influencerEarnings || data.commissionAmount || 0);
  }, 0);
  
  const influencerDrivenRevenue = influencerSnap.docs.reduce((sum, doc) => {
    const data = doc.data() as InfluencerCommission;
    return sum + (data.platformCommission || 0);
  }, 0);
  
  const influencerROI = influencerEarnings > 0 
    ? ((influencerDrivenRevenue - influencerEarnings) / influencerEarnings) * 100 
    : 0;
  
  // Calculate final metrics
  const netProfit = totalRevenue - influencerEarnings - shippingCosts;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const averageOrderValue = orders.length > 0 ? customerSpending / orders.length : 0;
  
  return {
    totalRevenue,
    dispensaryEarnings,
    customerSpending,
    taxCollected,
    publicStoreCommission,
    productPoolCommission,
    treehouseCommission,
    influencerEarnings,
    influencerROI,
    shippingCosts,
    netProfit,
    profitMargin,
    totalOrders: orders.length,
    averageOrderValue,
    startDate,
    endDate
  };
}

/**
 * Calculate dispensary-specific financials
 */
export async function calculateDispensaryFinancials(
  dispensaryId: string,
  startDate: Date,
  endDate: Date
): Promise<DispensaryFinancials> {
  
  const ordersQuery = query(
    collection(db, 'orders'),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate)),
    where('paymentStatus', '==', 'completed')
  );
  
  const ordersSnap = await getDocs(ordersQuery);
  const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  
  // Filter orders containing this dispensary's products
  const dispensaryOrders = orders.filter(order => 
    order.items?.some(item => item.dispensaryId === dispensaryId)
  );
  
  let totalSales = 0;
  let platformCommissionPaid = 0;
  let publicStoreRevenue = 0;
  let productPoolRevenue = 0;
  
  dispensaryOrders.forEach(order => {
    order.items?.forEach(item => {
      if (item.dispensaryId === dispensaryId && 'basePrice' in item) {
        const itemTotal = item.basePrice * item.quantity;
        const itemCommission = (item.platformCommission || 0) * item.quantity;
        
        totalSales += itemTotal;
        platformCommissionPaid += itemCommission;
        
        if ('commissionRate' in item && item.commissionRate === 0.05) {
          productPoolRevenue += itemTotal;
        } else {
          publicStoreRevenue += itemTotal;
        }
      }
    });
  });
  
  const effectiveCommissionRate = totalSales > 0 
    ? (platformCommissionPaid / totalSales) * 100 
    : 0;
  
  const averageOrderValue = dispensaryOrders.length > 0 
    ? totalSales / dispensaryOrders.length 
    : 0;
  
  return {
    dispensaryId,
    dispensaryName: dispensaryOrders[0]?.shipments?.[dispensaryId]?.items?.[0]?.dispensaryName || 'Unknown',
    totalSales,
    totalOrders: dispensaryOrders.length,
    averageOrderValue,
    platformCommissionPaid,
    effectiveCommissionRate,
    publicStoreRevenue,
    productPoolRevenue,
    month: startDate.toISOString().slice(0, 7),
    status: 'pending'
  };
}

/**
 * Get all dispensaries with financials for a period
 */
export async function getAllDispensaryFinancials(
  startDate: Date,
  endDate: Date
): Promise<DispensaryFinancials[]> {
  
  // Get all orders
  const ordersQuery = query(
    collection(db, 'orders'),
    where('createdAt', '>=', Timestamp.fromDate(startDate)),
    where('createdAt', '<=', Timestamp.fromDate(endDate)),
    where('paymentStatus', '==', 'completed')
  );
  
  const ordersSnap = await getDocs(ordersQuery);
  const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  
  // Aggregate by dispensary
  const dispensaryMap = new Map<string, {
    name: string;
    sales: number;
    commission: number;
    orders: number;
    publicRevenue: number;
    poolRevenue: number;
  }>();
  
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (item.dispensaryId && 'basePrice' in item) {
        const key = item.dispensaryId;
        const itemSales = item.basePrice * item.quantity;
        const itemCommission = (item.platformCommission || 0) * item.quantity;
        
        if (!dispensaryMap.has(key)) {
          dispensaryMap.set(key, {
            name: item.dispensaryName || 'Unknown',
            sales: 0,
            commission: 0,
            orders: 0,
            publicRevenue: 0,
            poolRevenue: 0
          });
        }
        
        const entry = dispensaryMap.get(key)!;
        entry.sales += itemSales;
        entry.commission += itemCommission;
        entry.orders += 1;
        
        if ('commissionRate' in item && item.commissionRate === 0.05) {
          entry.poolRevenue += itemSales;
        } else {
          entry.publicRevenue += itemSales;
        }
      }
    });
  });
  
  // Convert to array
  return Array.from(dispensaryMap.entries()).map(([id, data]) => ({
    dispensaryId: id,
    dispensaryName: data.name,
    totalSales: data.sales,
    totalOrders: data.orders,
    averageOrderValue: data.orders > 0 ? data.sales / data.orders : 0,
    platformCommissionPaid: data.commission,
    effectiveCommissionRate: data.sales > 0 ? (data.commission / data.sales) * 100 : 0,
    publicStoreRevenue: data.publicRevenue,
    productPoolRevenue: data.poolRevenue,
    month: startDate.toISOString().slice(0, 7),
    status: 'pending'
  }));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };
  
  return `${symbols[currency] || currency}${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}
