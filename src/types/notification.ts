export type NotificationType = 'order' | 'shipment' | 'payment' | 'product' | 'system';

export interface Notification {
  id: string;
  userId?: string; // Optional - may use recipient_id for dispensaries
  recipient_id?: string; // Alternative ID field for dispensaries
  recipient_role?: string; // Role of recipient
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  read: boolean;
  createdAt: any; // Firestore timestamp
  actionUrl?: string;
  metadata?: Record<string, any>;
  // Order-related fields
  orderId?: string;
  customerId?: string;
  dispensaryId?: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  productUpdates: boolean;
}
