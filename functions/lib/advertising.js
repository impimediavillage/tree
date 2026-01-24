"use strict";
/**
 * Advertising Cloud Functions
 * Handles ad tracking, analytics aggregation, and commission calculations
 */
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
exports.activateScheduledAds = exports.cleanupExpiredAds = exports.aggregateDailyAdAnalytics = exports.trackAdConversion = exports.trackAdClick = exports.trackAdImpression = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const db = admin.firestore();
/**
 * Track Ad Impression
 * Triggered by HTTP request from client
 */
exports.trackAdImpression = (0, https_1.onCall)(async (request) => {
    const { adId, placement, userId, trackingCode } = request.data;
    if (!adId) {
        throw new https_1.HttpsError('invalid-argument', 'Ad ID is required');
    }
    try {
        // Get ad document
        const adRef = db.collection('advertisements').doc(adId);
        const adDoc = await adRef.get();
        if (!adDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Advertisement not found');
        }
        // Create impression record
        const impressionData = {
            adId,
            placement: placement || 'unknown',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userId: userId || null,
            trackingCode: trackingCode || null,
            influencerId: null,
            userAgent: request.rawRequest?.headers['user-agent'] || null,
            ipAddress: request.rawRequest?.ip || null,
        };
        // If tracking code provided, find influencer selection
        if (trackingCode) {
            const selectionQuery = await db.collection('influencerAdSelections')
                .where('uniqueTrackingCode', '==', trackingCode)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            if (!selectionQuery.empty) {
                const selection = selectionQuery.docs[0].data();
                impressionData.influencerId = selection.influencerId;
                // Update selection performance
                await selectionQuery.docs[0].ref.update({
                    'performance.impressions': admin.firestore.FieldValue.increment(1),
                    lastImpressionAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        // Save impression
        await db.collection('adImpressions').add(impressionData);
        // Update ad analytics
        await adRef.update({
            'analytics.impressions': admin.firestore.FieldValue.increment(1),
            lastImpressionAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, impressionId: null };
    }
    catch (error) {
        console.error('Error tracking impression:', error);
        throw new https_1.HttpsError('internal', error.message);
    }
});
/**
 * Track Ad Click
 * Triggered by HTTP request from client
 */
exports.trackAdClick = (0, https_1.onCall)(async (request) => {
    const { adId, destination, userId, trackingCode } = request.data;
    if (!adId || !destination) {
        throw new https_1.HttpsError('invalid-argument', 'Ad ID and destination are required');
    }
    try {
        // Get ad document
        const adRef = db.collection('advertisements').doc(adId);
        const adDoc = await adRef.get();
        if (!adDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Advertisement not found');
        }
        const ad = adDoc.data();
        // Create click record
        const clickData = {
            adId,
            destination,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userId: userId || null,
            trackingCode: trackingCode || null,
            influencerId: null,
            userAgent: request.rawRequest?.headers['user-agent'] || null,
            ipAddress: request.rawRequest?.ip || null,
        };
        // If tracking code provided, find influencer selection
        if (trackingCode) {
            const selectionQuery = await db.collection('influencerAdSelections')
                .where('uniqueTrackingCode', '==', trackingCode)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            if (!selectionQuery.empty) {
                const selection = selectionQuery.docs[0].data();
                clickData.influencerId = selection.influencerId;
                // Update selection performance
                await selectionQuery.docs[0].ref.update({
                    'performance.clicks': admin.firestore.FieldValue.increment(1),
                    lastClickAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        // Save click
        await db.collection('adClicks').add(clickData);
        // Update ad analytics
        const newClicks = (ad?.analytics?.clicks || 0) + 1;
        const newImpressions = ad?.analytics?.impressions || 1;
        const newCTR = (newClicks / newImpressions) * 100;
        await adRef.update({
            'analytics.clicks': admin.firestore.FieldValue.increment(1),
            'analytics.ctr': newCTR,
            lastClickAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, clickId: null };
    }
    catch (error) {
        console.error('Error tracking click:', error);
        throw new https_1.HttpsError('internal', error.message);
    }
});
/**
 * Track Ad Conversion
 * Triggered when an order is placed with tracking code
 */
exports.trackAdConversion = (0, firestore_1.onDocumentCreated)('orders/{orderId}', async (event) => {
    const order = event.data?.data();
    const trackingCode = order?.trackingCode || order?.metadata?.trackingCode;
    if (!trackingCode) {
        return null; // No tracking code, skip
    }
    try {
        // Find influencer selection by tracking code
        const selectionQuery = await db.collection('influencerAdSelections')
            .where('uniqueTrackingCode', '==', trackingCode)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (selectionQuery.empty) {
            console.log('No active selection found for tracking code:', trackingCode);
            return null;
        }
        const selectionDoc = selectionQuery.docs[0];
        const selection = selectionDoc.data();
        // Calculate commission from PLATFORM PROFIT (25% of order total)
        // Ad bonus (dispensary-set, max 5%) is also from platform's 25%
        const orderTotal = order.total || 0;
        const platformProfit = order.totalPlatformCommission || (orderTotal * 0.25); // 25% of order
        const adBonusRate = selection.adBonusRate || 0; // Dispensary-set ad bonus (max 5%)
        const adBonusAmount = platformProfit * (adBonusRate / 100); // Ad bonus from platform profit
        // Influencer also gets their base tier commission (from platform profit)
        const influencerTierRate = selection.influencerTierRate || 10; // Their tier rate
        const baseCommissionAmount = platformProfit * (influencerTierRate / 100);
        // Total influencer earns: base tier commission + ad bonus
        const totalInfluencerCommission = baseCommissionAmount + adBonusAmount;
        // Ad bonus is deducted from dispensary payout
        const dispensaryPayout = order.totalDispensaryEarnings || 0;
        const dispensaryAfterAdBonus = dispensaryPayout - adBonusAmount;
        // Create conversion record
        await db.collection('adConversions').add({
            adId: selection.adId,
            orderId: event.params.orderId,
            influencerId: selection.influencerId,
            trackingCode,
            orderTotal,
            platformProfit,
            dispensaryId: selection.dispensaryId,
            dispensaryName: selection.dispensaryName,
            // Commission breakdown
            baseCommissionRate: influencerTierRate,
            baseCommissionAmount,
            adBonusRate,
            adBonusAmount,
            totalInfluencerCommission,
            // Dispensary impact
            dispensaryPayoutBefore: dispensaryPayout,
            dispensaryPayoutAfter: dispensaryAfterAdBonus,
            dispensaryAdBonusDeduction: adBonusAmount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update selection performance
        await selectionDoc.ref.update({
            'performance.conversions': admin.firestore.FieldValue.increment(1),
            'performance.revenue': admin.firestore.FieldValue.increment(orderTotal),
            'performance.baseCommission': admin.firestore.FieldValue.increment(baseCommissionAmount),
            'performance.adBonus': admin.firestore.FieldValue.increment(adBonusAmount),
            'performance.totalCommission': admin.firestore.FieldValue.increment(totalInfluencerCommission),
            lastConversionAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update ad analytics
        const adRef = db.collection('advertisements').doc(selection.adId);
        const adDoc = await adRef.get();
        if (adDoc.exists) {
            const ad = adDoc.data();
            const newConversions = (ad?.analytics?.conversions || 0) + 1;
            const newClicks = ad?.analytics?.clicks || 1;
            const newConversionRate = (newConversions / newClicks) * 100;
            await adRef.update({
                'analytics.conversions': admin.firestore.FieldValue.increment(1),
                'analytics.revenue': admin.firestore.FieldValue.increment(orderTotal),
                'analytics.conversionRate': newConversionRate,
                lastConversionAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // Update influencer earnings (base + ad bonus)
        const influencerRef = db.collection('influencers').doc(selection.influencerId);
        await influencerRef.update({
            'earnings.totalEarnings': admin.firestore.FieldValue.increment(totalInfluencerCommission),
            'earnings.pendingEarnings': admin.firestore.FieldValue.increment(totalInfluencerCommission),
            'earnings.adBonusEarned': admin.firestore.FieldValue.increment(adBonusAmount),
        });
        // Track dispensary cost of ad bonus
        const dispensaryRef = db.collection('dispensaries').doc(selection.dispensaryId);
        await dispensaryRef.update({
            'analytics.adBonusPaid': admin.firestore.FieldValue.increment(adBonusAmount),
            'analytics.influencerAdConversions': admin.firestore.FieldValue.increment(1),
        });
        console.log(`Conversion tracked for influencer ${selection.influencerId}:`);
        console.log(`  - Base commission (${influencerTierRate}% of R${platformProfit.toFixed(2)}): R${baseCommissionAmount.toFixed(2)}`);
        console.log(`  - Ad bonus (${adBonusRate}% of R${platformProfit.toFixed(2)}): R${adBonusAmount.toFixed(2)}`);
        console.log(`  - Total influencer earns: R${totalInfluencerCommission.toFixed(2)}`);
        console.log(`  - Dispensary payout reduced by: R${adBonusAmount.toFixed(2)}`);
        return { success: true, commission: totalInfluencerCommission, adBonus: adBonusAmount };
    }
    catch (error) {
        console.error('Error tracking conversion:', error);
        return null;
    }
});
/**
 * Aggregate Daily Ad Analytics
 * Runs daily at midnight to aggregate analytics data
 */
exports.aggregateDailyAdAnalytics = (0, scheduler_1.onSchedule)('0 0 * * *', async (event) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
        // Get all active ads
        const adsSnapshot = await db.collection('advertisements')
            .where('status', '==', 'active')
            .get();
        const aggregationPromises = adsSnapshot.docs.map(async (adDoc) => {
            const adId = adDoc.id;
            // Count impressions for yesterday
            const impressionsSnapshot = await db.collection('adImpressions')
                .where('adId', '==', adId)
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .get();
            // Count clicks for yesterday
            const clicksSnapshot = await db.collection('adClicks')
                .where('adId', '==', adId)
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .get();
            // Count conversions for yesterday
            const conversionsSnapshot = await db.collection('adConversions')
                .where('adId', '==', adId)
                .where('timestamp', '>=', yesterday)
                .where('timestamp', '<', today)
                .get();
            // Calculate revenue
            let revenue = 0;
            conversionsSnapshot.forEach(doc => {
                revenue += doc.data().orderTotal || 0;
            });
            // Save daily aggregate
            await db.collection('adDailyAnalytics').add({
                adId,
                date: yesterday,
                impressions: impressionsSnapshot.size,
                clicks: clicksSnapshot.size,
                conversions: conversionsSnapshot.size,
                revenue,
                ctr: impressionsSnapshot.size > 0 ? (clicksSnapshot.size / impressionsSnapshot.size) * 100 : 0,
                conversionRate: clicksSnapshot.size > 0 ? (conversionsSnapshot.size / clicksSnapshot.size) * 100 : 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        await Promise.all(aggregationPromises);
        console.log(`Aggregated analytics for ${adsSnapshot.size} ads`);
        return;
    }
    catch (error) {
        console.error('Error aggregating analytics:', error);
        return;
    }
});
/**
 * Clean up expired ads
 * Runs daily to update status of ended ads
 */
exports.cleanupExpiredAds = (0, scheduler_1.onSchedule)('0 1 * * *', async (event) => {
    const now = new Date();
    try {
        // Find ads that have ended
        const expiredAdsSnapshot = await db.collection('advertisements')
            .where('status', 'in', ['active', 'scheduled'])
            .where('endDate', '<', now)
            .get();
        const updatePromises = expiredAdsSnapshot.docs.map(doc => doc.ref.update({
            status: 'ended',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }));
        await Promise.all(updatePromises);
        console.log(`Cleaned up ${expiredAdsSnapshot.size} expired ads`);
        return;
    }
    catch (error) {
        console.error('Error cleaning up expired ads:', error);
        return;
    }
});
/**
 * Activate scheduled ads
 * Runs hourly to activate ads that have reached their start date
 */
exports.activateScheduledAds = (0, scheduler_1.onSchedule)('0 * * * *', async (event) => {
    const now = new Date();
    try {
        // Find scheduled ads that should start
        const scheduledAdsSnapshot = await db.collection('advertisements')
            .where('status', '==', 'scheduled')
            .where('startDate', '<=', now)
            .get();
        const updatePromises = scheduledAdsSnapshot.docs.map(doc => doc.ref.update({
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }));
        await Promise.all(updatePromises);
        console.log(`Activated ${scheduledAdsSnapshot.size} scheduled ads`);
        return;
    }
    catch (error) {
        console.error('Error activating scheduled ads:', error);
        return;
    }
});
//# sourceMappingURL=advertising.js.map