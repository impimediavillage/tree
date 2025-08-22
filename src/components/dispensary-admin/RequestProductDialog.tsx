
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Product, PriceTier, Dispensary, ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';

const requestProductSchema = z.object({
  quantityRequested: z.coerce.number().int().positive("Quantity must be a positive number."),
  deliveryAddress: z.string().min(1, "Delivery address is required."),
  contactPerson: z.string().min(1, "Contact person is required."),
  contactPhone: z.string().min(1, "Contact phone is required."),
  preferredDeliveryDate: z.string().optional(),
  note: z.string().optional(),
});
type RequestProductFormData = z.infer<typeof requestProductSchema>;

interface RequestProductDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  tier: PriceTier;
  requesterDispensary: Dispensary;
  onSuccess: () => void;
}

export function RequestProductDialog({ isOpen, onOpenChange, product, tier, requesterDispensary, onSuccess }: RequestProductDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<RequestProductFormData>({
    resolver: zodResolver(requestProductSchema),
    defaultValues: {
      quantityRequested: 1,
      deliveryAddress: requesterDispensary.location,
      contactPerson: currentUser?.displayName || '',
      contactPhone: requesterDispensary.phone,
      preferredDeliveryDate: '',
      note: '',
    },
  });

  const onSubmit = async (data: RequestProductFormData) => {
    if (!currentUser || !requesterDispensary.id) return;
    setIsSubmitting(true);
    
    const requestData: Omit<ProductRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        productId: product.id!,
        productName: product.name,
        productOwnerDispensaryId: product.dispensaryId,
        productOwnerEmail: product.productOwnerEmail,
        productImage: product.imageUrl || null,
        requesterDispensaryId: requesterDispensary.id,
        requesterDispensaryName: requesterDispensary.dispensaryName,
        requesterEmail: currentUser.email,
        quantityRequested: data.quantityRequested,
        preferredDeliveryDate: data.preferredDeliveryDate || null,
        deliveryAddress: data.deliveryAddress,
        contactPerson: data.contactPerson,
        contactPhone: data.contactPhone,
        requestStatus: 'pending_owner_approval',
        notes: data.note ? [{
            note: data.note,
            byName: currentUser.displayName || 'Requester',
            senderRole: 'requester',
            timestamp: new Date(), // Use client-side date for arrays
        }] : [],
        productDetails: {
          name: product.name,
          category: product.category,
          currency: product.currency,
          priceTiers: product.poolPriceTiers || [],
          imageUrl: product.imageUrl || null,
        }
    };

    try {
        await addDoc(collection(db, 'productRequests'), {
            ...requestData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        toast({ title: "Request Sent!", description: `Your request for ${product.name} has been sent.` });
        onSuccess();
    } catch (error) {
        console.error("Error creating product request:", error);
        toast({ title: "Error", description: "Failed to send product request.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request: {product.name}</DialogTitle>
          <DialogDescription>
            Requesting <span className="font-bold">{tier.unit}</span> at <span className="font-bold">{tier.price.toFixed(2)} {product.currency}</span> per unit.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="quantityRequested" render={({ field }) => (
                <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                <FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contactPerson" render={({ field }) => (
                    <FormItem><FormLabel>Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactPhone" render={({ field }) => (
                    <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="preferredDeliveryDate" render={({ field }) => (
                <FormItem><FormLabel>Preferred Delivery Date (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem><FormLabel>Note (Optional)</FormLabel><FormControl><Textarea placeholder="Any special instructions or notes..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
