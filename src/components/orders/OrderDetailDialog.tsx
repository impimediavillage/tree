import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Order, OrderItem } from "@/types/order";
import type { OrderShipment, ShippingStatus } from "@/types/shipping";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { OrderStatusManagement } from "./OrderStatusManagement";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, PackageCheck, RefreshCw, Truck, FileText, Archive, Copy, ExternalLink, CheckCircle2, MessageSquare, Package2, User, Phone, ShoppingBag, Package, Printer } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateOrderStatus } from "@/lib/orders";
import { PDFViewer } from "@react-pdf/renderer";
import { LabelGenerationDialog } from "@/components/dispensary-admin/LabelGenerationDialog";
import { useAuth } from "@/contexts/AuthContext";
import { OrderNotes } from "./OrderNotes";
import { Badge } from "@/components/ui/badge";

interface OrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus?: (orderId: string, dispensaryId: string, newStatus: ShippingStatus) => Promise<void>;
  isDispensaryView?: boolean;
}

// Helper function to safely extract string values from potentially nested objects
const getStringValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // For objects, try to extract meaningful value
    // First check if it has an 'id' property (common for references)
    if ('id' in value && (typeof value.id === 'string' || typeof value.id === 'number')) {
      return String(value.id);
    }
    // If it's a plain object, we can't convert it safely
    console.warn('Attempted to extract string from object without clear string representation:', value);
    return '';
  }
  return '';
};

// Helper to safely get locker properties with number support
const getLockerProp = (locker: any, prop: string): string | number | null => {
  if (!locker || typeof locker !== 'object') return null;
  const value = locker[prop];
  
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    // Try to extract string value from nested object
    return getStringValue(value) || null;
  }
  return null;
};

