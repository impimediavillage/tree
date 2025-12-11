
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
      <div className="container mx-auto py-8 px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="bg-muted/50 border border-border/50 rounded-lg p-6 md:p-8 shadow-lg mb-8 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#3D2E17]">
              Checkout
            </h1>
            <p className="text-lg md:text-xl font-bold text-[#3D2E17] mt-3">
              Loading your items...
            </p>
          </div>
          <div className='space-y-4'>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="bg-muted/50 border border-border/50 rounded-lg p-6 md:p-8 shadow-lg mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#3D2E17]">
            Checkout
          </h1>
          <p className="text-lg md:text-xl font-bold text-[#3D2E17] mt-3">
            Complete your purchase below.
          </p>
        </div>
        <CheckoutFlow groupedCart={groupedCart} />
      </div>
    </div>
  );
}
