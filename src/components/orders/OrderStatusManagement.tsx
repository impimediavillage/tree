'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Clock, Truck, AlertCircle, Download } from 'lucide-react';
import type { Order, OrderStatus, OrderItem } from '@/types/order';
import type { ShippingStatus } from '@/types/shipping';
import { 
  isValidStatusTransition, 
  getAllowedStatuses, 
  getTransitionErrorMessage,
  requiresConfirmation,
  getConfirmationMessage,
  STATUS_LABELS 
} from '@/lib/status-validation';
import { StatusConfirmationDialog } from './StatusConfirmationDialog';

interface OrderStatusManagementProps {
  order: Order;
  onUpdateStatus?: (orderId: string, dispensaryId: string, newStatus: ShippingStatus) => Promise<void>;
}

export function OrderStatusManagement({ order, onUpdateStatus }: OrderStatusManagementProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ShippingStatus | null>(null);
  const [confirmationConfig, setConfirmationConfig] = useState<{
    title: string;
    description: string;
    confirmText: string;
  } | null>(null);
  
  // Get current status from order prop (not local state)
  const currentStatus = Object.values(order.shipments)[0]?.status || 'pending';
  const allowedStatuses = getAllowedStatuses(currentStatus);

  const handleStatusChange = async (newStatus: ShippingStatus) => {
    // Validate transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      toast({
        title: "Invalid Status Change",
        description: getTransitionErrorMessage(currentStatus, newStatus),
        variant: "destructive",
      });
      return;
    }

    // Check if confirmation required
    if (requiresConfirmation(newStatus)) {
      const config = getConfirmationMessage(currentStatus, newStatus, order.orderNumber);
      setConfirmationConfig(config);
      setPendingStatus(newStatus);
      setShowConfirmation(true);
      return;
    }

    // Execute status update directly if no confirmation needed
    await executeStatusUpdate(newStatus);
  };

  const executeStatusUpdate = async (newStatus: ShippingStatus) => {
    if (!onUpdateStatus) return;
    
    setIsUpdating(true);
    try {
      const orderId = order.id;
      const dispensaryId = Object.keys(order.shipments)[0]; // For now, handle first shipment
      
      await onUpdateStatus(orderId, dispensaryId, newStatus);

      toast({
        title: "Status Updated",
        description: `Order status successfully updated to ${STATUS_LABELS[newStatus]}`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setShowConfirmation(false);
      setPendingStatus(null);
      setConfirmationConfig(null);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      executeStatusUpdate(pendingStatus);
    }
  };

  const getStatusBadge = (status: ShippingStatus) => {
    switch (status) {
      case 'delivered':
        return { icon: <CheckCircle2 className="h-4 w-4" />, variant: 'success' as const };
      case 'failed':
      case 'returned':
        return { icon: <AlertCircle className="h-4 w-4" />, variant: 'destructive' as const };
      case 'ready_for_shipping':
        return { icon: <Clock className="h-4 w-4" />, variant: 'secondary' as const };
      case 'in_transit':
        return { icon: <Truck className="h-4 w-4" />, variant: 'default' as const };
      case 'out_for_delivery':
        return { icon: <Truck className="h-4 w-4" />, variant: 'primary' as const };
      default:
        return { icon: <Clock className="h-4 w-4" />, variant: 'secondary' as const };
    }
  };

  const statusBadge = getStatusBadge(currentStatus);
  const statusHistory = order.statusHistory || [];

  return (
    <div className="space-y-6">
      {/* Status Confirmation Dialog */}
      {confirmationConfig && (
        <StatusConfirmationDialog
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          title={confirmationConfig.title}
          description={confirmationConfig.description}
          confirmText={confirmationConfig.confirmText}
          onConfirm={handleConfirm}
          isLoading={isUpdating}
        />
      )}

      <div className="flex items-center gap-4">
        <Select
          value={currentStatus}
          onValueChange={(value: ShippingStatus) => handleStatusChange(value)}
          disabled={isUpdating || allowedStatuses.length === 0}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue>{STATUS_LABELS[currentStatus]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* Current status */}
            <SelectItem value={currentStatus} disabled>
              {STATUS_LABELS[currentStatus]} (Current)
            </SelectItem>
            
            {/* Allowed transitions */}
            {allowedStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
            
            {/* Show message if no transitions allowed */}
            {allowedStatuses.length === 0 && (
              <SelectItem value={currentStatus} disabled>
                No status changes available
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <Badge variant="outline" className="ml-auto">
          <span className="flex items-center gap-2">
            {statusBadge.icon}
            {STATUS_LABELS[currentStatus]}
          </span>
        </Badge>
      </div>

      {statusHistory.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Status History</h4>
          <div className="space-y-3">
            {statusHistory.map((entry, index) => (
              <div key={index} className="border rounded-lg p-3 bg-muted/50">
                <div className="flex justify-between items-start">
                  <Badge variant="outline">
                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {entry.timestamp.toDate().toLocaleString()}
                  </span>
                </div>
                {entry.location && (
                  <p className="text-sm mt-1 text-muted-foreground">📍 {entry.location}</p>
                )}
                {entry.message && (
                  <p className="text-sm mt-1">{entry.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}