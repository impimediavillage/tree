import { Timestamp } from 'firebase/firestore';
import type { OrderItem } from './order';
import type { OrderStatus } from './order';

export type ShippingStatus = 'pending' | 'ready_for_shipping' | 'label_generated' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled' | 'returned';

export interface TrackingUpdate {
    timestamp: Date;
    status: ShippingStatus;
    message: string;
    location?: string;
}

export interface TrackingInfo {
    orderId: string;
    updates: TrackingUpdate[];
    lastUpdate: Date | null;
    status: ShippingStatus;
}

export interface OrderShipment {
  dispensaryId: string;
  items: OrderItem[];
  shippingMethod: ShippingRate;
  status: ShippingStatus;
  shippingProvider: 'shiplogic' | 'pudo' | 'in_house' | 'collection';
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string;
  originLocker?: PudoLocker;
  destinationLocker?: PudoLocker;
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

export interface ShippingRate {
  id: string;
  name: string;
  courier_name: string;
  provider: 'shiplogic' | 'pudo' | 'in_house' | 'collection';
  label: string;
  rate: number;
  price: number;
  serviceType?: string;
  estimatedDays?: string;
  service_level?: string;
  delivery_time?: string;
  currency?: string;
  originLocker?: PudoLocker;
  destinationLocker?: PudoLocker;
  zoneId?: string;
  baseRate?: number;
  minOrderValue?: number;
  maxOrderValue?: number;
  isActive?: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  description?: string;
  regions: {
    provinces: string[];
    cities: string[];
  };
  rates: {
    baseRate: number;
    minOrderValue?: number;
    maxOrderValue?: number;
    isActive: boolean;
  }[];
}

export interface ShippingProviderConfig {
  apiKey: string;
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  radius: number;
  center: {
    lat: number;
    lng: number;
  };
  rate: number;
  minOrder?: number;
  maxOrder?: number;
  estimatedTime: string;
  active: boolean;
}

export interface PudoLocker {
  id: string;
  name: string;
  address: string;
  street_address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  distanceKm?: number | null;
  description?: string;
  location?: {
    lat: number;
    lng: number;
  };
  status?: 'active' | 'inactive' | 'maintenance';
  availableCompartments?: number;
  settings?: Record<string, any>;
}

export interface DispensaryShippingSettings {
  inHouseDelivery: boolean;
  pudoIntegration: boolean;
  shiplogicIntegration: boolean;
  shippingMethods: string[];
  originLocker: PudoLocker | null;
  shippingMarkup: number;
  minimumShippingRate: number;
  freeShippingThreshold: number;
  deliveryZones: DeliveryZone[];
  providers: {
    pudo?: ShippingProviderConfig;
    shiplogic?: ShippingProviderConfig;
  };
}

export interface ShipmentStatus {
  status: string;
  timestamp: Timestamp;
  location?: string;
  message?: string;
}

// ============= ShipLogic API Types =============
export interface ShipLogicAddress {
  company?: string;
  street_address: string;
  local_area: string;
  city: string;
  zone: string; // Province
  country: string;
  code: string; // Postal code
  type?: 'business' | 'residential' | 'counter' | 'locker';
  lat?: number;
  lng?: number;
}

export interface ShipLogicContact {
  name: string;
  mobile_number?: string;
  email?: string;
}

export interface ShipLogicParcel {
  parcel_description?: string;
  submitted_length_cm: number | string;
  submitted_width_cm: number | string;
  submitted_height_cm: number | string;
  submitted_weight_kg: number | string;
}

export interface ShipLogicRateRequest {
  collection_address: ShipLogicAddress;
  delivery_address: ShipLogicAddress;
  parcels: ShipLogicParcel[];
  declared_value?: number;
  collection_min_date?: string;
  delivery_min_date?: string;
  opt_in_rates?: number[];
  opt_in_time_based_rates?: number[];
}

export interface ShipLogicServiceLevel {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface ShipLogicRateResponse {
  service_level: ShipLogicServiceLevel;
  rate: number;
  courier_name?: string;
  estimated_collection?: string;
  estimated_delivery_from?: string;
  estimated_delivery_to?: string;
}

export interface ShipLogicShipmentRequest {
  collection_address: ShipLogicAddress;
  collection_contact: ShipLogicContact;
  delivery_address: ShipLogicAddress;
  delivery_contact: ShipLogicContact;
  parcels: ShipLogicParcel[];
  service_level_code: string;
  declared_value?: number;
  collection_min_date?: string;
  collection_after?: string;
  collection_before?: string;
  delivery_min_date?: string;
  delivery_after?: string;
  delivery_before?: string;
  special_instructions_collection?: string;
  special_instructions_delivery?: string;
  custom_tracking_reference?: string;
  customer_reference?: string;
  mute_notifications?: boolean;
}

export interface ShipLogicShipmentResponse {
  id: number;
  custom_tracking_reference: string;
  short_tracking_reference: string;
  status: string;
  rate: number;
  tracking_events?: Array<{
    id: number;
    status: string;
    date: string;
    message?: string;
    location?: string;
  }>;
}

export interface ShipLogicTrackingEvent {
  id: number;
  status: string;
  date: string;
  message?: string;
  location?: string;
  source?: string;
}

export interface ShipLogicWebhookPayload {
  shipment_id: number;
  custom_tracking_reference: string;
  short_tracking_reference: string;
  status: string;
  event_time: string;
  tracking_events: ShipLogicTrackingEvent[];
}

// ============= PUDO API Types =============
export interface PudoAddress {
  company?: string;
  street_address?: string;
  local_area?: string;
  city?: string;
  code?: string; // Postal code
  zone?: string; // Province
  country?: string;
  type?: 'business' | 'residential' | 'locker';
  lat?: number;
  lng?: number;
  terminal_id?: string; // For locker addresses
}

export interface PudoParcel {
  parcel_description?: string;
  submitted_length_cm: string | number; // PUDO accepts both
  submitted_width_cm: string | number;
  submitted_height_cm: string | number;
  submitted_weight_kg: string | number;
}

export interface PudoRateRequest {
  collection_address: PudoAddress;
  delivery_address: PudoAddress;
  parcels: PudoParcel[];
  declared_value?: number;
  opt_in_rates?: number[];
  opt_in_time_based_rates?: number[];
}

export interface PudoServiceLevel {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface PudoRateResponse {
  service_level: PudoServiceLevel;
  rate: string; // PUDO returns rate as string
  delivery_time?: string;
}

export interface PudoContact {
  name: string;
  mobile_number?: string;
  email?: string;
}

export interface PudoShipmentRequest {
  collection_address: PudoAddress;
  collection_contact: PudoContact;
  delivery_address: PudoAddress;
  delivery_contact: PudoContact;
  parcels: PudoParcel[];
  service_level_code?: string;
  service_level_id?: number;
  declared_value?: number;
  special_instructions_collection?: string;
  special_instructions_delivery?: string;
  custom_tracking_reference?: string;
  customer_reference?: string;
  mute_notifications?: boolean;
}

export interface PudoShipmentResponse {
  id: number;
  custom_tracking_reference: string;
  short_tracking_reference: string;
  status: string;
  rate: number;
  access_code?: string; // For locker deliveries
  tracking_events?: Array<{
    id: number;
    status: string;
    date: string;
    message?: string;
    location?: string;
  }>;
}

export interface PudoTrackingEvent {
  id: number;
  status: string;
  date: string;
  message?: string;
  location?: string;
}

export interface PudoWebhookPayload {
  shipment_id: number;
  custom_tracking_reference: string;
  short_tracking_reference: string;
  status: string;
  event_time: string;
  access_code?: string;
  tracking_events: PudoTrackingEvent[];
}

// ============= Unified Types for Application =============
export interface ShippingLabel {
  orderId: string;
  shipmentId: string;
  provider: 'shiplogic' | 'pudo';
  trackingNumber: string;
  trackingReference: string;
  labelUrl: string;
  status: string;
  createdAt: Date;
  accessCode?: string; // For PUDO locker deliveries
}

export interface ShippingWebhookEvent {
  provider: 'shiplogic' | 'pudo';
  orderId: string;
  shipmentId: string;
  status: ShippingStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  timestamp?: Timestamp;
  location?: string;
  message?: string;
  accessCode?: string;
}
