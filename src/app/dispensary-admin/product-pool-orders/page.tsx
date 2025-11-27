
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, or } from 'firebase/firestore';
import type { ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageCheck, Inbox, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { ProductPoolOrderCard } from '@/components/dispensary-admin/ProductPoolOrderCard';

export default function ProductPoolOrdersPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [orders, setOrders] = useState<ProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dispensaryId = currentUser?.dispensaryId;

  const fetchOrders = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const ordersQuery = query(
        collection(db, 'productPoolOrders'),
        or(
            where('productOwnerDispensaryId', '==', id),
            where('requesterDispensaryId', '==', id)
        ),
        orderBy('orderDate', 'desc')
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      const fetchedOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest));
      setOrders(fetchedOrders);

    } catch (error) {
      console.error("Error fetching product pool orders:", error);
      toast({ title: "Error", description: "Failed to load finalized pool orders.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && dispensaryId) {
      fetchOrders(dispensaryId);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, dispensaryId, fetchOrders]);

  const { incomingOrders, outgoingOrders } = useMemo(() => {
    return {
      incomingOrders: orders.filter(o => o.productOwnerDispensaryId === dispensaryId),
      outgoingOrders: orders.filter(o => o.requesterDispensaryId === dispensaryId),
    };
  }, [orders, dispensaryId]);

  const renderOrderGrid = (ordersToRender: ProductRequest[], type: 'incoming' | 'outgoing') => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    if (ordersToRender.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <p>No {type} orders found.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {ordersToRender.map(order => (
          <ProductPoolOrderCard key={order.id} order={order} type={type} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg bg-muted/50 border-primary/30">
        <CardHeader>
          <CardTitle 
            className="text-3xl font-bold text-foreground flex items-center"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <PackageCheck className="mr-3 h-8 w-8 text-primary" /> Finalized Pool Orders
          </CardTitle>
          <CardDescription 
            className="text-md text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Manage shipping and view details for your completed product pool transactions.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="incoming-orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incoming-orders">
            <Inbox className="mr-2 h-4 w-4" /> Incoming (Sold)
          </TabsTrigger>
          <TabsTrigger value="outgoing-orders">
            <Send className="mr-2 h-4 w-4" /> Outgoing (Purchased)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="incoming-orders" className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            These are products you have sold to other stores.
          </p>
          {renderOrderGrid(incomingOrders, 'incoming')}
        </TabsContent>
        <TabsContent value="outgoing-orders" className="pt-4">
           <p className="text-sm text-muted-foreground mb-4">
            These are products you have purchased from other stores.
          </p>
          {renderOrderGrid(outgoingOrders, 'outgoing')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
