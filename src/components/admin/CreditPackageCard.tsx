
'use client';

import * as React from 'react'; 
import type { CreditPackage } from '@/types';
import { Card, CardContent, CardDescription as CardDescriptionComponent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; // Renamed CardDescription to avoid conflict
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, CheckCircle, XCircle, DollarSign, PlusCircleIcon, Gift } from 'lucide-react';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription as DialogDescriptionComponent } from '@/components/ui/dialog'; // Added DialogDescription and aliased
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const creditPackageFormSchema = z.object({
  name: z.string().min(3, "Package name is required."),
  credits: z.coerce.number().int().positive("Credits must be a positive integer."),
  price: z.coerce.number().positive("Price must be a positive number."),
  currency: z.string().length(3, "Currency code (e.g., USD, ZAR) is required.").toUpperCase(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  bonusCredits: z.coerce.number().int().min(0).optional().nullable().default(0),
});
type CreditPackageFormData = z.infer<typeof creditPackageFormSchema>;

interface CreditPackageDialogProps {
  creditPackage?: CreditPackage | null;
  onSave: () => void;
  triggerButton: React.ReactNode; 
}

function EditableCreditPackageDialog({ creditPackage, onSave, triggerButton }: CreditPackageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const { toast } = useToast();
  const isEditing = !!creditPackage;

  const form = useForm<CreditPackageFormData>({
    resolver: zodResolver(creditPackageFormSchema),
    defaultValues: creditPackage ? {
        name: creditPackage.name,
        credits: creditPackage.credits,
        price: creditPackage.price,
        currency: creditPackage.currency,
        description: creditPackage.description || '',
        isActive: creditPackage.isActive,
        bonusCredits: creditPackage.bonusCredits || 0,
    } : {
        name: '', credits: 0, price: 0, currency: 'ZAR', description: '', isActive: true, bonusCredits: 0,
    },
  });
  
  React.useEffect(() => {
    if (creditPackage && isOpen) {
        form.reset({
            name: creditPackage.name,
            credits: creditPackage.credits,
            price: creditPackage.price,
            currency: creditPackage.currency,
            description: creditPackage.description || '',
            isActive: creditPackage.isActive,
            bonusCredits: creditPackage.bonusCredits || 0,
        });
    } else if (!creditPackage && isOpen) {
         form.reset({ name: '', credits: 0, price: 0, currency: 'ZAR', description: '', isActive: true, bonusCredits: 0});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditPackage, isOpen]);


  const onSubmit = async (data: CreditPackageFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && creditPackage?.id) {
        const packageDocRef = doc(db, 'creditPackages', creditPackage.id);
        await updateDoc(packageDocRef, { ...data, updatedAt: serverTimestamp() });
        toast({ title: "Package Updated", description: `${data.name} has been updated.` });
      } else {
        toast({ title: "Error", description: "This dialog is for editing only.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      onSave();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving credit package:", error);
      toast({ title: "Save Failed", description: "Could not save credit package.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add New'} Credit Package</DialogTitle>
          <DialogDescriptionComponent>
            {isEditing ? `Modify details for ${creditPackage?.name}.` : 'Create a new credit package.'}
          </DialogDescriptionComponent>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Package Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Starter Pack" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="credits" render={({ field }) => (
                    <FormItem><FormLabel>Credits</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bonusCredits" render={({ field }) => (
                    <FormItem><FormLabel>Bonus Credits</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} maxLength={3} placeholder="ZAR" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} placeholder="Optional description" /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal text-sm">Active (available for purchase)</FormLabel>
                </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Package'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


interface CreditPackageCardProps {
  creditPackage: CreditPackage;
  onPackageUpdate: () => void; 
  onPackageDelete: (packageId: string, packageName: string) => Promise<void>;
}

export function CreditPackageCard({ creditPackage, onPackageUpdate, onPackageDelete }: CreditPackageCardProps) {
  return (
    <Card 
      className="min-w-[300px] max-w-sm w-full flex-shrink-0 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col animate-fade-in-scale-up"
      style={{ animationFillMode: 'backwards' }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-semibold text-primary">{creditPackage.name}</CardTitle>
            <Badge variant={creditPackage.isActive ? "default" : "outline"} className={creditPackage.isActive ? "bg-green-500 hover:bg-green-600" : ""}>
                {creditPackage.isActive ? <CheckCircle className="mr-1 h-4 w-4" /> : <XCircle className="mr-1 h-4 w-4" />}
                {creditPackage.isActive ? 'Active' : 'Inactive'}
            </Badge>
        </div>
        <CardDescriptionComponent className="text-sm text-muted-foreground truncate h-10">
            {creditPackage.description || 'No description provided.'}
        </CardDescriptionComponent>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center justify-between text-lg">
            <span className="flex items-center text-foreground">
                <DollarSign className="mr-2 h-5 w-5 text-accent" /> Price:
            </span>
            <span className="font-semibold text-accent">
                {creditPackage.price.toFixed(2)} {creditPackage.currency}
            </span>
        </div>
        <div className="flex items-center justify-between text-lg">
             <span className="flex items-center text-foreground">
                <PlusCircleIcon className="mr-2 h-5 w-5 text-blue-500" /> Credits:
            </span>
            <span className="font-semibold text-blue-600">{creditPackage.credits}</span>
        </div>
        {typeof creditPackage.bonusCredits === 'number' && creditPackage.bonusCredits > 0 && (
            <div className="flex items-center justify-between text-lg">
                <span className="flex items-center text-foreground">
                    <Gift className="mr-2 h-5 w-5 text-orange-500" /> Bonus:
                </span>
                <span className="font-semibold text-orange-600">{creditPackage.bonusCredits}</span>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2 border-t pt-4 mt-auto">
        <EditableCreditPackageDialog
            creditPackage={creditPackage}
            onSave={onPackageUpdate}
            triggerButton={
                <Button variant="outline" className="w-full"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
            }
        />
        <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the &quot;{creditPackage.name}&quot; credit package.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onPackageDelete(creditPackage.id!, creditPackage.name)}>
                  Yes, delete package
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </CardFooter>
    </Card>
  );
}

    
