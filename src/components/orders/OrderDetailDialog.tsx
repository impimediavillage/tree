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
import { Clock, MapPin, PackageCheck, RefreshCw, Truck, FileText, Archive, Copy, ExternalLink, CheckCircle2, MessageSquare, Package2, User, Phone, ShoppingBag, Package, Printer, Trash2, ArchiveRestore, Info, Tag, Navigation } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateOrderStatus } from "@/lib/orders";
import { LabelGenerationDialog } from "@/components/dispensary-admin/LabelGenerationDialog";
import { useAuth } from "@/contexts/AuthContext";
import { OrderNotes } from "./OrderNotes";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface OrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus?: (orderId: string, dispensaryId: string, newStatus: ShippingStatus) => Promise<void>;
  isDispensaryView?: boolean;
  onArchive?: (orderId: string) => Promise<void>;
  onUnarchive?: (orderId: string) => Promise<void>;
  onDelete?: (orderId: string) => Promise<void>;
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
  isDispensaryView = false,
  onArchive,
  onUnarchive,
  onDelete
}: OrderDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { currentUser, currentDispensary } = useAuth();
  const router = useRouter();

  if (!order) return null;

  const orderDate = order.createdAt.toDate().toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleArchive = async () => {
    if (!onArchive) return;
    setIsProcessing(true);
    try {
      await onArchive(order.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error archiving order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnarchive = async () => {
    if (!onUnarchive) return;
    setIsProcessing(true);
    try {
      await onUnarchive(order.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error unarchiving order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsProcessing(true);
    try {
      await onDelete(order.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

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
    
    try {
      // Update order status to 'label_generated'
      if (onUpdateStatus && currentUser?.dispensaryId) {
        await onUpdateStatus(order.id, currentUser.dispensaryId, 'label_generated');
      }
      
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
    } catch (error) {
      console.error('Error updating order status after label generation:', error);
      // Still close the dialog and show success since label was generated
      setLabelDialogOpen(false);
      setActiveTab('shipments');
      toast({
        title: "Label Generated",
        description: `Tracking: ${result.trackingNumber}${result.accessCode ? ` | Access Code: ${result.accessCode}` : ''} (Status update pending)`,
      });
    }
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
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] sm:w-full flex flex-col p-3 sm:p-4 md:p-6">
        <DialogHeader className="pb-2 sm:pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl md:text-2xl font-extrabold text-[#3D2E17]">
                <PackageCheck className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-[#006B3E] flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate">Order #{order.orderNumber}</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Placed on {orderDate}
              </DialogDescription>
            </div>
            {isDispensaryView && (onArchive || onUnarchive || onDelete) && (
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {order.archived ? (
                  <>
                    {onUnarchive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUnarchive}
                        disabled={isProcessing}
                        className="font-bold hover:bg-[#006B3E] hover:text-white transition-colors"
                      >
                        <ArchiveRestore className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Restore</span>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isProcessing}
                        className="font-bold"
                      >
                        <Trash2 className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {onArchive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleArchive}
                        disabled={isProcessing}
                        className="font-bold hover:bg-amber-600 hover:text-white transition-colors"
                      >
                        <Archive className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Archive</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 gap-1 sm:gap-2 bg-transparent h-auto p-1">
            <TabsTrigger 
              value="details" 
              className="flex flex-col items-center gap-1 py-2 px-1 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all h-auto"
            >
              <div className="p-2 rounded-full bg-gradient-to-br from-[#006B3E] to-[#3D2E17] text-white">
                <Info className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-center">Details</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="shipments" 
              className="flex flex-col items-center gap-1 py-2 px-1 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all h-auto"
            >
              <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <Package className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-center">Ships</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="shipping-label" 
              className="flex flex-col items-center gap-1 py-2 px-1 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all h-auto"
            >
              <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <Tag className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-center">Labels</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="notes" 
              className="flex flex-col items-center gap-1 py-2 px-1 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all h-auto"
            >
              <div className="p-2 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-center">Notes</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="documents" 
              className="flex flex-col items-center gap-1 py-2 px-1 data-[state=active]:bg-white data-[state=active]:shadow-md rounded-lg transition-all h-auto"
            >
              <div className="p-2 rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-white">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-center">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 mt-3 sm:mt-4 overflow-hidden max-w-full">
            <ScrollArea className="h-[calc(95vh-200px)] sm:h-[calc(90vh-200px)]">
              <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4 max-w-full overflow-x-hidden">
                {/* Order Status Management */}
                <Card className="bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17]">
                      <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
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
                        {(() => {
                          // Get status history from shipment if available, otherwise from order
                          const shipment = Object.values(order.shipments || {})[0];
                          const statusHistory = shipment?.statusHistory || order.statusHistory || [];
                          
                          return statusHistory.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-muted-foreground">Status History:</p>
                              <div className="space-y-2">
                                {statusHistory.slice().reverse().map((history, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                                    <span className="capitalize">{history.status.replace(/_/g, ' ')}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {history.timestamp?.toDate().toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Information */}
                <Card className="bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17]">
                      <Package2 className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
                      Order Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                      <div className="p-3 bg-background/60 rounded-lg border border-border/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-bold">Order Number</p>
                        <p className="font-extrabold text-sm sm:text-base md:text-lg text-[#3D2E17]">#{order.orderNumber}</p>
                      </div>
                      <div className="p-3 bg-background/60 rounded-lg border border-border/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-bold">Order Date</p>
                        <p className="font-extrabold text-sm sm:text-base md:text-lg text-[#3D2E17]">{orderDate}</p>
                      </div>
                      <div className="p-3 bg-background/60 rounded-lg border border-border/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-bold">Payment Status</p>
                        <Badge variant={order.paymentStatus === 'completed' ? 'default' : 'secondary'} className="text-xs font-bold">
                          {order.paymentStatus || 'pending'}
                        </Badge>
                      </div>
                      <div className="p-3 bg-background/60 rounded-lg border border-border/30">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 font-bold">Payment Method</p>
                        <p className="font-extrabold capitalize text-sm sm:text-base md:text-lg text-[#3D2E17]">{order.paymentMethod || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Details */}
                {order.customerDetails && (
                  <Card className="bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17]">
                        <User className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
                        Customer Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 sm:gap-4 p-3 bg-background/60 rounded-lg">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-[#006B3E]/10 flex items-center justify-center">
                          <User className="h-6 w-6 sm:h-9 sm:w-9 text-[#006B3E]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-sm sm:text-base md:text-lg text-[#3D2E17] truncate">{order.customerDetails.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{order.customerDetails.email}</p>
                        </div>
                      </div>
                      {order.customerDetails.phone && (
                        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base p-3 bg-background/60 rounded-lg">
                          <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-[#006B3E]" />
                          <span className="font-bold text-[#3D2E17]">{order.customerDetails.phone}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Locker Details (for PUDO deliveries) */}
                {Object.values(order.shipments || {}).some(s => s.originLocker || s.destinationLocker) && (
                  <Card className="bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17]">
                        <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
                        Locker Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      {Object.entries(order.shipments || {})
                        .filter(([_, shipment]) => shipment.originLocker || shipment.destinationLocker)
                        .map(([dispensaryId, shipment]) => {
                        const method = shipment.shippingMethod?.service_level?.toLowerCase() || '';
                        const showOrigin = method.includes('ltd') || method.includes('ltl') || method.includes('l2d') || method.includes('l2l');
                        const showDestination = method.includes('dtl') || method.includes('ltl') || method.includes('d2l') || method.includes('l2l');
                        
                        return (
                          <div key={dispensaryId} className="space-y-2 sm:space-y-3">
                            {shipment.items[0]?.dispensaryName && (
                              <p className="text-xs sm:text-sm font-extrabold text-[#3D2E17]">
                                {shipment.items[0].dispensaryName}
                              </p>
                            )}
                            
                            {showOrigin && shipment.originLocker && typeof shipment.originLocker === 'object' && (
                              <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl shadow-md">
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mt-1 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] sm:text-xs font-extrabold text-blue-900 uppercase tracking-wide mb-1">Origin Locker</p>
                                    {(() => {
                                      const name = getLockerProp(shipment.originLocker, 'name');
                                      const address = getLockerProp(shipment.originLocker, 'address');
                                      const id = getLockerProp(shipment.originLocker, 'id');
                                      const city = getLockerProp(shipment.originLocker, 'city');
                                      
                                      return (
                                        <>
                                          {name && <p className="text-sm sm:text-base md:text-lg font-extrabold text-blue-900 truncate">{String(name)}</p>}
                                          {address && <p className="text-xs sm:text-sm text-blue-700 mt-1">{String(address)}</p>}
                                          {city && <p className="text-xs sm:text-sm text-blue-600">{String(city)}</p>}
                                          {id && <p className="text-[10px] sm:text-xs text-blue-600 mt-2 font-bold">Locker ID: {String(id)}</p>}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {showDestination && shipment.destinationLocker && typeof shipment.destinationLocker === 'object' && (
                              <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl shadow-md">
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mt-1 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] sm:text-xs font-extrabold text-green-900 uppercase tracking-wide mb-1">Destination Locker</p>
                                    {(() => {
                                      const name = getLockerProp(shipment.destinationLocker, 'name');
                                      const address = getLockerProp(shipment.destinationLocker, 'address');
                                      const id = getLockerProp(shipment.destinationLocker, 'id');
                                      const city = getLockerProp(shipment.destinationLocker, 'city');
                                      const distanceKm = getLockerProp(shipment.destinationLocker, 'distanceKm');
                                      
                                      return (
                                        <>
                                          {name && <p className="text-sm sm:text-base md:text-lg font-extrabold text-green-900 truncate">{String(name)}</p>}
                                          {address && <p className="text-xs sm:text-sm text-green-700 mt-1">{String(address)}</p>}
                                          {city && <p className="text-xs sm:text-sm text-green-600">{String(city)}</p>}
                                          {distanceKm && typeof distanceKm === 'number' && (
                                            <p className="text-xs sm:text-sm text-green-600 mt-1 font-bold">{distanceKm.toFixed(1)} km from customer</p>
                                          )}
                                          {id && <p className="text-[10px] sm:text-xs text-green-600 mt-2 font-bold">Locker ID: {String(id)}</p>}
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

                {/* Items Breakdown */}
                <Card className="bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17]">
                      <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
                      Items ({order.items?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-2 rounded-xl hover:bg-muted/50 transition-all duration-200 hover:shadow-md bg-background/60">
                          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-lg bg-gradient-to-br from-[#006B3E]/10 to-[#006B3E]/20 flex items-center justify-center flex-shrink-0">
                            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {item.productType === 'THC' ? (
                              <>
                                <p className="font-extrabold text-sm sm:text-base text-[#3D2E17] truncate">{item.name}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold">
                                  {item.quantity} FREE {item.unit}{item.quantity > 1 ? 's' : ''} {item.originalName}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-extrabold text-sm sm:text-base text-[#3D2E17] truncate">{item.name}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold">
                                  Qty: {item.quantity} × {formatCurrency(item.price)}
                                </p>
                              </>
                            )}
                            {item.dispensaryName && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground font-bold">
                                From: {item.dispensaryName}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-sm sm:text-base md:text-lg text-[#006B3E]">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Information */}
                <Card className="bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17]">
                      <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {/* Shipping Method */}
                    {Object.values(order.shipments || {}).map((shipment, idx) => (
                      <div key={idx} className="p-3 sm:p-4 bg-gradient-to-r from-[#006B3E]/10 to-[#006B3E]/5 rounded-xl border-2 border-[#006B3E]/20 shadow-md">
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 font-bold">Shipment {idx + 1}</p>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#006B3E]/20 flex items-center justify-center flex-shrink-0">
                            <Truck className="h-5 w-5 sm:h-7 sm:w-7 text-[#006B3E]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm sm:text-base text-[#3D2E17] truncate">{shipment.shippingMethod?.courier_name || shipment.shippingMethod?.name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-bold">
                              {shipment.shippingMethod?.delivery_time || 'Standard delivery'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-base sm:text-lg text-[#006B3E]">{formatCurrency(shipment.shippingMethod?.rate || 0)}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Delivery Address */}
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-extrabold text-[#3D2E17]">Delivery Address</p>
                      <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-background/60 rounded-xl border-2 border-border/30">
                        <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-[#006B3E] shrink-0 mt-0.5" />
                        <div className="text-xs sm:text-sm min-w-0 flex-1">
                          <p className="font-extrabold text-[#3D2E17]">{order.shippingAddress.streetAddress}</p>
                          <p className="text-muted-foreground font-bold">{order.shippingAddress.suburb}</p>
                          <p className="text-muted-foreground font-bold">
                            {order.shippingAddress.city}, {order.shippingAddress.province}
                          </p>
                          <p className="text-muted-foreground font-bold">{order.shippingAddress.postalCode}</p>
                          {order.shippingAddress.country && (
                            <p className="text-muted-foreground font-bold">{order.shippingAddress.country}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card className="bg-gradient-to-br from-muted/80 to-muted/50 border-border/50 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-extrabold text-[#3D2E17]">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-[#006B3E]" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex justify-between text-xs sm:text-sm py-2 px-3 bg-background/60 rounded-lg">
                        <span className="text-muted-foreground font-bold">Subtotal</span>
                        <span className="font-extrabold text-[#3D2E17]">{formatCurrency(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm py-2 px-3 bg-background/60 rounded-lg">
                        <span className="text-muted-foreground font-bold">Shipping Cost</span>
                        <span className="font-extrabold text-[#3D2E17]">{formatCurrency(order.shippingTotal || order.shippingCost || 0)}</span>
                      </div>
                      {(order as any).tax && (order as any).tax > 0 && (
                        <div className="flex justify-between text-xs sm:text-sm py-2 px-3 bg-background/60 rounded-lg">
                          <span className="text-muted-foreground font-bold">Tax</span>
                          <span className="font-extrabold text-[#3D2E17]">{formatCurrency((order as any).tax)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-extrabold text-base sm:text-lg md:text-xl py-3 px-4 bg-gradient-to-r from-[#006B3E]/10 to-[#006B3E]/5 rounded-xl border-2 border-[#006B3E]/20">
                        <span className="text-[#3D2E17]">Total</span>
                        <span className="text-[#006B3E]">{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="shipments" className="mt-4 max-w-full overflow-x-hidden">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 max-w-full">
                {/* Label Generation Section - Show if labels not generated yet and not in label_generated status */}
                {isDispensaryView && Object.values(order.shipments).some(s => {
                  // Show button if no label exists AND status is not label_generated and not shipped/in-transit/delivered
                  const hasNoLabel = !s.trackingNumber || !s.labelUrl;
                  const canRegenerate = s.status && !['label_generated', 'shipped', 'in-transit', 'delivered'].includes(s.status);
                  return hasNoLabel && canRegenerate;
                }) && (
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

          <TabsContent value="shipping-label" className="mt-4 max-w-full overflow-x-hidden">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 max-w-full">
                {/* Generate New Label Section - Only show if not yet shipped/in-transit/delivered and not label_generated */}
                {isDispensaryView && Object.values(order.shipments).some(s => {
                  const hasNoLabel = !s.trackingNumber || !s.labelUrl;
                  const canRegenerate = s.status && !['label_generated', 'shipped', 'in-transit', 'delivered'].includes(s.status);
                  return hasNoLabel && canRegenerate;
                }) && (
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

          <TabsContent value="notes" className="mt-4 max-w-full overflow-x-hidden">
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

          <TabsContent value="documents" className="mt-4 max-w-full overflow-x-hidden">
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
  const router = useRouter();
  const [isCopying, setIsCopying] = useState(false);
  
  const isInHouseDelivery = shipment.shippingProvider === 'in_house';
  const driverAssigned = shipment.driverId && shipment.driverName;

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

        {/* In-House Delivery Tracking Button */}
        {isInHouseDelivery && driverAssigned && (
          <div className="space-y-2">
            <Button
              variant="default"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              onClick={() => router.push(`/dispensary-admin/drivers/${shipment.driverId}`)}
            >
              <Navigation className="mr-2 h-4 w-4" />
              View Driver & Delivery Tracking
            </Button>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Navigation className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold uppercase">Driver Assigned</p>
                  <p className="text-sm font-extrabold text-blue-900">{shipment.driverName}</p>
                </div>
                {['picked_up', 'en_route', 'nearby'].includes(shipment.status) && (
                  <Badge className="bg-blue-500 text-white text-xs font-bold animate-pulse">
                    En Route
                  </Badge>
                )}
              </div>
            </div>
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