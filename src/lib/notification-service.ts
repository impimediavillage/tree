import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { type Notification, type NotificationType } from '@/types/notification';

export async function sendDispensaryNotification({
  dispensaryId,
  title,
  message,
  type,
  orderId,
  customerId,
}: {
  dispensaryId: string;
  title: string;
  message: string;
    type: NotificationType;
  orderId?: string;
  customerId?: string;
}) {
  try {
    const dispensaryRef = doc(db, 'dispensaries', dispensaryId);
    const notification: Notification = {
      id: Date.now().toString(),
      recipient_id: dispensaryId,
      recipient_role: 'DispensaryAdmin',
      title,
      message,
      type,
      priority: 'medium', // Default priority
      read: false,
      createdAt: new Date(),
      orderId,
      customerId,
      dispensaryId
    };

    await updateDoc(dispensaryRef, {
      notifications: arrayUnion(notification)
    });

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(dispensaryId: string, notificationId: string) {
  try {
    const dispensaryRef = doc(db, 'dispensaries', dispensaryId);
    
    // First get the current notifications
    const dispensaryDoc = await getDoc(dispensaryRef);
    const notifications = dispensaryDoc.data()?.notifications || [];
    
    // Find and update the specific notification
    const updatedNotifications = notifications.map((notification: Notification) => {
      if (notification.id === notificationId) {
        return { ...notification, read: true };
      }
      return notification;
    });

    // Update the notifications array
    await updateDoc(dispensaryRef, {
      notifications: updatedNotifications
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}