'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const orderStatuses = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

interface OrderStatusUpdateProps {
  orderId: string;
  dispensaryId: string;
  currentStatus: string;
  onStatusUpdate: () => void;
}

export function OrderStatusUpdate({ 
  orderId, 
  dispensaryId, 
  currentStatus,
  onStatusUpdate 
}: OrderStatusUpdateProps) {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [message, setMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async () => {
    if (!currentUser) return;

    setUpdating(true);
    try {
      const statusUpdate = {
        status,
        message: message || `Order status updated to ${status}`,
        timestamp: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      const orderRef = doc(db, `dispensaries/${dispensaryId}/orders/${orderId}`);
      
      await updateDoc(orderRef, {
        status,
        'shipping.trackingNumber': trackingNumber || null,
        'shipping.trackingUrl': trackingUrl || null,
        'shipping.lastUpdated': serverTimestamp(),
        statusHistory: arrayUnion(statusUpdate)
      });

      toast({
        title: 'Status Updated',
        description: `Order status has been updated to ${status}`,
      });

      // Reset form
      setMessage('');
      onStatusUpdate();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update order status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Order Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select 
            value={status} 
            onValueChange={setStatus}
            disabled={updating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select new status" />
            </SelectTrigger>
            <SelectContent>
              {orderStatuses.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(status === 'shipped' || status === 'out_for_delivery') && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tracking Number</label>
              <Input
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={updating}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tracking URL</label>
              <Input
                placeholder="Enter tracking URL"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                disabled={updating}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Status Message (Optional)</label>
          <Textarea
            placeholder="Add a note about this status update"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={updating}
          />
        </div>

        <Button 
          onClick={handleStatusUpdate}
          disabled={updating || status === currentStatus}
          className="w-full"
        >
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Status'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}