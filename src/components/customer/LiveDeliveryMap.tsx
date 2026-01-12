"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Navigation,
  Phone,
  Clock,
  Star,
  Truck,
  Package,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  MapPinned,
} from 'lucide-react';
import { subscribeToDeliveryTracking } from '@/lib/location-service';
import type { DeliveryTracking, DriverDelivery } from '@/types/driver';
import { useToast } from '@/hooks/use-toast';

interface LiveDeliveryMapProps {
  delivery: DriverDelivery;
  orderId: string;
  onStatusUpdate?: (status: string) => void;
}

export default function LiveDeliveryMap({ delivery, orderId, onStatusUpdate }: LiveDeliveryMapProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [eta, setEta] = useState<string>('Calculating...');
  const [distance, setDistance] = useState<string>('--');
  const lastNotificationRef = useRef<string | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || !delivery.deliveryAddress) return;

      try {
        // Load Google Maps script
        const { Loader } = await import('@googlemaps/js-api-loader');
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places', 'geometry'],
        });

        await loader.load();

        // Create map centered on delivery address
        const map = new google.maps.Map(mapRef.current, {
          center: {
            lat: delivery.deliveryAddress.latitude,
            lng: delivery.deliveryAddress.longitude,
          },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        googleMapRef.current = map;

        // Add destination marker (customer location)
        const destinationMarker = new google.maps.Marker({
          position: {
            lat: delivery.deliveryAddress.latitude,
            lng: delivery.deliveryAddress.longitude,
          },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: 'Your Location',
          animation: google.maps.Animation.DROP,
        });

        destinationMarkerRef.current = destinationMarker;

        // Add destination circle
        new google.maps.Circle({
          strokeColor: '#22c55e',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#22c55e',
          fillOpacity: 0.15,
          map,
          center: {
            lat: delivery.deliveryAddress.latitude,
            lng: delivery.deliveryAddress.longitude,
          },
          radius: 100, // 100 meters
        });

        setIsMapLoaded(true);
      } catch (error) {
        console.error('Error loading map:', error);
        toast({
          title: 'Map Error',
          description: 'Unable to load map. Please refresh the page.',
          variant: 'destructive',
        });
      }
    };

    initMap();
  }, [delivery.deliveryAddress, toast]);

  // Subscribe to real-time tracking
  useEffect(() => {
    if (!delivery.id) return;

    const unsubscribe = subscribeToDeliveryTracking(
      delivery.id,
      (trackingData) => {
        setTracking(trackingData);
        updateDriverMarker(trackingData);
        updateDistanceAndEta(trackingData);
        checkProximityAlerts(trackingData);
      },
      (error) => {
        console.error('Tracking error:', error);
      }
    );

    return () => unsubscribe();
  }, [delivery.id]);

  const updateDriverMarker = useCallback((trackingData: DeliveryTracking) => {
    if (!googleMapRef.current || !isMapLoaded) return;

    const driverPos = {
      lat: trackingData.driverLocation.latitude,
      lng: trackingData.driverLocation.longitude,
    };

    // Create or update driver marker
    if (!driverMarkerRef.current) {
      driverMarkerRef.current = new google.maps.Marker({
        position: driverPos,
        map: googleMapRef.current,
        icon: {
          url: '/images/deliverydude.png',
          scaledSize: new google.maps.Size(50, 50),
          anchor: new google.maps.Point(25, 25),
        },
        title: 'Your Driver',
        animation: google.maps.Animation.DROP,
      });
    } else {
      // Smooth animation to new position
      animateMarker(driverMarkerRef.current, driverPos);
    }

    // Update or create route polyline
    const destinationPos = {
      lat: delivery.deliveryAddress.latitude,
      lng: delivery.deliveryAddress.longitude,
    };

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = new google.maps.Polyline({
      path: [driverPos, destinationPos],
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: googleMapRef.current,
    });

    // Fit bounds to show both markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(driverPos);
    bounds.extend(destinationPos);
    googleMapRef.current.fitBounds(bounds, 50);
  }, [isMapLoaded, delivery.deliveryAddress]);

  const animateMarker = (marker: google.maps.Marker, newPosition: google.maps.LatLngLiteral) => {
    const currentPos = marker.getPosition();
    if (!currentPos) {
      marker.setPosition(newPosition);
      return;
    }

    const startLat = currentPos.lat();
    const startLng = currentPos.lng();
    const endLat = newPosition.lat;
    const endLng = newPosition.lng;

    let progress = 0;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);

      const lat = startLat + (endLat - startLat) * progress;
      const lng = startLng + (endLng - startLng) * progress;

      marker.setPosition({ lat, lng });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const updateDistanceAndEta = (trackingData: DeliveryTracking) => {
    const distanceKm = (trackingData.distanceToCustomer / 1000).toFixed(1);
    setDistance(`${distanceKm} km`);

    const etaTime = new Date(trackingData.estimatedArrival);
    const now = new Date();
    const diffMinutes = Math.round((etaTime.getTime() - now.getTime()) / 60000);

    if (diffMinutes <= 0) {
      setEta('Arriving now!');
    } else if (diffMinutes < 60) {
      setEta(`${diffMinutes} min`);
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      setEta(`${hours}h ${mins}m`);
    }
  };

  const checkProximityAlerts = (trackingData: DeliveryTracking) => {
    const distanceMeters = trackingData.distanceToCustomer;

    // Nearby alert (1km)
    if (distanceMeters <= 1000 && distanceMeters > 100 && lastNotificationRef.current !== 'nearby') {
      lastNotificationRef.current = 'nearby';
      toast({
        title: '🚗 Driver is Nearby!',
        description: 'Your driver is less than 1km away',
        duration: 5000,
      });
      playNotificationSound();
      onStatusUpdate?.('nearby');
    }

    // Arrived alert (100m)
    if (distanceMeters <= 100 && lastNotificationRef.current !== 'arrived') {
      lastNotificationRef.current = 'arrived';
      toast({
        title: '🎯 Driver Has Arrived!',
        description: 'Your driver is at your location',
        duration: 6000,
      });
      playNotificationSound();
      onStatusUpdate?.('arrived');
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification-pop.mp3');
      audio.volume = 0.5;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const callDriver = () => {
    if (delivery.driverName) {
      window.location.href = `tel:${delivery.driverName}`;
    }
  };

  const openNavigation = () => {
    if (!tracking) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${tracking.driverLocation.latitude},${tracking.driverLocation.longitude}&destination=${delivery.deliveryAddress.latitude},${delivery.deliveryAddress.longitude}`;
    window.open(url, '_blank');
  };

  const getStatusInfo = () => {
    switch (delivery.status) {
      case 'claimed':
        return {
          icon: CheckCircle,
          text: 'Driver Assigned',
          color: 'bg-blue-500',
          description: 'Your driver is preparing to pick up your order',
        };
      case 'picked_up':
        return {
          icon: Package,
          text: 'Order Picked Up',
          color: 'bg-purple-500',
          description: 'Your order has been collected from the dispensary',
        };
      case 'en_route':
        return {
          icon: Truck,
          text: 'On The Way',
          color: 'bg-orange-500',
          description: 'Your driver is heading to your location',
        };
      case 'nearby':
        return {
          icon: MapPinned,
          text: 'Driver Nearby',
          color: 'bg-yellow-500',
          description: 'Your driver is less than 1km away',
        };
      case 'arrived':
        return {
          icon: MapPin,
          text: 'Driver Arrived',
          color: 'bg-green-500',
          description: 'Your driver is at your location',
        };
      default:
        return {
          icon: Clock,
          text: 'Preparing',
          color: 'bg-gray-500',
          description: 'Getting your order ready',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Map Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="overflow-hidden border-2 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className="h-6 w-6 animate-pulse" />
                <div>
                  <CardTitle className="text-white">Live Delivery Tracking</CardTitle>
                  <CardDescription className="text-white/90">
                    {statusInfo.description}
                  </CardDescription>
                </div>
              </div>
              <Badge className={`${statusInfo.color} text-white border-white/30`}>
                {statusInfo.text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div
              ref={mapRef}
              className="w-full h-[500px] bg-gray-100 relative"
            >
              {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4" />
                    <p className="text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              )}
            </div>

            {/* ETA Bar */}
            {tracking && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Arrival</p>
                      <p className="text-2xl font-bold text-blue-600">{eta}</p>
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="flex items-center gap-3">
                    <Navigation className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Distance</p>
                      <p className="text-2xl font-bold text-purple-600">{distance}</p>
                    </div>
                  </div>
                  <Button onClick={openNavigation} variant="outline" className="gap-2">
                    <MapPin className="h-4 w-4" />
                    Open in Maps
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { status: 'claimed', label: 'Driver Assigned', time: delivery.claimedAt },
                { status: 'picked_up', label: 'Order Picked Up', time: delivery.pickedUpAt },
                { status: 'en_route', label: 'On The Way', time: delivery.enRouteAt },
                { status: 'arrived', label: 'Arrived', time: delivery.arrivedAt },
                { status: 'delivered', label: 'Delivered', time: delivery.deliveredAt },
              ].map((step, index) => {
                const isCompleted = delivery.statusHistory?.some(
                  (h) => h.status === step.status
                );
                const isCurrent = delivery.status === step.status;

                return (
                  <div key={step.status} className="flex items-start gap-4">
                    <div className="relative">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted || isCurrent
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-green-200 animate-pulse' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </div>
                      {index < 4 && (
                        <div
                          className={`absolute left-4 top-8 w-0.5 h-8 ${
                            isCompleted ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <p
                        className={`font-medium ${
                          isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(step.time.seconds * 1000).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver & Order Info */}
      <div className="space-y-4">
        {/* Driver Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
            <CardTitle>Your Driver</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-blue-500">
                  <AvatarImage src="/images/default-driver.png" />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-bold">
                    {delivery.driverName?.charAt(0) || 'D'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-bold text-lg">{delivery.driverName || 'Driver'}</p>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">4.9</span>
                    <span className="text-xs text-muted-foreground">(250+ deliveries)</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Vehicle:</span>
                  <span className="font-medium">Silver Honda Civic</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">License:</span>
                  <span className="font-medium">ABC 123 GP</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button onClick={callDriver} variant="outline" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Order #{delivery.orderNumber}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Delivery Address</p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.deliveryAddress.streetAddress}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.deliveryAddress.city}, {delivery.deliveryAddress.province}
                  </p>
                </div>
              </div>

              {delivery.specialInstructions && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Special Instructions</p>
                      <p className="text-sm text-muted-foreground">
                        {delivery.specialInstructions}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {delivery.accessCode && (
                <>
                  <Separator />
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Access Code</p>
                    <p className="text-2xl font-bold text-blue-600 tracking-wider">
                      {delivery.accessCode}
                    </p>
                  </div>
                </>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">R{delivery.deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Distance</span>
                <span className="font-medium">{delivery.distance.toFixed(1)} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{delivery.items?.length || 0} items</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm mb-1">Need Help?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  If you have any issues with your delivery, please contact support.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
