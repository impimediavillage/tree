'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Brain, Loader2, Sparkles, Leaf, Heart, Flower, Sun, Moon, Star, Zap, Wind, Droplet, Flame, TreePine, Sprout, Activity, Atom, Dna, Microscope, Beaker, Pill, Stethoscope, Eye, Smile, Users, UserCheck, Waves, Mountain, Globe, Compass, ShieldCheck, HandHelping, ArrowRight, Coins, ShoppingCart, Truck, DollarSign, Gift, ArrowDown, Settings, Briefcase, Palette, Image as ImageIconLucide } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import type { User, StickerSet, AIAdvisor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FeaturedStickerCard } from '@/components/cards/FeaturedStickerCard';
import { PageHeader } from '@/components/ui/PageHeader';

// Icon mapping for dynamic advisor icons
const iconMap: Record<string, React.ElementType> = {
  Sparkles, Brain, Leaf, Heart, Flower, Sun, Moon, Star,
  Zap, Wind, Droplet, Flame, TreePine, Sprout, Activity,
  Atom, Dna, Microscope, Beaker, Pill, Stethoscope, Eye,
  Smile, Users, UserCheck, Waves, Mountain, Globe, Compass,
  ShieldCheck, HandHelping,
};

export default function HolisticAiHubPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [featuredStickerSets, setFeaturedStickerSets] = useState<StickerSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
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

  const fetchFeaturedStickerSets = useCallback(async () => {
    setIsLoadingSets(true);
    try {
      const setsQuery = query(
        collection(db, 'stickersets'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(4)
      );
      const querySnapshot = await getDocs(setsQuery);
      const sets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StickerSet));
      setFeaturedStickerSets(sets);
    } catch (error) {
      console.error("Error fetching featured sticker sets:", error);
    } finally {
      setIsLoadingSets(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedStickerSets();
    fetchAdvisors();
  }, [fetchFeaturedStickerSets, fetchAdvisors]);

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="h-6 w-6" />;
    }
    return <Brain className="h-6 w-6" />;
  };

  const getTierBadge = (tier: AIAdvisor['tier']) => {
    const colors = {
      basic: 'bg-slate-100 text-slate-700',
      standard: 'bg-blue-100 text-blue-700',
      premium: 'bg-purple-100 text-purple-700',
    };
    return (
      <Badge className={`${colors[tier]} font-bold`}>
        {tier.toUpperCase()}
      </Badge>
    );
  };

  // Normalize image URL
  const getImageUrl = (advisor: AIAdvisor) => {
    if (!advisor.imageUrl) return null;
    if (advisor.imageUrl.startsWith('/') || advisor.imageUrl.startsWith('http')) {
      return advisor.imageUrl;
    }
    const advisorName = advisor.name.toLowerCase();
    let category = 'general';
    if (advisorName.includes('cbd') || advisorName.includes('cannabinoid')) category = 'cbd';
    else if (advisorName.includes('thc')) category = 'thc';
    else if (advisorName.includes('mushroom')) category = 'mushrooms';
    else if (advisorName.includes('flower') || advisorName.includes('homeopathy')) category = 'homeopathy';
    else if (advisorName.includes('aromatherapy')) category = 'aromatherapy';
    else if (advisorName.includes('traditional')) category = 'traditional-medicine';
    return `/images/${category}/${advisor.imageUrl}`;
  };

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
                <Button asChild size="lg" className="bg-primary hover:bg-[#5D4E37] active:bg-primary/80 text-primary-foreground text-lg font-semibold py-4 px-8 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">
                    <Link href="#advisors-section">
                        <ArrowDown className="mr-2 h-5 w-5" />
                        Explore AI Advisors
                    </Link>
                </Button>
                <Button asChild size="lg" className="bg-[#5D4E37] hover:bg-primary active:bg-[#5D4E37]/80 text-primary-foreground text-lg font-semibold py-4 px-8 rounded-full shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-300">
                    <Link href="/browse-dispensary-types">
                        <ShoppingCart className="mr-2 h-5 w-5" />
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
              <Button asChild size="lg" className="bg-primary hover:bg-[#5D4E37] active:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-300 text-primary-foreground w-full">
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
                        <benefit.icon className="h-10 w-10 text-primary mt-0.5 flex-shrink-0" />
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
                Get instant assistance now. Sign up as Leaf user and get 10 free credits to get vital wellness info. Remember to connect with a real practitioner as AI can make mistakes.
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-primary hover:bg-[#5D4E37] active:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-300 text-primary-foreground w-full">
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
            <Button asChild className="w-full md:w-auto text-lg py-3 bg-primary hover:bg-[#5D4E37] active:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-300 text-primary-foreground">
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
             <Button asChild className="w-full md:w-auto text-lg py-3 bg-primary hover:bg-[#5D4E37] active:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-300 text-primary-foreground">
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
                <Button size="lg" className="bg-primary hover:bg-[#5D4E37] active:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-300 text-primary-foreground text-lg" asChild>
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
            <Brain className="h-10 w-10 text-primary"/> Explore Our AI Advisors
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
            {advisors.map((advisor) => {
              const imageUrl = getImageUrl(advisor);
              return (
                <Card
                  key={advisor.id}
                  className="flex flex-col hover:shadow-xl transition-shadow duration-300 bg-card"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="text-xl font-bold text-[#5D4E37] flex items-center gap-2">
                        {renderIcon(advisor.iconName)}
                        {advisor.name}
                      </CardTitle>
                      {getTierBadge(advisor.tier)}
                    </div>
                    <CardDescription className="text-sm font-medium text-[#5D4E37]/70">
                      {advisor.shortDescription}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-grow space-y-3">
                    {imageUrl && (
                      <div className="relative h-64 w-full rounded-lg overflow-hidden border bg-muted">
                        <Image
                          src={imageUrl}
                          alt={advisor.name}
                          fill
                          className="object-contain"
                          unoptimized
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Coins className="h-4 w-4 text-[#5D4E37]/70" />
                      <span className="font-semibold text-[#5D4E37]">
                        {advisor.creditCostBase} credits base
                      </span>
                    </div>

                    {advisor.tags && advisor.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {advisor.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="border-t pt-4">
                    <Button asChild className="w-full font-bold bg-primary hover:bg-[#5D4E37] active:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-300 text-primary-foreground">
                      <Link href={`/advisors/${advisor.slug}`}>
                        Consult Advisor
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.4s' }}>
        <Card
          className="shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col border-2 border-primary/50 bg-muted/50"
          data-ai-hint="promo asset generator"
        >
          <CardHeader className="text-center p-6">
              <Palette className="mx-auto h-16 w-16 text-[#006B3E] mb-3"/>
              <CardTitle className="text-4xl font-black text-[#5D4E37]">Join the Creator Lab</CardTitle>
              <CardDescription className="text-[#5D4E37] font-bold max-w-2xl mx-auto text-lg">
                Sign up for FREE as a leaf user. Buy budget friendly credits to chat to our AI research advisors, or dive into our AI Creator Lab and create your own apparel and print on demand caps, hoodies, tshirts. Earn cash and sell your designs in our Tree house collective store. Design your club art, flyers, furniture, wall art, lighting, decor project with AI. Your imagination, and real experienced artisans to bring your creations to life. Lets go !!
              </CardDescription>
          </CardHeader>
          <CardFooter className="p-6 pt-0 flex justify-center">
             <Button asChild size="lg" className="text-lg bg-primary hover:bg-[#5D4E37] active:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-300 text-primary-foreground font-semibold py-4 px-8 rounded-full shadow-lg">
              <Link href="/design/brand-assets">
                <Sparkles className="mr-2 h-5 w-5" />
                Sign up
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      {featuredStickerSets.length > 0 && (
        <section className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.5s' }}>
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-foreground tracking-tight flex items-center justify-center gap-2">
              <ImageIconLucide className="h-10 w-10 text-primary" /> Featured Sticker Sets
            </h2>
            <p className="text-lg text-foreground max-w-2xl mx-auto mt-3">
              Check out the latest designs created by our community.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredStickerSets.map(set => <FeaturedStickerCard key={set.id} stickerSet={set} />)}
          </div>
        </section>
      )}
      
    </div>
  );
}
