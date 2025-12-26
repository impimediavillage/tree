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
  | 'ready_for_pickup'
  | 'picked_up'
  | 'shipped' 
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered' 
  | 'cancelled'
  | 'failed'
  | 'returned';

export interface OrderItem extends CartItem {
    originalPrice: number;
    
    // NEW: Pricing breakdown for commission and tax tracking
    dispensarySetPrice: number; // Price dispensary entered (with their tax)
    basePrice: number; // Actual dispensary earning (tax removed)
    platformCommission: number; // Commission amount for this item
    commissionRate: number; // 0.25 or 0.05
    subtotalBeforeTax: number; // basePrice + commission (per unit)
    taxAmount: number; // Tax for this line item
    lineTotal: number; // Final price for line (subtotalBeforeTax * quantity + tax)
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
    
    // Pricing breakdown (NEW)
    subtotal: number; // Items total before tax
    tax: number; // Total tax amount
    taxRate: number; // Tax percentage applied
    shippingTotal: number;
    total: number; // Final amount customer paid
    currency?: string;
    
    // Revenue tracking (NEW - hidden from customer)
    totalDispensaryEarnings: number; // Sum of all basePrices
    totalPlatformCommission: number; // Sum of all commissions
    
    // Payment details
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
    
    // Influencer tracking (NEW)
    influencerReferral?: {
        influencerId: string;
        influencerName: string;
        referralCode: string;
        influencerEarnings: number; // Share of platform commission
        influencerCommissionRate: number; // % of platform commission
    };
    
    // Treehouse marketplace fields
    orderType?: 'dispensary' | 'treehouse' | 'healer-service';
    podStatus?: 'pending_print' | 'printing' | 'printed' | 'packaging' | 'shipped' | 'delivered';
    platformCommission?: number; // 75% for Treehouse orders (legacy, use totalPlatformCommission)
    creatorCommission?: number; // 25% for Treehouse orders
    creatorId?: string; // Creator user ID for Treehouse orders
}