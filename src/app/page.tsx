'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Leaf, Sprout, Brain, ShieldCheck, HandHelping, UserCircle, ShoppingCart, Settings, Briefcase, DollarSign, CheckCircle, LogIn, LogOut, Gift, Truck, Globe, Bitcoin, Users, Zap, Eye, ListPlus, Store, Loader2, Palette, Sparkles, Image as ImageIconLucide, ArrowDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useCallback } from 'react';
import type { User, StickerSet } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FeaturedStickerCard } from '@/components/cards/FeaturedStickerCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PageHeader } from '@/components/ui/PageHeader';

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
      className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col animate-fade-in-scale-up bg-muted/50 border-border/50 overflow-hidden"
      style={{ animationFillMode: 'backwards', animationDelay: `${delay}ms` }}
      data-ai-hint={dataAiHint || title.toLowerCase().replace(' advisor', '')}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] w-full bg-muted/30">
            <Image src={imageSrc} alt={`${title} illustration`} layout="fill" objectFit="contain" className="p-2" data-ai-hint={imageHint} />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow flex flex-col">
          <div className="flex items-start gap-3 mb-2">
              <Icon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                <p className="text-sm font-semibold text-foreground/80 mt-1">{description}</p>
              </div>
          </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
          <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">Learn more</Button>
          </DialogTrigger>
      </CardFooter>
    </Card>
    <DialogContent className="sm:max-w-md p-0 flex flex-col h-[90vh] max-h-[600px]">
        <div className="relative aspect-video w-full flex-shrink-0">
            <Image src={imageSrc} alt={`${title} illustration`} layout="fill" objectFit="cover" data-ai-hint={imageHint} className="rounded-t-lg" />
        </div>
        <ScrollArea className="flex-grow px-6 pb-4">
            <DialogHeader className="text-left">
                <DialogTitle className="text-2xl flex items-center gap-3"><Icon className="h-7 w-7 text-primary" />{title}</DialogTitle>
                <DialogDescription className="pt-2 text-base text-muted-foreground">
                    {longDescription}
                </DialogDescription>
            </DialogHeader>
        </ScrollArea>
        <DialogFooter className="p-6 pt-4 border-t mt-auto flex-shrink-0">
            <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href={link}>Consult Advisor</Link>
            </Button>
        </DialogFooter>
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
    imageSrc: '/images/cbd1.png',
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
    imageSrc: '/images/garden.png',
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
    imageSrc: '/images/homeopathy.png',
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
    imageSrc: '/images/mushroom.png',
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
    imageSrc: '/images/healer1.png',
    imageHint: 'african traditional healer',
    dataAiHint: 'traditional healing',
    delay: 500,
  },
  {
    title: 'Qigong Advisor',
    description: 'Harmonize your mind, body, and spirit. Get personalized Qigong exercises and philosophy from an AI master.',
    longDescription: 'Unlock your vital life force (Qi) with the Qigong Advisor. This AI master guides you through ancient breathing techniques, gentle movements, and meditation practices to improve your health, reduce stress, and cultivate inner peace.',
    icon: Zap,
    link: '/advisors/qigong',
    imageSrc: '/images/qigong.png',
    imageHint: 'qigong meditation nature',
    dataAiHint: 'qigong energy healing',
    delay: 600,
  },
  {
    title: 'Flower Power Advisor',
    description: 'Explore the subtle healing energies of flower essences. Discover the perfect floral remedy for your emotional state.',
    longDescription: 'Tap into the vibrational healing of nature with the Flower Power Advisor. Describe your emotional state, and our AI will recommend specific flower essences, like Bach remedies, to help you find balance, resolve conflict, and bloom into your true self.',
    icon: Sprout,
    link: '/advisors/flower-power',
    imageSrc: '/images/flower.png',
    imageHint: 'flower remedies healing',
    dataAiHint: 'bach remedies',
    delay: 700,
  },
  {
    title: 'Aromatherapy AI',
    description: 'Inhale wellness. Find the perfect essential oil blends for your mood, health, and home environment.',
    longDescription: 'Let our Aromatherapy AI guide your senses to well-being. Get expert advice on essential oil properties, create custom blends for diffusers or topical application, and learn safe practices for everything from stress relief to boosting your immune system.',
    icon: Sparkles,
    link: '/advisors/aromatherapy',
    imageSrc: '/images/aroma.png',
    imageHint: 'aromatherapy oils diffuser',
    dataAiHint: 'essential oils',
    delay: 800,
  },
   {
    title: 'Vegan food Guru AI',
    description: 'Delicious, nutritious, and compassionate. Get plant-based recipes, nutritional advice, and vegan lifestyle tips.',
    longDescription: "Embark on a flavorful plant-based journey with the Vegan Food Guru. Whether you need a quick weeknight recipe, a plan to ensure you're getting all your nutrients, or tips for navigating restaurants, our AI has you covered with delicious and compassionate advice.",
    icon: Leaf,
    link: '/advisors/vegan-guru',
    imageSrc: '/images/vegan.png',
    imageHint: 'vegan food platter',
    dataAiHint: 'vegan food',
    delay: 900,
  },
];


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
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold py-4 px-8 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300">
                <Link href="#advisors-section">
                    <ArrowDown className="mr-2 h-5 w-5" />
                    Explore AI Advisors
                </Link>
            </Button>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 2: Create a Store */}
          <Card className="p-8 animate-fade-in-scale-up bg-muted/50 border-border/50 rounded-lg shadow-lg flex flex-col justify-between">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                Join Our Growing Ecosystem
              </h2>
              <p className="text-lg font-semibold text-foreground/90 mt-2">
                Create you own Cannibnoid store, Permaculture / Organic farming store, Homeopathy store, Traditional Medicine store, or a Mushroom store.
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
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
                Need Wellness help now?
              </h2>
              <p className="text-lg font-semibold text-foreground/90 mt-2">
                Get instant assistance now. Sign up as Leaf user and get 20 free credits. Make your own Clothing gear and much so more...
              </p>
            </div>
            <div className="mt-8 space-y-4 text-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
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
            <Button asChild className="w-full md:w-auto text-lg py-3 bg-primary text-primary-foreground">
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
             <Button asChild className="w-full md:w-auto text-lg py-3 bg-primary text-primary-foreground">
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
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg" asChild>
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {advisors.map((advisor) => (
            <AdvisorCard key={advisor.title} {...advisor} />
          ))}
        </div>
      </section>

      <section className="animate-fade-in-scale-up" style={{ animationFillMode: 'backwards', animationDelay: '0.4s' }}>
        <Card
          className="shadow-xl hover:shadow-2xl transition-shadow duration-300 flex flex-col border-2 border-primary/50 bg-muted/50"
          data-ai-hint="promo asset generator"
        >
          <CardHeader className="text-center p-6">
              <Palette className="mx-auto h-12 w-12 text-primary mb-3"/>
              <CardTitle className="text-2xl font-extrabold">AI Asset Generator</CardTitle>
              <CardDescription className="text-foreground/80 font-semibold max-w-md mx-auto">
                Instantly create unique logos, sticker sheets, and apparel mockups for your store or favorite strain.
              </CardDescription>
          </CardHeader>
          <CardFooter className="p-6 pt-0">
             <Button asChild size="lg" className="w-full text-lg bg-primary hover:bg-primary/90 text-primary-foreground">
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
