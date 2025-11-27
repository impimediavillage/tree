'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Order } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface TrackingUpdateDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  orders: Order[];
}

export function TrackingUpdateDialog({
  open,
  onClose,
  onComplete,
  orders,
}: TrackingUpdateDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({});

  const handleInputChange = (orderId: string, value: string) => {
    setTrackingNumbers(prev => ({
      ...prev,
      [orderId]: value
    }));
  };

  const updateTrackingNumbers = async () => {
    if (!currentUser?.dispensaryId) return;

    setIsUpdating(true);
    try {
      const batch = writeBatch(db);

      orders.forEach(order => {
        const orderRef = doc(db, 'orders', order.id);
        const timestamp = new Date();
        
        // Update only the shipment belonging to this dispensary
        const updatedShipments = order.shipments.map(shipment => {
          if (shipment.dispensaryId === currentUser.dispensaryId) {
            return {
              ...shipment,
              trackingNumber: trackingNumbers[order.id] || shipment.trackingNumber,
              trackingLastUpdated: timestamp,
              status: 'shipped',
              statusHistory: [
                ...(shipment.statusHistory || []),
                { 
                  status: 'shipped', 
                  timestamp, 
                  message: `Tracking number updated: ${trackingNumbers[order.id]}` 
                }
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
      toast({
        title: 'Tracking Updated',
        description: `Successfully updated tracking for ${orders.length} orders.`,
      });
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error updating tracking numbers:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tracking numbers. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Tracking Numbers</DialogTitle>
          <DialogDescription>
            Enter tracking numbers for the selected orders. Orders will be marked as shipped once tracking is added.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="flex items-center gap-4">
                <div className="flex-grow">
                  <label htmlFor={order.id} className="text-sm font-medium block mb-1">
                    Order #{order.orderNumber}
                  </label>
                  <Input
                    id={order.id}
                    placeholder="Enter tracking number"
                    value={trackingNumbers[order.id] || ''}
                    onChange={(e) => handleInputChange(order.id, e.target.value)}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={updateTrackingNumbers} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Tracking
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}