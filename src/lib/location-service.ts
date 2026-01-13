/**
 * 📍 Real-Time Location Tracking Service
 * Uses Firebase Realtime Database for sub-second location updates
 * Handles driver location tracking and customer delivery tracking
 */

import { realtimeDb } from '@/lib/firebase';
import {
  ref,
  set,
  update,
  onValue,
  off,
  get,
  remove,
  serverTimestamp,
  type DatabaseReference,
  type Unsubscribe
} from 'firebase/database';
import type {
  DriverLocationUpdate,
  DeliveryTracking
} from '@/types/driver';
import { calculateDistance, isDriverNearby } from '@/lib/driver-service';

// ============================================================================
// DRIVER LOCATION UPDATES (Driver-side)
// ============================================================================

/**
 * Update driver's current location in real-time
 * Call this every 5 seconds while driver is on delivery
 */
export async function updateDriverLocation(
  driverId: string,
  location: Omit<DriverLocationUpdate, 'timestamp'>,
  deliveryId?: string | null
): Promise<void> {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return;
    }

    const locationData: DriverLocationUpdate = {
      ...location,
      timestamp: Date.now(),
      deliveryId: deliveryId || null
    };

    const locationRef = ref(realtimeDb, `driver_locations/${driverId}`);
    await set(locationRef, locationData);
  } catch (error) {
    console.error('Error updating driver location:', error);
    throw error;
  }
}

/**
 * Start tracking driver location (using browser Geolocation API)
 * Returns a cleanup function to stop tracking
 */
export function startDriverLocationTracking(
  driverId: string,
  deliveryId: string,
  onLocationUpdate?: (location: DriverLocationUpdate) => void,
  onError?: (error: GeolocationPositionError) => void
): () => void {
  let watchId: number | null = null;
  
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by this browser');
    onError?.({
      code: 0,
      message: 'Geolocation not supported',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    } as GeolocationPositionError);
    return () => {};
  }

  // Watch position with high accuracy
  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const location: Omit<DriverLocationUpdate, 'timestamp'> = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading ?? undefined,
        speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
        altitude: position.coords.altitude ?? undefined,
        deliveryId
      };

      try {
        await updateDriverLocation(driverId, location, deliveryId);
        onLocationUpdate?.({ ...location, timestamp: Date.now() });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    },
    (error) => {
      console.error('Geolocation error:', error);
      onError?.(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );

  // Return cleanup function
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
}

/**
 * Stop tracking driver location (clear from database)
 */
export async function stopDriverLocationTracking(driverId: string): Promise<void> {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return;
    }
    const locationRef = ref(realtimeDb, `driver_locations/${driverId}`);
    await remove(locationRef);
  } catch (error) {
    console.error('Error stopping location tracking:', error);
    throw error;
  }
}

// ============================================================================
// DELIVERY TRACKING (Customer-side)
// ============================================================================

/**
 * Initialize delivery tracking session
 */
export async function initializeDeliveryTracking(
  deliveryId: string,
  orderId: string,
  driverId: string,
  customerId: string,
  destinationLocation: { latitude: number; longitude: number }
): Promise<void> {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return;
    }
    const trackingData: DeliveryTracking = {
      deliveryId,
      orderId,
      driverId,
      customerId,
      status: 'claimed',
      driverLocation: {
        latitude: 0,
        longitude: 0,
        timestamp: Date.now()
      },
      destinationLocation,
      distanceToCustomer: 0,
      estimatedArrival: Date.now() + 1800000, // 30 minutes default
      isNearby: false,
      lastUpdated: Date.now()
    };

    const trackingRef = ref(realtimeDb, `delivery_tracking/${deliveryId}`);
    await set(trackingRef, trackingData);
  } catch (error) {
    console.error('Error initializing delivery tracking:', error);
    throw error;
  }
}

/**
 * Update delivery tracking with new driver location
 * This is called automatically when driver location changes
 */
export async function updateDeliveryTracking(
  deliveryId: string,
  driverLocation: { latitude: number; longitude: number; heading?: number; speed?: number }
): Promise<void> {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return;
    }
    // Get current tracking data
    const trackingRef = ref(realtimeDb, `delivery_tracking/${deliveryId}`);
    const snapshot = await get(trackingRef);
    
    if (!snapshot.exists()) {
      console.warn('Delivery tracking not found');
      return;
    }

    const trackingData = snapshot.val() as DeliveryTracking;
    
    // Calculate distance to customer
    const distanceMeters = calculateDistance(
      driverLocation.latitude,
      driverLocation.longitude,
      trackingData.destinationLocation.latitude,
      trackingData.destinationLocation.longitude
    ) * 1000; // Convert km to meters
    
    // Check if driver is nearby (within 1km)
    const nearby = isDriverNearby(
      driverLocation.latitude,
      driverLocation.longitude,
      trackingData.destinationLocation.latitude,
      trackingData.destinationLocation.longitude
    );
    
    // Estimate arrival time (assuming average speed of 40 km/h in city)
    const avgSpeedKmh = 40;
    const distanceKm = distanceMeters / 1000;
    const estimatedMinutes = (distanceKm / avgSpeedKmh) * 60;
    const estimatedArrival = Date.now() + (estimatedMinutes * 60 * 1000);

    // Update tracking data
    await update(trackingRef, {
      driverLocation: {
        ...driverLocation,
        timestamp: Date.now()
      },
      distanceToCustomer: distanceMeters,
      estimatedArrival,
      isNearby: nearby,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error updating delivery tracking:', error);
    throw error;
  }
}

