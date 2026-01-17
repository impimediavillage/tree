
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/contexts/CartContext';
import { auth, db, functions } from '@/lib/firebase';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { CartItem, ShippingRate, AddressValues, GroupedCart } from '@/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader } from '@googlemaps/js-api-loader';
import { useToast } from '@/hooks/use-toast';
import countryDialCodes from '@/../docs/country-dial-codes.json';
import { getDisplayPrice } from '@/lib/pricing';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, ArrowLeft, ShoppingCart, Package, Store, Truck, DollarSign } from 'lucide-react';
import { PaymentStep } from './PaymentStep';
import { DispensaryShippingGroup } from './DispensaryShippingGroup';
import { TreehouseShippingGroup } from './TreehouseShippingGroup';

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

interface Country {
    name: string;
    iso: string;
    flag: string;
    dialCode: string;
}

const AddressStep = ({ form, onContinue, isSubmitting, currentUser, onDialCodeChange, initialDialCode }: { form: any; onContinue: (values: AddressValues) => Promise<void>; isSubmitting: boolean; currentUser: any; onDialCodeChange?: (dialCode: string) => void; initialDialCode?: string; }) => {
    const locationInputRef = useRef<HTMLInputElement>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInitialized = useRef(false);
    const { toast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(countryDialCodes.find(c => c.iso === 'ZA'));
    const [nationalPhoneNumber, setNationalPhoneNumber] = useState('');

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

            const getAddressComponent = (components: google.maps.GeocoderAddressComponent[], type: string, useShortName = false): string =>
                components.find(c => c.types.includes(type))?.[useShortName ? 'short_name' : 'long_name'] || '';

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
                const countryShortName = getAddressComponent(components, 'country', true);
                
                form.setValue('shippingAddress.streetAddress', `${streetNumber} ${route}`.trim(), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.suburb', getAddressComponent(components, 'locality'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.city', getAddressComponent(components, 'administrative_area_level_2'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.province', getAddressComponent(components, 'administrative_area_level_1'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.postalCode', getAddressComponent(components, 'postal_code'), { shouldValidate: true, shouldDirty: true });
                form.setValue('shippingAddress.country', getAddressComponent(components, 'country'), { shouldValidate: true, shouldDirty: true });
                
                // Auto-detect and set country dial code
                const matchedCountry = countryDialCodes.find(c => c.iso.toLowerCase() === countryShortName.toLowerCase());
                if (matchedCountry) {
                    setSelectedCountry(matchedCountry);
                }
            };
            
            const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current!, {
                fields: ['formatted_address', 'address_components', 'geometry.location'],
                types: ['address'],
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
    
    // Set initial dial code if provided
    useEffect(() => {
        if (initialDialCode) {
            const country = countryDialCodes.find(c => c.dialCode === initialDialCode);
            if (country) {
                setSelectedCountry(country);
            }
        }
    }, [initialDialCode]);
    
    // Update phone number when dial code or national number changes
    useEffect(() => {
        if (selectedCountry) {
            const combinedPhoneNumber = `${selectedCountry.dialCode}${nationalPhoneNumber}`.replace(/\D/g, '');
            form.setValue('phoneNumber', combinedPhoneNumber, { shouldValidate: true, shouldDirty: false });
            // Notify parent of dial code change
            if (onDialCodeChange) {
                onDialCodeChange(selectedCountry.dialCode);
            }
        }
    }, [selectedCountry, nationalPhoneNumber, form, onDialCodeChange]);
    
    // Extract national phone number from full international number - reactive to form changes
    useEffect(() => {
      const phoneNumber = form.getValues('phoneNumber') || currentUser?.phoneNumber;
      
      if (!phoneNumber || !selectedCountry) {
        // No phone data or country selected
        if (phoneNumber === '') {
          setNationalPhoneNumber(''); // Clear if phone is explicitly empty
        }
        return;
      }
      
      // Remove dial code from stored phone number to get national number
      const dialCodeDigits = selectedCountry.dialCode.replace(/\D/g, '');
      const fullNumber = phoneNumber.replace(/\D/g, '');
      
      if (fullNumber.startsWith(dialCodeDigits)) {
        const national = fullNumber.substring(dialCodeDigits.length);
        console.log('📱 Extracted national number:', national, 'from', fullNumber);
        setNationalPhoneNumber(national);
      } else if (fullNumber) {
        // If dial code doesn't match, use full number as national
        console.log('📱 Dial code mismatch, using full number:', fullNumber);
        setNationalPhoneNumber(fullNumber);
      }
    }, [form.watch('phoneNumber'), selectedCountry, currentUser?.phoneNumber]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onContinue)} className="space-y-6">
                <h3 className="text-lg font-extrabold text-[#3D2E17] border-b pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="you@email.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <h3 className="text-lg font-extrabold text-[#3D2E17] border-b pb-2 pt-4">Shipping Location</h3>
                <FormItem>
                    <FormLabel>Location Search</FormLabel>
                    <FormControl><Input ref={locationInputRef} placeholder="Start typing an address to search..." /></FormControl>
                    <FormDescription>Select an address to auto-fill the fields below. You can also click the map or drag the pin.</FormDescription>
                </FormItem>

                <div ref={mapContainerRef} className="h-[250px] w-full rounded-md border bg-muted" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="shippingAddress.streetAddress" render={({ field }) => (<FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} placeholder="Auto-filled from map or enter manually" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.suburb" render={({ field }) => (<FormItem><FormLabel>Suburb</FormLabel><FormControl><Input {...field} placeholder="Auto-filled from map or enter manually" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} placeholder="Auto-filled from map or enter manually" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.province" render={({ field }) => (<FormItem><FormLabel>Province</FormLabel><FormControl><Input {...field} placeholder="Auto-filled from map or enter manually" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} placeholder="Auto-filled from map or enter manually" /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="shippingAddress.country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} placeholder="Auto-filled from map or enter manually" /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <FormField control={form.control} name="phoneNumber" render={() => (
                    <FormItem><FormLabel>Phone Number</FormLabel>
                        <div className="flex items-center gap-2">
                            <div className="w-[100px] shrink-0 border rounded-md h-10 flex items-center justify-center bg-muted">
                                {selectedCountry && <span className='text-sm font-medium'>{selectedCountry.flag} {selectedCountry.dialCode}</span>}
                            </div>
                            <Input type="tel" placeholder="National number (e.g., 821234567)" value={nationalPhoneNumber} onChange={(e) => setNationalPhoneNumber(e.target.value.replace(/\D/g, ''))} />
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />

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
                 <h2 className="text-2xl font-extrabold text-[#3D2E17] tracking-tight">Delivery Options</h2>
                 <p className="text-[#3D2E17] font-bold">Your order is coming from multiple stores. Please select a delivery method for each one.</p>
            </div>

            {dispensaryIds.map(dispensaryId => {
                const group = groupedCart[dispensaryId];
                
                // Check if this is a Treehouse store by checking if items have dispensaryType === "Treehouse"
                const isTreehouseStore = group.items.some(item => item.dispensaryType === "Treehouse");
                
                // Debug logging
                console.log(`[CheckoutFlow] Dispensary: ${dispensaryId}, Type: ${group.dispensaryType}, isTreehouse: ${isTreehouseStore}`, group.items[0]);
                
                if (isTreehouseStore) {
                    return (
                        <TreehouseShippingGroup 
                            key={dispensaryId}
                            storeId={dispensaryId}
                            storeName={group.dispensaryName}
                            items={group.items}
                            addressData={addressData}
                            onShippingSelectionChange={onShippingSelectionsChange}
                        />
                    );
                }
                
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
            <div className="flex justify-between items-center pt-6 gap-3">
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={onBack}
                    className="h-12 w-12 text-[#3D2E17] hover:text-[#3D2E17] hover:bg-[#3D2E17]/10"
                    aria-label="Back to address"
                >
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <Button 
                    type="button" 
                    onClick={onContinue} 
                    disabled={!allDispensariesHaveSelection}
                    className="flex-1"
                >
                    Let's pay now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

// --- MAIN CHECKOUT FLOW COMPONENT ---

export function CheckoutFlow({ groupedCart }: { groupedCart: GroupedCart }) {
    const { cartItems, loading: cartLoading, getCartTotal } = useCart();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    
    const [addressData, setAddressData] = useState<AddressValues | null>(null);
    const [shippingSelections, setShippingSelections] = useState<Record<string, ShippingRate | null>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [userDialCode, setUserDialCode] = useState<string>('+27'); // Store dial code for display

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
      // Priority 1: Load from logged-in user profile
      if (currentUser && currentUser.shippingAddress) {
        // Build full address from component parts if not present
        const fullAddress = currentUser.shippingAddress.address || 
          `${currentUser.shippingAddress.streetAddress || ''}, ${currentUser.shippingAddress.suburb || ''}, ${currentUser.shippingAddress.city || ''}, ${currentUser.shippingAddress.province || ''}, ${currentUser.shippingAddress.postalCode || ''}`.replace(/, ,/g, ',').trim();
        
        form.reset({ 
          fullName: currentUser.name || currentUser.displayName || '',
          email: currentUser.email || '',
          phoneNumber: currentUser.phoneNumber || '',
          shippingAddress: { 
            address: fullAddress,
            streetAddress: currentUser.shippingAddress.streetAddress || '',
            suburb: currentUser.shippingAddress.suburb || '',
            city: currentUser.shippingAddress.city || '',
            province: currentUser.shippingAddress.province || '',
            postalCode: currentUser.shippingAddress.postalCode || '',
            country: currentUser.shippingAddress.country || 'South Africa',
            latitude: currentUser.shippingAddress.latitude || 0,
            longitude: currentUser.shippingAddress.longitude || 0
          }
        });
        
        // Extract dial code from user's phone number
        if (currentUser.phoneNumber && currentUser.phoneNumber.startsWith('+')) {
          const matched = countryDialCodes.find(c => 
            currentUser.phoneNumber!.startsWith(c.dialCode)
          );
          if (matched) {
            setUserDialCode(matched.dialCode);
          }
        }
        
        console.log("✅ Checkout form pre-filled with user profile:", fullAddress);
        return;
      }
      
      // Priority 2: Load from localStorage for guest users (fallback)
      if (!currentUser) {
        try {
          const savedFormData = localStorage.getItem('checkoutFormData');
          if (savedFormData) {
            const parsedData = JSON.parse(savedFormData);
            console.log('📦 Restoring checkout data from localStorage:', parsedData);
            
            // Extract and set dialCode first
            if (parsedData.dialCode) {
              console.log('📞 Setting dial code:', parsedData.dialCode);
              setUserDialCode(parsedData.dialCode);
              delete parsedData.dialCode; // Remove before setting form values
            }
            
            // Restore form data
            form.reset(parsedData);
            console.log("✅ Checkout form restored from localStorage");
          }
        } catch (error) {
          console.error("Failed to restore checkout form from localStorage:", error);
        }
      }
    }, [currentUser, form]); // Re-run when user login state changes

    const handleAddressContinue = async (values: AddressValues) => {
        setIsSubmitting(true);
        try {
            // If user is already logged in, skip account creation and proceed
            if (!currentUser) {
                const methods = await fetchSignInMethodsForEmail(auth, values.email);
                if (methods.length > 0) {
                    // Check if this is the current Firebase auth user (race condition check)
                    const firebaseUser = auth.currentUser;
                    if (firebaseUser && firebaseUser.email === values.email) {
                        // User is authenticated, just currentUser hasn't loaded from AuthContext yet
                        // Proceed with checkout
                        console.log("User is authenticated but AuthContext not updated yet, proceeding...");
                    } else {
                        // Email exists for a different user - save data and show elegant sign-in prompt
                        const dataToSave = { ...values, dialCode: userDialCode };
                        localStorage.setItem('checkoutFormData', JSON.stringify(dataToSave));
                        toast({ 
                          title: "Welcome back!", 
                          description: "We found your account. Sign in to continue with your saved details.",
                          className: "bg-[#006B3E] text-white border-[#006B3E]",
                          action: (
                            <Button 
                              size="sm" 
                              className="bg-[#3D2E17] hover:bg-[#006B3E] text-white font-bold"
                              onClick={() => window.location.href = `/auth/signin?redirect=${encodeURIComponent('/checkout')}`}
                            >
                              Sign In
                            </Button>
                          ),
                          duration: 8000
                        });
                        setIsSubmitting(false);
                        return;
                    }
                } else {
                    // No existing account, create one
                    toast({ title: "Creating your account...", description: "For your convenience, we are setting up an account to track your orders." });
                    const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                    const userCredential = await createUserWithEmailAndPassword(auth, values.email, randomPassword);
                    const newUser = userCredential.user;
                    if (newUser) {
                        await setDoc(doc(db, "users", newUser.uid), { 
                          uid: newUser.uid, 
                          email: values.email, 
                          name: values.fullName, // Full name from checkout form
                          displayName: values.fullName, // Set displayName to match signup
                          phoneNumber: values.phoneNumber, // Phone with dial code
                          photoURL: null,
                          role: 'approved', 
                          credits: 10, 
                          createdAt: serverTimestamp(),
                          lastLoginAt: serverTimestamp(),
                          status: 'Active',
                          welcomeCreditsAwarded: true, 
                          signupSource: 'checkout',
                          shippingAddress: {
                            address: values.shippingAddress.address,
                            streetAddress: values.shippingAddress.streetAddress,
                            suburb: values.shippingAddress.suburb,
                            city: values.shippingAddress.city,
                            province: values.shippingAddress.province,
                            postalCode: values.shippingAddress.postalCode,
                            country: values.shippingAddress.country,
                            latitude: values.shippingAddress.latitude,
                            longitude: values.shippingAddress.longitude
                          }
                        });
                    } else {
                        throw new Error("Could not create user account.");
                    }
                }
            }
            
            // Save to localStorage for guest persistence (include dialCode)
            if (!currentUser) {
              const dataToSave = { ...values, dialCode: userDialCode };
              localStorage.setItem('checkoutFormData', JSON.stringify(dataToSave));
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
             return <div className="text-center p-8 text-[#3D2E17]"><h3 className="font-bold text-xl">Your Cart is Empty</h3><p className="mt-2">Add some items to your cart to begin the checkout process.</p></div>;
        }

        switch(step) {
            case 1: 
                return <AddressStep form={form} onContinue={handleAddressContinue} isSubmitting={isSubmitting} currentUser={currentUser} onDialCodeChange={setUserDialCode} initialDialCode={userDialCode} />;
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
                        customerName={addressData.fullName}
                        customerPhone={addressData.phoneNumber}
                        dialCode={userDialCode}
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
                        <CardDescription className="text-[#3D2E17] font-bold text-base">Step {step} of 3 - {step === 1 ? 'Shipping Details' : step === 2 ? 'Delivery Options' : 'Payment'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderContent()}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                <Card className="sticky top-24 bg-muted/50 shadow-2xl border-2 border-border/50">
                    <CardHeader className="pb-4 border-b-2 border-[#006B3E]/30 bg-white/40 dark:bg-black/20">
                        <p className='font-black text-2xl text-[#3D2E17] flex items-center gap-3'>
                            <ShoppingCart className="h-7 w-7 text-[#006B3E]" />
                            Order Summary
                        </p>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {cartItems.length > 0 ? (
                            <div className="space-y-4">
                                {/* Cart Items */}
                                <div className="space-y-3 max-h-[300px] overflow-y-auto smooth-scroll pr-2" style={{ scrollBehavior: 'smooth' }}>
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex justify-between items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-800/50 border-2 border-[#006B3E]/20 hover:border-[#006B3E]/40 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-[#3D2E17] text-base truncate">{item.name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Package className="h-3.5 w-3.5 text-[#006B3E]" />
                                                    <p className="text-sm text-[#5D4E37] font-bold">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Store className="h-3.5 w-3.5 text-[#006B3E]" />
                                                    <p className="text-xs text-[#5D4E37] font-semibold truncate">{item.dispensaryName}</p>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <div className="bg-[#006B3E]/10 px-3 py-1.5 rounded-lg">
                                                    <p className="text-sm font-black text-[#006B3E]">R{(getDisplayPrice(item.price || 0, 0, item.dispensaryType === 'Product Pool') * item.quantity).toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Divider */}
                                <div className="border-t-2 border-[#006B3E]/30 my-4"></div>
                                
                                {/* Subtotal */}
                                <div className="bg-gradient-to-r from-white/80 to-amber-50/80 dark:from-gray-800/80 dark:to-amber-950/80 p-4 rounded-xl border-2 border-[#006B3E]/20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-base font-black text-[#3D2E17]">Subtotal</span>
                                        <span className="text-xl font-black text-[#006B3E]">R{getCartTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                {/* Shipping Details */}
                                {Object.keys(shippingSelections).length > 0 && (
                                    <div className="bg-gradient-to-r from-blue-50/80 to-green-50/80 dark:from-blue-950/30 dark:to-green-950/30 p-4 rounded-xl border-2 border-blue-300/50 dark:border-blue-700/50 space-y-3">
                                        <div className="flex justify-between items-center pb-2 border-b border-[#006B3E]/30">
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-5 w-5 text-blue-600" />
                                                <span className="text-base font-black text-[#3D2E17]">Shipping</span>
                                            </div>
                                            <span className="text-lg font-black text-blue-600">R{totalShippingCost.toFixed(2)}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {Object.entries(shippingSelections).map(([id, rate]) => rate && (
                                                <div key={id} className="flex justify-between items-center pl-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                                        <span className="text-sm font-bold text-[#5D4E37] truncate">{groupedCart[id]?.dispensaryName}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-blue-600 ml-2">R{rate.rate.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {/* Divider */}
                                <div className="border-t-2 border-[#006B3E]/30 my-4"></div>
                                
                                {/* Grand Total */}
                                <div className="bg-gradient-to-br from-[#006B3E] to-[#3D2E17] p-5 rounded-2xl shadow-xl">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xl font-black text-white">
                                            Grand Total
                                        </span>
                                        <span className="text-3xl font-black text-white">R{(getCartTotal() + totalShippingCost).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white/60 rounded-xl border-2 border-dashed border-[#006B3E]/30">
                                <ShoppingCart className="h-16 w-16 text-[#006B3E]/30 mx-auto mb-3" />
                                <p className="text-lg font-bold text-[#5D4E37]">Your cart is empty.</p>
                                <p className="text-sm font-semibold text-muted-foreground mt-1">Add some items to get started!</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
