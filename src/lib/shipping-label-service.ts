/**
 * Shipping Label Service
 * Handles label generation for dispensary admins via Firebase Functions
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';
import type { 
  ShipLogicAddress, 
  ShipLogicContact,
  ShipLogicParcel,
  PudoAddress,
  PudoContact,
  PudoParcel,
  ShippingLabel 
} from '@/types/shipping';

const functions = getFunctions(app);

// ============== Type Definitions ==============

export interface CreateShipLogicLabelRequest {
  orderId: string;
  orderNumber: string;
  dispensaryId: string;
  collectionAddress: ShipLogicAddress;
  collectionContact: ShipLogicContact;
  deliveryAddress: ShipLogicAddress;
  deliveryContact: ShipLogicContact;
  parcels: ShipLogicParcel[];
  serviceLevelCode: string;
  declaredValue?: number;
  specialInstructions?: string;
}

export interface CreatePudoLabelRequest {
  orderId: string;
  orderNumber: string;
  dispensaryId: string;
  collectionAddress: PudoAddress;
  collectionContact: PudoContact;
  deliveryAddress: PudoAddress;
  deliveryContact: PudoContact;
  parcels: PudoParcel[];
  serviceLevelCode?: string;
  serviceLevelId?: number;
  declaredValue?: number;
  specialInstructionsCollection?: string;
  specialInstructionsDelivery?: string;
}

export interface LabelCreationResponse {
  success: boolean;
  shipmentId: string;
  trackingNumber: string;
  shortTrackingReference?: string;
  accessCode?: string; // For PUDO locker deliveries
  status: string;
  rate: number;
  provider: 'shiplogic' | 'pudo';
  trackingUrl: string;
}

// ============== ShipLogic Label Generation ==============

/**
 * Create a ShipLogic shipment and generate label for door-to-door delivery
 */
export async function createShipLogicLabel(
  request: CreateShipLogicLabelRequest
): Promise<LabelCreationResponse> {
  try {
    const createShipmentFn = httpsCallable<CreateShipLogicLabelRequest, LabelCreationResponse>(
      functions,
      'createShiplogicShipment'
    );

    const result = await createShipmentFn(request);
    
    if (!result.data.success) {
      throw new Error('Failed to create ShipLogic shipment');
    }

    return result.data;
  } catch (error: any) {
    console.error('Error creating ShipLogic label:', error);
    throw new Error(
      error.message || 'Failed to create shipping label. Please try again.'
    );
  }
}

// ============== PUDO Label Generation ==============

/**
 * Create a PUDO shipment and generate label for locker-based delivery
 */
export async function createPudoLabel(
  request: CreatePudoLabelRequest
): Promise<LabelCreationResponse> {
  try {
    const createShipmentFn = httpsCallable<CreatePudoLabelRequest, LabelCreationResponse>(
      functions,
      'createPudoShipment'
    );

    const result = await createShipmentFn(request);
    
    if (!result.data.success) {
      throw new Error('Failed to create PUDO shipment');
    }

    return result.data;
  } catch (error: any) {
    console.error('Error creating PUDO label:', error);
    throw new Error(
      error.message || 'Failed to create shipping label. Please try again.'
    );
  }
}

// ============== Helper Functions ==============

/**
 * Prepare ShipLogic address from order data
 */
export function prepareShipLogicAddress(
  address: any,
  type: 'residential' | 'business'
): ShipLogicAddress {
  return {
    type,
    company: address.company || '',
    street_address: address.street || address.streetAddress || '',
    local_area: address.suburb || '',
    city: address.city || '',
    zone: address.province || address.state || '',
    country: address.country || 'ZA',
    code: address.postalCode || address.zipCode || ''
  };
}

/**
 * Prepare ShipLogic contact from order data
 */
export function prepareShipLogicContact(contact: any): ShipLogicContact {
  return {
    name: contact.name || contact.fullName || '',
    mobile_number: contact.phone || contact.mobile || '',
    email: contact.email || ''
  };
}

/**
 * Prepare ShipLogic parcels from order items
 */
export function prepareShipLogicParcels(
  items: any[],
  defaultDimensions = { length: 30, width: 20, height: 10 }
): ShipLogicParcel[] {
  // Group items by dispensary if needed
  const totalWeight = items.reduce((sum, item) => {
    const weight = item.weight || 0.5; // Default 500g per item
    return sum + (weight * item.quantity);
  }, 0);

  return [{
    parcel_description: `Order containing ${items.length} item(s)`,
    submitted_length_cm: defaultDimensions.length,
    submitted_width_cm: defaultDimensions.width,
    submitted_height_cm: defaultDimensions.height,
    submitted_weight_kg: Math.max(totalWeight, 0.5) // Minimum 500g
  }];
}

