
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
  customerName?: string;
  customerPhone?: string;
  dialCode?: string;
  onBack: () => void;
}

export function PaymentStep({ cart, groupedCart, shippingSelections, shippingAddress, customerName, customerPhone, dialCode, onBack }: PaymentStepProps) {
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
            shippingAddress: {
              address: shippingAddress.address,
              streetAddress: shippingAddress.streetAddress,
              suburb: shippingAddress.suburb,
              city: shippingAddress.city,
              province: shippingAddress.province,
              postalCode: shippingAddress.postalCode,
              country: shippingAddress.country,
              latitude: shippingAddress.latitude,
              longitude: shippingAddress.longitude
            },
            phoneNumber: currentUser.phoneNumber || '',
            name: currentUser.displayName || currentUser.email || 'Customer'
          });
          console.log('Shipping address saved to user profile');
        } catch (error) {
          console.error('Failed to save address to user profile:', error);
          // Don't block order completion if address save fails
        }
      }

      // Clear localStorage checkout data after successful order
      try {
        localStorage.removeItem('checkoutFormData');
        console.log('Checkout form data cleared from localStorage');
      } catch (error) {
        console.error('Failed to clear localStorage:', error);
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
        <CardTitle className="text-2xl font-extrabold text-[#3D2E17]">Confirm and Pay</CardTitle>
        <CardDescription className="text-[#5D4E37] font-bold">Review your order details and complete your purchase.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-8">

          {/* LEFT CONTAINER - Customer Details & Free Gifts */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-lg text-[#3D2E17] border-b-2 border-[#3D2E17] pb-2">Customer Details</h3>
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-[#3D2E17]/20 shadow-md space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#5D4E37] uppercase tracking-wide">Full Name</p>
                  <p className="text-base font-extrabold text-[#3D2E17]">{customerName || currentUser?.name || currentUser?.displayName || 'Customer'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#5D4E37] uppercase tracking-wide">Email Address</p>
                  <p className="text-sm font-bold text-[#3D2E17] break-all">{currentUser?.email || 'Not provided'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#5D4E37] uppercase tracking-wide">Telephone</p>
                  <p className="text-sm font-bold text-[#3D2E17]">
                    {dialCode && customerPhone ? `${dialCode} ${customerPhone.replace(dialCode.replace(/\D/g, ''), '')}` : customerPhone || currentUser?.phoneNumber || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-lg text-[#3D2E17] border-b-2 border-[#3D2E17] pb-2">Delivery Address</h3>
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-600/20 shadow-md">
                <p className="text-sm font-bold text-[#3D2E17] leading-relaxed">{fullAddress}</p>
              </div>
            </div>

            {/* Free Gifts Section - Only show if THC products exist */}
            {cart.some(item => item.productType === 'THC') && (
              <div className="space-y-4">
                <h3 className="font-extrabold text-lg text-[#3D2E17] border-b-2 border-[#3D2E17] pb-2">Free Gifts Included 🎁</h3>
                <div className="space-y-3">
                  {cart.filter(item => item.productType === 'THC').map(item => (
                    <div key={`gift-${item.id}`} className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-400/30 shadow-md">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">🎁</span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-xs font-bold text-purple-600 uppercase">Free Gift with Purchase</p>
                          <p className="text-sm font-extrabold text-[#3D2E17]">
                            {item.quantity} × FREE {item.unit || 'unit'} of {(item as any).originalName || item.name}
                          </p>
                          <p className="text-xs font-bold text-[#5D4E37]">
                            Included with your {item.name} purchase
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Methods */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-lg text-[#3D2E17] border-b-2 border-[#3D2E17] pb-2">Shipping Methods</h3>
              <div className="space-y-3">
                {Object.entries(shippingSelections).map(([dispensaryId, rate]) => rate && (
                  <div key={dispensaryId} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400/20 shadow-md">
                    <p className="text-xs font-bold text-blue-600 uppercase mb-2">From: {groupedCart[dispensaryId]?.dispensaryName}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-extrabold text-[#3D2E17]">{rate.courier_name} ({rate.name})</p>
                      <p className="text-base font-extrabold text-[#3D2E17]">R {rate.rate.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT CONTAINER - Order Summary */}
          <div className="space-y-6">
            <h3 className="font-extrabold text-lg text-[#3D2E17] border-b-2 border-[#3D2E17] pb-2">Order Summary</h3>
            
            {/* Order Items */}
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-start p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex-1">
                    <p className="font-bold text-[#3D2E17] text-sm">{item.name}</p>
                    <p className="text-xs text-[#5D4E37] font-semibold mt-1">Qty: {item.quantity}</p>
                    {item.productType === 'THC' && (
                      <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                        <span>🎁</span> +{item.quantity} FREE {item.unit || 'gift'}
                      </p>
                    )}
                  </div>
                  <p className="font-extrabold text-[#3D2E17]">R {(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-[#3D2E17]/20 shadow-lg">
              <div className="flex justify-between items-center pb-3 border-b border-[#3D2E17]/20">
                <span className="font-bold text-[#5D4E37]">Subtotal</span>
                <span className="font-extrabold text-[#3D2E17]">R {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[#3D2E17]/20">
                <span className="font-bold text-[#5D4E37]">Total Shipping</span>
                <span className="font-extrabold text-[#3D2E17]">R {totalShippingCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-extrabold text-[#3D2E17]">Grand Total</span>
                <span className="text-2xl font-extrabold text-[#3D2E17]">R {total.toFixed(2)}</span>
              </div>
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
