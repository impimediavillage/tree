
'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { CartItem, Dispensary } from '@/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { GoogleAddressInput } from '@/components/shared/GoogleAddressInput';
import { Label } from "@/components/ui/label";

const addressSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  phoneNumber: z.string().min(10, 'A valid phone number is required'),
  shippingAddress: z.object({
    address: z.string().min(5, 'Please enter a valid address.'),
    latitude: z.number().refine(val => val !== 0, "Please select a valid address."),
    longitude: z.number().refine(val => val !== 0, "Please select a valid address."),
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
    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onContinue)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="082 123 4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="space-y-4">
                       <GoogleAddressInput form={form} />
                    </div>
                </div>
                <Button type="submit" className="w-full mt-6">Continue to Delivery Option <ArrowRight className="ml-2 h-4 w-4" /></Button>
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

const ShippingMethodStep = ({ rates, isLoading, error, onBack, onContinue }: { rates: ShippingRate[]; isLoading: boolean; error: string | null; onBack: () => void; onContinue: () => void; }) => {
    if (isLoading) return <div className="flex flex-col items-center justify-center min-h-[200px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Fetching live shipping rates...</p></div>;
    if (error) return <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md"><h4>Error Fetching Rates</h4><p>{error}</p><Button variant="outline" onClick={onBack} className="mt-4">Try Again</Button></div>;
    if (rates.length === 0) return <div className="text-center text-muted-foreground p-8"><p>No shipping methods available for this address.</p><Button variant="outline" onClick={onBack} className="mt-4">Go Back</Button></div>;

    return (
        <form onSubmit={(e) => { e.preventDefault(); onContinue(); }} className="space-y-6">
            <RadioGroup defaultValue={rates[0]?.id.toString()} name="shippingMethod" className="space-y-3">
                {rates.map(rate => (<Label key={rate.id} className="flex justify-between items-center border rounded-md p-4 has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-primary"><p className="font-semibold">{rate.courier_name} ({rate.name})</p><p className="font-bold">R{rate.rate.toFixed(2)}</p><RadioGroupItem value={rate.id.toString()} id={rate.id.toString()} className="sr-only" /></Label>))}
            </RadioGroup>
            <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button type="submit">Continue to Payment <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
        </form>
    );
};

export function CheckoutFlow() {
    const { cartItems, loading: cartLoading, getCartTotal } = useCart();

    const [step, setStep] = useState(1);
    const [dispensaryId, setDispensaryId] = useState<string | null>(null);
    const [addressData, setAddressData] = useState<AddressValues | null>(null);
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDispensaryLoading, setIsDispensaryLoading] = useState(true);

    const form = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            fullName: '',
            phoneNumber: '',
            shippingAddress: { address: '', latitude: 0, longitude: 0 }
        }
    });

    useEffect(() => {
        if (!cartLoading) {
            if(cartItems.length > 0) {
                const id = cartItems[0].dispensaryId;
                if (id) setDispensaryId(id);
                else setError("Dispensary information is missing from your cart.");
            } else {
                setError("Your cart is empty.");
            }
        }
    }, [cartItems, cartLoading]);

    useEffect(() => {
        if (dispensaryId) {
            setIsDispensaryLoading(true);
            setError(null);
            const timer = setTimeout(() => {
                setIsDispensaryLoading(false);
                setError("Timed out fetching dispensary data. Please try again.");
            }, 12000);

            getDoc(doc(db, 'dispensaries', dispensaryId))
                .then(docSnap => {
                    clearTimeout(timer);
                    if (!docSnap.exists()) setError(`Dispensary not found.`);
                })
                .catch(err => {
                    clearTimeout(timer);
                    setError("Failed to load dispensary data.");
                })
                .finally(() => setIsDispensaryLoading(false));
            
            return () => clearTimeout(timer);
        }
    }, [dispensaryId]);

    const handleAddressContinue = (values: AddressValues) => {
        setAddressData(values);
        setStep(2);
    };

    const handleTierSelection = async (tier: string) => {
        setError(null);
        if (tier === 'Door-to-Door Delivery') {
            if (!addressData || !dispensaryId) { setError('Address and dispensary data are required.'); return; }
            
            setIsLoadingRates(true);
            setShippingRates([]);
            try {
                const response = await fetch('/api/shipping-rates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        cart: cartItems,
                        dispensaryId,
                        deliveryAddress: addressData.shippingAddress
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch shipping rates.');
                setShippingRates(data.rates || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoadingRates(false);
            }
            setStep(3);
        } else {
            setShippingRates([]);
            setStep(3);
        }
    };
    
    const isLoading = cartLoading || isDispensaryLoading;

    const renderContent = () => {
        if (isLoading) return <div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
        if (error) return <div className="text-center p-8 text-destructive bg-destructive/10 rounded-lg"><h3>Something Went Wrong</h3><p>{error}</p></div>;
        
        switch(step) {
            case 1: return <AddressStep form={form} onContinue={handleAddressContinue} />;
            case 2: return <ShippingTierStep onSelectTier={handleTierSelection} onBack={() => setStep(1)} />;
            case 3: return <ShippingMethodStep rates={shippingRates} isLoading={isLoadingRates} error={error} onBack={() => { setError(null); setStep(2); }} onContinue={() => alert("Proceeding to payment!")} />;
            default: return <p>An unknown error occurred.</p>;
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
            <div className="lg:col-span-2">
                <Card className="border-0 shadow-none">
                    <CardHeader>
                        <CardDescription>Step {step} of 3 - {step === 1 ? 'Shipping Details' : step === 2 ? 'Delivery Option' : 'Finalize Delivery'}</CardDescription>
                    </CardHeader>
                    <CardContent>{renderContent()}</CardContent>
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
                                <hr className="my-4" />
                                <div className="flex justify-between font-bold text-lg"><span>Subtotal</span><span>R{getCartTotal().toFixed(2)}</span></div>
                            </div>
                        ) : <p>Your cart is empty.</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
