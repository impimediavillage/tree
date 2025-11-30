import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, DocumentReference, Timestamp } from 'firebase/firestore';
import type { CartItem } from '@/types/shared';
import type { ShippingRate, PudoLocker, ShippingStatus } from '@/types/shipping';
import type { AddressValues } from '@/types/checkout';
import type { Order } from '@/types/order'; // Changed from @/types/orders
import type { OrderItem } from '@/types/order'; // Changed from @/types/orders/items
import type { OrderStatus } from '@/types/order'; // Changed from @/types/orders/status
import type { BaseAddress } from '@/types/base/shipping';

/**
 * Main orders collection in Firestore.
 * 
 * Order data is stored in multiple locations for different access patterns:
 * 1. /orders - Main collection containing all orders (source of truth)
 * 2. /dispensaries/{dispensaryId}/orders - Denormalized references for dispensary-specific access
 * 3. /productPoolOrders - Separate collection for product pool related orders
 */
const ORDERS_COLLECTION = 'orders';

let orderCounter = 0;

// Helper function to remove undefined values from an object
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Timestamp)) {
        cleaned[key] = removeUndefined(obj[key]);
      } else if (Array.isArray(obj[key])) {
        // Handle arrays
        cleaned[key] = obj[key].map((item: any) => {
          if (item && typeof item === 'object' && !(item instanceof Timestamp)) {
            return removeUndefined(item);
          }
          return item;
        });
      } else {
        cleaned[key] = obj[key];
      }
    }
  });
  return cleaned as Partial<T>;
}

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  orderCounter += 1;
  return `ORD-${year}-${orderCounter.toString().padStart(4, '0')}`;
}

function validateOrderInput(data: CreateOrderParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.userId) errors.push('userId is required');
  if (!data.dispensaryId) errors.push('dispensaryId is required');
  if (!data.items || data.items.length === 0) errors.push('items array cannot be empty');
  if (!data.shipping) errors.push('shipping info is required');
  if (!data.shipping?.method) errors.push('shipping method is required');
  if (!data.shipping?.rate) errors.push('shipping rate is required');

  // Validate items
  data.items?.forEach((item, index) => {
    if (item.price === undefined) errors.push(`Item ${index} is missing price`);
    if (item.quantity === undefined) errors.push(`Item ${index} is missing quantity`);
    if (!item.id) errors.push(`Item ${index} is missing id`);
    if (!item.name) errors.push(`Item ${index} is missing name`);
  });

  // Validate shipping data based on method
  if (data.shipping?.method) {
    switch (data.shipping.method) {
      case 'dtd':
      case 'ltd':
        if (!data.shipping.address) {
          errors.push('shipping address is required for dtd/ltd delivery');
        } else if (!isAddressComplete(data.shipping.address)) {
          errors.push('incomplete shipping address');
        }
        break;
      case 'dtl':
      case 'ltl':
        if (!data.shipping.destinationLocker?.id) {
          errors.push('destination locker is required for dtl/ltl delivery');
        }
        break;
    }
  }

  // Validate shipping rate
  if (data.shipping?.rate) {
    const rate = data.shipping.rate;
    if (!rate.id) errors.push('shipping rate id is required');
    if (!rate.name) errors.push('shipping rate name is required');
    if (rate.rate === undefined) errors.push('shipping rate amount is required');
    if (!rate.courier_name) errors.push('shipping courier name is required');
  }

  // Validate totals
  if (typeof data.subtotal !== 'number') errors.push('subtotal must be a number');
  if (typeof data.shippingCost !== 'number') errors.push('shippingCost must be a number');
  if (typeof data.total !== 'number') errors.push('total must be a number');

  return {
    isValid: errors.length === 0,
    errors
  };
}

function isAddressComplete(address: AddressValues['shippingAddress']): boolean {
  return !!(
    address &&
    address.streetAddress &&
    address.suburb &&
    address.city &&
    address.postalCode &&
    address.province &&
    address.latitude !== 0 &&
    address.longitude !== 0
  );
}

/**
 * Detect shipping method from service level or rate data
 */
function detectShippingMethod(
  shipping: CreateOrderParams['shipping']
): 'dtd' | 'dtl' | 'ltd' | 'ltl' | 'collection' | 'in_house' {
  // If method is explicitly provided and valid, use it
  if (shipping.method && ['dtd', 'dtl', 'ltd', 'ltl', 'collection', 'in_house'].includes(shipping.method)) {
    return shipping.method;
  }

  // Detect from service_level field
  const serviceLevel = shipping.rate.service_level?.toLowerCase() || '';
  const name = shipping.rate.name?.toLowerCase() || '';
  
  if (serviceLevel.includes('ltl') || serviceLevel.includes('l2l') || name.includes('locker to locker')) {
    return 'ltl';
  }
  if (serviceLevel.includes('dtl') || serviceLevel.includes('d2l') || name.includes('door to locker')) {
    return 'dtl';
  }
  if (serviceLevel.includes('ltd') || serviceLevel.includes('l2d') || name.includes('locker to door')) {
    return 'ltd';
  }
  
  // Check if it's collection or in-house based on provider
  if (shipping.rate.provider === 'collection') return 'collection';
  if (shipping.rate.provider === 'in_house') return 'in_house';
  
  // Default to door-to-door
  return 'dtd';
}

