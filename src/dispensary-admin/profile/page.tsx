
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, Save, ArrowLeft, Store as StoreIcon, Truck } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ownerEditDispensarySchema, type OwnerEditDispensaryFormData } from '@/lib/schemas';
import type { Dispensary, DispensaryType } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Loader } from '@googlemaps/js-api-loader';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', Fri', Sat', Sun'];

const currencyOptions = [
  { value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" }, { value: "USD", label: "💵 USD (US Dollar)" },
  { value: "EUR", label: "💶 EUR (Euro)" }, { value: "GBP", label: "💷 GBP (British Pound)" },
  { value: "AUD", label: "🇦🇺 AUD (Australian Dollar)" },
];

const deliveryRadiusOptions = [
  { value: "none", label: "No same-day delivery" }, { value: "5", label: "5 km" },
  { value: "10", label: "10 km" }, { value: "20", label: "20 km" }, { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];

const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString().padStart(2, '0') }));
const minuteOptions = [ { value: "00", label: "00" }, { value: "15", label: "15" }, { value: "30", label: "30" }, { value: "45", label: "45" }];
const amPmOptions = [ { value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

const wellnessTypeIcons: Record<string, string> = {
  "THC - CBD - Mushrooms wellness": "/icons/thc-cbd-mushroom.png",
  "Homeopathic wellness": "/icons/homeopathy.png",
  "African Traditional Medicine wellness": "/icons/traditional-medicine.png",
  "Flower Store": "/icons/default-pin.png",
  "Permaculture & gardening store": "/icons/permaculture.png",
  "default": "/icons/default-pin.png"
};

const countryCodes = [
  { value: "+27", flag: "🇿🇦", shortName: "ZA", code: "+27" },
  { value: "+1",  flag: "🇺🇸", shortName: "US", code: "+1" },
  { value: "+44", flag: "🇬🇧", shortName: "GB", code: "+44" },
  { value: "+61", flag: "🇦🇺", shortName: "AU", code: "+61" },
];

const allShippingMethods = [
  { id: "dtd", label: "DTD - Door to Door (The Courier Guy)" },
  { id: "dtl", label: "DTL - Door to Locker (Pudo)" },
  { id: "ltd", label: "LTD - Locker to Door (Pudo)" },
  { id: "ltl", label: "LTL - Locker to Locker (Pudo)" },
  { id: "collection", label: "Collection from store" },
  { id: "in_house", label: "In-house delivery service" },
];

function parseTimeToComponents(time24?: string): { hour?: string, minute?: string, amPm?: string } {
    if (!time24 || !time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) return {};
    const [hourStr, minuteStr] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const amPm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12; // 12 PM or 12 AM
    return { hour: hour.toString(), minute: minuteStr, amPm };
}

export default function WellnessOwnerProfilePage() {
    const { toast } = useToast();
    const router = useRouter();
    const { currentUser, currentDispensary, loading: authLoading } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
    
    const form = useForm<OwnerEditDispensaryFormData>({
        resolver: zodResolver(ownerEditDispensarySchema),
        mode: "onChange",
    });

    useEffect(() => {
        const combinedPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
        form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: !!nationalPhoneNumber });
    }, [selectedCountryCode, nationalPhoneNumber, form]);
    
    const initializeMap = useCallback(async (profile: Dispensary) => {
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
    
            const lat = profile.latitude ?? -29.8587;
            const lng = profile.longitude ?? 31.0218;
            const zoom = (profile.latitude && profile.longitude) ? 17 : 6;
            let iconUrl = wellnessTypeIcons[profile.dispensaryType] || wellnessTypeIcons.default;
    
            const map = new Map(mapContainerRef.current!, { center: { lat, lng }, zoom, mapId: 'b39f3f8b7139051d', mapTypeControl: false, streetViewControl: false });
            const marker = new Marker({ position: { lat, lng }, map, draggable: true, icon: { url: iconUrl, scaledSize: new google.maps.Size(40, 40), anchor: new google.maps.Point(20, 40) } });
            const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current!, { fields: ["formatted_address", "geometry.location"], types: ["address"] });
    
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
    
        } catch (e) {
          console.error('Error loading Google Maps:', e);
          toast({ title: 'Map Error', description: 'Could not load Google Maps. Please try refreshing the page.', variant: 'destructive'});
        }
    }, [form, toast]);

    useEffect(() => {
        if (!authLoading && currentDispensary) {
            form.reset({
                ...currentDispensary,
                latitude: currentDispensary.latitude === null ? undefined : currentDispensary.latitude,
                longitude: currentDispensary.longitude === null ? undefined : currentDispensary.longitude,
                operatingDays: currentDispensary.operatingDays || [],
                shippingMethods: currentDispensary.shippingMethods || [],
            });
            
            const openTimeComps = parseTimeToComponents(currentDispensary.openTime);
            setOpenHour(openTimeComps.hour); setOpenMinute(openTimeComps.minute); setOpenAmPm(openTimeComps.amPm);
            
            const closeTimeComps = parseTimeToComponents(currentDispensary.closeTime);
            setCloseHour(closeTimeComps.hour); setCloseMinute(closeTimeComps.minute); setCloseAmPm(closeTimeComps.amPm);

            if (currentDispensary.phone) {
                const foundCountry = countryCodes.find(cc => currentDispensary.phone!.startsWith(cc.value));
                if (foundCountry) {
                    setSelectedCountryCode(foundCountry.value);
                    setNationalPhoneNumber(currentDispensary.phone!.substring(foundCountry.value.length));
                } else { setNationalPhoneNumber(currentDispensary.phone); }
            }
            
            initializeMap(currentDispensary);
        } else if (!authLoading && !currentDispensary) {
            toast({ title: "Not Found", description: "Your wellness profile could not be found.", variant: "destructive" });
            router.push('/dispensary-admin/dashboard');
        }
    }, [currentDispensary, authLoading, router, toast, form, initializeMap]);
    
    const formatTo24Hour = (hourStr?: string, minuteStr?: string, amPmStr?: string): string => {
        if (!hourStr || !minuteStr || !amPmStr) return '';
        let hour = parseInt(hourStr, 10);
        if (amPmStr === 'PM' && hour !== 12) hour += 12;
        else if (amPmStr === 'AM' && hour === 12) hour = 0;
        return `${hour.toString().padStart(2, '0')}:${minuteStr}`;
    };

    useEffect(() => { form.setValue('openTime', formatTo24Hour(openHour, openMinute, openAmPm), { shouldValidate: true, shouldDirty: true }); }, [openHour, openMinute, openAmPm, form]);
    useEffect(() => { form.setValue('closeTime', formatTo24Hour(closeHour, closeMinute, closeAmPm), { shouldValidate: true, shouldDirty: true }); }, [closeHour, closeMinute, closeAmPm, form]);

    async function onSubmit(data: OwnerEditDispensaryFormData) {
        if (!currentDispensary?.id) return;
        setIsSubmitting(true);
        try {
            const wellnessDocRef = doc(db, 'dispensaries', currentDispensary.id);
            const updateData = { ...data, lastActivityDate: serverTimestamp() };
            await updateDoc(wellnessDocRef, updateData as any);
            toast({ title: "Profile Updated", description: "Your wellness profile has been successfully updated." });
            router.push('/dispensary-admin/dashboard');
        } catch (error) {
            toast({ title: "Update Failed", description: "Could not update your profile.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

     const formatTo12HourDisplay = (time24?: string): string => {
        if (!time24 || !time24.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) return "Select Time";
        const [hour24Str, minuteStr] = time24.split(':');
        let hour24 = parseInt(hour24Str, 10);
        const amPm = hour24 >= 12 ? 'PM' : 'AM';
        let hour12 = hour24 % 12;
        if (hour12 === 0) hour12 = 12;
        return `${hour12.toString().padStart(2, '0')}:${minuteStr} ${amPm}`;
    };
    
    if (authLoading || !currentDispensary) {
        return <div className="max-w-3xl mx-auto my-8 p-6 space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-96 w-full mt-4" /><Skeleton className="h-12 w-full mt-4" /></div>;
    }
    
    const selectedCountryDisplay = countryCodes.find(cc => cc.value === selectedCountryCode);

    return (
        <Card className="max-w-3xl mx-auto my-8 shadow-xl">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl flex items-center text-foreground"><StoreIcon className="mr-3 h-8 w-8 text-primary" /> Edit My Profile</CardTitle>
                    <Button variant="outline" size="sm" asChild><Link href="/dispensary-admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link></Button>
                </div>
                <CardDescription className="text-foreground">Update your wellness profile details. Your email and full name are linked to your auth account.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <h2 className="text-xl font-semibold border-b pb-2 text-foreground">My Information</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormItem><FormLabel>Full Name (Read-only)</FormLabel><Input value={currentUser?.displayName || ''} readOnly disabled /></FormItem>
                            <FormItem><FormLabel>Email (Read-only)</FormLabel><Input value={currentUser?.email || ''} readOnly disabled /></FormItem>
                        </div>

                        <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Wellness Information</h2>
                        <FormField control={form.control} name="dispensaryName" render={({ field }) => ( <FormItem><FormLabel>Wellness Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="phone" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <div className="flex items-center gap-2">
                                <Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}><SelectTrigger className="w-[120px] shrink-0">{selectedCountryDisplay ? <div className="flex items-center gap-1.5"><span>{selectedCountryDisplay.flag}</span><span>{selectedCountryDisplay.code}</span></div> : <SelectValue placeholder="Code" />}</SelectTrigger><SelectContent>{countryCodes.map(cc => <SelectItem key={cc.value} value={cc.value}><div className="flex items-center gap-2"><span>{cc.flag}</span><span>{cc.shortName} ({cc.code})</span></div></SelectItem>)}</SelectContent></Select>
                                <Input type="tel" placeholder="National number" value={nationalPhoneNumber} onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))}/></div>
                                <FormControl><input type="hidden" {...field} /></FormControl><FormMessage />
                             </FormItem>
                        )} />

                        <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Location & Hours</h2>
                        <FormField control={form.control} name="location" render={({ field }) => ( <FormItem><FormLabel>Location / Address</FormLabel><FormControl><Input {...field} ref={locationInputRef} /></FormControl><FormDescription>Start typing address or drag marker on map.</FormDescription><FormMessage /></FormItem> )} />
                        <div ref={mapContainerRef} className="h-96 w-full mt-1 rounded-md border shadow-sm bg-muted" />
                        <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="openTime" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Open Time</FormLabel>
                                    <Popover open={isOpentimePopoverOpen} onOpenChange={setIsOpenTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal"><Clock className="mr-2 h-4 w-4 opacity-50" />{field.value ? formatTo12HourDisplay(field.value) : 'Select Time'}</Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                                            <Select value={openHour} onValueChange={setOpenHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                            <Select value={openMinute} onValueChange={setOpenMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                            <Select value={openAmPm} onValueChange={setOpenAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                        </div><Button type="button" onClick={() => setIsOpenTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                                    </Popover><FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="closeTime" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Close Time</FormLabel>
                                    <Popover open={isCloseTimePopoverOpen} onOpenChange={setIsCloseTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal"><Clock className="mr-2 h-4 w-4 opacity-50" />{field.value ? formatTo12HourDisplay(field.value) : 'Select Time'}</Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                                            <Select value={closeHour} onValueChange={setCloseHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                            <Select value={closeMinute} onValueChange={setCloseMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                            <Select value={closeAmPm} onValueChange={setCloseAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                        </div><Button type="button" onClick={() => setIsCloseTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                                    </Popover><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="operatingDays" render={() => (<FormItem><FormLabel>Days of Operation</FormLabel><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">{weekDays.map((day) => (<FormField key={day} control={form.control} name="operatingDays" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), day]) : field.onChange(field.value?.filter((value) => value !== day)); }}/></FormControl><FormLabel className="font-normal">{day}</FormLabel></FormItem>)}/>))}</div><FormMessage /></FormItem>)}/>
                        
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Operations & Delivery</h2>
                        
                        <FormField control={form.control} name="shippingMethods" render={() => (
                          <FormItem>
                            <FormLabel>Shipping Methods Offered</FormLabel>
                            <FormDescription>Select all shipping methods your store supports. This will affect options available when you add products.</FormDescription>
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
                            <FormField control={form.control} name="deliveryRadius" render={({ field }) => (<FormItem><FormLabel>Same-day Delivery Radius</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger></FormControl><SelectContent>{deliveryRadiusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        
                        <FormField control={form.control} name="message" render={({ field }) => (
                        <FormItem><FormLabel>Additional Information (Optional)</FormLabel><FormControl><Textarea placeholder="Notes..." {...field} value={field.value || ''} rows={4} /></FormControl><FormMessage /></FormItem>)} />

                        <div className="flex gap-4 pt-4">
                            <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isSubmitting || (form.formState.isSubmitted && !form.formState.isValid)}><Save className="mr-2 h-5 w-5" /> Save Changes</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
