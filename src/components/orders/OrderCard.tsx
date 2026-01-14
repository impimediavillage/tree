import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from 'firebase/firestore';
import type { Order, OrderItem, OrderStatus } from "@/types/order";
import type { OrderShipment, ShippingStatus } from "@/types/shipping";
import { formatCurrency } from "@/lib/utils";
import { ArrowRight, Clock, Package2, User, Truck, MapPin, Package, ShoppingBag, Star, Navigation } from "lucide-react";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Dispensary } from '@/types';
import { useRouter } from 'next/navigation';

// Helper to safely get locker properties
const getLockerProp = (locker: any, prop: string): string | null => {
  if (!locker || typeof locker !== 'object') return null;
  const value = locker[prop];
  
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Try to extract string value from nested object
    if ('id' in value && (typeof value.id === 'string' || typeof value.id === 'number')) {
      return String(value.id);
    }
  }
  return null;
};

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
  // In-house delivery statuses
  claimed_by_driver: "text-blue-500",
  en_route: "text-purple-500",
  nearby: "text-orange-500",
  arrived: "text-green-500",
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
  // In-house delivery statuses
  claimed_by_driver: "Driver assigned",
  en_route: "Driver on the way",
  nearby: "Driver nearby",
  arrived: "Driver arrived",
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
  onRateExperience?: (order: Order) => void;
  onUpdateStatus?: (orderId: string, dispensaryId: string, newStatus: ShippingStatus) => Promise<void>;
  isDispensaryView?: boolean;
}

