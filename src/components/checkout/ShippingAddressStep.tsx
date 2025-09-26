
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define the Zod schema for the shipping address
const addressSchema = z.object({
  street: z.string().min(3, 'Street address is required'),
  suburb: z.string().min(2, 'Suburb is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  country: z.string().default('South Africa'),
  // Optional fields
  name: z.string().optional(),
  phone: z.string().optional(),
});

export type ShippingAddressFormData = z.infer<typeof addressSchema>;

interface ShippingAddressStepProps {
  user: any; // Using `any` for now, will be replaced with your User type
  onAddressSubmit: (data: ShippingAddressFormData) => void;
}

export function ShippingAddressStep({ user, onAddressSubmit }: ShippingAddressStepProps) {
  const form = useForm<ShippingAddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      // Pre-fill with user data if available
      name: user?.displayName || '',
      phone: user?.phoneNumber || '', // Assuming you have a `phoneNumber` field
      street: '',
      suburb: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'South Africa',
    },
  });

  function onSubmit(data: ShippingAddressFormData) {
    onAddressSubmit(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Address</CardTitle>
        <CardDescription>Enter the address where you want to receive your order.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Full Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="082 123 4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main Street" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="suburb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suburb</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Sandton" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Johannesburg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Gauteng" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 2196" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="pt-4">
                 <Button type="submit" className="w-full">Continue to Shipping</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
