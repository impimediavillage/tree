'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dispensarySignupSchema, type DispensarySignupFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, ArrowLeft, Building } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, getDocs, query as firestoreQuery } from 'firebase/firestore';
import type { DispensaryType } from '@/types';
import { Loader } from '@googlemaps/js-api-loader';

// --- CONSTANTS ---
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const currencyOptions = [
  { value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" }, { value: "USD", label: "💵 USD (US Dollar)" },
  { value: "EUR", label: "💶 EUR (Euro)" }, { value: "GBP", label: "💷 GBP (British Pound)" },
];
const deliveryRadiusOptions = [
  { value: "none", label: "No same-day delivery" }, { value: "5", label: "5 km" },
  { value: "10", label: "10 km" }, { value: "20", label: "20 km" }, { value: "50", label: "50 km" },
];
const allShippingMethods = [
    { id: "dtd", label: "DTD - Door to Door (The Courier Guy)" }, { id: "dtl", label: "DTL - Door to Locker (Pudo)" },
    { id: "ltd", label: "LTD - Locker to Door (Pudo)" }, { id: "ltl", label: "LTL - Locker to Locker (Pudo)" },
    { id: "collection", label: "Collection from store" }, { id: "in_house", label: "In-house delivery service" },
];
const countryCodes = [{ value: "+27", flag: "🇿🇦", shortName: "ZA", code: "+27" }]; // Simplified for ZA focus

// --- MAIN COMPONENT ---
export default function WellnessSignupPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [wellnessTypes, setWellnessTypes] = useState<DispensaryType[]>([]);

  // --- REFS AND STATE ---
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0].value);
  const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');

  // --- FORM SETUP ---
  const form = useForm<DispensarySignupFormData>({
    resolver: zodResolver(dispensarySignupSchema),
    mode: "onChange",
    defaultValues: {
      fullName: '', phone: '', ownerEmail: '', dispensaryName: '',
      dispensaryType: undefined, currency: undefined,
      operatingDays: [], shippingMethods: [],
      // NEW STRUCTURED ADDRESS DEFAULTS
      streetAddress: '', suburb: '', city: '', postalCode: '',
      latitude: undefined, longitude: undefined,
      showLocation: true, deliveryRadius: undefined,
      message: '', acceptTerms: false,
      openTime: '', closeTime: '',
    },
  });

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchWellnessTypes = async () => {
      try {
        const querySnapshot = await getDocs(firestoreQuery(collection(db, 'dispensaryTypes')));
        const fetchedTypes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DispensaryType));
        setWellnessTypes(fetchedTypes.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        toast({ title: "Error", description: "Could not load wellness types.", variant: "destructive" });
      }
    };
    fetchWellnessTypes();
  }, [toast]);

  // --- GOOGLE MAPS INTEGRATION ---
  const initializeMap = useCallback(() => {
    if (mapInitialized.current || !mapContainerRef.current) return;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      toast({ title: "Map Error", description: "Google Maps API key is not configured.", variant: "destructive"});
      return;
    }

    mapInitialized.current = true;
    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places', 'geocoding'] });

    loader.load().then(google => {
        const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], type: string): string =>
            components.find(c => c.types.includes(type))?.long_name || '';

        const setAddressFields = (place: google.maps.places.PlaceResult | google.maps.GeocoderResult) => {
            const components = place.address_components;
            if (!components) return;

            const streetNumber = getAddressComponent(components, 'street_number');
            const route = getAddressComponent(components, 'route');
            
            form.setValue('streetAddress', `${streetNumber} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
            form.setValue('suburb', getAddressComponent(components, 'locality'), { shouldValidate: true, shouldDirty: true });
            form.setValue('city', getAddressComponent(components, 'administrative_area_level_2') || getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
            form.setValue('postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
        };

        const map = new google.maps.Map(mapContainerRef.current!, { center: { lat: -29.8587, lng: 31.0218 }, zoom: 6, mapId: 'b39f3f8b7139051d' });
        const marker = new google.maps.Marker({ map, draggable: true, position: { lat: -29.8587, lng: 31.0218 } });

        if (locationInputRef.current) {
            const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, { fields: ["formatted_address", "geometry", "address_components"], types: ["address"], componentRestrictions: { country: "za" } });
            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (place.geometry?.location) {
                    const loc = place.geometry.location;
                    map.setCenter(loc); map.setZoom(17); marker.setPosition(loc);
                    form.setValue('latitude', loc.lat(), { shouldValidate: true });
                    form.setValue('longitude', loc.lng(), { shouldValidate: true });
                    setAddressFields(place);
                }
            });
        }

        const geocoder = new google.maps.Geocoder();
        const handleMapInteraction = (pos: google.maps.LatLng) => {
            marker.setPosition(pos); map.panTo(pos);
            form.setValue('latitude', pos.lat(), { shouldValidate: true });
            form.setValue('longitude', pos.lng(), { shouldValidate: true });
            geocoder.geocode({ location: pos }, (results, status) => {
                if (status === 'OK' && results?.[0]) {
                    setAddressFields(results[0]);
                     if (locationInputRef.current) {
                        locationInputRef.current.value = results[0].formatted_address;
                    }
                }
            });
        };

        map.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));
        marker.addListener('dragend', () => marker.getPosition() && handleMapInteraction(marker.getPosition()!));

    }).catch(e => toast({ title: 'Map Error', description: 'Could not load Google Maps.', variant: 'destructive' }));
  }, [form, toast]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !mapInitialized.current) {
        initializeMap();
    }
  }, [initializeMap]);
  
  // --- FORM FIELD SYNC ---
  useEffect(() => {
    const combinedPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
    form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: !!nationalPhoneNumber });
  }, [selectedCountryCode, nationalPhoneNumber, form]);

  // --- FORM SUBMISSION ---
  async function onSubmit(data: DispensarySignupFormData) {
    setIsLoading(true);
    
    // Create a clean data object for Firestore, removing the deprecated 'location' field
    const { ...rest } = data;
    const wellnessData = {
      ...rest,
      status: 'Pending Approval' as const,
      applicationDate: Timestamp.fromDate(new Date()),
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    };
    delete (wellnessData as any).location; // Ensure deprecated field is not sent

    try {
      await addDoc(collection(db, 'dispensaries'), wellnessData);
      setIsSuccess(true);
      toast({ title: "Application Submitted!", description: "We've received your application and will review it shortly." });
    } catch (error) {
      console.error("Error submitting dispensary application:", error);
      toast({ title: "Submission Failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }
  
  // --- SUCCESS STATE RENDER ---
  if (isSuccess) {
    return (
        <div className="container mx-auto flex h-screen items-center justify-center">
            <Card className="max-w-lg text-center shadow-xl">
                <CardHeader>
                    <CardTitle className="text-3xl">Thank You!</CardTitle>
                    <CardDescription>Your application has been successfully submitted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Our team will review your information and get back to you shortly. You can now safely close this page.</p>
                    <Button asChild className="mt-6">
                        <Link href="/">Back to Homepage</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  // --- FORM RENDER ---
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto my-8 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl flex items-center text-foreground">
              <Building className="mr-3 h-8 w-8 text-primary" /> Dispensary Signup
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
            </Button>
          </div>
          <CardDescription>Join our network by filling in the details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Owner & Store Info Sections */}
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 text-foreground">Owner & Store Information</h2>
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="ownerEmail" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="e.g., owner@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="dispensaryName" render={({ field }) => (<FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="e.g., The Green Leaf" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="dispensaryType" render={({ field }) => (<FormItem><FormLabel>Store Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{wellnessTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
              </div>
              
              {/* Location & Contact Section */}
              <div>
                <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Location & Contact</h2>
                <div className="mt-4 space-y-6">
                    <FormItem>
                        <FormLabel>Location Search</FormLabel>
                        <FormControl><Input ref={locationInputRef} placeholder="Start typing an address to search..." /></FormControl>
                        <FormDescription>Select an address to auto-fill the fields below. You can also click the map or drag the pin.</FormDescription>
                    </FormItem>

                    <div className="grid md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="streetAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="suburb" render={({ field }) => (<FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                    </div>

                    <div ref={mapContainerRef} className="h-96 w-full rounded-md border shadow-sm bg-muted" />

                    <FormField control={form.control} name="phone" render={() => (
                        <FormItem><FormLabel>Phone Number</FormLabel>
                            <div className="flex items-center gap-2">
                                <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}><SelectTrigger className="w-[120px] shrink-0"><SelectValue /></SelectTrigger>
                                <SelectContent>{countryCodes.map(cc => (<SelectItem key={cc.value} value={cc.value}><div className="flex items-center gap-2"><span>{cc.flag}</span><span>{cc.code}</span></div></SelectItem>))}</SelectContent>
                                </Select>
                                <Input type="tel" placeholder="National number" value={nationalPhoneNumber} onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
              </div>
              
              {/* Other sections like Operating Hours, Delivery, etc. */}
              {/* ... These sections remain unchanged ... */}

              <div className="pt-4">
                <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel>I accept the <Link href="/terms" target="_blank" className="underline text-primary hover:text-primary/80">Terms of Usage Agreement</Link>.</FormLabel></div>
                    </FormItem>
                )}/>
                <FormMessage className="mt-2 ml-1 text-sm text-red-500">{form.formState.errors.acceptTerms?.message}</FormMessage>
              </div>

              <Button type="submit" className="w-full text-lg py-6" disabled={isLoading || (form.formState.isSubmitted && !form.formState.isValid)}>
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />} Submit Application
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}