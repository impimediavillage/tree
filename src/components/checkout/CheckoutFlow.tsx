'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/contexts/CartContext';
import { auth, db, functions } from '@/lib/firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { CartItem, Dispensary } from '@/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader } from '@googlemaps/js-api-loader';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { PaymentStep } from './PaymentStep';

// --- SCHEMAS AND TYPES ---
const addressSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().min(10, 'A valid phone number is required'),
  shippingAddress: z.object({
    streetAddress: z.string().min(5, 'A valid street address is required.'),
    suburb: z.string().min(2, 'A valid suburb is required.'),
    city: z.string().min(2, 'A valid city is required.'),
    province: z.string().min(2, 'A valid province is required.'),
    postalCode: z.string().min(4, 'A valid postal code is required.'),
    country: z.string().min(2, 'A valid country is required.'),
    latitude: z.number().refine(val => val !== 0, "Please select an address from the map."),
    longitude: z.number().refine(val => val !== 0, "Please select an address from the map."),
  }),
});

type AddressValues = z.infer<typeof addressSchema>;
interface ShippingRate { id: number; name: string; rate: number; service_level: string; delivery_time: string; courier_name: string; }

const allShippingMethodsMap: { [key: string]: string } = {
  "dtd": "Door-to-Door Courier (The Courier Guy)",
  "dtl": "Door-to-Locker (Pudo)",
  "ltd": "Locker-to-Door (Pudo)",
  "ltl": "Locker-to-Locker (Pudo)",
  "collection": "Collection from Store",
  "in_house": "In-house Delivery Service",
};

// --- CHILD COMPONENTS ---