/**
 * Subscribe to delivery tracking updates (for customer live map)
 * Returns unsubscribe function
 */
export function subscribeToDeliveryTracking(
  deliveryId: string,
  onUpdate: (tracking: DeliveryTracking) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return () => {};
    }
    const trackingRef = ref(realtimeDb, `delivery_tracking/${deliveryId}`);
    
    const unsubscribe = onValue(
      trackingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const trackingData = snapshot.val() as DeliveryTracking;
          onUpdate(trackingData);
        }
      },
      (error) => {
        console.error('Error subscribing to delivery tracking:', error);
        onError?.(error as Error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up delivery tracking subscription:', error);
    onError?.(error as Error);
    return () => {};
  }
}

/**
 * Subscribe to driver location updates
 * Used by admin/dispensary to monitor active drivers
 */
export function subscribeToDriverLocation(
  driverId: string,
  onUpdate: (location: DriverLocationUpdate) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return () => {};
    }
    const locationRef = ref(realtimeDb, `driver_locations/${driverId}`);
    
    const unsubscribe = onValue(
      locationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const locationData = snapshot.val() as DriverLocationUpdate;
          onUpdate(locationData);
        }
      },
      (error) => {
        console.error('Error subscribing to driver location:', error);
        onError?.(error as Error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up driver location subscription:', error);
    onError?.(error as Error);
    return () => {};
  }
}

/**
 * Clean up delivery tracking when delivery is complete
 */
export async function cleanupDeliveryTracking(deliveryId: string): Promise<void> {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return;
    }
    const trackingRef = ref(realtimeDb, `delivery_tracking/${deliveryId}`);
    await remove(trackingRef);
  } catch (error) {
    console.error('Error cleaning up delivery tracking:', error);
    throw error;
  }
}

/**
 * Get current driver location (one-time read)
 */
export async function getDriverLocation(driverId: string): Promise<DriverLocationUpdate | null> {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return null;
    }
    const locationRef = ref(realtimeDb, `driver_locations/${driverId}`);
    const snapshot = await get(locationRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return snapshot.val() as DriverLocationUpdate;
  } catch (error) {
    console.error('Error getting driver location:', error);
    throw error;
  }
}

/**
 * Get all active driver locations for a map view (admin dashboard)
 */
export async function getAllActiveDriverLocations(): Promise<Record<string, DriverLocationUpdate>> {
  try {
    if (!realtimeDb) {
      console.warn('Realtime Database not available');
      return {};
    }
    const locationsRef = ref(realtimeDb, 'driver_locations');
    const snapshot = await get(locationsRef);
    
    if (!snapshot.exists()) {
      return {};
    }
    
    return snapshot.val() as Record<string, DriverLocationUpdate>;
  } catch (error) {
    console.error('Error getting all driver locations:', error);
    throw error;
  }
}

// ============================================================================
// PROXIMITY DETECTION & ALERTS
// ============================================================================

/**
 * Monitor driver proximity and trigger "nearby" status when within 1km
 * Returns cleanup function
 */
export function monitorDriverProximity(
  deliveryId: string,
  onNearby: () => void,
  onArrived: () => void
): Unsubscribe {
  const NEARBY_THRESHOLD = 1000; // meters
  const ARRIVED_THRESHOLD = 100; // meters
  
  let hasTriggeredNearby = false;
  let hasTriggeredArrived = false;

  return subscribeToDeliveryTracking(
    deliveryId,
    (tracking) => {
      const distance = tracking.distanceToCustomer;
      
      // Trigger "nearby" notification
      if (!hasTriggeredNearby && distance <= NEARBY_THRESHOLD) {
        hasTriggeredNearby = true;
        onNearby();
      }
      
      // Trigger "arrived" notification
      if (!hasTriggeredArrived && distance <= ARRIVED_THRESHOLD) {
        hasTriggeredArrived = true;
        onArrived();
      }
    },
    (error) => {
      console.error('Error monitoring proximity:', error);
    }
  );
}

export default {
  // Driver location
  updateDriverLocation,
  startDriverLocationTracking,
  stopDriverLocationTracking,
  getDriverLocation,
  getAllActiveDriverLocations,
  
  // Delivery tracking
  initializeDeliveryTracking,
  updateDeliveryTracking,
  subscribeToDeliveryTracking,
  cleanupDeliveryTracking,
  
  // Monitoring
  subscribeToDriverLocation,
  monitorDriverProximity
};
