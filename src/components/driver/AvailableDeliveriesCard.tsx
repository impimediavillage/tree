"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Package, MapPin, Clock, DollarSign, RefreshCw, Navigation, AlertCircle } from 'lucide-react';
import { claimDelivery } from '@/lib/driver-service';
import type { AvailableDelivery } from '@/types/driver';

interface AvailableDeliveriesCardProps {
  deliveries: AvailableDelivery[];
  isLoading: boolean;
  isOnline: boolean;
  driverId: string;
  driverName: string;
  onRefresh: () => void;
  onClaim: (deliveryId: string) => void;
}

export default function AvailableDeliveriesCard({
  deliveries,
  isLoading,
  isOnline,
  driverId,
  driverName,
  onRefresh,
  onClaim,
}: AvailableDeliveriesCardProps) {
  const { toast } = useToast();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (deliveryId: string) => {
    if (!isOnline) {
      toast({
        title: "❌ You're Offline",
        description: "Go online to claim deliveries",
        variant: "destructive",
      });
      return;
    }

    setClaimingId(deliveryId);

    try {
      await claimDelivery(deliveryId, driverId, driverName);
      
      toast({
        title: "🚗 Delivery Claimed!",
        description: "Head to the Active Delivery tab to start",
      });
      
      onClaim(deliveryId);
    } catch (error: any) {
      console.error('Error claiming delivery:', error);
      
      toast({
        title: "❌ Claim Failed",
        description: error.message || "This delivery may have been claimed by another driver",
        variant: "destructive",
      });
    } finally {
      setClaimingId(null);
    }
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return 'Unknown';
    const km = meters / 1000;
    if (km < 1) return `${Math.round(meters)}m`;
    return `${km.toFixed(1)}km`;
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return 'Est. 30 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const openInMaps = (delivery: AvailableDelivery) => {
    const { pickupAddress } = delivery;
    if (pickupAddress.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${pickupAddress.location.latitude},${pickupAddress.location.longitude}`;
      window.open(url, '_blank');
    } else {
      const address = `${pickupAddress.street}, ${pickupAddress.city}`;
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      window.open(url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Available Deliveries
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Available Deliveries
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={!isOnline}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Deliveries Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isOnline 
                ? "You'll be notified when new deliveries become available"
                : "Go online to see available deliveries"}
            </p>
            {isOnline && (
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Available Deliveries
            <Badge variant="secondary" className="ml-2">
              {deliveries.length}
            </Badge>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={!isOnline}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          {isOnline 
            ? "Claim a delivery to get started"
            : "Go online to claim deliveries"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-lg">#{delivery.orderNumber}</h4>
                      <p className="text-sm text-muted-foreground">{delivery.customerName}</p>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      <DollarSign className="w-3 h-3 mr-1" />
                      R{delivery.driverEarnings.toFixed(2)}
                    </Badge>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Pickup</p>
                        <p className="text-muted-foreground">
                          {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Deliver to</p>
                        <p className="text-muted-foreground">
                          {delivery.deliveryAddress.street}, {delivery.deliveryAddress.city}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {delivery.distance && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {formatDistance(delivery.distance)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDuration(delivery.estimatedDuration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {delivery.items.length} {delivery.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Special Instructions */}
                  {delivery.specialInstructions && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900 dark:text-amber-100">Special Instructions</p>
                        <p className="text-amber-700 dark:text-amber-300">{delivery.specialInstructions}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleClaim(delivery.id)}
                      disabled={!isOnline || claimingId === delivery.id}
                      className="flex-1"
                      size="lg"
                    >
                      {claimingId === delivery.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Package className="w-4 h-4 mr-2" />
                          Claim Delivery
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => openInMaps(delivery)}
                    >
                      <Navigation className="w-4 h-4" />
                    </Button>
                  </div>

                  {!isOnline && (
                    <p className="text-xs text-center text-muted-foreground">
                      Go online to claim this delivery
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
