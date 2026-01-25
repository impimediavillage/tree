"use strict";
/**
 * 🚗 Driver Management Cloud Functions
 * Handles automated driver workflows, notifications, and delivery management
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
exports.checkUnclaimedDeliveries = exports.onPayoutRequestUpdate = exports.onDriverStatsUpdate = exports.onDeliveryStatusUpdate = exports.onInHouseDeliveryCreated = void 0;
exports.sendDriverWelcomeEmail = sendDriverWelcomeEmail;
exports.geocodeAddress = geocodeAddress;
exports.calculateDistance = calculateDistance;
exports.notifyDriversWithPriority = notifyDriversWithPriority;
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const notifications_1 = require("./notifications");
const db = admin.firestore();
// ============================================================================
// DELIVERY NOTIFICATIONS
// ============================================================================
/**
 * Notify all available drivers when a new in-house delivery is created
 */
exports.onInHouseDeliveryCreated = (0, firestore_1.onDocumentUpdated)('orders/{orderId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const orderId = event.params.orderId;
    if (!beforeData || !afterData)
        return;
    try {
        // Check if order status changed to ready_for_pickup for in-house delivery
        const shipments = afterData.shipments || {};
        for (const [dispensaryId, shipment] of Object.entries(shipments)) {
            const beforeShipment = beforeData.shipments?.[dispensaryId];
            const currentShipment = shipment;
            // Check if this is an in-house delivery and status changed to ready_for_pickup
            if (currentShipment.shippingProvider === 'in_house' &&
                currentShipment.status === 'ready_for_pickup' &&
                beforeShipment?.status !== 'ready_for_pickup') {
                v2_1.logger.info(`In-house delivery ready for ${dispensaryId}, notifying drivers`);
                // Get all available drivers for this dispensary
                const driversQuery = await db
                    .collection('driver_profiles')
                    .where('dispensaryId', '==', dispensaryId)
                    .where('isActive', '==', true)
                    .where('status', 'in', ['available', 'offline'])
                    .get();
                // Send notification to each driver
                const notificationPromises = driversQuery.docs.map(async (driverDoc) => {
                    const driverId = driverDoc.id;
                    // Create notification
                    await db.collection('driver_notifications').add({
                        driverId,
                        type: 'new_delivery',
                        title: 'New Delivery Available! 🚗',
                        message: `Order #${afterData.orderNumber} is ready for pickup`,
                        priority: 'urgent',
                        deliveryId: orderId,
                        orderId,
                        actionUrl: '/driver/dashboard',
                        sound: 'notification-pop',
                        animation: 'pulse',
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 3600000) // 1 hour
                    });
                    // Send FCM push notification (works even when app closed)
                    await (0, notifications_1.sendFCMPushNotification)(driverId, {
                        title: 'New Delivery Available! 🚗',
                        body: `Order #${afterData.orderNumber} is ready for pickup`,
                        data: {
                            type: 'new_delivery',
                            orderId: orderId,
                            orderNumber: afterData.orderNumber,
                            actionUrl: '/driver/dashboard',
                            sound: 'vroom',
                            priority: 'high',
                            notificationId: orderId,
                        },
                    });
                });
                await Promise.all(notificationPromises);
                v2_1.logger.info(`Notified ${driversQuery.size} drivers about order ${orderId}`);
            }
        }
    }
    catch (error) {
        v2_1.logger.error('Error notifying drivers:', error);
    }
});
// ============================================================================
// DELIVERY STATUS TRACKING
// ============================================================================
/**
 * Update order status when delivery status changes
 */
