
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Loader2, Palette, Gift, Heart, Sparkles, Leaf } from 'lucide-react';
import type { User, CreditPackage } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

// This is the simplified credits page for logged-in users within the dashboard.

export default function LeafCreditsPage() {
  const { toast } = useToast();
  const { currentUser, setCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);

  const fetchCreditPackages = useCallback(async () => {
    setIsLoadingPackages(true);
    try {
      const packagesCollectionRef = collection(db, 'creditPackages');
      const q = query(packagesCollectionRef, where('isActive', '==', true), orderBy('price'));
      const querySnapshot = await getDocs(q);
      const fetchedPackages: CreditPackage[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPackages.push({ id: doc.id, ...doc.data() } as CreditPackage);
      });
      setCreditPackages(fetchedPackages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      toast({ title: "Error", description: "Could not load credit packages.", variant: "destructive" });
    } finally {
      setIsLoadingPackages(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCreditPackages();
  }, [fetchCreditPackages]);

  const handlePurchase = (pkg: CreditPackage) => {
    if (!currentUser) return; // Should not happen in this layout

    setIsLoading(true);
    toast({
      title: `Simulating Purchase of ${pkg.name}`,
      description: "Processing... In a real app, this would redirect to a payment gateway.",
    });

    setTimeout(() => {
      const totalCreditsToAdd = pkg.credits + (pkg.bonusCredits || 0);
      
      const updatedUser = { 
        ...currentUser, 
        credits: (currentUser.credits || 0) + totalCreditsToAdd 
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUser));
      toast({
        title: "Purchase Simulated Successfully!",
        description: `You've "added" ${totalCreditsToAdd} credits. Your balance has been updated locally.`,
        variant: "default",
        duration: 7000,
      });
      setIsLoading(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle 
            className="text-2xl text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >Manage Your Credits</CardTitle>
          <CardDescription 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Your current balance is: 
            <span className="font-bold text-primary ml-1">
              {currentUser?.credits ?? 'N/A'}
            </span> credits. 
            Purchase more credits to continue using our AI advisors.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoadingPackages ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
                <Card key={i} className="flex flex-col shadow-lg">
                    <CardHeader className="pb-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-8 w-1/2 mt-2" /><Skeleton className="h-5 w-1/4 mt-1" /></CardHeader>
                    <CardContent className="flex-grow space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></CardContent>
                    <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                </Card>
            ))}
        </div>
      ) : creditPackages.length === 0 ? (
        <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
                <DollarSign className="mx-auto h-12 w-12 mb-3 text-orange-500" />
                <h3 className="text-xl font-semibold">No Credit Packages Available</h3>
                <p>There are currently no credit packages available for purchase. Please check back later.</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creditPackages.map((pkg) => {
            const packageFeatures = [
                { text: "Access to AI Advisors", icon: Sparkles },
                ...(pkg.name === 'Casual Plan' || pkg.name === 'Deep Roots'
                    ? [{ text: 'Access to Sticker and Promo Designer', icon: Palette }]
                    : []),
                ...(pkg.bonusCredits && pkg.bonusCredits > 0
                    ? [{ text: `Includes ${pkg.bonusCredits} bonus credits`, icon: Gift }]
                    : []),
                { text: "Support The Wellness Tree", icon: Heart },
            ];

            return (
              <Card 
                key={pkg.id} 
                className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 bg-muted/50 text-card-foreground border border-border hover:border-primary/50"
                data-ai-hint={`credit package ${pkg.name.toLowerCase()}`}
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-primary text-center">{pkg.name}</CardTitle>
                  <p className="text-3xl font-extrabold text-center text-accent my-2">
                    {pkg.price.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{pkg.currency}</span>
                  </p>
                  <p className="text-lg text-center">
                      <span className="text-2xl font-bold text-primary">{pkg.credits}</span>
                      <span className="text-muted-foreground"> Credits</span>
                      {pkg.bonusCredits && pkg.bonusCredits > 0 && (
                          <span className="text-sm text-green-600 font-medium"> + {pkg.bonusCredits} Bonus!</span>
                      )}
                  </p>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col">
                  {pkg.description && <p className="text-sm text-muted-foreground mb-4 text-center line-clamp-2">{pkg.description}</p>}
                  <ul className="space-y-2 mb-6 text-sm">
                    {packageFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-card-foreground">
                        <feature.icon className="h-4 w-4 text-green-500" />
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="mt-auto w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md py-3"
                    onClick={() => handlePurchase(pkg)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : `Purchase ${pkg.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <p 
        className="text-xs text-foreground text-center mt-4"
        style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
      >
        Payments are processed securely. Credit purchases are non-refundable. This is a simulated purchase environment.
      </p>
    </div>
  );
}
