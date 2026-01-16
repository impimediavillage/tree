/**
 * 🔥 Firebase Cloud Messaging Service Worker
 * Handles background push notifications when the app is closed
 */

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - must match your project
const firebaseConfig = {
  apiKey: "AIzaSyBl7Qz7mKPVpkIkT2Pd2hF5dF78UBU90Q0",
  authDomain: "dispensary-tree.firebaseapp.com",
  projectId: "dispensary-tree",
  storageBucket: "dispensary-tree.firebasestorage.app",
  messagingSenderId: "464651742704",
  appId: "1:464651742704:web:aac682f4be4e7c53bf3bc1",
  measurementId: "G-0SQNJ88M1P"
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || '',
    icon: payload.notification?.icon || payload.data?.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: payload.data?.notificationId || 'notification',
    requireInteraction: payload.data?.priority === 'critical' || payload.data?.priority === 'high',
    data: {
      url: payload.data?.actionUrl || payload.fcmOptions?.link || '/',
      notificationId: payload.data?.notificationId,
      type: payload.data?.type,
      orderId: payload.data?.orderId,
      sound: payload.data?.sound,
    },
    actions: [],
  };

  // Add custom actions based on notification type
  if (payload.data?.type === 'order') {
    notificationOptions.actions = [
      { action: 'view', title: 'View Order', icon: '/icons/view-icon.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  } else if (payload.data?.type === 'shipment') {
    notificationOptions.actions = [
      { action: 'track', title: 'Track Shipment', icon: '/icons/track-icon.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();

  // Handle custom action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/';
  
  // Open or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no matching window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );

  // Play sound if specified
  if (event.notification.data?.sound) {
    // Sound will be handled by the app when it opens
    console.log('Notification has sound:', event.notification.data.sound);
  }
});

// Handle push events (backup for onBackgroundMessage)
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[firebase-messaging-sw.js] Push data:', payload);
      
      // Already handled by onBackgroundMessage
    } catch (error) {
      console.error('[firebase-messaging-sw.js] Error parsing push data:', error);
    }
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded and ready');
