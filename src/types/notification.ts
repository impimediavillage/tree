export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'shipment' | 'payment' | 'product' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: any; // Firestore timestamp
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  productUpdates: boolean;
}
