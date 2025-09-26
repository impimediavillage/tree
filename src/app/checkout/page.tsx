
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/contexts/CartContext';
import { db, functions } from '@/lib/firebase'; // Import functions
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable
import { doc, getDoc } from 'firebase/firestore';
import type { CartItem } from '@/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader } from '@googlemaps/js-api-loader';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { PaymentStep } from '@/components/checkout/PaymentStep';
import { useRouter } from 'next/navigation';

const addressSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().min(10, 'A valid phone number is required'),
  shippingAddress: z.object({
    address: z.string().min(5, 'Please enter a valid address.'),
    latitude: z.number().refine(val => val !== 0, "Please select a valid address from the map or suggestions."),
    longitude: z.number().refine(val => val !== 0, "Please select a valid address from the map or suggestions."),
    street_number: z.string().optional(),
    route: z.string().optional(),
    locality: z.string().optional(),
    administrative_area_level_1: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
  }),
});
type AddressValues = z.infer<typeof addressSchema>;
interface ShippingRate { id: number; name: string; rate: number; service_level: string; delivery_time: string; courier_name: string; }

const AddressStep = ({ form, onContinue }: { form: any; onContinue: () => void; }) => {
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
            const loader = new Loader({
                apiKey: apiKey,
                version: 'weekly',
                libraries: ['places'],
            });

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

            const markerInstance = new google.maps.Marker({
                map: mapInstance,
                position: initialPosition,
                draggable: true,
                title: 'Drag to set location'
            });

            const setAddressComponents = (place: google.maps.places.PlaceResult | google.maps.GeocoderResult) => {
                const components: { [key: string]: string } = {};
                place.address_components?.forEach(component => {
                    components[component.types[0]] = component.long_name;
                });
                form.setValue('shippingAddress.street_number', components['street_number'] || '');
                form.setValue('shippingAddress.route', components['route'] || '');
                form.setValue('shippingAddress.locality', components['locality'] || '');
                form.setValue('shippingAddress.administrative_area_level_1', components['administrative_area_level_1'] || '');
                form.setValue('shippingAddress.country', components['country'] || '');
                form.setValue('shippingAddress.postal_code', components['postal_code'] || '');
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
                    form.setValue('shippingAddress.address', place.formatted_address || '', { shouldValidate: true });
                    form.setValue('shippingAddress.latitude', loc.lat(), { shouldValidate: true });
                    form.setValue('shippingAddress.longitude', loc.lng(), { shouldValidate: true });
                    setAddressComponents(place);
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
                        const place = results[0];
                        form.setValue('shippingAddress.address', place.formatted_address || '', { shouldValidate: true, shouldDirty: true });
                        setAddressComponents(place);
                    }
                });
            }
            markerInstance.addListener('dragend', () => handleMapInteraction(markerInstance.getPosition()!));
            mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && handleMapInteraction(e.latLng));

        } catch (err) {
            console.error('Google Maps API Error:', err);
            toast({ title: 'Map Error', description: 'Could not load Google Maps. Please check your connection and try again.', variant: 'destructive' });
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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 </div>
                 <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="082 123 4567" {...field} /></FormControl><FormMessage /></FormItem>)} />

                <FormField
                    control={form.control}
                    name="shippingAddress.address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Shipping Address</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Start typing your address..."
                                    {...field}
                                    ref={locationInputRef}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        if (form.getValues('shippingAddress.latitude') !== 0) {
                                            form.setValue('shippingAddress.latitude', 0);
                                            form.setValue('shippingAddress.longitude', 0);
                                        }
                                    }}
                                />
                            </FormControl>
                            <FormDescription>Select an address from the suggestions to pinpoint it on the map.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div ref={mapContainerRef} className="h-[250px] w-full rounded-md border bg-muted" />
                <FormDescription>Or, click on the map or drag the marker to set your precise location.</FormDescription>
                
                <Button type="submit" className="w-full pt-6">Continue to Delivery Option <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </form>
        </FormProvider>
    );
};

const ShippingTierStep = ({ onSelectTier, onBack }: { onSelectTier: (tier: string) => void; onBack: () => void; }) => {
    const availableTiers = ["Door-to-Door Delivery", "Local Delivery", "Collection Point"];
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold">How would you like to receive your order?</h3>
            <RadioGroup onValueChange={onSelectTier} className="space-y-3">
                {availableTiers.map(tier => (<Label key={tier} className="flex items-center space-x-3 border rounded-md p-4 hover:bg-accent has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary transition-all cursor-pointer"><RadioGroupItem value={tier} id={tier} /><span>{tier}</span></Label>))}
            </RadioGroup>
            <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Go Back</Button>
        </div>
    );
};

