
'use client';

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { CartItem as CartItemType, Dispensary, User } from '@/types'; // Added User
import { type ShippingAddressFormData } from './ShippingAddressStep';
import { useAuth } from '@/contexts/AuthContext'; // Assuming you have an AuthContext to get user info

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// This interface must match the structure returned by the Cloud Function
interface ShippingRate {
  id: string;
  name: string;
  rate: number;
  service_level: string;
  delivery_time: string;
  courier_name: string;
}

interface ShippingMethodStepProps {
  cart: CartItemType[];
  dispensary: Dispensary;
  shippingAddress: ShippingAddressFormData;
  onMethodSelect: (method: ShippingRate) => void;
  onBack: () => void;
}

export function ShippingMethodStep({ 
  cart, 
  dispensary, 
  shippingAddress, 
  onMethodSelect, 
  onBack 
}: ShippingMethodStepProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Get the logged-in user
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
      if (!user) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to fetch shipping rates.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      try {
        const functions = getFunctions();
        const getShiplogicRates = httpsCallable(functions, 'getShiplogicRates');
        
        // --- CORRECTED DATA PAYLOAD ---
        // This now matches the exact structure expected by the backend function.
        const requestData = {
          cart: cart, // The cart items array, passed directly
          dispensaryId: dispensary.id,
          deliveryAddress: {
            address: shippingAddress.street,
            locality: shippingAddress.suburb,
            postal_code: shippingAddress.postalCode,
            // NOTE: The backend will derive city/country from this
          },
          customer: {
            name: user.displayName || 'N/A',
            email: user.email || 'N/A',
            phone: shippingAddress.phone || 'N/A', // Using phone from address form
          },
        };

        // Type the expected response correctly
        const result = await getShiplogicRates(requestData) as { data: { rates: ShippingRate[] } };
        
        if (result.data && result.data.rates && result.data.rates.length > 0) {
          setShippingRates(result.data.rates);
        } else {
          toast({ title: 'No Shipping Rates', description: 'We couldn\'t find any shipping options for your address.', variant: 'destructive' });
        }

      } catch (error: any) {
        console.error('Error fetching shipping rates:', error);
        // The backend now sends specific error messages
        const errorMessage = error.details?.message || error.message || 'An unexpected error occurred.';
        toast({ title: 'Error Fetching Rates', description: errorMessage, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, [cart, dispensary.id, shippingAddress, user, toast]);

  const handleSelectRate = (rateId: string) => {
    const rate = shippingRates.find(r => r.id === rateId) || null;
    setSelectedRate(rate);
  };

  const handleContinue = () => {
    if (selectedRate) {
      onMethodSelect(selectedRate);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Method</CardTitle>
        <CardDescription>Select a shipping option for your order.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Fetching rates...</p>
          </div>
        ) : shippingRates.length === 0 ? (
            <div className='text-center text-muted-foreground'>
                <p>No shipping methods available for your address.</p>
                <p>Please check your address details or contact support.</p>
            </div>
        ) : (
          <RadioGroup onValueChange={handleSelectRate}>
            {shippingRates.map((rate) => (
                <Label key={rate.id} htmlFor={rate.id} className="flex items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  <div className="flex items-center space-x-4">
                    <RadioGroupItem value={rate.id} id={rate.id} />
                    <div>
                      <p className='font-semibold'>{rate.courier_name} ({rate.service_level})</p>
                      <p className='text-sm text-muted-foreground'>{rate.delivery_time}</p>
                    </div>
                  </div>
                  <p className='text-lg font-bold'>R {rate.rate.toFixed(2)}</p>
                </Label>
            ))}
          </RadioGroup>
        )}

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>Back to Address</Button>
          <Button onClick={handleContinue} disabled={!selectedRate || isLoading}>
            Continue to Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
