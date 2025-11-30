import { Timestamp } from 'firebase/firestore';
import { CartItem } from './shared';
import { ProductType } from './product';
import { ShippingRate } from './checkout';

export interface OrderItem extends CartItem {
    originalPrice: number;
}

export interface OrderShipment {
    dispensaryId: string;
    items: OrderItem[];
    shippingMethod: ShippingRate;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    trackingNumber?: string;
    trackingUrl?: string;
    originLocker?: string;
    destinationLocker?: string;
    shippingProvider: 'shiplogic' | 'pudo' | 'in_house' | 'collection';
    lastStatusUpdate?: Timestamp;
    statusHistory: {
        status: string;
        timestamp: Timestamp;
        message?: string;
        location?: string;
    }[];
}

export interface Order {
    id: string;
    userId: string;
    orderNumber: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    status: 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
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