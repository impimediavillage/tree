import type { Order } from '@/types/order';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export function filterAndSortOrders(
  orders: Order[],
  {
    searchTerm,
    statusFilter,
    shippingStatusFilter,
    dateRange,
    sortBy,
    dispensaryId
  }: {
    searchTerm: string;
    statusFilter: string;
    shippingStatusFilter: string;
    dateRange: DateRange | undefined;
    sortBy: string;
    dispensaryId: string;
  }
) {
  console.log('Starting filter with orders:', orders.length);
  console.log('Sample order structure:', orders[0]);
  
  // First, apply filters
  let filtered = orders.filter(order => {
    // Search filter
    const searchMatch = 
      !searchTerm ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerDetails.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerDetails.name.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const statusMatch = 
      statusFilter === 'all' ||
      order.status === statusFilter;

    // Shipping status filter (for specific dispensary)
    const shippingMatch =
      shippingStatusFilter === 'all' ||
      Object.values(order.shipments || {}).some(
        shipment => 
          shipment.dispensaryId === dispensaryId &&
          shipment.status === shippingStatusFilter
      );

    // Date range filter
    const dateMatch = 
      !dateRange?.from ||
      !dateRange?.to ||
      (order.createdAt &&
        isWithinInterval(order.createdAt.toDate(), {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to)
        }));

    return searchMatch && statusMatch && shippingMatch && dateMatch;
  });

  // Then, sort the filtered results
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date_desc':
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
      case 'date_asc':
        return a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime();
      case 'total_desc':
        return b.total - a.total;
      case 'total_asc':
        return a.total - b.total;
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  return filtered;
}