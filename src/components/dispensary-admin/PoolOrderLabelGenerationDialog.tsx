'use client';

/**
 * Pool Order Label Generation Dialog
 * Allows dispensary admins to generate shipping labels for product pool orders via ShipLogic or PUDO
 * Integrated with the same shipping infrastructure as regular orders
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  createShipLogicLabel, 
  createPudoLabel,
  preparePudoAddress,
  preparePudoContact,
  calculateDeclaredValue,
} from '@/lib/shipping-label-service';
import { Loader2, Package, Truck, MapPin, AlertCircle } from 'lucide-react';
import type { ProductRequest } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// ============== Schema ==============

const labelGenerationSchema = z.object({
  provider: z.enum(['shiplogic', 'pudo'], {
    required_error: 'Please select a shipping provider'
  }),
  deliveryMethod: z.string({
    required_error: 'Please select a delivery method'
  }),
  parcelLength: z.string().min(1, 'Length is required'),
  parcelWidth: z.string().min(1, 'Width is required'),
  parcelHeight: z.string().min(1, 'Height is required'),
  parcelWeight: z.string().min(1, 'Weight is required'),
  specialInstructions: z.string().optional(),
  pudoTerminalId: z.string().optional(),
});

type LabelGenerationForm = z.infer<typeof labelGenerationSchema>;

// ============== Component Props ==============

interface PoolOrderLabelGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductRequest;
  dispensaryId: string;
  dispensaryAddress: any;
  onSuccess: (result: any) => void;
  type: 'incoming' | 'outgoing'; // incoming = you're selling (shipping to buyer), outgoing = you're buying (receiving from seller)
}

// ============== Component ==============

export function PoolOrderLabelGenerationDialog({
  open,
  onOpenChange,
  order,
  dispensaryId,
  dispensaryAddress,
  onSuccess,
  type,
}: PoolOrderLabelGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<LabelGenerationForm>({
    resolver: zodResolver(labelGenerationSchema),
    defaultValues: {
      provider: 'pudo',
      deliveryMethod: 'door-to-locker',
      parcelLength: order.requestedTier?.lengthCm?.toString() || '30',
      parcelWidth: order.requestedTier?.widthCm?.toString() || '20',
      parcelHeight: order.requestedTier?.heightCm?.toString() || '10',
      parcelWeight: order.requestedTier?.weightKgs?.toString() || '1',
      specialInstructions: '',
      pudoTerminalId: '',
    },
  });

  const selectedProvider = watch('provider');
  const selectedDeliveryMethod = watch('deliveryMethod');

  // Reset delivery method when provider changes
  useEffect(() => {
    if (selectedProvider === 'shiplogic') {
      setValue('deliveryMethod', 'door-to-door');
    } else if (selectedProvider === 'pudo') {
      setValue('deliveryMethod', 'door-to-locker');
    }
  }, [selectedProvider, setValue]);

  // Delivery method options based on provider
  const deliveryMethodOptions = {
    shiplogic: [
      { value: 'door-to-door', label: 'Door to Door (Economy)' },
      { value: 'door-to-door-express', label: 'Door to Door (Express)' },
    ],
    pudo: [
      { value: 'door-to-door', label: 'Door to Door (DTD)' },
      { value: 'door-to-locker', label: 'Door to Locker (DTL)' },
      { value: 'locker-to-door', label: 'Locker to Door (LTD)' },
      { value: 'locker-to-locker', label: 'Locker to Locker (LTL)' },
    ],
  };

  const onSubmit = async (data: LabelGenerationForm) => {
    setIsGenerating(true);

    try {
      // Determine sender and recipient based on order type
      const isSender = type === 'incoming'; // incoming means you're selling, so you're the sender
      
      // Prepare contacts
      const senderContact = isSender ? {
        name: dispensaryAddress.contactName || 'Dispensary Manager',
        phone: dispensaryAddress.phone || '',
        email: dispensaryAddress.email || '',
      } : {
        name: order.contactPerson,
        phone: order.contactPhone,
        email: order.requesterEmail,
      };

      const recipientContact = isSender ? {
        name: order.contactPerson,
        phone: order.contactPhone,
        email: order.requesterEmail,
      } : {
        name: dispensaryAddress.contactName || 'Dispensary Manager',
        phone: dispensaryAddress.phone || '',
        email: dispensaryAddress.email || '',
      };

      console.log('Pool Order Label Generation:', {
        orderType: type,
        isSender,
        provider: data.provider,
        deliveryMethod: data.deliveryMethod,
        senderContact,
        recipientContact
      });

      const declaredValue = order.quantityRequested * (order.requestedTier?.price || 0);

      if (data.provider === 'pudo') {
        // PUDO Label Generation
        const isLockerDelivery = data.deliveryMethod === 'door-to-locker' || data.deliveryMethod === 'locker-to-locker';
        const isLockerCollection = data.deliveryMethod === 'locker-to-locker' || data.deliveryMethod === 'locker-to-door';

        // For locker addresses, we only need terminal_id
        console.log('Using locker addresses:', {
          isLockerDelivery,
          isLockerCollection,
          originLocker: dispensaryAddress.originLocker,
          destinationLocker: order.destinationLocker
        });

        const collectionAddress = isLockerCollection && dispensaryAddress.originLocker
          ? preparePudoAddress({}, 'locker', dispensaryAddress.originLocker.id)
          : preparePudoAddress({
              street: dispensaryAddress.address,
              city: dispensaryAddress.city,
              province: dispensaryAddress.province,
              postalCode: dispensaryAddress.postalCode,
              country: 'ZA',
              latitude: dispensaryAddress.location?.latitude,
              longitude: dispensaryAddress.location?.longitude
            }, 'business', undefined);

        const deliveryAddress = isLockerDelivery && order.destinationLocker
          ? preparePudoAddress({}, 'locker', order.destinationLocker.id)
          : preparePudoAddress({
              street: order.deliveryAddress,
              city: '', // Would need to parse from deliveryAddress
              province: '',
              postalCode: '',
              country: 'ZA',
            }, 'residential', undefined);

        console.log('Prepared PUDO Addresses:', {
          collection: collectionAddress,
          delivery: deliveryAddress,
        });

        // Build PUDO request
        const pudoRequest = {
          orderId: order.id!,
          orderNumber: order.id!,
          dispensaryId,
          collectionAddress,
          collectionContact: preparePudoContact(senderContact),
          deliveryAddress,
          deliveryContact: preparePudoContact(recipientContact),
          parcels: [{
            parcel_description: `Pool Order: ${order.productName}`,
            submitted_length_cm: parseFloat(data.parcelLength),
            submitted_width_cm: parseFloat(data.parcelWidth),
            submitted_height_cm: parseFloat(data.parcelHeight),
            submitted_weight_kg: parseFloat(data.parcelWeight),
          }],
          serviceLevelCode: getServiceLevelCode('pudo', data.deliveryMethod),
          declaredValue,
          specialInstructionsCollection: data.specialInstructions,
          specialInstructionsDelivery: data.specialInstructions,
        };

        console.log('Sending PUDO request:', pudoRequest);

        const result = await createPudoLabel(pudoRequest as any);

        // Update the ProductRequest document with shipping info
        await updateDoc(doc(db, 'productPoolOrders', order.id!), {
          shippingProvider: 'pudo',
          shippingMethod: {
            id: data.deliveryMethod,
            name: deliveryMethodOptions.pudo.find(m => m.value === data.deliveryMethod)?.label || data.deliveryMethod,
            courier_name: 'PUDO',
            service_level: pudoRequest.serviceLevelCode,
          },
          trackingNumber: result.trackingNumber,
          trackingUrl: result.trackingUrl,
          accessCode: result.accessCode,
          labelCreatedAt: serverTimestamp(),
          shippingStatus: 'ready_for_shipping',
          updatedAt: serverTimestamp(),
        });

        toast({
          title: 'Label Generated',
          description: `PUDO tracking: ${result.trackingNumber}${result.accessCode ? ` (Access Code: ${result.accessCode})` : ''}`,
        });

        onSuccess(result);
        onOpenChange(false);
      } else {
        // ShipLogic Label Generation
        toast({
          title: 'Coming Soon',
          description: 'ShipLogic integration for pool orders is coming soon!',
        });
      }

    } catch (error: any) {
      console.error('Error generating pool order label:', error);
      toast({
        title: 'Label Generation Failed',
        description: error.message || 'Failed to generate shipping label. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Get service level code for PUDO
  const getServiceLevelCode = (provider: 'pudo', method: string): string | undefined => {
    if (provider === 'pudo') {
      const codes: Record<string, string> = {
        'door-to-locker': 'D2LXS - ECO',
        'locker-to-door': 'L2DXS - ECO',
        'locker-to-locker': 'L2LXS - ECO',
      };
      return codes[method];
    }
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Shipping Label</DialogTitle>
          <DialogDescription>
            Create a shipping label for pool order: {order.productName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Order Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Product:</p>
                <p className="font-medium">{order.productName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity:</p>
                <p className="font-medium">{order.quantityRequested} x {order.requestedTier?.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{type === 'incoming' ? 'Buyer' : 'Seller'}:</p>
                <p className="font-medium">{type === 'incoming' ? order.requesterDispensaryName : order.productDetails?.dispensaryName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Value:</p>
                <p className="font-medium">{(order.quantityRequested * (order.requestedTier?.price || 0)).toFixed(2)} {order.productDetails?.currency || 'ZAR'}</p>
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Shipping Provider</Label>
            <Select value={selectedProvider} onValueChange={(value) => setValue('provider', value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pudo">PUDO (Locker Network)</SelectItem>
                <SelectItem value="shiplogic" disabled>ShipLogic (Coming Soon)</SelectItem>
              </SelectContent>
            </Select>
            {errors.provider && (
              <p className="text-sm text-destructive">{errors.provider.message}</p>
            )}
          </div>

          {/* Delivery Method */}
          <div className="space-y-2">
            <Label htmlFor="deliveryMethod">Delivery Method</Label>
            <Select value={selectedDeliveryMethod} onValueChange={(value) => setValue('deliveryMethod', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {deliveryMethodOptions[selectedProvider].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deliveryMethod && (
              <p className="text-sm text-destructive">{errors.deliveryMethod.message}</p>
            )}
          </div>

          {/* Parcel Dimensions */}
          <div className="space-y-4">
            <Label>Parcel Dimensions</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parcelLength">Length (cm)</Label>
                <Input id="parcelLength" type="number" step="0.1" {...register('parcelLength')} />
                {errors.parcelLength && (
                  <p className="text-sm text-destructive">{errors.parcelLength.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelWidth">Width (cm)</Label>
                <Input id="parcelWidth" type="number" step="0.1" {...register('parcelWidth')} />
                {errors.parcelWidth && (
                  <p className="text-sm text-destructive">{errors.parcelWidth.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelHeight">Height (cm)</Label>
                <Input id="parcelHeight" type="number" step="0.1" {...register('parcelHeight')} />
                {errors.parcelHeight && (
                  <p className="text-sm text-destructive">{errors.parcelHeight.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelWeight">Weight (kg)</Label>
                <Input id="parcelWeight" type="number" step="0.1" {...register('parcelWeight')} />
                {errors.parcelWeight && (
                  <p className="text-sm text-destructive">{errors.parcelWeight.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Any special handling or delivery instructions..."
              rows={3}
              {...register('specialInstructions')}
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Label Generation</p>
              <p>
                {type === 'incoming' 
                  ? 'You are the seller. The label will be for shipping this product to the buyer.'
                  : 'You are the buyer. Request the seller to generate and send you the tracking information.'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating || type === 'outgoing'}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  Generate Label
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
