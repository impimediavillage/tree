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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Building } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { db, functions } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query as firestoreQuery, orderBy } from 'firebase/firestore';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { editDispensarySchema, type EditDispensaryFormData } from '@/lib/schemas';
import type { Dispensary, DispensaryType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from '@googlemaps/js-api-loader';

// --- Re-usable constants ---
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const currencyOptions = [{ value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" }, { value: "USD", label: "💵 USD (US Dollar)" }, { value: "EUR", label: "💶 EUR (Euro)" }, { value: "GBP", label: "💷 GBP (British Pound)" }];
const deliveryRadiusOptions = [{ value: "none", label: "No same-day delivery" }, { value: "5", label: "5 km" }, { value: "10", label: "10 km" }, { value: "20", label: "20 km" }, { value: "50", label: "50 km" }];
const wellnessStatusOptions: EditDispensaryFormData['status'][] = ['Pending Approval', 'Approved', 'Rejected', 'Suspended'];
const allShippingMethods = [{ id: "dtd", label: "DTD - Door to Door (The Courier Guy)" }, { id: "dtl", label: "DTL - Door to Locker (Pudo)" }, { id: "ltd", label: "LTD - Locker to Door (Pudo)" }, { id: "ltl", label: "LTL - Locker to Locker (Pudo)" }, { id: "collection", label: "Collection from store" }, { id: "in_house", label: "In-house delivery service" }];
const countryCodes = [{ value: "+27", flag: "🇿🇦", shortName: "ZA", code: "+27" }];

const createDispensaryUserCallable = httpsCallable(functions, 'createDispensaryUser');

// --- Main Page Component (Handles data fetching and auth) ---
export default function EditDispensaryPage() {
    const params = useParams();
    const dispensaryId = params.dispensaryId as string;
    const router = useRouter();
    const { toast } = useToast();
    const { isSuperAdmin, loading: authLoading } = useAuth();

    const [dispensary, setDispensary] = useState<Dispensary | null>(null);
    const [allDispensaryTypes, setAllDispensaryTypes] = useState<DispensaryType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return; // Wait for authentication to resolve

        if (!isSuperAdmin) {
            toast({ title: "Access Denied", description: "You do not have permission to view this page.", variant: "destructive" });
            router.replace('/admin/dashboard');
            return;
        }

        if (!dispensaryId) {
            router.replace('/admin/dashboard/dispensaries');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch dispensary data
                const docRef = doc(db, "dispensaries", dispensaryId);
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    toast({ title: "Not Found", description: "Dispensary data could not be found.", variant: "destructive" });
                    router.replace('/admin/dashboard/dispensaries');
                    return;
                }
                const dispensaryData = { id: docSnap.id, ...docSnap.data() } as Dispensary;
                setDispensary(dispensaryData);

                // Fetch dispensary types
                const typesQuery = firestoreQuery(collection(db, 'dispensaryTypes'), orderBy('name'));
                const typesSnapshot = await getDocs(typesQuery);
                const typesData = typesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as DispensaryType));
                setAllDispensaryTypes(typesData);

            } catch (error) {
                console.error("Failed to fetch data:", error);
                toast({ title: "Server Error", description: "Failed to fetch required data.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [dispensaryId, isSuperAdmin, authLoading, router, toast]);

    if (isLoading || authLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!dispensary) {
        // This case is handled by the loading state, but as a fallback:
        return <div className="text-center py-12">Dispensary not found or failed to load.</div>;
    }

    return <EditDispensaryForm initialData={dispensary} allDispensaryTypes={allDispensaryTypes} />;
}


// --- Form Component (Handles UI and submission) ---
function EditDispensaryForm({ initialData, allDispensaryTypes }: { initialData: Dispensary; allDispensaryTypes: DispensaryType[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const { isSuperAdmin } = useAuth(); 
    const dispensaryId = initialData.id;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');
    const [selectedCountryCode, setSelectedCountryCode] = useState(countryCodes[0].value);
    
    const locationInputRef = useRef<HTMLInputElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInitialized = useRef(false);

    const form = useForm<EditDispensaryFormData>({
        resolver: zodResolver(editDispensarySchema),
        mode: "onChange",
        defaultValues: {
            ...initialData,
            showLocation: initialData.showLocation ?? true, // Default to true if undefined
        },
    });

    // --- FORM POPULATION & SYNC ---
    useEffect(() => {
        const phone = initialData.phone || '';
        const countryCode = countryCodes.find(c => phone.startsWith(c.value));
        if (countryCode) {
            setSelectedCountryCode(countryCode.value);
            setNationalPhoneNumber(phone.substring(countryCode.value.length));
        } else {
            setNationalPhoneNumber(phone);
        }
    }, [initialData.phone]);

    useEffect(() => {
        const fullPhoneNumber = `${selectedCountryCode}${nationalPhoneNumber}`;
        form.setValue('phone', fullPhoneNumber, { shouldValidate: nationalPhoneNumber.length > 5, shouldDirty: true });
    }, [selectedCountryCode, nationalPhoneNumber, form]);

    // --- GOOGLE MAPS INTEGRATION ---
    const initializeMap = useCallback((lat: number, lng: number) => {
        if (mapInitialized.current || !mapContainerRef.current) return;
        mapInitialized.current = true;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) { toast({ title: "Map Error", description: "API key is missing.", variant: "destructive" }); return; }

        const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places', 'geocoding'] });
        loader.load().then(google => {
            const map = new google.maps.Map(mapContainerRef.current!, { center: { lat, lng }, zoom: 12, mapId: 'b39f3f8b7139051d' });
            const marker = new google.maps.Marker({ map, position: { lat, lng }, draggable: true });
            const geocoder = new google.maps.Geocoder();
            const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current!, { componentRestrictions: { country: "za" }, fields: ["address_components", "geometry", "formatted_address"]});
            const getAddrComp = (comps: any[], type: string, s = false) => comps.find(c=>c.types.includes(type))?.[s ? 'short_name':'long_name']||'';
            const setFields = (p: any) => {
                const c = p.address_components; if (!c) return;
                form.setValue('streetAddress', `${getAddrComp(c, 'street_number')} ${getAddrComp(c, 'route')}`.trim(), { shouldValidate: true, shouldDirty: true });
                form.setValue('suburb', getAddrComp(c, 'locality'), { shouldValidate: true, shouldDirty: true });
                form.setValue('city', getAddrComp(c, 'administrative_area_level_2'), { shouldValidate: true, shouldDirty: true });
                form.setValue('province', getAddrComp(c, 'administrative_area_level_1', true), { shouldValidate: true, shouldDirty: true });
                form.setValue('postalCode', getAddrComp(c, 'postal_code'), { shouldValidate: true, shouldDirty: true });
                if (locationInputRef.current && p.formatted_address) locationInputRef.current.value = p.formatted_address;
            };
            const updateLatLng = (lat: number, lng: number) => { marker.setPosition({ lat, lng }); form.setValue('latitude', lat, { shouldValidate: true, shouldDirty: true }); form.setValue('longitude', lng, { shouldValidate: true, shouldDirty: true }); };
            autocomplete.addListener("place_changed", () => { const p = autocomplete.getPlace(); if(!p.geometry?.location) return; updateLatLng(p.geometry.location.lat(), p.geometry.location.lng()); setFields(p); map.setCenter(p.geometry.location); map.setZoom(17); });
            const handleMapInteraction = (pos: google.maps.LatLng) => { updateLatLng(pos.lat(), pos.lng()); geocoder.geocode({ location: pos }, (res, stat) => { if (stat === 'OK' && res?.[0]) setFields(res[0]); }); };
            marker.addListener('dragend', () => { const pos = marker.getPosition(); if (pos) handleMapInteraction(pos); });
            map.addListener('click', (e: any) => { if (e.latLng) handleMapInteraction(e.latLng); });
        }).catch(e => toast({ title: 'Map Error', description: 'Could not load Maps.', variant: 'destructive' }));
    }, [form, toast]);
    
    useEffect(() => {
        if (initialData.latitude && initialData.longitude) {
            initializeMap(initialData.latitude, initialData.longitude);
        } else {
             initializeMap(-29.85, 31.02); // Default to Durban
        }
    }, [initialData, initializeMap]);

    // --- SUBMIT LOGIC (UNCHANGED) ---
    async function onSubmit(data: EditDispensaryFormData) {
        if (!dispensaryId || !isSuperAdmin) return;
        setIsSubmitting(true);
        
        const updateData: { [key: string]: any } = { 
            ...data, 
            showLocation: data.showLocation, // Ensure boolean is passed correctly
            lastActivityDate: serverTimestamp() 
        };

        try {
            const wasPending = initialData?.status === 'Pending Approval';
            const isNowApproved = data.status === 'Approved';

            if (wasPending && isNowApproved) {
                toast({ title: "Approving...", description: "Creating owner account..." });
                await createDispensaryUserCallable({ email: data.ownerEmail, displayName: data.fullName, dispensaryId });
                toast({ title: "Approval Success!", description: `Owner account for ${data.ownerEmail} created and linked.` });
                updateData.approvedDate = serverTimestamp();
            }
            
            await updateDoc(doc(db, 'dispensaries', dispensaryId), updateData);
            toast({ title: "Update Successful", description: `${data.dispensaryName} has been updated.` });
            router.push('/admin/dashboard/dispensaries');
        } catch (error: any) {
            const msg = error instanceof FunctionsError ? error.message : "An unexpected error occurred.";
            toast({ title: "Update Failed", description: msg, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="max-w-4xl mx-auto my-8 shadow-xl bg-card">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-3xl flex items-center text-foreground"><Building className="mr-3 h-8 w-8 text-primary" /> Edit Dispensary</CardTitle>
                    <Button variant="outline" size="sm" asChild><Link href="/admin/dashboard/dispensaries"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link></Button>
                </div>
                <CardDescription>Editing &quot;{initialData.dispensaryName}&quot;. Changes here are live.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                         <section>
                            <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Core Details & Status</h2>
                             <div className="grid md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="dispensaryName" render={({ field }) => (<FormItem><FormLabel>Dispensary Name</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a status..." /></SelectTrigger></FormControl><SelectContent>{wellnessStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormDescription>Approving a dispensary creates an owner account.</FormDescription><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="dispensaryType" render={({ field }) => (<FormItem><FormLabel>Dispensary Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a type..." /></SelectTrigger></FormControl><SelectContent>{allDispensaryTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Default Currency</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a currency..." /></SelectTrigger></FormControl><SelectContent>{currencyOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                             </div>
                        </section>
                        
                        <section>
                             <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Owner Information</h2>
                             <div className="grid md:grid-cols-2 gap-6">
                                 <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Owner&apos;s Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                 <FormField control={form.control} name="ownerEmail" render={({ field }) => (<FormItem><FormLabel>Owner&apos;s Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl><FormDescription>This does not change their login email.</FormDescription><FormMessage /></FormItem>)} />
                             </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Location & Contact</h2>
                            <div className="space-y-6">
                                <FormField control={form.control} name="showLocation" render={({ field }) => (<FormItem><FormLabel>Show Full Address Publicly</FormLabel><Select onValueChange={(value) => field.onChange(value === 'true')} value={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="true">Yes, show full address</SelectItem><SelectItem value="false">No, hide full address</SelectItem></SelectContent></Select><FormDescription>Controls if the street address is visible on the public profile.</FormDescription><FormMessage /></FormItem>)} />
                                <FormItem><FormLabel>Find Address</FormLabel><FormControl><Input ref={locationInputRef} placeholder="Start typing an address..."/></FormControl></FormItem>
                                <div className="grid md:grid-cols-2 gap-6">
                                   <FormField control={form.control} name="streetAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                   <FormField control={form.control} name="suburb" render={({ field }) => (<FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="province" render={({ field }) => (<FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div ref={mapContainerRef} className="h-96 w-full rounded-md border shadow-sm bg-muted" />
                                <FormField control={form.control} name="phone" render={() => (<FormItem><FormLabel>Contact Phone</FormLabel><div className="flex items-center gap-2"><Select value={selectedCountryCode} onValueChange={setSelectedCountryCode}><SelectTrigger className="w-[120px] shrink-0"><SelectValue/></SelectTrigger><SelectContent>{countryCodes.map(cc => (<SelectItem key={cc.value} value={cc.value}><div className="flex items-center gap-2"><span>{cc.flag}</span><span>{cc.code}</span></div></SelectItem>))}</SelectContent></Select><Input type="tel" placeholder="e.g. 821234567" value={nationalPhoneNumber} onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))} /></div><FormMessage /></FormItem>)} />
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
                                <FormField control={form.control} name="shippingMethods" render={({ field }) => (<FormItem><FormLabel>Shipping Methods</FormLabel><div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border p-4"><FormMessage />{allShippingMethods.map((method) => (<FormItem key={method.id} className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(method.id)} onCheckedChange={(checked) => { const currentMethods = field.value || []; return checked ? field.onChange([...currentMethods, method.id]) : field.onChange(currentMethods.filter((value) => value !== method.id)); }} /></FormControl><FormLabel className="font-normal">{method.label}</FormLabel></FormItem>))}</div></FormItem>)} />
                                <FormField control={form.control} name="deliveryRadius" render={({ field }) => (<FormItem><FormLabel>Same-day Delivery Radius</FormLabel><Select onValueChange={field.onChange} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder="Select a radius..." /></SelectTrigger></FormControl><SelectContent>{deliveryRadiusOptions.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Public Bio / Message</FormLabel><FormControl><Textarea placeholder="A short bio..." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </section>

                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
    );
}
