/**
 * 🚗 Driver Management System - Type Definitions
 * Complete type system for Uber-style driver management with real-time tracking
 */

import { Timestamp } from 'firebase/firestore';
import type { Order } from './order';

// ============================================================================
// DRIVER PROFILE & CREW MEMBER TYPES
// ============================================================================

export type CrewMemberType = 'Vendor' | 'In-house Staff' | 'Driver';

export type VehicleType = 
  | 'Really fast dude'
  | 'bicycle'
  | 'e-bike'
  | 'motorcycle'
  | 'car'
  | 'bakkie'
  | 'truck'
  | 'drone'
  | 'throwing arm'
  | 'spaceship';

// Silly vehicle types that need validation
export const SILLY_VEHICLE_TYPES: VehicleType[] = [
  'Really fast dude',
  'drone',
  'throwing arm',
  'spaceship'
];

export type DriverStatus = 'available' | 'on_delivery' | 'offline' | 'suspended';

export interface DriverDocuments {
  driverLicense?: {
    url: string;
    uploadedAt: Timestamp;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: Timestamp;
    expiryDate?: string;
  };
  idDocument?: {
    url: string;
    uploadedAt: Timestamp;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: Timestamp;
  };
  vehiclePhoto?: {
    url: string;
    uploadedAt: Timestamp;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: Timestamp;
  };
}

export interface VehicleInfo {
  type: VehicleType;
  registrationNumber?: string;
  color?: string;
  description?: string;
  imageUrl?: string;
  verified: boolean;
}

export interface DriverStats {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageRating: number;
  totalRatings: number;
  totalEarnings: number;
  onTimeDeliveryRate: number; // Percentage
  acceptanceRate: number; // Percentage
  currentStreak: number; // Days with at least 1 delivery
  longestStreak: number;
}

export interface DriverAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Timestamp;
  category: 'delivery' | 'speed' | 'rating' | 'earnings' | 'streak';
}

export interface DriverProfile {
  // Core identification
  userId: string;
  dispensaryId: string;
  crewMemberType: CrewMemberType;
  
  // Contact information
  phoneNumber: string;
  dialCode: string; // e.g., "+27"
  displayName: string; // Driver's display name
  
  // Vehicle information
  vehicle: VehicleInfo;
  
  // Documents
  documents: DriverDocuments;
  
  // Status & availability
  status: DriverStatus;
  isActive: boolean;
  lastActiveAt: Timestamp;
  
  // Real-time location
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Timestamp;
    accuracy?: number; // Meters
    heading?: number; // Degrees (0-360)
    speed?: number; // km/h
  };
  
  // Current delivery
  currentDeliveryId?: string | null;
  activeDelivery?: DriverDelivery | null;
  
  // Statistics
  stats: DriverStats;
  
  // Achievements
  achievements: DriverAchievement[];
  
  // Payout history
  payoutHistory?: DriverPayoutRequest[];
  
  // Payout information
  availableEarnings: number;
  pendingPayouts: number;
  lastPayoutRequestDate?: Timestamp | null;
  
  // Profile dates
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

// ============================================================================
// DRIVER DELIVERY TYPES
// ============================================================================

export type DeliveryStatus = 
  | 'available' // Order ready, no driver claimed yet
  | 'claimed' // Driver claimed the order
  | 'picked_up' // Driver picked up from dispensary
  | 'en_route' // Driver is on the way to customer
  | 'nearby' // Driver is within 1km of customer
  | 'arrived' // Driver arrived at customer location
  | 'delivered' // Successfully delivered
  | 'cancelled' // Delivery cancelled
  | 'failed'; // Delivery failed

export interface DriverDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  dispensaryId: string;
  dispensaryName: string;
  
  // Driver assignment
  driverId?: string | null;
  driverName?: string | null;
  claimedAt?: Timestamp | null;
  
  // Customer information
  customerId: string;
  customerName: string;
  customerPhone: string;
  
  // Addresses
  pickupAddress: {
    streetAddress: string;
    suburb?: string;
    city: string;
    province: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
  
  deliveryAddress: {
    streetAddress: string;
    suburb?: string;
    city: string;
    province: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
  
  // Delivery details
  deliveryFee: number;
  distance: number; // in kilometers
  estimatedDuration: number; // in minutes
  
  // Status tracking
  status: DeliveryStatus;
  statusHistory: Array<{
    status: DeliveryStatus;
    timestamp: Timestamp;
    location?: {
      latitude: number;
      longitude: number;
    };
    note?: string;
  }>;
  
  // Timing
  createdAt: Timestamp;
  readyForPickupAt?: Timestamp;
  pickedUpAt?: Timestamp;
  enRouteAt?: Timestamp;
  nearbyNotificationSentAt?: Timestamp;
  arrivedAt?: Timestamp;
  deliveredAt?: Timestamp;
  cancelledAt?: Timestamp;
  
  // Ratings & feedback
  rating?: number; // 1-5 stars
  customerFeedback?: string;
  driverNotes?: string;
  
  // Earnings
  driverEarnings: number; // Amount driver gets paid
  platformCommission?: number; // Platform's cut
  
  // Special instructions
  specialInstructions?: string;
  accessCode?: string;
  
  // Metadata
  updatedAt: Timestamp;
}

// ============================================================================
// REAL-TIME LOCATION TRACKING
// ============================================================================

/**
 * Stored in Firebase Realtime Database for sub-second updates
 * Path: /driver_locations/{driverId}
 */
export interface DriverLocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: number; // Unix timestamp in milliseconds
  accuracy?: number; // Meters
  heading?: number; // Degrees (0-360)
  speed?: number; // km/h
  altitude?: number; // Meters
  deliveryId?: string | null; // Current delivery being tracked
}

