/**
 * 🚗 Driver Service Layer
 * Handles all driver-related operations including profile management,
 * delivery assignments, location tracking, and earnings
 */

import { db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type {
  DriverProfile,
  DriverDelivery,
  DriverLocationUpdate,
  DeliveryTracking,
  DriverNotification,
  DriverPayoutRequest,
  DriverDashboardStats,
  AvailableDelivery,
  DriverStatus,
  DeliveryStatus,
  DriverAchievement,
  AchievementDefinition,
  DRIVER_ACHIEVEMENTS
} from '@/types/driver';

// ============================================================================
// DRIVER PROFILE MANAGEMENT
// ============================================================================

/**
 * Get driver profile by user ID
 */
export async function getDriverProfile(userId: string): Promise<DriverProfile | null> {
  try {
    const docRef = doc(db, 'driver_profiles', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return { id: docSnap.id, ...docSnap.data() } as unknown as DriverProfile;
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    throw error;
  }
}

/**
 * Get all drivers for a dispensary
 */
export async function getDispensaryDrivers(dispensaryId: string): Promise<DriverProfile[]> {
  try {
    const q = query(
      collection(db, 'driver_profiles'),
      where('dispensaryId', '==', dispensaryId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as unknown as DriverProfile[];
  } catch (error) {
    console.error('Error fetching dispensary drivers:', error);
    throw error;
  }
}

/**
 * Update driver status (available/on_delivery/offline)
 */
export async function updateDriverStatus(
  driverId: string,
  status: DriverStatus
): Promise<void> {
  try {
    const docRef = doc(db, 'driver_profiles', driverId);
    await updateDoc(docRef, {
      status,
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating driver status:', error);
    throw error;
  }
}

/**
 * Verify driver documents (admin function)
 */
export async function verifyDriverDocuments(
  driverId: string,
  documentType: 'driverLicense' | 'idDocument' | 'vehiclePhoto',
  verifiedBy: string
): Promise<void> {
  try {
    const docRef = doc(db, 'driver_profiles', driverId);
    await updateDoc(docRef, {
      [`documents.${documentType}.verified`]: true,
      [`documents.${documentType}.verifiedBy`]: verifiedBy,
      [`documents.${documentType}.verifiedAt`]: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error verifying driver documents:', error);
    throw error;
  }
}

// ============================================================================
// DELIVERY MANAGEMENT
// ============================================================================

/**
 * Create a new delivery when order is ready for driver pickup
 */
export async function createDelivery(
  orderId: string,
  orderData: any,
  dispensaryData: any
): Promise<string> {
  try {
    // Get driver details if assigned to determine ownership type
    let ownershipType: 'private' | 'public' | 'shared' = 'private';
    let driverData: any = null;
    
    if (orderData.assignedDriverId) {
      const driverRef = doc(db, 'driver_profiles', orderData.assignedDriverId);
      const driverSnap = await getDoc(driverRef);
      if (driverSnap.exists()) {
        driverData = driverSnap.data();
        ownershipType = driverData.ownershipType || 'private';
      }
    }

    const delivery: Partial<DriverDelivery> = {
      orderId,
      orderNumber: orderData.orderNumber,
      dispensaryId: orderData.dispensaryId || dispensaryData.id,
      dispensaryName: dispensaryData.dispensaryName,
      customerId: orderData.userId,
      customerName: orderData.customerDetails?.name || 'Customer',
      customerPhone: orderData.customerDetails?.phone || '',
      driverId: orderData.assignedDriverId || null,
      driverName: orderData.assignedDriverName || '',
      ownershipType, // Track driver type
      pickupAddress: {
        streetAddress: dispensaryData.streetAddress,
        suburb: dispensaryData.suburb,
        city: dispensaryData.city,
        province: dispensaryData.province,
        postalCode: dispensaryData.postalCode,
        latitude: dispensaryData.latitude,
        longitude: dispensaryData.longitude,
      },
      deliveryAddress: {
        streetAddress: orderData.shippingAddress.streetAddress,
        suburb: orderData.shippingAddress.suburb,
        city: orderData.shippingAddress.city,
        province: orderData.shippingAddress.province,
        postalCode: orderData.shippingAddress.postalCode,
        latitude: orderData.shippingAddress.latitude,
        longitude: orderData.shippingAddress.longitude,
      },
      deliveryFee: orderData.shippingCost || 50,
      distance: orderData.deliveryDistance || 0,
      estimatedDuration: orderData.estimatedDuration || 30,
      status: 'available',
      statusHistory: [{
        status: 'available',
        timestamp: serverTimestamp() as Timestamp,
        note: 'Delivery created and ready for driver'
      }],
      createdAt: serverTimestamp() as Timestamp,
      readyForPickupAt: serverTimestamp() as Timestamp,
      driverEarnings: orderData.shippingCost || 50,
      specialInstructions: orderData.deliveryInstructions || '',
      accessCode: orderData.accessCode || '',
      ...(ownershipType === 'public' && { platformPayoutStatus: 'pending' as const }),
      updatedAt: serverTimestamp() as Timestamp,
    };

    const docRef = await addDoc(collection(db, 'deliveries'), delivery);
    const deliveryId = docRef.id;

    // Create platform payout record for public drivers
    if (ownershipType === 'public' && driverData) {
      await createPlatformDriverPayout({
        driverId: orderData.assignedDriverId,
        driverName: driverData.displayName || `${driverData.firstName} ${driverData.lastName}`,
        driverEmail: driverData.email,
        driverBanking: driverData.banking || {},
        deliveryId,
        orderId,
        orderNumber: orderData.orderNumber,
        dispensaryId: orderData.dispensaryId || dispensaryData.id,
        dispensaryName: dispensaryData.dispensaryName,
        deliveryFee: orderData.shippingCost || 50,
        currency: dispensaryData.currency || 'ZAR',
      });
    }

    return deliveryId;
  } catch (error) {
    console.error('Error creating delivery:', error);
    throw error;
  }
}

/**
 * Create platform payout record for public driver
 */
async function createPlatformDriverPayout(data: {
  driverId: string;
  driverName: string;
  driverEmail: string;
  driverBanking: any;
  deliveryId: string;
  orderId: string;
  orderNumber?: string;
  dispensaryId: string;
  dispensaryName: string;
  deliveryFee: number;
  currency: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, 'platform_driver_payouts'), {
      driverId: data.driverId,
      driverName: data.driverName,
      driverEmail: data.driverEmail,
      deliveryId: data.deliveryId,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      dispensaryId: data.dispensaryId,
      dispensaryName: data.dispensaryName,
      
      deliveryFee: data.deliveryFee,
      driverEarnings: data.deliveryFee,
      currency: data.currency,
      
      banking: {
        bankName: data.driverBanking.bankName || '',
        accountHolderName: data.driverBanking.accountHolderName || '',
        accountNumber: data.driverBanking.accountNumber || '',
        branchCode: data.driverBanking.branchCode || '',
      },
      
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Platform driver payout created for delivery:', data.deliveryId);
  } catch (error) {
    console.error('❌ Error creating platform payout:', error);
  }
}

/**
 * Get available deliveries for a dispensary
 */
export async function getAvailableDeliveries(
  dispensaryId: string
): Promise<AvailableDelivery[]> {
  try {
    const q = query(
      collection(db, 'deliveries'),
      where('dispensaryId', '==', dispensaryId),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        dispensaryId: data.dispensaryId,
        dispensaryName: data.dispensaryName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        pickupAddress: {
          street: data.pickupAddress.streetAddress,
          city: data.pickupAddress.city,
          location: {
            latitude: data.pickupAddress.latitude,
            longitude: data.pickupAddress.longitude
          }
        },
        deliveryAddress: {
          street: data.deliveryAddress.streetAddress,
          city: data.deliveryAddress.city,
          location: {
            latitude: data.deliveryAddress.latitude,
            longitude: data.deliveryAddress.longitude
          }
        },
        distance: data.distance,
        estimatedDuration: data.estimatedDuration,
        deliveryFee: data.deliveryFee,
        driverEarnings: data.driverEarnings,
        items: data.items || [],
        createdAt: data.createdAt,
        readyForPickupAt: data.readyForPickupAt,
        itemCount: data.items?.length || 1,
        specialInstructions: data.specialInstructions
      } as AvailableDelivery;
    });
  } catch (error) {
    console.error('Error fetching available deliveries:', error);
    throw error;
  }
}

/**
 * Claim a delivery (first-come, first-served with transaction)
 */
export async function claimDelivery(
  deliveryId: string,
  driverId: string,
  driverName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const driverRef = doc(db, 'driver_profiles', driverId);
    
    // Check if delivery is still available
    const deliverySnap = await getDoc(deliveryRef);
    if (!deliverySnap.exists()) {
      return { success: false, message: 'Delivery not found' };
    }
    
    const deliveryData = deliverySnap.data() as DriverDelivery;
    if (deliveryData.status !== 'available') {
      return { success: false, message: 'Delivery already claimed by another driver' };
    }
    
    // Update delivery
    batch.update(deliveryRef, {
      driverId,
      driverName,
      claimedAt: serverTimestamp(),
      status: 'claimed',
      [`statusHistory`]: arrayUnion({
        status: 'claimed',
        timestamp: serverTimestamp(),
        note: `Claimed by ${driverName}`
      }),
      updatedAt: serverTimestamp()
    });
    
    // Update driver
    batch.update(driverRef, {
      currentDeliveryId: deliveryId,
      status: 'on_delivery',
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    return { success: true, message: 'Delivery claimed successfully!' };
  } catch (error) {
    console.error('Error claiming delivery:', error);
    return { success: false, message: 'Failed to claim delivery. Please try again.' };
  }
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  newStatus: DeliveryStatus,
  location?: { latitude: number; longitude: number },
  note?: string
): Promise<void> {
  try {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    
    const statusUpdate: any = {
      status: newStatus,
      [`statusHistory`]: arrayUnion({
        status: newStatus,
        timestamp: serverTimestamp(),
        location,
        note
      }),
      updatedAt: serverTimestamp()
    };
    
    // Set specific timestamp fields based on status
    if (newStatus === 'picked_up') {
      statusUpdate.pickedUpAt = serverTimestamp();
    } else if (newStatus === 'en_route') {
      statusUpdate.enRouteAt = serverTimestamp();
    } else if (newStatus === 'nearby') {
      statusUpdate.nearbyNotificationSentAt = serverTimestamp();
    } else if (newStatus === 'arrived') {
      statusUpdate.arrivedAt = serverTimestamp();
    } else if (newStatus === 'delivered') {
      statusUpdate.deliveredAt = serverTimestamp();
    } else if (newStatus === 'cancelled') {
      statusUpdate.cancelledAt = serverTimestamp();
    } else if (newStatus === 'failed') {
      statusUpdate.failedAt = serverTimestamp();
    }
    
    await updateDoc(deliveryRef, statusUpdate);
  } catch (error) {
    console.error('Error updating delivery status:', error);
    throw error;
  }
}

/**
 * Mark delivery as failed with reason
 * IMPORTANT: Determines if driver gets paid based on failure reason
 */
export async function markDeliveryAsFailed(
  deliveryId: string,
  driverId: string,
  failureReason: string, // DeliveryFailureReason type
  failureNote: string,
  photoUrls?: string[]
): Promise<{ success: boolean; message: string; driverGetsPaid: boolean }> {
  try {
    // Import the payment logic function
    const { shouldPayDriverOnFailure } = await import('@/types/driver');
    
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliverySnap = await getDoc(deliveryRef);
    
    if (!deliverySnap.exists()) {
      return { success: false, message: 'Delivery not found', driverGetsPaid: false };
    }
    
    const deliveryData = deliverySnap.data();
    const driverGetsPaid = shouldPayDriverOnFailure(failureReason as any);
    
    // Update delivery document
    await updateDoc(deliveryRef, {
      status: 'failed',
      failedAt: serverTimestamp(),
      failureReason,
      failureNote,
      failurePhotos: photoUrls || [],
      driverPaidDespiteFailure: driverGetsPaid,
      [`statusHistory`]: arrayUnion({
        status: 'failed',
        timestamp: serverTimestamp(),
        note: `Failed: ${failureReason} - ${failureNote}`
      }),
      updatedAt: serverTimestamp()
    });
    
    // Update driver stats and earnings
    const driverRef = doc(db, 'driver_profiles', driverId);
    const driverSnap = await getDoc(driverRef);
    
    if (driverSnap.exists()) {
      const driverData = driverSnap.data();
      
      const updates: any = {
        'stats.failedDeliveries': (driverData.stats?.failedDeliveries || 0) + 1,
        status: 'available', // Make driver available again
        currentDeliveryId: null,
        lastActiveAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // If driver gets paid despite failure, add to earnings
      if (driverGetsPaid) {
        const earnings = deliveryData.driverEarnings || 0;
        updates.availableEarnings = (driverData.availableEarnings || 0) + earnings;
        updates['stats.totalEarnings'] = (driverData.stats?.totalEarnings || 0) + earnings;
      }
      
      await updateDoc(driverRef, updates);
    }
    
    const message = driverGetsPaid 
      ? 'Delivery marked as failed. You will still be paid as this was not your fault.'
      : 'Delivery marked as failed. Payment will not be processed.';
    
    return { 
      success: true, 
      message,
      driverGetsPaid 
    };
  } catch (error) {
    console.error('Error marking delivery as failed:', error);
    return { 
      success: false, 
      message: 'Failed to update delivery status',
      driverGetsPaid: false 
    };
  }
}

/**
 * Complete delivery and update driver stats
 */
export async function completeDelivery(
  deliveryId: string,
  driverId: string,
  rating?: number,
  customerFeedback?: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const driverRef = doc(db, 'driver_profiles', driverId);
    
    // Get delivery data for earnings
    const deliverySnap = await getDoc(deliveryRef);
    const deliveryData = deliverySnap.data() as DriverDelivery;
    
    // Update delivery
    batch.update(deliveryRef, {
      status: 'delivered',
      deliveredAt: serverTimestamp(),
      rating,
      customerFeedback,
      [`statusHistory`]: arrayUnion({
        status: 'delivered',
        timestamp: serverTimestamp(),
        note: 'Delivery completed'
      }),
      updatedAt: serverTimestamp()
    });
    
    // Update driver profile stats
    const driverSnap = await getDoc(driverRef);
    const driverData = driverSnap.data() as DriverProfile;
    
    const newTotalDeliveries = (driverData.stats.totalDeliveries || 0) + 1;
    const newCompletedDeliveries = (driverData.stats.completedDeliveries || 0) + 1;
    const currentTotalRatings = (driverData.stats.totalRatings || 0);
    const currentAverageRating = driverData.stats.averageRating || 0;
    
    // Calculate new average rating
    let newAverageRating = currentAverageRating;
    let newTotalRatings = currentTotalRatings;
    if (rating) {
      newTotalRatings = currentTotalRatings + 1;
      newAverageRating = ((currentAverageRating * currentTotalRatings) + rating) / newTotalRatings;
    }
    
    batch.update(driverRef, {
      currentDeliveryId: null,
      status: 'available',
      'stats.totalDeliveries': newTotalDeliveries,
      'stats.completedDeliveries': newCompletedDeliveries,
      'stats.totalEarnings': increment(deliveryData.driverEarnings),
      'stats.averageRating': newAverageRating,
      'stats.totalRatings': newTotalRatings,
      availableEarnings: increment(deliveryData.driverEarnings),
      lastActiveAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    // Check for achievements
    await checkAndAwardAchievements(driverId, driverData);
  } catch (error) {
    console.error('Error completing delivery:', error);
    throw error;
  }
}

// ============================================================================
// REAL-TIME LOCATION TRACKING
// ============================================================================

/**
 * Note: For real-time location, we'll use Firebase Realtime Database (not Firestore)
 * This file provides the interface, actual implementation will be in location-service.ts
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // Returns distance in kilometers
}

/**
 * Check if driver is nearby customer (within 1km)
 */
export function isDriverNearby(
  driverLat: number,
  driverLon: number,
  customerLat: number,
  customerLon: number
): boolean {
  const distance = calculateDistance(driverLat, driverLon, customerLat, customerLon);
  return distance <= 1.0; // Within 1km
}

// ============================================================================
// DRIVER NOTIFICATIONS
// ============================================================================

/**
 * Send notification to driver
 */
export async function sendDriverNotification(
  driverId: string,
  notification: Omit<DriverNotification, 'id' | 'driverId' | 'createdAt' | 'read'>
): Promise<void> {
  try {
    const notificationData = {
      driverId,
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'driver_notifications'), notificationData);
  } catch (error) {
    console.error('Error sending driver notification:', error);
    throw error;
  }
}

/**
 * Notify all available drivers about new delivery
 */
export async function notifyAvailableDrivers(
  dispensaryId: string,
  deliveryId: string,
  orderNumber: string
): Promise<void> {
  try {
    // Get all available drivers for this dispensary
    const q = query(
      collection(db, 'driver_profiles'),
      where('dispensaryId', '==', dispensaryId),
      where('status', 'in', ['available', 'offline']),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Send notification to each driver
    const notifications = querySnapshot.docs.map(doc => {
      return sendDriverNotification(doc.id, {
        type: 'new_delivery',
        title: 'New Delivery Available! 🚗',
        message: `Order #${orderNumber} is ready for pickup`,
        priority: 'urgent',
        deliveryId,
        actionUrl: `/driver/dashboard`,
        sound: 'notification-pop',
        animation: 'pulse',
        expiresAt: Timestamp.fromMillis(Date.now() + 3600000) // Expires in 1 hour
      });
    });
    
    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying available drivers:', error);
    throw error;
  }
}

// ============================================================================
// ACHIEVEMENTS & GAMIFICATION
// ============================================================================

/**
 * Check and award achievements based on driver stats
 */
export async function checkAndAwardAchievements(
  driverId: string,
  driverData: DriverProfile
): Promise<void> {
  try {
    const { DRIVER_ACHIEVEMENTS } = await import('@/types/driver');
    const stats = driverData.stats;
    const currentAchievements = driverData.achievements || [];
    const earnedIds = currentAchievements.map(a => a.id);
    
    for (const achievement of DRIVER_ACHIEVEMENTS) {
      // Skip if already earned
      if (earnedIds.includes(achievement.id)) continue;
      
      // Check if requirements are met
      let requirementMet = false;
      
      switch (achievement.requirement.type) {
        case 'delivery_count':
          requirementMet = stats.totalDeliveries >= achievement.requirement.value;
          break;
        case 'rating_average':
          requirementMet = stats.averageRating >= achievement.requirement.value && stats.totalRatings >= 20;
          break;
        case 'earnings_total':
          requirementMet = stats.totalEarnings >= achievement.requirement.value;
          break;
        case 'on_time_rate':
          requirementMet = stats.onTimeDeliveryRate >= achievement.requirement.value;
          break;
        // Add more cases as needed
      }
      
      if (requirementMet) {
        // Award achievement
        const newAchievement: DriverAchievement = {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          earnedAt: Timestamp.now(),
          category: achievement.category
        };
        
        const driverRef = doc(db, 'driver_profiles', driverId);
        await updateDoc(driverRef, {
          achievements: arrayUnion(newAchievement),
          updatedAt: serverTimestamp()
        });
        
        // Send achievement notification
        await sendDriverNotification(driverId, {
          type: 'achievement',
          title: `Achievement Unlocked: ${achievement.name}! 🏆`,
          message: achievement.description,
          priority: 'medium',
          sound: 'level-up',
          animation: 'trophy-rise',
          showConfetti: true,
          actionUrl: '/driver/achievements'
        });
        
        // Award bonus if applicable
        if (achievement.reward?.bonus) {
          await updateDoc(driverRef, {
            availableEarnings: increment(achievement.reward.bonus)
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }
}

// ============================================================================
// PAYOUT MANAGEMENT
// ============================================================================

/**
 * Create payout request (Wednesday-only validation)
 */
export async function createPayoutRequest(
  driverId: string,
  driverName: string,
  dispensaryId: string,
  amount: number,
  deliveryIds: string[],
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if today is Wednesday (day 3)
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek !== 3) {
      return {
        success: false,
        message: 'Payout requests can only be made on Wednesdays'
      };
    }
    
    // Check if driver has enough earnings
    const driverRef = doc(db, 'driver_profiles', driverId);
    const driverSnap = await getDoc(driverRef);
    const driverData = driverSnap.data() as DriverProfile;
    
    if (driverData.availableEarnings < amount) {
      return {
        success: false,
        message: 'Insufficient available earnings'
      };
    }
    
    // Create payout request
    const payoutData: Partial<DriverPayoutRequest> = {
      driverId,
      driverName,
      dispensaryId,
      amount,
      currency: 'ZAR',
      deliveryIds,
      totalDeliveries: deliveryIds.length,
      ...bankDetails,
      status: 'pending',
      requestedAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };
    
    await addDoc(collection(db, 'driver_payout_requests'), payoutData);
    
    // Update driver profile
    await updateDoc(driverRef, {
      availableEarnings: increment(-amount),
      pendingPayouts: increment(amount),
      lastPayoutRequestDate: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Payout request submitted successfully!'
    };
  } catch (error) {
    console.error('Error creating payout request:', error);
    return {
      success: false,
      message: 'Failed to create payout request'
    };
  }
}

/**
 * Approve payout request (admin function)
 */
export async function approvePayoutRequest(
  payoutId: string,
  approvedBy: string,
  paymentReference: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const payoutRef = doc(db, 'driver_payout_requests', payoutId);
    
    // Update payout status
    batch.update(payoutRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy,
      paymentReference,
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    // Get payout data to send notification
    const payoutSnap = await getDoc(payoutRef);
    const payoutData = payoutSnap.data() as DriverPayoutRequest;
    
    // Send notification to driver
    await sendDriverNotification(payoutData.driverId, {
      type: 'payout_approved',
      title: 'Payout Approved! 💰',
      message: `Your payout of R${payoutData.amount} has been approved`,
      priority: 'high',
      sound: 'coin-drop',
      actionUrl: '/driver/payouts'
    });
  } catch (error) {
    console.error('Error approving payout:', error);
    throw error;
  }
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * Get driver dashboard statistics
 */
export async function getDriverDashboardStats(driverId: string): Promise<DriverDashboardStats> {
  try {
    const driverRef = doc(db, 'driver_profiles', driverId);
    const driverSnap = await getDoc(driverRef);
    const driverData = driverSnap.data() as DriverProfile;
    
    // For now, return basic stats from profile
    // In production, you'd calculate these from delivery history
    return {
      today: {
        deliveries: 0, // Calculate from deliveries collection
        earnings: 0,
        rating: driverData.stats.averageRating,
        averageRating: driverData.stats.averageRating,
        hoursOnline: 0
      },
      week: {
        deliveries: 0,
        earnings: 0,
        rating: driverData.stats.averageRating,
        averageRating: driverData.stats.averageRating,
        onTimeRate: driverData.stats.onTimeDeliveryRate,
        hoursOnline: 0
      },
      month: {
        deliveries: 0,
        earnings: 0,
        rating: driverData.stats.averageRating,
        hoursOnline: 0
      },
      allTime: {
        deliveries: driverData.stats.totalDeliveries,
        earnings: driverData.stats.totalEarnings,
        rating: driverData.stats.averageRating,
        totalHours: 0
      }
    };
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    throw error;
  }
}

export default {
  // Profile
  getDriverProfile,
  getDispensaryDrivers,
  updateDriverStatus,
  verifyDriverDocuments,
  
  // Deliveries
  createDelivery,
  getAvailableDeliveries,
  claimDelivery,
  updateDeliveryStatus,
  completeDelivery,
  
  // Location
  calculateDistance,
  isDriverNearby,
  
  // Notifications
  sendDriverNotification,
  notifyAvailableDrivers,
  
  // Achievements
  checkAndAwardAchievements,
  
  // Payouts
  createPayoutRequest,
  approvePayoutRequest,
  
  // Stats
  getDriverDashboardStats
};
