"use strict";
/**
 * 🔔 Notification Cloud Functions
 * Triggers notifications for orders, payments, shipping, and achievements
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
exports.sendAchievementNotification = exports.onShippingStatusChange = exports.onPaymentCompleted = exports.onOrderCreated = void 0;
exports.sendFCMPushNotification = sendFCMPushNotification;
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Helper function to send FCM push notification to a user
 * EXPORTED for use in other Cloud Functions (driver-functions, payout notifications, etc.)
 */
async function sendFCMPushNotification(userId, notification) {
    try {
        // Get user's FCM tokens
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (!userData || !userData.fcmTokens || userData.fcmTokens.length === 0) {
            v2_1.logger.info(`No FCM tokens for user ${userId}`);
            return;
        }
        const tokens = userData.fcmTokens;
        v2_1.logger.info(`Sending FCM push to ${tokens.length} device(s) for user ${userId}`);
        // Send notification to all user's devices
        const messages = tokens.map(token => ({
            token,
            notification: {
                title: notification.title,
                body: notification.body,
                icon: notification.icon || '/icons/icon-192x192.png',
            },
            data: notification.data || {},
            webpush: {
                fcmOptions: {
                    link: notification.data?.actionUrl || '/',
                },
            },
        }));
        const response = await admin.messaging().sendEach(messages);
        v2_1.logger.info(`FCM push sent: ${response.successCount} succeeded, ${response.failureCount} failed`);
        // Remove invalid tokens
        const invalidTokens = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success && (resp.error?.code === 'messaging/invalid-registration-token' ||
                resp.error?.code === 'messaging/registration-token-not-registered')) {
                invalidTokens.push(tokens[idx]);
            }
        });
        if (invalidTokens.length > 0) {
            v2_1.logger.info(`Removing ${invalidTokens.length} invalid FCM tokens`);
            const validTokens = tokens.filter(t => !invalidTokens.includes(t));
            await db.collection('users').doc(userId).update({
                fcmTokens: validTokens,
            });
        }
    }
    catch (error) {
        v2_1.logger.error('Error sending FCM push notification:', error);
    }
}
/**
 * Send notification when new order is created
 * Notifies: Dispensary Owner, Super Admin, Treehouse Creators
 */
