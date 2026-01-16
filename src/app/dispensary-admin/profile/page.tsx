'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Store as StoreIcon, MapPin, Search, Shield, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { functions } from '@/lib/firebase';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { ownerEditDispensarySchema, type OwnerEditDispensaryFormData } from '@/lib/schemas';
import type { Dispensary, PUDOLocker } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Loader } from '@googlemaps/js-api-loader';
import countryDialCodes from '@/../docs/country-dial-codes.json';
import { ImageUpload } from '@/components/ui/image-upload';


const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const currencyOptions = [
  { value: "ZAR", label: "🇿🇦 ZAR (South African Rand)" }, { value: "USD", label: "💵 USD (US Dollar)" },
  { value: "EUR", label: "💶 EUR (Euro)" }, { value: "GBP", label: "💷 GBP (British Pound)" },
];

const deliveryRadiusOptions = [
  { value: "none", label: "No same-day delivery" }, 
  { value: "5", label: "5 km" },
  { value: "10", label: "10 km" }, 
  { value: "15", label: "15 km" },
  { value: "20", label: "20 km" }, 
  { value: "25", label: "25 km" },
  { value: "30", label: "30 km" },
  { value: "40", label: "40 km" },
  { value: "50", label: "50 km" },
  { value: "60", label: "60 km" },
  { value: "70", label: "70 km" },
  { value: "80", label: "80 km" },
  { value: "90", label: "90 km" },
  { value: "100", label: "100 km" },
];


interface Country {
    name: string;
    iso: string;
    flag: string;
    dialCode: string;
}

const allShippingMethods = [
  { id: "dtd", label: "DTD - Door to Door (The Courier Guy)" },
  { id: "dtl", label: "DTL - Door to Locker (Pudo)" },
  { id: "ltd", label: "LTD - Locker to Door (Pudo)" },
  { id: "ltl", label: "LTL - Locker to Locker (Pudo)" },
  { id: "collection", label: "Collection from store" },
  { id: "in_house", label: "In-house delivery service" },
];

const getPudoLockers = httpsCallable(functions, 'getPudoLockers');
const updateDispensaryProfile = httpsCallable(functions, 'updateDispensaryProfile');


export default function WellnessOwnerProfilePage() {
    const { currentUser, currentDispensary, loading: authLoading, isDispensaryOwner } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

    useEffect(() => {
        if (!authLoading && !currentDispensary) {
            toast({ title: "Not Found", description: "Your dispensary profile could not be found.", variant: "destructive" });
            router.push('/dispensary-admin/dashboard');
            return;
        }
        
        // ONLY DISPENSARY OWNERS CAN EDIT DISPENSARY PROFILE
        if (!authLoading && !isDispensaryOwner) {
            toast({ 
                title: "Access Denied", 
                description: "Only dispensary owners can edit the dispensary profile. Staff can only edit their personal profile.", 
                variant: "destructive" 
            });
            router.push('/dispensary-admin/dashboard');
            return;
        }
        
        if (!authLoading && currentDispensary) {
            setIsLoading(false);
            
            // Check for first login parameter
            const params = new URLSearchParams(window.location.search);
            if (params.get('firstLogin') === 'true') {
                setShowWelcomeDialog(true);
                // Clean up URL
                router.replace('/dispensary-admin/profile');
            }
        }
    }, [currentDispensary, authLoading, isDispensaryOwner, router, toast]);

    if (isLoading || !currentDispensary) {
        return (
            <div className="max-w-4xl mx-auto my-8 p-6 space-y-8">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-10 w-2/3" />
                <div className="space-y-4 pt-6">
                    <Skeleton className="h-96 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-1/2" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        );
    }

    return <EditProfileForm dispensary={currentDispensary} user={currentUser} showWelcome={showWelcomeDialog} onCloseWelcome={() => setShowWelcomeDialog(false)} />;
}

