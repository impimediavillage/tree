
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle } from 'lucide-react';
import { adminAddUserSchema, type AdminAddUserFormData } from '@/lib/schemas';
import type { User, Dispensary } from '@/types';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AddUserDialogProps {
  onUserAdded: () => void;
  dispensaries: Dispensary[];
}

export function AddUserDialog({ onUserAdded, dispensaries }: AddUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<AdminAddUserFormData>({
    resolver: zodResolver(adminAddUserSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      role: 'LeafUser',
      status: 'Active',
      credits: 10,
      dispensaryId: null,
    },
  });

  const watchedRole = form.watch('role');

  useEffect(() => {
    if (watchedRole !== 'DispensaryOwner') {
      form.setValue('dispensaryId', null);
    }
  }, [watchedRole, form]);

  const onSubmit = async (data: AdminAddUserFormData) => {
    setIsSubmitting(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      // Prepare user data for Firestore
      const newUserFirestoreData: Omit<User, 'id'> = {
        uid: firebaseUser.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: null, // Can be updated later by user
        role: data.role,
        status: data.status,
        credits: data.credits,
        dispensaryId: data.role === 'DispensaryOwner' ? data.dispensaryId : null,
        createdAt: serverTimestamp() as any, // Cast to any for serverTimestamp
        lastLoginAt: null,
      };

      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), newUserFirestoreData);

      toast({ title: "User Created", description: `${data.displayName} has been successfully added.` });
      onUserAdded(); // Refresh the user list
      setIsOpen(false);
      form.reset(); // Reset form for next use
    } catch (error: any) {
      console.error("Error creating user:", error);
      let errorMessage = "Could not create user.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak.";
      }
      toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new user account and assign their role and initial settings.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="displayName" render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl><Input {...field} placeholder="John Doe" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl><Input type="email" {...field} placeholder="user@example.com" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="LeafUser">Leaf User</SelectItem>
                    <SelectItem value="DispensaryOwner">Wellness Store Owner</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="User">User (Generic)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {watchedRole === 'DispensaryOwner' && (
              <FormField control={form.control} name="dispensaryId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Associated Wellness Store</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select wellness store (if owner)" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {/* Removed: <SelectItem value="" disabled>Select a wellness store</SelectItem> */}
                      {dispensaries.filter(d => d.status === "Approved").map(d => (
                        <SelectItem key={d.id} value={d.id!}>{d.dispensaryName} ({d.id?.substring(0,6)}...)</SelectItem>
                      ))}
                      {dispensaries.filter(d => d.status === "Approved").length === 0 && <SelectItem value="no-approved-stores" disabled>No approved wellness stores</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormDescription>Required if role is Wellness Store Owner.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="credits" render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Credits</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsOpen(false); form.reset();}} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
