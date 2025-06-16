
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, Sprout, Brain, ShieldCheck, HandHelping, UserCircle, ShoppingCart, Settings, Briefcase, DollarSign, CheckCircle, LogIn, LogOut, Trees, Loader2, Store, Users, Zap, Eye, Gift, Truck, Globe, ShieldQuestion, Bitcoin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import type { User } from '@/types';

interface AdvisorCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  dataAiHint?: string;
  delay?: number;
}

const AdvisorCard: React.FC<AdvisorCardProps> = ({ title, description, icon: Icon, link, dataAiHint, delay = 0 }) => (
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
      <Button asChild className="mt-auto w-full bg-accent hover:bg-accent/90 text-accent-foreground">
        <Link href={link}>Consult Advisor</Link>
      </Button>
    </CardContent>
  </Card>
);

const advisors: AdvisorCardProps[] = [
  {
    title: 'Cannabinoid Advisor',
    description: 'Personalized advice on THC & CBD for health and wellness, based on medical knowledge.',
    icon: Leaf,
    link: '/advisors/cannabinoid',
    dataAiHint: 'cannabis wellness',
    delay: 100,
  },
  {
    title: 'Gardening Advisor',
    description: 'Expert guidance on organic permaculture, plant identification, and companion planting.',
    icon: Sprout,
    link: '/advisors/gardening',
    dataAiHint: 'organic gardening',
    delay: 200,
  },
  {
    title: 'Homeopathic Advisor',
    description: 'Recommendations for gentle homeopathic remedies for various conditions, with dosage and sources.',
    icon: ShieldCheck,
    link: '/advisors/homeopathy',
    dataAiHint: 'homeopathy remedy',
    delay: 300,
  },
  {
    title: 'Mushroom Advisor',
    description: 'Discover mushroom-based products for mental, physical, and spiritual well-being.',
    icon: Brain,
    link: '/advisors/mushroom',
    dataAiHint: 'medicinal mushrooms',
    delay: 400,
  },
  {
    title: 'Traditional Medicine Advisor',
    description: 'Culturally relevant advice on African and indigenous healing practices and remedies.',
    icon: HandHelping,
    link: '/advisors/traditional-medicine',
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
        className="absolute top-3 right-3 z-10 bg-green-500 text-white px-2.5 py-1 text-xs shadow-md flex items-center gap-1"
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
            <benefit.icon className="h-10 w-10 text-primary mt-0.5 flex-shrink-0" /> {/* Changed to text-primary from text-accent */}
            <span className="text-sm text-muted-foreground">{benefit.text}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);


export default function HolisticAiHubPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        setCurrentUser(JSON.parse(storedUserString) as User);
      } catch (e) {
        console.error("Error parsing current user from localStorage on main page:", e);
      }
    }
    setIsLoadingUser(false);
  }, []);

 const dispensaryBenefits = [
    { text: "Engage in private, inter-dispensary trading and bulk product transactions", icon: Truck },
    { text: "E-store with product listings, shopping cart, and integrated payments (Stripe, Google Pay, Google Wallet).", icon: ShoppingCart },
    { text: "Unlimited access to the Product Sharing Pool with other dispensaries.", icon: Users },
    { text: "Full e-commerce platform with a unique public URL for your e-store.", icon: Globe },
    { text: "FREE Onboarding assistance with Payfast merchant split payment set up. Payouts go directly to your own Payfast account connected to our set up.", icon: Gift },
    { text: "Paid Google wallet onboarding assistance.", icon: DollarSign },
    { text: "Paid Stripe onboarding assistance", icon: DollarSign },
    { text: "Paid Bitcoin payment provider option", icon: Bitcoin },
  ];

  const leafUserBenefits = [
    { text: "Get instant wellness assistance with already trained, deep research Language models to plan, learn, create your optimum wellness lifestyle.", icon: Gift },
    { text: "Sign up for FREE to browse and shop our hosted stores, practices, and dispensaries.", icon: Gift },
    { text: "10 FREE CREDITS on sign up. Show the plans in the card as cool sub cards", icon: Gift },
  ];


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-12">

      <div className="p-6 bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50 rounded-lg shadow-xl animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.1s' }}>
        <div className="text-center">
          <Trees className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-5xl font-extrabold tracking-tight text-primary">
            The Dispensary Tree
          </h1>
          <p className="text-xl text-muted-foreground mt-3 max-w-2xl mx-auto">
            Your AI-powered holistic wellness hub. Explore cannabis, natural remedies, and ancient wisdom with our specialized AI advisors.
          </p>
        </div>
      </div>

      {isLoadingUser ? (
         <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !currentUser && (
        <div className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.2s' }}>
          <div className="text-center mb-8">
            <h2
              className="text-3xl font-bold text-foreground tracking-tight"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff' }}
            >
              Join Our Growing Ecosystem
            </h2>
            <p
              className="text-lg text-muted-foreground max-w-xl mx-auto mt-2 font-semibold"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff' }}
            >
              Whether you&apos;re a dispensary looking to expand your reach or an individual seeking wellness insights, The Dispensary Tree has a place for you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SignupBenefitCard
              title="Benefits of signing up as a virtual dispensary:"
              buttonText="Become a Virtual Dispensary"
              buttonLink="/dispensary-signup"
              buttonIcon={Store}
              benefits={dispensaryBenefits}
              delay={100}
              dataAiHint="dispensary signup benefits"
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
            <CardTitle className="text-2xl text-secondary-foreground flex items-center gap-2">
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
            <CardTitle className="text-2xl text-secondary-foreground flex items-center gap-2">
              <Briefcase className="h-7 w-7 text-primary" /> Welcome, Dispensary Owner!
            </CardTitle>
          </CardHeader>
          <CardContent>
             <Button asChild className="w-full md:w-auto text-lg py-3 bg-primary text-primary-foreground">
                <Link href="/dispensary-admin/dashboard">Go to Dispensary Panel</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {currentUser && (currentUser.role === 'User' || currentUser.role === 'LeafUser') && (
         <Card className="shadow-xl animate-fade-in-scale-up bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-primary">Welcome Back, {currentUser.displayName || currentUser.email?.split('@')[0]}!</CardTitle>
             <CardDescription className="text-muted-foreground">
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


      {/* AI Advisors Section */}
      <section className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.3s' }}>
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-foreground tracking-tight flex items-center justify-center gap-2">
            <Brain className="h-10 w-10 text-primary"/> Explore Our AI Advisors
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-3">
            Get specialized insights and recommendations across various domains of holistic wellness and knowledge.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advisors.map((advisor) => (
            <AdvisorCard key={advisor.title} {...advisor} />
          ))}
        </div>
      </section>
    </div>
  );
}

