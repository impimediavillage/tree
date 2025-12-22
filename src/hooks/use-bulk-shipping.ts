import { useState } from 'react';
import { Order } from '@/types/order';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { writeBatch, doc, updateDoc, collection, getDoc } from 'firebase/firestore';
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
      // Get dispensary information for collection address
      const dispensaryDoc = await getDoc(doc(db, 'dispensaries', dispensaryId));
      if (!dispensaryDoc.exists()) {
        throw new Error('Dispensary information not found');
      }
      const dispensaryData = dispensaryDoc.data();

      // Prepare shipment requests
      const shipmentRequests = orders.map((order: any) => {
        const dispensaryShipment = order.shipments[dispensaryId];
        if (!dispensaryShipment) throw new Error(`No shipment found for order ${order.id}`);

        // Determine provider from shipping method
        const shippingMethod = dispensaryShipment.shippingMethod;
        const provider = shippingMethod?.courier_name?.toLowerCase().includes('pudo') || 
                        shippingMethod?.service_level?.toLowerCase().includes('l2') ||
                        shippingMethod?.service_level?.toLowerCase().includes('d2l') ||
                        shippingMethod?.service_level?.toLowerCase().includes('ltl')
                        ? 'pudo' : 'shiplogic';

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          provider,
          items: dispensaryShipment.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            weight: item.weight || 0.5,
            length: item.length || 30,
            width: item.width || 20,
            height: item.height || 10,
            price: item.price
          })),
          shippingAddress: order.shippingAddress,
          customerDetails: order.customerDetails,
          shippingMethod: dispensaryShipment.shippingMethod,
          originLocker: dispensaryShipment.originLocker,
          destinationLocker: dispensaryShipment.destinationLocker,
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
            let result;

            if (request.provider === 'shiplogic') {
              // ShipLogic Label Generation
              const collectionAddress = shippingLabelService.prepareShipLogicAddress(
                {
                  street: dispensaryData.address?.streetAddress || dispensaryData.address?.street || '',
                  suburb: dispensaryData.address?.suburb || '',
                  city: dispensaryData.address?.city || '',
                  province: dispensaryData.address?.province || '',
                  postalCode: dispensaryData.address?.postalCode || '',
                  country: 'ZA'
                },
                'business'
              );

              const deliveryAddress = shippingLabelService.prepareShipLogicAddress(
                {
                  street: request.shippingAddress.streetAddress || request.shippingAddress.street || '',
                  suburb: request.shippingAddress.suburb || '',
                  city: request.shippingAddress.city || '',
                  province: request.shippingAddress.province || '',
                  postalCode: request.shippingAddress.postalCode || '',
                  country: 'ZA'
                },
                'residential'
              );

              const collectionContact = shippingLabelService.prepareShipLogicContact({
                name: dispensaryData.dispensaryName || dispensaryData.businessName || 'Store',
                phone: dispensaryData.phoneNumber || dispensaryData.phone || '',
                email: dispensaryData.email || ''
              });

              const deliveryContact = shippingLabelService.prepareShipLogicContact({
                name: request.customerDetails.name || request.customerDetails.fullName || '',
                phone: request.customerDetails.phone || request.customerDetails.mobile || '',
                email: request.customerDetails.email || ''
              });

              const parcels = shippingLabelService.prepareShipLogicParcels(request.items);
              const declaredValue = shippingLabelService.calculateDeclaredValue(request.items);

              result = await shippingLabelService.createShipLogicLabel({
                orderId: request.orderId,
                orderNumber: request.orderNumber,
                dispensaryId,
                collectionAddress,
                collectionContact,
                deliveryAddress,
                deliveryContact,
                parcels,
                serviceLevelCode: request.shippingMethod?.service_level || 'ECO',
                declaredValue,
                specialInstructions: `Order ${request.orderNumber}`
              });
            } else {
              // PUDO Label Generation
              const isLockerCollection = request.originLocker?.id;
              const isLockerDelivery = request.destinationLocker?.id;

              const collectionAddress = isLockerCollection
                ? shippingLabelService.preparePudoAddress({}, 'locker', request.originLocker.id)
                : shippingLabelService.preparePudoAddress(
                    {
                      street: dispensaryData.address?.streetAddress || dispensaryData.address?.street || '',
                      suburb: dispensaryData.address?.suburb || '',
                      city: dispensaryData.address?.city || '',
                      province: dispensaryData.address?.province || '',
                      postalCode: dispensaryData.address?.postalCode || '',
                      country: 'ZA',
                      latitude: dispensaryData.address?.latitude,
                      longitude: dispensaryData.address?.longitude
                    },
                    'business',
                    undefined
                  );

              const deliveryAddress = isLockerDelivery
                ? shippingLabelService.preparePudoAddress({}, 'locker', request.destinationLocker.id)
                : shippingLabelService.preparePudoAddress(
                    {
                      street: request.shippingAddress.streetAddress || request.shippingAddress.street || '',
                      suburb: request.shippingAddress.suburb || '',
                      city: request.shippingAddress.city || '',
                      province: request.shippingAddress.province || '',
                      postalCode: request.shippingAddress.postalCode || '',
                      country: 'ZA',
                      latitude: request.shippingAddress.latitude,
                      longitude: request.shippingAddress.longitude
                    },
                    'residential',
                    undefined
                  );

              const collectionContact = shippingLabelService.preparePudoContact({
                name: dispensaryData.dispensaryName || dispensaryData.businessName || 'Store',
                phone: dispensaryData.phoneNumber || dispensaryData.phone || '',
                email: dispensaryData.email || ''
              });

              const deliveryContact = shippingLabelService.preparePudoContact({
                name: request.customerDetails.name || request.customerDetails.fullName || '',
                phone: request.customerDetails.phone || request.customerDetails.mobile || '',
                email: request.customerDetails.email || ''
              });

              const parcels = shippingLabelService.preparePudoParcels(request.items);
              const declaredValue = shippingLabelService.calculateDeclaredValue(request.items);

              result = await shippingLabelService.createPudoLabel({
                orderId: request.orderId,
                orderNumber: request.orderNumber,
                dispensaryId,
                collectionAddress,
                collectionContact,
                deliveryAddress,
                deliveryContact,
                parcels,
                serviceLevelCode: shippingLabelService.getServiceLevelCode('pudo', request.shippingMethod?.service_level || 'door-to-locker'),
                declaredValue,
                specialInstructionsCollection: `Order ${request.orderNumber}`,
                specialInstructionsDelivery: `Order ${request.orderNumber}`
              });
            }

            successful.push({
              orderId: request.orderId,
              trackingNumber: result.trackingNumber,
              trackingUrl: result.trackingUrl,
              accessCode: result.accessCode,
              provider: result.provider
            });
          } catch (error) {
            console.error(`Failed to generate label for order ${request.orderId}:`, error);
            failed.push({
              orderId: request.orderId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        setProgress(Math.round((i + batch.length) / shipmentRequests.length * 100));
      }

      // Update Firestore with tracking numbers for successful labels
      const firestoreBatch = writeBatch(db);
      
      successful.forEach(({ orderId, trackingNumber, trackingUrl, accessCode, provider }) => {
        const orderRef = doc(db, 'orders', orderId);
        const updateData: any = {
          [`shipments.${dispensaryId}.trackingNumber`]: trackingNumber,
          [`shipments.${dispensaryId}.trackingUrl`]: trackingUrl,
          [`shipments.${dispensaryId}.status`]: 'ready_for_pickup',
          [`shipments.${dispensaryId}.labelGeneratedAt`]: new Date(),
          [`shipments.${dispensaryId}.statusHistory`]: [{
            status: 'ready_for_pickup',
            timestamp: new Date(),
            message: `Shipping label generated via ${provider}`,
          }],
        };

        if (accessCode) {
          updateData[`shipments.${dispensaryId}.accessCode`] = accessCode;
        }

        firestoreBatch.update(orderRef, updateData);
      });

      await firestoreBatch.commit();

      // Show success/failure summary
      const message = failed.length === 0
        ? `Successfully generated ${successful.length} shipping label${successful.length !== 1 ? 's' : ''}`
        : `Generated ${successful.length} label${successful.length !== 1 ? 's' : ''}. Failed: ${failed.length}`;

      toast({
        title: 'Bulk Label Generation Complete',
        description: message,
        variant: failed.length > 0 ? 'destructive' : 'default',
      });

      if (failed.length > 0) {
        console.error('Failed labels:', failed);
      }

      options.onSuccess?.();
    } catch (error) {
      console.error('Error generating shipping labels:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate shipping labels. Please try again.',
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