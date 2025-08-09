
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductRequestTable } from '@/components/dispensary-admin/ProductRequestTable';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Inbox, Send, AlertCircle, Loader2 } from 'lucide-react';

export default function WellnessPoolPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [incomingRequests, setIncomingRequests] = useState<ProductRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const dispensaryId = currentUser?.dispensaryId;

  const fetchRequests = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const incomingQuery = query(
        collection(db, 'productRequests'),
        where('productOwnerDispensaryId', '==', id),
        orderBy('createdAt', 'desc')
      );
      const outgoingQuery = query(
        collection(db, 'productRequests'),
        where('requesterDispensaryId', '==', id),
        orderBy('createdAt', 'desc')
      );
      
      const [incomingSnapshot, outgoingSnapshot] = await Promise.all([
        getDocs(incomingQuery),
        getDocs(outgoingQuery)
      ]);

      const fetchedIncoming = incomingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest));
      const fetchedOutgoing = outgoingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest));

      setIncomingRequests(fetchedIncoming);
      setOutgoingRequests(fetchedOutgoing);

    } catch (error) {
      console.error("Error fetching product requests:", error);
      toast({ title: "Error", description: "Failed to load product requests.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && dispensaryId) {
      fetchRequests(dispensaryId);
    } else if (!authLoading && !dispensaryId) {
        setIsLoading(false);
    }
  }, [authLoading, dispensaryId, fetchRequests]);

  const handleRequestUpdate = () => {
    // Re-fetch all data when an update happens
    if (dispensaryId) {
      fetchRequests(dispensaryId);
    }
  };

  const incomingPendingCount = incomingRequests.filter(r => r.requestStatus === 'pending_owner_approval').length;

  if (authLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!currentUser?.dispensary?.participateSharing || currentUser.dispensary.participateSharing === 'no') {
    return (
        <Card className="mt-6 text-center">
            <CardHeader>
                <AlertCircle className="mx-auto h-12 w-12 text-orange-500" />
                <CardTitle className="text-xl font-semibold">Product Sharing Disabled</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>
                    Your wellness profile is not set up to participate in the product sharing pool.
                    To enable this feature, please edit your profile settings.
                </CardDescription>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg bg-card border-primary/30">
        <CardHeader>
          <CardTitle 
            className="text-3xl font-bold text-foreground flex items-center"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <History className="mr-3 h-8 w-8 text-primary" /> Product Pool Activity
          </CardTitle>
          <CardDescription 
            className="text-md text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Manage incoming and outgoing product sharing requests with other wellness stores.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="incoming-requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incoming-requests" className="relative">
            <Inbox className="mr-2 h-4 w-4" /> Incoming Requests
            {incomingPendingCount > 0 && (
                 <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                    {incomingPendingCount}
                </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing-requests">
            <Send className="mr-2 h-4 w-4" /> Outgoing Requests
          </TabsTrigger>
        </TabsList>
        <TabsContent value="incoming-requests">
          <Card>
            <CardHeader>
              <CardTitle>Incoming Requests</CardTitle>
              <CardDescription>Requests from other wellness stores for your products.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ProductRequestTable 
                  data={incomingRequests} 
                  type="incoming" 
                  onUpdate={handleRequestUpdate} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="outgoing-requests">
          <Card>
            <CardHeader>
              <CardTitle>Outgoing Requests</CardTitle>
              <CardDescription>Requests you have made for products from other wellness stores.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ProductRequestTable 
                  data={outgoingRequests} 
                  type="outgoing" 
                  onUpdate={handleRequestUpdate} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
