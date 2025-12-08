import type { PudoLocker } from './shipping';

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

export interface AddressValues {
  fullName: string;
  email: string;
  phoneNumber: string;
  shippingAddress: {
    address: string;
    streetAddress: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  billingAddress?: {
    streetAddress?: string;
    suburb?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
}
