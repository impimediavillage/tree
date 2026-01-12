'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import LiveDeliveryMap from '@/components/customer/LiveDeliveryMap';
import type { DriverDelivery } from '@/types/driver';
import type { Order } from '@/types/order';
import Link from 'next/link';

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<DriverDelivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push(`/login?redirect=/orders/${orderId}/track`);
      return;
    }

    if (!orderId || authLoading) return;

    // Load order
    const loadOrder = async () => {
      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        
        if (!orderDoc.exists()) {
          setError('Order not found');
          setIsLoading(false);
          return;
        }

        const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
        
        // Check if user owns this order
        if (orderData.userId !== currentUser?.uid) {
          setError('You do not have permission to view this order');
          setIsLoading(false);
          return;
        }

        setOrder(orderData);

        // Find active in-house delivery for this order
        const deliveriesSnapshot = await getDoc(doc(db, 'deliveries', orderId));
        
        if (deliveriesSnapshot.exists()) {
          const deliveryData = { id: deliveriesSnapshot.id, ...deliveriesSnapshot.data() } as DriverDelivery;
          setDelivery(deliveryData);

          // Subscribe to delivery updates
          const unsubscribe = onSnapshot(
            doc(db, 'deliveries', deliveriesSnapshot.id),
            (snapshot) => {
              if (snapshot.exists()) {
                setDelivery({ id: snapshot.id, ...snapshot.data() } as DriverDelivery);
              }
            }
          );

          return () => unsubscribe();
        } else {
          setError('No active delivery found for this order');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading order:', err);
        setError('Failed to load order details');
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [orderId, currentUser, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Loading your delivery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-4xl py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!delivery || !order) {
    return (
      <div className="container max-w-4xl py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No active delivery tracking available for this order.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container max-w-7xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/orders')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Order Number</p>
            <p className="font-bold text-lg">#{order.orderNumber}</p>
          </div>
        </div>

        {/* Live Tracking */}
        <LiveDeliveryMap
          delivery={delivery}
          orderId={orderId}
          onStatusUpdate={(status) => {
            console.log('Status updated:', status);
          }}
        />

        {/* Footer Help */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Your order is being delivered with care by The Wellness Tree
              </p>
              <p className="text-xs text-muted-foreground">
                Track updates are refreshed automatically every few seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
