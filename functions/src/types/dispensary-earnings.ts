import { Timestamp } from 'firebase-admin/firestore';

export interface DispensaryEarnings {
  userId: string;
  dispensaryId: string;
  currentBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
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
  userId: string;
  dispensaryId: string;
  payoutType: 'individual' | 'combined';
  requestedAmount: number;
  salesRevenue?: number;
  driverFees?: number;
  vendorCommissions?: number;
  staffIncluded?: string[];
  staffBreakdown?: StaffPayoutBreakdown[];
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';
  accountDetails: BankAccountDetails;
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
  currentBalance: number;
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

export const DISPENSARY_MINIMUM_PAYOUT_AMOUNT = 500;
export const DISPENSARY_COMMISSION_RATE = 0.15;

export function calculateDispensaryCommission(orderTotal: number, commissionRate: number = DISPENSARY_COMMISSION_RATE): number {
  return Math.round(orderTotal * commissionRate * 100) / 100;
}
