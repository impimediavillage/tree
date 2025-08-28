
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
import { Loader2, Clock, Truck } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, getDocs, query as firestoreQuery } from 'firebase/firestore';
import type { DispensaryType } from '@/types';
import { Loader } from '@googlemaps/js-api-loader';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; 

const currencyOptions = [
  { value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" },
  { value: "USD", label: "💵 USD (US Dollar)" },
  { value: "EUR", label: "💶 EUR (Euro)" },
  { value: "GBP", label: "💷 GBP (British Pound)" },
  { value: "AUD", label: "🇦🇺 AUD (Australian Dollar)" },
];

const deliveryRadiusOptions = [
  { value: "none", label: "No same-day delivery" },
  { value: "5", label: "5 km" }, { value: "10", label: "10 km" }, { value: "20", label: "20 km" },
  { value: "50", label: "50 km" }, { value: "100", label: "100 km" },
];

const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString().padStart(2, '0') }));
const minuteOptions = [
  { value: "00", label: "00" }, { value: "15", label: "15" },
  { value: "30", label: "30" }, { value: "45", label: "45" },
];
const amPmOptions = [ { value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

const wellnessTypeIcons: Record<string, string> = {
  "THC - CBD - Mushrooms wellness": "/icons/thc-cbd-mushroom.png",
  "Homeopathic wellness": "/icons/homeopathy.png",
  "African Traditional Medicine wellness": "/icons/traditional-medicine.png",
  "Flower Store": "/icons/default-pin.png",
  "Permaculture & gardening store": "/icons/permaculture.png",
  "Traditional Medicine": "/icons/traditional-medicine.png",
  "Homeopathy": "/icons/homeopathy.png",
  "THC / CBD / Mushroom Products": "/icons/thc-cbd-mushroom.png",
  "Permaculture Products": "/icons/permaculture.png",
  "default": "/icons/default-pin.png"
};

const countryCodes = [
  { value: "+27", flag: "🇿🇦", shortName: "ZA", code: "+27" },
  { value: "+1",  flag: "🇺🇸", shortName: "US", code: "+1" },
  { value: "+44", flag: "🇬🇧", shortName: "GB", code: "+44" },
  { value: "+61", flag: "🇦🇺", shortName: "AU", code: "+61" },
  { value: "+49", flag: "🇩🇪", shortName: "DE", code: "+49" },
  { value: "+33", flag: "🇫🇷", shortName: "FR", code: "+33" },
];

const allShippingMethods = [
  { id: "dtd", label: "DTD - Door to Door (The Courier Guy)" },
  { id: "dtl", label: "DTL - Door to Locker (Pudo)" },
  { id: "ltd", label: "LTD - Locker to Door (Pudo)" },
  { id: "ltl", label: "LTL - Locker to Locker (Pudo)" },
  { id: "collection", label: "Collection from store" },
  { id: "in_house", label: "In-house delivery service" },
];

export default function WellnessSignupPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [wellnessTypes, setWellnessTypes] = useState<DispensaryType[]>([]);

  const [openHour, setOpenHour] = useState<string | undefined>();
  const [openMinute, setOpenMinute] = useState<string | undefined>();
  const [openAmPm, setOpenAmPm] = useState<string | undefined>();
  const [isOpentimePopoverOpen, setIsOpenTimePopoverOpen] = useState(false);

  const [closeHour, setCloseHour] = useState<string | undefined>();
  const [closeMinute, setCloseMinute] = useState<string | undefined>();
  const [closeAmPm, setCloseAmPm] = useState<string | undefined>();
  const [isCloseTimePopoverOpen, setIsCloseTimePopoverOpen] = useState(false);

  const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0].value);
  const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');

  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);

  const form = useForm<DispensarySignupFormData>({
    resolver: zodResolver(dispensarySignupSchema),
    mode: "onChange",
    defaultValues: {
      fullName: '', phone: '', ownerEmail: '', dispensaryName: '',
      dispensaryType: undefined, currency: undefined, openTime: '', closeTime: '',
      operatingDays: [], location: '', latitude: undefined, longitude: undefined,
      deliveryRadius: undefined, 
      message: '', acceptTerms: false, shippingMethods: [],
    },
  });

  useEffect(() => {
    const combinedPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
    form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: !!nationalPhoneNumber });
  }, [selectedCountryCode, nationalPhoneNumber, form]);

  const fetchWellnessTypes = useCallback(async () => {
    try {
      const typesCollectionRef = collection(db, 'dispensaryTypes');
      const q = firestoreQuery(typesCollectionRef);
      const querySnapshot = await getDocs(q);
      const fetchedTypes: DispensaryType[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedTypes.push({
            id: docSnap.id,
            name: docSnap.data().name,
            iconPath: docSnap.data().iconPath,
            image: docSnap.data().image
        } as DispensaryType);
      });
      setWellnessTypes(fetchedTypes.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error fetching wellness types for signup:", error);
      toast({ title: "Error", description: "Could not load wellness types. Please try again.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    fetchWellnessTypes();
  }, [fetchWellnessTypes]);

  const watchDispensaryType = form.watch("dispensaryType");

  const initializeMap = useCallback(async () => {
    if (mapInitialized.current || !mapContainerRef.current || !locationInputRef.current) return;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key is missing.");
      toast({ title: "Map Error", description: "Google Maps API key is not configured.", variant: "destructive"});
      return;
    }
    
    mapInitialized.current = true;

    try {
        const loader = new Loader({
            apiKey: apiKey,
            version: 'weekly',
            libraries: ['places'],
        });

        const google = await loader.load();
        const { Map } = google.maps;
        const { Marker } = google.maps;
        
        const initialLat = -29.8587;
        const initialLng = 31.0218;

        const map = new Map(mapContainerRef.current!, {
            center: { lat: initialLat, lng: initialLng },
            zoom: 6,
            mapId: 'b39f3f8b7139051d', 
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
        });

        const marker = new Marker({
            position: { lat: initialLat, lng: initialLng },
            map,
            draggable: true,
            icon: { url: wellnessTypeIcons.default, scaledSize: new google.maps.Size(40, 40), anchor: new google.maps.Point(20, 40) }
        });

        const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current!, {
            fields: ["formatted_address", "geometry", "name", "address_components"],
            types: ["address"],
            componentRestrictions: { country: "za" },
        });

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) form.setValue('location', place.formatted_address, { shouldValidate: true, shouldDirty: true });
            if (place.geometry?.location) {
                const loc = place.geometry.location;
                form.setValue('latitude', loc.lat(), { shouldValidate: true, shouldDirty: true });
                form.setValue('longitude', loc.lng(), { shouldValidate: true, shouldDirty: true });
                map.setCenter(loc);
                map.setZoom(17);
                marker.setPosition(loc);
            }
        });
        
        const geocoder = new google.maps.Geocoder();
        const handleMapInteraction = (pos: google.maps.LatLng) => {
            marker.setPosition(pos);
            map.panTo(pos);
            form.setValue('latitude', pos.lat(), { shouldValidate: true, shouldDirty: true });
            form.setValue('longitude', pos.lng(), { shouldValidate: true, shouldDirty: true });
            geocoder.geocode({ location: pos }, (results, status) => {
                if (status === 'OK' && results?.[0]) {
                    form.setValue('location', results[0].formatted_address, { shouldValidate: true, shouldDirty: true });
                }
            });
        };
        
        map.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));
        marker.addListener('dragend', () => marker.getPosition() && handleMapInteraction(marker.getPosition()!));

        const iconUrl = wellnessTypeIcons[watchDispensaryType] || wellnessTypeIcons.default;
        marker.setIcon({ url: iconUrl, scaledSize: new google.maps.Size(40, 40), anchor: new google.maps.Point(20, 40) });

    } catch (e) {
      console.error('Error loading Google Maps:', e);
      toast({ title: 'Map Error', description: 'Could not load Google Maps. Please try refreshing the page.', variant: 'destructive'});
    }
  }, [form, toast, watchDispensaryType]);


  useEffect(() => {
    if (mapContainerRef.current && !mapInitialized.current) {
        initializeMap();
    }
  }, [initializeMap]);
  

  const formatTo24Hour = (hourStr?: string, minuteStr?: string, amPmStr?: string): string => {
    if (!hourStr || !minuteStr || !amPmStr) return '';
    let hour = parseInt(hourStr, 10);
    if (amPmStr === 'PM' && hour !== 12) hour += 12;
    else if (amPmStr === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
  };

  const formatTo12HourDisplay = (time24?: string): string => {
    if (!time24 || !time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) return "Select Time";
    const [hour24Str, minuteStr] = time24.split(':');
    let hour24 = parseInt(hour24Str, 10);
    const amPm = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12.toString().padStart(2, '0')}:${minuteStr} ${amPm}`;
  };

  useEffect(() => {
    form.setValue('openTime', formatTo24Hour(openHour, openMinute, openAmPm), { shouldValidate: true, shouldDirty: true });
  }, [openHour, openMinute, openAmPm, form]);

  useEffect(() => {
    form.setValue('closeTime', formatTo24Hour(closeHour, closeMinute, closeAmPm), { shouldValidate: true, shouldDirty: true });
  }, [closeHour, closeMinute, closeAmPm, form]);

  async function onSubmit(data: DispensarySignupFormData) {
    setIsLoading(true);
    try {
      const wellnessData = {
        ...data,
        applicationDate: Timestamp.fromDate(new Date()),
        status: 'Pending Approval',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      };
      await addDoc(collection(db, 'dispensaries'), wellnessData);
      toast({
        title: "Application Submitted!",
        description: "Your wellness application has been received and is pending review.",
      });
      form.reset();
      setOpenHour(undefined); setOpenMinute(undefined); setOpenAmPm(undefined);
      setCloseHour(undefined); setCloseMinute(undefined); setCloseAmPm(undefined);
      setSelectedCountryCode(countryCodes[0].value);
      setNationalPhoneNumber('');
      mapInitialized.current = false;
      initializeMap();
    } catch (error) {
      console.error("Error submitting wellness application:", error);
      toast({
        title: "Submission Failed",
        description: "An error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const selectedCountryDisplay = countryCodes.find(cc => cc.value === selectedCountryCode);

  return (
    <Card className="max-w-3xl mx-auto my-8 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle 
            className="text-3xl text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >Virtual Store Sign-Up</CardTitle>
        <CardDescription 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >Join our platform and reach more customers.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <h2 className="text-xl font-semibold border-b pb-2 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Owner Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your Full Name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                <FormItem><FormLabel>Owner's Email Address</FormLabel><FormControl><Input type="email" placeholder="owner@example.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Store Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="dispensaryName" render={({ field }) => (
                <FormItem><FormLabel>Store Name</FormLabel><FormControl><Input placeholder="Your Store Name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dispensaryType" render={({ field }) => (
                <FormItem><FormLabel>Store Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {wellnessTypes.map(type => <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem><FormLabel>Preferred Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl>
                  <SelectContent>{currencyOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />

            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Location & Contact</h2>
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem><FormLabel>Store Location / Address</FormLabel>
                <FormControl><Input placeholder="e.g. 123 Main St, Anytown" {...field} ref={locationInputRef} /></FormControl>
                <FormDescription>Start typing your address. Select from suggestions to pinpoint on map.</FormDescription><FormMessage />
              </FormItem>
            )} />
            <div ref={mapContainerRef} className="h-96 w-full mt-1 rounded-md border shadow-sm bg-muted" />
            <FormDescription>Click on the map or drag the marker to fine-tune location. Icon changes with store type.</FormDescription>
            <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
            <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
            
            <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <div className="flex items-center gap-2">
                  <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}>
                    <SelectTrigger className="w-[120px] shrink-0">
                      {selectedCountryDisplay ? (
                        <div className="flex items-center gap-1.5">
                          <span>{selectedCountryDisplay.flag}</span>
                          <span>{selectedCountryDisplay.code}</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Code" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map(cc => (
                        <SelectItem key={cc.value} value={cc.value}>
                          <div className="flex items-center gap-2">
                            <span>{cc.flag}</span>
                            <span>{cc.shortName}</span>
                            <span>({cc.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder="National number"
                    value={nationalPhoneNumber}
                    onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                 <FormField control={form.control} name="phone" render={() => (
                    <FormItem className="mt-0 pt-0"><FormMessage /></FormItem>
                 )} />
              </FormItem>

            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Operating Hours</h2>
            <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="openTime" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Open Time</FormLabel>
                    <Popover open={isOpentimePopoverOpen} onOpenChange={setIsOpenTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal">
                            <Clock className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? formatTo12HourDisplay(field.value) : <span>Select Open Time</span>}
                        </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                        <Select value={openHour} onValueChange={setOpenHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={openMinute} onValueChange={setOpenMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={openAmPm} onValueChange={setOpenAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                    </div><Button type="button" onClick={() => setIsOpenTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>)} />
                <FormField control={form.control} name="closeTime" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Close Time</FormLabel>
                    <Popover open={isCloseTimePopoverOpen} onOpenChange={setIsCloseTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal">
                            <Clock className="mr-2 h-4 w-4 opacity-50" />
                            {field.value ? formatTo12HourDisplay(field.value) : <span>Select Close Time</span>}
                        </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                        <Select value={closeHour} onValueChange={setCloseHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={closeMinute} onValueChange={setCloseMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                        <Select value={closeAmPm} onValueChange={setCloseAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                    </div><Button type="button" onClick={() => setIsCloseTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>)} />
            </div>

            <FormField control={form.control} name="operatingDays" render={() => (<FormItem><FormLabel>Days of Operation</FormLabel><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {weekDays.map((day) => (<FormField key={day} control={form.control} name="operatingDays" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {
                            return checked ? field.onChange([...(field.value || []), day]) : field.onChange(field.value?.filter((value) => value !== day));
                          }}/></FormControl><FormLabel className="font-normal">{day}</FormLabel></FormItem>)}/>))}</div>
                <FormMessage />
            </FormItem>)}/>

            <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground" style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}>Operations & Delivery</h2>
            <FormField control={form.control} name="shippingMethods" render={() => (
              <FormItem>
                <FormLabel>Shipping Methods Offered</FormLabel>
                <FormDescription>Select all shipping methods your store will support.</FormDescription>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allShippingMethods.map((method) => (
                    <FormField key={method.id} control={form.control} name="shippingMethods" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 bg-muted/30">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(method.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), method.id])
                                : field.onChange(field.value?.filter((value) => value !== method.id))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal text-sm">{method.label}</FormLabel>
                      </FormItem>
                    )}/>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField control={form.control} name="deliveryRadius" render={({ field }) => (
                <FormItem><FormLabel>Same-day Delivery Radius</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger></FormControl>
                    <SelectContent>{deliveryRadiusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem><FormLabel>Additional Information (Optional)</FormLabel><FormControl><Textarea placeholder="Tell us more about your wellness store..." {...field} value={field.value || ''} rows={4} /></FormControl><FormMessage /></FormItem>)} />

            <FormField control={form.control} name="acceptTerms" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none"><FormLabel>
                    I accept the <Link href="/terms" target="_blank" className="underline text-primary hover:text-primary/80">Terms of Usage Agreement</Link>.</FormLabel></div>
                <FormMessage className="ml-0 pl-0 -mt-1 text-xs"/>
                </FormItem>
            )}/>

            <Button type="submit" className="w-full text-lg py-6"
              disabled={isLoading || (form.formState.isSubmitted && !form.formState.isValid)}
            >
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />} Submit Application
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