/**
 * Customer tracking session
 * Path: /delivery_tracking/{deliveryId}
 */
export interface DeliveryTracking {
  deliveryId: string;
  orderId: string;
  driverId: string;
  customerId: string;
  status: DeliveryStatus;
  
  // Real-time driver location (updated every 5 seconds)
  driverLocation: {
    latitude: number;
    longitude: number;
    timestamp: number;
    heading?: number;
    speed?: number;
  };
  
  // Destination
  destinationLocation: {
    latitude: number;
    longitude: number;
  };
  
  // Calculated values
  distanceToCustomer: number; // in meters
  estimatedArrival: number; // Unix timestamp
  isNearby: boolean; // Within 1km
  
  // Last update
  lastUpdated: number; // Unix timestamp
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface DriverNotification {
  id: string;
  driverId: string;
  type: 'new_delivery' | 'delivery_update' | 'earnings_update' | 'achievement' | 'payout_approved' | 'payout_rejected';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Action data
  deliveryId?: string;
  orderId?: string;
  actionUrl?: string;
  
  // Notification metadata
  sound?: string;
  animation?: string;
  showConfetti?: boolean;
  
  // Status
  read: boolean;
  readAt?: Timestamp;
  
  // Timing
  createdAt: Timestamp;
  expiresAt?: Timestamp; // For time-sensitive notifications
}

// ============================================================================
// PAYOUT TYPES
// ============================================================================

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface DriverPayoutRequest {
  id: string;
  driverId: string;
  driverName: string;
  dispensaryId: string;
  
  // Payout details
  amount: number;
  currency: string;
  
  // Delivery breakdown
  deliveryIds: string[]; // IDs of deliveries included in this payout
  totalDeliveries: number;
  
  // Bank details
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  branchCode?: string;
  
  // Status
  status: PayoutStatus;
  requestedAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  paidAt?: Timestamp;
  paymentReference?: string;
  
  // Rejection
  rejectedAt?: Timestamp;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Metadata
  notes?: string;
  updatedAt: Timestamp;
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or emoji
  category: 'delivery' | 'speed' | 'rating' | 'earnings' | 'streak';
  
  // Requirements
  requirement: {
    type: 'delivery_count' | 'rating_average' | 'earnings_total' | 'streak_days' | 'on_time_rate';
    value: number;
  };
  
  // Rewards
  reward?: {
    credits?: number;
    bonus?: number;
    badge?: string;
  };
  
  // Display
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string; // Tailwind color class
}

// Predefined achievements
export const DRIVER_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_delivery',
    name: 'First Steps',
    description: 'Complete your first delivery',
    icon: '🚀',
    category: 'delivery',
    requirement: { type: 'delivery_count', value: 1 },
    rarity: 'common',
    color: 'bg-blue-500'
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete 10 deliveries in under 30 minutes each',
    icon: '⚡',
    category: 'speed',
    requirement: { type: 'delivery_count', value: 10 },
    reward: { bonus: 50 },
    rarity: 'rare',
    color: 'bg-yellow-500'
  },
  {
    id: 'perfect_record',
    name: 'Perfect Record',
    description: 'Maintain a 5.0 rating over 20 deliveries',
    icon: '⭐',
    category: 'rating',
    requirement: { type: 'rating_average', value: 5.0 },
    reward: { bonus: 100 },
    rarity: 'epic',
    color: 'bg-purple-500'
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Complete 100 deliveries',
    icon: '💯',
    category: 'delivery',
    requirement: { type: 'delivery_count', value: 100 },
    reward: { bonus: 500 },
    rarity: 'legendary',
    color: 'bg-red-500'
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Deliver every day for 7 days straight',
    icon: '🔥',
    category: 'streak',
    requirement: { type: 'streak_days', value: 7 },
    reward: { bonus: 200 },
    rarity: 'epic',
    color: 'bg-orange-500'
  },
  {
    id: 'money_maker',
    name: 'Money Maker',
    description: 'Earn R10,000 in total deliveries',
    icon: '💰',
    category: 'earnings',
    requirement: { type: 'earnings_total', value: 10000 },
    reward: { bonus: 1000 },
    rarity: 'legendary',
    color: 'bg-green-500'
  }
];

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface DriverDashboardStats {
  today: {
    deliveries: number;
    earnings: number;
    rating: number;
    averageRating: number;
    hoursOnline: number;
  };
  week: {
    deliveries: number;
    earnings: number;
    rating: number;
    averageRating: number;
    onTimeRate: number;
    hoursOnline: number;
  };
  month: {
    deliveries: number;
    earnings: number;
    rating: number;
    hoursOnline: number;
  };
  allTime: {
    deliveries: number;
    earnings: number;
    rating: number;
    totalHours: number;
  };
}

export interface AvailableDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: {
    street: string;
    city: string;
    location?: { latitude: number; longitude: number };
  };
  deliveryAddress: {
    street: string;
    city: string;
    location: { latitude: number; longitude: number };
  };
  distance: number;
  estimatedDuration?: number;
  deliveryFee: number;
  driverEarnings: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  createdAt: Timestamp;
  readyForPickupAt?: Timestamp;
  itemCount: number;
  specialInstructions?: string;
}
