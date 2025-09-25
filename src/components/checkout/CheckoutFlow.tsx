'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Dispensary, UserProfile, CartItem } from '@/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, UserPlus, LogIn, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { GoogleAddressInput } from '@/components/shared/GoogleAddressInput';
import { cn } from '@/lib/utils';

// Step Schemas
const shippingAddressSchema = z.object({
  fullName: z.string().min(3, { message: 'Full name must be at least 3 characters long.' }),
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  shippingAddress: z.object({
    address: z.string().min(5, { message: 'Please enter a valid address.' }),
    latitude: z.number(),
    longitude: z.number(),
    // Shiplogic requires a structured address, we will construct this from the Google Place result
    street_number: z.string().optional(),
    route: z.string().optional(),
    locality: z.string().optional(),
    administrative_area_level_1: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
  }),
});

const shippingMethodSchema = z.object({
  shippingMethodId: z.string({ required_error: "Please select a shipping method." }),
});


// Main Checkout State and Form Schema
type CheckoutStep = 'shipping-address' | 'shipping-method' | 'payment';

interface ShippingRate {
    id: number;
    name: string;
    rate: number;
    service_level: string;
    delivery_time: string;
    courier_name: string;
}

// Shipping Address Step Component
const ShippingAddressStep = ({ onAddressSubmit }: { onAddressSubmit: (values: z.infer<typeof shippingAddressSchema>) => void }) => {
    const { userProfile } = useAuth();
    const form = useForm<z.infer<typeof shippingAddressSchema>>({
        resolver: zodResolver(shippingAddressSchema),
        defaultValues: {
            fullName: userProfile?.displayName || '',
            phoneNumber: userProfile?.phoneNumber || '',
            shippingAddress: userProfile?.shippingAddress || { address: '', latitude: 0, longitude: 0 },
        },
    });

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onAddressSubmit)} className="space-y-6">
                 <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <Input placeholder="082 123 4567" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <GoogleAddressInput form={form} />
                <Button type="submit" className="w-full">Continue to Shipping</Button>
            </form>
        </FormProvider>
    );
};

