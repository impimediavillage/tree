'use client';

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navigation, MapPin, Clock, Truck, Package } from 'lucide-react';
import type { Order, OrderShipment } from '@/types/order';

interface DeliveryTrackingMapProps {
  orderId: string;
  dispensaryId: string;
  deliveryId?: string;
  driverId?: string;
  className?: string;
}

interface DriverLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  heading?: number;
  speed?: number;
}

interface DeliveryData {
  orderId: string;
  customerId: string;
  dispensaryId: string;
  driverId: string;
  driverName?: string;
  status: string;
  pickupAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    coordinates?: { latitude: number; longitude: number };
  };
  deliveryAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    coordinates?: { latitude: number; longitude: number };
  };
  estimatedDistance?: number;
  estimatedDuration?: number;
  createdAt: any;
}

export function DeliveryTrackingMap({ orderId, dispensaryId, deliveryId, driverId, className }: DeliveryTrackingMapProps) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const deliveryMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  // Fetch delivery and order data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch order data
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (orderDoc.exists()) {
          setOrderData({ id: orderDoc.id, ...orderDoc.data() } as Order);
        }

        // Fetch delivery data if deliveryId provided
        if (deliveryId) {
          const deliveryDoc = await getDoc(doc(db, 'deliveries', deliveryId));
          if (deliveryDoc.exists()) {
            setDeliveryData(deliveryDoc.data() as DeliveryData);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching tracking data:', err);
        setError('Failed to load tracking data');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [orderId, deliveryId]);

  // Real-time driver location tracking
  useEffect(() => {
    if (!driverId) return;

    const database = db as any; // Firebase Realtime Database instance
    const locationRef = ref(database, `driver_locations/${driverId}`);

    const unsubscribe = onValue(
      locationRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setDriverLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            timestamp: data.timestamp,
            heading: data.heading,
            speed: data.speed,
          });
        }
      },
      (error) => {
        console.error('Error listening to driver location:', error);
      }
    );

    return () => {
      off(locationRef);
    };
  }, [driverId]);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapContainerRef.current || !deliveryData || !driverLocation) return;

    // Check if Google Maps is loaded
    if (typeof google === 'undefined' || !google.maps) {
      console.warn('Google Maps not loaded yet');
      return;
    }

    // Initialize map if not already initialized
    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: driverLocation.latitude, lng: driverLocation.longitude },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    // Update or create driver marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition({
        lat: driverLocation.latitude,
        lng: driverLocation.longitude,
      });
    } else {
      driverMarkerRef.current = new google.maps.Marker({
        position: { lat: driverLocation.latitude, lng: driverLocation.longitude },
        map: mapRef.current,
        title: 'Driver Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
      });
    }

    // Add pickup marker if coordinates available
    if (deliveryData.pickupAddress.coordinates && !pickupMarkerRef.current) {
      pickupMarkerRef.current = new google.maps.Marker({
        position: {
          lat: deliveryData.pickupAddress.coordinates.latitude,
          lng: deliveryData.pickupAddress.coordinates.longitude,
        },
        map: mapRef.current,
        title: 'Pickup Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#10B981',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });
    }

    // Add delivery marker if coordinates available
    if (deliveryData.deliveryAddress.coordinates && !deliveryMarkerRef.current) {
      deliveryMarkerRef.current = new google.maps.Marker({
        position: {
          lat: deliveryData.deliveryAddress.coordinates.latitude,
          lng: deliveryData.deliveryAddress.coordinates.longitude,
        },
        map: mapRef.current,
        title: 'Delivery Destination',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#EF4444',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });
    }

    // Fit map to show all markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: driverLocation.latitude, lng: driverLocation.longitude });
    if (deliveryData.pickupAddress.coordinates) {
      bounds.extend({
        lat: deliveryData.pickupAddress.coordinates.latitude,
        lng: deliveryData.pickupAddress.coordinates.longitude,
      });
    }
    if (deliveryData.deliveryAddress.coordinates) {
      bounds.extend({
        lat: deliveryData.deliveryAddress.coordinates.latitude,
        lng: deliveryData.deliveryAddress.coordinates.longitude,
      });
    }
    mapRef.current.fitBounds(bounds);
  }, [driverLocation, deliveryData]);

  // Calculate estimated time and distance
  const calculateETA = () => {
    if (!driverLocation || !deliveryData?.deliveryAddress.coordinates) return null;

    // Simple Haversine formula for distance calculation
    const R = 6371; // Earth's radius in km
    const dLat = ((deliveryData.deliveryAddress.coordinates.latitude - driverLocation.latitude) * Math.PI) / 180;
    const dLon = ((deliveryData.deliveryAddress.coordinates.longitude - driverLocation.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((driverLocation.latitude * Math.PI) / 180) *
        Math.cos((deliveryData.deliveryAddress.coordinates.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate time based on average speed (30 km/h in city)
    const estimatedMinutes = Math.round((distance / 30) * 60);

    return {
      distance: distance.toFixed(2),
      estimatedMinutes,
    };
  };

  const eta = calculateETA();
  const shipment = orderData?.shipments?.[dispensaryId];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Delivery Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Delivery Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 py-8">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!driverLocation || !deliveryData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Delivery Tracking
          </CardTitle>
          <CardDescription>
            {!driverId ? 'No driver assigned yet' : 'Waiting for driver location...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Package className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Order #{orderId.slice(-8)}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {shipment?.status?.replace('_', ' ') || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600" />
          Live Delivery Tracking
        </CardTitle>
        <CardDescription>
          Real-time driver location and estimated arrival
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Container */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-96 rounded-lg bg-muted"
          style={{ minHeight: '384px' }}
        >
          {/* Fallback if Google Maps not available */}
          {typeof google === 'undefined' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Map integration required for visual tracking
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Location: {driverLocation.latitude.toFixed(6)}, {driverLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Delivery Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Status */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-bold text-blue-900">Status</span>
            </div>
            <Badge className="bg-blue-500 text-white">
              {shipment?.status?.replace('_', ' ') || 'Unknown'}
            </Badge>
          </div>

          {/* Distance */}
          {eta && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <span className="text-sm font-bold text-green-900">Distance</span>
              </div>
              <p className="text-2xl font-extrabold text-green-900">{eta.distance} km</p>
            </div>
          )}

          {/* ETA */}
          {eta && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-bold text-purple-900">ETA</span>
              </div>
              <p className="text-2xl font-extrabold text-purple-900">~{eta.estimatedMinutes} min</p>
            </div>
          )}
        </div>

        {/* Driver Info */}
        {deliveryData?.driverName && (
          <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                <Navigation className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Driver</p>
                <p className="text-lg font-extrabold text-gray-900">{deliveryData.driverName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Addresses */}
        <div className="space-y-3">
          {deliveryData.pickupAddress && (
            <div className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Package className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase">Pickup</p>
                <p className="text-sm font-medium text-green-900">
                  {deliveryData.pickupAddress.street}, {deliveryData.pickupAddress.city}
                </p>
              </div>
            </div>
          )}
          
          {deliveryData.deliveryAddress && (
            <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-red-600 uppercase">Destination</p>
                <p className="text-sm font-medium text-red-900">
                  {deliveryData.deliveryAddress.street}, {deliveryData.deliveryAddress.city}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
