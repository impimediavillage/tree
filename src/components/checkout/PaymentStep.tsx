
'use client';

import type { CartItem, ShippingRate, AddressValues, GroupedCart } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PaymentStepProps {
  cart: CartItem[];
  groupedCart: GroupedCart;
  shippingSelections: Record<string, ShippingRate>;
  shippingAddress: AddressValues['shippingAddress'];
  onBack: () => void;
}

export function PaymentStep({ cart, groupedCart, shippingSelections, shippingAddress, onBack }: PaymentStepProps) {
  
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalShippingCost = Object.values(shippingSelections).reduce((acc, rate) => acc + (rate?.rate || 0), 0);
  const total = subtotal + totalShippingCost;

  const fullAddress = `${shippingAddress.streetAddress}, ${shippingAddress.suburb}, ${shippingAddress.city}, ${shippingAddress.province}, ${shippingAddress.postalCode}`;

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
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <span>{item.name} (x{item.quantity})</span>
                  <span>R {item.price.toFixed(2)}</span>
                </div>
              ))}
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
                    {Object.entries(shippingSelections).map(([dispensaryId, rate]) => (
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mt-6">
            <h3 className="font-semibold text-center">Payment Gateway Coming Soon</h3>
            <p className="text-center text-muted-foreground mt-2">This is where the credit card input or other payment options will be rendered.</p>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button /* onClick={onConfirmOrder} */ disabled> 
            Confirm Order (Payment Disabled)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
