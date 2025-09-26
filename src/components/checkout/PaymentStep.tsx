
'use client';

import type { CartItem as CartItemType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Match the rate object structure from the CheckoutFlow component
interface ShippingRate {
  name: string;
  rate: number;
  courier_name: string;
  delivery_time: string;
}

// Match the address data structure
interface ShippingAddress {
  fullName: string;
  phoneNumber: string;
  shippingAddress: {
    address: string;
  };
}

interface PaymentStepProps {
  cart: CartItemType[];
  shippingMethod: ShippingRate;
  shippingAddress: ShippingAddress;
  onBack: () => void;
  // onConfirmOrder: () => void; // This will be used to trigger the final order placement
}

export function PaymentStep({ cart, shippingMethod, shippingAddress, onBack }: PaymentStepProps) {
  
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const shippingCost = shippingMethod.rate;
  const total = subtotal + shippingCost;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm and Pay</CardTitle>
        <CardDescription>Review your order details and complete your purchase.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Order Summary</h3>
            <div className="space-y-2">
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
                    <span>Shipping</span>
                    <span>R {shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>R {total.toFixed(2)}</span>
                </div>
            </div>
          </div>

          <div className="space-y-4">
              <h3 className="font-semibold text-lg">Shipping To</h3>
              <div className='p-4 rounded-md border bg-muted/50 text-sm'>
                  <p className='font-bold'>{shippingAddress.fullName}</p>
                  <p>{shippingAddress.shippingAddress.address}</p>
                  <p>{shippingAddress.phoneNumber}</p>
              </div>
              <h3 className="font-semibold text-lg">Shipping Method</h3>
              <div className='p-4 rounded-md border bg-muted/50 text-sm'>
                  <p><span className='font-medium'>{shippingMethod.courier_name}</span> ({shippingMethod.name})</p>
                  <p><span className='font-medium'>Estimated Delivery:</span> {shippingMethod.delivery_time}</p>
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
