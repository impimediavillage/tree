import type { PudoLocker } from './shipping';
import type { AddressValues as BaseAddressValues } from './index';

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

// Re-export AddressValues for backward compatibility
export type { BaseAddressValues as AddressValues };
