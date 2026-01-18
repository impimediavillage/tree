/**
 * 🔔 FCM Token Management Service
 * Handles Firebase Cloud Messaging token registration, storage, and refresh
 */

import { messaging, db } from '@/lib/firebase';
import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// VAPID key for push notifications (from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates)
// You need to generate this in Firebase Console
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Validate VAPID key
const isValidVapidKey = VAPID_KEY && VAPID_KEY.length > 50 && !VAPID_KEY.includes('Z8Z8Z8');

/**
 * Request notification permission and get FCM token
 */
export async function requestFCMToken(userId: string): Promise<string | null> {
  try {
    // Check if messaging is available
    if (!messaging) {
      console.warn('Firebase Messaging not available');
      return null;
    }

    // Check if VAPID key is valid
    if (!isValidVapidKey) {
      console.error('Invalid VAPID key. Please generate a valid key in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates');
      console.error('Set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your environment variables');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    console.log('Notification permission granted');

    // Register service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Get FCM token
      const token = await getToken(messaging as Messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM token obtained:', token);
        
        // Save token to Firestore
        await saveFCMToken(userId, token);
        
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } else {
      console.warn('Service workers not supported');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Save FCM token to Firestore user document
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const existingTokens = userDoc.data().fcmTokens || [];
      
      // Add token if it doesn't already exist
      if (!existingTokens.includes(token)) {
        await updateDoc(userRef, {
          fcmTokens: [...existingTokens, token],
          lastTokenUpdate: serverTimestamp()
        });
        console.log('FCM token saved to Firestore');
      }
    } else {
      // Create user document with token
      await setDoc(userRef, {
        fcmTokens: [token],
        lastTokenUpdate: serverTimestamp()
      }, { merge: true });
      console.log('FCM token saved to new user document');
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

/**
 * Remove FCM token from Firestore (on logout or token revoke)
 */
export async function removeFCMToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const existingTokens = userDoc.data().fcmTokens || [];
      const updatedTokens = existingTokens.filter((t: string) => t !== token);
      
      await updateDoc(userRef, {
        fcmTokens: updatedTokens,
        lastTokenUpdate: serverTimestamp()
      });
      
      console.log('FCM token removed from Firestore');
    }
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
}

/**
 * Listen for foreground messages (when app is open)
 */
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return null;
  }

  try {
    const unsubscribe = onMessage(messaging as Messaging, (payload) => {
      console.log('📱 Foreground message received:', payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up foreground message listener:', error);
    return null;
  }
}

/**
 * Check if FCM is supported and permission is granted
 */
export async function isFCMAvailable(): Promise<boolean> {
  if (!messaging) {
    return false;
  }

  if (!('Notification' in window)) {
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    return false;
  }

  return true;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
}

/**
 * Initialize FCM for a user (call this on app load after authentication)
 */
export async function initializeFCM(userId: string): Promise<void> {
  try {
    const isAvailable = await isFCMAvailable();
    
    if (!isAvailable) {
      console.log('FCM not available on this device/browser');
      return;
    }

    const permission = getNotificationPermission();
    
    if (permission === 'granted') {
      // User already granted permission, get token
      await requestFCMToken(userId);
    } else if (permission === 'default') {
      // Permission not yet requested - will be requested by NotificationPermissionPrompt component
      console.log('FCM available but permission not yet requested');
    } else {
      console.log('Notification permission denied');
    }
  } catch (error) {
    console.error('Error initializing FCM:', error);
  }
}
