/**
 * Platform Driver Payout Types
 * For managing payments to public (independent) drivers
 */

import { Timestamp } from 'firebase/firestore';

export type PlatformPayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';

export interface PlatformDriverPayout {
  id: string;
  
  // Driver information
  driverId: string;
  driverName: string;
  driverEmail: string;
  
  // Delivery & order reference
  deliveryId: string;
  orderId: string;
  orderNumber?: string;
  
  // Dispensary reference (for tracking)
  dispensaryId: string;
  dispensaryName: string;
  
  // Financial details
  deliveryFee: number; // From order.shippingCost
  driverEarnings: number; // 100% of delivery fee
  currency: string; // 'ZAR'
  
  // Banking information (from driver application)
  banking: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    branchCode: string;
  };
  
  // Status & tracking
  status: PlatformPayoutStatus;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  paidAt?: Timestamp;
  
  // Proof & notes
  paymentReference?: string; // Bank reference number
  proofOfPaymentUrl?: string; // Storage URL to proof document
  adminNotes?: string;
  processedBy?: string; // Super Admin userId
  processorName?: string; // Super Admin name
  
  // Failure handling
  failureReason?: string;
  retryCount?: number;
  
  // Delivery completion timestamp
  deliveryCompletedAt?: Timestamp;
}

export interface PayoutBatchExport {
  batchId: string;
  payoutIds: string[];
  totalAmount: number;
  driverCount: number;
  createdAt: Timestamp;
  createdBy: string;
  exportedBy: string;
  fileUrl?: string;
}

export interface PayoutStats {
  totalPending: number;
  totalPendingAmount: number;
  totalProcessing: number;
  totalProcessingAmount: number;
  totalPaidThisMonth: number;
  totalPaidAmountThisMonth: number;
  totalFailedThisMonth: number;
  averagePayoutAmount: number;
  uniqueDriversCount: number;
}
