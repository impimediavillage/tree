'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrders } from '@/lib/orders';
import type { Order } from '@/types/order';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package2, ShoppingCart, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { OrderDetailDialog } from '@/components/orders/OrderDetailDialog';
import { OrderCard } from '@/components/orders/OrderCard';
import { ReviewSubmissionDialog } from '@/components/reviews/ReviewSubmissionDialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

function OrderHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, currentDispensary } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewOrderData, setReviewOrderData] = useState<{
    orderId: string;
    dispensaryId: string;
    dispensaryName: string;
    dispensaryType: string;
    productIds: string[];
  } | null>(null);

  // Check if user came from checkout and needs to update password
  useEffect(() => {
    const fromCheckout = searchParams?.get('from');
    if (fromCheckout === 'checkout' && currentUser?.signupSource === 'checkout') {
      setShowPasswordDialog(true);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowPasswordDialog(false);
            router.push('/dashboard/leaf/profile');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [searchParams, currentUser, router]);

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

  // Handler to open review dialog
  const handleRateExperience = (order: Order) => {
    // Get dispensary IDs from shipments
    const dispensaryIds = Object.keys(order.shipments || {});
    if (dispensaryIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Unable to find dispensary information for this order.',
        variant: 'destructive'
      });
      return;
    }

    // For now, use the first dispensary (multi-dispensary reviews can be enhanced later)
    const dispensaryId = dispensaryIds[0];
    
    // Get dispensary name and type from order items (CartItem already has these)
    const dispensaryItems = order.items?.filter(item => item.dispensaryId === dispensaryId) || [];
    const dispensaryName = dispensaryItems[0]?.dispensaryName || 'Dispensary';
    const dispensaryType = dispensaryItems[0]?.dispensaryType || 'general';
    
    // Extract product IDs
    const productIds = order.items?.map(item => item.productId).filter(Boolean) || [];

    setReviewOrderData({
      orderId: order.id,
      dispensaryId,
      dispensaryName,
      dispensaryType,
      productIds
    });
    setReviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 max-w-7xl mx-auto">
      {/* Password Update Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-2 border-green-200">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center animate-pulse">
                <KeyRound className="h-8 w-8 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-extrabold text-[#3D2E17]">
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                Welcome to The Wellness Tree!
                <Sparkles className="h-6 w-6 text-yellow-500" />
              </span>
            </DialogTitle>
            <DialogDescription className="text-center text-base text-[#3D2E17] font-semibold mt-4">
              Let's secure your account by updating your password
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Redirecting in</p>
              <div className="text-6xl font-extrabold text-[#006B3E] animate-bounce">
                {countdown}
              </div>
            </div>
            <Button 
              onClick={() => {
                setShowPasswordDialog(false);
                router.push('/dashboard/leaf/profile');
              }}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold"
            >
              Update Password Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-extrabold text-[#3D2E17]">
                Order History
              </h1>
              <p className="text-lg text-[#5D4E37] font-semibold mt-2">View and track all your orders</p>
            </div>
            <Button variant="outline" asChild className="hover:bg-[#5D4E37] hover:text-white">
              <Link href="/dashboard/leaf">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
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
                      onRateExperience={order.status === 'delivered' ? handleRateExperience : undefined}
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

      {/* Review Dialog */}
      {reviewOrderData && (
        <ReviewSubmissionDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          dispensaryId={reviewOrderData.dispensaryId}
          dispensaryName={reviewOrderData.dispensaryName}
          dispensaryType={reviewOrderData.dispensaryType}
          orderId={reviewOrderData.orderId}
          productIds={reviewOrderData.productIds}
        />
      )}
    </div>
  );
}

export default function OrderHistoryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <OrderHistoryContent />
    </Suspense>
  );
}