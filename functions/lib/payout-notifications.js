"use strict";
/**
 * 💰 Payout Notification Cloud Functions
 * Handles all payout request notifications with FCM push support
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
exports.onInfluencerPayoutRequestUpdated = exports.onInfluencerPayoutRequestCreated = exports.onDispensaryPayoutRequestUpdated = exports.onDispensaryPayoutRequestCreated = exports.onTreehousePayoutRequestUpdated = exports.onTreehousePayoutRequestCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const notifications_1 = require("./notifications");
const db = admin.firestore();
// ============================================================================
// TREEHOUSE CREATOR PAYOUT REQUESTS
// ============================================================================
/**
 * Notify Super Admin when Treehouse creator requests payout
 */
exports.onTreehousePayoutRequestCreated = (0, firestore_1.onDocumentCreated)('payout_requests/{payoutId}', async (event) => {
    const payoutData = event.data?.data();
    if (!payoutData)
        return;
    const payoutId = event.params.payoutId;
    v2_1.logger.info(`💰 New Treehouse payout request: ${payoutId}`);
    try {
        const creatorName = payoutData.creatorName || 'Creator';
        const amount = payoutData.requestedAmount || 0;
        // Get all Super Admins
        const adminQuery = await db.collection('users')
            .where('role', '==', 'Super Admin')
            .get();
        for (const adminDoc of adminQuery.docs) {
            // Create Firestore notification
            await db.collection('notifications').add({
                userId: adminDoc.id,
                recipient_role: 'Super Admin',
                type: 'payout_request',
                title: 'New Creator Payout Request 💰',
                message: `${creatorName} requested R${amount.toFixed(2)} payout`,
                priority: 'high',
                sound: 'coin-drop',
                read: false,
                payoutId: payoutId,
                creatorId: payoutData.creatorId,
                amount: amount,
                actionUrl: `/admin/payouts/creators/${payoutId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Send FCM push notification (works even when logged out)
            await (0, notifications_1.sendFCMPushNotification)(adminDoc.id, {
                title: 'New Creator Payout Request 💰',
                body: `${creatorName} requested R${amount.toFixed(2)} payout`,
                data: {
                    type: 'payout_request',
                    payoutId: payoutId,
                    creatorId: payoutData.creatorId,
                    amount: amount.toString(),
                    actionUrl: `/admin/payouts/creators/${payoutId}`,
                    sound: 'coin-drop',
                    priority: 'high',
                    notificationId: payoutId,
                },
            });
        }
        v2_1.logger.info(`Notified ${adminQuery.size} Super Admins about creator payout request ${payoutId}`);
    }
    catch (error) {
        v2_1.logger.error('Error notifying about creator payout request:', error);
    }
});
/**
 * Notify Treehouse creator when payout status changes
 */
exports.onTreehousePayoutRequestUpdated = (0, firestore_1.onDocumentUpdated)('payout_requests/{payoutId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    const payoutId = event.params.payoutId;
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    // Only notify on status change
    if (oldStatus === newStatus)
        return;
    try {
        const creatorId = afterData.creatorId;
        const amount = afterData.requestedAmount || 0;
        let notificationData = {
            userId: creatorId,
            recipient_role: 'Creator',
            type: 'payout_update',
            priority: 'high',
            read: false,
            payoutId: payoutId,
            amount: amount,
            status: newStatus,
            actionUrl: '/dashboard/leaf/payouts',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        let fcmTitle = '';
        let fcmBody = '';
        let sound = 'notification-pop';
        if (newStatus === 'approved') {
            notificationData.title = 'Payout Approved! ✅';
            notificationData.message = `Your payout of R${amount.toFixed(2)} has been approved`;
            notificationData.sound = 'success-chime';
            fcmTitle = 'Payout Approved! ✅';
            fcmBody = `Your payout of R${amount.toFixed(2)} has been approved`;
            sound = 'success-chime';
        }
        else if (newStatus === 'rejected') {
            notificationData.title = 'Payout Rejected ❌';
            notificationData.message = `Your payout request of R${amount.toFixed(2)} was rejected`;
            notificationData.sound = 'notification-pop';
            fcmTitle = 'Payout Rejected ❌';
            fcmBody = `Your payout request was rejected: ${afterData.rejectionReason || 'No reason provided'}`;
            sound = 'notification-pop';
        }
        else if (newStatus === 'completed') {
            notificationData.title = 'Payout Completed! 🎉';
            notificationData.message = `R${amount.toFixed(2)} has been paid to your account`;
            notificationData.sound = 'coin-drop';
            notificationData.showConfetti = true;
            fcmTitle = 'Payout Completed! 🎉';
            fcmBody = `R${amount.toFixed(2)} has been paid to your account`;
            sound = 'coin-drop';
        }
        else {
            return; // Don't notify for other status changes
        }
        // Create Firestore notification
        await db.collection('notifications').add(notificationData);
        // Send FCM push notification
        await (0, notifications_1.sendFCMPushNotification)(creatorId, {
            title: fcmTitle,
            body: fcmBody,
            data: {
                type: 'payout_update',
                payoutId: payoutId,
                amount: amount.toString(),
                status: newStatus,
                actionUrl: '/dashboard/leaf/payouts',
                sound: sound,
                priority: 'high',
                notificationId: payoutId,
            },
        });
        v2_1.logger.info(`Notified creator ${creatorId} about payout ${newStatus}: ${payoutId}`);
    }
    catch (error) {
        v2_1.logger.error('Error notifying creator about payout update:', error);
    }
});
// ============================================================================
// DISPENSARY PAYOUT REQUESTS
// ============================================================================
/**
 * Notify Super Admin when Dispensary owner/staff requests payout
 */
exports.onDispensaryPayoutRequestCreated = (0, firestore_1.onDocumentCreated)('dispensary_payout_requests/{payoutId}', async (event) => {
    const payoutData = event.data?.data();
    if (!payoutData)
        return;
    const payoutId = event.params.payoutId;
    v2_1.logger.info(`💰 New Dispensary payout request: ${payoutId}`);
    try {
        const amount = payoutData.requestedAmount || 0;
        const payoutType = payoutData.payoutType || 'individual';
        const dispensaryId = payoutData.dispensaryId;
        // Get dispensary info
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        const dispensaryName = dispensaryDoc.exists ? dispensaryDoc.data()?.name : 'Dispensary';
        // Get requester info
        const userDoc = await db.collection('users').doc(payoutData.userId).get();
        const userName = userDoc.exists ? (userDoc.data()?.displayName || userDoc.data()?.name) : 'Staff Member';
        const description = payoutType === 'combined'
            ? `${dispensaryName} (Combined Staff Payout)`
            : `${userName} from ${dispensaryName}`;
        // Get all Super Admins
        const adminQuery = await db.collection('users')
            .where('role', '==', 'Super Admin')
            .get();
        for (const adminDoc of adminQuery.docs) {
            // Create Firestore notification
            await db.collection('notifications').add({
                userId: adminDoc.id,
                recipient_role: 'Super Admin',
                type: 'payout_request',
                title: 'New Dispensary Payout Request 💰',
                message: `${description} - R${amount.toFixed(2)}`,
                priority: 'high',
                sound: 'coin-drop',
                read: false,
                payoutId: payoutId,
                dispensaryId: dispensaryId,
                amount: amount,
                payoutType: payoutType,
                actionUrl: `/admin/payouts/dispensaries/${payoutId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Send FCM push notification
            await (0, notifications_1.sendFCMPushNotification)(adminDoc.id, {
                title: 'New Dispensary Payout Request 💰',
                body: `${description} - R${amount.toFixed(2)}`,
                data: {
                    type: 'payout_request',
                    payoutId: payoutId,
                    dispensaryId: dispensaryId,
                    amount: amount.toString(),
                    payoutType: payoutType,
                    actionUrl: `/admin/payouts/dispensaries/${payoutId}`,
                    sound: 'coin-drop',
                    priority: 'high',
                    notificationId: payoutId,
                },
            });
        }
        v2_1.logger.info(`Notified ${adminQuery.size} Super Admins about dispensary payout request ${payoutId}`);
    }
    catch (error) {
        v2_1.logger.error('Error notifying about dispensary payout request:', error);
    }
});
/**
 * Notify Dispensary owner/staff when payout status changes
 */
exports.onDispensaryPayoutRequestUpdated = (0, firestore_1.onDocumentUpdated)('dispensary_payout_requests/{payoutId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    const payoutId = event.params.payoutId;
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    // Only notify on status change
    if (oldStatus === newStatus)
        return;
    try {
        const amount = afterData.requestedAmount || 0;
        const payoutType = afterData.payoutType || 'individual';
        // Determine who to notify
        const recipientIds = [];
        if (payoutType === 'combined' && afterData.staffIncluded) {
            // Notify all staff included in combined payout
            recipientIds.push(...afterData.staffIncluded);
        }
        else {
            // Notify the individual requester
            recipientIds.push(afterData.userId);
        }
        let title = '';
        let message = '';
        let sound = 'notification-pop';
        if (newStatus === 'approved') {
            title = 'Payout Approved! ✅';
            message = `Your payout of R${amount.toFixed(2)} has been approved`;
            sound = 'success-chime';
        }
        else if (newStatus === 'rejected') {
            title = 'Payout Rejected ❌';
            message = `Your payout request of R${amount.toFixed(2)} was rejected`;
            if (afterData.rejectionReason) {
                message += `: ${afterData.rejectionReason}`;
            }
            sound = 'notification-pop';
        }
        else if (newStatus === 'completed') {
            title = 'Payout Completed! 🎉';
            message = `R${amount.toFixed(2)} has been paid to your account`;
            sound = 'coin-drop';
        }
        else {
            return; // Don't notify for other status changes
        }
        // Send notifications to all recipients
        for (const recipientId of recipientIds) {
            // Create Firestore notification
            await db.collection('notifications').add({
                userId: recipientId,
                recipient_role: 'DispensaryOwner',
                type: 'payout_update',
                title: title,
                message: message,
                priority: 'high',
                sound: sound,
                read: false,
                payoutId: payoutId,
                amount: amount,
                status: newStatus,
                actionUrl: '/dispensary-admin/payouts',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                showConfetti: newStatus === 'completed',
            });
            // Send FCM push notification
            await (0, notifications_1.sendFCMPushNotification)(recipientId, {
                title: title,
                body: message,
                data: {
                    type: 'payout_update',
                    payoutId: payoutId,
                    amount: amount.toString(),
                    status: newStatus,
                    actionUrl: '/dispensary-admin/payouts',
                    sound: sound,
                    priority: 'high',
                    notificationId: payoutId,
                },
            });
        }
        v2_1.logger.info(`Notified ${recipientIds.length} users about dispensary payout ${newStatus}: ${payoutId}`);
    }
    catch (error) {
        v2_1.logger.error('Error notifying about dispensary payout update:', error);
    }
});
// ============================================================================
// INFLUENCER PAYOUT REQUESTS
// ============================================================================
/**
 * Notify Super Admin when Influencer requests payout
 */
exports.onInfluencerPayoutRequestCreated = (0, firestore_1.onDocumentCreated)('influencerPayouts/{payoutId}', async (event) => {
    const payoutData = event.data?.data();
    if (!payoutData)
        return;
    const payoutId = event.params.payoutId;
    v2_1.logger.info(`💰 New Influencer payout request: ${payoutId}`);
    try {
        const amount = payoutData.amount || 0;
        const influencerId = payoutData.influencerId;
        // Get influencer info
        const userDoc = await db.collection('users').doc(influencerId).get();
        const influencerName = userDoc.exists ? (userDoc.data()?.displayName || userDoc.data()?.name) : 'Influencer';
        // Get all Super Admins
        const adminQuery = await db.collection('users')
            .where('role', '==', 'Super Admin')
            .get();
        for (const adminDoc of adminQuery.docs) {
            // Create Firestore notification
            await db.collection('notifications').add({
                userId: adminDoc.id,
                recipient_role: 'Super Admin',
                type: 'payout_request',
                title: 'New Influencer Payout Request 💰',
                message: `${influencerName} requested R${amount.toFixed(2)} payout`,
                priority: 'high',
                sound: 'coin-drop',
                read: false,
                payoutId: payoutId,
                influencerId: influencerId,
                amount: amount,
                actionUrl: `/admin/payouts/influencers/${payoutId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Send FCM push notification
            await (0, notifications_1.sendFCMPushNotification)(adminDoc.id, {
                title: 'New Influencer Payout Request 💰',
                body: `${influencerName} requested R${amount.toFixed(2)} payout`,
                data: {
                    type: 'payout_request',
                    payoutId: payoutId,
                    influencerId: influencerId,
                    amount: amount.toString(),
                    actionUrl: `/admin/payouts/influencers/${payoutId}`,
                    sound: 'coin-drop',
                    priority: 'high',
                    notificationId: payoutId,
                },
            });
        }
        v2_1.logger.info(`Notified ${adminQuery.size} Super Admins about influencer payout request ${payoutId}`);
    }
    catch (error) {
        v2_1.logger.error('Error notifying about influencer payout request:', error);
    }
});
/**
 * Notify Influencer when payout status changes
 */
exports.onInfluencerPayoutRequestUpdated = (0, firestore_1.onDocumentUpdated)('influencerPayouts/{payoutId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    const payoutId = event.params.payoutId;
    const oldStatus = beforeData.status;
    const newStatus = afterData.status;
    // Only notify on status change
    if (oldStatus === newStatus)
        return;
    try {
        const influencerId = afterData.influencerId;
        const amount = afterData.amount || 0;
        let title = '';
        let message = '';
        let sound = 'notification-pop';
        if (newStatus === 'approved') {
            title = 'Payout Approved! ✅';
            message = `Your payout of R${amount.toFixed(2)} has been approved`;
            sound = 'success-chime';
        }
        else if (newStatus === 'rejected') {
            title = 'Payout Rejected ❌';
            message = `Your payout request of R${amount.toFixed(2)} was rejected`;
            if (afterData.notes) {
                message += `: ${afterData.notes}`;
            }
            sound = 'notification-pop';
        }
        else if (newStatus === 'paid') {
            title = 'Payout Completed! 🎉';
            message = `R${amount.toFixed(2)} has been paid to your account`;
            sound = 'coin-drop';
        }
        else {
            return; // Don't notify for other status changes
        }
        // Create Firestore notification
        await db.collection('notifications').add({
            userId: influencerId,
            recipient_role: 'Influencer',
            type: 'payout_update',
            title: title,
            message: message,
            priority: 'high',
            sound: sound,
            read: false,
            payoutId: payoutId,
            amount: amount,
            status: newStatus,
            actionUrl: '/dashboard/influencer/payouts',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            showConfetti: newStatus === 'paid',
        });
        // Send FCM push notification
        await (0, notifications_1.sendFCMPushNotification)(influencerId, {
            title: title,
            body: message,
            data: {
                type: 'payout_update',
                payoutId: payoutId,
                amount: amount.toString(),
                status: newStatus,
                actionUrl: '/dashboard/influencer/payouts',
                sound: sound,
                priority: 'high',
                notificationId: payoutId,
            },
        });
        v2_1.logger.info(`Notified influencer ${influencerId} about payout ${newStatus}: ${payoutId}`);
    }
    catch (error) {
        v2_1.logger.error('Error notifying influencer about payout update:', error);
    }
});
//# sourceMappingURL=payout-notifications.js.map