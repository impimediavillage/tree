
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/contexts/CartContext';
import { auth, db, functions } from '@/lib/firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import type { CartItem, ShippingRate, AddressValues, GroupedCart } from '@/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader } from '@googlemaps/js-api-loader';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { PaymentStep } from './PaymentStep';
import { DispensaryShippingGroup } from './DispensaryShippingGroup';

// --- SCHEMAS ---
const addressSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Please enter a valid email address'),
  phoneNumber: z.string().min(10, 'A valid phone number is required'),
  shippingAddress: z.object({
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
});

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
                
                // **CRITICAL FIX**: Capture the full formatted address
                const formattedAddress = place.formatted_address;
                if (formattedAddress) {
                    form.setValue('shippingAddress.address', formattedAddress, { shouldValidate: true, shouldDirty: true });
                }

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
                    Continue to Delivery Options
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </form>
        </FormProvider>
    );
};

const MultiDispensaryShippingStep = ({ groupedCart, addressData, onBack, onContinue, onShippingSelectionsChange, shippingSelections }: { groupedCart: GroupedCart; addressData: AddressValues; onBack: () => void; onContinue: () => void; onShippingSelectionsChange: (id: string, rate: ShippingRate | null) => void; shippingSelections: Record<string, ShippingRate | null>; }) => {
    const dispensaryIds = Object.keys(groupedCart);
    const allDispensariesHaveSelection = dispensaryIds.every(id => shippingSelections[id]);

    return (
        <div className="space-y-8">
            <div>
                 <h2 class="text-2xl font-bold tracking-tight">Delivery Options</h2>
                 <p className="text-muted-foreground">Your order is coming from multiple dispensaries. Please select a delivery method for each one.</p>
            </div>

            {dispensaryIds.map(dispensaryId => {
                const group = groupedCart[dispensaryId];
                return (
                    <DispensaryShippingGroup 
                        key={dispensaryId}
                        dispensaryId={dispensaryId}
                        dispensaryName={group.dispensaryName}
                        items={group.items}
                        addressData={addressData}
                        onShippingSelectionChange={onShippingSelectionsChange}
                    />
                )
            })}
            <div className="flex justify-between items-center pt-6">
                <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Address</Button>
                <Button type="button" onClick={onContinue} disabled={!allDispensariesHaveSelection}>
                    Continue to Payment <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// --- MAIN CHECKOUT FLOW COMPONENT ---

export function CheckoutFlow({ groupedCart }: { groupedCart: GroupedCart }) {
    const { cartItems, loading: cartLoading, getCartTotal } = useCart();
    const { firebaseUser } = useAuth();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    
    const [addressData, setAddressData] = useState<AddressValues | null>(null);
    const [shippingSelections, setShippingSelections] = useState<Record<string, ShippingRate | null>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const form = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            fullName: '', 
            email: '', 
            phoneNumber: '', 
            shippingAddress: { 
                address: '', // **CRITICAL FIX**: Added default value
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
      // Pre-fill form if user is logged in and has address info
      if (firebaseUser && firebaseUser.shippingAddress) {
        form.reset({ 
          fullName: firebaseUser.name || '',
          email: firebaseUser.email || '',
          phoneNumber: firebaseUser.phoneNumber || '',
          shippingAddress: { ...firebaseUser.shippingAddress }
        });
      }
    }, [firebaseUser, form]);

    const handleAddressContinue = async (values: AddressValues) => {
        setIsSubmitting(true);
        try {
            if (!firebaseUser) {
                const methods = await fetchSignInMethodsForEmail(auth, values.email);
                if (methods.length > 0) {
                    toast({ title: "An account with this email already exists.", description: "Please log in to continue your purchase.", variant: "destructive", duration: 5000 });
                    return;
                }
                toast({ title: "Creating your account...", description: "For your convenience, we are setting up an account to track your orders." });
                const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                const userCredential = await createUserWithEmailAndPassword(auth, values.email, randomPassword);
                const newUser = userCredential.user;
                if (newUser) {
                    await setDoc(doc(db, "users", newUser.uid), { uid: newUser.uid, email: values.email, name: values.fullName, phoneNumber: values.phoneNumber, role: 'approved' });
                } else {
                    throw new Error("Could not create user account.");
                }
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

    const handleShippingSelectionsChange = (dispensaryId: string, rate: ShippingRate | null) => {
        setShippingSelections(prev => ({...prev, [dispensaryId]: rate }));
    };

    const handleShippingContinue = () => {
        const allSelected = Object.keys(groupedCart).every(id => shippingSelections[id]);
        if (allSelected) {
            setStep(3);
        } else {
            toast({ title: "Selection Incomplete", description: "Please select a shipping method for every dispensary.", variant: "destructive"});
        }
    };

    const totalShippingCost = Object.values(shippingSelections).reduce((total, rate) => total + (rate?.rate || 0), 0);

    const renderContent = () => {
        if (cartLoading) {
            return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
        }
        if (Object.keys(groupedCart).length === 0 && !cartLoading) {
             return <div className="text-center p-8 text-muted-foreground"><h3>Your Cart is Empty</h3><p>Add some items to your cart to begin the checkout process.</p></div>;
        }

        switch(step) {
            case 1: 
                return <AddressStep form={form} onContinue={handleAddressContinue} isSubmitting={isSubmitting} />;
            case 2:
                return addressData && (
                    <MultiDispensaryShippingStep
                        groupedCart={groupedCart}
                        addressData={addressData}
                        onBack={() => setStep(1)}
                        onContinue={handleShippingContinue}
                        onShippingSelectionsChange={handleShippingSelectionsChange}
                        shippingSelections={shippingSelections}
                    />
                );
            case 3:
                 return addressData && (
                     <PaymentStep
                        cart={cartItems}
                        groupedCart={groupedCart}
                        shippingSelections={shippingSelections}
                        shippingAddress={addressData.shippingAddress}
                        onBack={() => setStep(2)} />
                 );
            default: 
                return <div>An unexpected error occurred.</div>;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            <div className="lg:col-span-2">
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardDescription>Step {step} of 3 - {step === 1 ? 'Shipping Details' : step === 2 ? 'Delivery Options' : 'Payment'}</CardDescription>
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
                                            <p className="text-sm text-muted-foreground">Qty: {item.quantity} - from {item.dispensaryName}</p>
                                        </div>
                                        <span>R{((item.price || 0) * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                                <hr className="my-2" />
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Subtotal</span><span>R{getCartTotal().toFixed(2)}</span></div>
                                    {Object.keys(shippingSelections).length > 0 && (
                                         <div className="flex justify-between font-medium"><span>Shipping</span><span>R{totalShippingCost.toFixed(2)}</span></div>
                                    )}
                                    {Object.entries(shippingSelections).map(([id, rate]) => rate && (
                                        <div key={id} className="flex justify-between pl-4 text-muted-foreground">
                                            <span>from {groupedCart[id]?.dispensaryName}</span>
                                            <span>R{rate.rate.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>R{(getCartTotal() + totalShippingCost).toFixed(2)}</span>
                                </div>
                            </div>
                        ) : <p>Your cart is empty.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
