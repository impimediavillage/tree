
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
import { Loader2, Clock, Save, ArrowLeft, Store as StoreIcon } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ownerEditDispensarySchema, type OwnerEditDispensaryFormData } from '@/lib/schemas';
import type { Dispensary, DispensaryType } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

const bulkDeliveryRadiusOptions = [
  { value: "none", label: "None" }, { value: "national", label: "Nationwide" },
  { value: "global", label: "Global" }, { value: "off-planet", label: "Off Planet (My products are strong!)" },
];

const leadTimeOptions = [
  { value: "same-day", label: "Same day" }, { value: "1-3", label: "1–3 days" },
  { value: "3-7", label: "3–7 days" }, { value: "7-21", label: "7–21 days" }, { value: "21-36", label: "21–36 days" },
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
    const { currentUser, loading: authLoading } = useAuth();
    const dispensaryId = currentUser?.dispensaryId;

    const [isFetchingData, setIsFetchingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wellnessProfile, setWellnessProfile] = useState<Dispensary | null>(null);
    
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
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerInstanceRef = useRef<google.maps.Marker | null>(null);
    
    const form = useForm<OwnerEditDispensaryFormData>({
        resolver: zodResolver(ownerEditDispensarySchema),
        mode: "onChange",
    });

    useEffect(() => {
        const combinedPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
        form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: !!nationalPhoneNumber });
    }, [selectedCountryCode, nationalPhoneNumber, form]);
    
    const initializeMapAndAutocomplete = useCallback(() => {
        if (!window.google || !window.google.maps || !window.google.maps.places || !wellnessProfile) return;

        const lat = wellnessProfile.latitude ?? -29.8587;
        const lng = wellnessProfile.longitude ?? 31.0218;
        const zoom = (wellnessProfile.latitude && wellnessProfile.longitude) ? 17 : 6;
        let iconUrl = wellnessTypeIcons[wellnessProfile.dispensaryType] || wellnessTypeIcons.default;
        
        if (!mapInstanceRef.current && mapContainerRef.current) {
            mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, { center: { lat, lng }, zoom, mapTypeControl: false, streetViewControl: false });
            markerInstanceRef.current = new window.google.maps.Marker({ position: { lat, lng }, map: mapInstanceRef.current, draggable: true, icon: { url: iconUrl, scaledSize: new window.google.maps.Size(40, 40), anchor: new window.google.maps.Point(20, 40) }});
            
            const geocoder = new window.google.maps.Geocoder();
            const handleMapInteraction = (pos: google.maps.LatLng) => {
                markerInstanceRef.current?.setPosition(pos);
                mapInstanceRef.current?.panTo(pos);
                form.setValue('latitude', pos.lat(), { shouldValidate: true, shouldDirty: true });
                form.setValue('longitude', pos.lng(), { shouldValidate: true, shouldDirty: true });
                geocoder.geocode({ location: pos }, (results, status) => {
                    if (status === 'OK' && results?.[0]) form.setValue('location', results[0].formatted_address, { shouldValidate: true, shouldDirty: true });
                });
            };
            mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));
            markerInstanceRef.current.addListener('dragend', () => markerInstanceRef.current?.getPosition() && handleMapInteraction(markerInstanceRef.current.getPosition()!));
        }

        if (!autocompleteRef.current && locationInputRef.current) {
            autocompleteRef.current = new window.google.maps.places.Autocomplete(locationInputRef.current, { fields: ["formatted_address", "geometry.location"], types: ["address"] });
            autocompleteRef.current.addListener("place_changed", () => {
                const place = autocompleteRef.current!.getPlace();
                if (place.formatted_address) form.setValue('location', place.formatted_address, { shouldValidate: true, shouldDirty: true });
                if (place.geometry?.location) {
                    const loc = place.geometry.location;
                    form.setValue('latitude', loc.lat(), { shouldValidate: true, shouldDirty: true });
                    form.setValue('longitude', loc.lng(), { shouldValidate: true, shouldDirty: true });
                    mapInstanceRef.current?.setCenter(loc);
                    mapInstanceRef.current?.setZoom(17);
                    markerInstanceRef.current?.setPosition(loc);
                }
            });
        }
    }, [wellnessProfile, form]);

    useEffect(() => {
        if (authLoading) return;
        if (!currentUser || !dispensaryId) {
            toast({ title: "Error", description: "Could not find wellness profile information.", variant: "destructive" });
            router.push('/auth/signin');
            return;
        }

        const fetchWellnessProfile = async () => {
            setIsFetchingData(true);
            try {
                const wellnessDocRef = doc(db, 'dispensaries', dispensaryId);
                const docSnap = await getDoc(wellnessDocRef);
                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as Dispensary;
                    setWellnessProfile(data);

                    form.reset({
                        ...data,
                        latitude: data.latitude === null ? undefined : data.latitude,
                        longitude: data.longitude === null ? undefined : data.longitude,
                        operatingDays: data.operatingDays || [],
                    });
                    
                    const openTimeComps = parseTimeToComponents(data.openTime);
                    setOpenHour(openTimeComps.hour); setOpenMinute(openTimeComps.minute); setOpenAmPm(openTimeComps.amPm);
                    const closeTimeComps = parseTimeToComponents(data.closeTime);
                    setCloseHour(closeTimeComps.hour); setCloseMinute(closeTimeComps.minute); setCloseAmPm(closeTimeComps.amPm);

                    if (data.phone) {
                        const foundCountry = countryCodes.find(cc => data.phone!.startsWith(cc.value));
                        if (foundCountry) {
                            setSelectedCountryCode(foundCountry.value);
                            setNationalPhoneNumber(data.phone!.substring(foundCountry.value.length));
                        } else { setNationalPhoneNumber(data.phone); }
                    }

                } else {
                    toast({ title: "Not Found", description: "Your wellness profile could not be found.", variant: "destructive" });
                    router.push('/dispensary-admin/dashboard');
                }
            } catch (error) {
                toast({ title: "Error", description: "Failed to fetch your wellness profile.", variant: "destructive" });
            } finally {
                setIsFetchingData(false);
            }
        };
        fetchWellnessProfile();
    }, [currentUser, dispensaryId, authLoading, router, toast, form]);
    
    useEffect(() => {
        if (wellnessProfile) initializeMapAndAutocomplete();
    }, [wellnessProfile, initializeMapAndAutocomplete]);
    
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
        if (!dispensaryId) return;
        setIsSubmitting(true);
        try {
            const wellnessDocRef = doc(db, 'dispensaries', dispensaryId);
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
    
    if (authLoading || isFetchingData) {
        return <div className="max-w-3xl mx-auto my-8 p-6 space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-8 w-2/3" /><Skeleton className="h-96 w-full mt-4" /><Skeleton className="h-12 w-full mt-4" /></div>;
    }

    if (!wellnessProfile) {
        return <div className="text-center py-10">Your wellness profile could not be loaded.</div>;
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
                        <div ref={mapContainerRef} className="h-96 w-full mt-1 rounded-md border shadow-sm" />
                        <FormField control={form.control} name="latitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="longitude" render={({ field }) => (<FormItem style={{ display: 'none' }}><FormControl><Input type="hidden" {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem>)} />
                        
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="openTime" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Open Time</FormLabel>
                                    <Popover open={isOpentimePopoverOpen} onOpenChange={setIsOpenTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal"><Clock className="mr-2 h-4 w-4 opacity-50" />{field.value ? parseTimeToComponents(field.value).hour ? `${parseTimeToComponents(field.value).hour}:${parseTimeToComponents(field.value).minute} ${parseTimeToComponents(field.value).amPm}` : 'Select Time' : 'Select Time'}</Button></FormControl></PopoverTrigger>
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
                                    <Popover open={isCloseTimePopoverOpen} onOpenChange={setIsCloseTimePopoverOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className="w-full justify-start font-normal"><Clock className="mr-2 h-4 w-4 opacity-50" />{field.value ? parseTimeToComponents(field.value).hour ? `${parseTimeToComponents(field.value).hour}:${parseTimeToComponents(field.value).minute} ${parseTimeToComponents(field.value).amPm}` : 'Select Time' : 'Select Time'}</Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0"><div className="p-4 space-y-3"><div className="grid grid-cols-3 gap-2">
                                            <Select value={closeHour} onValueChange={setCloseHour}><SelectTrigger><SelectValue placeholder="Hour" /></SelectTrigger><SelectContent>{hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                            <Select value={closeMinute} onValueChange={setCloseMinute}><SelectTrigger><SelectValue placeholder="Min" /></SelectTrigger><SelectContent>{minuteOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                            <Select value={closeAmPm} onValueChange={setCloseAmPm}><SelectTrigger><SelectValue placeholder="AM/PM" /></SelectTrigger><SelectContent>{amPmOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select>
                                        </div><Button type="button" onClick={() => setIsCloseTimePopoverOpen(false)} className="w-full">Set Time</Button></div></PopoverContent>
                                    </Popover><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="operatingDays" render={() => (<FormItem><FormLabel>Days of Operation</FormLabel><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{weekDays.map((day) => (<FormField key={day} control={form.control} name="operatingDays" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), day]) : field.onChange(field.value?.filter((value) => value !== day)); }}/></FormControl><FormLabel className="font-normal">{day}</FormLabel></FormItem>)}/>))}</div><FormMessage /></FormItem>)}/>
                        
                        <h2 className="text-xl font-semibold border-b pb-2 mt-6 text-foreground">Operations</h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="deliveryRadius" render={({ field }) => (<FormItem><FormLabel>Same-day Delivery Radius</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger></FormControl><SelectContent>{deliveryRadiusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="bulkDeliveryRadius" render={({ field }) => (<FormItem><FormLabel>Bulk Order Delivery</FormLabel><Select onValueChange={field.onChange} value={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger></FormControl><SelectContent>{bulkDeliveryRadiusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="collectionOnly" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm"><FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Collection Only</FormLabel><FormDescription>Check if you only offer order collection.</FormDescription></div><FormMessage /></FormItem>)} />
                        
                        <div className="flex gap-4 pt-4">
                            <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isSubmitting || (form.formState.isSubmitted && !form.formState.isValid)}><Save className="mr-2 h-5 w-5" /> Save Changes</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
