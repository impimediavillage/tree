
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';


const profileFormSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters.").optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.confirmNewPassword) return false;
  return data.newPassword === data.confirmNewPassword;
}, {
  message: "New passwords don't match.",
  path: ['confirmNewPassword'],
}).refine(data => {
    if (data.newPassword) {
        return !!data.currentPassword;
    }
    return true;
}, {
    message: "Current password is required to change your password.",
    path: ["currentPassword"],
});


type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function LeafProfilePage() {
  const { toast } = useToast();
  const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if user is from checkout (they don't know their auto-generated password)
  const isCheckoutUser = currentUser?.signupSource === 'checkout';

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  useEffect(() => {
    if (currentUser) {
        form.reset({
          displayName: currentUser.displayName || '',
        });
    }
  }, [currentUser, form]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    if (!auth.currentUser) {
      toast({ title: "Not Authenticated", description: "Please log in again.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const firebaseUser = auth.currentUser;
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      let somethingChanged = false;

      // Update display name if it has changed
      if (data.displayName && data.displayName !== currentUser?.displayName) {
        await updateProfile(firebaseUser, { displayName: data.displayName });
        await updateDoc(userDocRef, { displayName: data.displayName });
        
        setCurrentUser(prev => prev ? { ...prev, displayName: data.displayName } : null);
        somethingChanged = true;
      }
      
      // Update password if new password is provided
      if (data.newPassword) {
        // Check if this is a checkout user (they don't know their auto-generated password)
        const isCheckoutUser = currentUser?.signupSource === 'checkout';
        
        if (isCheckoutUser) {
          // For checkout users, we can update password without re-authentication
          // since they were just created and don't know their random password
          try {
            await updatePassword(firebaseUser, data.newPassword);
            // Update signupSource to indicate they've set their own password
            await updateDoc(userDocRef, { signupSource: 'checkout-completed' });
            setCurrentUser(prev => prev ? { ...prev, signupSource: 'checkout-completed' } : null);
            somethingChanged = true;
          } catch (error: any) {
            if (error.code === 'auth/requires-recent-login') {
              // User needs to be reauthenticated - send them to re-login
              toast({ 
                title: "Session Expired", 
                description: "Please log out and log back in to update your password.",
                variant: "destructive" 
              });
              setIsLoading(false);
              return;
            }
            throw error;
          }
        } else {
          // For regular users, require current password
          if (!data.currentPassword) {
            toast({ 
              title: "Current Password Required", 
              description: "Please enter your current password to change it.",
              variant: "destructive" 
            });
            setIsLoading(false);
            return;
          }
          const credential = EmailAuthProvider.credential(firebaseUser.email!, data.currentPassword);
          await reauthenticateWithCredential(firebaseUser, credential);
          await updatePassword(firebaseUser, data.newPassword);
          somethingChanged = true;
        }
      }
      
      if(somethingChanged) {
        toast({ title: "Success", description: "Your profile has been updated." });
        form.reset({ ...form.getValues(), currentPassword: '', newPassword: '', confirmNewPassword: '' });
      } else {
        toast({ title: "No Changes", description: "You did not make any changes to your profile.", variant: "default" });
      }

    } catch (error: any) {
      console.error("Profile update error:", error);
      let description = "Could not update profile.";
      if (error.code === 'auth/wrong-password') {
          description = "The current password you entered is incorrect.";
      } else if (error.message) {
          description = error.message;
      }
      toast({ title: "Update Failed", description: description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (authLoading) {
    return <p>Loading profile...</p>;
  }

  if (!currentUser) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle 
            className="text-2xl text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >My Profile</CardTitle>
          <CardDescription 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Update your personal information and manage your account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" {...form.register("displayName")} />
              {form.formState.errors.displayName && <p className="text-sm text-destructive mt-1">{form.formState.errors.displayName.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={currentUser.email} disabled readOnly />
               <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
            </div>
            
            <CardTitle 
              className="text-lg pt-4 border-t mt-4 text-foreground"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >Change Password</CardTitle>
            <CardDescription 
                className="text-xs text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              {isCheckoutUser 
                ? "Set your new password below. You don't need your current password since your account was just created." 
                : "Leave password fields blank if you do not want to change your password."}
            </CardDescription>
            
            {!isCheckoutUser && (
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" {...form.register("currentPassword")} />
                {form.formState.errors.currentPassword && <p className="text-sm text-destructive mt-1">{form.formState.errors.currentPassword.message}</p>}
              </div>
            )}
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" {...form.register("newPassword")} />
              {form.formState.errors.newPassword && <p className="text-sm text-destructive mt-1">{form.formState.errors.newPassword.message}</p>}
            </div>
            <div>
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input id="confirmNewPassword" type="password" {...form.register("confirmNewPassword")} />
              {form.formState.errors.confirmNewPassword && <p className="text-sm text-destructive mt-1">{form.formState.errors.confirmNewPassword.message}</p>}
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-[#5D4E37] active:bg-primary/80 text-primary-foreground transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