exports.onOrderCreated = (0, firestore_1.onDocumentCreated)('orders/{orderId}', async (event) => {
    const orderData = event.data?.data();
    if (!orderData)
        return;
    const orderId = event.params.orderId;
    // Prevent duplicate notifications by checking if already processed
    const existingNotifications = await db.collection('notifications')
        .where('orderId', '==', orderId)
        .where('type', '==', 'order')
        .limit(1)
        .get();
    if (!existingNotifications.empty) {
        v2_1.logger.info(`Notifications already sent for order ${orderId}, skipping`);
        return;
    }
    v2_1.logger.info(`📦 New order created: ${orderId}`);
    try {
        // Get all dispensaries from the order
        const dispensaryIds = Object.keys(orderData.shipments || {});
        // Notify each dispensary owner
        for (const dispensaryId of dispensaryIds) {
            const shipment = orderData.shipments[dispensaryId];
            const dispensaryRef = await db.collection('dispensaries').doc(dispensaryId).get();
            const dispensaryData = dispensaryRef.data();
            if (!dispensaryData)
                continue;
            // Find dispensary owner
            const ownerQuery = await db.collection('users')
                .where('dispensaryId', '==', dispensaryId)
                .where('role', '==', 'DispensaryOwner')
                .limit(1)
                .get();
            if (!ownerQuery.empty) {
                const ownerId = ownerQuery.docs[0].id;
                // Create notification for dispensary owner
                const orderAmount = shipment.items.reduce((sum, item) => sum + item.lineTotal, 0);
                const notificationData = {
                    userId: ownerId,
                    recipient_role: 'DispensaryOwner',
                    type: 'order',
                    title: 'New Order Received! 💰',
                    message: `Order #${orderData.orderNumber} - ${orderData.currency} ${orderAmount.toFixed(2)}`,
                    priority: 'high',
                    sound: 'ka-ching',
                    animation: 'money-bag',
                    showConfetti: false,
                    read: false,
                    orderId: orderId,
                    orderNumber: orderData.orderNumber,
                    dispensaryId: dispensaryId,
                    amount: orderAmount,
                    currency: orderData.currency,
                    actionUrl: `/dispensary-admin/orders/${orderId}`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                await db.collection('notifications').add(notificationData);
                // Send FCM push notification
                await sendFCMPushNotification(ownerId, {
                    title: 'New Order Received! 💰',
                    body: `Order #${orderData.orderNumber} - ${orderData.currency} ${orderAmount.toFixed(2)}`,
                    data: {
                        type: 'order',
                        orderId: orderId,
                        orderNumber: orderData.orderNumber,
                        actionUrl: `/dispensary-admin/orders/${orderId}`,
                        sound: 'ka-ching',
                        priority: 'high',
                        notificationId: orderId,
                    },
                });
                v2_1.logger.info(`✅ Notification and FCM push sent to dispensary owner: ${ownerId}`);
            }
        }
        // Notify customer
        if (orderData.userId) {
            await db.collection('notifications').add({
                userId: orderData.userId,
                recipient_role: 'LeafUser',
                type: 'order',
                title: 'Order Confirmed! ✅',
                message: `Your order #${orderData.orderNumber} has been confirmed and is being processed.`,
                priority: 'medium',
                sound: 'success-chime',
                animation: 'checkmark-bounce',
                read: false,
                orderId: orderId,
                orderNumber: orderData.orderNumber,
                amount: orderData.total,
                currency: orderData.currency,
                actionUrl: `/dashboard/leaf/orders/${orderId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Send FCM push notification to customer
            await sendFCMPushNotification(orderData.userId, {
                title: 'Order Confirmed! ✅',
                body: `Your order #${orderData.orderNumber} has been confirmed and is being processed.`,
                data: {
                    type: 'order',
                    orderId: orderId,
                    orderNumber: orderData.orderNumber,
                    actionUrl: `/dashboard/leaf/orders/${orderId}`,
                    sound: 'success-chime',
                    priority: 'medium',
                    notificationId: orderId,
                },
            });
        }
        // Notify Super Admins
        const adminQuery = await db.collection('users')
            .where('role', '==', 'Super Admin')
            .get();
        for (const adminDoc of adminQuery.docs) {
            await db.collection('notifications').add({
                userId: adminDoc.id,
                recipient_role: 'Super Admin',
                type: 'order',
                title: 'New Platform Order 📊',
                message: `Order #${orderData.orderNumber} - ${orderData.currency} ${orderData.total.toFixed(2)}`,
                priority: 'medium',
                sound: 'notification-pop',
                read: false,
                orderId: orderId,
                orderNumber: orderData.orderNumber,
                amount: orderData.total,
                currency: orderData.currency,
                actionUrl: `/admin/orders/${orderId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Send FCM push notification to Super Admin (works even when logged out/app closed)
            await sendFCMPushNotification(adminDoc.id, {
                title: orderData.orderType === 'treehouse' ? 'New Treehouse Order 🏡' : 'New Platform Order 📊',
                body: `Order #${orderData.orderNumber} - ${orderData.currency} ${orderData.total.toFixed(2)}`,
                data: {
                    type: 'order',
                    orderId: orderId,
                    orderNumber: orderData.orderNumber,
                    orderType: orderData.orderType || 'standard',
                    actionUrl: `/admin/orders/${orderId}`,
                    sound: 'ka-ching',
                    priority: 'high',
                    notificationId: orderId,
                },
            });
        }
        // Notify Treehouse Creator if applicable
        if (orderData.orderType === 'treehouse' && orderData.creatorId) {
            await db.collection('notifications').add({
                userId: orderData.creatorId,
                recipient_role: 'Creator',
                type: 'treehouse',
                title: 'Treehouse Sale! 🎨',
                message: `Your design sold! Order #${orderData.orderNumber} - Earning ${orderData.currency} ${orderData.creatorCommission?.toFixed(2)}`,
                priority: 'high',
                sound: 'ka-ching',
                animation: 'money-bag',
                read: false,
                orderId: orderId,
                orderNumber: orderData.orderNumber,
                creatorId: orderData.creatorId,
                amount: orderData.creatorCommission,
                currency: orderData.currency,
                actionUrl: `/dashboard/leaf/earnings`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        // Notify Influencer if applicable
        if (orderData.influencerReferral) {
            await db.collection('notifications').add({
                userId: orderData.influencerReferral.influencerId,
                recipient_role: 'Influencer',
                type: 'influencer',
                title: 'Referral Commission! 🌟',
                message: `You earned ${orderData.currency} ${orderData.influencerReferral.influencerEarnings.toFixed(2)} from order #${orderData.orderNumber}`,
                priority: 'high',
                sound: 'coin-drop',
                animation: 'coin-scatter',
                read: false,
                orderId: orderId,
                orderNumber: orderData.orderNumber,
                influencerId: orderData.influencerReferral.influencerId,
                commissionEarned: orderData.influencerReferral.influencerEarnings,
                currency: orderData.currency,
                actionUrl: `/influencer/dashboard/earnings`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
    catch (error) {
        v2_1.logger.error('Error sending order notifications:', error);
    }
});
/**
 * Send notification when payment is completed
 */
exports.onPaymentCompleted = (0, firestore_1.onDocumentUpdated)('orders/{orderId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    // Check if payment status changed to completed
    const wasPaymentCompleted = beforeData.paymentStatus !== 'completed' && afterData.paymentStatus === 'completed';
    if (!wasPaymentCompleted)
        return;
    const orderId = event.params.orderId;
    v2_1.logger.info(`💳 Payment completed for order: ${orderId}`);
    try {
        // Prevent duplicate notifications
        const existingPaymentNotifications = await db.collection('notifications')
            .where('orderId', '==', orderId)
            .where('type', '==', 'payment')
            .limit(1)
            .get();
        if (!existingPaymentNotifications.empty) {
            v2_1.logger.info(`Payment notifications already sent for order ${orderId}, skipping`);
            return;
        }
        // Notify each dispensary owner
        const dispensaryIds = Object.keys(afterData.shipments || {});
        for (const dispensaryId of dispensaryIds) {
            const ownerQuery = await db.collection('users')
                .where('dispensaryId', '==', dispensaryId)
                .where('role', '==', 'DispensaryOwner')
                .limit(1)
                .get();
            if (!ownerQuery.empty) {
                const ownerId = ownerQuery.docs[0].id;
                await db.collection('notifications').add({
                    userId: ownerId,
                    recipient_role: 'DispensaryOwner',
                    type: 'payment',
                    title: 'Payment Received! 💳',
                    message: `Payment confirmed for order #${afterData.orderNumber}`,
                    priority: 'medium',
                    sound: 'coin-drop',
                    animation: 'coin-scatter',
                    read: false,
                    orderId: orderId,
                    orderNumber: afterData.orderNumber,
                    dispensaryId: dispensaryId,
                    amount: afterData.total,
                    currency: afterData.currency,
                    actionUrl: `/dispensary-admin/orders/${orderId}`,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        // Notify customer
        if (afterData.userId) {
            await db.collection('notifications').add({
                userId: afterData.userId,
                recipient_role: 'LeafUser',
                type: 'payment',
                title: 'Payment Confirmed! ✅',
                message: `Your payment for order #${afterData.orderNumber} has been processed successfully.`,
                priority: 'medium',
                sound: 'success-chime',
                read: false,
                orderId: orderId,
                orderNumber: afterData.orderNumber,
                amount: afterData.total,
                currency: afterData.currency,
                actionUrl: `/dashboard/leaf/orders/${orderId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
    catch (error) {
        v2_1.logger.error('Error sending payment notifications:', error);
    }
});
/**
 * Send notification when shipping status changes
 */
exports.onShippingStatusChange = (0, firestore_1.onDocumentUpdated)('orders/{orderId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    const orderId = event.params.orderId;
    // Check each shipment for status changes
    for (const dispensaryId of Object.keys(afterData.shipments || {})) {
        const beforeShipment = beforeData.shipments?.[dispensaryId];
        const afterShipment = afterData.shipments?.[dispensaryId];
        if (!beforeShipment || !afterShipment)
            continue;
        const statusChanged = beforeShipment.status !== afterShipment.status;
        if (!statusChanged)
            continue;
        v2_1.logger.info(`🚚 Shipping status changed: ${beforeShipment.status} -> ${afterShipment.status}`);
        try {
            const newStatus = afterShipment.status;
            // Prevent duplicate shipping notifications for same status
            const existingShipmentNotifs = await db.collection('notifications')
                .where('orderId', '==', orderId)
                .where('type', '==', 'shipment')
                .where('metadata.status', '==', newStatus)
                .where('metadata.dispensaryId', '==', dispensaryId)
                .limit(1)
                .get();
            if (!existingShipmentNotifs.empty) {
                v2_1.logger.info(`Shipping notification already sent for order ${orderId}, status ${newStatus}, skipping`);
                continue;
            }
            let sound = 'vroom';
            let animation = 'truck-drive';
            let title = 'Shipping Update 🚚';
            let message = `Order #${afterData.orderNumber} status changed`;
            // Customize based on status - Enhanced with detailed descriptions
            switch (newStatus) {
                case 'label_generated':
                    title = 'Label Generated! 📋';
                    message = `Your order #${afterData.orderNumber} shipping label has been created. The dispensary is preparing your package for shipment.`;
                    sound = 'success-chime';
                    animation = 'checkmark-bounce';
                    break;
                case 'ready_for_pickup':
                    title = 'Package Ready! 📦';
                    message = `Order #${afterData.orderNumber} is securely packaged and awaiting courier collection. Shipment will begin soon.`;
                    sound = 'package-ready';
                    animation = 'box-seal';
                    break;
                case 'shipped':
                    title = 'Shipped! 🚚';
                    message = `Great news! Order #${afterData.orderNumber} has been collected by the courier and is now in transit to you.`;
                    sound = 'vroom';
                    animation = 'truck-drive';
                    break;
                case 'in_transit':
                    title = 'In Transit 🚛';
                    message = `Order #${afterData.orderNumber} is moving through the courier network. Track your package for real-time updates.`;
                    sound = 'vroom';
                    animation = 'truck-drive';
                    break;
                case 'out_for_delivery':
                    title = 'Out for Delivery! 🏃';
                    message = `Exciting! Order #${afterData.orderNumber} is on the delivery vehicle and heading to your address today.`;
                    sound = 'nearby';
                    animation = 'map-pulse';
                    break;
                case 'delivered':
                    title = 'Delivered! 🎉';
                    message = `Order #${afterData.orderNumber} has been successfully delivered to your address. Enjoy your purchase!`;
                    sound = 'delivered';
                    animation = 'gift-open';
                    break;
                case 'collection_ready':
                    title = 'Ready for Pickup! 🏪';
                    message = `Order #${afterData.orderNumber} is ready and waiting for you at the dispensary. Bring your ID for collection.`;
                    sound = 'package-ready';
                    animation = 'box-seal';
                    break;
                case 'processing':
                    title = 'Processing Order 🔄';
                    message = `Order #${afterData.orderNumber} is being carefully prepared by the dispensary. You'll be notified once it's ready.`;
                    sound = 'notification-pop';
                    animation = 'spinner';
                    break;
                default:
                    title = 'Order Update 📋';
                    message = `Order #${afterData.orderNumber} status has been updated to: ${newStatus.replace(/_/g, ' ')}`;
                    sound = 'notification-pop';
                    animation = 'spinner';
                    break;
            }
            // Notify customer
            if (afterData.userId) {
                await db.collection('notifications').add({
                    userId: afterData.userId,
                    recipient_role: 'LeafUser',
                    type: 'shipment',
                    title,
                    message,
                    priority: newStatus === 'delivered' ? 'high' : 'medium',
                    sound,
                    animation,
                    showConfetti: newStatus === 'delivered',
                    read: false,
                    orderId: orderId,
                    orderNumber: afterData.orderNumber,
                    actionUrl: `/dashboard/leaf/orders/${orderId}`,
                    metadata: {
                        trackingNumber: afterShipment.trackingNumber,
                        status: newStatus,
                        dispensaryId: dispensaryId,
                    },
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        catch (error) {
            v2_1.logger.error('Error sending shipping notification:', error);
        }
    }
});
/**
 * Send achievement notification
 */
const sendAchievementNotification = async (userId, achievementType, title, description, xpGained, levelReached) => {
    try {
        await db.collection('notifications').add({
            userId,
            type: 'achievement',
            title,
            message: description,
            priority: 'low',
            sound: 'level-up',
            animation: 'trophy-rise',
            showConfetti: true,
            read: false,
            achievementType,
            xpGained,
            levelReached,
            actionUrl: `/dashboard/leaf/achievements`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        v2_1.logger.info(`🏆 Achievement notification sent to user: ${userId}`);
    }
    catch (error) {
        v2_1.logger.error('Error sending achievement notification:', error);
    }
};
exports.sendAchievementNotification = sendAchievementNotification;
//# sourceMappingURL=notifications.js.map