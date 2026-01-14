"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  MapPin,
  Package,
  Navigation,
  Phone,
  Clock,
  DollarSign,
  Star,
  AlertCircle,
  Truck,
  MapPinned,
  Flag,
  XCircle,
} from 'lucide-react';
import { updateDeliveryStatus, completeDelivery } from '@/lib/driver-service';
import { startDriverLocationTracking, stopDriverLocationTracking } from '@/lib/location-service';
import type { DriverProfile, DeliveryStatus } from '@/types/driver';
import { FailedDeliveryDialog } from './FailedDeliveryDialog';

interface ActiveDeliveryCardProps {
  driverProfile: DriverProfile;
  onComplete: () => void;
}

export default function ActiveDeliveryCard({
  driverProfile,
  onComplete,
}: ActiveDeliveryCardProps) {
  const { toast } = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showFailedDialog, setShowFailedDialog] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [customerFeedback, setCustomerFeedback] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const currentDelivery = driverProfile.currentDeliveryId 
    ? driverProfile.activeDelivery 
    : null;

  useEffect(() => {
    // Auto-start location tracking when delivery becomes active
    if (currentDelivery && ['claimed', 'picked_up', 'en_route'].includes(currentDelivery.status)) {
      handleStartTracking();
    }

    // Cleanup on unmount
    return () => {
      if (isTracking) {
        stopDriverLocationTracking(driverProfile.userId);
      }
    };
  }, [currentDelivery?.id]);

  const handleStartTracking = () => {
    if (!currentDelivery) return;

    startDriverLocationTracking(
      driverProfile.userId,
      currentDelivery.id,
      (location) => {
        setIsTracking(true);
        setLocationError(null);
        console.log('Location updated:', location);
      },
      (error) => {
        setLocationError(error.message);
        setIsTracking(false);
        toast({
          title: "❌ Location Error",
          description: error.message,
          variant: "destructive",
        });
      }
    );
  };

  const handleStopTracking = () => {
    stopDriverLocationTracking(driverProfile.userId);
    setIsTracking(false);
  };

  const handleUpdateStatus = async (newStatus: DeliveryStatus) => {
    if (!currentDelivery) return;

    setIsUpdatingStatus(true);

    try {
      await updateDeliveryStatus(
        currentDelivery.id,
        newStatus as any,
        undefined, // location will be fetched automatically
        undefined  // optional note
      );

      toast({
        title: "✅ Status Updated",
        description: `Delivery marked as ${newStatus.replace('_', ' ')}`,
      });

      onComplete(); // Refresh dashboard data
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "❌ Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!currentDelivery || rating === null) return;

    setIsUpdatingStatus(true);

    try {
      await completeDelivery(
        currentDelivery.id,
        driverProfile.userId,
        rating,
        customerFeedback || undefined
      );

      // Stop location tracking
      handleStopTracking();

      toast({
        title: "🎉 Delivery Complete!",
        description: `You earned R${currentDelivery.driverEarnings.toFixed(2)}`,
      });

      setShowCompleteDialog(false);
      setRating(null);
      setCustomerFeedback('');
      setDriverNotes('');
      onComplete(); // Refresh dashboard data
    } catch (error: any) {
      console.error('Error completing delivery:', error);
      toast({
        title: "❌ Completion Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openNavigation = () => {
    if (!currentDelivery) return;
    
    const { deliveryAddress } = currentDelivery;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${deliveryAddress.latitude},${deliveryAddress.longitude}`;
    window.open(url, '_blank');
  };

  const callCustomer = () => {
    if (!currentDelivery) return;
    window.location.href = `tel:${currentDelivery.customerPhone}`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'claimed': return 'bg-blue-600';
      case 'picked_up': return 'bg-purple-600';
      case 'en_route': return 'bg-orange-600';
      case 'nearby': return 'bg-yellow-600';
      case 'arrived': return 'bg-green-600';
      case 'delivered': return 'bg-emerald-600';
      default: return 'bg-gray-600';
    }
  };

  const getNextAction = (): {
    label: string;
    nextStatus?: DeliveryStatus;
    action?: () => void;
    icon: React.ComponentType<any>;
    description: string;
  } | null => {
    if (!currentDelivery) return null;

    switch (currentDelivery.status) {
      case 'claimed':
        return {
          label: 'Mark as Picked Up',
          nextStatus: 'picked_up',
          icon: Package,
          description: 'Confirm you have collected the order',
        };
      case 'picked_up':
        return {
          label: 'Start Delivery',
          nextStatus: 'en_route',
          icon: Truck,
          description: 'Begin navigation to customer',
        };
      case 'en_route':
        return {
          label: 'Mark as Nearby',
          nextStatus: 'nearby',
          icon: MapPinned,
          description: 'You are close to the delivery address',
        };
      case 'nearby':
        return {
          label: 'Mark as Arrived',
          nextStatus: 'arrived',
          icon: Flag,
          description: 'You have arrived at the location',
        };
      case 'arrived':
        return {
          label: 'Complete Delivery',
          action: () => setShowCompleteDialog(true),
          icon: CheckCircle,
          description: 'Finish delivery and collect rating',
        };
      default:
        return null;
    }
  };

  if (!currentDelivery) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Active Delivery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Active Delivery</h3>
            <p className="text-sm text-muted-foreground">
              Claim a delivery from the Available Deliveries tab to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextAction = getNextAction();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Active Delivery
            </span>
            <Badge className={getStatusBadgeColor(currentDelivery.status)}>
              {currentDelivery.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>Order #{currentDelivery.orderNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{currentDelivery.customerName}</p>
                  <p className="text-sm text-muted-foreground">{currentDelivery.customerPhone}</p>
                </div>
                <Button variant="outline" size="sm" onClick={callCustomer}>
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Pickup Location</p>
                <p className="text-sm text-muted-foreground">
                  {currentDelivery.pickupAddress.streetAddress}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentDelivery.pickupAddress.city}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm mb-1">Delivery Address</p>
                <p className="text-sm text-muted-foreground">
                  {currentDelivery.deliveryAddress.streetAddress}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentDelivery.deliveryAddress.city}
                </p>
                {currentDelivery.deliveryAddress.suburb && (
                  <p className="text-sm text-muted-foreground">
                    {currentDelivery.deliveryAddress.suburb}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {currentDelivery.specialInstructions && (
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm mb-1 text-amber-900 dark:text-amber-100">
                      Special Instructions
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {currentDelivery.specialInstructions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Access Code */}
          {currentDelivery.accessCode && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CardContent className="p-4">
                <p className="font-medium text-sm mb-1 text-green-900 dark:text-green-100">
                  Access Code
                </p>
                <p className="text-2xl font-bold tracking-wider text-green-700 dark:text-green-300">
                  {currentDelivery.accessCode}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Earnings */}
          <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <span className="text-sm font-medium">Your Earnings</span>
            <span className="text-2xl font-bold text-green-600 flex items-center">
              <DollarSign className="w-5 h-5 mr-1" />
              R{currentDelivery.driverEarnings.toFixed(2)}
            </span>
          </div>

          {/* Location Tracking Status */}
          <Card className={isTracking ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className={`w-5 h-5 ${isTracking ? 'text-green-600 animate-pulse' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">
                    {isTracking ? 'Location Tracking Active' : 'Location Tracking Inactive'}
                  </span>
                </div>
                {!isTracking && (
                  <Button variant="outline" size="sm" onClick={handleStartTracking}>
                    Start Tracking
                  </Button>
                )}
              </div>
              {locationError && (
                <p className="text-xs text-red-600 mt-2">{locationError}</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={openNavigation}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Open in Google Maps
            </Button>

            {nextAction && (
              <Button
                onClick={nextAction.action || (() => handleUpdateStatus(nextAction.nextStatus as DeliveryStatus))}
                disabled={isUpdatingStatus}
                size="lg"
                className="w-full"
              >
                {isUpdatingStatus ? (
                  <>Loading...</>
                ) : (
                  <>
                    <nextAction.icon className="w-4 h-4 mr-2" />
                    {nextAction.label}
                  </>
                )}
              </Button>
            )}

            {/* Mark as Failed Button - Show when en_route, nearby, or arrived */}
            {(currentDelivery.status === 'en_route' || 
              currentDelivery.status === 'nearby' || 
              currentDelivery.status === 'arrived') && (
              <Button
                onClick={() => setShowFailedDialog(true)}
                variant="destructive"
                size="lg"
                className="w-full"
                disabled={isUpdatingStatus}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Mark as Failed
              </Button>
            )}

            {nextAction && nextAction.description && (
              <p className="text-xs text-center text-muted-foreground">
                {nextAction.description}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Failed Delivery Dialog */}
      <FailedDeliveryDialog
        open={showFailedDialog}
        onOpenChange={setShowFailedDialog}
        deliveryId={currentDelivery.id}
        driverId={driverProfile.userId}
        driverEarnings={currentDelivery.driverEarnings}
        onSuccess={() => {
          onComplete();
          handleStopTracking();
        }}
      />

      {/* Complete Delivery Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Delivery</DialogTitle>
            <DialogDescription>
              Confirm delivery and collect customer feedback
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rating */}
            <div className="space-y-2">
              <Label>Rate Customer Experience</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    variant={rating === star ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setRating(star)}
                    className="flex-1"
                  >
                    <Star className={`w-5 h-5 ${rating && rating >= star ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {rating === null && 'Select a rating (required)'}
                {rating === 1 && 'Poor experience'}
                {rating === 2 && 'Below average'}
                {rating === 3 && 'Average'}
                {rating === 4 && 'Good'}
                {rating === 5 && 'Excellent!'}
              </p>
            </div>

            {/* Customer Feedback */}
            <div className="space-y-2">
              <Label htmlFor="customerFeedback">Customer Feedback (Optional)</Label>
              <Textarea
                id="customerFeedback"
                placeholder="Any feedback from the customer?"
                value={customerFeedback}
                onChange={(e) => setCustomerFeedback(e.target.value)}
                rows={3}
              />
            </div>

            {/* Driver Notes */}
            <div className="space-y-2">
              <Label htmlFor="driverNotes">Driver Notes (Optional)</Label>
              <Textarea
                id="driverNotes"
                placeholder="Any notes about this delivery?"
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteDelivery}
              disabled={rating === null || isUpdatingStatus}
            >
              {isUpdatingStatus ? 'Completing...' : 'Complete Delivery'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
