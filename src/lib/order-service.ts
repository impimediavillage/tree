import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, DocumentReference, Timestamp, runTransaction, doc, getDoc } from 'firebase/firestore';
import { calculatePriceBreakdown } from '@/lib/pricing';
import type { CartItem } from '@/types/shared';
import type { ShippingRate, PudoLocker, ShippingStatus } from '@/types/shipping';
import type { AddressValues } from '@/types/checkout';
import type { Order } from '@/types/order'; // Changed from @/types/orders
import type { OrderItem } from '@/types/order'; // Changed from @/types/orders/items
import type { OrderStatus } from '@/types/order'; // Changed from @/types/orders/status

/**
 * Main orders collection in Firestore.
 * 
 * Order data is stored in multiple locations for different access patterns:
 * 1. /orders - Main collection containing all orders (source of truth)
 * 2. /dispensaries/{dispensaryId}/orders - Denormalized references for dispensary-specific access
 * 3. /productPoolOrders - Separate collection for product pool related orders
 */
const ORDERS_COLLECTION = 'orders';

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

/**
 * Generates unique order number with format: ORD-WELL-2412291345-A0000001
 * - WELL: Fixed platform prefix for all orders
 * - 241229: Year(2) + Month + Day
 * - 1345: Hours + Minutes
 * - A0000001: Letter (A-Z) + 7-digit counter
 * Counter increments atomically using Firestore transactions.
 * When counter reaches 9999999, letter increments (A→B) and counter resets to 0000001.
 */
