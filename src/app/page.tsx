
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Leaf, Sprout, Brain, ShieldCheck, HandHelping, UserCircle, ShoppingCart, Settings, Briefcase, DollarSign, CheckCircle, LogIn, LogOut, Gift, Truck, Globe, Bitcoin, Users, Zap, Eye, ListPlus, Store, Loader2, Palette, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import type { User, StickerSet } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FeaturedStickerCard } from '@/components/cards/FeaturedStickerCard';


interface AdvisorCardProps {
  title: string;
  description: string;
  longDescription: string;
  icon: React.ElementType;
  link: string;
  imageSrc: string;
  imageHint: string;
  dataAiHint?: string;
  delay?: number;
}

const AdvisorCard: React.FC<AdvisorCardProps> = ({ title, description, longDescription, icon: Icon, link, imageSrc, imageHint, dataAiHint, delay = 0 }) => (
  <Dialog>
    <Card
      className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col animate-fade-in-scale-up bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50"
      style={{ animationFillMode: 'backwards', animationDelay: `${delay}ms` }}
      data-ai-hint={dataAiHint || title.toLowerCase().replace(' advisor', '')}
    >
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Icon className="h-10 w-10 text-primary" />
        <CardTitle className="text-xl font-semibold text-card-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <CardDescription className="text-muted-foreground mb-4 flex-grow">{description}</CardDescription>
        <DialogTrigger asChild>
            <Button className="mt-auto w-full bg-green-600 hover:bg-green-700 text-white">Learn more</Button>
        </DialogTrigger>
      </CardContent>
    </Card>
    <DialogContent className="sm:max-w-lg p-0">
        <div className="relative h-48 w-full">
            <Image src={imageSrc} alt={`${title} illustration`} layout="fill" objectFit="cover" data-ai-hint={imageHint} className="rounded-t-lg" />
        </div>
        <div className="p-6">
            <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3"><Icon className="h-7 w-7 text-primary" />{title}</DialogTitle>
                <DialogDescription className="pt-2 text-base text-muted-foreground">
                    {longDescription}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
                <Button asChild size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <Link href={link}>Consult Advisor</Link>
                </Button>
            </DialogFooter>
        </div>
    </DialogContent>
  </Dialog>
);

const advisors: AdvisorCardProps[] = [
  {
    title: 'Cannabinoid Advisor',
    description: 'Personalized advice on THC & CBD for health and wellness, based on medical knowledge.',
    longDescription: 'Our Cannabinoid Advisor leverages deep pharmacological data to provide safe, personalized guidance on using THC and CBD for a wide range of ailments. Get recommendations on dosage, delivery methods, and product types tailored to your specific needs.',
    icon: Leaf,
    link: '/advisors/cannabinoid',
    imageSrc: 'https://placehold.co/600x400.png',
    imageHint: 'cannabis leaf microscope',
    dataAiHint: 'cannabis wellness',
    delay: 100,
  },
  {
    title: 'The conscious gardener',
    description: 'Expert guidance on organic permaculture, plant identification, and companion planting.',
    longDescription: 'Cultivate a thriving, sustainable garden with our permaculture expert. "The conscious gardener" identifies plants from your photos, suggests ideal companion species, and offers organic solutions to common gardening challenges, helping you create a balanced ecosystem.',
    icon: Sprout,
    link: '/advisors/gardening',
    imageSrc: 'https://placehold.co/600x400.png',
    imageHint: 'permaculture garden',
    dataAiHint: 'organic gardening',
    delay: 200,
  },
  {
    title: 'Homeopathic Advisor',
    description: 'Recommendations for gentle homeopathic remedies for various conditions, with dosage and sources.',
    longDescription: 'Explore the world of gentle healing with our Homeopathic Advisor. It provides detailed information on remedies based on homeopathic principles, including Latin names, potency suggestions, dosage, and safe usage guidelines for both physical and emotional symptoms.',
    icon: ShieldCheck,
    link: '/advisors/homeopathy',
    imageSrc: 'https://placehold.co/600x400.png',
    imageHint: 'homeopathy remedies plants',
    dataAiHint: 'homeopathy remedy',
    delay: 300,
  },
  {
    title: 'Mushroom Advisor',
    description: 'Discover mushroom-based products for mental, physical, and spiritual well-being.',
    longDescription: 'Journey into the fungal kingdom with "Mushroom Funguy," your joyful guide to medicinal and sacred mushrooms. Get science-backed recommendations for mental clarity, physical vitality, and spiritual exploration, complete with legal disclaimers and safety advice.',
    icon: Brain,
    link: '/advisors/mushroom',
    imageSrc: 'https://placehold.co/600x400.png',
    imageHint: 'mushrooms glowing forest',
    dataAiHint: 'medicinal mushrooms',
    delay: 400,
  },
  {
    title: 'Traditional Medicine Advisor',
    description: 'Culturally relevant advice on African and indigenous healing practices and remedies.',
    longDescription: 'Connect with ancient wisdom through our Traditional Medicine Advisor. Focused on African and indigenous healing, it offers respectful, culturally appropriate advice on herbs, rituals, and diets, always encouraging consultation with licensed traditional healers.',
    icon: HandHelping,
    link: '/advisors/traditional-medicine',
    imageSrc: 'https://placehold.co/600x400.png',
    imageHint: 'african traditional healer',
    dataAiHint: 'traditional healing',
    delay: 500,
  },
];

