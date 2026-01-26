import { Timestamp } from 'firebase/firestore';

/**
 * Vendor Payout Request Types
 * For managing payout requests from Vendor crew members (DispensaryStaff with crewMemberType='Vendor')
 */

export type VendorPayoutStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface VendorPayoutRequest {
  id: string;
  
  // Vendor information
  vendorId: string; // User ID (DispensaryStaff role with crewMemberType='Vendor')
  vendorName: string;
  vendorEmail: string;
  dispensaryId: string;
  
  // Payout breakdown - KEY FEATURE
  grossSales: number; // Total sales made by vendor
  dispensaryCommissionRate: number; // % commission (5-1000%) from user.dispensaryCommissionRate
  dispensaryCommission: number; // Amount deducted (grossSales × commissionRate / 100)
  netPayout: number; // Amount vendor receives (grossSales - dispensaryCommission)
  
  // Sales attribution
  salesIds: string[]; // Order IDs or sale transaction IDs
  totalSales: number; // Count of sales
  salesPeriodStart: Timestamp | Date;
  salesPeriodEnd: Timestamp | Date;
  
  // Bank details
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
    accountType: 'Savings' | 'Cheque';
  };
  
  // Status tracking
  status: VendorPayoutStatus;
  requestedAt: Timestamp | Date;
  approvedAt?: Timestamp | Date;
  approvedBy?: string; // Dispensary admin user ID
  approverName?: string;
  paidAt?: Timestamp | Date;
  paymentReference?: string;
  
  // Rejection
  rejectedAt?: Timestamp | Date;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Metadata
  notes?: string;
  adminNotes?: string;
  updatedAt: Timestamp | Date;
}

/**
 * Vendor Earnings Tracking
 * Similar to DispensaryEarnings but for individual vendor crew members
 */
export interface VendorEarnings {
  vendorId: string;
  vendorName: string;
  dispensaryId: string;
  
  // Commission settings
  dispensaryCommissionRate: number; // From user.dispensaryCommissionRate
  
  // Earnings
  totalSales: number; // Gross sales (before commission)
  totalCommissionPaid: number; // Total commission paid to dispensary
  totalEarnings: number; // Net earnings (after commission)
  
  // Balances
  currentBalance: number; // Available to withdraw
  pendingBalance: number; // In pending payout requests
  paidBalance: number; // Already paid out
  
  // Bank account
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
    accountType: 'Savings' | 'Cheque';
  };
  
  // Stats
  totalSalesCount: number;
  totalPayouts: number;
  lastSaleAt?: Timestamp | Date;
  lastPayoutAt?: Timestamp | Date;
  
  // Timestamps
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Vendor Sales Transaction
 * Track individual sales made by vendors for attribution
 */
export interface VendorSaleTransaction {
  id: string;
  
  // Vendor info
  vendorId: string;
  vendorName: string;
  dispensaryId: string;
  
  // Sale details
  orderId: string;
  orderNumber?: string;
  productId?: string;
  productName?: string;
  customerId: string;
  customerName?: string;
  
  // Financials
  saleAmount: number; // Gross sale amount
  dispensaryCommissionRate: number; // % at time of sale
  dispensaryCommission: number; // Amount to dispensary
  vendorEarnings: number; // Amount to vendor (saleAmount - commission)
  
  // Status
  status: 'pending' | 'completed' | 'refunded';
  payoutRequestId?: string; // If included in a payout request
  
  // Timestamps
  saleDate: Timestamp | Date;
  createdAt: Timestamp | Date;
}

/**
 * Helper Functions
 */

/**
 * Calculate vendor net payout after dispensary commission
 * 
 * Example: R1000 sales with 10% commission
 * - Dispensary gets: R100 (10%)
 * - Vendor gets: R900 (90%)
 */
export function calculateVendorPayout(
  grossSales: number,
  commissionRate: number
): {
  dispensaryCommission: number;
  vendorNetPayout: number;
  vendorReceivesPercentage: number;
} {
  const dispensaryCommission = (grossSales * commissionRate) / 100;
  const vendorNetPayout = grossSales - dispensaryCommission;
  const vendorReceivesPercentage = commissionRate > 100 ? 0 : 100 - commissionRate;
  
  return {
    dispensaryCommission,
    vendorNetPayout: vendorNetPayout < 0 ? 0 : vendorNetPayout,
    vendorReceivesPercentage
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Validate commission rate (5-1000%)
 */
export function isValidCommissionRate(rate: number): boolean {
  return rate >= 5 && rate <= 1000;
}

/**
 * Check if vendor can request payout
 */
export function canRequestVendorPayout(balance: number, minimumPayout: number = 100): boolean {
  return balance >= minimumPayout;
}

// Constants
export const VENDOR_MINIMUM_PAYOUT_AMOUNT = 100; // R100 minimum
export const DEFAULT_COMMISSION_RATE = 10; // 10% default
export const MAX_COMMISSION_RATE = 1000; // 1000% max
export const MIN_COMMISSION_RATE = 5; // 5% min
