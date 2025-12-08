'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import type { Order } from '@/types/order';
import type { ShippingStatus } from '@/types/shipping';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { columns } from '@/components/orders/data-table/columns';
import { DataTable } from '@/components/orders/data-table/data-table';
import { useToast } from '@/hooks/use-toast';
import { OrderDetailDialog } from '@/components/orders/OrderDetailDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer, Download, RefreshCw, Package2, Search, Filter, Loader2, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BulkActions } from '@/components/dispensary-admin/BulkActions';
import { OrderCard } from '@/components/orders/OrderCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DateRange } from 'react-day-picker';
import { filterAndSortOrders } from '@/lib/order-utils';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SortSelect } from '@/components/orders/SortSelect';
import { OrderAnalyticsDashboard } from '@/components/analytics/OrderAnalyticsDashboard';
import { OrdersDashboardHelp } from '@/components/dispensary-admin/OrdersDashboardHelp';

export default function DispensaryOrdersPage() {
  const { currentUser, currentDispensary, isDispensaryOwner } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shippingStatusFilter, setShippingStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>();
  const [sortBy, setSortBy] = useState('date_desc');

  const shippingStatuses = [
    { value: 'all', label: 'All Shipping Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Real-time subscription to orders collection
  useEffect(() => {
    if (!currentUser?.dispensaryId) return;

    setIsLoading(true);
    
    // Set up real-time listener
    const ordersRef = collection(db, 'orders');
    const baseQuery = query(
      ordersRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        console.log('Real-time update:', snapshot.docs.length, 'documents found');
        
        const fetchedOrders = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Order data structure:', {
            id: doc.id,
            hasShipments: !!data.shipments,
            shipmentKeys: Object.keys(data.shipments || {}),
            status: data.status,
            createdAt: data.createdAt,
            customerDetails: data.customerDetails,
            shippingAddress: data.shippingAddress,
            shipments: data.shipments
          });
          return {
            id: doc.id,
            ...data
          } as Order;
        });
        console.log('Fetched orders:', fetchedOrders.length, 'orders processed');

        // For owners, show all orders. For staff, only show orders for their dispensary
        const relevantOrders = isDispensaryOwner
          ? fetchedOrders // Show all orders for owners
          : fetchedOrders.filter(order => {
              // For staff, only show orders with shipments for their dispensary
              const hasRelevantShipment = Object.values(order.shipments || {}).some(
                shipment => shipment.dispensaryId === currentUser.dispensaryId
              );
              return hasRelevantShipment;
            });
        
        console.log('Relevant orders after dispensary filtering:', relevantOrders.length);
        console.log('Current user dispensary ID:', currentUser?.dispensaryId);
        console.log('Is dispensary owner:', isDispensaryOwner);

        setOrders(relevantOrders);
        
        // Apply initial filtering and sorting
        const filtered = filterAndSortOrders(relevantOrders, {
          searchTerm,
          statusFilter,
          shippingStatusFilter,
          dateRange,
          sortBy,
          dispensaryId: currentUser.dispensaryId!
        });
        console.log('Orders after filtering:', filtered.length);
        console.log('Applied filters:', { 
          searchTerm, 
          statusFilter, 
          shippingStatusFilter, 
          dateRange, 
          sortBy 
        });
        
        setFilteredOrders(filtered);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error in real-time orders subscription:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to sync orders. Retrying...',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [currentUser?.dispensaryId, isDispensaryOwner, toast, searchTerm, statusFilter, shippingStatusFilter, dateRange, sortBy]);

  // Single, optimized filter implementation
  useEffect(() => {
    if (!currentUser?.dispensaryId) return;
    
    let filtered = [...orders];
    
    // Apply all filters in a single pass
    filtered = filtered.filter(order => {
      const orderShipments = Object.values(order.shipments);
      const relevantShipment = orderShipments.find(
        shipment => shipment.dispensaryId === currentUser.dispensaryId
      );

      if (!relevantShipment) return false;

      // Status filter
      if (statusFilter !== 'all' && relevantShipment.status !== statusFilter) {
        return false;
      }

      // Shipping status filter
      if (shippingStatusFilter !== 'all' && relevantShipment.status !== shippingStatusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerDetails.name.toLowerCase().includes(searchLower) ||
          order.customerDetails.email.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (dateRange?.from) {
        const orderDate = order.createdAt.toDate();
        if (dateRange.to) {
          if (!(orderDate >= dateRange.from && orderDate <= dateRange.to)) {
            return false;
          }
        } else if (!(orderDate >= dateRange.from)) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return a.createdAt.toMillis() - b.createdAt.toMillis();
        case 'date_desc':
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, shippingStatusFilter, dateRange, sortBy, currentUser?.dispensaryId]);

  // Update selectedOrder when orders change (for real-time updates)
  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updatedOrder = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrder) {
        console.log('Updating selected order with fresh data:', {
          orderId: updatedOrder.id,
          trackingNumbers: Object.values(updatedOrder.shipments || {}).map(s => s.trackingNumber)
        });
        setSelectedOrder(updatedOrder);
      }
    }
  }, [orders, selectedOrder?.id]);

  const updateOrderStatus = async (orderId: string, dispensaryId: string, newStatus: ShippingStatus) => {
    try {
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      const orderRef = doc(db, 'orders', orderId);
      const timestamp = Timestamp.fromDate(new Date());
      
      const orderSnapshot = await getDoc(orderRef);
      if (!orderSnapshot.exists()) {
        throw new Error('Order not found');
      }
      
      const currentOrder = orderSnapshot.data() as Order;
      
      // Initialize shipment object if it doesn't exist
      const shipment = currentOrder.shipments?.[dispensaryId] || {
        dispensaryId,
        items: [],
        status: 'pending' as ShippingStatus,
        createdAt: timestamp,
        statusHistory: []
      };
      
      const currentHistory = shipment.statusHistory || [];
      const newHistoryEntry = {
        status: newStatus,
        timestamp,
        updatedBy: currentUser.uid
      };

      // Update local state first for immediate UI feedback
      const updatedOrder = {
        ...currentOrder,
        id: orderId,
        shipments: {
          ...currentOrder.shipments,
          [dispensaryId]: {
            ...shipment,
            status: newStatus,
            lastStatusUpdate: timestamp,
            statusHistory: [...currentHistory, newHistoryEntry]
          }
        }
      } as Order;

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? updatedOrder : order
        )
      );

      // Update selectedOrder if it's the one being modified
      setSelectedOrder(prev => 
        prev?.id === orderId ? updatedOrder : prev
      );

      // Update in database - ensure shipment structure exists
      await updateDoc(orderRef, {
        [`shipments.${dispensaryId}.dispensaryId`]: dispensaryId,
        [`shipments.${dispensaryId}.status`]: newStatus,
        [`shipments.${dispensaryId}.lastStatusUpdate`]: timestamp,
        [`shipments.${dispensaryId}.statusHistory`]: [...currentHistory, newHistoryEntry],
        updatedAt: timestamp
      });

      toast({
        title: 'Status Updated',
        description: 'Order status has been successfully updated.',
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      // No need to manually refetch - real-time listener will handle updates
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update order status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Package2 className="h-6 w-6 text-primary" />
                Manage Orders
              </CardTitle>
              <CardDescription>
                View and manage all orders for {currentDispensary?.dispensaryName}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <OrdersDashboardHelp />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
                    <DialogTitle className="text-xl">Order Analytics Dashboard</DialogTitle>
                    <DialogDescription>
                      Comprehensive overview of your order and shipping performance
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <OrderAnalyticsDashboard />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <OrderFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            shippingStatusFilter={shippingStatusFilter}
            onShippingStatusChange={setShippingStatusFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </CardContent>
      </Card>

      <BulkActions
        selectedOrders={selectedOrders}
        onSelectionChange={setSelectedOrders}
        orders={filteredOrders}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => setSelectedOrder(order)}
              selected={selectedOrders.some(selected => selected.id === order.id)}
              onSelect={(orderId) => {
                const isSelected = selectedOrders.some(selected => selected.id === orderId);
                if (isSelected) {
                  setSelectedOrders(selectedOrders.filter(selected => selected.id !== orderId));
                } else {
                  const orderToAdd = filteredOrders.find(o => o.id === orderId);
                  if (orderToAdd) {
                    setSelectedOrders([...selectedOrders, orderToAdd]);
                  }
                }
              }}
              showSelection={true}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No orders found matching your criteria.
          </div>
        )}
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open: boolean) => !open && setSelectedOrder(null)}
        onUpdateStatus={updateOrderStatus}
        isDispensaryView={true}
      />
    </div>
  );
}