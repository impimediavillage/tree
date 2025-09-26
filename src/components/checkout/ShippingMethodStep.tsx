
'use client';

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { CartItem as CartItemType, Dispensary } from '@/types'; // Assuming types
import { type ShippingAddressFormData } from './ShippingAddressStep';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Define the structure of a rate returned from our Cloud Function
interface ShippingRate {
  service_level: string;
  rate: number;
  courier_name: string;
  estimated_delivery: string;
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
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchRates = async () => {
      setIsLoading(true);
      try {
        const functions = getFunctions();
        const getShiplogicRates = httpsCallable(functions, 'getShiplogicRates');
        
        // Prepare the data payload for the Cloud Function
        const requestData = {
          destination: {
            street: shippingAddress.street,
            suburb: shippingAddress.suburb,
            city: shippingAddress.city,
            province: shippingAddress.province,
            postalCode: shippingAddress.postalCode,
            country: shippingAddress.country,
          },
          destinationContactName: shippingAddress.name || 'N/A',
          destinationContactPhone: shippingAddress.phone || 'N/A',
          cartItems: cart.map(item => ({
            // Ensure you have these fields on your cart items!
            // This might require adjusting your CartContext
            sku: item.id, // Assuming product ID is the SKU
            description: item.name,
            quantity: item.quantity,
            price: item.price,
            weight: item.weight || 0.1, // Defaulting to 100g if not present
            length: item.length || 10,
            width: item.width || 10,
            height: item.height || 10,
          })),
        };

        const result = await getShiplogicRates(requestData) as { data: { rates: ShippingRate[] } };
        
        if (result.data.rates && result.data.rates.length > 0) {
          setShippingRates(result.data.rates);
        } else {
          toast({ title: 'No Shipping Rates', description: 'We couldn\'t find any shipping options for your address.', variant: 'destructive' });
        }

      } catch (error: any) {
        console.error('Error fetching shipping rates:', error);
        toast({ title: 'Error', description: error.message || 'An unexpected error occurred while fetching shipping rates.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRates();
  }, [cart, shippingAddress, toast]);

  const handleSelectRate = (rateId: string) => {
    const rate = shippingRates.find(r => `${r.courier_name}-${r.service_level}` === rateId) || null;
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
            <p className="ml-4 text-muted-foreground">Fetching shipping rates...</p>
          </div>
        ) : (
          <RadioGroup onValueChange={handleSelectRate}>
            {shippingRates.map((rate, index) => {
              const rateId = `${rate.courier_name}-${rate.service_level}`;
              return (
                <Label key={index} htmlFor={rateId} className="flex items-center justify-between rounded-md border-2 bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                  <div className="flex items-center space-x-4">
                    <RadioGroupItem value={rateId} id={rateId} />
                    <div>
                      <p className='font-semibold'>{rate.courier_name} ({rate.service_level})</p>
                      <p className='text-sm text-muted-foreground'>Estimated Delivery: {rate.estimated_delivery}</p>
                    </div>
                  </div>
                  <p className='text-lg font-bold'>R {rate.rate.toFixed(2)}</p>
                </Label>
              );
            })}
             {/* Add other shipping options like 'Collection' here */}
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
