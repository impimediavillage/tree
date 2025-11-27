import { useState } from 'react';
import { Order } from '@/types/order';
import { shippingService } from '@/lib/shipping-service';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { analyticsService } from '@/lib/analytics';

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
          s => s.dispensaryId === dispensaryId
        );
        if (!dispensaryShipment) throw new Error(`No shipment found for order ${order.id}`);

        return {
          orderId: order.id,
          dispensaryId,
          items: dispensaryShipment.items.map(item => ({
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
      const results = [];
      
      for (let i = 0; i < shipmentRequests.length; i += batchSize) {
        const batch = shipmentRequests.slice(i, i + batchSize);
        const response = await shippingService.generateBulkLabels(batch);
        results.push(response);
        
        setProgress(Math.round((i + batch.length) / shipmentRequests.length * 100));
      }

      // Combine results
      const successful = results.flatMap(r => r.successful);
      const failed = results.flatMap(r => r.failed);

      // Update Firestore with tracking numbers
      const batch = writeBatch(db);
      
      successful.forEach(({ orderId, trackingNumber, trackingUrl }) => {
        const orderRef = doc(db, 'orders', orderId);
        batch.update(orderRef, {
          [`shipments.${dispensaryId}.trackingNumber`]: trackingNumber,
          [`shipments.${dispensaryId}.trackingUrl`]: trackingUrl,
          [`shipments.${dispensaryId}.status`]: 'ready_for_pickup',
          [`shipments.${dispensaryId}.statusHistory`]: [{
            status: 'ready_for_pickup',
            timestamp: new Date(),
            message: 'Shipping label generated',
          }],
        });

        // Track analytics
        analyticsService.trackShippingUpdate(
          orderId,
          'ready_for_pickup',
          dispensaryId
        );
      });

      await batch.commit();

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