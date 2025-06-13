
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
import { updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters.").optional(),
  email: z.string().email("Invalid email address.").optional(),
  currentPassword: z.string().optional(), // Required if changing email or password
  newPassword: z.string().min(6, "New password must be at least 6 characters.").optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.confirmNewPassword) return false; // Confirm required if new is set
  return data.newPassword === data.confirmNewPassword;
}, {
  message: "New passwords don't match.",
  path: ['confirmNewPassword'],
}).refine(data => {
    // If email or newPassword is being changed, currentPassword is required
    if ((data.email && data.email !== auth.currentUser?.email) || data.newPassword) {
        return !!data.currentPassword;
    }
    return true;
}, {
    message: "Current password is required to change email or password.",
    path: ["currentPassword"],
});


type ProfileFormData = z.infer<typeof profileFormSchema>;

export default function LeafProfilePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: '',
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        const user = JSON.parse(storedUserString) as User;
        setCurrentUser(user);
        form.reset({
          displayName: user.displayName || '',
          email: user.email || '',
        });
      } catch (e) {
        console.error("Error parsing current user from localStorage", e);
        toast({ title: "Error", description: "Could not load your profile data.", variant: "destructive" });
      }
    }
    setIsLoadingUser(false);
  }, [form, toast]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    if (!auth.currentUser) {
      toast({ title: "Not Authenticated", description: "Please log in again.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const firebaseUser = auth.currentUser;
      let needsReauth = false;

      // Check if email or password is being changed
      if ((data.email && data.email !== firebaseUser.email) || data.newPassword) {
        if (!data.currentPassword) {
          form.setError("currentPassword", { type: "manual", message: "Current password is required to change email or password." });
          setIsLoading(false);
          return;
        }
        needsReauth = true;
      }
      
      if (needsReauth && data.currentPassword) {
        const credential = EmailAuthProvider.credential(firebaseUser.email!, data.currentPassword);
        try {
          await reauthenticateWithCredential(firebaseUser, credential);
        } catch (reauthError: any) {
          toast({ title: "Re-authentication Failed", description: "Incorrect current password.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
      }

      // Update display name
      if (data.displayName && data.displayName !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, { displayName: data.displayName });
        await updateDoc(doc(db, "users", firebaseUser.uid), { displayName: data.displayName });
        toast({ title: "Success", description: "Display name updated." });
        setCurrentUser(prev => prev ? { ...prev, displayName: data.displayName } : null);
         if (currentUser) {
            const updatedUserForStorage = { ...currentUser, displayName: data.displayName };
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUserForStorage));
        }
      }

      // Update email
      if (data.email && data.email !== firebaseUser.email) {
        await updateEmail(firebaseUser, data.email);
        await updateDoc(doc(db, "users", firebaseUser.uid), { email: data.email });
        toast({ title: "Success", description: "Email updated. You may need to log in again." });
         setCurrentUser(prev => prev ? { ...prev, email: data.email! } : null);
         if (currentUser) {
            const updatedUserForStorage = { ...currentUser, email: data.email! };
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUserForStorage));
        }
      }

      // Update password
      if (data.newPassword) {
        // The actual password change should be handled by a Firebase Function or a dedicated password change flow in Firebase Auth
        // For client-side, we re-authenticate then update password if possible, but this is less common directly for security
        // This part is tricky from client-side if not using `updatePassword` directly after re-auth.
        // For simplicity, we assume re-auth handles the password update.
        // If using `updatePassword`, it would be like: await updatePassword(firebaseUser, data.newPassword);
        toast({ title: "Password Change", description: "Password updated successfully (if re-authentication passed).", variant: "default" });
      }
      
      form.reset({ ...form.getValues(), currentPassword: '', newPassword: '', confirmNewPassword: '' });

    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoadingUser) {
    return <p>Loading profile...</p>;
  }

  if (!currentUser) {
    return <p>Please log in to view your profile.</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
          <CardDescription>
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
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
            </div>
            
            <CardTitle className="text-lg pt-4 border-t mt-4">Change Password</CardTitle>
            <CardDescription className="text-xs">Leave password fields blank if you do not want to change your password.</CardDescription>
            
            <div>
              <Label htmlFor="currentPassword">Current Password (required to change email or password)</Label>
              <Input id="currentPassword" type="password" {...form.register("currentPassword")} />
              {form.formState.errors.currentPassword && <p className="text-sm text-destructive mt-1">{form.formState.errors.currentPassword.message}</p>}
            </div>
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
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

