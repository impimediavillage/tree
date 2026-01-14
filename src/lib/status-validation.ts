import type { ShippingStatus } from '@/types/shipping';

/**
 * Defines valid status transitions for order shipments
 */
export const STATUS_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
  // General shipping statuses
  'pending': ['ready_for_shipping', 'ready_for_pickup', 'cancelled'],
  'ready_for_shipping': ['label_generated', 'cancelled'],
  'label_generated': ['in_transit', 'cancelled'],
  'in_transit': ['out_for_delivery', 'delivered', 'failed'],
  'out_for_delivery': ['delivered', 'failed'],
  
  // In-house delivery statuses
  'ready_for_pickup': ['claimed_by_driver', 'cancelled'],
  'claimed_by_driver': ['picked_up', 'cancelled'],
  'picked_up': ['en_route', 'cancelled'],
  'en_route': ['nearby', 'failed'],
  'nearby': ['arrived', 'failed'],
  'arrived': ['delivered', 'failed'],
  
  // Terminal states
  'delivered': [], // Terminal state - no transitions
  'failed': ['pending', 'returned'], // Can retry or mark as returned
  'cancelled': [], // Terminal state - no transitions
  'returned': [], // Terminal state - no transitions
};

/**
 * Status labels for display
 */
export const STATUS_LABELS: Record<ShippingStatus, string> = {
  // General shipping statuses
  'pending': 'Pending',
  'ready_for_shipping': 'Ready for Shipping',
  'label_generated': 'Label Generated',
  'in_transit': 'In Transit',
  'out_for_delivery': 'Out for Delivery',
  
  // In-house delivery statuses
  'ready_for_pickup': 'Ready for Pickup',
  'claimed_by_driver': 'Driver Assigned',
  'picked_up': 'Picked Up',
  'en_route': 'En Route',
  'nearby': 'Driver Nearby',
  'arrived': 'Driver Arrived',
  
  // Terminal states
  'delivered': 'Delivered',
  'failed': 'Failed',
  'cancelled': 'Cancelled',
  'returned': 'Returned',
};

/**
 * Status descriptions for confirmation dialogs
 */
export const STATUS_DESCRIPTIONS: Record<ShippingStatus, string> = {
  // General shipping statuses
  'pending': 'Order is awaiting processing',
  'ready_for_shipping': 'Order is ready to ship - generate labels to proceed',
  'label_generated': 'Shipping label has been generated',
  'in_transit': 'Package is with the courier and on its way',
  'out_for_delivery': 'Package is out for delivery today',
  
  // In-house delivery statuses
  'ready_for_pickup': 'Order is ready for driver pickup',
  'claimed_by_driver': 'A driver has been assigned to this delivery',
  'picked_up': 'Driver has picked up the order',
  'en_route': 'Driver is on the way to customer',
  'nearby': 'Driver is nearby (within 1km)',
  'arrived': 'Driver has arrived at delivery location',
  
  // Terminal states
  'delivered': 'Package has been successfully delivered',
  'failed': 'Delivery attempt failed - requires attention',
  'cancelled': 'Order has been cancelled',
  'returned': 'Package has been returned to sender',
};

/**
 * Validate if a status transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: ShippingStatus,
  newStatus: ShippingStatus
): boolean {
  if (currentStatus === newStatus) return true;
  
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get allowed next statuses for current status
 */
export function getAllowedStatuses(currentStatus: ShippingStatus): ShippingStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Get validation error message for invalid transition
 */
export function getTransitionErrorMessage(
  currentStatus: ShippingStatus,
  newStatus: ShippingStatus
): string {
  if (currentStatus === newStatus) {
    return 'Status is already set to this value';
  }
  
  const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
  if (allowedTransitions.length === 0) {
    return `Cannot change status from ${STATUS_LABELS[currentStatus]} - this is a terminal state`;
  }
  
  const allowedLabels = allowedTransitions.map(s => STATUS_LABELS[s]).join(', ');
  return `Cannot transition from ${STATUS_LABELS[currentStatus]} to ${STATUS_LABELS[newStatus]}. Allowed transitions: ${allowedLabels}`;
}

/**
 * Check if status requires confirmation (high-impact statuses)
 */
export function requiresConfirmation(status: ShippingStatus): boolean {
  return ['delivered', 'failed', 'cancelled', 'returned'].includes(status);
}

/**
 * Get confirmation message for status change
 */
export function getConfirmationMessage(
  currentStatus: ShippingStatus,
  newStatus: ShippingStatus,
  orderNumber: string
): { title: string; description: string; confirmText: string } {
  const statusLabel = STATUS_LABELS[newStatus];
  
  switch (newStatus) {
    case 'delivered':
      return {
        title: 'Confirm Delivery',
        description: `Are you sure order ${orderNumber} has been delivered? This action should only be taken when delivery is confirmed.`,
        confirmText: 'Confirm Delivery'
      };
    
    case 'failed':
      return {
        title: 'Mark as Failed',
        description: `Mark order ${orderNumber} as failed? You may need to follow up with the customer or retry delivery.`,
        confirmText: 'Mark Failed'
      };
    
    case 'cancelled':
      return {
        title: 'Cancel Order',
        description: `Are you sure you want to cancel order ${orderNumber}? This action may not be reversible.`,
        confirmText: 'Cancel Order'
      };
    
    case 'returned':
      return {
        title: 'Mark as Returned',
        description: `Confirm that order ${orderNumber} has been returned to sender?`,
        confirmText: 'Confirm Return'
      };
    
    default:
      return {
        title: `Update to ${statusLabel}`,
        description: `Update order ${orderNumber} status to ${statusLabel}?`,
        confirmText: 'Confirm'
      };
  }
}