interface SignupBenefitCardProps {
  title: string;
  buttonText: string;
  buttonLink: string;
  buttonIcon: React.ElementType;
  benefits: { text: string; icon: React.ElementType }[];
  delay?: number;
  dataAiHint?: string;
  cornerBadgeText?: string;
  cornerBadgeIcon?: React.ElementType;
}

const SignupBenefitCard: React.FC<SignupBenefitCardProps> = ({ title, buttonText, buttonLink, buttonIcon: ButtonIcon, benefits, delay = 0, dataAiHint, cornerBadgeText, cornerBadgeIcon: CornerBadgeIcon }) => (
  <Card
    className="shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col border-2 border-primary/50 animate-fade-in-scale-up bg-card/70 dark:bg-card/80 backdrop-blur-md relative"
    style={{ animationFillMode: 'backwards', animationDelay: `${delay}ms` }}
    data-ai-hint={dataAiHint || title.toLowerCase().replace(/\s+/g, '-')}
  >
    {cornerBadgeText && CornerBadgeIcon && (
      <Badge
        variant="default"
        className="absolute top-1 right-1 z-10 bg-accent text-accent-foreground px-2.5 py-1 text-xs shadow-md flex items-center gap-1"
      >
        <CornerBadgeIcon className="h-3.5 w-3.5" />
        {cornerBadgeText}
      </Badge>
    )}
    <CardHeader className="bg-muted/30 p-4 border-b border-primary/20">
      <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md">
        <Link href={buttonLink}>
          <ButtonIcon className="mr-2 h-5 w-5" />
          {buttonText}
        </Link>
      </Button>
    </CardHeader>
    <CardContent className="p-6 flex-grow">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <ul className="space-y-3">
        {benefits.map((benefit, index) => (
          <li
            key={index}
            className="flex items-start gap-3 bg-muted/20 dark:bg-muted/10 p-3 rounded-lg border border-border/30 shadow-sm hover:bg-card/60 dark:hover:bg-card/70 transition-colors duration-200"
          >
            <benefit.icon className="h-10 w-10 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{benefit.text}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);


export default function HolisticAiHubPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [featuredStickerSets, setFeaturedStickerSets] = useState<StickerSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(true);

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
  }, [fetchFeaturedStickerSets]);

 const wellnessBenefits = [
    { text: "E-store with product listings, shopping cart, and integrated payments with Payfast.", icon: ShoppingCart },
    { text: "Full e-commerce platform with a unique public URL for your e-store.", icon: Globe },
    { text: "Engage in private, inter-store trading and bulk product transactions.", icon: Truck },
    { text: "Unlimited access to the Product Sharing Pool with other wellness stores.", icon: Users },
    { text: "FREE Onboarding assistance with Payfast merchant split payment set up. Payouts go directly to your own Payfast account connected to our set up.", icon: Gift },
    { text: "Paid Google wallet onboarding assistance.", icon: DollarSign },
    { text: "Paid Stripe onboarding assistance", icon: DollarSign },
    { text: "Paid Bitcoin payment provider option", icon: Bitcoin },
  ];

  const leafUserBenefits = [
    { text: "Can't afford wellness advice? Now You can with The Wellness Tree FREE Leaf package.", icon: Gift },
    { text: "20 FREE CREDITS on sign up for You to get immediate wellness advice. Always add your gender, age, diet,and any medication you are currently on before asking any question from the AI advisors. We want You to get the very best wellness advice without wasting your credits.", icon: Gift },
    { text: "Get instant wellness assistance with already trained, deep research Language models to plan, learn, create your optimum wellness lifestyle.", icon: Gift },
    { text: "Sign up for FREE to browse and shop our hosted wellness profiles.", icon: Gift },
    { text: "Get instant access to all current and NEW AI advisors.", icon: Gift },
    { text: "Design your own strain stickers set and Promo images on caps, hoodies and tshirts to 420 your outfit with your favorite strain.", icon: Palette },
  ];


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-12">

      <div className="p-6 animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.1s' }}>
        <div className="text-center">
          
          <h1
            className="text-5xl font-extrabold tracking-tight text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            The Wellness Tree
          </h1>
          <p 
            className="text-xl text-foreground mt-3 max-w-2xl mx-auto"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Your AI-powered holistic wellness hub. Explore cannabis, natural remedies, and ancient wisdom with our specialized AI advisors.
          </p>
        </div>
      </div>
      
      {authLoading ? (
         <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !currentUser && (
        <div className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.2s' }}>
          <div className="text-center mb-8">
            <h2
              className="text-3xl font-bold text-foreground tracking-tight"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              Join Our Growing Ecosystem
            </h2>
            <p
              className="text-lg text-foreground max-w-xl mx-auto mt-2"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              Whether you're a wellness store looking to expand your reach or an individual seeking wellness insights, The Wellness Tree has a place for you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SignupBenefitCard
              title="Benefits of signing up as a virtual wellness store:"
              buttonText="Become a Virtual Wellness Store"
              buttonLink="/dispensary-signup"
              buttonIcon={Store}
              benefits={wellnessBenefits}
              delay={100}
              dataAiHint="wellness store signup benefits"
            />
            <SignupBenefitCard
              title="Benefits of signing up as a Leaf on our Tree:"
              buttonText="Become a Leaf on our Tree"
              buttonLink="/auth/signup"
              buttonIcon={Leaf}
              benefits={leafUserBenefits}
              delay={200}
              dataAiHint="leaf user signup benefits"
              cornerBadgeText="FREE"
              cornerBadgeIcon={Gift}
            />
          </div>
        </div>
      )}

      {currentUser && currentUser.role === 'Super Admin' && (
        <Card className="shadow-lg animate-fade-in-scale-up bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle 
              className="text-2xl text-foreground flex items-center gap-2"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              <Settings className="h-7 w-7 text-primary" /> Welcome, Super Admin!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full md:w-auto text-lg py-3 bg-primary text-primary-foreground">
              <Link href="/admin/dashboard">Go to Admin Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {currentUser && currentUser.role === 'DispensaryOwner' && (
         <Card className="shadow-lg animate-fade-in-scale-up bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader>
            <CardTitle 
              className="text-2xl text-foreground flex items-center gap-2"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              <Briefcase className="h-7 w-7 text-primary" /> Welcome, Wellness Owner!
            </CardTitle>
          </CardHeader>
          <CardContent>
             <Button asChild className="w-full md:w-auto text-lg py-3 bg-primary text-primary-foreground">
                <Link href="/dispensary-admin/dashboard">Go to Wellness Panel</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {currentUser && (currentUser.role === 'User' || currentUser.role === 'LeafUser') && (
         <Card className="shadow-xl animate-fade-in-scale-up bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="text-center">
            <CardTitle 
              className="text-2xl font-semibold text-foreground"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >Welcome Back, {currentUser.displayName || currentUser.email?.split('@')[0]}!</CardTitle>
             <CardDescription 
              className="text-foreground"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              Your current balance: <Badge variant="secondary" className="text-md px-2 py-0.5">{currentUser.credits ?? 0} Credits</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg" asChild>
              <Link href="/dashboard/leaf">My Dashboard</Link>
            </Button>
             <Button variant="outline" size="lg" className="text-lg" asChild>
                <Link href="/dashboard/leaf/credits">Buy More Credits</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.3s' }}>
        <div className="text-center mb-10">
          <h2 
            className="text-4xl font-bold text-foreground tracking-tight flex items-center justify-center gap-2"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <Brain className="h-10 w-10 text-primary"/> Explore Our AI Advisors
          </h2>
          <p 
            className="text-lg text-foreground max-w-2xl mx-auto mt-3"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Get specialized insights and recommendations across various domains of holistic wellness and knowledge.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advisors.map((advisor) => (
            <AdvisorCard key={advisor.title} {...advisor} />
          ))}
        </div>
      </section>

      <section className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.4s' }}>
        <Card
          className="shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col border-2 border-primary/50 bg-card/70 dark:bg-card/80 backdrop-blur-md"
          data-ai-hint="promo asset generator"
        >
          <CardHeader className="text-center p-6">
              <Palette className="mx-auto h-12 w-12 text-primary mb-3"/>
              <CardTitle className="text-2xl font-bold">AI Asset Generator</CardTitle>
              <CardDescription className="text-muted-foreground max-w-md mx-auto">
                Instantly create unique logos, sticker sheets, and apparel mockups for your store or favorite strain.
              </CardDescription>
          </CardHeader>
          <CardFooter className="p-6 pt-0">
             <Button asChild size="lg" className="w-full text-lg bg-green-600 hover:bg-green-700 text-white">
              <Link href="/design/brand-assets">
                <Sparkles className="mr-2 h-5 w-5" />
                Design Your Own Sticker & Apparel Pack
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>

      {featuredStickerSets.length > 0 && (
        <section className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.5s' }}>
          <div className="text-center mb-10">
            <h2
              className="text-4xl font-bold text-foreground tracking-tight flex items-center justify-center gap-2"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              <ImageIcon className="h-10 w-10 text-primary" /> Featured Sticker Sets
            </h2>
            <p
              className="text-lg text-foreground max-w-2xl mx-auto mt-3"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
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

    