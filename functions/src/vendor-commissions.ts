/**
 * VENDOR COMMISSION & EARNINGS SYSTEM
 * 
 * Cloud Functions for managing vendor sales tracking, commission calculations,
 * earnings updates, and payout request processing.
 * 
 * Features:
 * - Automatic sales attribution on order delivery
 * - Real-time vendor earnings tracking
 * - Commission calculation based on dispensary rates
 * - Payout request creation and validation
 * - Balance management (current, pending, paid)
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

interface VendorSaleTransaction {
  id: string;
  vendorId: string;
  vendorName: string;
  dispensaryId: string;
  orderId: string;
  orderNumber: string;
  saleAmount: number;
  dispensaryCommissionRate: number;
  dispensaryCommission: number;
  vendorEarnings: number;
  status: 'completed' | 'refunded';
  createdAt: admin.firestore.Timestamp;
}

interface VendorEarnings {
  vendorId: string;
  dispensaryId: string;
  dispensaryCommissionRate: number;
  currentBalance: number;
  pendingBalance: number;
  paidBalance: number;
  totalSales: number;
  totalCommissionPaid: number;
  totalEarnings: number;
  totalSalesCount: number;
  totalPayouts: number;
  lastUpdated: admin.firestore.Timestamp;
}

interface VendorPayoutRequest {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  dispensaryId: string;
  grossSales: number;
  dispensaryCommissionRate: number;
  dispensaryCommission: number;
  netPayout: number;
  salesIds: string[];
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
    accountType: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: admin.firestore.Timestamp;
  approvedAt?: admin.firestore.Timestamp;
  approvedBy?: string;
  approverName?: string;
  paidAt?: admin.firestore.Timestamp;
  paymentReference?: string;
  rejectedAt?: admin.firestore.Timestamp;
  rejectionReason?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate commission breakdown
 */
function calculateVendorPayout(grossSales: number, commissionRate: number) {
  const dispensaryCommission = (grossSales * commissionRate) / 100;
  const vendorNetPayout = grossSales - dispensaryCommission;
  const vendorReceivesPercentage = commissionRate > 100 ? 0 : 100 - commissionRate;
  
  return {
    dispensaryCommission,
    vendorNetPayout,
    vendorReceivesPercentage
  };
}

/**
 * Get or create vendor earnings document
 */
async function getOrCreateVendorEarnings(
  vendorId: string,
  dispensaryId: string,
  commissionRate: number
): Promise<admin.firestore.DocumentReference> {
  const earningsRef = db.collection('vendor_earnings').doc(vendorId);
  const earningsSnap = await earningsRef.get();
  
  if (!earningsSnap.exists) {
    const initialEarnings: VendorEarnings = {
      vendorId,
      dispensaryId,
      dispensaryCommissionRate: commissionRate,
      currentBalance: 0,
      pendingBalance: 0,
      paidBalance: 0,
      totalSales: 0,
      totalCommissionPaid: 0,
      totalEarnings: 0,
      totalSalesCount: 0,
      totalPayouts: 0,
      lastUpdated: admin.firestore.Timestamp.now()
    };
    await earningsRef.set(initialEarnings);
    logger.info(`Created vendor earnings for vendor ${vendorId}`);
  }
  
  return earningsRef;
}

// ============================================================================
// TRIGGER: RECORD VENDOR SALE ON ORDER DELIVERY
// ============================================================================

/**
 * Triggered when an order status changes to 'delivered'
 * Creates VendorSaleTransaction and updates VendorEarnings
 */
