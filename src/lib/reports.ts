import { format } from 'date-fns';
import type { Order } from '@/types/order';

export const generateOrdersCsv = async (orders: Order[]): Promise<string> => {
  // CSV Headers
  const headers = [
    'Order Number',
    'Date',
    'Customer Name',
    'Email',
    'Status',
    'Items',
    'Subtotal',
    'Shipping',
    'Total',
    'Shipping Address',
    'Tracking Number',
    'Shipping Method'
  ].join(',');

  // Generate CSV rows
  const rows = orders.map(order => {
    // Combine all items from all shipments
    const items = order.shipments
      .flatMap(s => s.items)
      .map(item => `${item.name} (${item.quantity})`)
      .join('; ');

    // Format shipping address
    const shippingAddress = `${order.shippingAddress.streetAddress}, ${order.shippingAddress.suburb}, ${order.shippingAddress.city}, ${order.shippingAddress.province}, ${order.shippingAddress.postalCode}`;

    // Get tracking info from the first shipment (assuming single shipment for now)
    const mainShipment = order.shipments[0];
    const trackingNumber = mainShipment?.trackingNumber || 'N/A';
    const shippingMethod = mainShipment?.shippingMethod?.name || 'N/A';

    return [
      order.orderNumber,
      format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss'),
      order.customerDetails.name,
      order.customerDetails.email,
      order.status,
      `"${items}"`, // Wrap in quotes to handle commas in items
      order.subtotal.toFixed(2),
      order.shippingCost.toFixed(2),
      order.total.toFixed(2),
      `"${shippingAddress}"`, // Wrap in quotes to handle commas in address
      trackingNumber,
      shippingMethod
    ].join(',');
  });

  return [headers, ...rows].join('\n');
};