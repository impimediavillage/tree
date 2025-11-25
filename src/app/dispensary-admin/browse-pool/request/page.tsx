'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader } from '@googlemaps/js-api-loader';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Dispensary, PriceTier } from '@/types';

// Extended type for pool price tiers with runtime-added properties
type PoolPriceTierWithMetadata = PriceTier & {
  tierId: string;
  minQuantity: number;
  quantityAvailable: number;
};

// Schema matching the updated ProductRequest type
const requestProductSchema = z.object({
  quantityRequested: z.coerce.number().min(1, 'Quantity must be at least 1'),
  deliveryAddress: z.object({
    address: z.string().min(5, 'A full address is required.'),
    streetAddress: z.string().min(3, 'A valid street address is required.'),
    suburb: z.string().min(2, 'A valid suburb is required.'),
    city: z.string().min(2, 'A valid city is required.'),
    province: z.string().min(2, 'A valid province is required.'),
    postalCode: z.string().min(4, 'A valid postal code is required.'),
    country: z.string().min(2, 'A valid country is required.'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  contactPhone: z.string().min(10, 'Valid phone number is required'),
  preferredDeliveryDate: z.string().optional(),
  note: z.string().optional(),
});

type RequestProductFormValues = z.infer<typeof requestProductSchema>;

function RequestProductPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const productId = searchParams?.get('productId');
  const tierId = searchParams?.get('tierId');
  const ownerDispensaryId = searchParams?.get('ownerDispensaryId');
  const collectionName = searchParams?.get('collectionName') || 'products';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [productName, setProductName] = useState<string>('');
  const [tierDetails, setTierDetails] = useState<PoolPriceTierWithMetadata | null>(null);
  const [ownerDispensary, setOwnerDispensary] = useState<Dispensary | null>(null);
  const [requesterDispensary, setRequesterDispensary] = useState<Dispensary | null>(null);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);

  const form = useForm<RequestProductFormValues>({
    resolver: zodResolver(requestProductSchema),
    defaultValues: {
      quantityRequested: 1,
      deliveryAddress: {
        address: '',
        streetAddress: '',
        suburb: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'South Africa',
        latitude: 0,
        longitude: 0,
      },
      contactPerson: '',
      contactPhone: '',
      preferredDeliveryDate: '',
      note: '',
    },
  });

  // Load product, tier, dispensary data
  useEffect(() => {
    const loadData = async () => {
      if (!productId || !tierId || !ownerDispensaryId || !currentUser?.dispensaryId) {
        toast({ title: 'Error', description: 'Missing required parameters', variant: 'destructive' });
        router.push('/dispensary-admin/browse-pool');
        return;
      }

      try {
        setIsLoading(true);

        // Load product from the correct collection
        const productDoc = await getDoc(doc(db, collectionName, productId));
        if (!productDoc.exists()) {
          throw new Error('Product not found');
        }
        const productData = productDoc.data();
        setProductName(productData.name || 'Unknown Product');

        // Find tier by matching the tierIdentifier (unit-price composite key)
        const tier = productData.poolPriceTiers?.find((t: any) => {
          const tierIdentifier = `${t.unit}-${t.price}`;
          return tierIdentifier === tierId;
        });
        if (!tier) {
          throw new Error('Tier not found');
        }
        setTierDetails(tier);

        // Load owner dispensary
        const ownerDoc = await getDoc(doc(db, 'dispensaries', ownerDispensaryId));
        if (ownerDoc.exists()) {
          setOwnerDispensary({ id: ownerDoc.id, ...ownerDoc.data() } as Dispensary);
        }

        // Load requester dispensary
        const requesterDoc = await getDoc(doc(db, 'dispensaries', currentUser.dispensaryId));
        if (requesterDoc.exists()) {
          const requesterData = { id: requesterDoc.id, ...requesterDoc.data() } as Dispensary;
          setRequesterDispensary(requesterData);

          // Auto-populate form with dispensary data
          // Use existing lat/lng from dispensary if available, otherwise leave undefined
          const latitude = requesterData.latitude || undefined;
          const longitude = requesterData.longitude || undefined;

          form.reset({
            quantityRequested: tier.minQuantity || 1,
            deliveryAddress: {
              address: `${requesterData.streetAddress || ''}, ${requesterData.suburb || ''}, ${requesterData.city || ''}, ${requesterData.province || ''} ${requesterData.postalCode || ''}, ${requesterData.country || 'South Africa'}`.replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, ''),
              streetAddress: requesterData.streetAddress || '',
              suburb: requesterData.suburb || '',
              city: requesterData.city || '',
              province: requesterData.province || '',
              postalCode: requesterData.postalCode || '',
              country: requesterData.country || 'South Africa',
              latitude,
              longitude,
            },
            contactPerson: currentUser?.displayName || requesterData.fullName || '',
            contactPhone: requesterData.phone || '',
            preferredDeliveryDate: '',
            note: '',
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: 'Error', description: 'Failed to load request details', variant: 'destructive' });
        router.push('/dispensary-admin/browse-pool');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [productId, tierId, ownerDispensaryId, collectionName, currentUser, router, toast, form]);

  // Initialize Google Maps
  const initializeMap = useCallback(async () => {
    if (mapInitialized.current || !mapContainerRef.current || !locationInputRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is missing.');
      toast({ title: 'Map Error', description: 'Google Maps API key is not configured.', variant: 'destructive' });
      return;
    }
    mapInitialized.current = true;

    try {
      const loader = new Loader({ apiKey: apiKey, version: 'weekly', libraries: ['places', 'geocoding'] });
      const google = await loader.load();
      const initialPosition = { lat: -29.8587, lng: 31.0218 };

      const mapInstance = new google.maps.Map(mapContainerRef.current!, {
        center: initialPosition,
        zoom: 5,
        mapId: 'b39f3f8b7139051d',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const markerInstance = new google.maps.Marker({ map: mapInstance, position: initialPosition, draggable: true, title: 'Drag to set location' });

      const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], type: string): string =>
        components.find(c => c.types.includes(type))?.long_name || '';

      const setAddressFields = (place: google.maps.places.PlaceResult | google.maps.GeocoderResult) => {
        const components = place.address_components;
        if (!components) return;

        // Set the full formatted address in the read-only display field
        const formattedAddress = place.formatted_address;
        if (formattedAddress) {
          form.setValue('deliveryAddress.address', formattedAddress, { shouldValidate: true, shouldDirty: true });
        }

        const streetNumber = getAddressComponent(components, 'street_number');
        const route = getAddressComponent(components, 'route');
        const locality = getAddressComponent(components, 'locality') || getAddressComponent(components, 'sublocality');

        form.setValue('deliveryAddress.streetAddress', `${streetNumber} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.suburb', locality, { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.city', getAddressComponent(components, 'administrative_area_level_2'), { shouldValidate: true, shouldDirty: true });

        // Ensure coordinates are set
        if (place.geometry?.location) {
          const loc = place.geometry.location;
          form.setValue('deliveryAddress.latitude', loc.lat(), { shouldValidate: true, shouldDirty: true });
          form.setValue('deliveryAddress.longitude', loc.lng(), { shouldValidate: true, shouldDirty: true });
        }
        form.setValue('deliveryAddress.province', getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.country', getAddressComponent(components, 'country'), { shouldValidate: true, shouldDirty: true });
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
          setAddressFields(place);
        }
      });

      markerInstance.addListener('dragend', () => {
        const pos = markerInstance.getPosition();
        if (pos) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: pos }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              setAddressFields(results[0]);
              if (locationInputRef.current) {
                locationInputRef.current.value = results[0].formatted_address || '';
              }
            }
          });
        }
      });

      mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          markerInstance.setPosition(e.latLng);
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: e.latLng }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              setAddressFields(results[0]);
              if (locationInputRef.current) {
                locationInputRef.current.value = results[0].formatted_address || '';
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      toast({ title: 'Map Error', description: 'Failed to load Google Maps', variant: 'destructive' });
    }
  }, [form, toast]);

  useEffect(() => {
    if (!isLoading) {
      initializeMap();
    }
  }, [isLoading, initializeMap]);

  const onSubmit = async (values: RequestProductFormValues) => {
    if (!currentUser || !currentUser.dispensaryId || !productId || !tierId || !ownerDispensaryId) {
      toast({ title: 'Error', description: 'Missing required information', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData = {
        productId,
        productName,
        productOwnerDispensaryId: ownerDispensaryId,
        productOwnerEmail: ownerDispensary?.ownerEmail || '',
        productImage: null,
        requesterDispensaryId: currentUser.dispensaryId,
        requesterDispensaryName: requesterDispensary?.dispensaryName || 'Unknown',
        requesterEmail: currentUser.email || '',
        quantityRequested: values.quantityRequested,
        requestedTier: tierDetails || null,
        requestStatus: 'pending_owner_approval' as const,
        deliveryAddress: values.deliveryAddress.address,
        deliveryAddressDetails: values.deliveryAddress,
        contactPerson: values.contactPerson,
        contactPhone: values.contactPhone,
        preferredDeliveryDate: values.preferredDeliveryDate || null,
        note: values.note || '',
        notes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'productRequests'), requestData);

      // Set flag to trigger refresh on browse pool page
      localStorage.setItem('poolRequestSubmitted', 'true');

      toast({
        title: 'Request Submitted',
        description: `Your request for ${values.quantityRequested} units has been sent to ${ownerDispensary?.dispensaryName || 'the owner'}.`,
      });

      router.push('/dispensary-admin/browse-pool');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({ title: 'Error', description: 'Failed to submit request. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pool
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Request Product from Pool
          </CardTitle>
          <CardDescription>
            Requesting: <strong>{productName}</strong> - {tierDetails?.description || tierDetails?.unit || 'Tier'}
            {tierDetails && (
              <span className="block mt-1 text-sm">
                R{tierDetails.price.toFixed(2)} per {tierDetails.unit} • Available: {tierDetails.quantityInStock || 0}
              </span>
            )}
            {ownerDispensary && (
              <span className="block mt-1 text-sm">From: <strong>{ownerDispensary.dispensaryName}</strong></span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantityRequested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Requested</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={tierDetails?.minQuantity || 1} 
                        max={tierDetails?.quantityInStock || 999999} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {tierDetails?.minQuantity && tierDetails.minQuantity > 1 && (
                        <span className="block">Minimum order: {tierDetails.minQuantity} units</span>
                      )}
                      Available stock: {tierDetails?.quantityInStock || 0} units
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="082 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Delivery Address with Google Places */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Delivery Address</h3>
                
                <FormItem>
                  <FormLabel>Search for Address</FormLabel>
                  <FormControl>
                    <Input
                      ref={locationInputRef}
                      placeholder="Start typing an address to search..."
                    />
                  </FormControl>
                  <FormDescription>
                    Your dispensary address is pre-filled below. To change it, search for a new address or click the map.
                  </FormDescription>
                </FormItem>

                <div ref={mapContainerRef} className="h-[300px] w-full rounded-md border bg-muted" />

                {/* Read-only formatted address display */}
                <FormField
                  control={form.control}
                  name="deliveryAddress.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly placeholder="Auto-filled from map" className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Individual address fields (read-only) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deliveryAddress.streetAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly placeholder="Auto-filled from map" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress.suburb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suburb</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly placeholder="Auto-filled from map" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly placeholder="Auto-filled from map" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress.province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly placeholder="Auto-filled from map" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress.postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly placeholder="Auto-filled from map" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deliveryAddress.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly placeholder="Auto-filled from map" className="bg-muted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Optional Fields */}
              <FormField
                control={form.control}
                name="preferredDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Delivery Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any special requirements or notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RequestProductPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    }>
      <RequestProductPageContent />
    </Suspense>
  );
}
