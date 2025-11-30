'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Printer, Truck, CheckCircle, AlertTriangle, Loader2, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PODStatus } from '@/types/creator-lab';

interface TreehouseOrder {
  id: string;
  orderNumber: string;
  items: any[];
  customerName: string;
  customerEmail: string;
  shippingAddress: any;
  orderType: 'treehouse';
  podStatus: PODStatus;
  orderDate: any;
  totalAmount: number;
  platformRevenue: number;
  creatorCommissions: number;
  trackingNumber?: string;
  createdAt: any;
}

export default function TreehouseOrdersPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<TreehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'This page is for Super Admins only.',
        variant: 'destructive',
      });
      router.replace('/');
    } else if (!authLoading && isSuperAdmin) {
      loadOrders();
    }
  }, [authLoading, isSuperAdmin]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let ordersQuery = query(
        collection(db, 'orders'),
        where('orderType', '==', 'treehouse'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(ordersQuery);
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TreehouseOrder[];

      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading Treehouse orders:', error);
      toast({
        title: 'Failed to Load Orders',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: PODStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        podStatus: newStatus,
        updatedAt: new Date(),
      });

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, podStatus: newStatus } : order
        )
      );

      toast({
        title: 'Status Updated',
        description: `Order status changed to ${newStatus.replace('_', ' ')}`,
      });

      // If shipped, trigger creator earnings update
      if (newStatus === 'shipped') {
        // In production, call a Cloud Function to process earnings
        // await processSaleEarnings(orderId);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update order status.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: PODStatus) => {
    const statusConfig = {
      pending_print: { label: 'Pending Print', className: 'bg-yellow-500', icon: Package },
      printing: { label: 'Printing', className: 'bg-blue-500', icon: Printer },
      printed: { label: 'Printed', className: 'bg-purple-500', icon: CheckCircle },
      packaging: { label: 'Packaging', className: 'bg-indigo-500', icon: Package },
      shipped: { label: 'Shipped', className: 'bg-green-600', icon: Truck },
      delivered: { label: 'Delivered', className: 'bg-green-700', icon: CheckCircle },
      cancelled: { label: 'Cancelled', className: 'bg-red-500', icon: AlertTriangle },
    };

    const config = statusConfig[status] || statusConfig.pending_print;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} text-white font-bold`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((order) => order.podStatus === statusFilter);

  if (authLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[#006B3E]/10">
              <Printer className="h-12 w-12 text-[#006B3E]" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-[#3D2E17]">Treehouse POD Orders</h1>
              <p className="text-lg text-[#5D4E37] font-semibold mt-1">
                Print-on-Demand Management
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-[#006B3E] bg-[#006B3E]/5">
          <CardContent className="p-6">
            <p className="text-sm text-[#5D4E37] font-semibold">Total Orders</p>
            <p className="text-3xl font-extrabold text-[#006B3E]">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500 bg-yellow-50">
          <CardContent className="p-6">
            <p className="text-sm text-[#5D4E37] font-semibold">Pending Print</p>
            <p className="text-3xl font-extrabold text-yellow-600">
              {orders.filter((o) => o.podStatus === 'pending_print').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-500 bg-blue-50">
          <CardContent className="p-6">
            <p className="text-sm text-[#5D4E37] font-semibold">In Progress</p>
            <p className="text-3xl font-extrabold text-blue-600">
              {orders.filter((o) => ['printing', 'printed', 'packaging'].includes(o.podStatus)).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-600 bg-green-50">
          <CardContent className="p-6">
            <p className="text-sm text-[#5D4E37] font-semibold">Platform Revenue (75%)</p>
            <p className="text-3xl font-extrabold text-green-600">
              R{orders.reduce((sum, o) => sum + (o.platformRevenue || 0), 0).toFixed(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-64 border-[#5D4E37] font-semibold">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending_print">Pending Print</SelectItem>
            <SelectItem value="printing">Printing</SelectItem>
            <SelectItem value="printed">Printed</SelectItem>
            <SelectItem value="packaging">Packaging</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-[#006B3E] mx-auto mb-4" />
          <p className="text-[#5D4E37] font-semibold">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="border-[#5D4E37]">
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-[#5D4E37]/30 mx-auto mb-4" />
            <h3 className="text-xl font-extrabold text-[#3D2E17] mb-2">No orders found</h3>
            <p className="text-[#5D4E37] font-semibold">
              {statusFilter === 'all'
                ? 'No Treehouse orders yet'
                : `No orders with status: ${statusFilter.replace('_', ' ')}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border-[#5D4E37]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-extrabold text-[#3D2E17]">
                      Order #{order.orderNumber}
                    </CardTitle>
                    <CardDescription className="text-[#5D4E37] font-semibold">
                      {new Date(order.orderDate?.seconds * 1000 || Date.now()).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(order.podStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-extrabold text-[#3D2E17] mb-2">Customer</h4>
                    <p className="text-[#5D4E37] font-semibold">{order.customerName}</p>
                    <p className="text-sm text-[#5D4E37] font-semibold">{order.customerEmail}</p>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#3D2E17] mb-2">Shipping Address</h4>
                    <p className="text-sm text-[#5D4E37] font-semibold">
                      {order.shippingAddress?.streetAddress}<br />
                      {order.shippingAddress?.city}, {order.shippingAddress?.province}<br />
                      {order.shippingAddress?.postalCode}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-extrabold text-[#3D2E17] mb-3">Items to Print</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.items?.map((item: any, index: number) => (
                      <div key={index} className="flex gap-4 p-3 bg-black rounded-lg">
                        <div className="flex-shrink-0 w-24 h-24 bg-black rounded flex items-center justify-center">
                          <img
                            src={item.imageUrl || item.designImageUrl}
                            alt={item.name}
                            className="max-w-[70%] max-h-[70%] object-contain"
                          />
                        </div>
                        <div className="flex-grow">
                          <p className="font-bold text-white">{item.apparelType || item.name}</p>
                          <p className="text-sm text-white/70">Quantity: {item.quantity}</p>
                          <p className="text-sm text-white/70">Black color</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="bg-[#5D4E37]/5 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-[#5D4E37] font-semibold">Total Sale</p>
                      <p className="text-xl font-extrabold text-[#3D2E17]">R{order.totalAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#5D4E37] font-semibold">Platform (75%)</p>
                      <p className="text-xl font-extrabold text-[#006B3E]">R{order.platformRevenue}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#5D4E37] font-semibold">Creators (25%)</p>
                      <p className="text-xl font-extrabold text-green-600">R{order.creatorCommissions}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  {order.podStatus === 'pending_print' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'printing')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Start Printing
                    </Button>
                  )}
                  {order.podStatus === 'printing' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'printed')}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Printed
                    </Button>
                  )}
                  {order.podStatus === 'printed' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'packaging')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Packaging
                    </Button>
                  )}
                  {order.podStatus === 'packaging' && (
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'shipped')}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      Mark as Shipped
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
