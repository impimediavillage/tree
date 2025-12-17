import { Timestamp } from 'firebase/firestore';

export interface CreatorEarnings {
  id?: string;
  creatorId: string;
  creatorName?: string;
  creatorEmail?: string;
  currentBalance: number; // Available to withdraw
  pendingBalance: number; // In pending payouts
  totalEarned: number; // Lifetime earnings
  totalWithdrawn: number; // Total paid out
  lastPayoutDate?: Timestamp | Date | null;
  lastPayoutAmount?: number;
  accountDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountType?: string;
    branchCode?: string;
    accountHolderName?: string;
  };
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface EarningsTransaction {
  id?: string;
  creatorId: string;
  orderId: string;
  productId: string;
  productName: string;
  orderAmount: number; // Total order amount
  commissionRate: number; // e.g., 0.25 for 25%
  commissionAmount: number; // Amount earned
  status: 'pending' | 'completed' | 'refunded';
  transactionDate: Timestamp | Date;
  completedDate?: Timestamp | Date | null;
  metadata?: {
    customerName?: string;
    orderNumber?: string;
  };
}

export interface PayoutRequest {
  id?: string;
  creatorId: string;
  creatorName: string;
  creatorEmail?: string;
  requestedAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'failed';
  requestDate: Timestamp | Date;
  processedDate?: Timestamp | Date | null;
  completedDate?: Timestamp | Date | null;
  processedBy?: string; // Super Admin UID
  processedByName?: string;
  rejectionReason?: string;
  paymentMethod: 'bank_transfer' | 'eft' | 'payfast';
  paymentReference?: string;
  accountDetails: {
    bankName: string;
    accountNumber: string;
    accountType: string;
    branchCode?: string;
    accountHolderName: string;
  };
  creatorNotes?: string;
  notes?: string;
  adminNotes?: string;
}

export interface CreatePayoutRequestData {
  amount: number;
  accountDetails: {
    bankName: string;
    accountNumber: string;
    accountType: 'Savings' | 'Cheque';
    branchCode?: string;
    accountHolderName: string;
  };
  notes?: string;
}

export interface ProcessPayoutData {
  payoutId: string;
  action: 'approve' | 'reject' | 'complete' | 'fail';
  paymentReference?: string;
  rejectionReason?: string;
  adminNotes?: string;
}

export const MINIMUM_PAYOUT_AMOUNT = 500;
export const CREATOR_COMMISSION_RATE = 0.25; // 25%

// Helper functions
export const canRequestPayout = (balance: number): boolean => {
  return balance >= MINIMUM_PAYOUT_AMOUNT;
};

export const calculateCommission = (orderAmount: number, rate: number = CREATOR_COMMISSION_RATE): number => {
  return Math.round(orderAmount * rate * 100) / 100; // Round to 2 decimals
};
