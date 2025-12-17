'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Brain, Loader2, Sparkles, Leaf, Heart, Flower, Sun, Moon, Star, Zap, Wind, Droplet, Flame, TreePine, Sprout, Activity, Atom, Dna, Microscope, Beaker, Pill, Stethoscope, Eye, Smile, Users, UserCheck, Waves, Mountain, Globe, Compass, ShieldCheck, HandHelping, ArrowRight, Coins, ShoppingCart, Truck, DollarSign, Gift, ArrowDown, Settings, Briefcase, Palette, Store } from 'lucide-react';
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
    { text: "Secure payment processing with trusted South African payment gateway Payfast.", icon: ShieldCheck },
    { text: "Manage inventory, orders, and customer relationships with ease.", icon: Settings },
    { text: "Build your brand and reach customers across South Africa.", icon: Briefcase },
  ];

  const leafUserBenefits = [
    { text: "Can't afford wellness advice? Now You can with The Wellness Tree FREE Leaf package.", icon: Gift },
    { text: "10 FREE CREDITS on sign up for You to get immediate wellness advice. Always add your gender, age, diet,and any medication you are currently on before asking any question from the AI advisors. We want You to get the very best wellness advice without wasting your credits.", icon: Gift },
    { text: "Get instant wellness assistance with already trained, deep research Language models to plan, learn, create your optimum wellness lifestyle.", icon: Gift },
    { text: "Sign up for FREE to browse and shop our hosted wellness profiles.", icon: Gift },
    { text: "Get instant access to all current and NEW AI advisors.", icon: Gift },
  ];

  const treehouseBenefits = [
    { text: "Create your own mini-store with a unique URL - e.g., thewellnesstree.co.za/treehouse/store/your-brand", icon: Globe },
    { text: "Design custom apparel (t-shirts, hoodies, caps) using AI-powered Creator Lab.", icon: Palette },
    { text: "Earn 25% commission on every sale - R100 on a R400 hoodie!", icon: DollarSign },
    { text: "Request payouts from your dashboard once you reach R500 minimum.", icon: Coins },
    { text: "No upfront costs - we handle printing, inventory, and shipping.", icon: Gift },
    { text: "Your designs featured in the Treehouse collective marketplace.", icon: Store },
    { text: "Build your brand identity with a personalized storefront.", icon: Sparkles },
    { text: "Access to DALL-E 3 AI for professional design generation.", icon: Brain },
  ];

  const membershipBenefits = [
    { text: "Browse and shop from curated wellness stores across South Africa.", icon: ShoppingCart },
    { text: "Get 10 FREE credits on signup to access AI wellness advisors instantly.", icon: Gift },
    { text: "Access ALL AI advisors for personalized wellness guidance (Herbalist, Nutritionist, Fitness, Mental Health, and more).", icon: Brain },
    { text: "Create and sell custom apparel through Creator Lab - earn real income!", icon: Palette },
    { text: "25% commission on all Creator Lab sales - earn while you create.", icon: DollarSign },
    { text: "Request payouts from your dashboard once you reach R500 minimum.", icon: Coins },
    { text: "Your own mini-store with unique URL for brand building.", icon: Globe },
    { text: "No subscription fees - pay only for credits you use.", icon: Heart },
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
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
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
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
                      <Store className="h-8 w-8 text-[#006B3E]" />
                      Transform Your Wellness Business
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Join South Africa's premier wellness marketplace and grow your business with our comprehensive e-commerce platform.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 p-4">
                    <div className="bg-[#006B3E]/10 p-4 rounded-lg border-2 border-[#006B3E]/30">
                      <h3 className="font-bold text-lg mb-2 text-[#006B3E]">What You Get:</h3>
                      <ul className="space-y-3">
                        {wellnessBenefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <benefit.icon className="h-6 w-6 text-[#006B3E] mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{benefit.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-center pt-2">
                      <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] w-full">
                        <Link href="/dispensary-signup">Start Your Store Today</Link>
                      </Button>
                    </div>
                  </div>
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
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
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
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
                      <Leaf className="h-8 w-8 text-[#006B3E]" />
                      Your Wellness Journey Starts Here
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Join for FREE and unlock instant access to AI-powered wellness guidance with 10 complimentary credits.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 p-4">
                    <div className="bg-[#006B3E]/10 p-4 rounded-lg border-2 border-[#006B3E]/30">
                      <h3 className="font-bold text-lg mb-2 text-[#006B3E]">Free Leaf Member Benefits:</h3>
                      <ul className="space-y-3">
                        {leafUserBenefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <benefit.icon className="h-6 w-6 text-[#006B3E] mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{benefit.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Important:</strong> Always include your gender, age, diet, and current medications when consulting AI advisors for personalized wellness advice.
                      </p>
                    </div>
                    <div className="text-center pt-2">
                      <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] w-full">
                        <Link href="/auth/signup">Join Free Today</Link>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>

        {/* New Sections: Treehouse Store & Healers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Treehouse Store Section */}
          <Card className="overflow-hidden animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="relative aspect-video w-full">
              <Image
                src="/images/treehouse/th2.jpg"
                alt="Treehouse Store"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="p-6 text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Treehouse Collective Store
              </h2>
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                Discover unique creator-designed apparel. Shop from talented creators and support independent brands.
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/treehouse">Enter Treehouse Store</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Learn About Creator Earnings</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
                      <Palette className="h-8 w-8 text-[#006B3E]" />
                      Creator Lab: Your Path to Earning
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Turn your creativity into cash! Design custom apparel and earn 25% commission on every sale.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 p-4">
                    <div className="bg-[#006B3E]/10 p-4 rounded-lg border-2 border-[#006B3E]/30">
                      <h3 className="font-bold text-lg mb-2 text-[#006B3E]">How It Works:</h3>
                      <ul className="space-y-3">
                        {treehouseBenefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <benefit.icon className="h-6 w-6 text-[#006B3E] mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{benefit.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-500">
                      <h4 className="font-bold text-lg mb-2 text-green-700 dark:text-green-300">💰 Example Earnings (25% Commission):</h4>
                      <div className="space-y-2 text-sm">
                        <p className="flex justify-between"><span>Hoodie Sale (R400):</span> <strong className="text-green-600 dark:text-green-400">R100 for you</strong></p>
                        <p className="flex justify-between"><span>T-Shirt Sale (R250):</span> <strong className="text-green-600 dark:text-green-400">R62.50 for you</strong></p>
                        <p className="flex justify-between"><span>Cap Sale (R180):</span> <strong className="text-green-600 dark:text-green-400">R45 for you</strong></p>
                        <Separator className="my-2" />
                        <p className="flex justify-between text-base"><span className="font-bold">5 Hoodies Sold:</span> <strong className="text-green-600 dark:text-green-400">R500 - ready to cash out!</strong></p>
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Payout System:</strong> Request payouts from your dashboard once you reach R500 minimum. Funds transferred directly to your bank account.
                      </p>
                    </div>
                    <div className="text-center pt-2">
                      <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] w-full">
                        <Link href="/auth/signup">Start Creating & Earning</Link>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Healers/Stores Section */}
          <Card className="overflow-hidden animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="relative aspect-video w-full">
              <Image
                src="/images/healers/healers.jpg"
                alt="Wellness Healers"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="p-6 text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Wellness Marketplace
              </h2>
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                Connect with authentic wellness stores. From cannabinoids to traditional medicine, natural health permaculture, and fungi, find everything you need.
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/browse-dispensary-types">Browse Stores</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Leaf members benefits</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[650px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
                      <Heart className="h-8 w-8 text-[#006B3E]" />
                      Wellness Tree Membership
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      One membership, unlimited possibilities. Shop, create, earn, and access wellness guidance - all in one place.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 p-4">
                    <div className="bg-[#006B3E]/10 p-4 rounded-lg border-2 border-[#006B3E]/30">
                      <h3 className="font-bold text-lg mb-2 text-[#006B3E]">Complete Member Benefits:</h3>
                      <ul className="space-y-3">
                        {membershipBenefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <benefit.icon className="h-6 w-6 text-[#006B3E] mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{benefit.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-2 border-purple-500">
                      <h4 className="font-bold text-lg mb-2 text-purple-700 dark:text-purple-300">🎨 Creator Lab Highlights:</h4>
                      <div className="space-y-2 text-sm">
                        <p>✓ <strong>AI-Powered Design:</strong> Use DALL-E 3 to generate professional designs</p>
                        <p>✓ <strong>Your Own Store:</strong> Get a branded URL like thewellnesstree.co.za/treehouse/store/yourname</p>
                        <p>✓ <strong>25% Commission:</strong> Keep R100 on every R400 hoodie sold</p>
                        <p>✓ <strong>Dashboard Payouts:</strong> Request payout once you reach R500 minimum</p>
                      </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>🎁 Signup Bonus:</strong> Get 10 FREE credits to start chatting with AI wellness advisors immediately!
                      </p>
                    </div>
                    <div className="text-center pt-2">
                      <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] w-full">
                        <Link href="/auth/signup">Become a Member Today</Link>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        </div>
        </>
      ) : (
        <div/>
      )}``

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
                <Link href="/dispensary-admin/dashboard">Go to your Store panel</Link>
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
          <h2 className="text-4xl font-extrabold text-[#3D2E17] tracking-tight flex items-center justify-center gap-2">
            <Brain className="h-14 w-14 text-[#006B3E]"/> Explore Our AI Advisors
          </h2>
          <p className="text-lg font-semibold text-[#3D2E17] max-w-2xl mx-auto mt-3">
            Get specialized insights and recommendations across various domains of holistic wellness and knowledge.
          </p>
          {currentUser && (
            <p className="text-sm text-muted-foreground mt-2">
              Your credits: <span className="font-semibold text-primary">{currentUser.credits ?? 0}</span>
            </p>
          )}
        </div>
      </section>

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
