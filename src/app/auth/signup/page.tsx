
'use client';

import { Suspense } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserPlus, Mail, Lock, ArrowLeft, CheckSquare, Square, Loader2, ListFilter, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { userSignupSchema, type UserSignupFormData } from '@/lib/schemas';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, getDocs, query as firestoreQuery, where, orderBy } from 'firebase/firestore';
import type { User, DispensaryType, CartItem } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';


function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { fetchUserProfile } = useAuth();
  const { loadCart, cartItems } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [wellnessTypes, setWellnessTypes] = useState<DispensaryType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<UserSignupFormData>({
    resolver: zodResolver(userSignupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      preferredDispensaryTypes: [],
    },
  });

  useEffect(() => {
    const cartQueryParam = searchParams?.get('cart');
    if (cartQueryParam && cartItems.length === 0) { // Only load if cart is currently empty
      try {
        const decodedCartString = atob(decodeURIComponent(cartQueryParam));
        const parsedCartItems: CartItem[] = JSON.parse(decodedCartString);
        if (parsedCartItems && parsedCartItems.length > 0) {
          loadCart(parsedCartItems);
          toast({ title: 'Cart Restored', description: 'Your shopping cart is waiting for you.' });
        }
      } catch (error) {
        console.error("Failed to parse and load cart from URL on signup page:", error);
      }
    }
  }, [searchParams, loadCart, toast, cartItems.length]);

  const fetchWellnessTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      const typesCollectionRef = collection(db, 'dispensaryTypes');
      const q = firestoreQuery(typesCollectionRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      const fetchedTypes: DispensaryType[] = querySnapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as DispensaryType))
        .filter(type => type.isActive === true); // Only show active types
      setWellnessTypes(fetchedTypes);
    } catch (error) {
      console.error("Error fetching wellness types for signup:", error);
      toast({ title: "Error", description: "Could not load wellness types. Please try again.", variant: "destructive" });
    } finally {
      setIsLoadingTypes(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchWellnessTypes();
  }, [fetchWellnessTypes]);


  const onSubmit = async (data: UserSignupFormData) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = userCredential.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const newUserDocData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.email?.split('@')[0] || 'New User',
        photoURL: null,
        role: 'LeafUser', 
        credits: 10, 
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        status: 'Active', 
        preferredDispensaryTypes: data.preferredDispensaryTypes || [],
        welcomeCreditsAwarded: true, 
        signupSource: 'public', 
      };
      await setDoc(userDocRef, newUserDocData);
      
      toast({ title: 'Account Created!', description: "You've been successfully signed up. Welcome!" });
      
      await fetchUserProfile(firebaseUser); // This will set the user in the AuthContext

      const redirectUrl = searchParams?.get('redirect');
      if (redirectUrl) {
          router.push(redirectUrl);
      } else {
          router.push('/dashboard/leaf');
      }
 
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = "Failed to create account.";
       if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already in use. Try signing in instead.'; break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.'; break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please choose a stronger password.'; break;
          default:
            errorMessage = `Signup failed: ${error.message}`;
        }
      }
      toast({ title: 'Sign Up Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTypes = form.watch('preferredDispensaryTypes') || [];
  const redirectParam = searchParams?.get('redirect');
  const cartParam = searchParams?.get('cart');
  let signInHref = '/auth/signin';
  const signInParams = new URLSearchParams();
  if (redirectParam) signInParams.append('redirect', redirectParam);
  if (cartParam) signInParams.append('cart', cartParam);
  if (signInParams.toString()) signInHref += `?${signInParams.toString()}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
      <Button variant="outline" size="sm" className="absolute top-4 left-4" asChild>
         <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
       </Button>
      <Card className="w-full max-w-md shadow-xl bg-white/80 overflow-hidden p-0">
        <div className="relative h-80 w-full">
          <Image src="/icons/square2.gif" alt="Wellness Tree" layout="fill" objectFit="contain" className="object-top" />
        </div>
        <CardHeader className="text-center pt-6">
          <UserPlus className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold text-foreground">Create Your Leaf User Account</CardTitle>
          <CardDescription className="text-foreground">Join The Wellness Tree community and unlock amazing features!</CardDescription>
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-400/30">
              <p className="text-xs font-bold text-purple-900 mb-1">🧠 AI Wellness Advisors</p>
              <p className="text-xs text-purple-800">Get personalized advice from AI experts in wellness, growing, and business</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg border border-amber-400/30">
              <p className="text-xs font-bold text-amber-900 mb-1">🎮 Gamified Experience</p>
              <p className="text-xs text-amber-800">Earn XP, level up, unlock achievements, and compete on leaderboards</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-400/30">
              <p className="text-xs font-bold text-emerald-900 mb-1">💰 10 Free Credits + Earn More</p>
              <p className="text-xs text-emerald-800">Start with free credits, earn by designing in Creator Lab - 25% on every sale!</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-400/30">
              <p className="text-xs font-bold text-blue-900 mb-1">🛍️ Multi-Dispensary Shopping</p>
              <p className="text-xs text-blue-800">Browse products from multiple dispensaries in one seamless experience</p>
            </div>
            <div className="p-3 bg-gradient-to-r from-rose-500/20 to-red-500/20 rounded-lg border border-rose-400/30">
              <p className="text-xs font-bold text-rose-900 mb-1">🌟 Become an Influencer</p>
              <p className="text-xs text-rose-800">Join our influencer program and earn by promoting brands you love</p>
            </div>
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
                        <Input type="email" placeholder="you@example.com" {...field} className="pl-10 text-base h-12" disabled={isLoading}/>
                      </div></FormControl>
                    <FormMessage />
                  </FormItem>)}
              />
              <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl><div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type={showPassword ? "text" : "password"} placeholder="Create a strong password" {...field} className="pl-10 pr-10 text-base h-12" disabled={isLoading} />
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
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Confirm Password</FormLabel>
                    <FormControl><div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" {...field} className="pl-10 pr-10 text-base h-12" disabled={isLoading} />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div></FormControl>
                    <FormMessage />
                  </FormItem>)}
              />
              <Controller control={form.control} name="preferredDispensaryTypes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Wellness Type Preferences (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between h-12 text-base font-normal" disabled={isLoadingTypes || isLoading}>
                          <div className="flex items-center gap-2"><ListFilter className="h-5 w-5 text-muted-foreground" />
                            {selectedTypes.length > 0 ? `${selectedTypes.length} type(s) selected` : "Select preferred types..."}
                          </div>
                           {isLoadingTypes && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <ScrollArea className="max-h-60"><div className="p-2 space-y-1">
                            {wellnessTypes.length === 0 && !isLoadingTypes && (<p className="p-2 text-sm text-muted-foreground">No wellness types available.</p>)}
                            {wellnessTypes.map((type) => (
                              <Button key={type.id} variant="ghost" className="w-full justify-start h-auto py-2 px-3" onClick={() => {
                                  const currentSelection = field.value || [];
                                  const newSelection = currentSelection.includes(type.name) ? currentSelection.filter((item) => item !== type.name) : [...currentSelection, type.name];
                                  field.onChange(newSelection);
                                }} disabled={isLoading}>
                                {selectedTypes.includes(type.name) ? <CheckSquare className="mr-2 h-5 w-5 text-primary" /> : <Square className="mr-2 h-5 w-5 text-muted-foreground" />}
                                <div className="flex flex-col items-start">
                                  <span className="text-sm">{type.name}</span>
                                  {type.description && <span className="text-xs text-muted-foreground text-left">{type.description}</span>}
                                </div>
                              </Button>))}
                             <Button key="all-types" variant="ghost" className="w-full justify-start h-auto py-2 px-3 font-semibold" onClick={() => {
                                  const allTypeNames = wellnessTypes.map(dt => dt.name);
                                  const newSelection = selectedTypes.length === allTypeNames.length ? [] : allTypeNames;
                                  field.onChange(newSelection);
                                }} disabled={isLoading}>
                                 {selectedTypes.length === wellnessTypes.length && wellnessTypes.length > 0 ? <CheckSquare className="mr-2 h-5 w-5 text-primary" /> : <Square className="mr-2 h-5 w-5 text-muted-foreground" />}
                                All Wellness Types (Recommended)
                              </Button>
                          </div></ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-foreground">
                      Select types of wellness entities you're interested in to personalize your experience.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>)}
              />
              <Button type="submit" className="w-full text-lg py-6" disabled={isLoading || isLoadingTypes}>
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Account...</> : 'Sign Up'}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href={signInHref} className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SignUpContent />
    </Suspense>
  );
}
