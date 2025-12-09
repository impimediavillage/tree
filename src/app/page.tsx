'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Brain, Loader2, Sparkles, Leaf, Heart, Flower, Sun, Moon, Star, Zap, Wind, Droplet, Flame, TreePine, Sprout, Activity, Atom, Dna, Microscope, Beaker, Pill, Stethoscope, Eye, Smile, Users, UserCheck, Waves, Mountain, Globe, Compass, ShieldCheck, HandHelping, ArrowRight, Coins, ShoppingCart, Truck, DollarSign, Gift, ArrowDown, Settings, Briefcase, Palette } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import type { User, AIAdvisor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdvisorCard } from '@/components/advisors/AdvisorCard';
import { TripleSEntry } from '@/components/features/TripleSEntry';

export default function HolisticAiHubPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [advisors, setAdvisors] = useState<AIAdvisor[]>([]);
  const [isLoadingAdvisors, setIsLoadingAdvisors] = useState(true);

  const fetchAdvisors = useCallback(async () => {
    setIsLoadingAdvisors(true);
    try {
      const advisorsQuery = query(
        collection(db, 'aiAdvisors'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const querySnapshot = await getDocs(advisorsQuery);
      const advisorsData: AIAdvisor[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as AIAdvisor));
      setAdvisors(advisorsData);
    } catch (error) {
      console.error('Error fetching advisors:', error);
    } finally {
      setIsLoadingAdvisors(false);
    }
  }, []);

  useEffect(() => {
    fetchAdvisors();
  }, [fetchAdvisors]);

  const wellnessBenefits = [
    { text: "E-store with product listings, shopping cart, and integrated payments with Payfast.", icon: ShoppingCart },
    { text: "Full e-commerce platform with a unique public URL for your e-store.", icon: Globe },
    { text: "Engage in private, inter-store trading and bulk product transactions.", icon: Truck },
    { text: "Unlimited access to the Product Sharing Pool with other wellness stores.", icon: Users },
    { text: "Payouts paid out once a week direct to your bank account.", icon: DollarSign },
  ];

  const leafUserBenefits = [
    { text: "Can't afford wellness advice? Now You can with The Wellness Tree FREE Leaf package.", icon: Gift },
    { text: "20 FREE CREDITS on sign up for You to get immediate wellness advice. Always add your gender, age, diet,and any medication you are currently on before asking any question from the AI advisors. We want You to get the very best wellness advice without wasting your credits.", icon: Gift },
    { text: "Get instant wellness assistance with already trained, deep research Language models to plan, learn, create your optimum wellness lifestyle.", icon: Gift },
    { text: "Sign up for FREE to browse and shop our hosted wellness profiles.", icon: Gift },
    { text: "Get instant access to all current and NEW AI advisors.", icon: Gift },
  ];


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-12">
      {authLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !currentUser ? (
        <>
        <PageHeader 
            title="The Wellness Tree"
            description={<p>Your holistic wellness hub. Get Wellness assistance instantly and learn - plan - grow with our holistic and informative AI advisors.</p>}
        >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white text-lg font-semibold py-4 px-8 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">
                    <Link href="#advisors-section">
                        <ArrowDown className="mr-2 h-6 w-6" />
                        Explore AI Advisors
                    </Link>
                </Button>
                <Button asChild size="lg" className="bg-[#3D2E17] hover:bg-[#006B3E] active:bg-[#2D1E0F] text-white text-lg font-semibold py-4 px-8 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">
                    <Link href="/browse-dispensary-types">
                        <ShoppingCart className="mr-2 h-6 w-6" />
                        Browse Stores
                    </Link>
                </Button>
            </div>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 2: Create a Store */}
          <Card className="p-8 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Join Our Growing Ecosystem
              </h2>
              <p className="text-lg font-semibold text-foreground/90 mt-2">
                Create you own Cannabinoid store, Permaculture / Organic farming store, Homeopathy store, Traditional Medicine store, or Mushroom store.
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/dispensary-signup">Create store</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Learn more</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Benefits of creating a store or club:</DialogTitle>
                  </DialogHeader>
                  <ul className="space-y-3 p-4">
                    {wellnessBenefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <benefit.icon className="h-12 w-12 text-[#006B3E] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Card 3: Become a Leaf User */}
          <Card className="p-8 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Need Wellness information now?
              </h2>
              <p className="text-lg font-semibold text-foreground/90 mt-2">
                Get instant access now. Sign up as Leaf user and get 10 free credits to get vital wellness info. Remember to connect with a real practitioner as AI can make mistakes.
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/auth/signup">Create Free leaf account</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Learn more</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Benefits of signing up as a Leaf on our Tree:</DialogTitle>
                  </DialogHeader>
                  <ul className="space-y-3 p-4">
                    {leafUserBenefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <benefit.icon className="h-10 w-10 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>
        </>
      ) : (
        <div/>
      )}

      {currentUser && currentUser.role === 'Super Admin' && (
        <Card className="shadow-lg animate-fade-in-scale-up bg-muted/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" /> Welcome, Super Admin!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full md:w-auto text-lg py-3 bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white">
              <Link href="/admin/dashboard">Go to Admin Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {currentUser && (currentUser.role === 'DispensaryOwner' || currentUser.role === 'DispensaryStaff') && (
         <Card className="shadow-lg animate-fade-in-scale-up bg-muted/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-primary" /> Welcome, Wellness Team!
            </CardTitle>
          </CardHeader>
          <CardContent>
             <Button asChild className="w-full md:w-auto text-lg py-3 bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white">
                <Link href="/dispensary-admin/dashboard">Go to Wellness Panel</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {currentUser && (currentUser.role === 'User' || currentUser.role === 'LeafUser') && (
         <PageHeader
            title={`Welcome Back, ${currentUser.displayName || currentUser.email?.split('@')[0]}!`}
            description={<span>Your current balance: <Badge variant="secondary" className="text-md px-2 py-0.5">{currentUser.credits ?? 0} Credits</Badge></span>}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white text-lg" asChild>
                <Link href="/dashboard/leaf">My Dashboard</Link>
                </Button>
                <Button variant="outline" size="lg" className="text-lg" asChild>
                    <Link href="/pricing">Buy More Credits</Link>
                </Button>
            </div>
          </PageHeader>
      )}

      <div id="advisors-section" style={{ scrollMarginTop: '100px' }} />
      <section className="p-8 rounded-lg animate-fade-in-scale-up bg-muted/50 border-border/50 shadow-lg" style={{ animationFillMode: 'backwards', animationDelay: '0.3s' }}>
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-2">
            <Brain className="h-14 w-14 text-[#006B3E]"/> Explore Our AI Advisors
          </h2>
          <p className="text-lg font-semibold text-foreground/90 max-w-2xl mx-auto mt-3">
            Get specialized insights and recommendations across various domains of holistic wellness and knowledge.
          </p>
          {currentUser && (
            <p className="text-sm text-muted-foreground mt-2">
              Your credits: <span className="font-semibold text-primary">{currentUser.credits ?? 0}</span>
            </p>
          )}
        </div>
        {isLoadingAdvisors ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : advisors.length === 0 ? (
          <div className="text-center py-16">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No advisors available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advisors.map((advisor) => (
              <AdvisorCard key={advisor.id} advisor={advisor} />
            ))}
          </div>
        )}
      </section>

      {/* Creator Lab & Triple S Club Side by Side */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16 animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.4s' }}>
        <Card
          className="shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col border-2 border-primary/50 bg-muted/50"
          data-ai-hint="promo asset generator"
        >
          <CardHeader className="text-center p-6">
              <Palette className="mx-auto h-16 w-16 text-[#006B3E] mb-3"/>
              <CardTitle className="text-4xl font-black text-[#3D2E17]">Join the Creator Lab</CardTitle>
              <CardDescription className="text-[#3D2E17] font-bold max-w-2xl mx-auto text-lg">
                Sign up for FREE as a leaf user. Buy budget friendly credits to chat to our AI research advisors, or dive into our AI Creator Lab and create your own apparel and print on demand caps, hoodies, tshirts. Earn cash and sell your designs in our Tree house collective store. Bring your creations to life. Lets go !!
              </CardDescription>
          </CardHeader>
          <CardFooter className="p-6 pt-0 flex justify-center">
             <Button asChild size="lg" className="text-lg bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white font-semibold py-4 px-8 rounded-full shadow-lg">
              <Link href="/auth/signup">
                <Sparkles className="mr-2 h-6 w-6" />
                Sign up
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <div>
          <TripleSEntry />
        </div>
      </section>
      
    </div>
  );
}
