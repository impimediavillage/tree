'use client';

/**
 * Label Generation Dialog
 * Allows dispensary admins to generate shipping labels via ShipLogic or PUDO
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
  prepareShipLogicAddress,
  prepareShipLogicContact,
  prepareShipLogicParcels,
  preparePudoAddress,
  preparePudoContact,
  preparePudoParcels,
  calculateDeclaredValue,
  getServiceLevelCode,
  validateLabelRequest
} from '@/lib/shipping-label-service';
import { Loader2, Package, Truck, MapPin } from 'lucide-react';

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

interface LabelGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any; // Order object from Firestore
  dispensaryId: string;
  dispensaryAddress: any;
  onSuccess: (result: any) => void;
}

// ============== Component ==============

export function LabelGenerationDialog({
  open,
  onOpenChange,
  order,
  dispensaryId,
  dispensaryAddress,
  onSuccess,
}: LabelGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Get shipment data from order
  const shipment = order.shipments?.[dispensaryId];
  const orderProvider = shipment?.shippingProvider || 'shiplogic';
  const orderShippingMethod = shipment?.shippingMethod;

  // Normalize provider to valid type
  const normalizeProvider = (provider: string): 'shiplogic' | 'pudo' => {
    // Check courier_name and service_level for PUDO patterns
    const courierName = orderShippingMethod?.courier_name?.toLowerCase() || '';
    const serviceLevel = orderShippingMethod?.service_level?.toLowerCase() || '';
    const name = orderShippingMethod?.name?.toLowerCase() || '';
    const label = orderShippingMethod?.label?.toLowerCase() || '';
    
    const isPudo = courierName === 'pudo' || 
                   serviceLevel.includes('l2l') || 
                   serviceLevel.includes('ltl') || 
                   serviceLevel.includes('ltd') || 
                   serviceLevel.includes('dtl') ||
                   serviceLevel.includes('d2l') ||
                   serviceLevel.includes('l2d') ||
                   name.includes('locker') ||
                   label.includes('locker') ||
                   provider === 'pudo';
    
    return isPudo ? 'pudo' : 'shiplogic';
  };

  // Determine delivery method from order
  const getDeliveryMethodFromOrder = () => {
    if (!orderShippingMethod) {
      const normalized = normalizeProvider(orderProvider);
      return normalized === 'pudo' ? 'door-to-locker' : 'door-to-door';
    }
    
    // Check courier_name and service_level first (more reliable than provider field)
    const courierName = orderShippingMethod.courier_name?.toLowerCase() || '';
    const serviceLevel = orderShippingMethod.service_level?.toLowerCase() || '';
    const provider = orderShippingMethod.provider || orderProvider;
    const name = orderShippingMethod.name?.toLowerCase() || '';
    const label = orderShippingMethod.label?.toLowerCase() || '';
    
    // Combine all text fields for comprehensive checking
    const fullText = `${name} ${courierName} ${label} ${serviceLevel}`.toLowerCase();
    
    console.log('Detecting delivery method from order:', {
      provider,
      courierName,
      serviceLevel,
      name,
      label,
      fullText
    });
    
    // Detect PUDO by courier_name or service_level patterns (handles malformed provider field)
    const isPudo = courierName === 'pudo' || 
                   serviceLevel.includes('l2l') || 
                   serviceLevel.includes('ltl') || 
                   serviceLevel.includes('ltd') || 
                   serviceLevel.includes('dtl') ||
                   serviceLevel.includes('d2l') ||
                   serviceLevel.includes('l2d') ||
                   name.includes('locker') ||
                   label.includes('locker') ||
                   provider === 'pudo';
    
    if (isPudo) {
      // Check for Door to Door (DTD)
      if (fullText.includes('door to door') || 
          fullText.includes('door-to-door') ||
          fullText.includes('dtd') ||
          fullText.match(/\bd2d\b/)) {
        console.log('Detected: Door to Door (DTD)');
        return 'door-to-door';
      }
      
      // Check for Locker to Locker (LTL)
      if (fullText.includes('locker to locker') || 
          fullText.includes('locker-to-locker') ||
          fullText.includes('ltl') ||
          fullText.match(/\bl2l\b/) ||
          fullText.match(/\bltl\b/)) {
        console.log('Detected: Locker to Locker (LTL)');
        return 'locker-to-locker';
      }
      
      // Check for Locker to Door (LTD)
      if (fullText.includes('locker to door') || 
          fullText.includes('locker-to-door') ||
          fullText.includes('ltd') ||
          fullText.match(/\bl2d\b/)) {
        console.log('Detected: Locker to Door (LTD)');
        return 'locker-to-door';
      }
      
      // Default to Door to Locker (DTL)
      console.log('Detected: Door to Locker (DTL) - default');
      return 'door-to-locker';
    }
    
    // ShipLogic or other courier services
    if (provider === 'shiplogic' || !isPudo) {
      if (fullText.includes('express') || fullText.includes('overnight') || fullText.includes('next day')) {
        console.log('Detected: Door to Door Express');
        return 'door-to-door-express';
      }
      console.log('Detected: Door to Door Economy');
      return 'door-to-door';
    }
    
    console.log('Detected: Default door-to-door');
    return 'door-to-door';
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<LabelGenerationForm>({
    resolver: zodResolver(labelGenerationSchema),
    defaultValues: {
      provider: 'shiplogic',
      deliveryMethod: 'door-to-door',
      parcelLength: '30',
      parcelWidth: '20',
      parcelHeight: '10',
      parcelWeight: '0.5',
      specialInstructions: '',
    },
  });

  const selectedProvider = watch('provider');
  const selectedDeliveryMethod = watch('deliveryMethod');

  // Auto-populate from order when dialog opens
  useEffect(() => {
    if (open && shipment) {
      const detectedProvider = normalizeProvider(orderProvider);
      const detectedMethod = getDeliveryMethodFromOrder();
      
      // Determine which locker ID to use based on delivery method
      let pudoTerminalId = '';
      if (detectedProvider === 'pudo') {
        // Helper to safely extract locker ID
        const getLockerId = (locker: any): string => {
          if (!locker) {
            console.log('getLockerId: locker is null/undefined');
            return '';
          }
          if (typeof locker === 'string') {
            console.log('getLockerId: locker is string:', locker);
            return locker;
          }
          if (typeof locker === 'object') {
            console.log('getLockerId: locker is object:', locker);
            // Try to extract id from object
            if (locker.id) {
              const id = typeof locker.id === 'string' ? locker.id : 
                        typeof locker.id === 'number' ? String(locker.id) :
                        typeof locker.id === 'object' && locker.id.id ? String(locker.id.id) : '';
              console.log('getLockerId: extracted id:', id);
              return id;
            }
          }
          console.log('getLockerId: could not extract id, returning empty');
          return '';
        };

        if (detectedMethod === 'door-to-locker') {
          pudoTerminalId = getLockerId(shipment.destinationLocker);
          console.log('DTL - using destinationLocker:', pudoTerminalId);
        } else if (detectedMethod === 'locker-to-door') {
          pudoTerminalId = getLockerId(shipment.originLocker);
          console.log('LTD - using originLocker:', pudoTerminalId);
        } else if (detectedMethod === 'locker-to-locker') {
          // For LTL, we'll populate with destination locker (can be adjusted)
          pudoTerminalId = getLockerId(shipment.destinationLocker) || getLockerId(shipment.originLocker);
          console.log('LTL - using locker:', pudoTerminalId);
        }
      }
      
      console.log('Resetting form with detected values:', { 
        detectedProvider, 
        detectedMethod,
        pudoTerminalId,
        originLocker: shipment.originLocker,
        destinationLocker: shipment.destinationLocker,
        originalProvider: orderProvider,
        shipment: shipment.shippingMethod 
      });
      
      // Use reset to properly reinitialize the form
      reset({
        provider: detectedProvider,
        deliveryMethod: detectedMethod,
        parcelLength: '30',
        parcelWidth: '20',
        parcelHeight: '10',
        parcelWeight: '0.5',
        specialInstructions: '',
        pudoTerminalId: pudoTerminalId,
      });
    }
  }, [open, shipment, orderProvider, orderShippingMethod, reset]);

  // Reset delivery method if provider changes and current method is not valid for new provider
  useEffect(() => {
    if (selectedDeliveryMethod && selectedProvider) {
      const validOptions = deliveryMethodOptions[selectedProvider];
      
      // Check if validOptions exists before calling .some()
      if (validOptions) {
        const isValid = validOptions.some(opt => opt.value === selectedDeliveryMethod);
        
        if (!isValid) {
          // Set to first valid option for this provider
          const defaultMethod = validOptions[0]?.value || 'door-to-door';
          console.log('Invalid delivery method for provider, resetting to:', defaultMethod);
          setValue('deliveryMethod', defaultMethod);
        }
      }
    }
  }, [selectedProvider, selectedDeliveryMethod, setValue]);

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
      // Debug: Log order data
      console.log('LabelGenerationDialog - Order data:', {
        customerDetails: order.customerDetails,
        shippingAddress: order.shippingAddress,
        items: order.items
      });

      // Prepare common data
      const collectionContact = {
        name: dispensaryAddress.contactName || 'Dispensary Manager',
        phone: dispensaryAddress.phone || '',
        email: dispensaryAddress.email || '',
      };

      const deliveryContact = {
        name: order.customerDetails?.name || '',
        phone: order.customerDetails?.phone || '',
        email: order.customerDetails?.email || '',
      };

      console.log('Prepared contacts:', { collectionContact, deliveryContact });

      const declaredValue = calculateDeclaredValue(order.items);

      if (data.provider === 'shiplogic') {
        // Prepare ShipLogic request
        const collectionAddress = prepareShipLogicAddress(dispensaryAddress, 'business');
        const deliveryAddress = prepareShipLogicAddress(order.shippingAddress, 'residential');
        const parcels = [{
          parcel_description: `Order ${order.orderNumber}`,
          submitted_length_cm: parseFloat(data.parcelLength),
          submitted_width_cm: parseFloat(data.parcelWidth),
          submitted_height_cm: parseFloat(data.parcelHeight),
          submitted_weight_kg: parseFloat(data.parcelWeight),
        }];

        const serviceLevelCode = getServiceLevelCode('shiplogic', data.deliveryMethod) || 'ECO';

        const request = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          dispensaryId,
          collectionAddress,
          collectionContact: prepareShipLogicContact(collectionContact),
          deliveryAddress,
          deliveryContact: prepareShipLogicContact(deliveryContact),
          parcels,
          serviceLevelCode,
          declaredValue,
          specialInstructions: data.specialInstructions,
        };

        // Validate before sending
        const validation = validateLabelRequest(request);
        if (!validation.valid) {
          toast({
            title: 'Validation Error',
            description: validation.errors.join(', '),
            variant: 'destructive',
          });
          return;
        }

        const result = await createShipLogicLabel(request);

        toast({
          title: 'Label Generated',
          description: `ShipLogic tracking number: ${result.trackingNumber}`,
        });

        onSuccess(result);
        onOpenChange(false);

      } else if (data.provider === 'pudo') {
        // Prepare PUDO request
        const collectionAddressType = data.deliveryMethod === 'locker-to-locker' || data.deliveryMethod === 'locker-to-door' 
          ? 'locker' 
          : 'business';
        const deliveryAddressType = data.deliveryMethod === 'door-to-locker' || data.deliveryMethod === 'locker-to-locker'
          ? 'locker'
          : 'residential';

        // Determine which terminal ID to use based on delivery method
        // For LTD or LTL: collection uses origin locker
        // For DTL or LTL: delivery uses destination locker
        const collectionTerminalId = collectionAddressType === 'locker' 
          ? data.pudoTerminalId  // This should be origin locker ID for LTD/LTL
          : undefined;
        const deliveryTerminalId = deliveryAddressType === 'locker' 
          ? data.pudoTerminalId  // This should be destination locker ID for DTL/LTL
          : undefined;

        console.log('PUDO Label Request:', {
          deliveryMethod: data.deliveryMethod,
          collectionAddressType,
          deliveryAddressType,
          collectionTerminalId,
          deliveryTerminalId,
          formPudoTerminalId: data.pudoTerminalId,
          originLocker: shipment?.originLocker,
          destinationLocker: shipment?.destinationLocker
        });

        // Validate that terminal ID exists when needed
        if (collectionAddressType === 'locker' && !collectionTerminalId) {
          toast({
            title: 'Validation Error',
            description: 'Origin locker terminal ID is required for this delivery method',
            variant: 'destructive',
          });
          return;
        }

        if (deliveryAddressType === 'locker' && !deliveryTerminalId) {
          toast({
            title: 'Validation Error',
            description: 'Destination locker terminal ID is required for this delivery method',
            variant: 'destructive',
          });
          return;
        }

        // For locker addresses, we only need terminal_id, not full address data
        // Log locker info for debugging but don't warn - it's expected behavior
        if (collectionAddressType === 'locker' && shipment?.originLocker) {
          console.log('Using origin locker:', {
            id: shipment.originLocker.id,
            name: shipment.originLocker.name
          });
        }

        if (deliveryAddressType === 'locker' && shipment?.destinationLocker) {
          console.log('Using destination locker:', {
            id: shipment.destinationLocker.id,
            name: shipment.destinationLocker.name
          });
        }

        const collectionAddress = collectionAddressType === 'locker' && shipment?.originLocker
          ? preparePudoAddress(
              {
                // For locker type: PUDO uses terminal_id and coordinates, NOT street address
                // Lockers don't have street addresses for privacy - only coordinates and area info
                street: '', // Empty for locker - PUDO uses terminal_id instead
                streetAddress: '',
                suburb: shipment.originLocker.city || '',
                city: shipment.originLocker.city || dispensaryAddress.city,
                province: shipment.originLocker.province || dispensaryAddress.province,
                postalCode: shipment.originLocker.postalCode || dispensaryAddress.postalCode,
                country: 'ZA',
                latitude: shipment.originLocker.location?.lat || dispensaryAddress.latitude,
                longitude: shipment.originLocker.location?.lng || dispensaryAddress.longitude
              },
              collectionAddressType,
              collectionTerminalId
            )
          : preparePudoAddress(dispensaryAddress, collectionAddressType, collectionTerminalId);

        const deliveryAddress = deliveryAddressType === 'locker' && shipment?.destinationLocker
          ? preparePudoAddress(
              {
                // For locker type: PUDO uses terminal_id and coordinates, NOT street address
                street: '', // Empty for locker - PUDO uses terminal_id instead
                streetAddress: '',
                suburb: shipment.destinationLocker.city || '',
                city: shipment.destinationLocker.city || order.shippingAddress.city,
                province: shipment.destinationLocker.province || order.shippingAddress.province,
                postalCode: shipment.destinationLocker.postalCode || order.shippingAddress.postalCode,
                country: 'ZA',
                latitude: shipment.destinationLocker.location?.lat || order.shippingAddress.latitude,
                longitude: shipment.destinationLocker.location?.lng || order.shippingAddress.longitude
              },
              deliveryAddressType,
              deliveryTerminalId
            )
          : preparePudoAddress(order.shippingAddress, deliveryAddressType, deliveryTerminalId);

        console.log('Prepared PUDO Addresses:', {
          collection: collectionAddress,
          delivery: deliveryAddress,
          collectionHasTerminal: !!collectionAddress.terminal_id,
          deliveryHasTerminal: !!deliveryAddress.terminal_id,
          collectionKeys: Object.keys(collectionAddress),
          deliveryKeys: Object.keys(deliveryAddress),
          deliveryMethod: data.deliveryMethod
        });

        const parcels = [{
          parcel_description: `Order ${order.orderNumber}`,
          submitted_length_cm: parseFloat(data.parcelLength),
          submitted_width_cm: parseFloat(data.parcelWidth),
          submitted_height_cm: parseFloat(data.parcelHeight),
          submitted_weight_kg: parseFloat(data.parcelWeight),
        }];

        const serviceLevelCode = getServiceLevelCode('pudo', data.deliveryMethod);

        const request = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          dispensaryId,
          collectionAddress,
          collectionContact: preparePudoContact(collectionContact),
          deliveryAddress,
          deliveryContact: preparePudoContact(deliveryContact),
          parcels,
          serviceLevelCode,
          declaredValue,
          specialInstructionsCollection: data.specialInstructions,
          specialInstructionsDelivery: data.specialInstructions,
        };

        // Validate before sending
        const validation = validateLabelRequest(request);
        if (!validation.valid) {
          toast({
            title: 'Validation Error',
            description: validation.errors.join(', '),
            variant: 'destructive',
          });
          return;
        }

        // Additional validation for PUDO address structures
        const collectionIsLocker = collectionAddress.terminal_id && Object.keys(collectionAddress).length === 1;
        const deliveryIsLocker = deliveryAddress.terminal_id && Object.keys(deliveryAddress).length === 1;

        console.log('PUDO Address Validation:', {
          deliveryMethod: data.deliveryMethod,
          serviceLevelCode,
          collectionIsLocker,
          deliveryIsLocker,
          collectionAddress,
          deliveryAddress
        });

        // Validate address types match delivery method
        if (data.deliveryMethod === 'locker-to-locker') {
          if (!collectionIsLocker || !deliveryIsLocker) {
            toast({
              title: 'Validation Error',
              description: 'Locker to Locker requires both addresses to be locker addresses with only terminal_id',
              variant: 'destructive',
            });
            return;
          }
        } else if (data.deliveryMethod === 'locker-to-door') {
          if (!collectionIsLocker || deliveryIsLocker) {
            toast({
              title: 'Validation Error',
              description: 'Locker to Door requires locker collection and physical door delivery',
              variant: 'destructive',
            });
            return;
          }
        } else if (data.deliveryMethod === 'door-to-locker') {
          if (collectionIsLocker || !deliveryIsLocker) {
            toast({
              title: 'Validation Error',
              description: 'Door to Locker requires physical door collection and locker delivery',
              variant: 'destructive',
            });
            return;
          }
        }

        const result = await createPudoLabel(request);

        toast({
          title: 'Label Generated',
          description: `PUDO tracking: ${result.trackingNumber}${result.accessCode ? ` (Access Code: ${result.accessCode})` : ''}`,
        });

        onSuccess(result);
        onOpenChange(false);
      }

    } catch (error: any) {
      console.error('Error generating label:', error);
      toast({
        title: 'Label Generation Failed',
        description: error.message || 'Failed to generate shipping label. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Shipping Label</DialogTitle>
          <DialogDescription>
            Create a shipping label for order #{order?.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Provider Selection - Auto-selected from order */}
          <div className="space-y-2">
            <Label htmlFor="provider">Shipping Provider *</Label>
            <div className="p-3 bg-muted rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-3">
                {selectedProvider === 'shiplogic' ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">ShipLogic</p>
                      <p className="text-xs text-muted-foreground">Door-to-Door Courier Service</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">PUDO</p>
                      <p className="text-xs text-muted-foreground">Locker Network Service</p>
                    </div>
                  </>
                )}
                <div className="ml-auto">
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                    From Order
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Provider is auto-selected based on the customer's shipping choice
            </p>
          </div>

          {/* Delivery Method */}
          <div className="space-y-2">
            <Label htmlFor="deliveryMethod">Delivery Method *</Label>
            <Select
              value={selectedDeliveryMethod}
              onValueChange={(value) => setValue('deliveryMethod', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {deliveryMethodOptions[selectedProvider]?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.deliveryMethod && (
              <p className="text-sm text-red-500">{errors.deliveryMethod.message}</p>
            )}
          </div>

          {/* PUDO Terminal ID (for locker deliveries) */}
          {selectedProvider === 'pudo' && selectedDeliveryMethod && selectedDeliveryMethod !== 'door-to-door' && (
            <div className="space-y-2">
              <Label htmlFor="pudoTerminalId">
                PUDO Terminal ID
                {(selectedDeliveryMethod === 'door-to-locker' || selectedDeliveryMethod === 'locker-to-locker') && ' (Destination)'}
                {selectedDeliveryMethod === 'locker-to-door' && ' (Origin)'}
              </Label>
              <Input
                id="pudoTerminalId"
                placeholder="e.g., CPT001"
                {...register('pudoTerminalId')}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-sm text-muted-foreground">
                {selectedDeliveryMethod === 'door-to-locker' && 'Destination locker ID for customer pickup'}
                {selectedDeliveryMethod === 'locker-to-door' && 'Origin locker ID where parcel will be collected from'}
                {selectedDeliveryMethod === 'locker-to-locker' && 'Destination locker ID for customer pickup'}
                {(() => {
                  // Helper to safely extract locker property
                  const getLockerValue = (locker: any, prop: string): string => {
                    if (!locker || typeof locker !== 'object') return '';
                    const value = locker[prop];
                    if (typeof value === 'string') return value;
                    if (typeof value === 'number') return String(value);
                    if (typeof value === 'object' && value?.id) return String(value.id);
                    return '';
                  };

                  const locker = selectedDeliveryMethod === 'locker-to-door' 
                    ? shipment?.originLocker 
                    : shipment?.destinationLocker;
                  
                  const name = getLockerValue(locker, 'name');
                  const address = getLockerValue(locker, 'address');
                  const id = getLockerValue(locker, 'id');
                  
                  if (locker && typeof locker === 'object' && (name || address || id)) {
                    return (
                      <span className="block mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                        <span className="font-medium text-primary block">Selected Locker:</span>
                        {name && <span className="block text-sm">{name}</span>}
                        {address && <span className="block text-xs text-muted-foreground">{address}</span>}
                        {id && <span className="block text-xs text-primary mt-1">ID: {id}</span>}
                      </span>
                    );
                  }
                  return null;
                })()}
              </p>
            </div>
          )}

          {/* Parcel Dimensions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <Label>Parcel Dimensions</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parcelLength">Length (cm) *</Label>
                <Input
                  id="parcelLength"
                  type="number"
                  step="0.1"
                  {...register('parcelLength')}
                />
                {errors.parcelLength && (
                  <p className="text-sm text-red-500">{errors.parcelLength.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelWidth">Width (cm) *</Label>
                <Input
                  id="parcelWidth"
                  type="number"
                  step="0.1"
                  {...register('parcelWidth')}
                />
                {errors.parcelWidth && (
                  <p className="text-sm text-red-500">{errors.parcelWidth.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelHeight">Height (cm) *</Label>
                <Input
                  id="parcelHeight"
                  type="number"
                  step="0.1"
                  {...register('parcelHeight')}
                />
                {errors.parcelHeight && (
                  <p className="text-sm text-red-500">{errors.parcelHeight.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelWeight">Weight (kg) *</Label>
                <Input
                  id="parcelWeight"
                  type="number"
                  step="0.1"
                  {...register('parcelWeight')}
                />
                {errors.parcelWeight && (
                  <p className="text-sm text-red-500">{errors.parcelWeight.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              placeholder="e.g., Leave at gate, call on arrival..."
              rows={3}
              {...register('specialInstructions')}
            />
          </div>

          {/* Order Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-medium">Order Summary</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Customer:</span> {order?.customerDetails?.name}</p>
              <p><span className="font-medium">Address:</span> {order?.shippingAddress?.streetAddress}, {order?.shippingAddress?.city}</p>
              <p><span className="font-medium">Items:</span> {order?.items?.length || 0} items</p>
              <p><span className="font-medium">Declared Value:</span> R{calculateDeclaredValue(order?.items || []).toFixed(2)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Label'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
