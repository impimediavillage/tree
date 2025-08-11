
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, ArrowLeft, CheckSquare, Square, Loader2, ListFilter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { userSignupSchema, type UserSignupFormData } from '@/lib/schemas';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, getDocs, query as firestoreQuery, orderBy } from 'firebase/firestore';
import type { User as AppUser, DispensaryType } from 'functions/src/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';


export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { fetchUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [wellnessTypes, setWellnessTypes] = useState<DispensaryType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  const form = useForm<UserSignupFormData>({
    resolver: zodResolver(userSignupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      preferredDispensaryTypes: [],
    },
  });

  const fetchWellnessTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      const typesCollectionRef = collection(db, 'dispensaryTypes');
      const q = firestoreQuery(typesCollectionRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      const fetchedTypes: DispensaryType[] = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as DispensaryType));
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
      const newUserDocData: Omit<AppUser, 'id' | 'dispensary' | 'dispensaryStatus' | 'lastLoginAt' > = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.email?.split('@')[0] || 'New User',
        photoURL: null,
        role: 'LeafUser', 
        credits: 10, 
        createdAt: serverTimestamp() as any,
        status: 'Active', 
        preferredDispensaryTypes: data.preferredDispensaryTypes || [],
        welcomeCreditsAwarded: true, 
        signupSource: 'public', 
      };
      await setDoc(userDocRef, newUserDocData);
      
      toast({
        title: 'Account Created!',
        description: "You've been successfully signed up and logged in. Welcome!",
      });
      
      const userProfile = await fetchUserProfile(firebaseUser);
      if (userProfile) {
        router.push('/dashboard/leaf');
      } else {
        throw new Error("Could not fetch profile for new user, even after creation.");
      }
 
    } catch (error: any) {
      console.error("Signup error:", error);
      let errorMessage = "Failed to create account.";
       if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email address is already in use.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/weak-password':
            errorMessage = 'The password is too weak. Please choose a stronger password.';
            break;
          default:
            errorMessage = `Signup failed: ${error.message}`;
        }
      }
      toast({
        title: 'Sign Up Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTypes = form.watch('preferredDispensaryTypes') || [];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
      <Button variant="outline" size="sm" className="absolute top-4 left-4" asChild>
         <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
       </Button>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle 
            className="text-3xl font-bold text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >Create Your Leaf User Account</CardTitle>
          <CardDescription 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >Join The Wellness Tree community and explore wellness.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email Address</FormLabel>
                     <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="email" 
                          placeholder="you@example.com" 
                          {...field} 
                          className="pl-10 text-base h-12"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="Create a strong password" 
                          {...field} 
                          className="pl-10 text-base h-12"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="Re-enter your password" 
                          {...field} 
                          className="pl-10 text-base h-12"
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Controller
                control={form.control}
                name="preferredDispensaryTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Wellness Type Preferences (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-12 text-base font-normal"
                          disabled={isLoadingTypes || isLoading}
                        >
                          <div className="flex items-center gap-2">
                            <ListFilter className="h-5 w-5 text-muted-foreground" />
                            {selectedTypes.length > 0 ? `${selectedTypes.length} type(s) selected` : "Select preferred types..."}
                          </div>
                           {isLoadingTypes && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <ScrollArea className="max-h-60">
                          <div className="p-2 space-y-1">
                            {wellnessTypes.length === 0 && !isLoadingTypes && (
                                <p className="p-2 text-sm text-muted-foreground">No wellness types available.</p>
                            )}
                            {wellnessTypes.map((type) => (
                              <Button
                                key={type.id}
                                variant="ghost"
                                className="w-full justify-start h-auto py-2 px-3"
                                onClick={() => {
                                  const currentSelection = field.value || [];
                                  const newSelection = currentSelection.includes(type.name)
                                    ? currentSelection.filter((item) => item !== type.name)
                                    : [...currentSelection, type.name];
                                  field.onChange(newSelection);
                                }}
                                disabled={isLoading}
                              >
                                {selectedTypes.includes(type.name) ? (
                                  <CheckSquare className="mr-2 h-5 w-5 text-primary" />
                                ) : (
                                  <Square className="mr-2 h-5 w-5 text-muted-foreground" />
                                )}
                                <div className="flex flex-col items-start">
                                  <span className="text-sm">{type.name}</span>
                                  {type.description && <span className="text-xs text-muted-foreground text-left">{type.description}</span>}
                                </div>
                              </Button>
                            ))}
                             <Button
                                key="all-types"
                                variant="ghost"
                                className="w-full justify-start h-auto py-2 px-3 font-semibold"
                                onClick={() => {
                                  const allTypeNames = wellnessTypes.map(dt => dt.name);
                                  const newSelection = selectedTypes.length === allTypeNames.length 
                                    ? [] 
                                    : allTypeNames;
                                  field.onChange(newSelection);
                                }}
                                disabled={isLoading}
                              >
                                 {selectedTypes.length === wellnessTypes.length && wellnessTypes.length > 0 ? (
                                  <CheckSquare className="mr-2 h-5 w-5 text-primary" />
                                ) : (
                                  <Square className="mr-2 h-5 w-5 text-muted-foreground" />
                                )}
                                All Wellness Types (Recommended)
                              </Button>
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormDescription 
                        className="text-foreground"
                        style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
                    >
                      Select types of wellness entities you're interested in to personalize your experience.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <Button 
                type="submit" 
                className="w-full text-lg py-6" 
                disabled={isLoading || isLoadingTypes}
              >
                {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating Account...</> : 'Sign Up'}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    