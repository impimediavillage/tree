

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
import { Loader2, UserPlus } from 'lucide-react';
import { dispensaryOwnerAddStaffSchema, type DispensaryOwnerAddStaffFormData } from '@/lib/schemas';
import type { User } from '@/types';
import { auth as firebaseAuthInstance, db } from '@/lib/firebase'; 
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface DispensaryAddStaffDialogProps {
  onUserAdded: () => void;
  dispensaryId: string; 
}

export function DispensaryAddStaffDialog({ onUserAdded, dispensaryId }: DispensaryAddStaffDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<DispensaryOwnerAddStaffFormData>({
    resolver: zodResolver(dispensaryOwnerAddStaffSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      status: 'PendingApproval', 
    },
  });

  const onSubmit = async (data: DispensaryOwnerAddStaffFormData) => {
    setIsSubmitting(true);
    try {
      // NOTE: Creating user in client is okay for this internal admin panel,
      // but for public signups, a Cloud Function is better to prevent abuse.
      // Since this is an owner adding staff, we assume they are trusted.
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, data.email, data.password);
      const firebaseUser = userCredential.user;

      const newStaffUserData: User = {
        uid: firebaseUser.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: null,
        role: 'DispensaryStaff', 
        dispensaryId: dispensaryId, // Correctly use the passed dispensaryId
        credits: 0, 
        status: data.status, 
        createdAt: serverTimestamp() as any,
        lastLoginAt: null,
        welcomeCreditsAwarded: false, // Staff don't get welcome credits
        signupSource: 'dispensary_panel',
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newStaffUserData);

      // Send welcome email with store branding
      try {
        await fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: data.email,
            userName: data.displayName,
            userType: 'crew',
            dispensaryId: dispensaryId,
            temporaryPassword: data.password,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the entire operation if email fails
      }

      toast({ title: "Crew Member Added", description: `${data.displayName} has been added successfully. A welcome email has been sent.` });
      onUserAdded();
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error adding staff member:", error);
      let errorMessage = "Could not add crew member.";
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
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) form.reset({displayName: '', email: '', password: '', status: 'PendingApproval'}); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Add Crew Member</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-smooth">
        <DialogHeader>
          <DialogTitle>Add New Crew Member</DialogTitle>
          <DialogDescription>Create an account for a new crew member at your dispensary.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="displayName" render={({ field }) => (
              <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} placeholder="Staff Member Name" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} placeholder="staff@example.com" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Crew Member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
