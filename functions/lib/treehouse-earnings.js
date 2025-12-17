"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPayoutCompletion = exports.createPayoutRequest = exports.recordTreehouseEarning = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const CREATOR_COMMISSION_RATE = 0.25; // 25% commission
/**
 * Cloud Function that automatically records creator earnings when a Treehouse order is completed
 * Triggered on treehouse_orders document update
 */
exports.recordTreehouseEarning = (0, firestore_1.onDocumentUpdated)('treehouse_orders/{orderId}', async (event) => {
    const orderId = event.params.orderId;
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
        logger.warn(`Missing data for order ${orderId}`);
        return;
    }
    // Only process when status changes to 'delivered'
    if (before.status !== 'delivered' && after.status === 'delivered') {
        logger.info(`Processing earnings for delivered order ${orderId}`);
        const db = admin.firestore();
        try {
            const { creatorId, creatorName, productId, productName, totalAmount, quantity, unitPrice, } = after;
            if (!creatorId) {
                logger.error(`No creatorId found for order ${orderId}`);
                return;
            }
            // Calculate commission (25% of total amount)
            const commissionAmount = totalAmount * CREATOR_COMMISSION_RATE;
            // Create earnings transaction record
            const transactionData = {
                orderId,
                creatorId,
                creatorName: creatorName || 'Unknown Creator',
                productId,
                productName: productName || 'Unknown Product',
                orderAmount: totalAmount,
                quantity,
                unitPrice,
                commissionRate: CREATOR_COMMISSION_RATE,
                commissionAmount,
                status: 'completed',
                transactionDate: admin.firestore.Timestamp.now(),
                createdAt: admin.firestore.Timestamp.now(),
            };
            // Add transaction to earnings_transactions collection
            await db.collection('earnings_transactions').add(transactionData);
            logger.info(`Created earnings transaction for order ${orderId}`);
            // Update or create creator_earnings document
            const earningsRef = db.collection('creator_earnings').doc(creatorId);
            const earningsDoc = await earningsRef.get();
            if (earningsDoc.exists) {
                // Update existing earnings
                const currentData = earningsDoc.data();
                await earningsRef.update({
                    currentBalance: (currentData?.currentBalance || 0) + commissionAmount,
                    totalEarned: (currentData?.totalEarned || 0) + commissionAmount,
                    updatedAt: admin.firestore.Timestamp.now(),
                });
                logger.info(`Updated earnings for creator ${creatorId}: +R${commissionAmount.toFixed(2)}`);
            }
            else {
                // Create new earnings document
                await earningsRef.set({
                    creatorId,
                    currentBalance: commissionAmount,
                    pendingBalance: 0,
                    totalEarned: commissionAmount,
                    totalWithdrawn: 0,
                    createdAt: admin.firestore.Timestamp.now(),
                    updatedAt: admin.firestore.Timestamp.now(),
                });
                logger.info(`Created new earnings document for creator ${creatorId}`);
            }
            // Update order with earnings info
            await db.collection('treehouse_orders').doc(orderId).update({
                creatorEarnings: commissionAmount,
                earningsRecorded: true,
                earningsRecordedAt: admin.firestore.Timestamp.now(),
            });
            logger.info(`Successfully processed earnings for order ${orderId}`);
        }
        catch (error) {
            logger.error(`Error processing earnings for order ${orderId}:`, error);
            throw error;
        }
    }
});
/**
 * Cloud Function for creators to request a payout
 * Validates balance, creates payout request, and updates earnings
 */
