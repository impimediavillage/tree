
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Inbox, Send, Loader2 } from 'lucide-react';
import { ProductRequestCard } from '@/components/dispensary-admin/ProductRequestCard';

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
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, dispensaryId, fetchRequests]);

  const handleRequestUpdate = () => {
    if (dispensaryId) {
      fetchRequests(dispensaryId);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
        await deleteDoc(doc(db, 'productRequests', requestId));
        toast({title: "Request Deleted", description: "The request has been permanently removed."});
        fetchRequests(dispensaryId!);
    } catch(error) {
        toast({title: "Error", description: "Could not delete the request.", variant: "destructive"});
        console.error("Error deleting request:", error);
    }
  }

  const incomingPendingCount = incomingRequests.filter(r => r.requestStatus === 'pending_owner_approval').length;
  const outgoingNegotiatingCount = outgoingRequests.filter(r => ['pending_owner_approval', 'accepted'].includes(r.requestStatus)).length;


  if (authLoading || (!dispensaryId && isLoading)) {
    return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  // All dispensaries participate in the Product Pool by default
  // No need to check participateSharing flag anymore

  const renderRequestGrid = (requests: ProductRequest[], type: 'incoming' | 'outgoing') => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    if (requests.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <p>No {type} requests found.</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {requests.map(request => (
          <ProductRequestCard 
            key={request.id} 
            request={request} 
            type={type} 
            onUpdate={handleRequestUpdate}
            onDelete={handleDeleteRequest}
          />
        ))}
      </div>
    );
  };

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
          <TabsTrigger value="outgoing-requests" className="relative">
            <Send className="mr-2 h-4 w-4" /> Outgoing Requests
            {outgoingNegotiatingCount > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                    {outgoingNegotiatingCount}
                </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="incoming-requests" className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            These are requests from other stores for products you have listed in the sharing pool. Review and manage them here.
          </p>
          {renderRequestGrid(incomingRequests, 'incoming')}
        </TabsContent>
        <TabsContent value="outgoing-requests" className="pt-4">
           <p className="text-sm text-muted-foreground mb-4">
            These are requests you have made for products from other stores. Track their status and communicate with the product owner.
          </p>
          {renderRequestGrid(outgoingRequests, 'outgoing')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
