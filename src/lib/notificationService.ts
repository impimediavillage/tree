/**
 * 🎮 Gamestyle Notification Service
 * World-class notification system with sounds, animations, push notifications, and in-app toasts
 */

import { Howl } from 'howler';
import toast from 'react-hot-toast';
import type { Notification, NotificationSound, NotificationPreferences } from '@/types/notification';
import { db } from '@/lib/firebase';
import { cacheSoundFiles } from '@/lib/sound-cache-service';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

// Sound file paths (store in public/sounds/)
const SOUND_FILES: Record<NotificationSound, string> = {
  'ka-ching': '/sounds/ka-ching.mp3',
  'coin-drop': '/sounds/coin-drop.mp3',
  'success-chime': '/sounds/success-chime.mp3',
  'vroom': '/sounds/vroom.mp3',
  'package-ready': '/sounds/package-ready.mp3',
  'level-up': '/sounds/level-up.mp3',
  'delivered': '/sounds/delivered.mp3',
  'nearby': '/sounds/nearby.mp3',
  'notification-pop': '/sounds/notification-pop.mp3',
};

// Preloaded sound instances
const soundInstances: Map<NotificationSound, Howl> = new Map();
let soundsInitialized = false;

/**
 * Initialize sound system - preload all sounds with caching
 */
export async function initializeSoundSystem(): Promise<void> {
  if (soundsInitialized) {
    console.log('🔊 Sound system already initialized');
    return;
  }
  
  try {
    // First, cache sound files using Cache API for offline support
    await cacheSoundFiles();
    
    // Then, preload sounds with Howler.js for instant playback
    Object.entries(SOUND_FILES).forEach(([soundName, soundPath]) => {
      const howl = new Howl({
        src: [soundPath],
        volume: 0.5,
        preload: true,
        html5: true, // Use HTML5 Audio for better mobile support
        onload: () => {
          console.log(`✅ Loaded: ${soundName}`);
        },
        onloaderror: (id, error) => {
          console.error(`❌ Failed to load ${soundName}:`, error);
        },
      });
      soundInstances.set(soundName as NotificationSound, howl);
    });
    
    soundsInitialized = true;
    console.log('🔊 Sound system initialized with', soundInstances.size, 'sounds');
  } catch (error) {
    console.error('Error initializing sound system:', error);
  }
}

/**
 * Play a notification sound
 */
export async function playNotificationSound(
  soundName: NotificationSound,
  userPreferences?: NotificationPreferences
): Promise<void> {
  try {
    // Check if sounds are enabled
    if (userPreferences && !userPreferences.enableSounds) {
      return;
    }
    
    // Check Do Not Disturb
    if (userPreferences?.doNotDisturb && isInDoNotDisturbPeriod(userPreferences)) {
      return;
    }
    
    const sound = soundInstances.get(soundName);
    if (!sound) {
      console.warn(`Sound "${soundName}" not found`);
      return;
    }
    
    // Set volume from preferences
    const volume = userPreferences?.soundVolume ?? 50;
    sound.volume(volume / 100);
    
    // Play the sound
    sound.play();
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

/**
 * Check if current time is in Do Not Disturb period
 */
function isInDoNotDisturbPeriod(preferences: NotificationPreferences): boolean {
  if (!preferences.doNotDisturbStart || !preferences.doNotDisturbEnd) {
    return false;
  }
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = preferences.doNotDisturbStart.split(':').map(Number);
  const [endHour, endMin] = preferences.doNotDisturbEnd.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle overnight DND (e.g., 22:00 to 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }
  
  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Send an in-app toast notification
 */
export function showInAppToast(notification: Notification, preferences?: NotificationPreferences): void {
  // Check if toasts are enabled
  if (preferences && !preferences.enableInAppToasts) {
    return;
  }
  
  // Check Do Not Disturb
  if (preferences?.doNotDisturb && isInDoNotDisturbPeriod(preferences)) {
    return;
  }
  
  // Play sound
  if (notification.sound) {
    playNotificationSound(notification.sound, preferences);
  }
  
  // Note: Toast display is handled by the toast components in /components/notifications/toasts/
  // This service just stores the notification data. The actual UI components (OrderToast, PaymentToast, etc.)
  // listen for new notifications and render themselves with animations.
}

/**
 * Helper function to get icon emoji for notification type
 */
export function getNotificationIcon(type: string): string {
  switch (type) {
    case 'order':
      return '💰';
    case 'payment':
      return '💳';
    case 'shipment':
      return '🚚';
    case 'achievement':
      return '🏆';
    case 'product':
      return '📦';
    case 'influencer':
      return '🌟';
    case 'treehouse':
      return '🎨';
    case 'system':
      return '⚙️';
    default:
      return '🔔';
  }
}

/**
 * Save notification to Firestore
 */
export async function saveNotification(notification: Omit<Notification, 'id'>): Promise<string> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      ...notification,
      createdAt: serverTimestamp(),
      read: false,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving notification:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    // Try direct document read first (more efficient and works with security rules)
    const docRef = doc(db, 'notificationPreferences', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        ...docSnap.data(),
        id: docSnap.id
      } as unknown as NotificationPreferences;
    }
    
    // Return default preferences if document doesn't exist
    return getDefaultPreferences(userId);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return getDefaultPreferences(userId);
  }
}

