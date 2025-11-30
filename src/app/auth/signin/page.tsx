
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogInIcon, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { userSigninSchema, type UserSigninFormData } from '@/lib/schemas';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext'; // Import useCart
import type { User as AppUser, CartItem } from '@/types';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { fetchUserProfile } = useAuth();
  const { loadCart, cartItems } = useCart(); // Get loadCart function and cartItems
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserSigninFormData>({
    resolver: zodResolver(userSigninSchema),
    defaultValues: { email: '', password: '', },
  });
  
  useEffect(() => {
    const cartQueryParam = searchParams?.get('cart');
    if (cartQueryParam && cartItems.length === 0) { // Only load if cart is currently empty
      try {
        const decodedCartString = atob(decodeURIComponent(cartQueryParam));
        const parsedCartItems: CartItem[] = JSON.parse(decodedCartString);
        if (parsedCartItems && parsedCartItems.length > 0) {
          loadCart(parsedCartItems);
          toast({ title: 'Cart Restored', description: 'Your shopping cart has been restored.' });
        }
      } catch (error) {
        console.error("Failed to parse and load cart from URL:", error);
        toast({ title: 'Cart Restore Failed', description: 'Could not restore your shopping cart from your previous session.', variant: 'destructive' });
      }
    }
  }, [searchParams, loadCart, toast, cartItems.length]);

  const handleRedirect = (userProfile: AppUser | null) => {
    const redirectUrl = searchParams?.get('redirect');
    if (redirectUrl) {
      router.push(redirectUrl);
      return;
    }
    
    if (!userProfile) {
        toast({ title: 'Redirect Failed', description: 'Could not verify user role.', variant: 'destructive'});
        router.push('/');
        return;
    }
    if (userProfile.role === 'Super Admin') {
      router.push('/admin/dashboard');
    } else if (userProfile.role === 'DispensaryOwner' || userProfile.role === 'DispensaryStaff') {
      router.push('/dispensary-admin/dashboard');
    } else {
      router.push('/dashboard/leaf');
    }
  };

  const onSubmit = async (data: UserSigninFormData) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: 'Login Successful', description: 'Verifying your profile and redirecting...' });
      const userProfile = await fetchUserProfile(userCredential.user);
      handleRedirect(userProfile);
    } catch (error: any) {
      let errorMessage = "Failed to sign in. Please check your credentials.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password.'; break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.'; break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many login attempts. Please try again later.'; break;
          default:
              errorMessage = "An unexpected error occurred. Please try again."
        }
      }
      console.error("Sign-in process failed:", error);
      toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({ title: 'Email Required', description: 'Please enter your email address to reset your password.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Password Reset Email Sent', description: 'If an account exists for this email, a password reset link has been sent.' });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({ title: 'Password Reset Failed', description: error.message || "Could not send password reset email.", variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Construct the sign-up link with existing query params
  const redirectParam = searchParams?.get('redirect');
  const cartParam = searchParams?.get('cart');
  let signUpHref = '/auth/signup';
  const signUpParams = new URLSearchParams();
  if (redirectParam) {
      signUpParams.append('redirect', redirectParam);
  }
  if (cartParam) {
      signUpParams.append('cart', cartParam);
  }
  if (signUpParams.toString()) {
      signUpHref += `?${signUpParams.toString()}`;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
       
      <Card className="w-full max-w-md shadow-xl bg-muted/50 border-border/50">
      <Button variant="outline" size="sm" className="relative top-4 right-4" asChild>
         <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to View Tree</Link>
       </Button>
        <CardHeader className="text-center">
         <CardTitle className="text-3xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>Sign in to access your account and AI advisors.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email Address</FormLabel>
                    <FormControl><div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="email" placeholder="you@example.com" {...field} className="pl-10 text-base h-12"/>
                    </div></FormControl>
                    <FormMessage />
                  </FormItem>)}
              />
              <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl><div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10 text-base h-12"/>
                    </div></FormControl>
                    <FormMessage />
                  </FormItem>)}
              />
              <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...</> : 'Sign In'}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <Button variant="link" onClick={handlePasswordReset} disabled={isLoading} className="text-sm text-primary hover:underline">
              Forgot Password?
            </Button>
          </div>
           <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href={signUpHref} className="font-semibold text-primary hover:underline">
                Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
