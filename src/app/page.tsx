'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Brain, Loader2, Sparkles, Leaf, Heart, Flower, Sun, Moon, Star, Zap, Wind, Droplet, Flame, TreePine, Sprout, Activity, Atom, Dna, Microscope, Beaker, Pill, Stethoscope, Eye, Smile, Users, UserCheck, Waves, Mountain, Globe, Compass, ShieldCheck, HandHelping, ArrowRight, Coins, ShoppingCart, Truck, DollarSign, Gift, ArrowDown, Settings, Briefcase, Palette, Store, Rocket, Calendar, Share2, Tv, Package } from 'lucide-react';
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
import { AdBanner } from '@/components/advertising/AdBanner';
import { DriverSlideshow } from '@/components/home/DriverSlideshow';

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
        {/* Top 3-Card Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Card: Main Header */}
          <Card className="overflow-hidden animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col">
            <div className="relative w-full h-80 overflow-hidden">
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src="/images/promo/wellness-ad.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="p-8 text-center flex-1 flex flex-col justify-between">
              <div>
                <h1 className="text-4xl font-extrabold text-foreground tracking-tight mb-4">
                  The Wellness Tree
                </h1>
                <p className="text-lg font-semibold text-[#3D2E17]">
                  Your natural wellness hub. Shop natural products, and connect with a network of health stores, herbal apothecaries, and wellness practitioners, Naturally...
                </p>
              </div>
              <div className="mt-8 space-y-4">
                <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 w-full">
                  <Link href="#advisors-section">
                    <ArrowDown className="mr-2 h-5 w-5" />
                    Explore AI Advisors
                  </Link>
                </Button>
                <Button asChild size="lg" className="bg-[#3D2E17] hover:bg-[#006B3E] active:bg-[#2D1E0F] text-white font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 w-full">
                  <Link href="/browse-dispensary-types">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Browse Stores
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Middle Card: Wellness Marketplace */}
          <Card className="overflow-hidden animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <div className="relative w-full h-80 overflow-hidden">
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src="/images/promo/wellness-vid.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="p-6 text-center flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Wellness Marketplace
                </h2>
                <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                  Connect with our growing community - CBD stores - traditional medicine, natural health, permaculture, fungi, find everything you need.
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                  <Link href="/browse-dispensary-types">Browse Stores</Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Right Card: Driver Signup */}
          <Card className="overflow-hidden animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <div className="relative w-full h-80 overflow-hidden">
              <video
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              >
                <source src="/images/promo/driver-ad.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="p-6 text-center flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Drive & Earn
                </h2>
                <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                  Sign up as a driver and earn. Payouts weekly to S.A bank accounts. Your own vehicle, and licensed drivers required.
                </p>
              </div>
              <div className="mt-6">
                <Button asChild size="lg" className="bg-[#3D2E17] hover:bg-[#006B3E] active:bg-[#2D1E0F] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                  <Link href="/driver-signup">
                    <Truck className="mr-2 h-5 w-5" />
                    Become a Driver
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom 3-Card Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* First Card: Treehouse */}
          <Card className="overflow-hidden animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src="/images/treehouse/th2.jpg"
                alt="Treehouse Store"
                fill
                className="object-cover object-top"
                style={{ objectFit: 'cover', objectPosition: 'top' }}
                priority
              />
            </div>
            <div className="p-6 text-center flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Treehouse Collective Store
                </h2>
                <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                  Discover unique creator-designed apparel. Shop from talented creators and support independent brands.
                </p>
              </div>
              <div className="mt-6">
                <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                  <Link href="/treehouse">Enter Treehouse Store</Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Second Card: Join Our Growing Ecosystem */}
          <Card className="p-8 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Join Our Growing Ecosystem
              </h2>
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                Create a store or canna club for FREE. No subscriptions, Full order tracking, Driver management, Social hub, Rich analytics, Events Calendar and more...
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/dispensary-signup">Create store</Link>
              </Button>
            </div>
          </Card>

          {/* Third Card: Become a Leaf User */}
          <Card className="p-8 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Become a Leaf user?
              </h2>
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                Get instant access now. FREE P.O.D store and access to the Creator Lab. FREE access to our influencer program. EARN cash with weekly payouts and commission tracking. 10 free credits to use our LM's. Access to all AI advisors. 

              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/auth/signup">Create Free leaf account</Link>
              </Button>
            </div>
          </Card>
        </div>

        <PageHeader 
            title="The Wellness Tree"
            description={<p>Your natural wellness hub. 
              Shop natural products, and connect with a network of health stores, herbal apocatherys, and wellness practitioners, Naturally...</p>}
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

        {/* Global Platform Advertisement - Super Admin Controlled */}
        <AdBanner placement="hero_banner" className="mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 2: Create a Store */}
          <Card className="p-8 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Join Our Growing Ecosystem
              </h2>
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                Create a store or canna club for FREE. No subscriptions,Full order tracking, Driver management, Social, hub, Rich analytics, Events Calander and more...
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
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#006B3E] via-[#3D2E17] to-[#FFD700] flex items-center justify-center gap-3">
                      <Store className="h-10 w-10 text-[#006B3E] animate-pulse" />
                      Transform Your Wellness Universe!
                    </DialogTitle>
                    <DialogDescription className="text-base text-center font-semibold">
                      🚀 Level up your business with South Africa's most EPIC wellness marketplace! 🌟
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 p-4">
                    <div className="p-4 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-xl border-2 border-emerald-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-6 w-6 text-emerald-700" />
                        <h3 className="font-extrabold text-lg text-emerald-900">🛍️ FULL E-COMMERCE POWERHOUSE</h3>
                      </div>
                      <p className="text-sm text-emerald-800 font-medium">Product listings, shopping cart, integrated Payfast payments & your OWN public URL! Build your universe online! 💪</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-rose-500/20 rounded-xl border-2 border-purple-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-6 w-6 text-purple-700" />
                        <h3 className="font-extrabold text-lg text-purple-900">🤝 PRODUCT POOL = UNLIMITED INVENTORY</h3>
                      </div>
                      <p className="text-sm text-purple-800 font-medium">Share products with other stores & access THOUSANDS of items instantly! No stock? No problem! Private bulk trading too! 🔥</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-yellow-500/20 rounded-xl border-2 border-amber-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-6 w-6 text-amber-700" />
                        <h3 className="font-extrabold text-lg text-amber-900">💰 GET PAID WEEKLY!</h3>
                      </div>
                      <p className="text-sm text-amber-800 font-medium">Direct bank deposits every week! Secure Payfast processing means YOUR MONEY, YOUR WAY! 🤑💸</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-violet-500/20 rounded-xl border-2 border-blue-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-6 w-6 text-blue-700" />
                        <h3 className="font-extrabold text-lg text-blue-900">⚙️ ULTIMATE CONTROL CENTER</h3>
                      </div>
                      <p className="text-sm text-blue-800 font-medium">Manage inventory, orders, customers & analytics from ONE powerful dashboard! You're the boss! 👑</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-green-500/20 via-lime-500/20 to-emerald-500/20 rounded-xl border-2 border-green-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="h-6 w-6 text-green-700" />
                        <h3 className="font-extrabold text-lg text-green-900">🌍 REACH ALL OF SOUTH AFRICA</h3>
                      </div>
                      <p className="text-sm text-green-800 font-medium">Build your brand, grow your tribe, dominate your niche! This is YOUR stage! 🎯🚀</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-red-500/20 via-orange-500/20 to-pink-500/20 rounded-xl border-2 border-red-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-6 w-6 text-red-700" />
                        <h3 className="font-extrabold text-lg text-red-900">🚚 DRIVER MANAGEMENT PRO</h3>
                      </div>
                      <p className="text-sm text-red-800 font-medium">Manage your own delivery drivers OR use club drivers! Full tracking, route optimization & earnings management! Perfect for stores & clubs! 🏃‍♂️💨</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-sky-500/20 via-blue-500/20 to-cyan-500/20 rounded-xl border-2 border-sky-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-6 w-6 text-sky-700" />
                        <h3 className="font-extrabold text-lg text-sky-900">📦 SMART SHIPPING INTEGRATION</h3>
                      </div>
                      <p className="text-sm text-sky-800 font-medium">Courier Guy & Pudo Locker integration! Automated shipping labels, tracking & delivery notifications! Ship anywhere in SA with ease! 🚀📬</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-pink-500/20 rounded-xl border-2 border-fuchsia-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 className="h-6 w-6 text-fuchsia-700" />
                        <h3 className="font-extrabold text-lg text-fuchsia-900">🌟 SOCIAL SHARE HUB</h3>
                      </div>
                      <p className="text-sm text-fuchsia-800 font-medium">Share to ALL social platforms with ONE click! Schedule posts, track engagement, QR codes & leaderboards! Turn shares into sales! 📱✨</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-purple-500/20 rounded-xl border-2 border-violet-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="h-6 w-6 text-violet-700" />
                        <h3 className="font-extrabold text-lg text-violet-900">🎨 CREATOR LAB POWERHOUSE</h3>
                      </div>
                      <p className="text-sm text-violet-800 font-medium">Design & sell custom apparel with AI! Your own Treehouse mini-store, earn 25% commission on every sale! No inventory needed! 💰🎨</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-rose-500/20 via-red-500/20 to-orange-500/20 rounded-xl border-2 border-rose-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Tv className="h-6 w-6 text-rose-700" />
                        <h3 className="font-extrabold text-lg text-rose-900">📺 ADVERTISING PLATFORM</h3>
                      </div>
                      <p className="text-sm text-rose-800 font-medium">Promote your products across the ENTIRE platform! Target specific stores, track ROI & boost visibility! Get discovered by thousands! 🎯📣</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-teal-500/20 via-emerald-500/20 to-green-500/20 rounded-xl border-2 border-teal-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-6 w-6 text-teal-700" />
                        <h3 className="font-extrabold text-lg text-teal-900">📅 EVENT CALENDAR SYSTEM</h3>
                      </div>
                      <p className="text-sm text-teal-800 font-medium">Host workshops, product launches & wellness events! Manage bookings, send reminders & build community! Your events, your rules! 🎉👥</p>
                    </div>
                    
                    <div className="text-center pt-3">
                      <Button asChild size="lg" className="bg-gradient-to-r from-[#006B3E] via-[#3D2E17] to-[#FFD700] hover:scale-105 transition-transform w-full text-lg font-black shadow-xl">
                        <Link href="/dispensary-signup">🔥 START YOUR UNIVERSE NOW! 🔥</Link>
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
                Become a Leaf user?
              </h2>
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                Get instant access now. FREE P.O.D store, an engaging influencer program to earn cash, and 10 free credits to use our LM'S. order tracking and driver tracking with PUDO, COURIER GUY, and store managed driver teams.
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
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center gap-3">
                      <Leaf className="h-10 w-10 text-[#006B3E] animate-bounce" />
                      Your Ultimate Wellness Adventure! 🌟
                    </DialogTitle>
                    <DialogDescription className="text-base text-center font-semibold">
                      🎉 100% FREE! Unlock INSANE features & get 10 FREE credits NOW! 🎁
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 p-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500/20 via-fuchsia-500/20 to-pink-500/20 rounded-xl border-2 border-purple-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-6 w-6 text-purple-700 animate-pulse" />
                        <h3 className="font-extrabold text-lg text-purple-900">🧠 AI ADVISOR ARMY!</h3>
                      </div>
                      <p className="text-sm text-purple-800 font-medium">Access ALL AI wellness experts: Herbalist, Nutritionist, Fitness Guru, Mental Health Coach & MORE! Instant wisdom at your fingertips! 🚀</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/20 rounded-xl border-2 border-amber-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-6 w-6 text-amber-700" />
                        <h3 className="font-extrabold text-lg text-amber-900">🎁 10 FREE CREDITS = INSTANT POWER!</h3>
                      </div>
                      <p className="text-sm text-amber-800 font-medium">Get wellness advice RIGHT NOW! Can't afford help? WE'VE GOT YOU! Pro tip: Add your age, gender, diet & meds for ULTRA-personalized guidance! 💪</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-xl border-2 border-emerald-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="h-6 w-6 text-emerald-700" />
                        <h3 className="font-extrabold text-lg text-emerald-900">🎨 CREATOR LAB = MAKE MONEY!</h3>
                      </div>
                      <p className="text-sm text-emerald-800 font-medium">Design EPIC apparel with AI & earn 25% on EVERY sale! R100 on a R400 hoodie?! YES PLEASE! Your own mini-store with custom URL! 🤑💸</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-violet-500/20 rounded-xl border-2 border-blue-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-6 w-6 text-blue-700" />
                        <h3 className="font-extrabold text-lg text-blue-900">🛍️ SHOP LIKE A WELLNESS BOSS!</h3>
                      </div>
                      <p className="text-sm text-blue-800 font-medium">Browse curated stores across South Africa! Cannabinoids, organics, homeopathy, mushrooms & MORE! All in ONE place! 🌿✨</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-rose-500/20 via-pink-500/20 to-fuchsia-500/20 rounded-xl border-2 border-rose-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-6 w-6 text-rose-700" />
                        <h3 className="font-extrabold text-lg text-rose-900">⚡ GAMIFIED EXPERIENCE!</h3>
                      </div>
                      <p className="text-sm text-rose-800 font-medium">Earn XP, level up, unlock achievements, climb leaderboards! Your wellness journey just became an EPIC game! 🎮🏆</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-green-500/20 via-lime-500/20 to-emerald-500/20 rounded-xl border-2 border-green-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-6 w-6 text-green-700" />
                        <h3 className="font-extrabold text-lg text-green-900">🌟 BECOME AN INFLUENCER!</h3>
                      </div>
                      <p className="text-sm text-green-800 font-medium">Join our influencer program! Earn 1.25-5% of every sale (from platform's 25% profit) based on your tier! Plus up to 5% ad bonuses! Turn your passion into PROFIT! 💎🔥</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-200/50 to-amber-200/50 p-3 rounded-lg border-2 border-yellow-400/60 shadow-md">
                      <p className="text-sm text-amber-900 font-bold text-center">
                        💡 PRO TIP: Include gender, age, diet & current meds in your AI chats for ULTRA-PERSONALIZED advice! 🎯
                      </p>
                    </div>
                    
                    <div className="text-center pt-3">
                      <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:scale-105 transition-transform w-full text-lg font-black shadow-xl text-white">
                        <Link href="/auth/signup">🚀 BLAST OFF FOR FREE! 🚀</Link>
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
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src="/images/treehouse/th2.jpg"
                alt="Treehouse Store"
                fill
                className="object-cover object-top"
                style={{ objectFit: 'cover', objectPosition: 'top' }}
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
            <div className="mt-8 space-y-4 text-center px-6">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/treehouse">Enter Treehouse Store</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full hover:scale-105 transition-transform">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Learn About Creator Earnings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-0">
                  {/* Magical Header with Gradient */}
                  <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-6 rounded-t-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/patterns/dots.svg')] opacity-20"></div>
                    <DialogHeader className="relative z-10">
                      <DialogTitle className="text-3xl font-black text-white flex items-center justify-center gap-3 drop-shadow-lg">
                        <Sparkles className="h-10 w-10 animate-pulse" />
                        Creator Lab Magic ✨
                      </DialogTitle>
                      <DialogDescription className="text-white/90 text-center text-lg font-semibold mt-2">
                        Turn your creativity into cold hard cash! 🎨💰
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="space-y-4 p-6">
                    {/* Level 1: The Dream - Purple */}
                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 p-5 rounded-xl border-3 border-purple-400 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-purple-500 p-2.5 rounded-lg">
                          <Palette className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-black text-xl text-purple-900 dark:text-purple-100">Level 1: Design Your Universe</h3>
                      </div>
                      <p className="text-purple-800 dark:text-purple-200 font-semibold leading-relaxed">
                        🎨 Use our AI-powered Creator Lab to design epic apparel! T-shirts, hoodies, caps - you name it. 
                        No design skills? No problem! DALL-E 3 AI is your creative sidekick. Just describe your vision and watch magic happen!
                      </p>
                    </div>

                    {/* Level 2: The Store - Blue */}
                    <div className="bg-gradient-to-br from-cyan-100 to-blue-200 dark:from-cyan-900/40 dark:to-blue-800/40 p-5 rounded-xl border-3 border-cyan-400 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-cyan-500 p-2.5 rounded-lg">
                          <Store className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-black text-xl text-cyan-900 dark:text-cyan-100">Level 2: Build Your Brand</h3>
                      </div>
                      <p className="text-cyan-800 dark:text-cyan-200 font-semibold leading-relaxed mb-2">
                        🏪 Get your own mini-store with a slick custom URL!
                      </p>
                      <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border-2 border-cyan-300 dark:border-cyan-600">
                        <code className="text-sm font-mono text-cyan-700 dark:text-cyan-300 break-all">
                          thewellnesstree.co.za/treehouse/store/your-brand
                        </code>
                      </div>
                    </div>

                    {/* Level 3: The Money - Green/Gold */}
                    <div className="bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 dark:from-green-900/40 dark:via-emerald-900/40 dark:to-teal-800/40 p-5 rounded-xl border-3 border-green-400 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5 rounded-lg animate-pulse">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-black text-xl text-green-900 dark:text-green-100">Level 3: Stack That Cash! 💸</h3>
                      </div>
                      <p className="text-green-800 dark:text-green-200 font-bold text-lg mb-4">
                        Earn 25% commission on EVERY sale. Automatic. No catches. Just pure profit! 🤑
                      </p>
                      
                      {/* Earnings Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-green-300">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">👕</span>
                            <Badge className="bg-green-600">HOT!</Badge>
                          </div>
                          <p className="font-bold text-gray-700 dark:text-gray-200">T-Shirt</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Customer pays: <strong>R625</strong></p>
                          <p className="text-2xl font-black text-green-600 mt-2">You earn: R125</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-green-300">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🧥</span>
                            <Badge className="bg-orange-600">BIG WIN</Badge>
                          </div>
                          <p className="font-bold text-gray-700 dark:text-gray-200">Hoodie</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Customer pays: <strong>R1,250</strong></p>
                          <p className="text-2xl font-black text-green-600 mt-2">You earn: R250</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-green-300">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">🧢</span>
                            <Badge className="bg-blue-600">NICE</Badge>
                          </div>
                          <p className="font-bold text-gray-700 dark:text-gray-200">Cap</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Customer pays: <strong>R438</strong></p>
                          <p className="text-2xl font-black text-green-600 mt-2">You earn: R87.50</p>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/60 dark:to-amber-800/60 p-4 rounded-lg shadow-md border-3 border-yellow-500 col-span-1 sm:col-span-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                            <p className="font-black text-lg text-yellow-900 dark:text-yellow-100">Quick Math:</p>
                          </div>
                          <p className="text-yellow-800 dark:text-yellow-200 font-bold text-xl">
                            Sell just 2 hoodies = <span className="text-2xl text-yellow-900 dark:text-yellow-50">R500</span> 🎉
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">That's instant payout territory!</p>
                        </div>
                      </div>
                    </div>

                    {/* Level 4: The Cashout - Gold */}
                    <div className="bg-gradient-to-br from-amber-100 to-yellow-200 dark:from-amber-900/40 dark:to-yellow-800/40 p-5 rounded-xl border-3 border-amber-400 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-2.5 rounded-lg">
                          <Coins className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-black text-xl text-amber-900 dark:text-amber-100">Level 4: Get Paid! 💳</h3>
                      </div>
                      <p className="text-amber-800 dark:text-amber-200 font-semibold leading-relaxed">
                        💰 Hit R500 minimum? Request payout from your dashboard! Money goes straight to your bank. 
                        No waiting months, no shady fees. Just your hard-earned cash! 🏦✨
                      </p>
                    </div>

                    {/* Boss Mode - Pink/Red */}
                    <div className="bg-gradient-to-br from-pink-100 to-red-200 dark:from-pink-900/40 dark:to-red-800/40 p-5 rounded-xl border-3 border-pink-400 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-gradient-to-br from-pink-500 to-red-600 p-2.5 rounded-lg">
                          <Gift className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-black text-xl text-pink-900 dark:text-pink-100">Boss Mode: Zero Risk! 🎮</h3>
                      </div>
                      <ul className="space-y-2 text-pink-800 dark:text-pink-200 font-semibold">
                        <li className="flex items-start gap-2">
                          <span className="text-xl">✅</span>
                          <span>Zero upfront costs - not a cent!</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-xl">✅</span>
                          <span>We handle printing, shipping, customer service</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-xl">✅</span>
                          <span>No inventory to manage - stress-free!</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-xl">✅</span>
                          <span>Featured in Treehouse marketplace - free exposure!</span>
                        </li>
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center pt-4">
                      <Button 
                        asChild 
                        size="lg" 
                        className="w-full bg-gradient-to-r from-[#006B3E] via-purple-600 to-pink-600 hover:from-[#3D2E17] hover:via-purple-700 hover:to-pink-700 text-white font-black text-lg py-6 shadow-2xl hover:shadow-pink-500/50 transition-all hover:scale-105 active:scale-95"
                      >
                        <Link href="/auth/signup">
                          <Rocket className="mr-2 h-5 w-5" />
                          Start Your Creator Journey Now! 🚀
                        </Link>
                      </Button>
                      <p className="text-sm text-muted-foreground mt-3 font-semibold">
                        Join hundreds of creators already earning! 🌟
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* Healers/Stores Section */}
          <Card className="overflow-hidden animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <div className="relative aspect-video w-full overflow-hidden">
              <Image
                src="/images/healers/healers.jpg"
                alt="Wellness Healers"
                fill
                className="object-cover object-top"
                style={{ objectFit: 'cover', objectPosition: 'top' }}
                priority
              />
            </div>
            <div className="p-6 text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Wellness Marketplace
              </h2>
              <p className="text-lg font-semibold text-[#3D2E17] mt-2">
                Connect with authentic wellness stores. From cbds to traditional medicine, natural health permaculture, and fungi, find everything you need.
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center px-6">
              <Button asChild size="lg" className="bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white w-full">
                <Link href="/browse-dispensary-types">Browse Stores</Link>
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Store Sign up info</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#006B3E] via-[#3D2E17] to-[#FFD700] flex items-center justify-center gap-3">
                      <Store className="h-10 w-10 text-[#006B3E] animate-pulse" />
                      Transform Your Wellness Universe!
                    </DialogTitle>
                    <DialogDescription className="text-base text-center font-semibold">
                      🚀 Level up your business with South Africa's most EPIC wellness marketplace! 🌟
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 p-4">
                    <div className="p-4 bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-xl border-2 border-emerald-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-6 w-6 text-emerald-700" />
                        <h3 className="font-extrabold text-lg text-emerald-900">🛍️ FULL E-COMMERCE POWERHOUSE</h3>
                      </div>
                      <p className="text-sm text-emerald-800 font-medium">Product listings, shopping cart, integrated Payfast payments & your OWN public URL! Build your universe online! 💪</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-rose-500/20 rounded-xl border-2 border-purple-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-6 w-6 text-purple-700" />
                        <h3 className="font-extrabold text-lg text-purple-900">🤝 PRODUCT POOL = UNLIMITED INVENTORY</h3>
                      </div>
                      <p className="text-sm text-purple-800 font-medium">Share products with other stores & access THOUSANDS of items instantly! No stock? No problem! Private bulk trading too! 🔥</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-yellow-500/20 rounded-xl border-2 border-amber-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-6 w-6 text-amber-700" />
                        <h3 className="font-extrabold text-lg text-amber-900">💰 GET PAID WEEKLY!</h3>
                      </div>
                      <p className="text-sm text-amber-800 font-medium">Direct bank deposits every week! Secure Payfast processing means YOUR MONEY, YOUR WAY! 🤑💸</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-violet-500/20 rounded-xl border-2 border-blue-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-6 w-6 text-blue-700" />
                        <h3 className="font-extrabold text-lg text-blue-900">⚙️ ULTIMATE CONTROL CENTER</h3>
                      </div>
                      <p className="text-sm text-blue-800 font-medium">Manage inventory, orders, customers & analytics from ONE powerful dashboard! You're the boss! 👑</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-green-500/20 via-lime-500/20 to-emerald-500/20 rounded-xl border-2 border-green-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="h-6 w-6 text-green-700" />
                        <h3 className="font-extrabold text-lg text-green-900">🌍 REACH ALL OF SOUTH AFRICA</h3>
                      </div>
                      <p className="text-sm text-green-800 font-medium">Build your brand, grow your tribe, dominate your niche! This is YOUR stage! 🎯🚀</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-red-500/20 via-orange-500/20 to-pink-500/20 rounded-xl border-2 border-red-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="h-6 w-6 text-red-700" />
                        <h3 className="font-extrabold text-lg text-red-900">🚚 DRIVER MANAGEMENT PRO</h3>
                      </div>
                      <p className="text-sm text-red-800 font-medium">Manage your own delivery drivers OR use club drivers! Full tracking, route optimization & earnings management! Perfect for stores & clubs! 🏃‍♂️💨</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-sky-500/20 via-blue-500/20 to-cyan-500/20 rounded-xl border-2 border-sky-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-6 w-6 text-sky-700" />
                        <h3 className="font-extrabold text-lg text-sky-900">📦 SMART SHIPPING INTEGRATION</h3>
                      </div>
                      <p className="text-sm text-sky-800 font-medium">Courier Guy & Pudo Locker integration! Automated shipping labels, tracking & delivery notifications! Ship anywhere in SA with ease! 🚀📬</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-pink-500/20 rounded-xl border-2 border-fuchsia-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 className="h-6 w-6 text-fuchsia-700" />
                        <h3 className="font-extrabold text-lg text-fuchsia-900">🌟 SOCIAL SHARE HUB</h3>
                      </div>
                      <p className="text-sm text-fuchsia-800 font-medium">Share to ALL social platforms with ONE click! Schedule posts, track engagement, QR codes & leaderboards! Turn shares into sales! 📱✨</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-violet-500/20 via-indigo-500/20 to-purple-500/20 rounded-xl border-2 border-violet-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="h-6 w-6 text-violet-700" />
                        <h3 className="font-extrabold text-lg text-violet-900">🎨 CREATOR LAB POWERHOUSE</h3>
                      </div>
                      <p className="text-sm text-violet-800 font-medium">Design & sell custom apparel with AI! Your own Treehouse mini-store, earn 25% commission on every sale! No inventory needed! 💰🎨</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-rose-500/20 via-red-500/20 to-orange-500/20 rounded-xl border-2 border-rose-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Tv className="h-6 w-6 text-rose-700" />
                        <h3 className="font-extrabold text-lg text-rose-900">📺 ADVERTISING PLATFORM</h3>
                      </div>
                      <p className="text-sm text-rose-800 font-medium">Promote your products across the ENTIRE platform! Target specific stores, track ROI & boost visibility! Get discovered by thousands! 🎯📣</p>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-br from-teal-500/20 via-emerald-500/20 to-green-500/20 rounded-xl border-2 border-teal-400/40 shadow-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-6 w-6 text-teal-700" />
                        <h3 className="font-extrabold text-lg text-teal-900">📅 EVENT CALENDAR SYSTEM</h3>
                      </div>
                      <p className="text-sm text-teal-800 font-medium">Host workshops, product launches & wellness events! Manage bookings, send reminders & build community! Your events, your rules! 🎉👥</p>
                    </div>
                    
                    <div className="text-center pt-3">
                      <Button asChild size="lg" className="bg-gradient-to-r from-[#006B3E] via-[#3D2E17] to-[#FFD700] hover:scale-105 transition-transform w-full text-lg font-black shadow-xl">
                        <Link href="/dispensary-signup">🔥 START YOUR UNIVERSE NOW! 🔥</Link>
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
            <p className="text-xl font-bold text-[#3D2E17] mt-4">
              Your Credits: <span className="text-3xl font-black text-[#006B3E]">{currentUser.credits ?? 0}</span>
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
