
'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogInIcon, Mail, Lock, ArrowLeft, Loader2, Eye, EyeOff, Sparkles, TreePine, Store, Leaf } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { userSigninSchema, type UserSigninFormData } from '@/lib/schemas';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext'; // Import useCart
import type { User as AppUser, CartItem } from '@/types';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { fetchUserProfile } = useAuth();
  const { loadCart, cartItems } = useCart(); // Get loadCart function and cartItems
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpDialog, setShowSignUpDialog] = useState(false);

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
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4">
       
      <Card className="w-full max-w-md shadow-xl bg-muted/50 border-border/50">
        <CardHeader className="text-center space-y-4">
          {/* Colorful Icon - Centrally Placed */}
          <Link href="/" className="inline-block mx-auto group">
            <div className="flex flex-col items-center gap-3">
              <TreePine className="h-20 w-20 text-[#3D2E17] group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-[#3D2E17] group-hover:text-[#006B3E] transition-colors">
              </span>
            </div>
          </Link>
          
          {/* Back to Front Button */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              Back to front 😊
            </Link>
          </Button>
          
          <div>
            <CardTitle className="text-3xl font-bold text-[#3D2E17]">Welcome Back!</CardTitle>
            <CardDescription className="text-base mt-2">Sign in to access your account and AI advisors.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email Address</FormLabel>
                    <FormControl><div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="email" inputMode="email" placeholder="you@example.com" {...field} className="pl-10 text-base h-12"/>
                    </div></FormControl>
                    <FormMessage />
                  </FormItem>)}
              />
              <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl><div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10 text-base h-12"/>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
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
            <Button variant="link" onClick={handlePasswordReset} disabled={isLoading} className="text-sm text-[#006B3E] font-bold hover:underline">
              Forgot Password?
            </Button>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Button 
              variant="link" 
              onClick={() => setShowSignUpDialog(true)} 
              className="font-extrabold text-[#3D2E17] hover:underline p-0 h-auto"
            >
              Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sign Up Dialog */}
      <Dialog open={showSignUpDialog} onOpenChange={setShowSignUpDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center text-[#3D2E17]">
              Choose Your Path
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              Select the membership type that best fits your needs
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            {/* Create Store Card */}
            <Card className="p-6 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between hover:shadow-xl transition-shadow">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Store className="h-16 w-16 text-[#006B3E]" />
                </div>
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                  Join Our Growing Ecosystem
                </h2>
                <p className="text-base font-semibold text-[#3D2E17] mt-3">
                  Create your own Cannabinoid store, Permaculture / Organic farming store, Homeopathy store, Traditional Medicine store, or Mushroom store.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full"
                >
                  <Link href="/dispensary-signup">Create store</Link>
                </Button>
              </div>
            </Card>

            {/* Become Leaf User Card */}
            <Card className="p-6 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between hover:shadow-xl transition-shadow">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Leaf className="h-16 w-16 text-[#006B3E]" />
                </div>
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                  Need Wellness information now?
                </h2>
                <p className="text-base font-semibold text-[#3D2E17] mt-3">
                  Get instant access now. Sign up as Leaf user and get 10 free credits to get vital wellness info. Remember to connect with a real practitioner as AI can make mistakes.
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <Button 
                  asChild 
                  size="lg" 
                  className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full"
                >
                  <Link href={signUpHref}>Create Free leaf account</Link>
                </Button>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SignInContent />
    </Suspense>
  );
}