/**
 * Default notification preferences
 */
function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    enableSounds: true,
    enablePushNotifications: true,
    enableInAppToasts: true,
    enableEmailNotifications: false,
    soundVolume: 50,
    doNotDisturb: false,
    orderNotifications: true,
    paymentNotifications: true,
    shippingNotifications: true,
    achievementNotifications: true,
    productNotifications: true,
    systemNotifications: true,
    influencerNotifications: true,
    historyRetentionDays: 30,
  };
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const prefsRef = collection(db, 'notificationPreferences');
    const q = query(prefsRef, where('userId', '==', userId), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create new preferences
      await addDoc(prefsRef, {
        ...getDefaultPreferences(userId),
        ...preferences,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Update existing preferences
      await updateDoc(snapshot.docs[0].ref, {
        ...preferences,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void,
  options: { limit?: number } = {}
): () => void {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(options.limit || 50)
  );
  
  let isInitialLoad = true;
  const now = Date.now();
  const recentThreshold = 5000; // Only treat notifications from last 5 seconds as "new"
  
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const notification = {
          id: change.doc.id,
          ...change.doc.data(),
        } as Notification;
        
        // Check if notification is truly new (created recently)
        const createdAt = notification.createdAt instanceof Timestamp 
          ? notification.createdAt.toMillis() 
          : Date.now();
        
        const isRecentNotification = (now - createdAt) < recentThreshold;
        
        // Only call onNotification for truly new items (not initial load backlog)
        // OR if it's recent enough to be considered "new"
        if (!isInitialLoad || isRecentNotification) {
          onNotification(notification);
        }
      }
    });
    
    // After first snapshot, all subsequent changes are real-time updates
    isInitialLoad = false;
  });
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

/**
 * Show browser push notification
 */
export function showBrowserNotification(notification: Notification): void {
  if (Notification.permission !== 'granted') {
    return;
  }
  
  const options: NotificationOptions = {
    body: notification.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: notification.id,
    requireInteraction: notification.priority === 'critical',
    data: {
      url: notification.actionUrl,
    },
  };
  
  const browserNotification = new Notification(notification.title, options);
  
  browserNotification.onclick = () => {
    if (notification.actionUrl) {
      window.focus();
      window.location.href = notification.actionUrl;
    }
    browserNotification.close();
  };
}

/**
 * Send complete notification (in-app + push + save to DB)
 */
export async function sendNotification(
  notification: Omit<Notification, 'id'>,
  userId: string
): Promise<void> {
  try {
    // Get user preferences
    const preferences = await getUserNotificationPreferences(userId);
    
    // Save to database
    const notificationId = await saveNotification(notification);
    const fullNotification = { ...notification, id: notificationId };
    
    // Show in-app toast
    if (preferences.enableInAppToasts) {
      showInAppToast(fullNotification, preferences);
    }
    
    // Show browser push notification
    if (preferences.enablePushNotifications && Notification.permission === 'granted') {
      showBrowserNotification(fullNotification);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Cleanup old notifications based on retention policy
 */
export async function cleanupOldNotifications(userId: string): Promise<void> {
  try {
    const preferences = await getUserNotificationPreferences(userId);
    const retentionDays = preferences.historyRetentionDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('createdAt', '<', Timestamp.fromDate(cutoffDate))
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
    console.log(`🗑️ Cleaned up ${snapshot.size} old notifications for user ${userId}`);
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
}
