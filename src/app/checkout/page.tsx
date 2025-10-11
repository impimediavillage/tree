
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { useCart } from '@/contexts/CartContext';
import type { GroupedCart } from '@/contexts/CartContext'; // Assuming you export this type
import { Skeleton } from '@/components/ui/skeleton';

export default function CheckoutPage() {
  const { getGroupedCart, loading: cartLoading, cartItems } = useCart();
  const [groupedCart, setGroupedCart] = useState<GroupedCart>({});
  const [clientMounted, setClientMounted] = useState(false);

  useEffect(() => {
    setClientMounted(true);
  }, []);

  useEffect(() => {
    if (clientMounted && !cartLoading) {
      setGroupedCart(getGroupedCart());
    }
  }, [clientMounted, cartLoading, getGroupedCart, cartItems]);

  // Render a loading skeleton while the cart is loading or the component is mounting
  if (!clientMounted || cartLoading) {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="bg-transparent border-0 shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">Checkout</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">Loading your items...</CardDescription>
            </CardHeader>
            <CardContent className='mt-8'>
              <div className='space-y-4'>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Card className="bg-transparent border-0 shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">Checkout</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">Complete your purchase below.</CardDescription>
          </CardHeader>
          <CardContent>
            <CheckoutFlow groupedCart={groupedCart} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