export const recordVendorSale = onDocumentUpdated({
  document: 'orders/{orderId}',
  region: 'us-central1',
  secrets: []
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const orderId = event.params.orderId;

  // Only process when order becomes delivered
  if (before?.status !== 'delivered' && after?.status === 'delivered') {
    try {
      // Get all items from the order
      const orderItems = after.items || [];
      
      // Group items by vendorId
      const itemsByVendor = new Map<string, any[]>();
      
      for (const item of orderItems) {
        const vendorId = item.vendorUserId || item.vendorId;
        if (vendorId) {
          if (!itemsByVendor.has(vendorId)) {
            itemsByVendor.set(vendorId, []);
          }
          itemsByVendor.get(vendorId)!.push(item);
        }
      }
      
      // If no vendor items, skip
      if (itemsByVendor.size === 0) {
        logger.info(`Order ${orderId} has no vendor items, skipping vendor sale recording`);
        return;
      }

      logger.info(`Processing order ${orderId} with ${itemsByVendor.size} vendor(s)`);

      // Process each vendor's items
      for (const [vendorId, items] of itemsByVendor.entries()) {
        // Check if sale already recorded for this vendor
        const existingTransaction = await db.collection('vendor_sale_transactions')
          .where('orderId', '==', orderId)
          .where('vendorId', '==', vendorId)
          .limit(1)
          .get();

        if (!existingTransaction.empty) {
          logger.info(`Vendor sale for order ${orderId}, vendor ${vendorId} already recorded`);
          continue;
        }

        // Get vendor details
        const vendorRef = db.collection('users').doc(vendorId);
        const vendorSnap = await vendorRef.get();
        
        if (!vendorSnap.exists) {
          logger.error(`Vendor ${vendorId} not found, skipping`);
          continue;
        }

        const vendorData = vendorSnap.data();
        const commissionRate = vendorData?.dispensaryCommissionRate || 10;
        const vendorName = vendorData?.displayName || vendorData?.name || 'Unknown Vendor';

        // Calculate total sale amount for this vendor's items
        // Use basePrice (vendor's price) not finalPrice (customer price)
        const vendorSaleAmount = items.reduce((sum, item) => {
          const itemBasePrice = item.basePrice || item.price || 0;
          return sum + (itemBasePrice * (item.quantity || 1));
        }, 0);

        // Calculate commission breakdown
        const { dispensaryCommission, vendorNetPayout } = calculateVendorPayout(vendorSaleAmount, commissionRate);

        // Create vendor sale transaction
        const transactionRef = db.collection('vendor_sale_transactions').doc();
        const transaction: VendorSaleTransaction = {
          id: transactionRef.id,
          vendorId,
          vendorName,
          dispensaryId: after.dispensaryId || after.shipments?.[Object.keys(after.shipments)[0]]?.dispensaryId,
          orderId,
          orderNumber: after.orderNumber || orderId,
          saleAmount: vendorSaleAmount,
          dispensaryCommissionRate: commissionRate,
          dispensaryCommission,
          vendorEarnings: vendorNetPayout,
          status: 'completed',
          createdAt: admin.firestore.Timestamp.now()
        };

        await transactionRef.set(transaction);
        logger.info(`Created vendor sale transaction for order ${orderId}, vendor ${vendorId}: R${vendorNetPayout} (${items.length} items)`);

        // Update vendor earnings
        const dispensaryId = after.dispensaryId || after.shipments?.[Object.keys(after.shipments)[0]]?.dispensaryId;
        const earningsRef = await getOrCreateVendorEarnings(vendorId, dispensaryId, commissionRate);
        
        await earningsRef.update({
          currentBalance: admin.firestore.FieldValue.increment(vendorNetPayout),
          totalSales: admin.firestore.FieldValue.increment(vendorSaleAmount),
          totalCommissionPaid: admin.firestore.FieldValue.increment(dispensaryCommission),
          totalEarnings: admin.firestore.FieldValue.increment(vendorNetPayout),
          totalSalesCount: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.Timestamp.now()
        });

        logger.info(`Updated vendor earnings for vendor ${vendorId}`);
      }

    } catch (error) {
      logger.error(`Error recording vendor sale for order ${orderId}:`, error);
      throw error;
    }
  }
});

// ============================================================================
// CALLABLE: CREATE VENDOR PAYOUT REQUEST
// ============================================================================

/**
 * Callable function to create a vendor payout request
 * Validates balance, moves currentBalance to pendingBalance
 */