export function OrderDetailDialog({ 
  order, 
  open, 
  onOpenChange, 
  onUpdateStatus,
  isDispensaryView = false 
}: OrderDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const { toast } = useToast();
  const { currentUser, currentDispensary } = useAuth();

  if (!order) return null;

  const orderDate = order.createdAt.toDate().toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleReorder = async () => {
    setIsReordering(true);
    try {
      // TODO: Implement reorder functionality
      toast({
        title: "Coming Soon",
        description: "The reorder functionality will be available soon!",
      });
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: "Error",
        description: "Failed to reorder items. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsReordering(false);
    }
  };

  const handleLabelGenerated = async (result: any) => {
    console.log('Label generated, result:', result);
    
    // Close the label dialog first
    setLabelDialogOpen(false);
    
    // Switch to shipments tab to show the updated tracking info
    setActiveTab('shipments');
    
    // Show success toast
    toast({
      title: "Label Generated Successfully",
      description: `Tracking: ${result.trackingNumber}${result.accessCode ? ` | Access Code: ${result.accessCode}` : ''}`,
    });
    
    // Trigger parent to refresh order data
    // The onOpenChange(false) will close the dialog, and the parent component
    // will refresh the order list via its real-time listener
  };

  const handleExportOrder = async () => {
    try {
      const data = {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toDate().toISOString(),
        status: order.status,
        customerDetails: order.customerDetails,
        shipments: order.shipments,
        total: order.total,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        shippingTotal: order.shippingTotal,
        shippingAddress: order.shippingAddress
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.orderNumber}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Order Exported",
        description: "Order details have been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export order. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-6 w-6" />
            Order #{order.orderNumber}
          </DialogTitle>
          <DialogDescription>
            Placed on {orderDate}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="shipping-label">Labels</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 mt-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-6">
                {/* Order Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package2 className="h-6 w-6 text-green-800" />
                      Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Order Number</p>
                        <p className="font-semibold">#{order.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Order Date</p>
                        <p className="font-semibold">{orderDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
                        <Badge variant={order.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                          {order.paymentStatus || 'pending'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                        <p className="font-semibold capitalize">{order.paymentMethod || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Details */}
                {order.customerDetails && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-6 w-6 text-green-800" />
                        Customer Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-7 w-7 text-green-800" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{order.customerDetails.name}</p>
                          <p className="text-sm text-muted-foreground">{order.customerDetails.email}</p>
                        </div>
                      </div>
                      {order.customerDetails.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{order.customerDetails.phone}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Locker Details (for PUDO deliveries) */}
                {Object.values(order.shipments || {}).some(s => s.originLocker || s.destinationLocker) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-green-800" />
                        Locker Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {Object.entries(order.shipments || {})
                        .filter(([_, shipment]) => shipment.originLocker || shipment.destinationLocker)
                        .map(([dispensaryId, shipment]) => {
                        const method = shipment.shippingMethod?.service_level?.toLowerCase() || '';
                        const showOrigin = method.includes('ltd') || method.includes('ltl') || method.includes('l2d') || method.includes('l2l');
                        const showDestination = method.includes('dtl') || method.includes('ltl') || method.includes('d2l') || method.includes('l2l');
                        
                        return (
                          <div key={dispensaryId} className="space-y-3">
                            {shipment.items[0]?.dispensaryName && (
                              <p className="text-sm font-medium text-muted-foreground">
                                {shipment.items[0].dispensaryName}
                              </p>
                            )}
                            
                            {showOrigin && shipment.originLocker && typeof shipment.originLocker === 'object' && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-blue-600 mt-1" />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-blue-900">Origin Locker</p>
                                    {(() => {
                                      const name = getLockerProp(shipment.originLocker, 'name');
                                      const address = getLockerProp(shipment.originLocker, 'address');
                                      const id = getLockerProp(shipment.originLocker, 'id');
                                      const city = getLockerProp(shipment.originLocker, 'city');
                                      
                                      return (
                                        <>
                                          {name && <p className="text-sm font-medium text-blue-800">{String(name)}</p>}
                                          {address && <p className="text-xs text-blue-700">{String(address)}</p>}
                                          {city && <p className="text-xs text-blue-600">{String(city)}</p>}
                                          {id && <p className="text-xs text-blue-600 mt-1">ID: {String(id)}</p>}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {showDestination && shipment.destinationLocker && typeof shipment.destinationLocker === 'object' && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-green-600 mt-1" />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-green-900">Destination Locker</p>
                                    {(() => {
                                      const name = getLockerProp(shipment.destinationLocker, 'name');
                                      const address = getLockerProp(shipment.destinationLocker, 'address');
                                      const id = getLockerProp(shipment.destinationLocker, 'id');
                                      const city = getLockerProp(shipment.destinationLocker, 'city');
                                      const distanceKm = getLockerProp(shipment.destinationLocker, 'distanceKm');
                                      
                                      return (
                                        <>
                                          {name && <p className="text-sm font-medium text-green-800">{String(name)}</p>}
                                          {address && <p className="text-xs text-green-700">{String(address)}</p>}
                                          {city && <p className="text-xs text-green-600">{String(city)}</p>}
                                          {distanceKm && typeof distanceKm === 'number' && (
                                            <p className="text-xs text-green-600 mt-1">{distanceKm.toFixed(1)} km from customer</p>
                                          )}
                                          {id && <p className="text-xs text-green-600 mt-1">ID: {String(id)}</p>}
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
                    </CardContent>
                  </Card>
                )}

                {/* Order Status Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-6 w-6 text-green-800" />
                      Order Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isDispensaryView ? (
                      <OrderStatusManagement
                        order={order}
                        onUpdateStatus={onUpdateStatus}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                          <span className="font-medium">Current Status:</span>
                          <Badge 
                            variant={
                              order.status === 'delivered' ? 'default' :
                              order.status === 'cancelled' ? 'destructive' :
                              'secondary'
                            }
                            className="text-sm font-semibold"
                          >
                            {order.status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>
                        {order.statusHistory && order.statusHistory.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Status History:</p>
                            <div className="space-y-2">
                              {order.statusHistory.slice().reverse().map((history, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                                  <span className="capitalize">{history.status.replace(/_/g, ' ')}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {history.timestamp?.toDate().toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Items Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-6 w-6 text-green-800" />
                      Items ({order.items?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} × {formatCurrency(item.price)}
                            </p>
                            {item.dispensaryName && (
                              <p className="text-xs text-muted-foreground">
                                From: {item.dispensaryName}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-6 w-6 text-green-800" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Shipping Method */}
                    {Object.values(order.shipments || {}).map((shipment, idx) => (
                      <div key={idx} className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                        <p className="text-xs text-muted-foreground mb-2">Shipment {idx + 1}</p>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Truck className="h-6 w-6 text-green-800" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{shipment.shippingMethod?.courier_name || shipment.shippingMethod?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {shipment.shippingMethod?.delivery_time || 'Standard delivery'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(shipment.shippingMethod?.rate || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Delivery Address */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Delivery Address</p>
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">{order.shippingAddress.streetAddress}</p>
                          <p className="text-muted-foreground">{order.shippingAddress.suburb}</p>
                          <p className="text-muted-foreground">
                            {order.shippingAddress.city}, {order.shippingAddress.province}
                          </p>
                          <p className="text-muted-foreground">{order.shippingAddress.postalCode}</p>
                          {order.shippingAddress.country && (
                            <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-6 w-6 text-green-800" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm py-2">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm py-2">
                        <span className="text-muted-foreground">Shipping Cost</span>
                        <span className="font-medium">{formatCurrency(order.shippingTotal || order.shippingCost || 0)}</span>
                      </div>
                      {(order as any).tax && (order as any).tax > 0 && (
                        <div className="flex justify-between text-sm py-2">
                          <span className="text-muted-foreground">Tax</span>
                          <span className="font-medium">{formatCurrency((order as any).tax)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg py-2">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="shipments" className="mt-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                {/* Label Generation Section - Show if labels not generated yet */}
                {isDispensaryView && Object.values(order.shipments).some(s => !s.trackingNumber) && (
                  <Card className="border-dashed border-2 bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Truck className="h-7 w-7 text-green-800" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Generate Shipping Labels</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Create shipping labels to start fulfilling this order
                          </p>
                        </div>
                        <Button 
                          onClick={() => setLabelDialogOpen(true)}
                          className="w-full max-w-xs"
                        >
                          <Truck className="mr-2 h-4 w-4" />
                          Generate Labels
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Shipment Details */}
                {Object.entries(order.shipments).map(([dispensaryId, shipment]) => (
                  <ShipmentDetails key={dispensaryId} shipment={shipment} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="shipping-label" className="mt-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4">
                {/* Generate New Label Section */}
                {isDispensaryView && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Generate Shipping Labels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center space-y-4">
                        <Truck className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          Generate or regenerate shipping labels for this order
                        </p>
                        <Button 
                          onClick={() => setLabelDialogOpen(true)}
                          className="w-full max-w-xs"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {Object.values(order.shipments).some(s => s.labelUrl) ? 'Regenerate Labels' : 'Generate Labels'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Existing Labels */}
                {Object.entries(order.shipments)
                  .filter(([_, shipment]) => shipment.labelUrl || shipment.trackingNumber)
                  .map(([dispensaryId, shipment]) => (
                    <Card key={dispensaryId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {shipment.items[0]?.dispensaryName}
                          </CardTitle>
                          <Badge variant={shipment.labelUrl ? "default" : "secondary"}>
                            {shipment.labelUrl ? 'Label Generated' : 'Tracking Only'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Tracking Information */}
                        {shipment.trackingNumber && (
                          <div className="p-3 bg-muted rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Tracking Number</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(shipment.trackingNumber!);
                                  toast({
                                    title: "Copied!",
                                    description: "Tracking number copied to clipboard",
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="font-mono text-sm">{shipment.trackingNumber}</p>
                            {shipment.trackingUrl && (
                              <Button
                                variant="link"
                                className="h-auto p-0 text-primary"
                                asChild
                              >
                                <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                                  Track Shipment →
                                </a>
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Label Actions */}
                        {shipment.labelUrl && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => window.open(shipment.labelUrl, '_blank')}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              View Label
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                // Create iframe for printing
                                const iframe = document.createElement('iframe');
                                iframe.style.display = 'none';
                                iframe.src = shipment.labelUrl!;
                                document.body.appendChild(iframe);
                                iframe.onload = () => {
                                  iframe.contentWindow?.print();
                                  setTimeout(() => document.body.removeChild(iframe), 1000);
                                };
                              }}
                            >
                              <Printer className="mr-2 h-4 w-4" />
                              Print Label
                            </Button>
                          </div>
                        )}

                        {/* Shipping Details */}
                        <div className="text-sm space-y-2 pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Courier</span>
                            <span className="font-medium">{shipment.shippingMethod.courier_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Service</span>
                            <span className="font-medium">{shipment.shippingMethod.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Provider</span>
                            <span className="font-medium uppercase">{shipment.shippingProvider}</span>
                          </div>
                          {shipment.lastStatusUpdate && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Updated</span>
                              <span className="font-medium">
                                {shipment.lastStatusUpdate.toDate().toLocaleDateString('en-ZA', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {/* No Labels Message */}
                {!Object.values(order.shipments).some(s => s.labelUrl || s.trackingNumber) && !isDispensaryView && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          No shipping labels generated yet
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            {isDispensaryView ? (
              <OrderNotes orderId={order.id} orderNumber={order.orderNumber} />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Order notes are only available to dispensary staff
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleExportOrder}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Export Order Data
                  </Button>
                  {['delivered', 'cancelled'].includes(order.status) && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleReorder}
                      disabled={isReordering}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {isReordering ? "Processing..." : "Reorder Items"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    
    {/* Label Generation Dialog */}
    {isDispensaryView && currentUser?.dispensaryId && currentDispensary && (
      <LabelGenerationDialog
        open={labelDialogOpen}
        onOpenChange={setLabelDialogOpen}
        order={order}
        dispensaryId={currentUser.dispensaryId}
        dispensaryAddress={currentDispensary}
        onSuccess={handleLabelGenerated}
      />
    )}
  </>
  );
}

function ShipmentDetails({ shipment }: { shipment: OrderShipment }) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyTracking = async () => {
    if (!shipment.trackingNumber) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      toast({
        title: "Copied!",
        description: "Tracking number copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the tracking number manually",
        variant: "destructive"
      });
    } finally {
      setIsCopying(false);
    }
  };

  const getStatusColor = (status: ShippingStatus) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'out_for_delivery':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_transit':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'label_generated':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'ready_for_shipping':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'failed':
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatStatusText = (status: ShippingStatus) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const sortedHistory = [...(shipment.statusHistory || [])].sort((a, b) => 
    b.timestamp.toMillis() - a.timestamp.toMillis()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{shipment.items[0]?.dispensaryName}</CardTitle>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(shipment.status)}`}>
            {formatStatusText(shipment.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Shipping Method */}
        <div className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{shipment.shippingMethod.courier_name}</span>
          <span className="text-muted-foreground">- {shipment.shippingMethod.name}</span>
        </div>

        {/* Tracking Info with Copy Button */}
        {shipment.trackingNumber && (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-green-800" />
                Tracking Information
              </h4>
            </div>
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1 font-medium">Tracking Number</p>
                <span className="font-mono text-base font-semibold text-foreground">{shipment.trackingNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCopyTracking}
                  disabled={isCopying}
                  className="h-9"
                >
                  {isCopying ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-800 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                {shipment.trackingUrl && (
                  <Button 
                    variant="default" 
                    size="sm"
                    asChild
                    className="h-9"
                  >
                    <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {shipment.accessCode && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <span className="text-blue-900 font-medium">Locker Access Code:</span>
                <span className="font-mono font-bold text-blue-700 text-lg">{shipment.accessCode}</span>
              </div>
            )}
          </div>
        )}

        {/* Locker Information (for PUDO) */}
        {(shipment.originLocker || shipment.destinationLocker) && (
          <div className="space-y-3">
            {shipment.originLocker && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">Origin Locker</p>
                    {typeof shipment.originLocker === 'object' && shipment.originLocker !== null ? (
                      <>                        {(() => {
                          const name = getLockerProp(shipment.originLocker, 'name');
                          const address = getLockerProp(shipment.originLocker, 'address');
                          const id = getLockerProp(shipment.originLocker, 'id');
                          const city = getLockerProp(shipment.originLocker, 'city');
                          
                          return (
                            <>
                              {name && <p className="text-sm font-medium text-blue-800">{String(name)}</p>}
                              {address && <p className="text-xs text-blue-700 mt-0.5">{String(address)}</p>}
                              <div className="mt-2 flex items-center gap-3 text-xs">
                                {id && (
                                  <span className="text-blue-600">
                                    <span className="font-medium">ID:</span> {String(id)}
                                  </span>
                                )}
                                {city && <span className="text-blue-600">{String(city)}</span>}
                              </div>
                            </>
                          );
                        })()}
                      </>
                    ) : typeof shipment.originLocker === 'string' ? (
                      <p className="text-sm text-blue-700 font-mono">{shipment.originLocker}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            {shipment.destinationLocker && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-1">Destination Locker</p>
                    {typeof shipment.destinationLocker === 'object' && shipment.destinationLocker !== null ? (
                      <>
                        {(() => {
                          const name = getLockerProp(shipment.destinationLocker, 'name');
                          const address = getLockerProp(shipment.destinationLocker, 'address');
                          const id = getLockerProp(shipment.destinationLocker, 'id');
                          const city = getLockerProp(shipment.destinationLocker, 'city');
                          const distanceKm = getLockerProp(shipment.destinationLocker, 'distanceKm');
                          
                          return (
                            <>
                              {name && <p className="text-sm font-medium text-green-800">{String(name)}</p>}
                              {address && <p className="text-xs text-green-700 mt-0.5">{String(address)}</p>}
                              <div className="mt-2 flex items-center gap-3 text-xs">
                                {id && (
                                  <span className="text-green-600">
                                    <span className="font-medium">ID:</span> {String(id)}
                                  </span>
                                )}
                                {city && <span className="text-green-600">{String(city)}</span>}
                                {distanceKm && typeof distanceKm === 'number' && (
                                  <span className="text-green-600">{distanceKm.toFixed(1)} km away</span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </>
                    ) : typeof shipment.destinationLocker === 'string' ? (
                      <p className="text-sm text-green-700 font-mono">{shipment.destinationLocker}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div>
          <h4 className="text-sm font-medium mb-3">Items in this shipment</h4>
          <ul className="space-y-2">
            {shipment.items.map((item: OrderItem, index: number) => (
              <li key={index} className="text-sm flex justify-between items-center p-2 rounded hover:bg-muted">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{item.quantity}x</span>
                  <span>{item.name}</span>
                </span>
                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Status History Timeline */}
        {sortedHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Tracking Timeline</h4>
            <div className="space-y-3">
              {sortedHistory.map((update, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted-foreground'}`} />
                    {index < sortedHistory.length - 1 && (
                      <div className="h-full w-px bg-border my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{formatStatusText(update.status)}</span>
                      <span className="text-xs text-muted-foreground">
                        {update.timestamp.toDate().toLocaleString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {update.message && (
                      <p className="text-xs text-muted-foreground mt-1">{update.message}</p>
                    )}
                    {update.location && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {update.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}