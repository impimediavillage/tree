"use strict";
// Cloud Functions for calculating and processing influencer commissions
// Handles commission tracking, payouts, and tier upgrades
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
exports.processPayouts = exports.resetMonthlySales = exports.calculateCommissionOnOrderDelivered = exports.getInfluencerStats = exports.processInfluencerCommission = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Cloud Function that processes influencer commissions when orders are created
 * Triggered on orders document creation
 */
exports.processInfluencerCommission = (0, firestore_1.onDocumentCreated)('orders/{orderId}', async (event) => {
    const order = event.data?.data();
    const orderId = event.params.orderId;
    if (!order) {
        logger.warn(`No data found for order ${orderId}`);
        return;
    }
    const db = admin.firestore();
    try {
        // Check if order has referral code
        if (!order.referralCode) {
            logger.info(`Order ${orderId} has no referral code`);
            return;
        }
        // Find influencer by referral code
        const influencersRef = db.collection('influencers');
        const influencerQuery = await influencersRef
            .where('referralCode', '==', order.referralCode.toUpperCase())
            .where('status', '==', 'active')
            .get();
        if (influencerQuery.empty) {
            logger.info(`No active influencer found with code: ${order.referralCode}`);
            return;
        }
        const influencerDoc = influencerQuery.docs[0];
        const influencerId = influencerDoc.id;
        const influencer = influencerDoc.data();
        // Calculate commission
        const orderTotal = order.total || 0;
        const baseCommissionRate = influencer.commissionRate || 5;
        // Get bonus multipliers
        const bonusMultipliers = {
            videoContent: influencer.bonusMultipliers?.videoContent || 0,
            tribeEngagement: influencer.bonusMultipliers?.tribeEngagement || 0,
            seasonal: 0
        };
        // Check for active seasonal campaigns
        const campaignsRef = db.collection('seasonalCampaigns');
        const activeCampaigns = await campaignsRef
            .where('active', '==', true)
            .where('startDate', '<=', admin.firestore.Timestamp.now())
            .where('endDate', '>=', admin.firestore.Timestamp.now())
            .get();
        if (!activeCampaigns.empty) {
            const campaign = activeCampaigns.docs[0].data();
            bonusMultipliers.seasonal = campaign.bonusMultiplier || 0;
        }
        // Calculate total commission rate
        const totalBonusMultiplier = bonusMultipliers.videoContent +
            bonusMultipliers.tribeEngagement +
            bonusMultipliers.seasonal;
        const effectiveRate = baseCommissionRate * (1 + totalBonusMultiplier);
        const commissionAmount = (orderTotal * effectiveRate) / 100;
        // Record commission
        const commissionData = {
            influencerId,
            influencerName: influencer.fullName || influencer.displayName || 'Unknown',
            orderId,
            orderTotal,
            baseCommissionRate,
            effectiveRate,
            commissionAmount,
            bonusMultipliers,
            status: 'pending', // Will be paid when order is delivered
            createdAt: admin.firestore.Timestamp.now(),
            orderStatus: order.status || 'pending',
            dispensaryId: order.dispensaryId,
            customerId: order.userId
        };
        await db.collection('influencerCommissions').add(commissionData);
        // Track click conversion
        await db.collection('influencerClicks')
            .where('influencerId', '==', influencerId)
            .where('customerId', '==', order.userId)
            .where('converted', '==', false)
            .get()
            .then(snapshot => {
            if (!snapshot.empty) {
                const clickDoc = snapshot.docs[0];
                clickDoc.ref.update({
                    converted: true,
                    orderId,
                    conversionDate: admin.firestore.Timestamp.now(),
                    conversionAmount: orderTotal
                });
            }
        });
        // Update influencer stats (monthly sales)
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const influencerRef = db.collection('influencers').doc(influencerId);
        await influencerRef.update({
            [`monthlySales.${monthKey}`]: admin.firestore.FieldValue.increment(orderTotal),
            totalRevenue: admin.firestore.FieldValue.increment(orderTotal),
            totalOrders: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.Timestamp.now()
        });
        logger.info(`Commission recorded for order ${orderId}: R${commissionAmount.toFixed(2)}`);
    }
    catch (error) {
        logger.error(`Error processing commission for order ${orderId}:`, error);
    }
});
// Note: Scheduled functions (resetMonthlySales, processPayouts) removed
// These can be implemented separately or triggered via other means
/**
 * Get influencer statistics and performance metrics
 * Used by the influencer dashboard
 */
