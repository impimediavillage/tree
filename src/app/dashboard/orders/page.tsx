'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrders } from '@/lib/orders';
import type { Order } from '@/types/order';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package2, ShoppingCart } from 'lucide-react';
import { OrderDetailDialog } from '@/components/orders/OrderDetailDialog';
import { OrderCard } from '@/components/orders/OrderCard';
import { useToast } from '@/hooks/use-toast';

export default function OrderHistoryPage() {
  const { user, currentDispensary } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.uid) return;
      setIsLoading(true);
      
      try {
        const allOrders = await Promise.all(
          [
            'Cannibinoid store',
            'Traditional Medicine dispensary',
            'Homeopathic store',
            'Mushroom store',
            'Permaculture & gardening store'
          ].map(type => getUserOrders(user.uid, type))
        );
        
        // Combine and sort all orders by date
        const combinedOrders = allOrders
          .flat()
          .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        
        setOrders(combinedOrders);
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to load your orders. Please try again later.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user, toast]);

  // Group orders by status
  const activeOrders = orders.filter(order => 
    !['delivered', 'cancelled'].includes(order.status));
  const completedOrders = orders.filter(order => 
    ['delivered', 'cancelled'].includes(order.status));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
          <p className="text-muted-foreground">View and track your orders</p>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">No Orders Yet</h3>
                <p className="text-muted-foreground">You haven't placed any orders yet.</p>
              </div>
              <Button variant="outline" asChild>
                <a href="/browse-dispensary-types">Browse Dispensaries</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">
                Active Orders {activeOrders.length > 0 && `(${activeOrders.length})`}
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed Orders {completedOrders.length > 0 && `(${completedOrders.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  onClick={() => setSelectedOrder(order)}
                />
              ))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                  onClick={() => setSelectedOrder(order)}
                />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <OrderDetailDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open: boolean) => !open && setSelectedOrder(null)}
      />
    </div>
  );
}