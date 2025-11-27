import type { ShippingStatus } from '@/types/shipping';

/**
 * Defines valid status transitions for order shipments
 */
export const STATUS_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
  'pending': ['ready_for_shipping'],
  'ready_for_shipping': ['in_transit'],
  'in_transit': ['out_for_delivery', 'delivered', 'failed'],
  'out_for_delivery': ['delivered', 'failed'],
  'delivered': [], // Terminal state - no transitions
  'failed': ['pending', 'returned'], // Can retry or mark as returned
  'returned': [], // Terminal state - no transitions
};

/**
 * Status labels for display
 */
export const STATUS_LABELS: Record<ShippingStatus, string> = {
  'pending': 'Pending',
  'ready_for_shipping': 'Ready for Shipping',
  'in_transit': 'In Transit',
  'out_for_delivery': 'Out for Delivery',
  'delivered': 'Delivered',
  'failed': 'Failed',
  'returned': 'Returned',
};

/**
 * Status descriptions for confirmation dialogs
 */
export const STATUS_DESCRIPTIONS: Record<ShippingStatus, string> = {
  'pending': 'Order is awaiting processing',
  'ready_for_shipping': 'Order is ready to ship - generate labels to proceed',
  'in_transit': 'Package is with the courier and on its way',
  'out_for_delivery': 'Package is out for delivery today',
  'delivered': 'Package has been successfully delivered',
  'failed': 'Delivery attempt failed - requires attention',
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
  return ['delivered', 'failed', 'returned'].includes(status);
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