const ShippingMethodStep = ({ rates, isLoading, error, onBack, onContinue, selectedRate, onSelectRate }: { rates: ShippingRate[]; isLoading: boolean; error: string | null; onBack: () => void; onContinue: () => void; selectedRate: ShippingRate | null; onSelectRate: (rate: ShippingRate) => void; }) => {
    if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Fetching live shipping rates...</p></div>;
    if (error) return <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md"><h4>Error Fetching Rates</h4><p>{error}</p><Button variant="outline" onClick={onBack} className="mt-4">Try Again</Button></div>;
    if (rates.length === 0) return <div className="text-center text-muted-foreground p-8"><p>No shipping methods available for this address.</p><Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button></div>;

    const handleSelection = (rateId: string) => {
        const rate = rates.find(r => r.id.toString() === rateId);
        if (rate) onSelectRate(rate);
    }

    return (
        <form onSubmit={(e) => { e.preventDefault(); onContinue(); }} className="space-y-6">
            <RadioGroup value={selectedRate?.id.toString()} onValueChange={handleSelection} name="shippingMethod" className="space-y-3">
                {rates.map(rate => (<Label key={rate.id} className="flex justify-between items-center border rounded-md p-4 has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary"><p className="font-semibold">{rate.courier_name} ({rate.name})</p><p className="font-bold">R{rate.rate.toFixed(2)}</p><RadioGroupItem value={rate.id.toString()} id={rate.id.toString()} className="sr-only" /></Label>))}
            </RadioGroup>
            <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button type="submit" disabled={!selectedRate}>Continue to Payment <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
        </form>
    );
};

export default function CheckoutPage() {
    const { cartItems, loading: cartLoading, getCartTotal } = useCart();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [dispensaryId, setDispensaryId] = useState<string | null>(null);
    const [addressData, setAddressData] = useState<AddressValues | null>(null);
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isDispensaryLoading, setIsDispensaryLoading] = useState(true);
    const router = useRouter();

    const form = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            fullName: '',
            email: '',
            phoneNumber: '',
            shippingAddress: { address: '', latitude: 0, longitude: 0 }
        },
        mode: 'onChange'
    });

    useEffect(() => {
        if (!cartLoading) {
            if(cartItems.length > 0) {
                const id = cartItems[0].dispensaryId;
                if (id) setDispensaryId(id);
                else setApiError("Dispensary information is missing from your cart.");
            } else {
                 if(!cartLoading){
                    toast({
                        title: "Your Cart is Empty",
                        description: "You will be redirected to the home page.",
                        variant: "destructive"
                    });
                    setTimeout(() => router.push('/'), 2000);
                }
            }
        }
    }, [cartItems, cartLoading, router, toast]);
    
    useEffect(() => {
        if (dispensaryId) {
            setIsDispensaryLoading(true);
            getDoc(doc(db, 'dispensaries', dispensaryId))
                .then(docSnap => {
                    if (!docSnap.exists()) setApiError('Dispensary not found.');
                })
                .catch(err => setApiError("Failed to load dispensary data."))
                .finally(() => setIsDispensaryLoading(false));
        }
    }, [dispensaryId]);

    const handleAddressContinue = (values: AddressValues) => {
        setAddressData(values);
        setStep(2);
    };

    const handleTierSelection = async (tier: string) => {
        setApiError(null);
        if (tier === 'Door-to-Door Delivery') {
            if (!addressData || !dispensaryId) { 
                setApiError('Address and dispensary data are required.'); 
                return; 
            }
            
            setIsLoadingRates(true);
            setShippingRates([]);
            try {
                const getShiplogicRates = httpsCallable(functions, 'getShiplogicRates');
                const result: any = await getShiplogicRates({
                    cart: cartItems,
                    dispensaryId,
                    deliveryAddress: addressData.shippingAddress,
                    customer: { email: addressData.email, name: addressData.fullName, phone: addressData.phoneNumber }
                });

                const data = result.data as { rates?: ShippingRate[], error?: string };

                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.rates && data.rates.length > 0) {
                    setShippingRates(data.rates);
                    setSelectedRate(data.rates[0]);
                } else {
                    setApiError("No shipping rates could be found for the provided address.");
                }

            } catch (err: any) {
                console.error("Error calling getShiplogicRates function:", err);
                setApiError(err.message || "An unknown error occurred while fetching shipping rates.");
            } finally {
                setIsLoadingRates(false);
            }
            setStep(3);
        } else {
            setShippingRates([]); 
            setSelectedRate(null);
            setApiError(`'${tier}' is not yet supported.`);
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
            return (
                <div className="flex justify-center items-center min-h-[50vh]">
                   <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            );
        }
        if (apiError && step < 2) {
            return (
                <div className="text-center p-8 text-destructive bg-destructive/10 rounded-lg">
                    <h3>Something Went Wrong</h3>
                    <p>{apiError}</p>
                </div>
            );
        }

        switch(step) {
            case 1:
                return <AddressStep form={form} onContinue={handleAddressContinue} />;
            case 2:
                return <ShippingTierStep onSelectTier={handleTierSelection} onBack={() => setStep(1)} />;
            case 3:
                return <ShippingMethodStep 
                    rates={shippingRates} 
                    isLoading={isLoadingRates} 
                    error={apiError} 
                    onBack={() => { setApiError(null); setStep(2); }} 
                    onContinue={handleShippingMethodContinue} 
                    selectedRate={selectedRate} 
                    onSelectRate={setSelectedRate} />;
            case 4:
                return addressData && selectedRate && (
                    <PaymentStep 
                        cart={cartItems} 
                        shippingMethod={selectedRate}
                        shippingAddress={addressData}
                        onBack={() => setStep(3)} />
                );
            default:
                return null;
        }
    };

    return (
        <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Checkout</CardTitle>
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
        </div>
    );
}
