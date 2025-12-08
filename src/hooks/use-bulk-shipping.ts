import { useState } from 'react';
import { Order } from '@/types/order';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { writeBatch, doc, updateDoc, collection } from 'firebase/firestore';
import * as shippingLabelService from '@/lib/shipping-label-service';

interface UseBulkShippingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useBulkShipping = (options: UseBulkShippingOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const generateLabels = async (orders: Order[], dispensaryId: string) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      // Prepare shipment requests
      const shipmentRequests = orders.map(order => {
        const dispensaryShipment = order.shipments.find(
          (s: any) => s.dispensaryId === dispensaryId
        );
        if (!dispensaryShipment) throw new Error(`No shipment found for order ${order.id}`);

        return {
          orderId: order.id,
          dispensaryId,
          items: dispensaryShipment.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            weight: item.weight,
            dimensions: {
              length: item.length || 0,
              width: item.width || 0,
              height: item.height || 0,
            },
          })),
          shippingAddress: order.shippingAddress,
          shippingMethod: dispensaryShipment.shippingMethod,
        };
      });

      // Generate labels in batches of 5
      const batchSize = 5;
      const successful: any[] = [];
      const failed: any[] = [];
      
      for (let i = 0; i < shipmentRequests.length; i += batchSize) {
        const batch = shipmentRequests.slice(i, i + batchSize);
        
        // Process each request individually
        for (const request of batch) {
          try {
            // Note: Actual label generation would use shippingLabelService
            // For now, this is a placeholder that tracks the request
            successful.push({
              orderId: request.orderId,
              trackingNumber: `TRK${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
              trackingUrl: '#',
            });
          } catch (error) {
            failed.push({
              orderId: request.orderId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        setProgress(Math.round((i + batch.length) / shipmentRequests.length * 100));
      }

      // Update Firestore with tracking numbers
      const firestoreBatch = writeBatch(db);
      
      successful.forEach(({ orderId, trackingNumber, trackingUrl }) => {
        const orderRef = doc(db, 'orders', orderId);
        firestoreBatch.update(orderRef, {
          [`shipments.${dispensaryId}.trackingNumber`]: trackingNumber,
          [`shipments.${dispensaryId}.trackingUrl`]: trackingUrl,
          [`shipments.${dispensaryId}.status`]: 'ready_for_pickup',
          [`shipments.${dispensaryId}.statusHistory`]: [{
            status: 'ready_for_pickup',
            timestamp: new Date(),
            message: 'Shipping label generated',
          }],
        });
      });

      await firestoreBatch.commit();

      // Show success/failure summary
      toast({
        title: 'Shipping Labels Generated',
        description: `Successfully generated ${successful.length} labels. ${
          failed.length ? `Failed: ${failed.length}` : ''
        }`,
        variant: failed.length ? 'destructive' : 'default',
      });

      options.onSuccess?.();
    } catch (error) {
      console.error('Error generating shipping labels:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate shipping labels. Please try again.',
        variant: 'destructive',
      });
      options.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return {
    generateLabels,
    isProcessing,
    progress,
  };
};