/**
 * Prepare PUDO address from order data (includes terminal_id for locker addresses)
 */
export function preparePudoAddress(
  address: any,
  type: 'residential' | 'business' | 'locker',
  terminalId?: string
): PudoAddress {
  // For locker addresses, PUDO only needs terminal_id - no other fields
  if (type === 'locker' && terminalId) {
    return {
      terminal_id: terminalId
    } as PudoAddress;
  }

  // For physical addresses (residential/business), include all address fields
  const pudoAddress: PudoAddress = {
    type,
    company: address.company || '',
    street_address: address.street || address.streetAddress || '',
    local_area: address.suburb || '',
    city: address.city || '',
    zone: address.province || address.state || '',
    country: address.country || 'ZA',
    code: address.postalCode || address.zipCode || '',
    lat: address.latitude,
    lng: address.longitude
  };

  return pudoAddress;
}

/**
 * Prepare PUDO contact from order data
 */
export function preparePudoContact(contact: any): PudoContact {
  return {
    name: contact.name || contact.fullName || '',
    mobile_number: contact.phone || contact.mobile || '',
    email: contact.email || ''
  };
}

/**
 * Prepare PUDO parcels from order items
 */
export function preparePudoParcels(
  items: any[],
  defaultDimensions = { length: 30, width: 20, height: 10 }
): PudoParcel[] {
  const totalWeight = items.reduce((sum, item) => {
    const weight = item.weight || 0.5;
    return sum + (weight * item.quantity);
  }, 0);

  return [{
    parcel_description: `Order containing ${items.length} item(s)`,
    submitted_length_cm: defaultDimensions.length,
    submitted_width_cm: defaultDimensions.width,
    submitted_height_cm: defaultDimensions.height,
    submitted_weight_kg: Math.max(totalWeight, 0.5)
  }];
}

/**
 * Calculate declared value from order items
 */
export function calculateDeclaredValue(items: any[]): number {
  return items.reduce((sum, item) => {
    const price = item.price || 0;
    return sum + (price * item.quantity);
  }, 0);
}

/**
 * Determine appropriate service level code based on delivery method
 */
export function getServiceLevelCode(
  provider: 'shiplogic' | 'pudo',
  deliveryMethod: string
): string | undefined {
  if (provider === 'shiplogic') {
    // ShipLogic service levels for door-to-door
    const serviceLevels: Record<string, string> = {
      'door-to-door': 'ECO', // Economy
      'door-to-door-express': 'ONX', // Overnight Express
      'same-day': 'SDV' // Same Day (if available)
    };
    return serviceLevels[deliveryMethod];
  }
  
  if (provider === 'pudo') {
    // PUDO service levels - must match exact format from PUDO API
    // Format: [D2L|L2D|L2L][XS|S|M|L] - ECO
    // Note: serviceLevelCode OR serviceLevelId can be used
    // These match the PUDO sandbox/production service levels
    const serviceLevels: Record<string, string | undefined> = {
      'door-to-door': undefined, // DTD - use ShipLogic instead
      'door-to-locker': 'D2LXS - ECO', // Door to Locker Extra Small
      'locker-to-door': 'L2DXS - ECO', // Locker to Door Extra Small
      'locker-to-locker': 'L2LXS - ECO' // Locker to Locker Extra Small
    };
    return serviceLevels[deliveryMethod];
  }
  
  return undefined;
}

/**
 * Validate label creation request
 */
export function validateLabelRequest(request: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!request.orderId) errors.push('Order ID is required');
  if (!request.orderNumber) errors.push('Order number is required');
  if (!request.dispensaryId) errors.push('Dispensary ID is required');
  if (!request.collectionAddress) errors.push('Collection address is required');
  if (!request.deliveryAddress) errors.push('Delivery address is required');
  if (!request.collectionContact?.name) errors.push('Collection contact name is required');
  if (!request.deliveryContact?.name) errors.push('Delivery contact name is required');
  if (!request.parcels || request.parcels.length === 0) errors.push('At least one parcel is required');

  // Validate parcels
  request.parcels?.forEach((parcel: any, idx: number) => {
    if (!parcel.submitted_length_cm) errors.push(`Parcel ${idx + 1}: Length is required`);
    if (!parcel.submitted_width_cm) errors.push(`Parcel ${idx + 1}: Width is required`);
    if (!parcel.submitted_height_cm) errors.push(`Parcel ${idx + 1}: Height is required`);
    if (!parcel.submitted_weight_kg) errors.push(`Parcel ${idx + 1}: Weight is required`);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
