'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminCreateDispensarySchema, type AdminCreateDispensaryFormData } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Building, Save, MapPin, Search } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db, functions } from '@/lib/firebase';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { collection, addDoc, Timestamp, getDocs, query as firestoreQuery, orderBy } from 'firebase/firestore';
import type { DispensaryType, PUDOLocker } from '@/types';
import { Loader } from '@googlemaps/js-api-loader';


const currencyOptions = [
  { value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" },
  { value: "USD", label: "💵 USD (US Dollar)" },
  { value: "EUR", label: "💶 EUR (Euro)" },
  { value: "GBP", label: "💷 GBP (British Pound)" },
];
const countryCodes = [{ value: "+27", flag: "🇿🇦", shortName: "ZA", code: "+27" }];
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const deliveryRadiusOptions = [
  { value: "none", label: "No same-day delivery" }, { value: "5", label: "5 km" },
  { value: "10", label: "10 km" }, { value: "20", label: "20 km" }, { value: "50", label: "50 km" },
];
const allShippingMethods = [
    { id: "dtd", label: "DTD - Door to Door (The Courier Guy)" }, { id: "dtl", label: "DTL - Door to Locker (Pudo)" },
    { id: "ltd", label: "LTD - Locker to Door (Pudo)" }, { id: "ltl", label: "LTL - Locker to Locker (Pudo)" },
    { id: "collection", label: "Collection from store" }, { id: "in_house", label: "In-house delivery service" },
];

const getPudoLockers = httpsCallable(functions, 'getPudoLockers');

export default function AdminCreateDispensaryPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wellnessTypes, setWellnessTypes] = useState<DispensaryType[]>([]);
  
  const [isLockerModalOpen, setIsLockerModalOpen] = useState(false);
  const [pudoLockers, setPudoLockers] = useState<PUDOLocker[]>([]);
  const [isFetchingLockers, setIsFetchingLockers] = useState(false);
  const [lockerSearchTerm, setLockerSearchTerm] = useState('');
  const [lockerError, setLockerError] = useState<string | null>(null);

  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0].value);
  const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');

  const form = useForm<AdminCreateDispensaryFormData>({
    resolver: zodResolver(adminCreateDispensarySchema),
    mode: "onChange",
    defaultValues: {
      fullName: '', phone: '', ownerEmail: '', dispensaryName: '',
      dispensaryType: undefined, currency: 'ZAR', 
      operatingDays: [], shippingMethods: [],
      streetAddress: '', suburb: '', city: '', postalCode: '', province: '', country: '',
      latitude: undefined, longitude: undefined,
      showLocation: true, deliveryRadius: 'none',
      message: '', openTime: '', closeTime: '', originLocker: null,
      status: 'Approved' as const,
    },
  });

  const watchedShippingMethods = useWatch({ control: form.control, name: 'shippingMethods' });
  const watchedOriginLocker = useWatch({ control: form.control, name: 'originLocker' });
  const watchedCity = useWatch({ control: form.control, name: 'city' });

  const needsOriginLocker = useMemo(() => 
      watchedShippingMethods?.includes('ltl') || watchedShippingMethods?.includes('ltd'), 
      [watchedShippingMethods]
  );

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
        toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive"});
        router.replace('/admin/dashboard');
    }
  }, [isSuperAdmin, authLoading, router, toast]);

  useEffect(() => {
    if (isSuperAdmin) {
        const fetchWellnessTypes = async () => {
            try {
                const q = firestoreQuery(collection(db, 'dispensaryTypes'), orderBy('name'));
                const querySnapshot = await getDocs(q);
                setWellnessTypes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DispensaryType)));
            } catch (error) {
                console.error("Error fetching wellness types:", error);
                toast({ title: "Error", description: "Could not load dispensary types.", variant: "destructive" });
            }
        };
        fetchWellnessTypes();
    }
  }, [isSuperAdmin, toast]);

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
        const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], type: string, useShortName = false): string => {
            return components.find(c => c.types.includes(type))?.[useShortName ? 'short_name' : 'long_name'] || '';
        };
        
        const setAddressFields = (place: google.maps.places.PlaceResult | google.maps.GeocoderResult) => {
            const components = place.address_components; if (!components) return;
            form.setValue('streetAddress', `${getAddressComponent(components, 'street_number')} ${getAddressComponent(components, 'route')}`.trim(), { shouldValidate: true, shouldDirty: true });
            form.setValue('suburb', getAddressComponent(components, 'locality'), { shouldValidate: true, shouldDirty: true });
            form.setValue('city', getAddressComponent(components, 'administrative_area_level_2'), { shouldValidate: true, shouldDirty: true });
            form.setValue('province', getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
            form.setValue('postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
            form.setValue('country', getAddressComponent(components, 'country'), { shouldValidate: true, shouldDirty: true });
        };

        const map = new google.maps.Map(mapContainerRef.current!, { center: { lat: -29.8587, lng: 31.0218 }, zoom: 6, mapId: 'b39f3f8b7139051d' });
        const marker = new google.maps.Marker({ map, draggable: true, position: { lat: -29.8587, lng: 31.0218 } });

        if (locationInputRef.current) {
            const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, { fields: ["address_components", "geometry", "formatted_address"], types: ["address"], componentRestrictions: { country: "za" } });
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
                    if (locationInputRef.current) locationInputRef.current.value = results[0].formatted_address;
                }
            });
        };
        map.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));
        marker.addListener('dragend', () => marker.getPosition() && handleMapInteraction(marker.getPosition()!));
    }).catch(e => toast({ title: 'Map Error', description: 'Could not load Google Maps.', variant: 'destructive' }));
  }, [form, toast]);

  useEffect(() => { if (isSuperAdmin && typeof window !== 'undefined' && !mapInitialized.current) initializeMap(); }, [isSuperAdmin, initializeMap]);

  useEffect(() => {
    const fullPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
    form.setValue('phone', fullPhoneNumber, { shouldValidate: nationalPhoneNumber.length > 5, shouldDirty: !!nationalPhoneNumber });
  }, [selectedCountryCode, nationalPhoneNumber, form]);

  useEffect(() => {
    if (!needsOriginLocker) {
      form.setValue('originLocker', null);
    }
  }, [needsOriginLocker, form]);

  async function onSubmit(data: AdminCreateDispensaryFormData) {
    setIsSubmitting(true);
    
    // Remove undefined values - Firestore doesn't accept them
    const cleanData: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    });
    
    const dispensaryData = { 
      ...cleanData, 
      applicationDate: Timestamp.fromDate(new Date()), 
      approvedDate: Timestamp.fromDate(new Date()), 
      originLocker: data.originLocker ?? null,
    };
    try {
      // 1. Create dispensary document
      const dispensaryDoc = await addDoc(collection(db, 'dispensaries'), dispensaryData);
      const dispensaryId = dispensaryDoc.id;
      
      // 2. Create owner user account (just like dispensary-signup workflow)
      toast({ title: "Creating Owner Account...", description: "Setting up dispensary owner authentication." });
      
      try {
        const createDispensaryUserCallable = httpsCallable(functions, 'createDispensaryUser');
        const result = await createDispensaryUserCallable({ 
          email: data.ownerEmail, 
          displayName: data.fullName, 
          dispensaryId 
        });
        
        const resultData = result.data as { success: boolean; message: string; uid: string };
        
        if (resultData.success) {
          toast({ 
            title: "Dispensary Created!", 
            description: `${data.dispensaryName} and owner account have been created successfully.` 
          });
        } else {
          toast({ 
            title: "Partial Success", 
            description: "Dispensary created but owner account setup encountered an issue. Please check manually.",
            variant: "default"
          });
        }
      } catch (userError) {
        console.error("Error creating owner user:", userError);
        toast({ 
          title: "Dispensary Created", 
          description: "Dispensary saved but owner account creation failed. Please create manually.",
          variant: "default"
        });
      }
      
      router.push('/admin/dashboard/dispensaries');
    } catch (error) {
      console.error("Error creating dispensary:", error);
      toast({ title: "Creation Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const fetchLockers = async () => {
      const lat = form.getValues('latitude');
      const lng = form.getValues('longitude');

      if (!lat || !lng) {
          setLockerError('Your dispensary location is not set. Please set a location on the map to find nearby lockers.');
          return;
      }

      setIsFetchingLockers(true);
      setLockerError(null);
      try {
          const result = await getPudoLockers({ latitude: lat, longitude: lng });
          const lockerData = (result.data as { data: PUDOLocker[] }).data;

          if (lockerData && lockerData.length > 0) {
              setPudoLockers(lockerData);
          } else {
              setLockerError('No Pudo lockers found within a 100km radius of your location.');
          }
      } catch (error) {
          console.error("Error fetching Pudo lockers:", error);
          const message = error instanceof FunctionsError ? error.message : "An unexpected error occurred while fetching lockers.";
          setLockerError(message);
      } finally {
          setIsFetchingLockers(false);
      }
  };
  
  const handleOpenLockerModal = () => {
      setPudoLockers([]);
      setLockerSearchTerm('');
      setLockerError(null);
      fetchLockers();
      setIsLockerModalOpen(true);
  }

  function handleLockerSelect(locker: PUDOLocker) {
    form.setValue('originLocker', locker, { shouldValidate: true, shouldDirty: true });
    setIsLockerModalOpen(false);
  }

  const filteredLockers = useMemo(() => 
    pudoLockers.filter(locker => 
        locker.name.toLowerCase().includes(lockerSearchTerm.toLowerCase()) ||
        (locker.address && locker.address.toLowerCase().includes(lockerSearchTerm.toLowerCase()))
    ), [pudoLockers, lockerSearchTerm]);


  if (authLoading || !isSuperAdmin) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto my-8 shadow-xl bg-muted/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl flex items-center text-foreground"><Building className="mr-3 h-8 w-8 text-primary" />Add New Dispensary</CardTitle>
              <Button variant="outline" size="sm" asChild><Link href="/admin/dashboard/dispensaries"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link></Button>
            </div>
            <CardDescription>Create a new dispensary profile. It will be automatically approved and appear on the public site.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                
                <section>
                  <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Owner & Store Details</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Owner&apos;s Full Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="ownerEmail" render={({ field }) => (<FormItem><FormLabel>Owner&apos;s Email</FormLabel><FormControl><Input type="email" placeholder="owner@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dispensaryName" render={({ field }) => (<FormItem><FormLabel>Dispensary Name</FormLabel><FormControl><Input placeholder="The Green Leaf" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dispensaryType" render={({ field }) => (<FormItem><FormLabel>Dispensary Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a dispensary type" /></SelectTrigger></FormControl><SelectContent>{wellnessTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
                </section>
                
                <section>
                  <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Location & Contact</h2>
                  <div className="space-y-6">
                      <FormField control={form.control} name="showLocation" render={({ field }) => (<FormItem><FormLabel>Show Full Address Publicly</FormLabel><Select onValueChange={(value) => field.onChange(value === 'true')} value={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="true">Yes, show full address</SelectItem><SelectItem value="false">No, hide full address</SelectItem></SelectContent></Select><FormDescription>Controls if the street address is visible on the public profile.</FormDescription><FormMessage /></FormItem>)} />
                      <FormItem><FormLabel>Find Address</FormLabel><FormControl><Input ref={locationInputRef} placeholder="Start typing an address to search..." /></FormControl></FormItem>
                      <div className="grid md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="streetAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="suburb" render={({ field }) => (<FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <div className="grid md:grid-cols-3 gap-6">
                          <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="province" render={({ field }) => (<FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                      <div ref={mapContainerRef} className="h-96 w-full rounded-md border shadow-sm bg-muted" />
                      <FormField control={form.control} name="phone" render={() => (<FormItem><FormLabel>Contact Phone Number</FormLabel><div className="flex items-center gap-2"><Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}><SelectTrigger className="w-[120px] shrink-0"><SelectValue /></SelectTrigger><SelectContent>{countryCodes.map(cc => (<SelectItem key={cc.value} value={cc.value}><div className="flex items-center gap-2"><span>{cc.flag}</span><span>{cc.code}</span></div></SelectItem>))}</SelectContent></Select><Input type="tel" placeholder="e.g. 821234567" value={nationalPhoneNumber} onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))} /></div><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Default Currency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a currency" /></SelectTrigger></FormControl><SelectContent>{currencyOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Operations & Services</h2>
                  <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                          <FormField control={form.control} name="openTime" render={({ field }) => (<FormItem><FormLabel>Opening Time</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name="closeTime" render={({ field }) => (<FormItem><FormLabel>Closing Time</FormLabel><FormControl><Input type="time" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                      </div>
                      <FormField control={form.control} name="operatingDays" render={({ field }) => (<FormItem><FormLabel>Operating Days</FormLabel><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 rounded-lg border p-4"><FormMessage />{weekDays.map((day) => (<FormItem key={day} className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {const currentDays = field.value || []; return checked ? field.onChange([...currentDays, day]) : field.onChange(currentDays.filter((value) => value !== day));}} /></FormControl><FormLabel className="font-normal text-sm">{day}</FormLabel></FormItem>))}</div></FormItem>)} />
                      <FormField control={form.control} name="shippingMethods" render={({ field }) => (<FormItem><FormLabel>Shipping Methods</FormLabel><FormDescription>Select all the ways you can get products to customers.</FormDescription><div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border p-4"><FormMessage />{allShippingMethods.map((method) => (<FormItem key={method.id} className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(method.id)} onCheckedChange={(checked) => { const currentMethods = field.value || []; return checked ? field.onChange([...currentMethods, method.id]) : field.onChange(currentMethods.filter((value) => value !== method.id)); }} /></FormControl><FormLabel className="font-normal">{method.label}</FormLabel></FormItem>))}</div></FormItem>)} />
                      
                      {needsOriginLocker && (
                        <FormItem>
                          <FormLabel>Origin Locker for LTL/LTD Shipping</FormLabel>
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              {watchedOriginLocker ? (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold">{watchedOriginLocker.name}</p>
                                    <p className="text-sm text-muted-foreground">{watchedOriginLocker.address}</p>
                                  </div>
                                  <Button variant="outline" type="button" onClick={handleOpenLockerModal}>Change Locker</Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center flex-col gap-2 text-center">
                                  <MapPin className="w-10 h-10 text-muted-foreground" />
                                  <p className="text-muted-foreground mb-2">An origin locker is required for this shipping method.</p>
                                  <Button onClick={handleOpenLockerModal} type="button" disabled={!watchedCity}>Select Origin Locker</Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          <FormMessage />
                        </FormItem>
                      )}

                      <FormField control={form.control} name="deliveryRadius" render={({ field }) => (<FormItem><FormLabel>Same-day Delivery Radius</FormLabel><Select onValueChange={field.onChange} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Select a delivery radius" /></SelectTrigger></FormControl><SelectContent>{deliveryRadiusOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent></Select><FormDescription>Requires an in-house delivery fleet.</FormDescription><FormMessage /></FormItem>)} />
                      
                      <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Public Bio / Message</FormLabel><FormControl><Textarea placeholder="Tell customers a little bit about your store..." className="resize-vertical" {...field} value={field.value || ''} /></FormControl><FormDescription>This is optional and will be displayed on your public store page.</FormDescription><FormMessage /></FormItem>)} />
                  </div>
                </section>

                <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || (form.formState.isSubmitted && !form.formState.isValid)}>
                  {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Create and Approve Dispensary
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isLockerModalOpen} onOpenChange={setIsLockerModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>Select an Origin Locker</DialogTitle>
                <DialogDescription>
                    Search for Pudo lockers within a 100km radius of your set location. This will be the default collection point for locker-based shipments.
                </DialogDescription>
            </DialogHeader>
            <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Search lockers by name or address..." value={lockerSearchTerm} onChange={(e) => setLockerSearchTerm(e.target.value)} className="pl-10" disabled={isFetchingLockers}/>
            </div>
            <div className="mt-4 max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {isFetchingLockers ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className='ml-3'>Fetching lockers...</p></div>
                ) : lockerError ? (
                    <p className="text-center text-destructive p-4 bg-destructive/10 rounded-md">{lockerError}</p>
                ) : filteredLockers.length > 0 ? (
                    filteredLockers.map(locker => (
                        <Button key={locker.id} variant="ghost" className="w-full justify-start h-auto py-3 text-left" onClick={() => handleLockerSelect(locker)}>
                            <div>
                                <p className="font-semibold">{locker.name}</p>
                                <p className="text-sm text-muted-foreground">{locker.address}</p>
                            </div>
                        </Button>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-8">No lockers found for this city. Please ensure the city is correct.</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsLockerModalOpen(false)}>Cancel</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