exports.onDeliveryStatusUpdate = (0, firestore_1.onDocumentUpdated)('deliveries/{deliveryId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const deliveryId = event.params.deliveryId;
    if (!beforeData || !afterData)
        return;
    try {
        const oldStatus = beforeData.status;
        const newStatus = afterData.status;
        // Only proceed if status actually changed
        if (oldStatus === newStatus)
            return;
        const orderId = afterData.orderId;
        const dispensaryId = afterData.dispensaryId;
        const customerId = afterData.customerId;
        v2_1.logger.info(`Delivery ${deliveryId} status changed: ${oldStatus} -> ${newStatus}`);
        // Map delivery status to order shipping status
        let orderStatus = null;
        let notificationTitle = '';
        let notificationMessage = '';
        switch (newStatus) {
            case 'claimed':
                orderStatus = 'claimed_by_driver';
                notificationTitle = 'Driver Assigned! 🚗';
                notificationMessage = `${afterData.driverName} has been assigned to your delivery`;
                break;
            case 'picked_up':
                orderStatus = 'picked_up';
                notificationTitle = 'Order Picked Up! 📦';
                notificationMessage = `Your order has been picked up and is on the way`;
                break;
            case 'en_route':
                orderStatus = 'out_for_delivery';
                notificationTitle = 'On the Way! 🛣️';
                notificationMessage = `Your order is en route to your location`;
                break;
            case 'nearby':
                // Don't change order status, just send notification
                notificationTitle = 'Driver Nearby! 📍';
                notificationMessage = `Your driver is less than 1km away`;
                break;
            case 'arrived':
                // Don't change order status, just send notification
                notificationTitle = 'Driver Arrived! 🎯';
                notificationMessage = `Your driver has arrived at your location`;
                break;
            case 'delivered':
                orderStatus = 'delivered';
                notificationTitle = 'Delivered! ✅';
                notificationMessage = `Your order has been delivered successfully`;
                break;
            case 'cancelled':
                orderStatus = 'cancelled';
                notificationTitle = 'Delivery Cancelled';
                notificationMessage = `Your delivery has been cancelled`;
                break;
        }
        // Update order status if needed
        if (orderStatus) {
            const orderRef = db.collection('orders').doc(orderId);
            const updateData = {
                [`shipments.${dispensaryId}.status`]: orderStatus,
                [`shipments.${dispensaryId}.lastStatusUpdate`]: admin.firestore.FieldValue.serverTimestamp(),
                [`shipments.${dispensaryId}.statusHistory`]: admin.firestore.FieldValue.arrayUnion({
                    status: orderStatus,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    message: notificationMessage,
                    updatedBy: afterData.driverId || 'system'
                }),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            // Add driver info to shipment when claimed
            if (newStatus === 'claimed' && afterData.driverId && afterData.driverName) {
                updateData[`shipments.${dispensaryId}.driverId`] = afterData.driverId;
                updateData[`shipments.${dispensaryId}.driverName`] = afterData.driverName;
            }
            await orderRef.update(updateData);
        }
        // Send notification to customer
        if (notificationTitle && customerId) {
            await db.collection('notifications').add({
                userId: customerId,
                recipient_role: 'LeafUser',
                type: 'shipment',
                title: notificationTitle,
                message: notificationMessage,
                priority: newStatus === 'nearby' ? 'high' : 'medium',
                sound: newStatus === 'delivered' ? 'success-chime' : 'notification-pop',
                animation: newStatus === 'delivered' ? 'checkmark' : 'spinner',
                showConfetti: newStatus === 'delivered',
                read: false,
                orderId,
                orderNumber: afterData.orderNumber,
                deliveryId,
                actionUrl: `/dashboard/leaf/orders/${orderId}`,
                metadata: {
                    driverName: afterData.driverName,
                    status: newStatus
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        // Send notification to driver for specific status changes
        if (newStatus === 'delivered' && afterData.driverId) {
            await db.collection('driver_notifications').add({
                driverId: afterData.driverId,
                type: 'delivery_update',
                title: 'Delivery Completed! ✅',
                message: `You earned R${afterData.driverEarnings} for this delivery`,
                priority: 'medium',
                deliveryId,
                orderId,
                actionUrl: '/driver/earnings',
                sound: 'coin-drop',
                animation: 'coin-scatter',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        v2_1.logger.info(`Updated order ${orderId} and sent notifications for status: ${newStatus}`);
    }
    catch (error) {
        v2_1.logger.error('Error handling delivery status update:', error);
    }
});
// ============================================================================
// ACHIEVEMENT SYSTEM
// ============================================================================
/**
 * Check and award achievements when driver stats change
 */
exports.onDriverStatsUpdate = (0, firestore_1.onDocumentUpdated)('driver_profiles/{driverId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const driverId = event.params.driverId;
    if (!beforeData || !afterData)
        return;
    try {
        const oldStats = beforeData.stats || {};
        const newStats = afterData.stats || {};
        const achievements = afterData.achievements || [];
        const earnedIds = achievements.map((a) => a.id);
        // Achievement definitions (matching DRIVER_ACHIEVEMENTS from types)
        const achievementChecks = [
            {
                id: 'first_delivery',
                name: 'First Steps',
                description: 'Complete your first delivery',
                icon: '🚀',
                category: 'delivery',
                check: () => newStats.totalDeliveries >= 1 && oldStats.totalDeliveries === 0,
                reward: null
            },
            {
                id: 'century_club',
                name: 'Century Club',
                description: 'Complete 100 deliveries',
                icon: '💯',
                category: 'delivery',
                check: () => newStats.totalDeliveries >= 100 && oldStats.totalDeliveries < 100,
                reward: { bonus: 500 }
            },
            {
                id: 'perfect_record',
                name: 'Perfect Record',
                description: 'Maintain a 5.0 rating over 20 deliveries',
                icon: '⭐',
                category: 'rating',
                check: () => newStats.averageRating === 5.0 && newStats.totalRatings >= 20,
                reward: { bonus: 100 }
            },
            {
                id: 'money_maker',
                name: 'Money Maker',
                description: 'Earn R10,000 in total deliveries',
                icon: '💰',
                category: 'earnings',
                check: () => newStats.totalEarnings >= 10000 && oldStats.totalEarnings < 10000,
                reward: { bonus: 1000 }
            }
        ];
        for (const achievement of achievementChecks) {
            // Skip if already earned
            if (earnedIds.includes(achievement.id))
                continue;
            // Check if requirements met
            if (achievement.check()) {
                v2_1.logger.info(`Driver ${driverId} earned achievement: ${achievement.name}`);
                // Add achievement to profile
                await db.collection('driver_profiles').doc(driverId).update({
                    achievements: admin.firestore.FieldValue.arrayUnion({
                        id: achievement.id,
                        name: achievement.name,
                        description: achievement.description,
                        icon: achievement.icon,
                        earnedAt: admin.firestore.FieldValue.serverTimestamp(),
                        category: achievement.category
                    })
                });
                // Award bonus if applicable
                if (achievement.reward?.bonus) {
                    await db.collection('driver_profiles').doc(driverId).update({
                        availableEarnings: admin.firestore.FieldValue.increment(achievement.reward.bonus)
                    });
                }
                // Send achievement notification
                await db.collection('driver_notifications').add({
                    driverId,
                    type: 'achievement',
                    title: `Achievement Unlocked: ${achievement.name}! 🏆`,
                    message: achievement.description,
                    priority: 'medium',
                    sound: 'level-up',
                    animation: 'trophy-rise',
                    showConfetti: true,
                    read: false,
                    actionUrl: '/driver/achievements',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    }
    catch (error) {
        v2_1.logger.error('Error checking achievements:', error);
    }
});
// ============================================================================
// PAYOUT MANAGEMENT
// ============================================================================
/**
 * Send notification when payout request status changes
 */
exports.onPayoutRequestUpdate = (0, firestore_1.onDocumentUpdated)('driver_payout_requests/{payoutId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    try {
        const oldStatus = beforeData.status;
        const newStatus = afterData.status;
        if (oldStatus === newStatus)
            return;
        const driverId = afterData.driverId;
        const amount = afterData.amount;
        let notification = {
            driverId,
            read: false,
            actionUrl: '/driver/payouts',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (newStatus === 'approved') {
            notification = {
                ...notification,
                type: 'payout_approved',
                title: 'Payout Approved! 💰',
                message: `Your payout of R${amount} has been approved and will be processed soon`,
                priority: 'high',
                sound: 'coin-drop',
                animation: 'coin-scatter',
                showConfetti: true
            };
        }
        else if (newStatus === 'rejected') {
            notification = {
                ...notification,
                type: 'payout_rejected',
                title: 'Payout Request Rejected',
                message: `Your payout request of R${amount} was rejected: ${afterData.rejectionReason || 'No reason provided'}`,
                priority: 'high',
                sound: 'notification-pop'
            };
        }
        else if (newStatus === 'paid') {
            notification = {
                ...notification,
                type: 'payout_approved',
                title: 'Payout Completed! 🎉',
                message: `R${amount} has been paid to your account`,
                priority: 'high',
                sound: 'success-chime',
                showConfetti: true
            };
            // Update driver profile
            await db.collection('driver_profiles').doc(driverId).update({
                pendingPayouts: admin.firestore.FieldValue.increment(-amount)
            });
        }
        await db.collection('driver_notifications').add(notification);
        // Send FCM push notification (works even when app closed)
        await (0, notifications_1.sendFCMPushNotification)(driverId, {
            title: notification.title,
            body: notification.message,
            data: {
                type: notification.type,
                amount: amount.toString(),
                status: newStatus,
                actionUrl: '/driver/payouts',
                sound: notification.sound || 'notification-pop',
                priority: notification.priority || 'high',
            },
        });
        v2_1.logger.info(`Sent payout notification to driver ${driverId}: ${newStatus}`);
    }
    catch (error) {
        v2_1.logger.error('Error handling payout update:', error);
    }
});
// ============================================================================
// AUTO-CANCEL UNCLAIMED DELIVERIES
// ============================================================================
/**
 * Auto-cancel deliveries that haven't been claimed after 1 hour
 * Note: This would need to be a scheduled function in production
 */
const checkUnclaimedDeliveries = async () => {
    try {
        const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 3600000);
        const unclaimedDeliveries = await db
            .collection('deliveries')
            .where('status', '==', 'available')
            .where('createdAt', '<', oneHourAgo)
            .get();
        for (const deliveryDoc of unclaimedDeliveries.docs) {
            const deliveryData = deliveryDoc.data();
            // Update delivery status
            await deliveryDoc.ref.update({
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                statusHistory: admin.firestore.FieldValue.arrayUnion({
                    status: 'cancelled',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    note: 'Auto-cancelled after 1 hour without driver'
                }),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Notify customer
            await db.collection('notifications').add({
                userId: deliveryData.customerId,
                recipient_role: 'LeafUser',
                type: 'shipment',
                title: 'Delivery Cancelled',
                message: `Unfortunately, no driver was available for your order #${deliveryData.orderNumber}. Please contact the dispensary.`,
                priority: 'high',
                sound: 'notification-pop',
                read: false,
                orderId: deliveryData.orderId,
                actionUrl: `/dashboard/leaf/orders/${deliveryData.orderId}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            v2_1.logger.info(`Auto-cancelled unclaimed delivery ${deliveryDoc.id}`);
        }
    }
    catch (error) {
        v2_1.logger.error('Error checking unclaimed deliveries:', error);
    }
};
exports.checkUnclaimedDeliveries = checkUnclaimedDeliveries;
// ============================================================================
// DRIVER APPLICATION PROCESSING
// ============================================================================
/**
 * Send welcome email to approved driver with login credentials
 */
async function sendDriverWelcomeEmail(email, displayName, temporaryPassword) {
    try {
        // TODO: Integrate with your email service
        // For now, log the credentials
        v2_1.logger.info(`Driver approved: ${email}`, {
            displayName,
            temporaryPassword,
            loginUrl: 'https://thewellnesstree.com/login'
        });
        // You can use SendGrid, Mailgun, or your existing email service here
        // Example:
        /*
        await sendEmail({
          to: email,
          subject: 'Welcome to The Wellness Tree Driver Network!',
          html: `
            <h1>Welcome, ${displayName}!</h1>
            <p>Your driver application has been approved! You can now start accepting deliveries.</p>
            <h2>Login Credentials</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
            <p><strong>Login URL:</strong> https://thewellnesstree.com/login</p>
            <p>Please change your password after your first login.</p>
            <h2>Next Steps</h2>
            <ol>
              <li>Log in to your driver dashboard</li>
              <li>Complete your profile</li>
              <li>Set your availability</li>
              <li>Start accepting deliveries!</li>
            </ol>
            <p>Welcome to the team!</p>
          `
        });
        */
    }
    catch (error) {
        v2_1.logger.error('Error sending driver welcome email:', error);
        throw error;
    }
}
/**
 * Geocode address to get latitude/longitude
 * Uses Google Maps Geocoding API
 * Note: Requires GOOGLE_MAPS_API_KEY secret to be set
 */
async function geocodeAddress(address, city, province, country) {
    try {
        const fullAddress = `${address}, ${city}, ${province}, ${country}`;
        v2_1.logger.info(`Geocoding address: ${fullAddress}`);
        // Use the Google Maps API key from environment (set as Firebase secret)
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            v2_1.logger.warn('GOOGLE_MAPS_API_KEY secret not configured. Set it via: firebase functions:secrets:set GOOGLE_MAPS_API_KEY');
            return null;
        }
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`);
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            v2_1.logger.info(`Geocoded successfully: ${location.lat}, ${location.lng}`);
            return {
                latitude: location.lat,
                longitude: location.lng
            };
        }
        else {
            v2_1.logger.warn(`Geocoding failed: ${data.status}`, { fullAddress, error: data.error_message });
            return null;
        }
    }
    catch (error) {
        v2_1.logger.error('Error geocoding address:', error);
        return null;
    }
}
/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}
/**
 * Notify nearby public drivers about new delivery
 * Priority system: Dispensary drivers first, then public drivers
 */
async function notifyDriversWithPriority(dispensaryId, deliveryId, orderNumber, pickupLocation, deliveryLocation) {
    try {
        // TIER 1: Check for dispensary's own drivers first
        const privateDriversQuery = await db
            .collection('driver_profiles')
            .where('ownershipType', '==', 'private')
            .where('primaryDispensaryId', '==', dispensaryId)
            .where('status', '==', 'available')
            .where('isActive', '==', true)
            .get();
        if (!privateDriversQuery.empty) {
            v2_1.logger.info(`Found ${privateDriversQuery.size} private drivers for dispensary ${dispensaryId}`);
            // Notify private drivers
            const privateNotifications = privateDriversQuery.docs.map(async (driverDoc) => {
                const driverData = driverDoc.data();
                const distance = calculateDistance(driverData.homeLocation?.latitude || 0, driverData.homeLocation?.longitude || 0, pickupLocation.latitude, pickupLocation.longitude);
                return (0, notifications_1.sendFCMPushNotification)(driverDoc.id, {
                    title: '🚗 New Delivery Available (Priority)',
                    body: `Order #${orderNumber} - ${distance.toFixed(1)}km away. You have priority!`,
                    data: {
                        type: 'new_delivery_priority',
                        deliveryId,
                        orderNumber,
                        distance: distance.toFixed(1),
                        priority: 'high'
                    }
                });
            });
            await Promise.all(privateNotifications);
            // Schedule public notification in 2 minutes if not claimed
            setTimeout(async () => {
                const deliveryDoc = await db.collection('driver_deliveries').doc(deliveryId).get();
                if (deliveryDoc.exists && deliveryDoc.data()?.status === 'pending') {
                    await notifyPublicDriversNearby(deliveryId, orderNumber, pickupLocation, 10);
                }
            }, 120000); // 2 minutes
            return;
        }
        // TIER 2: No private drivers, notify public drivers immediately
        v2_1.logger.info(`No private drivers found, notifying public drivers for delivery ${deliveryId}`);
        await notifyPublicDriversNearby(deliveryId, orderNumber, pickupLocation, 10);
    }
    catch (error) {
        v2_1.logger.error('Error notifying drivers with priority:', error);
    }
}
/**
 * Notify public drivers within radius of pickup location
 */
async function notifyPublicDriversNearby(deliveryId, orderNumber, pickupLocation, radiusKm) {
    try {
        // Get all available public drivers
        const publicDriversQuery = await db
            .collection('driver_profiles')
            .where('ownershipType', '==', 'public')
            .where('status', '==', 'available')
            .where('isActive', '==', true)
            .where('approvalStatus', '==', 'approved')
            .get();
        v2_1.logger.info(`Found ${publicDriversQuery.size} public drivers to check`);
        // Filter by distance and service radius
        const nearbyDrivers = [];
        for (const driverDoc of publicDriversQuery.docs) {
            const driverData = driverDoc.data();
            const homeLocation = driverData.homeLocation;
            if (!homeLocation?.latitude || !homeLocation?.longitude)
                continue;
            const distance = calculateDistance(homeLocation.latitude, homeLocation.longitude, pickupLocation.latitude, pickupLocation.longitude);
            const driverServiceRadius = driverData.serviceRadius || 15;
            if (distance <= Math.min(radiusKm, driverServiceRadius)) {
                nearbyDrivers.push({
                    id: driverDoc.id,
                    distance,
                    rating: driverData.stats?.averageRating || 0,
                    pricePerKm: driverData.pricePerKm || 8
                });
            }
        }
        // Sort by rating, then distance
        nearbyDrivers.sort((a, b) => {
            if (Math.abs(a.rating - b.rating) > 0.5) {
                return b.rating - a.rating; // Higher rating first
            }
            return a.distance - b.distance; // Closer first
        });
        v2_1.logger.info(`Notifying ${nearbyDrivers.length} nearby drivers`);
        // Notify drivers
        const notifications = nearbyDrivers.map(driver => (0, notifications_1.sendFCMPushNotification)(driver.id, {
            title: '🚗 New Delivery Available',
            body: `Order #${orderNumber} - ${driver.distance.toFixed(1)}km away. Est. earnings: R${(driver.distance * driver.pricePerKm).toFixed(2)}`,
            data: {
                type: 'new_delivery',
                deliveryId,
                orderNumber,
                distance: driver.distance.toFixed(1),
                estimatedEarnings: (driver.distance * driver.pricePerKm).toFixed(2)
            }
        }));
        await Promise.all(notifications);
    }
    catch (error) {
        v2_1.logger.error('Error notifying public drivers:', error);
    }
}
//# sourceMappingURL=driver-functions.js.map