export const createVendorPayoutRequest = onCall({
  region: 'us-central1',
  secrets: []
}, async (request) => {
  const { auth, data } = request;

  // Authentication check
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const {
    amount,
    bankDetails
  } = data;

  // Validation
  if (!amount || amount < 100) {
    throw new HttpsError('invalid-argument', 'Minimum payout amount is R100');
  }

  if (!bankDetails || !bankDetails.bankName || !bankDetails.accountNumber) {
    throw new HttpsError('invalid-argument', 'Bank details are required');
  }

  try {
    const vendorId = auth.uid;

    // Get vendor user data
    const vendorSnap = await db.collection('users').doc(vendorId).get();
    if (!vendorSnap.exists) {
      throw new HttpsError('not-found', 'Vendor not found');
    }

    const vendorData = vendorSnap.data();
    
    // Check if user is a vendor
    if (vendorData?.crewMemberType !== 'Vendor' || vendorData?.role !== 'DispensaryStaff') {
      throw new HttpsError('permission-denied', 'Only vendors can request payouts');
    }

    const dispensaryId = vendorData.dispensaryId;
    const commissionRate = vendorData.dispensaryCommissionRate || 10;
    const vendorName = vendorData.displayName || vendorData.name || 'Unknown Vendor';
    const vendorEmail = vendorData.email || '';

    // Check if dispensary has been paid by platform
    const dispensaryPayoutsQuery = await db.collection('dispensary_payout_requests')
      .where('dispensaryId', '==', dispensaryId)
      .where('status', 'in', ['approved', 'completed'])
      .limit(1)
      .get();

    if (dispensaryPayoutsQuery.empty) {
      throw new HttpsError('failed-precondition', 'Dispensary has not received payment from platform yet. Please wait until the dispensary is paid.');
    }

    // Get vendor earnings
    const earningsRef = db.collection('vendor_earnings').doc(vendorId);
    const earningsSnap = await earningsRef.get();

    if (!earningsSnap.exists) {
      throw new HttpsError('not-found', 'Vendor earnings not found');
    }

    const earnings = earningsSnap.data() as VendorEarnings;

    // Check if vendor has sufficient balance
    if (earnings.currentBalance < amount) {
      throw new HttpsError('failed-precondition', `Insufficient balance. Available: R${earnings.currentBalance.toFixed(2)}`);
    }

    // Calculate commission breakdown for the payout amount
    const { dispensaryCommission, vendorNetPayout } = calculateVendorPayout(amount, commissionRate);

    // Get recent sales for this payout (for salesIds tracking)
    const salesQuery = await db.collection('vendor_sale_transactions')
      .where('vendorId', '==', vendorId)
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const salesIds = salesQuery.docs.map(doc => doc.id);

    // Create payout request using a transaction
    const payoutRef = db.collection('vendor_payout_requests').doc();
    
    await db.runTransaction(async (transaction) => {
      // Re-read earnings in transaction
      const earningsInTxn = await transaction.get(earningsRef);
      const currentEarnings = earningsInTxn.data() as VendorEarnings;

      // Double-check balance in transaction
      if (currentEarnings.currentBalance < amount) {
        throw new HttpsError('failed-precondition', 'Insufficient balance');
      }

      const payoutRequest: VendorPayoutRequest = {
        id: payoutRef.id,
        vendorId,
        vendorName,
        vendorEmail,
        dispensaryId,
        grossSales: amount,
        dispensaryCommissionRate: commissionRate,
        dispensaryCommission,
        netPayout: vendorNetPayout,
        salesIds,
        bankDetails,
        status: 'pending',
        requestedAt: admin.firestore.Timestamp.now()
      };

      // Create payout request
      transaction.set(payoutRef, payoutRequest);

      // Update vendor earnings: move currentBalance to pendingBalance
      transaction.update(earningsRef, {
        currentBalance: admin.firestore.FieldValue.increment(-amount),
        pendingBalance: admin.firestore.FieldValue.increment(amount),
        lastUpdated: admin.firestore.Timestamp.now()
      });
    });

    logger.info(`Created vendor payout request ${payoutRef.id} for vendor ${vendorId}, amount: R${amount}`);

    return {
      success: true,
      payoutId: payoutRef.id,
      message: 'Payout request created successfully'
    };

  } catch (error: any) {
    logger.error('Error creating vendor payout request:', error);
    throw error;
  }
});

// ============================================================================
// TRIGGER: UPDATE EARNINGS ON PAYOUT STATUS CHANGE
// ============================================================================

/**
 * Triggered when a vendor payout request status changes
 * Updates vendor earnings accordingly
 */
export const updateVendorEarningsOnPayoutChange = onDocumentUpdated({
  document: 'vendor_payout_requests/{payoutId}',
  region: 'us-central1',
  secrets: []
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const payoutId = event.params.payoutId;

  if (!before || !after) return;

  const vendorId = after.vendorId;
  const amount = after.grossSales;

  try {
    const earningsRef = db.collection('vendor_earnings').doc(vendorId);

    // Status changed from pending to approved
    if (before.status === 'pending' && after.status === 'approved') {
      logger.info(`Payout ${payoutId} approved for vendor ${vendorId}`);
      // No balance change needed - already moved to pending when created
    }

    // Status changed to paid
    if (before.status !== 'paid' && after.status === 'paid') {
      await earningsRef.update({
        pendingBalance: admin.firestore.FieldValue.increment(-amount),
        paidBalance: admin.firestore.FieldValue.increment(amount),
        totalPayouts: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.Timestamp.now()
      });
      logger.info(`Payout ${payoutId} marked as paid for vendor ${vendorId}, moved R${amount} to paidBalance`);
    }

    // Status changed to rejected
    if (before.status === 'pending' && after.status === 'rejected') {
      // Return amount from pending back to current
      await earningsRef.update({
        currentBalance: admin.firestore.FieldValue.increment(amount),
        pendingBalance: admin.firestore.FieldValue.increment(-amount),
        lastUpdated: admin.firestore.Timestamp.now()
      });
      logger.info(`Payout ${payoutId} rejected for vendor ${vendorId}, returned R${amount} to currentBalance`);
    }

  } catch (error) {
    logger.error(`Error updating vendor earnings for payout ${payoutId}:`, error);
    throw error;
  }
});
