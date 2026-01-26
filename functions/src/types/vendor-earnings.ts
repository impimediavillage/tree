import { Timestamp } from 'firebase-admin/firestore';

/**
 * Vendor Payout Request Types (Cloud Functions)
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
 */
export interface VendorEarnings {
  vendorId: string;
  vendorName: string;
  dispensaryId: string;
  
  // Commission settings
  dispensaryCommissionRate: number;
  
  // Earnings
  totalSales: number;
  totalCommissionPaid: number;
  totalEarnings: number;
  
  // Balances
  currentBalance: number;
  pendingBalance: number;
  paidBalance: number;
  
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
 */
export interface VendorSaleTransaction {
  id: string;
  vendorId: string;
  vendorName: string;
  dispensaryId: string;
  orderId: string;
  orderNumber?: string;
  productId?: string;
  productName?: string;
  customerId: string;
  customerName?: string;
  saleAmount: number;
  dispensaryCommissionRate: number;
  dispensaryCommission: number;
  vendorEarnings: number;
  status: 'pending' | 'completed' | 'refunded';
  payoutRequestId?: string;
  saleDate: Timestamp | Date;
  createdAt: Timestamp | Date;
}

/**
 * Helper function to calculate vendor payout breakdown
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

export const VENDOR_MINIMUM_PAYOUT_AMOUNT = 100; // R100 minimum
export const DEFAULT_COMMISSION_RATE = 10; // 10% default
export const MAX_COMMISSION_RATE = 1000; // 1000% max
export const MIN_COMMISSION_RATE = 5; // 5% min
