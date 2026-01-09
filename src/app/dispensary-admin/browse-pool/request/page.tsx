'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import type { Product, PriceTier, ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Package, Truck, ShoppingBasket, AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const requestFormSchema = z.object({
  quantityRequested: z.number().int().positive('Quantity must be at least 1'),
  preferredDeliveryDate: z.string().optional(),
  deliveryAddress: z.object({
    address: z.string().min(5, 'A full address is required. Please select one from the map.'),
    streetAddress: z.string().min(5, 'A valid street address is required.'),
    suburb: z.string().min(2, 'A valid suburb is required.'),
    city: z.string().min(2, 'A valid city is required.'),
    province: z.string().min(2, 'A valid province is required.'),
    postalCode: z.string().min(4, 'A valid postal code is required.'),
    country: z.string().min(2, 'A valid country is required.'),
    latitude: z.number().refine(val => val !== 0, "Please select an address from the map."),
    longitude: z.number().refine(val => val !== 0, "Please select an address from the map."),
  }),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  contactPhone: z.string().min(10, 'Valid contact phone number is required'),
  additionalNotes: z.string().optional(),
});

type RequestFormData = z.infer<typeof requestFormSchema>;

function BrowsePoolRequestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const productId = searchParams?.get('productId') || null;
  const tierId = searchParams?.get('tierId') || null;
  const ownerDispensaryId = searchParams?.get('ownerDispensaryId') || null;
  const collectionName = searchParams?.get('collectionName') || null;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedTier, setSelectedTier] = useState<PriceTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<ProductRequest | null>(null);
  const [dispensaryTypeIcon, setDispensaryTypeIcon] = useState<string | null>(null);
  
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.Marker | null>(null);

  // Get initial coordinates from dispensary or use default
  const initialLat = currentDispensary?.latitude || -29.8587;
  const initialLng = currentDispensary?.longitude || 31.0218;
  const initialAddress = currentDispensary ? 
    `${currentDispensary.streetAddress || ''}, ${currentDispensary.suburb || ''}, ${currentDispensary.city || ''}, ${currentDispensary.province || ''}, ${currentDispensary.postalCode || ''}`.replace(/,\s*,/g, ',').trim() 
    : '';

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      quantityRequested: 1,
      preferredDeliveryDate: '',
      deliveryAddress: {
        address: initialAddress,
        streetAddress: currentDispensary?.streetAddress || '',
        suburb: currentDispensary?.suburb || '',
        city: currentDispensary?.city || '',
        province: currentDispensary?.province || '',
        postalCode: currentDispensary?.postalCode || '',
        country: currentDispensary?.country || 'South Africa',
        latitude: initialLat,
        longitude: initialLng,
      },
      contactPerson: currentUser?.displayName || '',
      contactPhone: currentDispensary?.phone || '',
      additionalNotes: '',
    },
  });

  const initializeMap = useCallback(async () => {
    if (mapInitialized.current || !mapContainerRef.current || !locationInputRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key is missing.");
      toast({ title: "Map Error", description: "Google Maps API key is not configured.", variant: "destructive" });
      return;
    }
    mapInitialized.current = true;

    try {
      const loader = new Loader({ apiKey: apiKey, version: 'weekly', libraries: ['places', 'geocoding'] });
      const google = await loader.load();
      
      // Use dispensary coordinates if available, otherwise default to South Africa center
      const initialPosition = { lat: initialLat, lng: initialLng };
      const hasDispensaryLocation = currentDispensary?.latitude && currentDispensary?.longitude;
      
      const mapInstance = new google.maps.Map(mapContainerRef.current!, {
        center: initialPosition,
        zoom: hasDispensaryLocation ? 15 : 5, // Zoom in if we have dispensary location
        mapId: 'b39f3f8b7139051d',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Store map instance in ref
      mapInstanceRef.current = mapInstance;

      // Use dispensary type icon, or fallback to store icon, or use default
      const iconUrl = dispensaryTypeIcon || currentDispensary?.storeIcon || undefined;
      const markerIcon = iconUrl ? {
        url: iconUrl,
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 40),
      } : undefined;

      const markerInstance = new google.maps.Marker({ 
        map: mapInstance, 
        position: initialPosition, 
        draggable: true, 
        title: 'Drag to set delivery location',
        icon: markerIcon,
      });

      // Store marker instance in ref
      markerInstanceRef.current = markerInstance;

      // Set initial address in the input field
      if (locationInputRef.current && initialAddress) {
        locationInputRef.current.value = initialAddress;
      }

      const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], type: string, useShortName = false): string =>
        components.find(c => c.types.includes(type))?.[useShortName ? 'short_name' : 'long_name'] || '';

      const setAddressFields = (place: google.maps.places.PlaceResult | google.maps.GeocoderResult) => {
        const components = place.address_components;
        if (!components) return;
        
        const formattedAddress = place.formatted_address;
        if (formattedAddress) {
          form.setValue('deliveryAddress.address', formattedAddress, { shouldValidate: true, shouldDirty: true });
        }

        const streetNumber = getAddressComponent(components, 'street_number');
        const route = getAddressComponent(components, 'route');
        
        form.setValue('deliveryAddress.streetAddress', `${streetNumber} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.suburb', getAddressComponent(components, 'locality'), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.city', getAddressComponent(components, 'administrative_area_level_2'), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.province', getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.country', getAddressComponent(components, 'country'), { shouldValidate: true, shouldDirty: true });
      };
      
      const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current!, {
        fields: ['formatted_address', 'address_components', 'geometry.location'],
        types: ['address'],
        componentRestrictions: { country: 'za' }, // Prioritize South Africa
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const loc = place.geometry.location;
          mapInstance.setCenter(loc);
          mapInstance.setZoom(17);
          markerInstance.setPosition(loc);
          form.setValue('deliveryAddress.latitude', loc.lat(), { shouldValidate: true });
          form.setValue('deliveryAddress.longitude', loc.lng(), { shouldValidate: true });
          setAddressFields(place);
        }
      });

      const geocoder = new google.maps.Geocoder();
      const handleMapInteraction = (latLng: google.maps.LatLng) => {
        markerInstance.setPosition(latLng);
        mapInstance.panTo(latLng);
        form.setValue('deliveryAddress.latitude', latLng.lat(), { shouldValidate: true, shouldDirty: true });
        form.setValue('deliveryAddress.longitude', latLng.lng(), { shouldValidate: true, shouldDirty: true });
        geocoder.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            if(locationInputRef.current) locationInputRef.current.value = results[0].formatted_address || '';
            setAddressFields(results[0]);
          }
        });
      };
      
      markerInstance.addListener('dragend', () => handleMapInteraction(markerInstance.getPosition()!));
      mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));

    } catch (err) {
      console.error('Google Maps API Error:', err);
      toast({ title: 'Map Error', description: 'Could not load Google Maps.', variant: 'destructive' });
    }
  }, [form, toast, initialLat, initialLng, currentDispensary, initialAddress, dispensaryTypeIcon]);

  useEffect(() => {
    if (mapContainerRef.current && !mapInitialized.current && !authLoading) {
      initializeMap();
    }
  }, [initializeMap, authLoading]);

  // Fetch dispensary type icon
  useEffect(() => {
    const fetchDispensaryTypeIcon = async () => {
      if (!currentDispensary?.dispensaryType) return;
      
      try {
        const dispensaryTypeRef = doc(db, 'dispensaryTypes', currentDispensary.dispensaryType);
        const dispensaryTypeSnap = await getDoc(dispensaryTypeRef);
        
        if (dispensaryTypeSnap.exists()) {
          const typeData = dispensaryTypeSnap.data();
          setDispensaryTypeIcon(typeData.iconPath || null);
        }
      } catch (error) {
        console.error('Error fetching dispensary type icon:', error);
      }
    };

    fetchDispensaryTypeIcon();
  }, [currentDispensary]);

  const fetchProductAndCheckExisting = useCallback(async () => {
    if (!productId || !collectionName || !currentUser?.dispensaryId || authLoading) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch product
      const productRef = doc(db, collectionName, productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        toast({
          title: 'Product Not Found',
          description: 'The requested product could not be found.',
          variant: 'destructive',
        });
        router.push('/dispensary-admin/browse-pool');
        return;
      }

      const productData = { id: productSnap.id, ...productSnap.data() } as Product;
      setProduct(productData);

      // Find the tier based on tierId (format: "unit-price")
      let unit: string | undefined;
      let price: number | undefined;
      
      if (tierId && productData.poolPriceTiers) {
        const [tierUnit, priceStr] = tierId.split('-');
        unit = tierUnit;
        price = parseFloat(priceStr);
        const tier = productData.poolPriceTiers.find(
          (t) => t.unit === unit && t.price === price
        );
        if (tier) {
          setSelectedTier(tier);
        }
      }

      // Check for existing requests for this product/tier
      const requestsQuery = query(
        collection(db, 'productRequests'),
        where('requesterDispensaryId', '==', currentUser.dispensaryId),
        where('productId', '==', productId),
        where('requestStatus', 'in', ['pending_owner_approval', 'accepted', 'fulfilled_by_sender'])
      );
      const requestsSnap = await getDocs(requestsQuery);
      
      // Filter to match the specific tier
      const matchingRequest = requestsSnap.docs.find(doc => {
        const data = doc.data() as ProductRequest;
        return data.requestedTier?.unit === unit && data.requestedTier?.price === price;
      });

      if (matchingRequest) {
        setExistingRequest({ id: matchingRequest.id, ...matchingRequest.data() } as ProductRequest);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product details.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [productId, collectionName, tierId, currentUser, authLoading, toast, router]);

  useEffect(() => {
    fetchProductAndCheckExisting();
  }, [fetchProductAndCheckExisting]);

  const onSubmit = async (data: RequestFormData) => {
    if (!product || !selectedTier || !currentUser || !currentDispensary || !ownerDispensaryId) {
      toast({
        title: 'Missing Information',
        description: 'Unable to submit request. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData: Omit<ProductRequest, 'id'> = {
        productId: product.id || '',
        productName: product.name,
        productOwnerDispensaryId: ownerDispensaryId,
        productOwnerEmail: product.productOwnerEmail,
        productImage: product.imageUrls?.[0] || product.imageUrl || null,

        requesterDispensaryId: currentUser.dispensaryId || '',
        requesterDispensaryName: currentDispensary.dispensaryName || '',
        requesterEmail: currentUser.email || '',

        quantityRequested: data.quantityRequested,
        requestedTier: {
          unit: selectedTier.unit,
          price: selectedTier.price,
          lengthCm: selectedTier.lengthCm ?? undefined,
          widthCm: selectedTier.widthCm ?? undefined,
          heightCm: selectedTier.heightCm ?? undefined,
          weightKgs: selectedTier.weightKgs ?? undefined,
        },
        preferredDeliveryDate: data.preferredDeliveryDate || null,
        deliveryAddress: data.deliveryAddress,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,

        requestStatus: 'pending_owner_approval',
        notes: data.additionalNotes
          ? [
              {
                note: data.additionalNotes,
                byName: currentUser.displayName || currentUser.email || 'Unknown',
                senderRole: 'requester' as const,
                timestamp: serverTimestamp() as any,
              },
            ]
          : [],
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        
        productDetails: {
          name: product.name,
          category: product.category,
          currency: product.currency || 'ZAR',
          priceTiers: product.poolPriceTiers || [],
          imageUrl: product.imageUrls?.[0] || product.imageUrl || null,
          dispensaryName: product.dispensaryName,
          dispensaryType: product.dispensaryType,
        },
      };

      await addDoc(collection(db, 'productRequests'), requestData);

      // Set flag for browse-pool page to refresh
      localStorage.setItem('poolRequestSubmitted', 'true');

      toast({
        title: 'Request Submitted',
        description: 'Your product request has been sent to the seller.',
      });

      router.push('/dispensary-admin/browse-pool');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product || !selectedTier) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Product Not Found</AlertTitle>
          <AlertDescription>
            The product you're looking for could not be loaded. Please return to the pool and try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/dispensary-admin/browse-pool')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pool
        </Button>
      </div>
    );
  }

  if (existingRequest) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <Button variant="outline" onClick={() => router.push('/dispensary-admin/browse-pool')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pool
        </Button>

        <Alert className="bg-blue-50 border-blue-200">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 font-bold">Request Already Exists</AlertTitle>
          <AlertDescription className="text-blue-800">
            You already have an active request for this product and tier. View your request status in the{' '}
            <button
              onClick={() => router.push('/dispensary-admin/pool')}
              className="underline font-semibold hover:text-blue-600"
            >
              Product Pool Management
            </button>{' '}
            page.
          </AlertDescription>
        </Alert>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6 text-[#006B3E]" />
              {product.name}
            </CardTitle>
            <CardDescription>Request Status: {existingRequest.requestStatus.replace(/_/g, ' ')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.imageUrls?.[0] && (
              <div className="relative w-full h-64 rounded-lg overflow-hidden">
                <Image
                  src={product.imageUrls[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tier</p>
                <p className="font-semibold">{selectedTier.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Price</p>
                <p className="font-semibold">{product.currency} {selectedTier.price}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity Requested</p>
                <p className="font-semibold">{existingRequest.quantityRequested}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Request Date</p>
                <p className="font-semibold">
                  {existingRequest.createdAt
                    ? new Date((existingRequest.createdAt as any).toDate()).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isThcProduct = product.dispensaryType === 'Cannibinoid store' && product.productType === 'THC';
  const tierStock = selectedTier.quantityInStock ?? 999;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <Button variant="outline" onClick={() => router.push('/dispensary-admin/browse-pool')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Pool
      </Button>

      <div className="p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-[#3D2E17]">Request Product from Pool</h1>
            <p className="text-muted-foreground mt-1">
              Submit a request to purchase this product from another dispensary
            </p>
          </div>
          <ShoppingBasket className="h-14 w-14 text-[#006B3E]" />
        </div>
      </div>

      <Card className="bg-muted/50 border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Package className="h-6 w-6 text-[#006B3E]" />
            {product.name}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Badge variant="secondary">{product.category}</Badge>
            {isThcProduct && <Badge className="bg-[#006B3E] text-white">THC Design Pack</Badge>}
            {tierStock > 0 ? (
              <Badge variant="default" className="bg-green-600">{tierStock} Available</Badge>
            ) : (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {product.imageUrls?.[0] && (
            <div className="relative w-full h-80 rounded-lg overflow-hidden border">
              <Image
                src={product.imageUrls[0]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background rounded-lg border">
            <div>
              <p className="text-sm text-muted-foreground">Unit</p>
              <p className="text-lg font-bold text-foreground">{selectedTier.unit}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price per Unit</p>
              <p className="text-lg font-bold text-foreground">
                {product.currency} {selectedTier.price.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Seller</p>
              <p className="text-lg font-semibold text-foreground">{product.dispensaryName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stock Available</p>
              <p className="text-lg font-semibold text-foreground">{tierStock} units</p>
            </div>
          </div>

          {isThcProduct && (
            <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-[#006B3E]/30">
              <Package className="h-5 w-5 text-[#006B3E]" />
              <AlertTitle className="font-extrabold text-[#3D2E17]">Triple S Design Pack</AlertTitle>
              <AlertDescription className="text-sm font-bold text-[#3D2E17]">
                This is a THC Design Pack product. You'll receive {selectedTier.unit} as a FREE gift with your design pack purchase.
                FREE INTERSTORE PRODUCT TRADING WITH TRIPLE S DESIGN SEASONAL BUY IN.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="font-semibold text-lg mb-2">Description</h3>
            <p className="text-muted-foreground">{product.description}</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-extrabold text-xl text-[#3D2E17] mb-4">Request Details</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="quantityRequested"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity Requested *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={tierStock}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        How many units of {selectedTier.unit} do you need? (Max: {tierStock})
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredDeliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Delivery Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>When would you like to receive this product?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person *</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Contact Phone *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Delivery Address Section with Google Places */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                  <h4 className="text-lg font-extrabold text-[#3D2E17]">Delivery Address *</h4>
                  
                  <FormItem>
                    <FormLabel>Location Search</FormLabel>
                    <FormControl>
                      <Input 
                        ref={locationInputRef} 
                        placeholder="Start typing an address to search..." 
                      />
                    </FormControl>
                    <FormDescription>
                      Select an address to auto-fill the fields below. You can also click the map or drag the pin.
                    </FormDescription>
                  </FormItem>

                  <div ref={mapContainerRef} className="h-[250px] w-full rounded-md border bg-muted" />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryAddress.streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Auto-filled from map" />
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
                            <Input {...field} placeholder="Auto-filled from map" />
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
                            <Input {...field} placeholder="Auto-filled from map" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryAddress.province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Auto-filled from map" />
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
                            <Input {...field} placeholder="Auto-filled from map" />
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
                            <Input {...field} placeholder="Auto-filled from map" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Hidden fields for latitude and longitude */}
                  <FormField
                    control={form.control}
                    name="deliveryAddress.latitude"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deliveryAddress.longitude"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} value={field.value} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="deliveryAddress.address"
                    render={({ field }) => (
                      <FormItem className="hidden">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Any special requirements or comments..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <CardFooter className="px-0 pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-white text-lg font-bold"
                    disabled={isSubmitting || tierStock <= 0}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-6 w-6" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BrowsePoolRequestPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    }>
      <BrowsePoolRequestPageContent />
    </Suspense>
  );
}
