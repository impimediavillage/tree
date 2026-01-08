export type NotificationType = 
  | 'order' 
  | 'shipment' 
  | 'payment' 
  | 'product' 
  | 'system'
  | 'achievement'
  | 'influencer'
  | 'treehouse';

export type NotificationSound = 
  | 'ka-ching'
  | 'coin-drop'
  | 'success-chime'
  | 'vroom'
  | 'package-ready'
  | 'level-up'
  | 'delivered'
  | 'nearby'
  | 'notification-pop';

export type NotificationAnimation = 
  | 'money-bag'
  | 'coin-scatter'
  | 'confetti'
  | 'truck-drive'
  | 'box-seal'
  | 'trophy-rise'
  | 'gift-open'
  | 'map-pulse'
  | 'checkmark-bounce';

export interface Notification {
  id: string;
  userId?: string; // Optional - may use recipient_id for dispensaries
  recipient_id?: string; // Alternative ID field for dispensaries/influencers
  recipient_role?: 'LeafUser' | 'DispensaryOwner' | 'Super Admin' | 'Influencer' | 'Creator'; // Role of recipient
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
  createdAt: any; // Firestore timestamp
  actionUrl?: string;
  metadata?: Record<string, any>;
  
  // Sound & Animation
  sound?: NotificationSound;
  animation?: NotificationAnimation;
  showConfetti?: boolean;
  
  // Order-related fields
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  dispensaryId?: string;
  
  // Payment fields
  amount?: number;
  currency?: string;
  
  // Achievement fields
  achievementType?: string;
  xpGained?: number;
  levelReached?: number;
  
  // Influencer fields
  influencerId?: string;
  commissionEarned?: number;
  
  // Treehouse fields
  creatorId?: string;
  productId?: string;
}

export interface NotificationPreferences {
  userId: string;
  
  // Channel toggles
  enableSounds: boolean;
  enablePushNotifications: boolean;
  enableInAppToasts: boolean;
  enableEmailNotifications: boolean;
  
  // Volume control
  soundVolume: number; // 0-100
  
  // Do Not Disturb
  doNotDisturb: boolean;
  doNotDisturbStart?: string; // HH:MM format
  doNotDisturbEnd?: string; // HH:MM format
  
  // Per-notification type toggles
  orderNotifications: boolean;
  paymentNotifications: boolean;
  shippingNotifications: boolean;
  achievementNotifications: boolean;
  productNotifications: boolean;
  systemNotifications: boolean;
  influencerNotifications: boolean;
  
  // History retention
  historyRetentionDays: number; // 7, 30, or 90
  
  updatedAt?: any; // Firestore timestamp
}
