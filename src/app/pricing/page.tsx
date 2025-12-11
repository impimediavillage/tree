
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Truck, Loader2, Palette, Gift, Heart, Sparkles, Leaf, DollarSign } from 'lucide-react';
import type { CreditPackage } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/ui/PageHeader'; // Import the new component
import { Badge } from '@/components/ui/badge';


function SignupPromptDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col h-[90vh] max-h-[700px] bg-card/90 backdrop-blur-md gap-0">
        <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-6 pb-4">
                <DialogHeader className="p-0 text-left">
                <div className="relative h-56 w-full mb-6 rounded-lg overflow-hidden border-border/50 border bg-muted/30">
                    <Image src="/icons/square1.gif" alt="Wellness Tree" layout="fill" objectFit="contain" className="rounded-lg" />
                </div>
                <DialogTitle className="text-2xl font-bold text-[#3D2E17]">Join The Wellness Tree!</DialogTitle>
                <DialogDescription className="mt-2 text-[#3D2E17] font-semibold">
                    To purchase credits and unlock our powerful AI tools, create a free Leaf User account.
                </DialogDescription>
                </DialogHeader>
                <div className="my-6 space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <h4 className="font-bold text-[#3D2E17] flex items-center gap-2">
                      <Gift className="h-8 w-8 text-[#006B3E] flex-shrink-0"/> 
                      10 Free Credits on Sign Up
                    </h4>
                    <p className="text-sm text-[#3D2E17] mt-2">Get 10 free credits to ask any question to our AI advisors. Unlock or enhance your creative flow with our specialized Deep research language Models - LM's. Remember to consult a real practioner with our Find near me feature in all our AI advisor responses.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <h4 className="font-bold text-[#3D2E17] flex items-center gap-2">
                      <Palette className="h-8 w-8 text-[#006B3E] flex-shrink-0"/> 
                     Free access to the Creator Lab 
                    </h4>
                    <p className="text-sm text-[#3D2E17] mt-2">Design your own Print on Demand Black Apparel. 
                      Purchase your unique design or add your apparel design to our "Treehouse store" and EARN A COMMISSION FROM EVERY SALE. The Wellness Tree will handle
                      the printing, and shipping for You. Earn cash and get creating. Easy credit top ups. Weekly payments to South African Bank accounts.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <h4 className="font-bold text-[#3D2E17] flex items-center gap-2">
                      <Sparkles className="h-8 w-8 text-[#006B3E] flex-shrink-0"/> 
                      Learn with AI Deep Research
                    </h4>
                    <p className="text-sm text-[#3D2E17] mt-2">Learn about flowers, permaculture, organic building, natural medicine, traditional medicine, mushrooms, and cannabinoids with our AI Deep Research Language Models (LMs).</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                    <h4 className="font-bold text-[#3D2E17] flex items-center gap-2">
                      <Truck className="h-8 w-8 text-[#006B3E] flex-shrink-0"/> 
                      Door to Door & Locker Shipping
                    </h4>
                    <p className="text-sm text-[#3D2E17] mt-2">Door to door and locker shipping with PUDO and Courier Guy.</p>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <Image src="/images/courier-guy.png" alt="Courier Guy" width={190} height={80} className="object-contain" style={{ maxWidth: '190px' }} />
                      <Image src="/images/pudo.png" alt="PUDO" width={190} height={80} className="object-contain" style={{ maxWidth: '190px' }} />
                    </div>
                </div>
                </div>
            </div>
        </ScrollArea>
        <div className="flex-shrink-0 p-6 pt-4 border-t border-border/50 bg-card/95">
            <Button size="lg" className="w-full text-lg bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" onClick={() => { onOpenChange(false); router.push('/auth/signup'); }}>
                <Leaf className="mr-2 h-6 w-6"/>
                Sign Up For Free
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function PublicCreditsPage() {
  const { toast } = useToast();
  const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [isSignupPromptOpen, setIsSignupPromptOpen] = useState(false);

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
    if (!currentUser) {
      setIsSignupPromptOpen(true);
      return;
    }

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
    <>
      <div className="container mx-auto py-12 px-4 md:px-6 lg:px-8">
        <PageHeader 
            title="Fuel Your Creative Journey"
            description={<p>Credits are your key to unlocking a universe of creative potential. Use them to generate stunning AI-powered designs, get expert advice, and bring your wellness ideas to life.</p>}
        >
            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button 
                    size="lg" 
                    className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl px-8 py-3"
                    onClick={() => router.push('/dashboard/advisors')}
                >
                    <Sparkles className="mr-2 h-6 w-6" />
                    Explore AI Advisors
                </Button>
                {currentUser && !authLoading && (
                    <div className="bg-muted/50 border border-border/50 rounded-lg p-4 shadow-inner">
                        <p className="text-lg text-foreground">
                            Your current balance: 
                            <span className="font-bold text-primary ml-2">{currentUser.credits}</span> credits
                        </p>
                    </div>
                )}
            </div>
        </PageHeader>

        {isLoadingPackages ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3].map(i => (
                  <Card key={i} className="flex flex-col bg-muted/50 border-border/50 shadow-lg">
                      <CardHeader className="pb-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-8 w-1/2 mt-2" /><Skeleton className="h-5 w-1/4 mt-1" /></CardHeader>
                      <CardContent className="flex-grow space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" /></CardContent>
                      <CardFooter><Skeleton className="h-12 w-full" /></CardFooter>
                  </Card>
              ))}
          </div>
        ) : creditPackages.length === 0 ? (
          <Card className="bg-muted/50 border-border/50">
              <CardContent className="pt-6 text-center text-foreground/80">
                  <DollarSign className="mx-auto h-12 w-12 mb-3 text-accent" />
                  <h3 className="text-xl font-extrabold">No Credit Packages Available</h3>
                  <p className="font-semibold">There are currently no credit packages available for purchase. Please check back later.</p>
              </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {creditPackages.map((pkg) => {
              const packageFeatures = [
                  { text: "Access to all AI Advisors", icon: Sparkles },
                  { text: "Sticker & Promo Designer Tools", icon: Palette },
                  ...(pkg.bonusCredits && pkg.bonusCredits > 0
                      ? [{ text: `Includes ${pkg.bonusCredits} bonus credits`, icon: Gift }]
                      : []),
                  { text: "Support The Wellness Tree Initiative", icon: Heart },
              ];

              return (
                <Card 
                  key={pkg.id} 
                  className="flex flex-col shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-muted/50 text-card-foreground border border-border/50 hover:border-primary/60"
                  data-ai-hint={`credit package ${pkg.name.toLowerCase()}`}
                >
                  <CardHeader className="pb-4 text-card-foreground rounded-t-lg">
                    <CardTitle className="text-2xl font-black text-center">{pkg.name}</CardTitle>
                     <p className="text-4xl font-black text-center text-accent my-3 drop-shadow-sm">
                      {pkg.price.toFixed(2)} <span className="text-xl font-bold text-foreground/80">{pkg.currency}</span>
                    </p>
                    <div className="text-xl text-center font-bold">
                        <span className="text-3xl font-black text-green-800 drop-shadow-sm">{pkg.credits}</span>
                        <span className="text-foreground font-bold"> Credits</span>
                        {pkg.bonusCredits && pkg.bonusCredits > 0 && (
                             <Badge variant="default" className="ml-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold">+{pkg.bonusCredits} Bonus</Badge>
                        )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col px-6">
                    {pkg.description && <p className="text-sm font-bold text-foreground/90 mb-5 text-center line-clamp-2 h-10">{pkg.description}</p>}
                    <ul className="space-y-3 mb-6 text-sm font-bold flex-grow">
                      {packageFeatures.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3 text-foreground">
                          <feature.icon className="h-10 w-10 text-green-800" />
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      size="lg"
                      className="mt-auto w-full bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white text-lg font-bold py-6 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                      onClick={() => handlePurchase(pkg)}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : `Purchase Now`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center mt-10">
          Payments are processed securely. Credit purchases are non-refundable. This is a simulated purchase environment.
        </p>
      </div>
      <SignupPromptDialog isOpen={isSignupPromptOpen} onOpenChange={setIsSignupPromptOpen} />
    </>
  );
}
