
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CartItem, ShippingRate, AddressValues, GroupedCart } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useReferral } from '@/contexts/ReferralContext';
import { useToast } from '@/hooks/use-toast';
import { createOrder } from '@/lib/order-service';
import { Loader2 } from 'lucide-react';
import { CREATOR_COMMISSION_RATE, PLATFORM_COMMISSION_RATE } from '@/types/creator-lab';

interface PaymentStepProps {
  cart: CartItem[];
  groupedCart: Record<string, { dispensaryName: string; dispensaryType?: string; items: CartItem[] }>;
  shippingSelections: Record<string, ShippingRate | null>;
  shippingAddress: AddressValues['shippingAddress'];
  onBack: () => void;
}

export function PaymentStep({ cart, groupedCart, shippingSelections, shippingAddress, onBack }: PaymentStepProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { clearCart } = useCart();
  const { referralCode } = useReferral();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalShippingCost = Object.values(shippingSelections).reduce((acc, rate) => acc + (rate?.rate || 0), 0);
  const total = subtotal + totalShippingCost;

  const fullAddress = `${shippingAddress.streetAddress}, ${shippingAddress.suburb}, ${shippingAddress.city}, ${shippingAddress.province}, ${shippingAddress.postalCode}`;

  const handleConfirmOrder = async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to complete your order.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const orderPromises = [];

      // Create separate orders for each dispensary/vendor
      for (const [dispensaryId, group] of Object.entries(groupedCart) as [string, { dispensaryName: string; dispensaryType?: string; items: CartItem[] }][]) {
        const shipping = shippingSelections[dispensaryId];
        if (!shipping) continue;

        const groupItems = group.items;
        const groupSubtotal = groupItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
        const groupShippingCost = shipping.rate;
        const groupTotal = groupSubtotal + groupShippingCost;

        // Detect if this is a Treehouse order (dispensaryId === 'treehouse')
        const isTreehouseOrder = dispensaryId === 'treehouse';

        // Calculate commissions for Treehouse orders
        const platformCommission = isTreehouseOrder ? Math.round(groupTotal * PLATFORM_COMMISSION_RATE) : undefined;
        const creatorCommission = isTreehouseOrder ? Math.round(groupTotal * CREATOR_COMMISSION_RATE) : undefined;

        // Get creator info from first item (all items in Treehouse order should have same creator)
        const creatorId = isTreehouseOrder ? groupItems[0]?.creatorId : undefined;
        const creatorName = isTreehouseOrder ? (groupItems[0] as any)?.creatorName : undefined;

        // Extract locker data if present
        const originLocker = (shipping as any).originLocker || null;
        const destinationLocker = (shipping as any).destinationLocker || null;
        
        const orderParams: any = {
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          dispensaryId,
          dispensaryName: group.dispensaryName,
          dispensaryType: group.dispensaryType || 'Unknown',
          items: groupItems,
          shipping: {
            method: 'dtd' as const, // Default to door-to-door
            rate: shipping,
            address: shippingAddress,
            ...(originLocker && { originLocker }),
            ...(destinationLocker && { destinationLocker }),
          },
          subtotal: groupSubtotal,
          shippingCost: groupShippingCost,
          total: groupTotal,
          customerDetails: {
            name: currentUser.displayName || currentUser.email || 'Customer',
            email: currentUser.email || '',
            phone: currentUser.phoneNumber || '',
          },
          // Influencer referral tracking
          ...(referralCode && { referralCode }),
          // Treehouse-specific fields
          orderType: (isTreehouseOrder ? 'treehouse' : 'dispensary') as 'treehouse' | 'dispensary',
          ...(isTreehouseOrder && {
            podStatus: 'pending_print' as const,
            platformCommission,
            creatorCommission,
            creatorId,
            creatorName,
          }),
        };

        orderPromises.push(createOrder(orderParams));
      }

      // Wait for all orders to be created
      const orderRefs = await Promise.all(orderPromises);

      // Save shipping address to user profile for future auto-fill
      if (currentUser) {
        try {
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          await updateDoc(doc(db, 'users', currentUser.uid), {
            shippingAddress: shippingAddress,
            phoneNumber: currentUser.phoneNumber || '',
            name: currentUser.displayName || currentUser.email || 'Customer'
          });
          console.log('Shipping address saved to user profile');
        } catch (error) {
          console.error('Failed to save address to user profile:', error);
          // Don't block order completion if address save fails
        }
      }

      toast({
        title: 'Order(s) Placed Successfully!',
        description: `${orderRefs.length} order(s) have been created. You will receive confirmation via email.`,
      });

      // Clear cart after successful order creation
      clearCart();

      // Redirect to orders page with checkout flag
      router.push('/dashboard/orders?from=checkout');
    } catch (error) {
      console.error('Error creating orders:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm and Pay</CardTitle>
        <CardDescription>Review your order details and complete your purchase.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-8">

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {cart.map(item => {
                // Calculate customer price (with markup and tax)
                const customerPrice = item.price * (1 + (item.taxRate || 0.15));
                return (
                  <div key={item.id} className="flex justify-between items-center">
                    <span>{item.name} (x{item.quantity})</span>
                    <span>R {(customerPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <hr />
            <div className="space-y-2 font-medium">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>R {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total Shipping</span>
                    <span>R {totalShippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                    <span>Grand Total</span>
                    <span>R {total.toFixed(2)}</span>
                </div>
            </div>
          </div>

          <div className="space-y-4">
              <h3 className="font-semibold text-lg">Shipping Details</h3>
              <div className='p-4 rounded-md border bg-muted/50 text-sm'>
                  <p className='font-bold'>Deliver to:</p>
                  <p>{fullAddress}</p>
              </div>
              <h3 className="font-semibold text-lg">Shipping Methods</h3>
                <div className='space-y-2'>
                    {Object.entries(shippingSelections).map(([dispensaryId, rate]) => rate && (
                        <div key={dispensaryId} className='p-3 rounded-md border bg-muted/50 text-sm'>
                            <p className='font-bold'>From: {groupedCart[dispensaryId]?.dispensaryName}</p>
                            <div className='flex justify-between items-center'>
                                <p>{rate.courier_name} ({rate.name})</p>
                                <p className='font-semibold'>R {rate.rate.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
          </div>
        </div>


        {/* Placeholder for Payment Gateway Integration */}
        <div className="rounded-lg border bg-amber-50 text-amber-900 shadow-sm p-6 mt-6">
            <h3 className="font-semibold text-center">⚠️ Development Mode</h3>
            <p className="text-center mt-2">Payment gateway integration pending. Orders will be created without payment processing for testing purposes.</p>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack} disabled={isProcessing}>Back</Button>
          <Button onClick={handleConfirmOrder} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isProcessing ? 'Processing...' : 'Confirm Order'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
