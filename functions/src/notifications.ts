/**
 * 🔔 Notification Cloud Functions
 * Triggers notifications for orders, payments, shipping, and achievements
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Send notification when new order is created
 * Notifies: Dispensary Owner, Super Admin, Treehouse Creators
 */
export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
  const orderData = event.data?.data();
  if (!orderData) return;

  const orderId = event.params.orderId;
  logger.info(`📦 New order created: ${orderId}`);

  try {
    // Get all dispensaries from the order
    const dispensaryIds = Object.keys(orderData.shipments || {});
    
    // Notify each dispensary owner
    for (const dispensaryId of dispensaryIds) {
      const shipment = orderData.shipments[dispensaryId];
      const dispensaryRef = await db.collection('dispensaries').doc(dispensaryId).get();
      const dispensaryData = dispensaryRef.data();
      
      if (!dispensaryData) continue;

      // Find dispensary owner
      const ownerQuery = await db.collection('users')
        .where('dispensaryId', '==', dispensaryId)
        .where('role', '==', 'DispensaryOwner')
        .limit(1)
        .get();

      if (!ownerQuery.empty) {
        const ownerId = ownerQuery.docs[0].id;
        
        // Create notification for dispensary owner
        await db.collection('notifications').add({
          userId: ownerId,
          recipient_role: 'DispensaryOwner',
          type: 'order',
          title: 'New Order Received! 💰',
          message: `Order #${orderData.orderNumber} - ${orderData.currency} ${shipment.items.reduce((sum: number, item: any) => sum + item.lineTotal, 0).toFixed(2)}`,
          priority: 'high',
          sound: 'ka-ching',
          animation: 'money-bag',
          showConfetti: false,
          read: false,
          orderId: orderId,
          orderNumber: orderData.orderNumber,
          dispensaryId: dispensaryId,
          amount: shipment.items.reduce((sum: number, item: any) => sum + item.lineTotal, 0),
          currency: orderData.currency,
          actionUrl: `/dispensary-admin/orders/${orderId}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        logger.info(`✅ Notification sent to dispensary owner: ${ownerId}`);
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

  } catch (error) {
    logger.error('Error sending order notifications:', error);
  }
});

/**
 * Send notification when payment is completed
 */
export const onPaymentCompleted = onDocumentUpdated('orders/{orderId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  if (!beforeData || !afterData) return;

  // Check if payment status changed to completed
  const wasPaymentCompleted = beforeData.paymentStatus !== 'completed' && afterData.paymentStatus === 'completed';
  
  if (!wasPaymentCompleted) return;

  const orderId = event.params.orderId;
  logger.info(`💳 Payment completed for order: ${orderId}`);

  try {
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

  } catch (error) {
    logger.error('Error sending payment notifications:', error);
  }
});

/**
 * Send notification when shipping status changes
 */
export const onShippingStatusChange = onDocumentUpdated('orders/{orderId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  if (!beforeData || !afterData) return;

  const orderId = event.params.orderId;
  
  // Check each shipment for status changes
  for (const dispensaryId of Object.keys(afterData.shipments || {})) {
    const beforeShipment = beforeData.shipments?.[dispensaryId];
    const afterShipment = afterData.shipments?.[dispensaryId];
    
    if (!beforeShipment || !afterShipment) continue;
    
    const statusChanged = beforeShipment.status !== afterShipment.status;
    if (!statusChanged) continue;

    logger.info(`🚚 Shipping status changed: ${beforeShipment.status} -> ${afterShipment.status}`);

    try {
      const newStatus = afterShipment.status;
      let sound: string = 'vroom';
      let animation: string = 'truck-drive';
      let title: string = 'Shipping Update 🚚';
      let message: string = `Order #${afterData.orderNumber} status changed`;

      // Customize based on status
      switch (newStatus) {
        case 'shipped':
          title = 'Order Shipped! 🚚';
          message = `Your order #${afterData.orderNumber} has been shipped`;
          break;
        case 'in_transit':
          title = 'In Transit 📦';
          message = `Your order #${afterData.orderNumber} is on its way`;
          break;
        case 'out_for_delivery':
          title = 'Out for Delivery! 🚚';
          message = `Your order #${afterData.orderNumber} will arrive today`;
          sound = 'nearby';
          animation = 'map-pulse';
          break;
        case 'delivered':
          title = 'Delivered! 🎉';
          message = `Your order #${afterData.orderNumber} has been delivered successfully`;
          sound = 'delivered';
          animation = 'gift-open';
          break;
        case 'ready_for_pickup':
          title = 'Ready for Pickup! 📦';
          message = `Order #${afterData.orderNumber} is ready for collection`;
          sound = 'package-ready';
          animation = 'box-seal';
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
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

    } catch (error) {
      logger.error('Error sending shipping notification:', error);
    }
  }
});

/**
 * Send achievement notification
 */
export const sendAchievementNotification = async (
  userId: string,
  achievementType: string,
  title: string,
  description: string,
  xpGained?: number,
  levelReached?: number
) => {
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
    
    logger.info(`🏆 Achievement notification sent to user: ${userId}`);
  } catch (error) {
    logger.error('Error sending achievement notification:', error);
  }
};
