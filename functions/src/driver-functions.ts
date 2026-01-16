/**
 * 🚗 Driver Management Cloud Functions
 * Handles automated driver workflows, notifications, and delivery management
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { sendFCMPushNotification } from './notifications';

const db = admin.firestore();

// ============================================================================
// DELIVERY NOTIFICATIONS
// ============================================================================

/**
 * Notify all available drivers when a new in-house delivery is created
 */
export const onInHouseDeliveryCreated = onDocumentUpdated(
  'orders/{orderId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const orderId = event.params.orderId;

    if (!beforeData || !afterData) return;

    try {
      // Check if order status changed to ready_for_pickup for in-house delivery
      const shipments = afterData.shipments || {};
      
      for (const [dispensaryId, shipment] of Object.entries(shipments)) {
        const beforeShipment = beforeData.shipments?.[dispensaryId];
        const currentShipment = shipment as any;
        
        // Check if this is an in-house delivery and status changed to ready_for_pickup
        if (
          currentShipment.shippingProvider === 'in_house' &&
          currentShipment.status === 'ready_for_pickup' &&
          beforeShipment?.status !== 'ready_for_pickup'
        ) {
          logger.info(`In-house delivery ready for ${dispensaryId}, notifying drivers`);
          
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
            await sendFCMPushNotification(driverId, {
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
          logger.info(`Notified ${driversQuery.size} drivers about order ${orderId}`);
        }
      }
    } catch (error) {
      logger.error('Error notifying drivers:', error);
    }
  }
);

// ============================================================================
// DELIVERY STATUS TRACKING
// ============================================================================

/**
 * Update order status when delivery status changes
 */
export const onDeliveryStatusUpdate = onDocumentUpdated(
  'deliveries/{deliveryId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const deliveryId = event.params.deliveryId;

    if (!beforeData || !afterData) return;

    try {
      const oldStatus = beforeData.status;
      const newStatus = afterData.status;
      
      // Only proceed if status actually changed
      if (oldStatus === newStatus) return;

      const orderId = afterData.orderId;
      const dispensaryId = afterData.dispensaryId;
      const customerId = afterData.customerId;

      logger.info(`Delivery ${deliveryId} status changed: ${oldStatus} -> ${newStatus}`);

      // Map delivery status to order shipping status
      let orderStatus: string | null = null;
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
        const updateData: any = {
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

      logger.info(`Updated order ${orderId} and sent notifications for status: ${newStatus}`);
    } catch (error) {
      logger.error('Error handling delivery status update:', error);
    }
  }
);

// ============================================================================
// ACHIEVEMENT SYSTEM
// ============================================================================

/**
 * Check and award achievements when driver stats change
 */
export const onDriverStatsUpdate = onDocumentUpdated(
  'driver_profiles/{driverId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const driverId = event.params.driverId;

    if (!beforeData || !afterData) return;

    try {
      const oldStats = beforeData.stats || {};
      const newStats = afterData.stats || {};
      const achievements = afterData.achievements || [];
      const earnedIds = achievements.map((a: any) => a.id);

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
        if (earnedIds.includes(achievement.id)) continue;

        // Check if requirements met
        if (achievement.check()) {
          logger.info(`Driver ${driverId} earned achievement: ${achievement.name}`);

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
    } catch (error) {
      logger.error('Error checking achievements:', error);
    }
  }
);

// ============================================================================
// PAYOUT MANAGEMENT
// ============================================================================

/**
 * Send notification when payout request status changes
 */
export const onPayoutRequestUpdate = onDocumentUpdated(
  'driver_payout_requests/{payoutId}',
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    try {
      const oldStatus = beforeData.status;
      const newStatus = afterData.status;
      
      if (oldStatus === newStatus) return;

      const driverId = afterData.driverId;
      const amount = afterData.amount;

      let notification: any = {
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
      } else if (newStatus === 'rejected') {
        notification = {
          ...notification,
          type: 'payout_rejected',
          title: 'Payout Request Rejected',
          message: `Your payout request of R${amount} was rejected: ${afterData.rejectionReason || 'No reason provided'}`,
          priority: 'high',
          sound: 'notification-pop'
        };
      } else if (newStatus === 'paid') {
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
      await sendFCMPushNotification(driverId, {
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
      
      logger.info(`Sent payout notification to driver ${driverId}: ${newStatus}`);
    } catch (error) {
      logger.error('Error handling payout update:', error);
    }
  }
);

// ============================================================================
// AUTO-CANCEL UNCLAIMED DELIVERIES
// ============================================================================

/**
 * Auto-cancel deliveries that haven't been claimed after 1 hour
 * Note: This would need to be a scheduled function in production
 */
export const checkUnclaimedDeliveries = async () => {
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

      logger.info(`Auto-cancelled unclaimed delivery ${deliveryDoc.id}`);
    }
  } catch (error) {
    logger.error('Error checking unclaimed deliveries:', error);
  }
};
