import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from 'firebase/firestore';
import type { Order, OrderItem, OrderStatus } from "@/types/order";
import type { OrderShipment, ShippingStatus } from "@/types/shipping";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Clock, Package2, User, Truck, MapPin, Package, ShoppingBag } from "lucide-react";

const statusColors: Record<OrderStatus | ShippingStatus, string> = {
  // Order statuses
  pending: "text-yellow-500",
  pending_payment: "text-yellow-500",
  paid: "text-green-500",
  processing: "text-blue-500",
  ready_for_shipping: "text-blue-500",
  label_generated: "text-purple-500",
  ready_for_pickup: "text-indigo-500",
  picked_up: "text-purple-500",
  shipped: "text-indigo-500",
  in_transit: "text-indigo-500",
  out_for_delivery: "text-purple-500",
  delivered: "text-green-500",
  cancelled: "text-red-500",
  failed: "text-red-500",
  returned: "text-red-500"
} as const;

const statusDescriptions: Record<OrderStatus | ShippingStatus, string> = {
  // Order statuses
  pending: "Order placed",
  pending_payment: "Awaiting payment",
  paid: "Payment received",
  processing: "Being prepared",
  ready_for_shipping: "Ready to ship",
  label_generated: "Label generated",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  shipped: "Shipped",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
  returned: "Returned"
} as const;

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  selected?: boolean;
  onSelect?: (orderId: string) => void;
  showSelection?: boolean;
}

export function OrderCard({ order, onClick, selected = false, onSelect, showSelection = false }: OrderCardProps) {
  console.log('Rendering OrderCard with order:', {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    hasShipments: !!order.shipments,
    shipmentKeys: Object.keys(order.shipments || {}),
    hasCustomerDetails: !!order.customerDetails,
    customerDetails: order.customerDetails
  });
  // Count total items across all shipments
  const totalItems = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  
  // Get first shipment for shipping method display
  const firstShipment = Object.values(order.shipments || {})[0];
  const shippingMethod = firstShipment?.shippingMethod;

  // Format date
  const orderDate = order.createdAt instanceof Timestamp
    ? order.createdAt.toDate().toLocaleDateString('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date not available';
  
  // Get shipping type label
  const getShippingTypeLabel = (method: any) => {
    if (!method) return 'Not specified';
    
    const provider = method.provider || firstShipment?.shippingProvider;
    const courierName = (method.courier_name || '').toLowerCase();
    const serviceLevel = (method.service_level || '').toLowerCase();
    const name = method.courier_name || method.name || '';
    
    // Check for PUDO by courier_name or service_level patterns (handles malformed provider data)
    if (courierName === 'pudo' || 
        serviceLevel.includes('l2l') || 
        serviceLevel.includes('ltl') || 
        serviceLevel.includes('ltd') || 
        serviceLevel.includes('dtl') ||
        serviceLevel.includes('d2l') ||
        serviceLevel.includes('l2d') ||
        provider === 'pudo') {
      return `🔒 PUDO Locker - ${name}`;
    }
    
    if (provider === 'shiplogic') return `🚚 ${name}`;
    if (provider === 'in_house') return '🏪 In-house Delivery';
    if (provider === 'collection') return '📍 Collection';
    return name || 'Standard Shipping';
  };

  return (
    <div 
      className={`group rounded-xl border-2 bg-card text-card-foreground shadow-lg hover:shadow-xl hover:border-primary/50 transition-all duration-200 ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
      onClick={() => onSelect && showSelection ? onSelect(order.id) : onClick?.()}
    >
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {showSelection && (
              <div className={`w-6 h-6 rounded-md border-2 ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'} flex items-center justify-center transition-colors`}>
                {selected && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-primary-foreground">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Package2 className="h-7 w-7 text-green-800" />
                <span className="text-xl font-bold">#{order.orderNumber || 'No Number'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {orderDate}
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <p className="text-2xl font-bold text-primary">{formatCurrency(order.total || 0)}</p>
            <Badge 
              variant={
                order.status === 'delivered' ? 'default' :
                order.status === 'cancelled' ? 'destructive' :
                'secondary'
              }
              className="text-xs font-semibold"
            >
              {statusDescriptions[order.status as keyof typeof statusDescriptions] || statusDescriptions.pending}
            </Badge>
          </div>
        </div>

        {/* Customer Info */}
        {order.customerDetails && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-green-800" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{order.customerDetails.name}</p>
              <p className="text-xs text-muted-foreground truncate">{order.customerDetails.email}</p>
            </div>
          </div>
        )}

        {/* Product Details */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="h-6 w-6 text-green-800" />
            <span>Products ({totalItems} items)</span>
          </div>
          <div className="space-y-2 pl-7">
            {order.items?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground truncate flex-1">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium ml-2">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            {order.items && order.items.length > 3 && (
              <p className="text-xs text-muted-foreground italic">
                +{order.items.length - 3} more items
              </p>
            )}
          </div>
        </div>

        {/* Shipping Method */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Truck className="h-6 w-6 text-green-800" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1">Shipping Method</p>
            <p className="text-sm font-semibold">{getShippingTypeLabel(shippingMethod)}</p>
            {shippingMethod?.delivery_time && (
              <p className="text-xs text-muted-foreground mt-1">
                Est. delivery: {shippingMethod.delivery_time}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Shipping</p>
            <p className="text-sm font-bold">{formatCurrency(order.shippingCost || order.shippingTotal || 0)}</p>
          </div>
        </div>

        {/* Shipment Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-6 w-6 text-green-800" />
            <span>Shipment Status</span>
          </div>
          <div className="space-y-3">
            {Object.entries(order.shipments || {}).map(([dispensaryId, shipment], idx) => {
              const status = shipment.status || 'pending';
              const statusColor = statusColors[status as keyof typeof statusColors] || statusColors.pending;
              
              return (
                <div key={dispensaryId} className="p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Shipment {idx + 1}</span>
                    <Badge variant="outline" className={`${statusColor} font-semibold`}>
                      {status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {shipment.trackingNumber && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Tracking:</span>
                      <span className="text-xs font-mono font-medium text-foreground">
                        {shipment.trackingNumber.length > 15 
                          ? `${shipment.trackingNumber.slice(0, 15)}...` 
                          : shipment.trackingNumber}
                      </span>
                    </div>
                  )}
                  {shipment.accessCode && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">Access Code:</span>
                      <span className="text-xs font-mono font-bold text-primary">
                        {shipment.accessCode}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t-2">
          <Button variant="default" size="lg" onClick={onClick} className="font-semibold">
            View Details <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}