const AddressStep = ({ form, onContinue, isSubmitting }: { form: any; onContinue: (values: AddressValues) => Promise<void>; isSubmitting: boolean }) => {
    const locationInputRef = useRef<HTMLInputElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInitialized = useRef(false);
    const { toast } = useToast();

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

                const streetNumber = getAddressComponent(components, 'street_number');
                const route = getAddressComponent(components, 'route');
                
                form.setValue('shippingAddress.streetAddress', `${streetNumber} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.suburb', getAddressComponent(components, 'locality'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.city', getAddressComponent(components, 'administrative_area_level_2'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.province', getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.country', getAddressComponent(components, 'country'), { shouldValidate: true, shouldDirty: true });
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
                    form.setValue('shippingAddress.latitude', loc.lat(), { shouldValidate: true });
                    form.setValue('shippingAddress.longitude', loc.lng(), { shouldValidate: true });
                    setAddressFields(place);
                }
            });

            const geocoder = new google.maps.Geocoder();
            const handleMapInteraction = (latLng: google.maps.LatLng) => {
                 markerInstance.setPosition(latLng);
                 mapInstance.panTo(latLng);
                 form.setValue('shippingAddress.latitude', latLng.lat(), { shouldValidate: true, shouldDirty: true });
                 form.setValue('shippingAddress.longitude', latLng.lng(), { shouldValidate: true, shouldDirty: true });
                 geocoder.geocode({ location: latLng }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        if(locationInputRef.current) locationInputRef.current.value = results[0].formatted_address || '';
                        setAddressFields(results[0]);
                    }
                });
            }
            markerInstance.addListener('dragend', () => handleMapInteraction(markerInstance.getPosition()!));
            mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));

        } catch (err) {
            console.error('Google Maps API Error:', err);
            toast({ title: 'Map Error', description: 'Could not load Google Maps.', variant: 'destructive' });
        }
    }, [form, toast]);

    useEffect(() => {
        if (mapContainerRef.current && !mapInitialized.current) {
            initializeMap();
        }
    }, [initializeMap]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onContinue)} className="space-y-6">
                <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="you@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="082 123 4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <h3 className="text-lg font-semibold border-b pb-2 pt-4">Shipping Location</h3>
                <FormItem>
                    <FormLabel>Location Search</FormLabel>
                    <FormControl><Input ref={locationInputRef} placeholder="Start typing an address to search..." /></FormControl>
                    <FormDescription>Select an address to auto-fill the fields below. You can also click the map or drag the pin.</FormDescription>
                </FormItem>

                <div ref={mapContainerRef} className="h-[250px] w-full rounded-md border bg-muted" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="shippingAddress.streetAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.suburb" render={({ field }) => (<FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.province" render={({ field }) => (<FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} readOnly placeholder="Auto-filled from map" /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full pt-6">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue to Delivery Option 
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </form>
        </FormProvider>
    );
};


const ShippingTierStep = ({ shippingMethods, onSelectTier, onBack }: { shippingMethods: string[]; onSelectTier: (tier: string) => void; onBack: () => void; }) => {
    if (!shippingMethods || shippingMethods.length === 0) {
        return (
             <div className="space-y-6 text-center">
                <h3 className="text-lg font-semibold">No Delivery Options Available</h3>
                <p className="text-muted-foreground">This dispensary has not configured any shipping or collection methods.</p>
                <Button variant="outline" onClick={onBack} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">How would you like to receive your order?</h3>
            <RadioGroup onValueChange={onSelectTier} className="space-y-3">
                {shippingMethods.map(tier => (
                    <Label key={tier} className="flex items-center space-x-3 border rounded-md p-4 hover:bg-accent has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary transition-all cursor-pointer">
                        <RadioGroupItem value={tier} id={tier} />
                        <span>{allShippingMethodsMap[tier] || tier}</span>
                    </Label>
                ))}
            </RadioGroup>
            <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
        </div>
    );
};

const ShippingMethodStep = ({ rates, isLoading, error, onBack, onContinue, selectedRate, onSelectRate }: { rates: ShippingRate[]; isLoading: boolean; error: string | null; onBack: () => void; onContinue: () => void; selectedRate: ShippingRate | null; onSelectRate: (rate: ShippingRate) => void; }) => {
    if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Fetching live shipping rates...</p></div>;
    if (error) return <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md"><h4>Error Fetching Rates</h4><p>{error}</p><Button variant="outline" onClick={onBack} className="mt-4">Try Again</Button></div>;
    if (rates.length === 0) return <div className="text-center text-muted-foreground p-8"><p>No shipping methods available for this address.</p><Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button></div>;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onContinue(); }} className="space-y-6">
            <RadioGroup value={selectedRate?.id?.toString() || ''} onValueChange={(rateId) => { const rate = rates.find(r => r.id.toString() === rateId); if (rate) onSelectRate(rate); }} name="shippingMethod" className="space-y-3">
                {rates.map(rate => (<Label key={rate.id} className="flex justify-between items-center border rounded-md p-4 has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary"><p className="font-semibold">{rate.courier_name} ({rate.name})</p><p className="font-bold">R{rate.rate.toFixed(2)}</p><RadioGroupItem value={rate.id.toString()} id={rate.id.toString()} className="sr-only" /></Label>))}
            </RadioGroup>
            <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button type="submit" disabled={!selectedRate}>Continue to Payment <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
        </form>
    );
};


// --- MAIN CHECKOUT FLOW COMPONENT ---

export function CheckoutFlow() {
    const { cartItems, loading: cartLoading, getCartTotal } = useCart();
    const { firebaseUser, currentUser } = useAuth();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    
    const [dispensary, setDispensary] = useState<Dispensary | null>(null);
    const [addressData, setAddressData] = useState<AddressValues | null>(null);
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isDispensaryLoading, setIsDispensaryLoading] = useState(true);

    const form = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            fullName: '', 
            email: '', 
            phoneNumber: '', 
            shippingAddress: { 
                streetAddress: '', 
                suburb: '', 
                city: '', 
                province: '',
                postalCode: '', 
                country: '',
                latitude: 0, 
                longitude: 0 
            } 
        },
        mode: 'onChange'
    });

    useEffect(() => {
        if (!cartLoading) {
            if(cartItems.length > 0) {
                const id = cartItems[0].dispensaryId;
                if (id) {
                    setIsDispensaryLoading(true);
                    getDoc(doc(db, 'dispensaries', id))
                        .then(docSnap => {
                            if (docSnap.exists()) {
                                setDispensary({ id: docSnap.id, ...docSnap.data() } as Dispensary);
                            } else {
                                setApiError('Dispensary not found.');
                            }
                        })
                        .catch(err => setApiError("Failed to load dispensary data."))
                        .finally(() => setIsDispensaryLoading(false));
                }
                else setApiError("Dispensary information is missing from your cart.");
            } else {
                 setIsDispensaryLoading(false);
            }
        }
    }, [cartItems, cartLoading]);

    const handleAddressContinue = async (values: AddressValues) => {
        setIsSubmitting(true);
        try {
            if (firebaseUser) {
                setAddressData(values);
                setStep(2);
                return;
            }

            const methods = await fetchSignInMethodsForEmail(auth, values.email);
            if (methods.length > 0) {
                toast({ title: "An account with this email already exists.", description: "Please log in to continue your purchase.", variant: "destructive", duration: 5000 });
                return;
            }

            toast({ title: "Creating your account...", description: "For your convenience, we're setting up an account for you to track your orders." });
            
            const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, randomPassword);
            const newUser = userCredential.user;

            if (newUser) {
                await setDoc(doc(db, "users", newUser.uid), { uid: newUser.uid, email: values.email, name: values.fullName, phoneNumber: values.phoneNumber, role: 'approved' });
            } else {
                throw new Error("Could not create user account.");
            }
            
            setAddressData(values);
            setStep(2);

        } catch (error: any) {
            console.error("Error during user creation/check:", error);
            toast({ title: "Authentication Error", description: error.message || "An unexpected error occurred. Please try again.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTierSelection = async (tier: string) => {
        setApiError(null);
        setSelectedRate(null);
        setShippingRates([]);

        const isCourierService = ['dtd', 'dtl', 'ltd', 'ltl'].includes(tier);

        if (isCourierService) {
            if (!addressData || !dispensary || !firebaseUser) {
                setApiError('You must be signed in and have a valid address to fetch shipping rates.');
                return;
            }

            setIsLoadingRates(true);
            try {
                const getShiplogicRates = httpsCallable(functions, 'getShiplogicRates');
                // Shiplogic expects province to be under the `zone` key
                const deliveryAddressForApi = {
                    street_address: addressData.shippingAddress.streetAddress,
                    local_area: addressData.shippingAddress.suburb,
                    city: addressData.shippingAddress.city,
                    zone: addressData.shippingAddress.province,
                    code: addressData.shippingAddress.postalCode,
                    country: addressData.shippingAddress.country,
                    lat: addressData.shippingAddress.latitude,
                    lng: addressData.shippingAddress.longitude,
                };

                const payload = {
                    cart: cartItems,
                    dispensaryId: dispensary.id,
                    deliveryAddress: deliveryAddressForApi,
                    customer: { name: addressData.fullName, email: currentUser?.email, phone: addressData.phoneNumber }
                };
                const result = await getShiplogicRates(payload);
                const data = result.data as { rates?: ShippingRate[], error?: string };

                if (data.error) throw new Error(data.error);

                if (data.rates && data.rates.length > 0) {
                    setShippingRates(data.rates);
                    setSelectedRate(data.rates[0]);
                } else {
                    setApiError("No courier rates could be found for the provided address.");
                }
            } catch (err: any) {
                console.error("Error calling getShiplogicRates:", err);
                setApiError(err.message || 'An unknown error occurred while fetching rates.');
            } finally {
                setIsLoadingRates(false);
            }
            setStep(3);
        } else if (tier === 'collection') {
            const collectionRate: ShippingRate = { id: 999, name: 'In-Store Collection', rate: 0, service_level: 'collection', delivery_time: 'N/A', courier_name: 'Collect at dispensary' };
            setSelectedRate(collectionRate);
            setStep(4);
        } else if (tier === 'in_house') {
            const inHouseRate: ShippingRate = { id: 998, name: 'Local Delivery', rate: 50.00, service_level: 'local', delivery_time: 'Same-day or next-day', courier_name: 'In-house delivery' };
            setSelectedRate(inHouseRate);
            setStep(4);
        } else {
            setApiError(`'${allShippingMethodsMap[tier] || tier}' is not currently supported.`);
        }
    };
    
    const handleShippingMethodContinue = () => {
        if (selectedRate) {
            setStep(4);
        } else {
            setApiError("Please select a shipping method to continue.");
        }
    };
    
    const isLoading = cartLoading || isDispensaryLoading;

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
        }
        if (apiError && step < 2) {
            return <div className="text-center p-8 text-destructive bg-destructive/10 rounded-lg"><h3>Something Went Wrong</h3><p>{apiError}</p></div>;
        }
        if (cartItems.length === 0 && !cartLoading) {
             return <div className="text-center p-8 text-muted-foreground"><h3>Your Cart is Empty</h3><p>Add some items to your cart to begin the checkout process.</p></div>;
        }

        return (
            <>
                <div style={{ display: step === 1 ? 'block' : 'none' }}>
                    <AddressStep form={form} onContinue={handleAddressContinue} isSubmitting={isSubmitting} />
                </div>
                <div style={{ display: step === 2 ? 'block' : 'none' }}>
                    <ShippingTierStep 
                        shippingMethods={dispensary?.shippingMethods || []}
                        onSelectTier={handleTierSelection} 
                        onBack={() => setStep(1)} 
                    />
                </div>
                <div style={{ display: step === 3 ? 'block' : 'none' }}>
                    <ShippingMethodStep 
                        rates={shippingRates} 
                        isLoading={isLoadingRates} 
                        error={apiError} 
                        onBack={() => { setApiError(null); setStep(2); }} 
                        onContinue={handleShippingMethodContinue}
                        selectedRate={selectedRate}
                        onSelectRate={setSelectedRate} />
                </div>
                <div style={{ display: step === 4 ? 'block' : 'none' }}>
                    {addressData && selectedRate && (
                        <PaymentStep
                            cart={cartItems}
                            shippingMethod={selectedRate}
                            shippingAddress={addressData.shippingAddress}
                            onBack={() => setStep(selectedRate.service_level === 'collection' || selectedRate.service_level === 'local' ? 2 : 3)} />
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            <div className="lg:col-span-2">
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardDescription>Step {step} of 4 - {step === 1 ? 'Shipping Details' : step === 2 ? 'Delivery Option' : step === 3 ? 'Finalize Delivery' : 'Payment'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderContent()}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card className="sticky top-24 bg-muted/30">
                    <CardHeader><p className='font-semibold text-lg'>Order Summary</p></CardHeader>
                    <CardContent>
                        {cartItems.length > 0 ? (
                            <div className="space-y-3">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                        <span>R{((item.price || 0) * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                                <hr className="my-2" />
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Subtotal</span><span>R{getCartTotal().toFixed(2)}</span></div>
                                    {selectedRate && (
                                         <div className="flex justify-between"><span>Shipping</span><span>R{selectedRate.rate.toFixed(2)}</span></div>
                                    )}
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>R{(getCartTotal() + (selectedRate?.rate || 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        ) : <p>Your cart is empty.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