interface CreateOrderParams {
  userId: string;
  userEmail: string;
  dispensaryId: string;
  dispensaryName: string;
  dispensaryType: string;
  items: CartItem[];
  shipping: {
    method: 'dtd' | 'dtl' | 'ltd' | 'ltl' | 'collection' | 'in_house';
    rate: ShippingRate;
    address?: AddressValues['shippingAddress'];
    originLocker?: PudoLocker | null;
    destinationLocker?: PudoLocker | null;
  };
  subtotal: number;
  shippingCost: number;
  total: number;
  customerDetails?: {
    name: string;
    email: string;
    phone: string;
  };
  // Treehouse marketplace fields
  orderType?: 'dispensary' | 'treehouse' | 'healer-service';
  podStatus?: 'pending_print' | 'printing' | 'printed' | 'packaging' | 'shipped' | 'delivered';
  platformCommission?: number; // 75% for Treehouse
  creatorCommission?: number; // 25% for Treehouse
  creatorId?: string; // Creator user ID
}

export async function createOrder(params: CreateOrderParams): Promise<DocumentReference> {
  const { 
    userId, 
    userEmail,
    items,
    shipping,
    subtotal,
    shippingCost,
    total,
    dispensaryId,
    customerDetails
  } = params;
  // Convert CartItems to OrderItems
  const orderItems: OrderItem[] = items.map(item => ({
    ...item,
    originalPrice: item.price // Save the original price
  }));

  const shippingAddress: BaseAddress = shipping.address ? {
    streetAddress: shipping.address.streetAddress || '',
    suburb: shipping.address.suburb || '',
    city: shipping.address.city || '',
    province: shipping.address.province || '',
    postalCode: shipping.address.postalCode || '',
    country: shipping.address.country || 'ZA',
    latitude: shipping.address.latitude || 0,
    longitude: shipping.address.longitude || 0
  } : {
    streetAddress: '',
    suburb: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'ZA',
    latitude: 0,
    longitude: 0
  };

  const shippingStatus: ShippingStatus = 'pending';
  
  // Detect actual shipping method from rate data
  const detectedMethod = detectShippingMethod(shipping);
  
  console.log('Creating order with shipping details:', {
    detectedMethod,
    provider: shipping.rate.provider,
    hasOriginLocker: !!shipping.originLocker,
    hasDestinationLocker: !!shipping.destinationLocker,
    serviceLevel: shipping.rate.service_level
  });
  
  const orderData: Omit<Order, 'id'> = {
    orderNumber: generateOrderNumber(),
    userId,
    items: orderItems,
    customerDetails: customerDetails || {
      name: '',
      email: userEmail || '',
      phone: ''
    },
    shipments: {
      [dispensaryId]: {
      dispensaryId,
      items: orderItems,
      shippingMethod: {
        id: shipping.rate.id || 'unknown',
        name: shipping.rate.name || 'Standard Delivery',
        courier_name: shipping.rate.courier_name || 'Courier',
        provider: shipping.rate.provider || 'shiplogic',
        label: shipping.rate.label || shipping.rate.name || 'Standard Delivery',
        rate: shipping.rate.rate || 0,
        price: shipping.rate.price ?? shipping.rate.rate ?? 0,
        currency: shipping.rate.currency || 'ZAR',
        service_level: shipping.rate.service_level || 'standard',
        delivery_time: shipping.rate.delivery_time || 'Unknown'
      },
      status: shippingStatus,
      shippingProvider: shipping.rate.provider || 'shiplogic',
      statusHistory: [{
        status: shippingStatus,
        timestamp: Timestamp.now(),
        message: 'Order created',
        updatedBy: 'system'
      }],
      trackingNumber: null,
      trackingUrl: null,
      ...(shipping.originLocker && { originLocker: shipping.originLocker }),
      ...(shipping.destinationLocker && { destinationLocker: shipping.destinationLocker })
    }},
    status: 'pending',
    shippingAddress,
    subtotal,
    shippingCost,
    shippingTotal: shippingCost,
    total,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    paymentStatus: 'pending',
    paymentMethod: 'payfast',
    // Treehouse marketplace fields
    ...(params.orderType && { orderType: params.orderType }),
    ...(params.podStatus && { podStatus: params.podStatus }),
    ...(params.platformCommission && { platformCommission: params.platformCommission }),
    ...(params.creatorCommission && { creatorCommission: params.creatorCommission }),
    ...(params.creatorId && { creatorId: params.creatorId })
  };

  const validation = validateOrderInput(params);
  if (!validation.isValid) {
    console.error('Order validation failed:', validation.errors);
    throw new Error(`Invalid order data: ${validation.errors.join(', ')}`);
  }

  try {
    console.log('=== Creating Order ===');
    console.log('Order data BEFORE cleaning:', JSON.stringify(orderData, null, 2));
    
    // Clean undefined values from orderData
    const cleanedOrderData = removeUndefined(orderData);
    
    console.log('Order data AFTER cleaning:', JSON.stringify(cleanedOrderData, null, 2));
    
    // Store in main orders collection
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const mainOrderRef = await addDoc(ordersRef, cleanedOrderData);
    
    console.log('✅ Order saved successfully with ID:', mainOrderRef.id);

    // Store in dispensary type collection
    const typeCollectionName = params.dispensaryType.toLowerCase().replace(/\s+/g, '_') + '_orders';
    const typeOrdersRef = collection(db, typeCollectionName);
    await addDoc(typeOrdersRef, {
      ...cleanedOrderData,
      mainOrderId: mainOrderRef.id // Reference to main order
    });
    
    console.log('✅ Dispensary type order saved successfully');

    return mainOrderRef;
  } catch (error) {
    console.error('❌ Error creating order:', error);
    throw error;
  }
}