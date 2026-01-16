'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, User as UserIcon, Mail, Phone, MapPin, Shield, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Schema for user profile editing (staff cannot change role/crewMemberType)
const userProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email address").optional(), // Email is read-only
  phone: z.string().optional(),
  dialCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
});

type UserProfileFormData = z.infer<typeof userProfileSchema>;

export default function MyProfilePage() {
  const { currentUser, loading: authLoading, refreshUserProfile, isDispensaryOwner, isVendor, isDriver, isInHouseStaff } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      displayName: '',
      email: '',
      phone: '',
      dialCode: '+27',
      city: '',
      province: '',
      country: '',
    },
  });

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        toast({ title: "Not Found", description: "User profile could not be found.", variant: "destructive" });
        router.push('/dispensary-admin/dashboard');
        return;
      }
      
      // Populate form with current user data
      form.reset({
        displayName: currentUser.displayName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        dialCode: currentUser.dialCode || '+27',
        city: currentUser.city || '',
        province: currentUser.province || '',
        country: currentUser.country || '',
      });
      
      setIsLoading(false);
    }
  }, [currentUser, authLoading, router, toast, form]);

  const onSubmit = async (data: UserProfileFormData) => {
    if (!currentUser?.uid) {
      toast({ title: "Error", description: "User ID not found.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      // Only update allowed fields - CANNOT change role or crewMemberType
      await updateDoc(userRef, {
        displayName: data.displayName,
        phone: data.phone || null,
        dialCode: data.dialCode || null,
        city: data.city || null,
        province: data.province || null,
        country: data.country || null,
        updatedAt: new Date(),
      });

      await refreshUserProfile();

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = () => {
    if (isDispensaryOwner) return <Badge variant="default" className="bg-[#006B3E]">Dispensary Owner</Badge>;
    if (isVendor) return <Badge variant="secondary">Vendor</Badge>;
    if (isDriver) return <Badge variant="secondary">Driver</Badge>;
    if (isInHouseStaff) return <Badge variant="secondary">In-house Staff</Badge>;
    return <Badge variant="outline">Staff Member</Badge>;
  };

  if (isLoading || !currentUser) {
    return (
      <div className="max-w-4xl mx-auto my-8 p-6 space-y-8">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-10 w-2/3" />
        <div className="space-y-4 pt-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UserIcon className="h-8 w-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and contact details
          </p>
        </div>
        {getRoleBadge()}
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Your role ({currentUser.crewMemberType || 'Staff'}) and permissions are managed by the dispensary owner and cannot be changed here.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details. Your email is linked to your account and cannot be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Display Name */}
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder="Your full name" className="pl-10" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      This is how your name appears to customers and in the system.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email (Read-only) */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input {...field} disabled className="pl-10 bg-muted" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Your email is linked to your account and cannot be changed here. Contact the dispensary owner to update.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="dialCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dial Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+27" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input {...field} placeholder="812345678" className="pl-10" />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your contact number for delivery coordination and notifications.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location Details */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Cape Town" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Province / State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Western Cape" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., South Africa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Role Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Role:</span>
              {getRoleBadge()}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Crew Type:</span>
              <span className="text-sm">{currentUser.crewMemberType || 'Not specified'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Dispensary:</span>
              <span className="text-sm">{currentUser.dispensary?.dispensaryName || 'Not assigned'}</span>
            </div>
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your role and permissions are assigned by the dispensary owner. If you need changes to your access level or crew type, please contact your dispensary administrator.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
