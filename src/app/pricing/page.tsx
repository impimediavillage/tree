
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Truck, Loader2, Palette, Gift, Heart, Sparkles, Leaf, DollarSign, Zap, Star, Trophy, Rocket, TrendingUp, Users, Crown, Share2, Megaphone, Brain } from 'lucide-react';
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
      <DialogContent className="sm:max-w-md p-0 h-[90vh] max-h-[700px] bg-card/90 backdrop-blur-md overflow-hidden">
        <ScrollArea className="h-full w-full">
            <div className="relative h-80 w-full">
                <Image src="/icons/square1.gif" alt="Wellness Tree" layout="fill" objectFit="cover" />
            </div>
            <div className="p-6">
                <DialogHeader className="p-0 text-left">
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
                <div className="mt-6 pb-6">
                    <Button size="lg" className="w-full text-lg bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" onClick={() => { onOpenChange(false); router.push('/auth/signup'); }}>
                        <Leaf className="mr-2 h-6 w-6"/>
                        Sign Up For Free
                    </Button>
                </div>
            </div>
        </ScrollArea>
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
            title={
              <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                🚀 Fuel Your Creative Empire! 💎
              </span>
            }
            description={
              <p className="text-xl font-bold">
                Credits are your <span className="text-purple-600">secret weapon</span> to unlock <span className="text-pink-600">AI superpowers</span>, 
                create <span className="text-orange-600">epic designs</span>, and build your <span className="text-green-600">wellness empire</span>! 
                Let's get that bag! 💰✨
              </p>
            }
        >
            <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl px-8 py-6 text-lg font-black"
                    onClick={() => router.push('/dashboard/advisors')}
                >
                    <Sparkles className="mr-2 h-6 w-6" />
                    Meet Your AI Squad
                </Button>
                {currentUser && !authLoading && (
                    <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-2 border-emerald-400 rounded-xl p-4 shadow-lg">
                        <p className="text-lg font-black text-foreground">
                            💰 Your Balance: 
                            <span className="text-3xl font-black text-emerald-600 ml-2">{currentUser.credits}</span> 
                            <span className="text-sm font-bold text-muted-foreground ml-1">credits</span>
                        </p>
                    </div>
                )}
            </div>
        </PageHeader>

        {/* Colorful Benefits Showcase - Game Style */}
        <div className="mb-16 space-y-6">
          <h2 className="text-4xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 mb-8">
            💎 Why Credits Are Your Superpower! 💎
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Treehouse Creator Lab */}
            <div className="p-6 bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-xl border-3 border-violet-400/40 shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-xl">
                  <Palette className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-violet-900 dark:text-violet-100">🎨 TREEHOUSE CREATOR LAB</h3>
              </div>
              <p className="text-violet-800 dark:text-violet-200 font-bold text-lg mb-3">
                Drop R50, create FIRE apparel, earn REAL cash! 💰
              </p>
              <ul className="space-y-2 text-violet-700 dark:text-violet-300 font-semibold">
                <li className="flex items-start gap-2">
                  <Zap className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>Just <strong>R50</strong> to design your first P.O.D. apparel!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>Get your own <strong>mini Treehouse store</strong> URL!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trophy className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>Earn <strong>25% commission</strong> on EVERY sale! Cha-ching! 🤑</span>
                </li>
                <li className="flex items-start gap-2">
                  <Rocket className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>We print, ship & handle customers. You just <strong>CASH OUT</strong>!</span>
                </li>
              </ul>
            </div>

            {/* AI Advisors */}
            <div className="p-6 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-xl border-3 border-cyan-400/40 shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-xl">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-cyan-900 dark:text-cyan-100">🤖 AI ADVISOR ARMY</h3>
              </div>
              <p className="text-cyan-800 dark:text-cyan-200 font-bold text-lg mb-3">
                Your wellness knowledge cheat code! 🧠✨
              </p>
              <ul className="space-y-2 text-cyan-700 dark:text-cyan-300 font-semibold">
                <li className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span><strong>Deep research LMs</strong> for mushrooms, herbs, nutrition & more!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>Get <strong>instant answers</strong> to your wellness questions!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="h-5 w-5 mt-0.5 text-red-500 flex-shrink-0" />
                  <span>Connect with <strong>real practitioners</strong> via "Find near me"!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Gift className="h-5 w-5 mt-0.5 text-pink-500 flex-shrink-0" />
                  <span><strong>10 FREE credits</strong> on signup - no card needed!</span>
                </li>
              </ul>
            </div>

            {/* Influencer Program */}
            <div className="p-6 bg-gradient-to-br from-pink-500/20 via-rose-500/20 to-red-500/20 rounded-xl border-3 border-pink-400/40 shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-xl">
                  <Megaphone className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-pink-900 dark:text-pink-100">📣 INFLUENCER HUSTLE</h3>
              </div>
              <p className="text-pink-800 dark:text-pink-200 font-bold text-lg mb-3">
                Turn your followers into PROFIT! 💸
              </p>
              <ul className="space-y-2 text-pink-700 dark:text-pink-300 font-semibold">
                <li className="flex items-start gap-2">
                  <Crown className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span>Share store links, earn <strong>commission on sales</strong>!</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 mt-0.5 text-green-500 flex-shrink-0" />
                  <span><strong>Analytics dashboard</strong> tracks your hustle!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>Build your <strong>wellness empire</strong> with credits!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Rocket className="h-5 w-5 mt-0.5 text-purple-500 flex-shrink-0" />
                  <span>More credits = <strong>More content = More MONEY</strong>! 🔥</span>
                </li>
              </ul>
            </div>

            {/* Credit Benefits */}
            <div className="p-6 bg-gradient-to-br from-emerald-500/20 via-green-500/20 to-teal-500/20 rounded-xl border-3 border-emerald-400/40 shadow-lg hover:shadow-2xl transition-all hover:scale-[1.02] cursor-pointer">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-3 rounded-xl animate-pulse">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100">💰 CREDIT FLEX</h3>
              </div>
              <p className="text-emerald-800 dark:text-emerald-200 font-bold text-lg mb-3">
                Your wallet's new best friend! 🤝
              </p>
              <ul className="space-y-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                <li className="flex items-start gap-2">
                  <Zap className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span><strong>Buy in bulk, save BIG!</strong> Check those bonus credits!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Share2 className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span>Use across <strong>ALL features</strong> - AI, Creator Lab, MORE!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="h-5 w-5 mt-0.5 text-red-500 flex-shrink-0" />
                  <span><strong>Never expire!</strong> Use at your own pace, no rush!</span>
                </li>
                <li className="flex items-start gap-2">
                  <Trophy className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
                  <span><strong>Secure payments</strong> via PayFast - safe & ez!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Call to Action Banner */}
          <div className="mt-8 p-8 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-xl shadow-2xl text-center">
            <h3 className="text-3xl font-black text-white mb-3 drop-shadow-lg">
              🎮 Level Up Your Wellness Game! 🎮
            </h3>
            <p className="text-xl text-white/90 font-bold mb-4">
              Credits unlock EVERYTHING. Creator earnings, AI wisdom, influencer flex - it's all yours!
            </p>
            <p className="text-lg text-white/80 font-semibold">
              👇 Pick your power-up package below! 👇
            </p>
          </div>
        </div>

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
                  { text: "Instant Access to The Creator Lab AI Tools", icon: Palette },
                  { text: "Put your apparel designs in the Treehouse store and earn cash with our apparel print on demand service.", icon: Gift },                   
                  { text: "Wired in Shipping with Courier guy and Pudo for S.A.", icon: Truck },
                  ...(pkg.bonusCredits && pkg.bonusCredits > 0
                      ? [{ text: `Includes ${pkg.bonusCredits} bonus credits`, icon: Gift }]
                      : []),
                  { text: "Shop the Natural way with the Wellness tree", icon: Heart },
              ];

              return (
                <Card 
                  key={pkg.id} 
                  className="flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-card via-card to-muted border-2 border-primary/20 hover:border-primary/60 hover:scale-[1.03] relative overflow-hidden group"
                  data-ai-hint={`credit package ${pkg.name.toLowerCase()}`}
                >
                  {/* Animated Background Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Bonus Badge */}
                  {pkg.bonusCredits && pkg.bonusCredits > 0 && (
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black text-sm px-3 py-1 shadow-lg animate-pulse">
                        🔥 +{pkg.bonusCredits} BONUS!
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4 text-card-foreground rounded-t-lg relative z-10">
                    <CardTitle className="text-3xl font-black text-center bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                      {pkg.name}
                    </CardTitle>
                    <div className="text-center my-4">
                      <div className="inline-block p-4 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl border-2 border-emerald-400/40">
                        <p className="text-5xl font-black text-emerald-600 dark:text-emerald-400 drop-shadow-sm">
                          R{pkg.price.toFixed(0)}
                        </p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-baseline gap-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 px-4 py-2 rounded-full border-2 border-purple-300 dark:border-purple-700">
                        <span className="text-4xl font-black text-purple-700 dark:text-purple-300">{pkg.credits}</span>
                        <span className="text-xl font-bold text-purple-600 dark:text-purple-400">Credits</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-grow flex flex-col px-6 relative z-10">
                    {pkg.description && (
                      <p className="text-sm font-bold text-center mb-5 text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                        {pkg.description}
                      </p>
                    )}
                    
                    <div className="space-y-3 mb-6 flex-grow">
                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border-l-4 border-cyan-500">
                        <Brain className="h-6 w-6 text-cyan-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-foreground">Unlock <strong className="text-cyan-600">ALL AI Advisors</strong> - wellness wisdom on tap!</span>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border-l-4 border-purple-500">
                        <Palette className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-foreground"><strong className="text-purple-600">Creator Lab</strong> access - design & earn 25% forever!</span>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border-l-4 border-green-500">
                        <Gift className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-foreground">List designs in <strong className="text-green-600">Treehouse store</strong> - passive income unlocked!</span>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border-l-4 border-orange-500">
                        <Truck className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-foreground"><strong className="text-orange-600">Courier Guy & Pudo</strong> shipping - SA-wide delivery!</span>
                      </div>
                      
                      <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-lg border-l-4 border-pink-500">
                        <Heart className="h-6 w-6 text-pink-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-bold text-foreground">Shop <strong className="text-pink-600">natural wellness</strong> products - support the movement!</span>
                      </div>
                    </div>
                    
                    <Button 
                      size="lg"
                      className="mt-auto w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white text-lg font-black py-7 transition-all duration-200 transform hover:scale-[1.05] active:scale-[0.98] shadow-xl hover:shadow-2xl border-2 border-white/20"
                      onClick={() => handlePurchase(pkg)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-6 w-6" />
                          POWER UP NOW! 🚀
                        </>
                      )}
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
