
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Leaf } from 'lucide-react';
import { dispensaryOwnerAddLeafUserSchema, type DispensaryOwnerAddLeafUserFormData } from '@/lib/schemas';
import type { User } from '@/types';
import { auth as firebaseAuthInstance, db } from '@/lib/firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface DispensaryAddLeafUserDialogProps {
  onUserAdded: () => void;
  dispensaryId: string;
}

export function DispensaryAddLeafUserDialog({ onUserAdded, dispensaryId }: DispensaryAddLeafUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<DispensaryOwnerAddLeafUserFormData>({
    resolver: zodResolver(dispensaryOwnerAddLeafUserSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      status: 'PendingApproval', // Default to PendingApproval
      credits: 0, // Start with 0 credits, awarded on activation
    },
  });

  const onSubmit = async (data: DispensaryOwnerAddLeafUserFormData) => {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, data.email, data.password);
      const firebaseUser = userCredential.user;

      const newLeafUserData: User = {
        uid: firebaseUser.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: null,
        role: 'LeafUser', 
        dispensaryId: dispensaryId, 
        credits: 0, // Initial credits are 0
        status: 'PendingApproval', // Initial status
        createdAt: serverTimestamp() as any,
        lastLoginAt: null,
        welcomeCreditsAwarded: false, // Initialize as false
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newLeafUserData);

      toast({ title: "Leaf User Added", description: `${data.displayName} has been added and is pending your approval.` });
      onUserAdded();
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error adding Leaf User:", error);
      let errorMessage = "Could not add Leaf User.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use by another account.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. Please choose a stronger password.";
      }
      toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) form.reset({ displayName: '', email: '', password: '', status: 'PendingApproval', credits: 0 }); }}>
      <DialogTrigger asChild>
        <Button variant="default"><Leaf className="mr-2 h-4 w-4" /> Add Leaf User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Leaf User (Linked)</DialogTitle>
          <DialogDescription>Create an account for a Leaf User who will be associated with your dispensary. They will start as 'Pending Approval'.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="displayName" render={({ field }) => (
              <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} placeholder="Leaf User Name" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} placeholder="leaf.user@example.com" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="credits" render={({ field }) => (
              <FormItem><FormLabel>Initial Credits (Awarded on Activation)</FormLabel><FormControl><Input type="number" {...field} readOnly disabled /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Leaf User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