// Shipping Method Step Component
const ShippingMethodStep = ({ rates, onMethodSubmit }: { rates: ShippingRate[], onMethodSubmit: (values: z.infer<typeof shippingMethodSchema>) => void }) => {
    const form = useForm<z.infer<typeof shippingMethodSchema>>({
        resolver: zodResolver(shippingMethodSchema),
    });

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onMethodSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="shippingMethodId"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-base">Select a Shipping Method</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-2"
                                >
                                    {rates.map(rate => (
                                        <FormItem key={rate.id} className="flex items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer">
                                            <FormControl>
                                                <RadioGroupItem value={String(rate.id)} />
                                            </FormControl>
                                            <FormLabel className="font-normal flex-grow cursor-pointer">
                                                <div className="flex justify-between items-center">
                                                    <span>{rate.courier_name} ({rate.name})</span>
                                                    <span className="font-semibold">R{rate.rate.toFixed(2)}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {rate.delivery_time}
                                                </p>
                                            </FormLabel>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
                <Button type="submit" className="w-full">Continue to Payment</Button>
            </form>
        </FormProvider>
    );
};

// Payment Step (Placeholder)
const PaymentStep = () => (
    <div>
        <p>Payment integration (e.g., Peach Payments, Yoco) will be implemented here.</p>
    </div>
);

export function CheckoutFlow() {
    const router = useRouter();
    const params = useParams();
    const { currentUser, userProfile, loading: authLoading } = useAuth();
    const { cart, loading: cartLoading } = useCart();
    const dispensaryId = params.dispensaryId as string;

    const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping-address');
    const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
    const [selectedShipping, setSelectedShipping] = useState<ShippingRate | null>(null);
    const [shippingAddress, setShippingAddress] = useState<z.infer<typeof shippingAddressSchema> | null>(null);
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Navigate user if not authenticated
    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.replace(`/auth/signin?redirect=/store/${dispensaryId}/checkout`);
        }
    }, [authLoading, currentUser, dispensaryId, router]);


    const handleAddressSubmit = async (values: z.infer<typeof shippingAddressSchema>) => {
        setError(null);
        setIsLoadingRates(true);
        setShippingAddress(values);

        try {
            // The GoogleAddressInput should populate the full address structure
            const deliveryAddress = {
                "street_number": values.shippingAddress.street_number,
                "route": values.shippingAddress.route,
                "locality": values.shippingAddress.locality,
                "administrative_area_level_1": values.shippingAddress.administrative_area_level_1,
                "country": values.shippingAddress.country,
                "postal_code": values.shippingAddress.postal_code
            };

            const response = await fetch('/api/shipping-rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cart, dispensaryId, deliveryAddress }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch shipping rates.');
            }

            const data = await response.json();
            if (data.rates && data.rates.length > 0) {
                setShippingRates(data.rates);
                setCurrentStep('shipping-method');
            } else {
                throw new Error('No shipping rates available for this address.');
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoadingRates(false);
        }
    };

    const handleMethodSubmit = (values: z.infer<typeof shippingMethodSchema>) => {
        const selected = shippingRates.find(rate => String(rate.id) === values.shippingMethodId);
        if (selected) {
            setSelectedShipping(selected);
            setCurrentStep('payment');
        }
    };

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + (selectedShipping?.rate || 0);

    if (authLoading || !userProfile) {
        return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    {/* Step Navigation/Indicator */}
                    <div className="flex items-center mb-8 font-medium">
                        <div className={cn("flex items-center", currentStep === 'shipping-address' && "text-primary")}>
                            <CheckCircle className={cn("h-5 w-5 mr-2", shippingAddress && "text-green-500")} />
                            Shipping Address
                        </div>
                        <ArrowRight className="h-5 w-5 mx-4 text-muted-foreground" />
                        <div className={cn("flex items-center", currentStep === 'shipping-method' && "text-primary", !shippingAddress && "text-muted-foreground")}>
                             <CheckCircle className={cn("h-5 w-5 mr-2", selectedShipping && "text-green-500")} />
                            Shipping Method
                        </div>
                        <ArrowRight className="h-5 w-5 mx-4 text-muted-foreground" />
                        <div className={cn("flex items-center", currentStep === 'payment' && "text-primary", !selectedShipping && "text-muted-foreground")}>
                            Payment
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl"> 
                                {currentStep === 'shipping-address' && 'Enter Your Shipping Address'}
                                {currentStep === 'shipping-method' && 'Select a Shipping Method'}
                                {currentStep === 'payment' && 'Complete Your Payment'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingRates && (
                                <div className="flex flex-col items-center justify-center text-center py-12">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4"/>
                                    <p className="text-lg">Fetching shipping rates...</p>
                                    <p className="text-muted-foreground">Please wait a moment.</p>
                                </div>
                            )}
                            {error && <p className="text-destructive text-center mb-4">{error}</p>}

                            <div className={cn(currentStep !== 'shipping-address' && 'hidden')}>
                                <ShippingAddressStep onAddressSubmit={handleAddressSubmit} />
                            </div>
                            <div className={cn(currentStep !== 'shipping-method' && 'hidden')}>
                                {shippingRates.length > 0 && <ShippingMethodStep rates={shippingRates} onMethodSubmit={handleMethodSubmit} />}
                            </div>
                             <div className={cn(currentStep !== 'payment' && 'hidden')}>
                                <PaymentStep />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{item.name}</p>
                                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                        <span>R{(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            <hr className="my-4" />
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>R{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shipping</span>
                                    <span>{selectedShipping ? `R${selectedShipping.rate.toFixed(2)}` : 'TBD'}</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>R{total.toFixed(2)}</span>
                                </div>
                            </div>
                            <Button className="w-full mt-6" disabled={currentStep !== 'payment'}>
                                Place Order
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