export function OrderCard({ order, onClick, selected = false, onSelect, showSelection = false, onRateExperience, onUpdateStatus, isDispensaryView = false }: OrderCardProps) {
  const router = useRouter();
  const [dispensaries, setDispensaries] = useState<Record<string, { name: string; type: string; storeImage?: string | null; storeIcon?: string | null; }>>({});
  const [isLoadingDispensaries, setIsLoadingDispensaries] = useState(true);

  // Check if order has active in-house delivery for live tracking
  const hasLiveTracking = Object.values(order.shipments || {}).some(
    (shipment) =>
      shipment.shippingProvider === 'in_house' &&
      ['picked_up', 'out_for_delivery', 'claimed_by_driver'].includes(shipment.status)
  );

  // Fetch dispensary details for all shipments in this order
  useEffect(() => {
    const fetchDispensaries = async () => {
      const dispensaryIds = Object.keys(order.shipments || {});
      if (dispensaryIds.length === 0) {
        setIsLoadingDispensaries(false);
        return;
      }

      const dispensaryData: Record<string, any> = {};
      
      await Promise.all(
        dispensaryIds.map(async (dispensaryId) => {
          try {
            const dispensaryRef = doc(db, 'dispensaries', dispensaryId);
            const dispensarySnap = await getDoc(dispensaryRef);
            
            if (dispensarySnap.exists()) {
              const data = dispensarySnap.data() as Dispensary;
              dispensaryData[dispensaryId] = {
                name: data.dispensaryName || 'Unknown Dispensary',
                type: data.dispensaryType || 'general',
                storeImage: data.storeImage || null,
                storeIcon: data.storeIcon || null,
              };
            }
          } catch (error) {
            console.error(`Error fetching dispensary ${dispensaryId}:`, error);
          }
        })
      );

      setDispensaries(dispensaryData);
      setIsLoadingDispensaries(false);
    };

    fetchDispensaries();
  }, [order.id, order.shipments]);

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
      <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            {showSelection && (
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 ${selected ? 'bg-primary border-primary' : 'border-muted-foreground'} flex items-center justify-center transition-colors flex-shrink-0`}>
                {selected && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            )}
            <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Package2 className="h-6 w-6 sm:h-7 sm:w-7 text-[#006B3E] flex-shrink-0" />
                <span className="text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17] truncate">#{order.orderNumber || 'No Number'}</span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#006B3E]">{formatCurrency(order.total || 0)}</p>
              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate font-bold">{orderDate}</span>
              </div>
            </div>
          </div>
          <Badge 
            variant={
              order.status === 'delivered' ? 'default' :
              order.status === 'cancelled' ? 'destructive' :
              'secondary'
            }
            className="text-[10px] sm:text-xs font-extrabold flex-shrink-0"
          >
            {statusDescriptions[order.status as keyof typeof statusDescriptions] || statusDescriptions.pending}
          </Badge>
        </div>

        {/* Customer Info */}
        {order.customerDetails && (
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gradient-to-r from-muted/80 to-muted/50 rounded-lg border border-border/30">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#006B3E]/10 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 sm:h-6 sm:w-6 text-[#006B3E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-[#3D2E17] truncate">{order.customerDetails.name}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-bold">{order.customerDetails.email}</p>
            </div>
          </div>
        )}

        {/* Dispensary Info */}
        {!isLoadingDispensaries && Object.keys(dispensaries).map((dispensaryId) => {
          const dispData = dispensaries[dispensaryId];
          if (!dispData) return null;

          const logoUrl = dispData.storeIcon || dispData.storeImage;
          const dispensaryName = dispData.name;
          const dispensaryType = dispData.type;
          
          return (
            <div key={dispensaryId} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-sm">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-green-300 dark:border-green-700 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt={dispensaryName} className="h-full w-full object-cover" />
                ) : (
                  <Package2 className="h-5 w-5 sm:h-7 sm:w-7 text-[#006B3E]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">{dispensaryType} Dispensary</p>
                <p className="text-xs sm:text-sm font-extrabold text-[#3D2E17] dark:text-white truncate">{dispensaryName}</p>
              </div>
            </div>
          );
        })}

        {/* Product Details */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#3D2E17]">
            <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-[#006B3E]" />
            <span>Products ({totalItems} items)</span>
          </div>
          <div className="space-y-1 sm:space-y-2 pl-6 sm:pl-7">
            {order.items?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs sm:text-sm gap-2">
                {item.productType === 'THC' ? (
                  <div className="flex-1 truncate">
                    <div className="text-muted-foreground font-bold">{item.name}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground/80 mt-0.5 font-bold">
                      {item.quantity} FREE {item.unit}{item.quantity > 1 ? 's' : ''} {item.originalName}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground truncate flex-1 font-bold">
                    {item.quantity}x {item.name}
                  </span>
                )}
                <span className="font-extrabold ml-2 flex-shrink-0 text-[#006B3E]">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            {order.items && order.items.length > 3 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground italic font-bold">
                +{order.items.length - 3} more items
              </p>
            )}
          </div>
        </div>

        {/* Shipping Method */}
        <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-[#006B3E]/10 to-[#006B3E]/5 rounded-lg border-2 border-[#006B3E]/20">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-[#006B3E]/20 flex items-center justify-center flex-shrink-0">
            <Truck className="h-4 w-4 sm:h-6 sm:w-6 text-[#006B3E]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs font-extrabold text-muted-foreground mb-1">Shipping Method</p>
            <p className="text-xs sm:text-sm font-extrabold text-[#3D2E17] line-clamp-2">{getShippingTypeLabel(shippingMethod)}</p>
            {shippingMethod?.delivery_time && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 font-bold">
                Est. delivery: {shippingMethod.delivery_time}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold">Shipping</p>
            <p className="text-xs sm:text-sm font-extrabold text-[#006B3E]">{formatCurrency(order.shippingCost || order.shippingTotal || 0)}</p>
          </div>
        </div>

        {/* Locker Information (for PUDO deliveries) */}
        {Object.values(order.shipments || {}).some(s => s.originLocker || s.destinationLocker) && (
          <div className="space-y-2 sm:space-y-3">
            {Object.values(order.shipments || {}).map((shipment, idx) => {
              if (!shipment.originLocker && !shipment.destinationLocker) return null;
              
              const method = shipment.shippingMethod?.service_level?.toLowerCase() || '';
              const showOrigin = method.includes('ltd') || method.includes('ltl') || method.includes('l2d') || method.includes('l2l');
              const showDestination = method.includes('dtl') || method.includes('ltl') || method.includes('d2l') || method.includes('l2l');
              
              return (
                <div key={idx} className="space-y-2">
                  {showOrigin && shipment.originLocker && typeof shipment.originLocker === 'object' && (
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg shadow-md">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs font-extrabold text-blue-900 uppercase tracking-wide mb-1">Origin Locker</p>
                          {(() => {
                            const name = getLockerProp(shipment.originLocker, 'name');
                            const address = getLockerProp(shipment.originLocker, 'address');
                            const id = getLockerProp(shipment.originLocker, 'id');
                            
                            return (
                              <>
                                {name && <p className="text-xs sm:text-sm font-extrabold text-blue-900 truncate">{name}</p>}
                                {address && <p className="text-[10px] sm:text-xs text-blue-700 mt-1 truncate">{address}</p>}
                                {id && <p className="text-[10px] sm:text-xs text-blue-600 mt-1 font-mono font-bold">ID: {id}</p>}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {showDestination && shipment.destinationLocker && typeof shipment.destinationLocker === 'object' && (
                    <div className="p-2 sm:p-3 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-lg shadow-md">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] sm:text-xs font-extrabold text-green-900 uppercase tracking-wide mb-1">Destination Locker</p>
                          {(() => {
                            const name = getLockerProp(shipment.destinationLocker, 'name');
                            const address = getLockerProp(shipment.destinationLocker, 'address');
                            const id = getLockerProp(shipment.destinationLocker, 'id');
                            
                            return (
                              <>
                                {name && <p className="text-base font-bold text-green-900 truncate">{name}</p>}
                                {address && <p className="text-xs text-green-700 mt-1 truncate">{address}</p>}
                                {id && <p className="text-[10px] sm:text-xs text-green-600 mt-1 font-mono font-bold">ID: {id}</p>}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Shipment Status */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#3D2E17]">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-[#006B3E]" />
            <span>Shipment Status</span>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {Object.entries(order.shipments || {}).map(([dispensaryId, shipment], idx) => {
              const status = shipment.status || 'pending';
              const statusColor = statusColors[status as keyof typeof statusColors] || statusColors.pending;
              const isInHouseDelivery = shipment.shippingProvider === 'in_house';
              const driverAssigned = shipment.driverId && shipment.driverName;
              
              return (
                <div key={dispensaryId} className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-muted/80 to-muted/50 border-2 border-border/50 space-y-2 shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-[#3D2E17]">Shipment {idx + 1}</span>
                    <Badge variant="outline" className={`${statusColor} font-extrabold text-[10px] sm:text-xs`}>
                      {status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {/* Driver Info for In-House Deliveries */}
                  {isInHouseDelivery && driverAssigned && (
                    <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Navigation className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Driver Assigned</p>
                        <p className="text-xs font-extrabold text-blue-900 dark:text-blue-100 truncate">{shipment.driverName}</p>
                      </div>
                      {['picked_up', 'en_route', 'nearby'].includes(status) && (
                        <Badge className="bg-blue-500 text-white text-[10px] font-bold animate-pulse flex-shrink-0">
                          En Route
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Waiting for Driver (In-House, no driver yet) */}
                  {isInHouseDelivery && !driverAssigned && status === 'ready_for_pickup' && (
                    <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <Truck className="h-5 w-5 text-purple-600 flex-shrink-0 animate-bounce" />
                      <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                        Waiting for driver to claim...
                      </p>
                    </div>
                  )}
                  {shipment.trackingNumber && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pt-2 border-t border-border/30">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-bold">Tracking:</span>
                      <span className="text-[10px] sm:text-xs font-mono font-extrabold text-[#3D2E17] break-all">
                        {shipment.trackingNumber.length > 20 
                          ? `${shipment.trackingNumber.slice(0, 20)}...` 
                          : shipment.trackingNumber}
                      </span>
                    </div>
                  )}
                  {shipment.accessCode && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 pt-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-bold">Access Code:</span>
                      <span className="text-xs sm:text-sm font-mono font-extrabold text-[#006B3E]">
                        {shipment.accessCode}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Action Buttons for Dispensary View */}
        {isDispensaryView && onUpdateStatus && Object.entries(order.shipments || {}).some(([_, shipment]) => 
          shipment.shippingProvider === 'in_house' && ['processing', 'ready_for_pickup', 'picked_up', 'en_route'].includes(shipment.status || '')
        ) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#3D2E17]">
              <Package2 className="h-4 w-4 text-[#006B3E]" />
              <span>Quick Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(order.shipments || {}).map(([dispensaryId, shipment]) => {
                if (shipment.shippingProvider !== 'in_house') return null;
                
                const status = shipment.status || 'pending';
                const buttons = [];
                
                // When order is processing and shipment is pending/ready → allow marking as Ready for Pickup
                if (order.status === 'processing' && (status === 'pending' || status === 'ready_for_shipping')) {
                  buttons.push(
                    <Button
                      key="ready"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(order.id, dispensaryId, 'ready_for_pickup');
                      }}
                      className="text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 hover:from-indigo-100 hover:to-purple-100"
                    >
                      <Package2 className="mr-1 h-3 w-3" />
                      Mark Ready for Pickup
                    </Button>
                  );
                }
                
                return buttons.length > 0 ? buttons : null;
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t-2 border-border/50">
          {hasLiveTracking && (
            <Button 
              variant="default" 
              size="lg" 
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/orders/${order.id}/track`);
              }}
              className="flex-1 font-extrabold border-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm animate-pulse"
            >
              <Navigation className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Track Live 📍</span>
              <span className="sm:hidden">Track</span>
            </Button>
          )}
          {order.status === 'delivered' && onRateExperience && (
            <Button 
              variant="outline" 
              size="lg" 
              onClick={(e) => {
                e.stopPropagation();
                onRateExperience(order);
              }}
              className="flex-1 font-extrabold border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 text-yellow-900 hover:text-yellow-950 text-sm"
            >
              <Star className="mr-2 h-4 w-4 sm:h-5 sm:w-5 fill-yellow-400 text-yellow-600" />
              <span className="hidden sm:inline">Rate Experience</span>
              <span className="sm:hidden">Rate</span>
            </Button>
          )}
          <Button 
            variant="default" 
            size="lg" 
            onClick={onClick} 
            className={`font-extrabold text-sm sm:text-base ${(order.status === 'delivered' && onRateExperience) || hasLiveTracking ? '' : 'w-full'}`}
          >
            View Details <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}