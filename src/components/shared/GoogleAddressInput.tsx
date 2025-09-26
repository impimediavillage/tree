'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';
import { Loader2, AlertTriangle } from 'lucide-react';

interface GoogleAddressInputProps {
  form: UseFormReturn<any>;
  className?: string;
}

export function GoogleAddressInput({ form, className }: GoogleAddressInputProps) {
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapState, setMapState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    // This effect should run only once when the component mounts.
    const init = async () => {
      if (!mapContainerRef.current || !locationInputRef.current) {
          // This can happen in rare cases. We'll retry in a moment.
          setTimeout(init, 100);
          return;
      }

      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places', 'maps', 'marker'],
        });

        const google = await loader.load();
        const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
        const { Marker } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

        const initialPosition = { lat: -29.8587, lng: 31.0218 };

        const mapInstance = new Map(mapContainerRef.current!, {
          center: initialPosition,
          zoom: 5,
          mapId: 'b39f3f8b7139051d',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const markerInstance = new Marker({
          map: mapInstance,
          draggable: true,
          title: 'Drag to set location',
        });

        const setAddressComponents = (place: google.maps.places.PlaceResult) => {
            const components: { [key: string]: string } = {};
            place.address_components?.forEach(component => {
                components[component.types[0]] = component.long_name;
            });
            form.setValue('shippingAddress.street_number', components['street_number'] || '');
            form.setValue('shippingAddress.route', components['route'] || '');
            form.setValue('shippingAddress.locality', components['locality'] || '');
            form.setValue('shippingAddress.administrative_area_level_1', components['administrative_area_level_1'] || '');
            form.setValue('shippingAddress.country', components['country'] || '');
            form.setValue('shippingAddress.postal_code', components['postal_code'] || '');
        };

        const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current!, {
          fields: ['formatted_address', 'address_components', 'geometry.location'],
          types: ['address'],
          componentRestrictions: { country: 'za' },
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const loc = place.geometry.location;
            mapInstance.setCenter(loc);
            mapInstance.setZoom(17);
            markerInstance.setPosition(loc);
            markerInstance.setVisible(true);
            
            form.setValue('shippingAddress.address', place.formatted_address || '', { shouldValidate: true });
            form.setValue('shippingAddress.latitude', loc.lat(), { shouldValidate: true });
            form.setValue('shippingAddress.longitude', loc.lng(), { shouldValidate: true });
            setAddressComponents(place);
          }
        });

        markerInstance.addListener('dragend', ({ latLng }) => {
            if (latLng) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: latLng }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        const place = results[0];
                        if (locationInputRef.current) {
                            locationInputRef.current.value = place.formatted_address || '';
                        }
                        form.setValue('shippingAddress.address', place.formatted_address || '', { shouldValidate: true, shouldDirty: true });
                        form.setValue('shippingAddress.latitude', latLng.lat(), { shouldValidate: true, shouldDirty: true });
                        form.setValue('shippingAddress.longitude', latLng.lng(), { shouldValidate: true, shouldDirty: true });
                        setAddressComponents(place);
                    } 
                });
            }
        });

        setMapState('loaded');

      } catch (err) {
        console.error('Google Maps API Error:', err);
        setMapError('Map failed to load. Please check your API key and connection.');
        setMapState('error');
      }
    };

    init();

  }, []); // Empty dependency array ensures this runs only once.

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <Label htmlFor="location-input">Shipping Address</Label>
        <Input
          id="location-input"
          ref={locationInputRef}
          {...form.register('shippingAddress.address')}
          placeholder="Start typing your address..."
          disabled={mapState !== 'loaded'}
        />
        {mapState !== 'loaded' && <p className="text-sm text-muted-foreground pt-1">Map is loading...</p>}
      </div>
      <div className="h-[300px] w-full rounded-md overflow-hidden bg-muted flex items-center justify-center relative">
        {mapState === 'loading' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </>
        )}
        {mapState === 'error' && (
          <div className='text-center text-destructive p-4'>
            <AlertTriangle className='mx-auto h-8 w-8 mb-2' />
            <p className='font-semibold'>Map Error</p>
            <p className='text-sm'>{mapError}</p>
          </div>
        )}
        <div ref={mapContainerRef} className={cn(
            'h-full w-full',
            mapState === 'loaded' ? '' : 'invisible'
        )}></div>
      </div>

      {/* Hidden fields for structured address data */}
      <Input {...form.register('shippingAddress.street_number')} type="hidden" />
      <Input {...form.register('shippingAddress.route')} type="hidden" />
      <Input {...form.register('shippingAddress.locality')} type="hidden" />
      <Input {...form.register('shippingAddress.administrative_area_level_1')} type="hidden" />
      <Input {...form.register('shippingAddress.country')} type="hidden" />
      <Input {...form.register('shippingAddress.postal_code')} type="hidden" />
      <Input {...form.register('shippingAddress.latitude')} type="hidden" />
      <Input {...form.register('shippingAddress.longitude')} type="hidden" />
    </div>
  );
}