async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits (e.g., '25')
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // Fixed platform prefix for all orders
  const code = 'WELL';
  
  // Get or create counter using Firestore transaction for atomicity
  const counterRef = doc(db, 'order_counters', 'global');
  
  let counterLetter = 'A';
  let counterNumber = 1;
  
  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      if (counterDoc.exists()) {
        const data = counterDoc.data();
        counterLetter = data.letter || 'A';
        counterNumber = (data.number || 0) + 1;
        
        // Check if we need to roll over to next letter
        if (counterNumber > 9999999) {
          counterNumber = 1;
          counterLetter = String.fromCharCode(counterLetter.charCodeAt(0) + 1);
          if (counterLetter > 'Z') {
            counterLetter = 'A'; // Wrap around (though 260M orders is unlikely!)
          }
        }
      }
      
      // Update counter atomically
      transaction.set(counterRef, {
        letter: counterLetter,
        number: counterNumber,
        lastUpdated: serverTimestamp()
      });
    });
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to timestamp-based if transaction fails
    const timestamp = Date.now().toString().slice(-7);
    return `ORD-${code}-${year}${month}${day}${hours}${minutes}-X${timestamp}`;
  }
  
  // Format: ORD-WELL-2412291345-A0000001
  const counterStr = counterLetter + counterNumber.toString().padStart(7, '0');
  return `ORD-${code}-${year}${month}${day}${hours}${minutes}-${counterStr}`;
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
  // Influencer referral tracking
  referralCode?: string;
  // Treehouse marketplace fields
  orderType?: 'dispensary' | 'treehouse' | 'healer-service';
  podStatus?: 'pending_print' | 'printing' | 'printed' | 'packaging' | 'shipped' | 'delivered';
  platformCommission?: number; // 75% for Treehouse
  creatorCommission?: number; // 25% for Treehouse
  creatorId?: string; // Creator user ID
  creatorName?: string; // Creator display name
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
  
  // Fetch dispensary to get taxRate for pricing calculations
  // Skip for Treehouse orders (they use different commission structure)
  let dispensaryTaxRate = 0;
  if (params.orderType !== 'treehouse') {
    try {
      const dispensaryDoc = await getDoc(doc(db, 'dispensaries', dispensaryId));
      if (dispensaryDoc.exists()) {
        const dispensaryData = dispensaryDoc.data();
        dispensaryTaxRate = dispensaryData.taxRate || 0;
      }
    } catch (error) {
      console.warn('Could not fetch dispensary tax rate, using 0:', error);
    }
  }
  
  // Convert CartItems to OrderItems with accurate pricing breakdown
  const orderItems: OrderItem[] = items.map(item => {
    // For Treehouse orders, use new pricing model
    // item.price is customerPrice (retailPrice * 1.25)
    if (params.orderType === 'treehouse') {
      const retailPrice = Math.round((item.price / 1.25) * 100) / 100;
      const basePrice = Math.round(retailPrice * 0.8 * 100) / 100; // Default: 80% of retailPrice
      const creatorCommission = Math.round(retailPrice * 0.25 * 100) / 100;
      
      return {
        ...item,
        originalPrice: item.price,
        dispensarySetPrice: item.price,      // Customer price
        basePrice: retailPrice,              // Platform gets retailPrice
        platformCommission: creatorCommission, // Creator gets 25% of retailPrice
        commissionRate: 0.25,
        subtotalBeforeTax: item.price * item.quantity,
        taxAmount: 0,
        lineTotal: item.price * item.quantity,
        // Store pricing breakdown in metadata
        metadata: {
          retailPrice,
          actualBasePrice: basePrice,
          creatorCommission,
          platformProfit: retailPrice - basePrice
        }
      };
    }
    
    // Determine if item is from Product Pool (5% commission) or regular store (25% commission)
    const isProductPool = item.dispensaryType === 'Product Pool';
    
    // Calculate accurate price breakdown using pricing utilities
    const breakdown = calculatePriceBreakdown(
      item.price,
      dispensaryTaxRate,
      isProductPool
    );
    
    console.log(`📊 Pricing breakdown for "${item.name}":`, {
      itemPrice: item.price,
      quantity: item.quantity,
      taxRate: dispensaryTaxRate,
      isProductPool,
      breakdown: {
        dispensarySetPrice: breakdown.dispensarySetPrice,
        basePrice: breakdown.basePrice,
        commission: breakdown.commission,
        commissionRate: breakdown.commissionRate,
        tax: breakdown.tax,
        finalPrice: breakdown.finalPrice
      },
      calculated: {
        platformCommission: breakdown.commission * item.quantity,
        taxAmount: breakdown.tax * item.quantity,
        lineTotal: breakdown.finalPrice * item.quantity
      }
    });
    
    return {
      ...item,
      originalPrice: item.price,
      dispensarySetPrice: breakdown.dispensarySetPrice,
      basePrice: breakdown.basePrice,
      platformCommission: breakdown.commission * item.quantity,
      commissionRate: breakdown.commissionRate,
      subtotalBeforeTax: breakdown.subtotalBeforeTax * item.quantity,
      taxAmount: breakdown.tax * item.quantity,
      lineTotal: breakdown.finalPrice * item.quantity
    };
  });

  const shippingAddress: {
    streetAddress: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
  } = shipping.address ? {
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
    orderNumber: await generateOrderNumber(),
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
    statusHistory: [{
      status: 'pending',
      timestamp: Timestamp.now(),
      message: 'Order created'
    }],
    shippingAddress,
    subtotal,
    shippingCost,
    shippingTotal: shippingCost,
    total,
    // Calculate accurate pricing totals from OrderItems
    tax: orderItems.reduce((sum, item) => sum + item.taxAmount, 0),
    taxRate: dispensaryTaxRate,
    totalDispensaryEarnings: orderItems.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0),
    totalPlatformCommission: orderItems.reduce((sum, item) => sum + item.platformCommission, 0),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    paymentStatus: 'pending',
    paymentMethod: 'payfast',
  // Influencer referral tracking
    ...(params.referralCode && { referralCode: params.referralCode.toUpperCase() }),

    // Treehouse marketplace fields
    ...(params.orderType && { orderType: params.orderType }),
    ...(params.podStatus && { podStatus: params.podStatus }),
    ...(params.platformCommission && { platformCommission: params.platformCommission }),
    ...(params.creatorCommission && { creatorCommission: params.creatorCommission }),
    ...(params.creatorId && { creatorId: params.creatorId }),
    // Additional Treehouse fields for earnings Cloud Function
    ...(params.orderType === 'treehouse' && orderItems[0] && {
      productId: orderItems[0].productId,
      productName: orderItems[0].name,
      quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      unitPrice: orderItems[0].price,
      totalAmount: total,
      creatorName: params.creatorName || 'Unknown Creator'
    })
  };
  
  console.log('✅ Order totals calculated:', {
    itemsCount: orderItems.length,
    totalTax: orderData.tax.toFixed(2),
    totalDispensaryEarnings: orderData.totalDispensaryEarnings.toFixed(2),
    totalPlatformCommission: orderData.totalPlatformCommission.toFixed(2),
    orderTotal: total.toFixed(2),
    taxRate: `${dispensaryTaxRate}%`
  });

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

    return mainOrderRef;
  } catch (error) {
    console.error('❌ Error creating order:', error);
    throw error;
  }
}