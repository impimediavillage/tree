'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrderStatusUpdate } from './OrderStatusUpdate';
import { Package, MapPin, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import type { Order, OrderItem } from '@/types/order';

interface OrderDetailsProps {
  order: Order;
  onStatusUpdate: () => void;
  dispensaryId: string;
}

export function OrderDetails({ order, onStatusUpdate, dispensaryId }: OrderDetailsProps) {
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const statusColors: Record<string, string> = {
    'pending': 'bg-yellow-500',
    'processing': 'bg-blue-500',
    'ready_for_pickup': 'bg-purple-500',
    'picked_up': 'bg-indigo-500',
    'shipped': 'bg-purple-500',
    'out_for_delivery': 'bg-indigo-500',
    'delivered': 'bg-green-500',
    'cancelled': 'bg-red-500'
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Order #{order.orderNumber}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Placed on {order.createdAt?.toDate().toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={statusColors[order.status]}>
                {order.status.toUpperCase()}
              </Badge>
              <Button onClick={() => setShowStatusDialog(true)}>
                Update Status
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="text-sm break-words">{order.customerDetails.phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="text-sm break-all">{order.customerDetails.email}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="text-sm break-words">
                  {order.shippingAddress.streetAddress}<br />
                  {order.shippingAddress.suburb}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.province}<br />
                  {order.shippingAddress.postalCode}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R {(order.total - order.shippingCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>R {order.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>R {order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item: OrderItem) => (
              <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-3">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  {item.imageUrl && (
                    <div className="w-16 h-16 relative rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                    </p>
                    {item.strain && (
                      <p className="text-sm text-muted-foreground">
                        Strain: {item.strain}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right w-full sm:w-auto">
                  <p className="font-medium text-sm">R {item.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Total: R {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shipping Information */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Shipping Method</h4>
                <p className="text-sm">{Object.values(order.shipments || {})[0]?.shippingMethod?.name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{Object.values(order.shipments || {})[0]?.shippingMethod?.courier_name || ''}</p>
              </div>
              {Object.values(order.shipments || {})[0]?.trackingNumber && (
                <div>
                  <h4 className="font-medium mb-2">Tracking Information</h4>
                  <p className="text-sm break-all">Tracking #: {Object.values(order.shipments || {})[0].trackingNumber}</p>
                  {Object.values(order.shipments || {})[0].trackingUrl && (
                    <Button variant="link" className="px-0" asChild>
                      <a href={Object.values(order.shipments || {})[0].trackingUrl || ''} target="_blank" rel="noopener noreferrer">
                        Track Shipment <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Status Timeline */}
            <div className="mt-6">
              <h4 className="font-medium mb-4">Status History</h4>
              <div className="relative space-y-4">
                <div className="absolute left-2.5 top-2.5 h-full w-0.5 bg-border"></div>
                {order.statusHistory?.map((status: any, index: number) => (
                  <div key={index} className="relative pl-8">
                    <div className="absolute left-0 rounded-full bg-background border-2 border-primary w-5 h-5"></div>
                    <div>
                      <p className="font-medium">{status.status}</p>
                      <p className="text-sm text-muted-foreground">
                        {status.timestamp.toDate().toLocaleString()}
                      </p>
                      {status.message && (
                        <p className="text-sm mt-1">{status.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <OrderStatusUpdate
            orderId={order.orderNumber}
            dispensaryId={dispensaryId}
            currentStatus={order.status}
            onStatusUpdate={() => {
              onStatusUpdate();
              setShowStatusDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}