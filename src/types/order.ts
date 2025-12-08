import { Timestamp } from 'firebase/firestore';
import { CartItem } from './shared';
import { ProductType } from './product';
import { ShippingRate } from './checkout';
import type { PudoLocker, ShippingStatus } from './shipping';

export type OrderStatus = 
  | 'pending' 
  | 'pending_payment' 
  | 'paid' 
  | 'processing' 
  | 'ready_for_shipping'
  | 'label_generated'
  | 'shipped' 
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered' 
  | 'cancelled'
  | 'failed'
  | 'returned';

export interface OrderItem extends CartItem {
    originalPrice: number;
}

export interface OrderShipment {
    dispensaryId: string;
    items: OrderItem[];
    shippingMethod: ShippingRate;
    status: ShippingStatus;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    labelUrl?: string;
    originLocker?: PudoLocker;
    destinationLocker?: PudoLocker;
    shippingProvider: 'shiplogic' | 'pudo' | 'in_house' | 'collection';
    lastStatusUpdate?: Timestamp;
    accessCode?: string;
    statusHistory: Array<{
        status: ShippingStatus;
        timestamp: Timestamp;
        message?: string;
        location?: string;
        updatedBy?: string;
    }>;
}

export interface Order {
    id: string;
    userId: string;
    orderNumber: string;
    items: OrderItem[];
    shippingCost: number;
    accessCode?: string;
    statusHistory: Array<{
        status: OrderStatus;
        timestamp: Timestamp;
        message?: string;
        updatedBy?: string;
        location?: string;
    }>;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: OrderStatus;
    total: number;
    subtotal: number;
    shippingTotal: number;
    currency?: string;
    paymentMethod: 'payfast';
    paymentId?: string;
    paymentStatus: 'pending' | 'completed' | 'failed';
    customerDetails: {
        name: string;
        email: string;
        phone: string;
    };
    shippingAddress: {
        streetAddress: string;
        suburb: string;
        city: string;
        province: string;
        postalCode: string;
        country: string;
        latitude?: number;
        longitude?: number;
    };
    shipments: {
        [dispensaryId: string]: OrderShipment;
    };
    // Treehouse marketplace fields
    orderType?: 'dispensary' | 'treehouse' | 'healer-service';
    podStatus?: 'pending_print' | 'printing' | 'printed' | 'packaging' | 'shipped' | 'delivered';
    platformCommission?: number; // 75% for Treehouse orders
    creatorCommission?: number; // 25% for Treehouse orders
    creatorId?: string; // Creator user ID for Treehouse orders
}