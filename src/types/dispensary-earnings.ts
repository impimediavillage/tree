import { Timestamp } from 'firebase/firestore';

/**
 * Dispensary Earnings Types
 * Parallel system to Creator Earnings but for dispensary staff
 */

export interface DispensaryEarnings {
  userId: string;
  dispensaryId: string;
  currentBalance: number; // Available for payout
  pendingBalance: number; // In processing payouts
  totalEarned: number; // Lifetime earnings
  totalWithdrawn: number; // Lifetime withdrawn
  role: 'dispensary-admin' | 'dispensary-staff';
  accountDetails?: BankAccountDetails;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface BankAccountDetails {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  accountType: 'savings' | 'current';
  branchCode: string;
}

export interface DispensaryPayoutRequest {
  id: string;
  userId: string; // Who requested the payout
  dispensaryId: string;
  payoutType: 'individual' | 'combined';
  requestedAmount: number;
  
  // For combined payouts
  staffIncluded?: string[]; // Array of staff user IDs included in combined payout
  staffBreakdown?: StaffPayoutBreakdown[]; // Individual amounts per staff member
  
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';
  accountDetails: BankAccountDetails;
  
  // Admin processing fields
  rejectionReason?: string;
  paymentReference?: string;
  processedBy?: string;
  processedAt?: Timestamp | Date;
  
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface StaffPayoutBreakdown {
  userId: string;
  userName: string;
  role: 'dispensary-admin' | 'dispensary-staff';
  amount: number;
  currentBalance: number; // Balance at time of request
}

export interface DispensaryEarningsTransaction {
  id: string;
  userId: string;
  dispensaryId: string;
  orderId: string;
  type: 'order_commission' | 'payout' | 'refund' | 'adjustment';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: Timestamp | Date;
}

// Constants
export const DISPENSARY_MINIMUM_PAYOUT_AMOUNT = 500; // R500 minimum
export const DISPENSARY_COMMISSION_RATE = 0.15; // 15% commission (configurable per dispensary)

// Helper functions
export function canRequestPayout(balance: number): boolean {
  return balance >= DISPENSARY_MINIMUM_PAYOUT_AMOUNT;
}

export function calculateDispensaryCommission(
  orderTotal: number,
  commissionRate: number = DISPENSARY_COMMISSION_RATE
): number {
  return Math.round(orderTotal * commissionRate * 100) / 100;
}

export function formatCurrency(amount: number): string {
  return `R${amount.toFixed(2)}`;
}

export function getPayoutStatusColor(status: DispensaryPayoutRequest['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500';
    case 'approved':
      return 'bg-blue-500';
    case 'processing':
      return 'bg-purple-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
    case 'rejected':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

export function getPayoutStatusLabel(status: DispensaryPayoutRequest['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export interface DispensaryEarningsStats {
  totalStaff: number;
  totalEarnings: number;
  totalPending: number;
  totalWithdrawn: number;
  averageEarnings: number;
  topEarner?: {
    userId: string;
    userName: string;
    amount: number;
  };
}