exports.createPayoutRequest = (0, https_1.onCall)(async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to request a payout.');
    }
    const userId = request.auth.uid;
    const { requestedAmount, accountDetails, creatorNotes, } = request.data;
    // Validate input
    if (!requestedAmount || requestedAmount < 500) {
        throw new https_1.HttpsError('invalid-argument', 'Minimum payout amount is R500.');
    }
    if (!accountDetails?.bankName || !accountDetails?.accountNumber || !accountDetails?.accountType || !accountDetails?.branchCode || !accountDetails?.accountHolderName) {
        throw new https_1.HttpsError('invalid-argument', 'Complete bank details are required (bankName, accountNumber, accountType, branchCode, accountHolderName).');
    }
    const db = admin.firestore();
    try {
        // Get creator earnings
        const earningsRef = db.collection('creator_earnings').doc(userId);
        const earningsDoc = await earningsRef.get();
        if (!earningsDoc.exists) {
            throw new https_1.HttpsError('not-found', 'No earnings record found for this user.');
        }
        const earnings = earningsDoc.data();
        const currentBalance = earnings?.currentBalance || 0;
        // Validate balance
        if (currentBalance < requestedAmount) {
            throw new https_1.HttpsError('failed-precondition', `Insufficient balance. Available: R${currentBalance.toFixed(2)}, Requested: R${requestedAmount.toFixed(2)}`);
        }
        if (currentBalance < 500) {
            throw new https_1.HttpsError('failed-precondition', 'Minimum payout amount is R500.');
        }
        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const creatorName = userData?.displayName || userData?.name || 'Creator';
        // Create payout request
        const payoutRequestData = {
            creatorId: userId,
            creatorName,
            requestedAmount,
            status: 'pending',
            requestDate: admin.firestore.Timestamp.now(),
            accountDetails: {
                bankName: accountDetails.bankName,
                accountNumber: accountDetails.accountNumber,
                accountType: accountDetails.accountType,
                branchCode: accountDetails.branchCode,
                accountHolderName: accountDetails.accountHolderName,
            },
            paymentMethod: 'bank_transfer',
            creatorNotes: creatorNotes || '',
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        };
        const payoutRef = await db.collection('payout_requests').add(payoutRequestData);
        logger.info(`Created payout request ${payoutRef.id} for creator ${userId}`);
        // Update creator earnings - move currentBalance to pendingBalance
        await earningsRef.update({
            currentBalance: 0,
            pendingBalance: (earnings?.pendingBalance || 0) + requestedAmount,
            accountDetails: accountDetails,
            updatedAt: admin.firestore.Timestamp.now(),
        });
        logger.info(`Updated earnings for creator ${userId}: moved R${requestedAmount.toFixed(2)} to pending`);
        return {
            success: true,
            payoutRequestId: payoutRef.id,
            message: `Payout request for R${requestedAmount.toFixed(2)} has been submitted successfully.`,
        };
    }
    catch (error) {
        logger.error(`Error creating payout request for user ${userId}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Failed to create payout request. Please try again later.');
    }
});
/**
 * Helper function to process payout completion (called from admin interface)
 * This updates both the payout_requests and creator_earnings documents
 */
const processPayoutCompletion = async (payoutRequestId, paymentReference, processedBy) => {
    const db = admin.firestore();
    try {
        const payoutRef = db.collection('payout_requests').doc(payoutRequestId);
        const payoutDoc = await payoutRef.get();
        if (!payoutDoc.exists) {
            throw new Error('Payout request not found');
        }
        const payoutData = payoutDoc.data();
        const { creatorId, requestedAmount } = payoutData;
        // Update payout request to completed
        await payoutRef.update({
            status: 'completed',
            paymentReference,
            processedBy,
            processedDate: admin.firestore.Timestamp.now(),
            completedDate: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        });
        // Update creator earnings
        const earningsRef = db.collection('creator_earnings').doc(creatorId);
        const earningsDoc = await earningsRef.get();
        if (earningsDoc.exists) {
            const earningsData = earningsDoc.data();
            await earningsRef.update({
                pendingBalance: Math.max(0, (earningsData?.pendingBalance || 0) - requestedAmount),
                totalWithdrawn: (earningsData?.totalWithdrawn || 0) + requestedAmount,
                lastPayoutDate: admin.firestore.Timestamp.now(),
                lastPayoutAmount: requestedAmount,
                updatedAt: admin.firestore.Timestamp.now(),
            });
        }
        logger.info(`Processed payout completion for request ${payoutRequestId}`);
    }
    catch (error) {
        logger.error(`Error processing payout completion for ${payoutRequestId}:`, error);
        throw error;
    }
};
exports.processPayoutCompletion = processPayoutCompletion;
//# sourceMappingURL=treehouse-earnings.js.map