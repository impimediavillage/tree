
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Dispensary } from '@/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';

// Placeholder for the new steps we will create
// import { ShippingAddressStep } from '@/components/checkout/ShippingAddressStep';
// import { ShippingMethodStep } from '@/components/checkout/ShippingMethodStep';
// import { PaymentStep } from '@/components/checkout/PaymentStep';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const { currentUser, loading: authLoading } = useAuth();
  const { cart, clearCart, loading: cartLoading } = useCart();
  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const dispensaryId = params.dispensaryId as string;

  useEffect(() => {
    // Persist cart to localStorage before the user navigates away or closes the tab
    const handleBeforeUnload = () => {
      if (cart.length > 0) {
        localStorage.setItem('wellness_tree_checkout_cart', JSON.stringify({ cart, dispensaryId }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart, dispensaryId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser) {
      // If user is not logged in and cart has items, show the auth modal.
      if (cart.length > 0) {
        setShowAuthModal(true);
        // Persist cart immediately for the redirect flow
        localStorage.setItem('wellness_tree_checkout_cart', JSON.stringify({ cart, dispensaryId }));
      } else {
        // If there's no user and no cart, redirect them back to the store page.
        router.replace(`/store/${dispensaryId}`);
      }
    } else {
      setShowAuthModal(false);
    }
  }, [currentUser, authLoading, cart, dispensaryId, router]);

  useEffect(() => {
    async function fetchDispensary() {
      if (!dispensaryId) return;
      try {
        const dispensaryRef = doc(db, 'dispensaries', dispensaryId);
        const dispensarySnap = await getDoc(dispensaryRef);
        if (dispensarySnap.exists()) {
          setDispensary({ id: dispensarySnap.id, ...dispensarySnap.data() } as Dispensary);
        } else {
          console.error("Dispensary not found");
          // Handle dispensary not found error, maybe redirect
        }
      } catch (error) {
        console.error("Error fetching dispensary:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDispensary();
  }, [dispensaryId]);

  const loading = authLoading || isLoading || cartLoading;

  if (loading && !showAuthModal) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Auth Modal for Guest Users
  if (showAuthModal) {
    const redirectPath = `/store/${dispensaryId}/checkout`;
    return (
      <Dialog open={showAuthModal} onOpenChange={() => router.back()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">Complete Your Purchase</DialogTitle>
            <DialogDescription className="pt-2">
              To check out and save your order details, please log in or create a free Leaf account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-3 pt-4">
            <Button asChild size="lg">
              <Link href={`/auth/signup?redirect=${encodeURIComponent(redirectPath)}`}>
                <UserPlus className="mr-2 h-5 w-5" />
                Create Leaf Account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/auth/signin?redirect=${encodeURIComponent(redirectPath)}`}>
                <LogIn className="mr-2 h-5 w-5" />
                Log In
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // If the user is logged in, proceed with the checkout steps.
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Dispensary: {dispensary?.dispensaryName}</p>
          <p>Next steps: Implement the multi-step checkout form here.</p>
          {/*
            Step 1: <ShippingAddressStep user={currentUser} />
            Step 2: <ShippingMethodStep cart={cart} dispensary={dispensary} />
            Step 3: <PaymentStep cart={cart} dispensary={dispensary} />
          */}
        </CardContent>
      </Card>
    </div>
  );
}
