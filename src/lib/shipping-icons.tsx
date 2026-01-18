import { Car, Truck, PackageCheck, Clock, Navigation } from 'lucide-react';
import type { ShippingStatus } from '@/types/shipping';

/**
 * Get the appropriate icon for a shipping status based on delivery method
 * 
 * Driver statuses (in-house delivery):
 * - ready_for_pickup, claimed_by_driver, picked_up, en_route, nearby, arrived
 * 
 * PUDO/Shipping statuses (courier/third-party):
 * - label_generated, ready_for_shipping, shipped, in_transit, out_for_delivery
 */
export function getShippingStatusIcon(
  status: ShippingStatus, 
  shippingProvider?: string
) {
  const isInHouse = shippingProvider === 'in_house';
  
  // Driver delivery statuses (use Car icon)
  const driverStatuses: ShippingStatus[] = [
    'ready_for_pickup',
    'claimed_by_driver', 
    'picked_up',
    'en_route',
    'nearby',
    'arrived'
  ];
  
  // PUDO/Shipping statuses (use Truck icon)
  const shippingStatuses: ShippingStatus[] = [
    'label_generated',
    'ready_for_shipping',
    'in_transit',
    'out_for_delivery'
  ];
  
  // Both delivery methods
  if (status === 'delivered') {
    return { icon: PackageCheck, label: 'Delivered', color: 'text-green-600' };
  }
  
  if (status === 'pending') {
    return { icon: Clock, label: 'Processing', color: 'text-yellow-600' };
  }
  
  // Driver delivery (Car icon)
  if (driverStatuses.includes(status) || isInHouse) {
    return { icon: Car, label: 'Driver Delivery', color: 'text-blue-600' };
  }
  
  // PUDO/Shipping delivery (Truck icon)
  if (shippingStatuses.includes(status)) {
    return { icon: Truck, label: 'Courier Shipping', color: 'text-indigo-600' };
  }
  
  // Default
  return { icon: Clock, label: 'Pending', color: 'text-gray-600' };
}

/**
 * Get label with icon for status display
 */
export function getStatusDisplayWithIcon(
  status: ShippingStatus,
  shippingProvider?: string
): { icon: React.ComponentType<any>; label: string; color: string; description: string } {
  const baseIcon = getShippingStatusIcon(status, shippingProvider);
  
  const statusLabels: Record<ShippingStatus, { label: string; description: string }> = {
    pending: { label: 'Pending', description: 'Order awaiting processing' },
    ready_for_shipping: { label: 'Ready for Shipping', description: '📦 PUDO/Courier - Ready to ship' },
    ready_for_pickup: { label: 'Ready for Pickup', description: '🚗 Driver - Ready for collection' },
    label_generated: { label: 'Label Generated', description: '📦 PUDO - Shipping label created' },
    claimed_by_driver: { label: 'Claimed by Driver', description: '🚗 Driver - Assignment confirmed' },
    picked_up: { label: 'Picked Up', description: '🚗 Driver - Package collected' },
    in_transit: { label: 'In Transit', description: '📦 Courier - Moving to destination' },
    en_route: { label: 'En Route', description: '🚗 Driver - On the way to customer' },
    out_for_delivery: { label: 'Out for Delivery', description: '📦 Courier - Final delivery leg' },
    nearby: { label: 'Nearby', description: '🚗 Driver - Close to delivery location' },
    arrived: { label: 'Arrived', description: '🚗 Driver - At delivery location' },
    delivered: { label: 'Delivered', description: '✅ Successfully delivered' },
    cancelled: { label: 'Cancelled', description: '❌ Order cancelled' },
    failed: { label: 'Failed', description: '⚠️ Delivery failed' },
    returned: { label: 'Returned', description: '↩️ Package returned' }
  };
  
  const statusInfo = statusLabels[status] || { label: status, description: '' };
  
  return {
    ...baseIcon,
    label: statusInfo.label,
    description: statusInfo.description
  };
}
