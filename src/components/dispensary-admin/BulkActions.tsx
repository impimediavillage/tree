import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  ChevronDown, 
  FileDown,
  Printer,
  RefreshCcw,
  Truck,
  PackageCheck 
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { BulkShippingDialog } from '@/components/shipping/BulkShippingDialog';
import { TrackingUpdateDialog } from '@/components/shipping/TrackingUpdateDialog';
import { format } from 'date-fns';
import type { Order, OrderStatus } from '@/types/order';
import { generateOrdersCsv } from '@/lib/reports';
import { sendDispensaryNotification } from '@/lib/notification-service';

interface BulkActionsProps {
  selectedOrders: Order[];
  onSelectionChange: (selectedOrders: Order[]) => void;
  orders: Order[];
}

export function BulkActions({ 
  selectedOrders, 
  onSelectionChange, 
  orders
}: BulkActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const { currentUser } = useAuth();

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...orders]);
    }
  };

  const updateOrderStatuses = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      const batch = writeBatch(db);

      selectedOrders.forEach(order => {
        const orderRef = doc(db, 'orders', order.id);
        const timestamp = new Date();
        
        // Update only the shipments belonging to this dispensary
        const updatedShipments = order.shipments.map((shipment: any) => {
          if (shipment.dispensaryId === currentUser?.dispensaryId) {
            return {
              ...shipment,
              status: newStatus,
              lastStatusUpdate: timestamp,
              statusHistory: [
                ...(shipment.statusHistory || []),
                { status: newStatus, timestamp, message: `Status updated to ${newStatus}` }
              ]
            };
          }
          return shipment;
        });

        batch.update(orderRef, { 
          shipments: updatedShipments,
          lastModified: timestamp
        });
      });

      await batch.commit();

      // Send notifications for status changes
      await Promise.all(selectedOrders.map(async (order) => {
        await sendDispensaryNotification({
          dispensaryId: currentUser!.dispensaryId!,
          title: `Order ${order.orderNumber} Status Updated`,
          message: `Order status has been updated to ${newStatus}`,
          type: 'order',
          orderId: order.id,
          customerId: order.userId
        });
      }));

      // Real-time listener will handle updates automatically
      toast({
        title: 'Orders Updated',
        description: `Successfully updated ${selectedOrders.length} orders to ${newStatus}`,
      });
      onSelectionChange([]);
    } catch (error) {
      console.error('Error updating orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to update orders. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShippingComplete = () => {
    setIsShippingDialogOpen(false);
    onSelectionChange([]);
    // Real-time listener will handle updates automatically
  };

  const exportOrders = async () => {
    try {
      const csv = await generateOrdersCsv(selectedOrders);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export Complete',
        description: `Successfully exported ${selectedOrders.length} orders`,
      });
    } catch (error) {
      console.error('Error exporting orders:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export orders. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const printOrders = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Batch Print</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .order { 
              border: 1px solid #ccc; 
              margin: 20px 0; 
              padding: 20px;
              page-break-after: always;
            }
            table { width: 100%; border-collapse: collapse; }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          ${selectedOrders.map(order => `
            <div class="order">
              <h2>Order #${order.orderNumber}</h2>
              <p><strong>Date:</strong> ${format(order.createdAt.toDate(), 'PPP')}</p>
              <p><strong>Customer:</strong> ${order.customerDetails.name}</p>
              <p><strong>Email:</strong> ${order.customerDetails.email}</p>
              
              <h3>Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.shipments
                    .flatMap((s: any) => s.items)
                    .map((item: any) => `
                      <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>R ${item.price.toFixed(2)}</td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
              
              <p><strong>Subtotal:</strong> R ${order.subtotal.toFixed(2)}</p>
              <p><strong>Shipping:</strong> R ${order.shippingCost.toFixed(2)}</p>
              <p><strong>Total:</strong> R ${order.total.toFixed(2)}</p>
              
              <h3>Shipping Address</h3>
              <p>
                ${order.shippingAddress.streetAddress}<br>
                ${order.shippingAddress.suburb}<br>
                ${order.shippingAddress.city}, ${order.shippingAddress.province}<br>
                ${order.shippingAddress.postalCode}
              </p>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Checkbox 
          checked={selectedOrders.length === orders.length}
          onCheckedChange={handleSelectAll}
        />
        <span className="text-sm text-muted-foreground">
          {selectedOrders.length} selected
        </span>
      </div>

      {selectedOrders.length > 0 && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Truck className="mr-2 h-4 w-4" />
                Update Status
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => updateOrderStatuses('processing')}>
                Mark as Processing
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => updateOrderStatuses('shipped')}>
                Mark as Shipped
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => updateOrderStatuses('delivered')}>
                Mark as Delivered
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm"
            onClick={exportOrders}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export Selected
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={printOrders}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Selected
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsShippingDialogOpen(true)}
          >
            <Truck className="mr-2 h-4 w-4" />
            Generate Labels
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsTrackingDialogOpen(true)}
          >
            <PackageCheck className="mr-2 h-4 w-4" />
            Update Tracking
          </Button>
        </>
      )}

      {/* Refresh button removed - real-time updates handle this automatically */}

      {currentUser?.dispensaryId && (
        <BulkShippingDialog
          orders={selectedOrders}
          dispensaryId={currentUser.dispensaryId}
          open={isShippingDialogOpen}
          onClose={() => setIsShippingDialogOpen(false)}
          onComplete={handleShippingComplete}
        />
      )}

      {currentUser?.dispensaryId && (
        <>
          <BulkShippingDialog
            orders={selectedOrders}
            dispensaryId={currentUser.dispensaryId}
            open={isShippingDialogOpen}
            onClose={() => setIsShippingDialogOpen(false)}
            onComplete={handleShippingComplete}
          />
          <TrackingUpdateDialog
            orders={selectedOrders}
            open={isTrackingDialogOpen}
            onClose={() => setIsTrackingDialogOpen(false)}
            onComplete={handleShippingComplete}
          />
        </>
      )}
    </div>
  );
}