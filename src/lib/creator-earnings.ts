/**
 * Creator Earnings System
 * Handles 25% commission calculations and payouts
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { CREATOR_COMMISSION_RATE, PLATFORM_COMMISSION_RATE } from '@/types/creator-lab';
import type { SaleRecord, PayoutRecord, ApparelType } from '@/types/creator-lab';

const db = getFirestore();

export interface ProcessSaleParams {
  orderId: string;
  creatorId: string;
  productId: string;
  apparelType: string;
  quantity: number;
  totalAmount: number; // Total sale amount in ZAR
  orderDate: any;
}

export interface ProcessPayoutParams {
  userId: string;
  amount: number;
  payoutMethod: 'bank_transfer' | 'store_credit' | 'other';
  transactionReference?: string;
  notes?: string;
}

/**
 * Process a sale and update creator earnings
 * Called when a Treehouse order is completed/shipped
 */
export async function processSale(params: ProcessSaleParams): Promise<void> {
  const {
    orderId,
    creatorId,
    productId,
    apparelType,
    quantity,
    totalAmount,
    orderDate,
  } = params;

  // Calculate commissions
  const creatorCommission = Math.round(totalAmount * CREATOR_COMMISSION_RATE);
  const platformCommission = Math.round(totalAmount * PLATFORM_COMMISSION_RATE);

  const earningsRef = db.collection('creatorEarnings').doc(creatorId);

  await db.runTransaction(async (transaction) => {
    const earningsDoc = await transaction.get(earningsRef);

    const saleRecord: SaleRecord = {
      orderId,
      productId,
      apparelType: apparelType as ApparelType,
      quantity,
      saleAmount: totalAmount,
      commission: creatorCommission,
      orderDate: orderDate || FieldValue.serverTimestamp(),
      status: 'shipped',
    };

    if (!earningsDoc.exists) {
      // Create new earnings document
      const userDoc = await transaction.get(db.collection('users').doc(creatorId));
      const userData = userDoc.data();

      transaction.set(earningsRef, {
        userId: creatorId,
        userEmail: userData?.email || '',
        userName: userData?.name || '',
        totalSales: totalAmount,
        totalCommission: creatorCommission,
        pendingPayout: creatorCommission,
        paidOut: 0,
        productsSold: quantity,
        activeProducts: 0,
        lastSaleDate: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        salesHistory: [saleRecord],
        payoutHistory: [],
      });
    } else {
      // Update existing earnings
      const current = earningsDoc.data();
      const salesHistory = current?.salesHistory || [];

      transaction.update(earningsRef, {
        totalSales: (current?.totalSales || 0) + totalAmount,
        totalCommission: (current?.totalCommission || 0) + creatorCommission,
        pendingPayout: (current?.pendingPayout || 0) + creatorCommission,
        productsSold: (current?.productsSold || 0) + quantity,
        lastSaleDate: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        salesHistory: [...salesHistory, saleRecord],
      });
    }

    // Log transaction in creditTransactions collection
    const transactionRef = db.collection('creditTransactions').doc();
    transaction.set(transactionRef, {
      userId: creatorId,
      type: 'treehouse_sale',
      amount: creatorCommission,
      description: `Sale commission (25%) for order ${orderId}`,
      orderId,
      productId,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update product stats
    const productRef = db.collection('treehouseProducts').doc(productId);
    const productDoc = await transaction.get(productRef);
    
    if (productDoc.exists) {
      const productData = productDoc.data();
      transaction.update(productRef, {
        salesCount: (productData?.salesCount || 0) + quantity,
        totalRevenue: (productData?.totalRevenue || 0) + totalAmount,
      });
    }
  });
}

/**
 * Process a payout to a creator
 * Minimum payout: R500
 */
export async function processPayout(params: ProcessPayoutParams): Promise<{ success: boolean; message: string }> {
  const { userId, amount, payoutMethod, transactionReference, notes } = params;

  const MINIMUM_PAYOUT = 500; // R500 minimum

  if (amount < MINIMUM_PAYOUT) {
    return {
      success: false,
      message: `Minimum payout amount is R${MINIMUM_PAYOUT}`,
    };
  }

  const earningsRef = db.collection('creatorEarnings').doc(userId);

  try {
    await db.runTransaction(async (transaction) => {
      const earningsDoc = await transaction.get(earningsRef);

      if (!earningsDoc.exists) {
        throw new Error('Earnings record not found');
      }

      const earnings = earningsDoc.data();
      const pendingPayout = earnings?.pendingPayout || 0;

      if (amount > pendingPayout) {
        throw new Error(`Insufficient funds. Available: R${pendingPayout}`);
      }

      const payoutRecord: PayoutRecord = {
        payoutId: `payout_${Date.now()}`,
        amount,
        payoutMethod,
        payoutDate: FieldValue.serverTimestamp(),
        transactionReference,
        status: 'completed',
        notes,
      };

      const payoutHistory = earnings?.payoutHistory || [];

      transaction.update(earningsRef, {
        pendingPayout: pendingPayout - amount,
        paidOut: (earnings?.paidOut || 0) + amount,
        lastPayoutDate: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        payoutHistory: [...payoutHistory, payoutRecord],
      });

      // Log in creditTransactions
      const transactionRef = db.collection('creditTransactions').doc();
      transaction.set(transactionRef, {
        userId,
        type: 'treehouse_payout',
        amount: -amount,
        description: `Payout via ${payoutMethod}`,
        payoutMethod,
        transactionReference,
        status: 'completed',
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      success: true,
      message: `Successfully processed payout of R${amount}`,
    };
  } catch (error: any) {
    console.error('Payout processing error:', error);
    return {
      success: false,
      message: error.message || 'Payout processing failed',
    };
  }
}

/**
 * Get creator earnings summary
 */
export async function getCreatorEarnings(userId: string) {
  const earningsDoc = await db.collection('creatorEarnings').doc(userId).get();

  if (!earningsDoc.exists) {
    return {
      totalSales: 0,
      totalCommission: 0,
      pendingPayout: 0,
      paidOut: 0,
      productsSold: 0,
      activeProducts: 0,
      salesHistory: [],
      payoutHistory: [],
    };
  }

  return earningsDoc.data();
}

/**
 * Calculate platform revenue from a sale
 */
export function calculatePlatformRevenue(totalAmount: number): number {
  return Math.round(totalAmount * PLATFORM_COMMISSION_RATE);
}

/**
 * Calculate creator commission from a sale
 */
export function calculateCreatorCommission(totalAmount: number): number {
  return Math.round(totalAmount * CREATOR_COMMISSION_RATE);
}

/**
 * Generate payout report for admin
 */
export async function generatePayoutReport() {
  const earningsSnapshot = await db
    .collection('creatorEarnings')
    .where('pendingPayout', '>', 0)
    .orderBy('pendingPayout', 'desc')
    .get();

  const report = earningsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      userId: doc.id,
      userName: data.userName,
      userEmail: data.userEmail,
      pendingPayout: data.pendingPayout,
      totalCommission: data.totalCommission,
      paidOut: data.paidOut,
      productsSold: data.productsSold,
      activeProducts: data.activeProducts,
      lastSaleDate: data.lastSaleDate,
    };
  });

  const totalPending = report.reduce((sum, creator) => sum + (creator.pendingPayout || 0), 0);

  return {
    creators: report,
    totalCreators: report.length,
    totalPendingPayout: totalPending,
    generatedAt: new Date().toISOString(),
  };
}
