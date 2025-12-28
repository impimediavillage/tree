import * as admin from 'firebase-admin';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import type {
  DispensaryEarnings,
  BankAccountDetails,
  StaffPayoutBreakdown,
} from './types/dispensary-earnings';
import {
  DISPENSARY_MINIMUM_PAYOUT_AMOUNT,
  DISPENSARY_COMMISSION_RATE,
  calculateDispensaryCommission,
} from './types/dispensary-earnings';

/**
 * Record dispensary earnings when an order is delivered
 * Triggered on order status change to 'delivered'
 */
export const recordDispensaryEarning = onDocumentUpdated(
  'orders/{orderId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const orderId = event.params.orderId;

    if (!beforeData || !afterData) {
      console.log('Missing before/after data');
      return;
    }

    // Only trigger when status changes to 'delivered'
    if (beforeData.orderStatus !== 'delivered' && afterData.orderStatus === 'delivered') {
      // Check if this is a dispensary order (not Treehouse)
      if (afterData.orderType === 'treehouse') {
        console.log('Treehouse order, skipping dispensary earnings');
        return;
      }

      const dispensaryId = afterData.dispensaryId;
      const orderTotal = afterData.totalAmount || 0;

      if (!dispensaryId || orderTotal <= 0) {
        console.log('Missing dispensaryId or invalid order total');
        return;
      }

      try {
        const db = admin.firestore();

        // Get dispensary info to find staff
        const dispensaryRef = db.collection('dispensaries').doc(dispensaryId);
        const dispensarySnap = await dispensaryRef.get();

        if (!dispensarySnap.exists) {
          console.error('Dispensary not found:', dispensaryId);
          return;
        }

        const dispensaryData = dispensarySnap.data();
        const ownerId = dispensaryData?.ownerUid;

        if (!ownerId) {
          console.error('Dispensary owner not found');
          return;
        }

        // Use new pricing system field if available, fallback to legacy calculation
        let commission: number;
        if (afterData.totalDispensaryEarnings !== undefined) {
          // New pricing system - use the pre-calculated dispensary earnings
          commission = afterData.totalDispensaryEarnings;
          console.log('Using new pricing system totalDispensaryEarnings:', commission);
        } else {
          // Legacy system - calculate commission (default 15%)
          const commissionRate = dispensaryData?.commissionRate || DISPENSARY_COMMISSION_RATE;
          commission = calculateDispensaryCommission(orderTotal, commissionRate);
          console.log('Using legacy commission calculation:', commission);
        }

        // For now, assign all commission to the dispensary owner
        // In the future, this could be split among staff who worked on the order
        const earningsRef = db.collection('dispensary_earnings').doc(ownerId);
        const earningsSnap = await earningsRef.get();

        if (earningsSnap.exists) {
          // Update existing earnings
          await earningsRef.update({
            currentBalance: admin.firestore.FieldValue.increment(commission),
            totalEarned: admin.firestore.FieldValue.increment(commission),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // Create new earnings record
          const newEarnings: any = {
            userId: ownerId,
            dispensaryId,
            currentBalance: commission,
            pendingBalance: 0,
            totalEarned: commission,
            totalWithdrawn: 0,
            role: 'dispensary-admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          await earningsRef.set(newEarnings);
        }

        // Create transaction record
        const transactionRef = db.collection('dispensary_transactions').doc();
        const transaction: any = {
          userId: ownerId,
          dispensaryId,
          orderId,
          type: 'order_commission',
          amount: commission,
          description: `Commission from order #${afterData.orderNumber || orderId}`,
          balanceAfter: (earningsSnap.exists ? (earningsSnap.data() as DispensaryEarnings).currentBalance : 0) + commission,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await transactionRef.set(transaction);

        console.log(`Recorded R${commission} earnings for dispensary ${dispensaryId}`);
      } catch (error) {
        console.error('Error recording dispensary earnings:', error);
      }
    }
  }
);

/**
 * Create a dispensary payout request
 * Supports individual (staff only) and combined (admin + all staff) payouts
 */
export const createDispensaryPayoutRequest = onCall(
  async (request: CallableRequest<{
    userId: string;
    dispensaryId: string;
    requestedAmount: number;
    accountDetails: BankAccountDetails;
    payoutType: 'individual' | 'combined';
    staffIncluded?: string[];
    staffBreakdown?: StaffPayoutBreakdown[];
  }>): Promise<{ success: boolean; requestId: string }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const {
      userId,
      dispensaryId,
      requestedAmount,
      accountDetails,
      payoutType,
      staffIncluded,
      staffBreakdown,
    } = request.data;

    // Validate required fields
    if (!userId || !dispensaryId || !requestedAmount || !accountDetails || !payoutType) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    // Validate minimum payout amount
    if (requestedAmount < DISPENSARY_MINIMUM_PAYOUT_AMOUNT) {
      throw new HttpsError(
        'invalid-argument',
        `Minimum payout amount is R${DISPENSARY_MINIMUM_PAYOUT_AMOUNT}`
      );
    }

    // Validate bank account details
    if (
      !accountDetails.accountHolder ||
      !accountDetails.bankName ||
      !accountDetails.accountNumber ||
      !accountDetails.branchCode
    ) {
      throw new HttpsError('invalid-argument', 'Incomplete bank account details');
    }

    try {
      const db = admin.firestore();

      if (payoutType === 'individual') {
        // Individual payout - single staff member
        const earningsRef = db.collection('dispensary_earnings').doc(userId);
        const earningsSnap = await earningsRef.get();

        if (!earningsSnap.exists) {
          throw new HttpsError('not-found', 'Earnings record not found');
        }

        const earnings = earningsSnap.data() as DispensaryEarnings;

        if (earnings.currentBalance < requestedAmount) {
          throw new HttpsError(
            'invalid-argument',
            `Insufficient balance. Available: R${earnings.currentBalance}`
          );
        }

        // Create payout request
        const payoutRef = db.collection('dispensary_payout_requests').doc();
        const payoutRequest: any = {
          userId,
          dispensaryId,
          payoutType: 'individual',
          requestedAmount,
          status: 'pending',
          accountDetails,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await payoutRef.set(payoutRequest);

        // Move balance from current to pending
        await earningsRef.update({
          currentBalance: admin.firestore.FieldValue.increment(-requestedAmount),
          pendingBalance: admin.firestore.FieldValue.increment(requestedAmount),
          accountDetails, // Save account details
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create transaction
        const transactionRef = db.collection('dispensary_transactions').doc();
        const transaction: any = {
          userId,
          dispensaryId,
          orderId: payoutRef.id,
          type: 'payout',
          amount: -requestedAmount,
          description: `Payout request #${payoutRef.id.slice(-6)}`,
          balanceAfter: earnings.currentBalance - requestedAmount,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await transactionRef.set(transaction);

        return { success: true, requestId: payoutRef.id };

      } else {
        // Combined payout - admin + all staff
        
        // Verify user is dispensary admin
        const userEarningsRef = db.collection('dispensary_earnings').doc(userId);
        const userEarningsSnap = await userEarningsRef.get();

        if (!userEarningsSnap.exists) {
          throw new HttpsError('not-found', 'Your earnings record not found');
        }

        const userEarnings = userEarningsSnap.data() as DispensaryEarnings;

        if (userEarnings.role !== 'dispensary-admin') {
          throw new HttpsError(
            'permission-denied',
            'Only dispensary admins can request combined payouts'
          );
        }

        if (!staffIncluded || staffIncluded.length === 0) {
          throw new HttpsError('invalid-argument', 'No staff members included in combined payout');
        }

        // Fetch all staff earnings and validate balances
        const staffEarningsPromises = staffIncluded.map((staffId) =>
          db.collection('dispensary_earnings').doc(staffId).get()
        );
        const staffEarningsSnaps = await Promise.all(staffEarningsPromises);

        let totalAvailable = 0;
        const validStaffBreakdown: StaffPayoutBreakdown[] = [];

        for (let i = 0; i < staffEarningsSnaps.length; i++) {
          const snap = staffEarningsSnaps[i];
          if (snap.exists) {
            const staffEarnings = snap.data() as DispensaryEarnings;
            totalAvailable += staffEarnings.currentBalance;

            // Build staff breakdown
            const userRef = db.collection('users').doc(staffEarnings.userId);
            const userSnap = await userRef.get();
            const userName = userSnap.exists
              ? userSnap.data()?.displayName || userSnap.data()?.email || 'Unknown'
              : 'Unknown';

            validStaffBreakdown.push({
              userId: staffEarnings.userId,
              userName,
              role: staffEarnings.role,
              amount: staffEarnings.currentBalance,
              currentBalance: staffEarnings.currentBalance,
            });
          }
        }

        if (totalAvailable < requestedAmount) {
          throw new HttpsError(
            'invalid-argument',
            `Insufficient combined balance. Available: R${totalAvailable}, Requested: R${requestedAmount}`
          );
        }

        // Create combined payout request
        const payoutRef = db.collection('dispensary_payout_requests').doc();
        const payoutRequest: any = {
          userId,
          dispensaryId,
          payoutType: 'combined',
          requestedAmount,
          staffIncluded,
          staffBreakdown: staffBreakdown || validStaffBreakdown,
          status: 'pending',
          accountDetails,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await payoutRef.set(payoutRequest);

        // Update all staff earnings (move to pending)
        const updatePromises = staffIncluded.map((staffId) => {
          const earningsRef = db.collection('dispensary_earnings').doc(staffId);
          return earningsRef.get().then((snap) => {
            if (snap.exists) {
              const earnings = snap.data() as DispensaryEarnings;
              const amount = earnings.currentBalance;
              return earningsRef.update({
                currentBalance: 0,
                pendingBalance: admin.firestore.FieldValue.increment(amount),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
            return undefined;
          });
        });

        await Promise.all(updatePromises);

        // Create transactions for all staff
        const transactionPromises = validStaffBreakdown.map((staff) => {
          const transactionRef = db.collection('dispensary_transactions').doc();
          const transaction: any = {
            userId: staff.userId,
            dispensaryId,
            orderId: payoutRef.id,
            type: 'payout',
            amount: -staff.amount,
            description: `Combined payout request #${payoutRef.id.slice(-6)}`,
            balanceAfter: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          return transactionRef.set(transaction);
        });

        await Promise.all(transactionPromises);

        return { success: true, requestId: payoutRef.id };
      }
    } catch (error: any) {
      console.error('Error creating dispensary payout request:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to create payout request');
    }
  }
);