function EditProfileForm({ dispensary, user, showWelcome, onCloseWelcome }: { dispensary: Dispensary, user: any, showWelcome: boolean, onCloseWelcome: () => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const locationInputRef = useRef<HTMLInputElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInitialized = useRef(false);

    const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countryDialCodes.find(c => c.iso === 'ZA'));
    
    const [isLockerModalOpen, setIsLockerModalOpen] = useState(false);
    const [pudoLockers, setPudoLockers] = useState<PUDOLocker[]>([]);
    const [isFetchingLockers, setIsFetchingLockers] = useState(false);
    const [lockerSearchTerm, setLockerSearchTerm] = useState('');
    const [lockerError, setLockerError] = useState<string | null>(null);

    const form = useForm<OwnerEditDispensaryFormData>({
        resolver: zodResolver(ownerEditDispensarySchema),
        mode: "onChange",
        defaultValues: {
            dispensaryName: dispensary.dispensaryName || '',
            phone: dispensary.phone || '',
            currency: dispensary.currency || 'ZAR',
            streetAddress: dispensary.streetAddress || '',
            suburb: dispensary.suburb || '',
            city: dispensary.city || '',
            province: dispensary.province || '',
            postalCode: dispensary.postalCode || '',
            country: dispensary.country || '',
            latitude: dispensary.latitude === null ? undefined : dispensary.latitude,
            longitude: dispensary.longitude === null ? undefined : dispensary.longitude,
            showLocation: dispensary.showLocation ?? true,
            openTime: dispensary.openTime || '',
            closeTime: dispensary.closeTime || '',
            operatingDays: dispensary.operatingDays || [],
            shippingMethods: dispensary.shippingMethods || [],
            deliveryRadius: dispensary.deliveryRadius || 'none',
            inHouseDeliveryPrice: dispensary.inHouseDeliveryPrice || null,
            pricePerKm: dispensary.pricePerKm || null,
            sameDayDeliveryCutoff: dispensary.sameDayDeliveryCutoff || '',
            message: dispensary.message || '',
            originLocker: dispensary.originLocker || null,
            storeImage: dispensary.storeImage || null,
            storeIcon: dispensary.storeIcon || null,
        },
    });

    const watchedShippingMethods = useWatch({ control: form.control, name: 'shippingMethods' });
    const watchedOriginLocker = useWatch({ control: form.control, name: 'originLocker' });
    const watchedLatitude = useWatch({ control: form.control, name: 'latitude' });
    const watchedLongitude = useWatch({ control: form.control, name: 'longitude' });

    const locationIsSet = useMemo(() => watchedLatitude !== undefined && watchedLongitude !== undefined, [watchedLatitude, watchedLongitude]);

    const needsOriginLocker = useMemo(() => 
        watchedShippingMethods?.includes('ltl') || watchedShippingMethods?.includes('ltd'), 
        [watchedShippingMethods]
    );

    useEffect(() => {
        if (dispensary.phone) {
            const sortedCountries = [...countryDialCodes].sort((a, b) => b.dialCode.length - a.dialCode.length);
            const phoneStr = dispensary.phone.startsWith('+') ? dispensary.phone : `+${dispensary.phone}`;
            
            const matchedCountry = sortedCountries.find(c => phoneStr.startsWith(c.dialCode));

            if (matchedCountry) {
                setSelectedCountry(matchedCountry);
                setNationalPhoneNumber(phoneStr.substring(matchedCountry.dialCode.length));
            } else {
                 setNationalPhoneNumber(phoneStr.replace(/\D/g, ''));
            }
        }
    }, [dispensary.phone]);

    useEffect(() => {
        if (selectedCountry) {
            const combinedPhoneNumber = `${selectedCountry.dialCode}${nationalPhoneNumber}`.replace(/\D/g, '');
            form.setValue('phone', combinedPhoneNumber, { shouldValidate: true, shouldDirty: false });
        }
    }, [selectedCountry, nationalPhoneNumber, form]);

    useEffect(() => {
        if (!needsOriginLocker) {
          form.setValue('originLocker', null, { shouldDirty: true });
        }
    }, [needsOriginLocker, form]);

    const initializeMap = useCallback(() => {
        if (mapInitialized.current || !mapContainerRef.current) return;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            toast({ title: "Map Error", description: "Google Maps API key not configured.", variant: "destructive" });
            return;
        }
        mapInitialized.current = true;

        const loader = new Loader({ apiKey, version: 'weekly', libraries: ['places', 'geocoding'] });

        loader.load().then(google => {
            const initialLatLng = {
                lat: form.getValues('latitude') || -29.8587,
                lng: form.getValues('longitude') || 31.0218
            };

            const map = new google.maps.Map(mapContainerRef.current!, { center: initialLatLng, zoom: 12, mapId: 'b39f3f8b7139051d' });
            const marker = new google.maps.Marker({ position: initialLatLng, map, draggable: true });
            const geocoder = new google.maps.Geocoder();

            const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], type: string, useShortName = false): string =>
                components.find(c => c.types.includes(type))?.[useShortName ? 'short_name' : 'long_name'] || '';

            const setAddressFields = (place: google.maps.places.PlaceResult | google.maps.GeocoderResult) => {
                const components = place.address_components;
                if (!components) return;
                
                const streetNumber = getAddressComponent(components, 'street_number');
                const route = getAddressComponent(components, 'route');
                
                form.setValue('streetAddress', `${streetNumber} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
                form.setValue('suburb', getAddressComponent(components, 'locality'), { shouldValidate: true, shouldDirty: true });
                form.setValue('city', getAddressComponent(components, 'administrative_area_level_2') || getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
                form.setValue('province', getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
                form.setValue('postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
                form.setValue('country', getAddressComponent(components, 'country'), { shouldValidate: true, shouldDirty: true });
                
                if (locationInputRef.current) {
                    locationInputRef.current.value = place.formatted_address || '';
                }

                // --- NEW, CORRECT LOGIC ---
                const countryShortName = getAddressComponent(components, 'country', true);
                const matchedCountry = countryDialCodes.find(c => c.iso.toLowerCase() === countryShortName.toLowerCase());
                
                if (matchedCountry) {
                    // 1. Set the country from the map result. This is the source of truth.
                    setSelectedCountry(matchedCountry);

                    // 2. Now, parse the original phone number using this country context.
                    if (dispensary.phone) {
                        const phoneStr = dispensary.phone.startsWith('+') ? dispensary.phone : `+${dispensary.phone}`;
                        
                        if (phoneStr.startsWith(matchedCountry.dialCode)) {
                            // If the stored number matches the country, strip the code.
                            setNationalPhoneNumber(phoneStr.substring(matchedCountry.dialCode.length));
                        } else {
                            // If it doesn't match, the safest fallback is to just show the digits
                            // from the original number, allowing the user to correct it within the
                            // context of the now-correct dial code.
                            setNationalPhoneNumber(phoneStr.replace(/\D/g, ''));
                        }
                    }
                }
                // --- END OF NEW LOGIC ---
            };

            if (locationInputRef.current) {
                const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, { fields: ["address_components", "formatted_address", "geometry.location"], types: ["address"] });
                autocomplete.addListener("place_changed", () => {
                    const place = autocomplete.getPlace();
                    if (place.geometry?.location) {
                        const loc = place.geometry.location;
                        marker.setPosition(loc); map.setCenter(loc); map.setZoom(17);
                        form.setValue('latitude', loc.lat(), { shouldValidate: true, shouldDirty: true });
                        form.setValue('longitude', loc.lng(), { shouldValidate: true, shouldDirty: true });
                        setAddressFields(place);
                    }
                });
            }
            
            // Initial geocode on load
            geocoder.geocode({ location: initialLatLng }, (results, status) => {
                if (status === 'OK' && results?.[0]) {
                    setAddressFields(results[0]);
                }
            });

            const handleMapInteraction = (pos: google.maps.LatLng) => {
                marker.setPosition(pos); map.panTo(pos);
                form.setValue('latitude', pos.lat(), { shouldValidate: true, shouldDirty: true });
                form.setValue('longitude', pos.lng(), { shouldValidate: true, shouldDirty: true });
                geocoder.geocode({ location: pos }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        setAddressFields(results[0]);
                    }
                });
            };

            map.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));
            marker.addListener('dragend', () => marker.getPosition() && handleMapInteraction(marker.getPosition()!));

        }).catch(e => {
            console.error("Google Maps Error:", e);
            toast({ title: "Map Error", description: "Could not load Google Maps.", variant: "destructive" });
        });
    }, [form, toast, dispensary.phone]);         

    useEffect(() => {
        if (typeof window !== 'undefined' && !mapInitialized.current) {
            initializeMap();
        }
    }, [initializeMap]);

    async function onSubmit(data: OwnerEditDispensaryFormData) {
        setIsSubmitting(true);
        
        // 1. Create a clean data object with only the fields allowed by the backend.
        const submissionData: Partial<OwnerEditDispensaryFormData> = {
            dispensaryName: data.dispensaryName,
            phone: data.phone,
            currency: data.currency,
            streetAddress: data.streetAddress,
            suburb: data.suburb,
            city: data.city,
            province: data.province,
            postalCode: data.postalCode,
            country: data.country,
            latitude: data.latitude,
            longitude: data.longitude,
            showLocation: data.showLocation,
            openTime: data.openTime,
            closeTime: data.closeTime,
            operatingDays: data.operatingDays,
            shippingMethods: data.shippingMethods,
            deliveryRadius: data.deliveryRadius,
            inHouseDeliveryPrice: data.inHouseDeliveryPrice,
            pricePerKm: data.pricePerKm,
            sameDayDeliveryCutoff: data.sameDayDeliveryCutoff,
            message: data.message,
            storeImage: data.storeImage,
            storeIcon: data.storeIcon,
        };

        // 2. Handle the 'originLocker' object - preserve complete PUDO structure for shipping compatibility.
        // The PUDO API returns rich locker data (location, city, province, status, etc.) that shipping needs.
        if (data.originLocker && data.originLocker.id) {
            // Keep all fields including distanceKm for consistency
            submissionData.originLocker = data.originLocker;
            console.log("Complete originLocker structure being sent:", submissionData.originLocker);
        } else {
            submissionData.originLocker = null;
        }
        
        console.log("Complete submissionData being sent to Firebase:", submissionData);
        
        try {
            // 3. Send the complete, validated data to the backend function.
            // Note: dispensaryId is obtained from auth token on backend, not from request data
            await updateDispensaryProfile(submissionData);
            toast({
                title: "Profile Updated",
                description: "Your dispensary profile has been successfully updated.",
            });
            router.push('/dispensary-admin/dashboard');
        } catch (error) {
            console.error("Profile update error:", error);
            const message = error instanceof FunctionsError 
                ? error.message 
                : "An unexpected error occurred. Please try again.";
            toast({
                title: "Update Failed",
                description: message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const fetchLockers = async () => {
        const lat = form.getValues('latitude');
        const lng = form.getValues('longitude');

        if (lat === undefined || lng === undefined) {
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
            locker && locker.id && (
                locker.name.toLowerCase().includes(lockerSearchTerm.toLowerCase()) ||
                (locker.address && locker.address.toLowerCase().includes(lockerSearchTerm.toLowerCase()))
            )
    ), [pudoLockers, lockerSearchTerm]);

    return (
        <>
            <Card className="max-w-4xl mx-auto my-8 shadow-xl">
                <CardHeader className="bg-muted/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-3xl flex items-center text-foreground"><StoreIcon className="mr-3 h-8 w-8 text-green-800" /> Edit Dispensary Profile</CardTitle>
                        <Button variant="outline" size="sm" asChild><Link href="/dispensary-admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link></Button>
                    </div>
                    <CardDescription>Update your dispensary details. These changes will be reflected on the public website.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                            
                            <section>
                                <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Owner Account Settings</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <FormItem>
                                        <FormLabel>Full Name</FormLabel>
                                        <Input value={user?.displayName || ''} readOnly disabled />
                                        <FormDescription className="text-xs">Contact support to change your name</FormDescription>
                                    </FormItem>
                                    <FormItem>
                                        <FormLabel>Email Address (Read-only)</FormLabel>
                                        <Input value={user?.email || ''} readOnly disabled />
                                        <FormDescription className="text-xs">Email cannot be changed as it identifies your store</FormDescription>
                                    </FormItem>
                                </div>
                                <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-[#006B3E]" />
                                        Change Password
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        To change your password, please use the <strong>Forgot Password</strong> link on the login page.
                                        You'll receive a password reset email.
                                    </p>
                                </div>
                            </section>
                            
                            <section>
                                <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Store Information</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="dispensaryName" render={({ field }) => ( <FormItem><FormLabel>Dispensary Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="phone" render={() => (
                                        <FormItem>
                                            <FormLabel>Contact Phone Number</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <div className="w-[80px] shrink-0 border rounded-md h-10 flex items-center justify-center bg-muted">
                                                    {selectedCountry && <span className='text-sm'>{selectedCountry.flag} {selectedCountry.dialCode}</span>}
                                                </div>
                                                <Input
                                                    type="tel"
                                                    placeholder="National number"
                                                    value={nationalPhoneNumber}
                                                    onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                                />
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="currency" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Operating Currency</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a currency" /></SelectTrigger></FormControl>
                                                <SelectContent>{currencyOptions.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
                                            </Select>
                                            <FormDescription>The currency for your products and services.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground flex items-center gap-2">
                                    <ImageIcon className="h-6 w-6 text-green-800" />
                                    Store Branding
                                </h2>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Upload your store logo and icon for branding across the platform, social sharing, and PWA installation.
                                </p>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <FormField
                                        control={form.control}
                                        name="storeImage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <ImageUpload
                                                        label="Store Logo / Image"
                                                        description="Main logo displayed in store cards and header"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        storagePath={`dispensaries/${dispensary.id}/branding`}
                                                        maxSizeMB={5}
                                                        aspectRatio="16:9"
                                                        disabled={isSubmitting}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="storeIcon"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <ImageUpload
                                                        label="Store Icon"
                                                        description="Icon for PWA installation and social sharing"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        storagePath={`dispensaries/${dispensary.id}/branding`}
                                                        maxSizeMB={2}
                                                        maxDimensions={{ width: 512, height: 512 }}
                                                        aspectRatio="1:1"
                                                        disabled={isSubmitting}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Location Details</h2>
                                <div className="space-y-6">
                                    <FormField control={form.control} name="showLocation" render={({ field }) => (<FormItem><FormLabel>Show Full Address Publicly</FormLabel><Select onValueChange={(value) => field.onChange(value === 'true')} value={String(field.value)}><FormControl><SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="true">Yes, show full address</SelectItem><SelectItem value="false">No, hide full address</SelectItem></SelectContent></Select><FormDescription>Controls if the street address is visible on the public profile.</FormDescription><FormMessage /></FormItem>)} />
                                    <FormItem><FormLabel>Find Address</FormLabel><FormControl><Input ref={locationInputRef} placeholder="Start typing an address to search..." /></FormControl></FormItem>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="streetAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="suburb" render={({ field }) => (<FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="province" render={({ field }) => (<FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    <div ref={mapContainerRef} className="h-96 w-full rounded-md border shadow-sm bg-muted" />
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold border-b pb-2 mb-6 text-foreground">Operations & Services</h2>
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="openTime" render={({ field }) => (<FormItem><FormLabel>Opening Time</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="closeTime" render={({ field }) => (<FormItem><FormLabel>Closing Time</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <FormField control={form.control} name="operatingDays" render={({ field }) => (<FormItem><FormLabel>Operating Days</FormLabel><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 rounded-lg border p-4">{weekDays.map((day) => (<FormItem key={day} className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(day)} onCheckedChange={(checked) => {const currentDays = field.value || []; return checked ? field.onChange([...currentDays, day]) : field.onChange(currentDays.filter((value) => value !== day));}} /></FormControl><FormLabel className="font-normal text-sm">{day}</FormLabel></FormItem>))}</div><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="shippingMethods" render={({ field }) => (<FormItem><FormLabel>Shipping Methods Offered</FormLabel><FormDescription>Select all shipping methods your store supports.</FormDescription><div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border p-4">{allShippingMethods.map((method) => (<FormItem key={method.id} className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(method.id)} onCheckedChange={(checked) => { const currentMethods = field.value || []; return checked ? field.onChange([...currentMethods, method.id]) : field.onChange(currentMethods.filter((value) => value !== method.id)); }} /></FormControl><FormLabel className="font-normal">{method.label}</FormLabel></FormItem>))}</div><FormMessage /></FormItem>)} />

                                    <FormItem>
                                        <FormLabel>Origin Locker for LTL/LTD Shipping {needsOriginLocker && <span className="text-destructive ml-1">*</span>}</FormLabel>
                                        <FormDescription>
                                            {needsOriginLocker 
                                                ? "An origin locker is required for Locker to Locker (LTL) or Locker to Door (LTD) shipping methods."
                                                : "Setting up an origin locker now gives you flexibility to enable LTL/LTD shipping methods later without extra setup."}
                                        </FormDescription>
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
                                                        <p className="text-muted-foreground mb-2">{locationIsSet ? "Select a locker near your location" : "Please set a location on the map first."}</p>
                                                        <Button onClick={handleOpenLockerModal} type="button" disabled={!locationIsSet}>Select Origin Locker</Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                        <FormMessage />
                                    </FormItem>

                                    <FormField 
                                      control={form.control} 
                                      name="deliveryRadius" 
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>
                                            Same-day Delivery Radius
                                            {watchedShippingMethods?.includes('in_house') && (
                                              <span className="text-destructive ml-1">*</span>
                                            )}
                                          </FormLabel>
                                          <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                            <FormControl>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select a delivery radius" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {deliveryRadiusOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormDescription>
                                            {watchedShippingMethods?.includes('in_house') 
                                              ? 'Required when in-house delivery service is selected.'
                                              : 'Requires an in-house delivery fleet.'}
                                          </FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )} 
                                    />
                                    
                                    {/* In-House Delivery Settings */}
                                    {watchedShippingMethods?.includes('in_house') && (
                                      <>
                                        <FormField
                                          control={form.control}
                                          name="inHouseDeliveryPrice"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>In-House Delivery Fee</FormLabel>
                                              <FormControl>
                                                <div className="relative">
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                                                  <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="pl-7"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                  />
                                                </div>
                                              </FormControl>
                                              <FormDescription>
                                                Cost charged to customers for in-house delivery. <strong>Leave blank if using Per km pricing.</strong>
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name="minimumOrderAmount"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Minimum Order Amount</FormLabel>
                                              <FormControl>
                                                <div className="relative">
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                                                  <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="pl-7"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                  />
                                                </div>
                                              </FormControl>
                                              <FormDescription>
                                                Minimum order value required for in-house delivery. Leave blank for no minimum.
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name="pricePerKm"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Price per Kilometer {watchedShippingMethods?.includes('in_house') && <span className="text-destructive">*</span>}</FormLabel>
                                              <FormControl>
                                                <div className="relative">
                                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                                                  <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="0.00"
                                                    className="pl-7"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                                                  />
                                                </div>
                                              </FormControl>
                                              <FormDescription>
                                                Cost per kilometer for in-house delivery. Required when in-house delivery is enabled.
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />

                                        <FormField
                                          control={form.control}
                                          name="sameDayDeliveryCutoff"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Same-Day Delivery Cutoff Time</FormLabel>
                                              <FormControl>
                                                <Input
                                                  type="time"
                                                  {...field}
                                                  value={field.value || ''}
                                                />
                                              </FormControl>
                                              <FormDescription>
                                                Orders placed before this time qualify for same-day delivery (e.g., 14:00 for 2 PM cutoff).
                                              </FormDescription>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                      </>
                                    )}
                                    
                                    <FormField control={form.control} name="message" render={({ field }) => (<FormItem><FormLabel>Public Bio / Message</FormLabel><FormControl><Textarea placeholder="Tell customers a little bit about your store..." className="resize-vertical" {...field} value={field.value ?? ''} /></FormControl><FormDescription>This is optional and will be displayed on your public store page.</FormDescription><FormMessage /></FormItem>)} />
                                </div>
                                </section>
                                <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || (form.formState.isSubmitted && !form.formState.isValid)}>
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />} Save Changes
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Dialog open={isLockerModalOpen} onOpenChange={setIsLockerModalOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                    <DialogTitle>Select an Origin Locker</DialogTitle>
                        <DialogDescription>Search for Pudo lockers within a 100km radius of your set location. This will be the default collection point for locker-based shipments.</DialogDescription>
                    </DialogHeader>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted foreground" />
                        <Input placeholder={`Search lockers in a 100km radius...`} value={lockerSearchTerm} onChange={(e) => setLockerSearchTerm(e.target.value)} className="pl-10" disabled={isFetchingLockers}/>
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
                                        <p className="font-semibold">{locker.name} ({locker.distanceKm?.toFixed(2)} km)</p>
                                        <p className="text-sm text-muted-foreground">{locker.address}</p>
                                    </div>
                                </Button>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No lockers found. Please refine your search term or check your map location.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsLockerModalOpen(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Welcome Dialog for First-Time Users */}
            <Dialog open={showWelcome} onOpenChange={onCloseWelcome}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl text-[#3D2E17] font-bold flex items-center gap-2">
                            <StoreIcon className="h-8 w-8 text-[#006B3E]" />
                            Welcome to Your Dispensary Dashboard! 🎉
                        </DialogTitle>
                        <DialogDescription className="text-base text-[#3D2E17] font-semibold pt-4">
                            Your store has been successfully activated and you're now logged in!
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-[#006B3E]/10 border-l-4 border-[#006B3E] p-4 rounded-r-lg">
                            <h3 className="font-bold text-[#3D2E17] text-lg mb-2">📍 Complete Your Profile</h3>
                            <p className="text-[#3D2E17] font-semibold text-sm">
                                You're currently on your <strong>Profile Page</strong>. Please take a moment to review and update your store details.
                            </p>
                        </div>

                        <div className="bg-[#006B3E]/10 border-l-4 border-[#006B3E] p-4 rounded-r-lg">
                            <h3 className="font-bold text-[#3D2E17] text-lg mb-2">🚚 Important: Origin Locker Setup</h3>
                            <p className="text-[#3D2E17] font-semibold text-sm mb-2">
                                Even if you don't offer LTD (Locker to Door) or LTL (Locker to Locker) shipping right now, we <strong>strongly recommend</strong> setting up an <strong>Origin Locker</strong>.
                            </p>
                            <ul className="list-disc list-inside text-[#3D2E17] font-semibold text-sm space-y-1 ml-2">
                                <li>It gives you flexibility to enable these shipping methods later</li>
                                <li>Customers often prefer locker-based shipping for convenience</li>
                                <li>Setting it up now saves time when you're ready to offer more options</li>
                            </ul>
                        </div>

                        <div className="bg-[#3D2E17]/10 border-l-4 border-[#3D2E17] p-4 rounded-r-lg">
                            <h3 className="font-bold text-[#3D2E17] text-lg mb-2">💡 How to Set Your Origin Locker</h3>
                            <ol className="list-decimal list-inside text-[#3D2E17] font-semibold text-sm space-y-1 ml-2">
                                <li>Scroll down to <strong>Operations & Services</strong></li>
                                <li>Under <strong>Shipping Methods</strong>, select "LTD" or "LTL"</li>
                                <li>Click <strong>"Select Origin Locker"</strong> to choose a Pudo locker near you</li>
                                <li>Save your changes</li>
                            </ol>
                            <p className="text-[#3D2E17] font-semibold text-xs mt-2 italic">
                                💡 Tip: You can uncheck LTD/LTL later if you don't want to offer them yet, but keeping the origin locker saved is smart planning!
                            </p>
                        </div>

                        <div className="bg-green-100 border-l-4 border-green-600 p-4 rounded-r-lg">
                            <p className="text-[#3D2E17] font-bold text-sm">
                                ✅ Once you've reviewed your profile, head to <strong>Dashboard</strong> to start adding products and managing your store!
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={onCloseWelcome} className="bg-[#006B3E] hover:bg-[#3D2E17] text-white font-bold">
                            Got It, Let's Get Started!
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}