exports.getInfluencerStats = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in');
    }
    const { influencerId } = request.data;
    if (!influencerId) {
        throw new https_1.HttpsError('invalid-argument', 'influencerId is required');
    }
    const db = admin.firestore();
    try {
        // Get influencer profile
        const influencerDoc = await db.collection('influencers').doc(influencerId).get();
        if (!influencerDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Influencer not found');
        }
        const influencer = influencerDoc.data();
        // Get commission data
        const commissionsSnapshot = await db.collection('influencerCommissions')
            .where('influencerId', '==', influencerId)
            .get();
        const totalCommissions = commissionsSnapshot.docs.reduce((sum, doc) => {
            return sum + (doc.data().commissionAmount || 0);
        }, 0);
        const pendingCommissions = commissionsSnapshot.docs
            .filter(doc => doc.data().status === 'pending')
            .reduce((sum, doc) => sum + (doc.data().commissionAmount || 0), 0);
        // Get click data
        const clicksSnapshot = await db.collection('influencerClicks')
            .where('influencerId', '==', influencerId)
            .get();
        const totalClicks = clicksSnapshot.size;
        const conversions = clicksSnapshot.docs.filter(doc => doc.data().converted).length;
        const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;
        return {
            profile: influencer,
            stats: {
                totalRevenue: influencer?.totalRevenue || 0,
                totalCommissions,
                pendingCommissions,
                totalClicks,
                conversions,
                conversionRate,
                tier: influencer?.tier || 'Bronze',
                commissionRate: influencer?.commissionRate || 5
            }
        };
    }
    catch (error) {
        logger.error('Error getting influencer stats:', error);
        throw new https_1.HttpsError('internal', 'Failed to get influencer stats');
    }
});
/**
 * Calculate and finalize commission when order is delivered
 * Called by the order delivery webhook/trigger
 */
exports.calculateCommissionOnOrderDelivered = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in');
    }
    const { orderId } = request.data;
    if (!orderId) {
        throw new https_1.HttpsError('invalid-argument', 'orderId is required');
    }
    const db = admin.firestore();
    try {
        // Find commission record for this order
        const commissionsSnapshot = await db.collection('influencerCommissions')
            .where('orderId', '==', orderId)
            .where('status', '==', 'pending')
            .get();
        if (commissionsSnapshot.empty) {
            throw new https_1.HttpsError('not-found', 'No pending commission found for this order');
        }
        const commissionDoc = commissionsSnapshot.docs[0];
        const commission = commissionDoc.data();
        const batch = db.batch();
        // Update commission status to completed
        batch.update(commissionDoc.ref, {
            status: 'completed',
            completedAt: admin.firestore.Timestamp.now(),
            orderStatus: 'delivered'
        });
        // Update influencer's pending balance
        const influencerRef = db.collection('influencers').doc(commission.influencerId);
        batch.update(influencerRef, {
            pendingBalance: admin.firestore.FieldValue.increment(commission.commissionAmount),
            totalEarned: admin.firestore.FieldValue.increment(commission.commissionAmount),
            updatedAt: admin.firestore.Timestamp.now()
        });
        await batch.commit();
        // Check and update tier if needed
        await checkAndUpdateTier(commission.influencerId);
        logger.info(`Finalized commission for order ${orderId}: R${commission.commissionAmount.toFixed(2)}`);
        return {
            success: true,
            commissionAmount: commission.commissionAmount,
            influencerId: commission.influencerId
        };
    }
    catch (error) {
        logger.error('Error finalizing commission:', error);
        throw new https_1.HttpsError('internal', 'Failed to finalize commission');
    }
});
// Dummy exports for scheduled functions (not implemented yet)
exports.resetMonthlySales = null;
exports.processPayouts = null;
/**
 * Helper function to check and update influencer tier based on monthly sales
 */
async function checkAndUpdateTier(influencerId) {
    const db = admin.firestore();
    const influencerDoc = await db.collection('influencers').doc(influencerId).get();
    if (!influencerDoc.exists) {
        return;
    }
    const influencer = influencerDoc.data();
    const monthlySales = influencer?.monthlySales || {};
    // Get current month key
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthSales = monthlySales[currentMonthKey] || 0;
    // Tier thresholds
    const SILVER_THRESHOLD = 5000;
    const GOLD_THRESHOLD = 15000;
    const PLATINUM_THRESHOLD = 30000;
    let newTier = 'Bronze';
    let newCommissionRate = 5;
    if (currentMonthSales >= PLATINUM_THRESHOLD) {
        newTier = 'Platinum';
        newCommissionRate = 20;
    }
    else if (currentMonthSales >= GOLD_THRESHOLD) {
        newTier = 'Gold';
        newCommissionRate = 15;
    }
    else if (currentMonthSales >= SILVER_THRESHOLD) {
        newTier = 'Silver';
        newCommissionRate = 10;
    }
    // Only update if tier changed
    if (newTier !== influencer?.tier) {
        await db.collection('influencers').doc(influencerId).update({
            tier: newTier,
            commissionRate: newCommissionRate,
            tierUpdatedAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        });
        // Log tier upgrade
        await db.collection('influencerTierHistory').add({
            influencerId,
            previousTier: influencer?.tier,
            newTier,
            previousRate: influencer?.commissionRate,
            newRate: newCommissionRate,
            monthlySales: currentMonthSales,
            upgradedAt: admin.firestore.Timestamp.now()
        });
        logger.info(`Influencer ${influencerId} upgraded from ${influencer?.tier} to ${newTier}`);
    }
}
//# sourceMappingURL=influencer-commissions.js.map