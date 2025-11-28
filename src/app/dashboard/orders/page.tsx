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
  const { currentUser, currentDispensary } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser?.uid) return;
      setIsLoading(true);
      
      try {
        // Fetch all orders from the single orders collection
        const userOrders = await getUserOrders(currentUser.uid);
        setOrders(userOrders);
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
  }, [currentUser, toast]);

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
    <div className="container py-8 px-4 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Order History
          </h1>
          <p className="text-muted-foreground mt-2">View and track all your orders</p>
        </div>

        {orders.length === 0 ? (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-2xl">No Orders Yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Start your wellness journey by exploring our dispensaries and placing your first order.
                </p>
              </div>
              <Button size="lg" asChild className="mt-4">
                <a href="/browse-dispensary-types">Browse Dispensaries</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto md:mx-0 grid-cols-2 h-12">
              <TabsTrigger value="active" className="text-base font-semibold">
                Active {activeOrders.length > 0 && `(${activeOrders.length})`}
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-base font-semibold">
                Completed {completedOrders.length > 0 && `(${completedOrders.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeOrders.length === 0 ? (
                <Card className="border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <Package2 className="h-16 w-16 text-muted-foreground/50" />
                    <div>
                      <h3 className="font-semibold text-lg">No Active Orders</h3>
                      <p className="text-muted-foreground text-sm">All your orders have been completed or cancelled.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {activeOrders.map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedOrders.length === 0 ? (
                <Card className="border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <Package2 className="h-16 w-16 text-muted-foreground/50" />
                    <div>
                      <h3 className="font-semibold text-lg">No Completed Orders</h3>
                      <p className="text-muted-foreground text-sm">Your completed orders will appear here.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {completedOrders.map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                    />
                  ))}
                </div>
              )}
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