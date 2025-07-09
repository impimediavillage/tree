
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, functions } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Dispensary, Product, ProductAttribute, PriceTier, CartItem } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, MapPin, Clock, Tag, ShoppingCart, Info, Search, FilterX, Leaf as LeafIcon, Flame, Zap, ChevronLeft, ChevronRight, X, ImageIcon as ImageIconLucide, Sparkles, Brain, Gift, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/contexts/CartContext'; 
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


// New component for displaying info in a dialog
const InfoDialog = ({ triggerText, title, icon: Icon, children, items, itemType, className }: { triggerText: string; title: string; icon: React.ElementType; children?: React.ReactNode; items?: (string | ProductAttribute)[]; itemType?: 'flavor' | 'effect' | 'medical'; className?: string; }) => {
  if (!children && (!items || items.length === 0)) return null;
  
  const isDescription = triggerText === 'Full Description';

  const badgeColors = {
    flavor: [
      "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800",
      "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800",
      "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800"
    ],
    effect: [
      "bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800",
      "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800",
      "bg-red-100 text-red-800", "bg-orange-100 text-orange-800"
    ],
    medical: [
      "bg-green-100 text-green-800", "bg-teal-100 text-teal-800",
      "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800",
      "bg-stone-200 text-stone-800", "bg-gray-200 text-gray-800"
    ]
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("text-xs h-7 px-2", className)}>
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className={isDescription ? 'sm:max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {title}</DialogTitle>
           {isDescription && <DialogDescription>Full Product Details</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
            {children}
            {children && items && items.length > 0 && <Separator className="my-4" />}
            {items && items.length > 0 && (
              <div className="flex flex-col items-start gap-2 py-4">
                <div className="flex flex-wrap gap-2">
                  {items.map((item, index) => {
                      const isAttribute = typeof item === 'object' && 'name' in item;
                      const name = isAttribute ? item.name : item;
                      const percentage = isAttribute ? (item as ProductAttribute).percentage : null;

                      return (
                      <Badge key={index} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors[itemType!][index % badgeColors[itemType!].length])}>
                          {name} {percentage && <span className="ml-1.5 font-semibold">({percentage})</span>}
                      </Badge>
                      );
                  })}
                </div>
                {(itemType === 'effect' || itemType === 'medical') && (
                    <div className="p-2 mt-4 rounded-md border border-dashed bg-muted/50 text-xs w-full">
                        <p className="font-semibold text-muted-foreground mb-1.5">Percentage Key:</p>
                        <p className="text-muted-foreground leading-snug">
                            Indicates the reported likelihood of an effect or its potential as a medical aid.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
                            <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
                            <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
                        </div>
                    </div>
                )}
              </div>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

type ThemeKey = 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative';

type GeneratedThemeAssets = {
  logoUrl: string;
  productMontageUrl: string;
  stickerSheetUrl: string;
};

interface DesignViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  tier: PriceTier | null;
}

function DesignViewerDialog({ isOpen, onOpenChange, product, tier }: DesignViewerDialogProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [generatingTheme, setGeneratingTheme] = useState<ThemeKey | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<Partial<Record<ThemeKey, GeneratedThemeAssets>>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<ThemeKey>('clay');
  
  const generationInitiated = useRef(false);

  useEffect(() => {
    const generateInitial = async () => {
      if (!product || !product.strain) {
        toast({ title: "Strain Name Missing", description: "Cannot generate designs without a strain name.", variant: "destructive" });
        onOpenChange(false);
        return;
      }
      setIsLoadingInitial(true);
      generationInitiated.current = true;
      try {
        const { generateInitialClayLogo } = await import('@/ai/flows/generate-thc-promo-designs');
        const { logoUrl } = await generateInitialClayLogo({ strain: product.strain });
        
        // Fetch remaining assets for the clay theme
        const { generateThemeAssets } = await import('@/ai/flows/generate-thc-promo-designs');
        const themeAssets = await generateThemeAssets({ strain: product.strain, theme: 'clay', logoUrl });
        
        setGeneratedAssets(prev => ({...prev, clay: themeAssets}));
      } catch (error) {
        console.error("Error generating initial designs:", error);
        toast({ title: "Design Generation Failed", description: "Could not generate initial designs. Please try again.", variant: "destructive" });
        onOpenChange(false);
      } finally {
        setIsLoadingInitial(false);
      }
    };

    if (isOpen && !generationInitiated.current) {
      generateInitial();
    } else if (!isOpen) {
      setTimeout(() => {
        setGeneratedAssets({});
        setIsLoadingInitial(true);
        setGeneratingTheme(null);
        setActiveTab('clay');
        generationInitiated.current = false;
      }, 300);
    }
  }, [isOpen, product, onOpenChange, toast]);
  
  const handleTabChange = async (newTab: string) => {
    const themeKey = newTab as ThemeKey;
    setActiveTab(themeKey);

    if (generatedAssets[themeKey] || generatingTheme) return;

    setGeneratingTheme(themeKey);
    try {
        const { generateInitialClayLogo, generateThemeAssets } = await import('@/ai/flows/generate-thc-promo-designs');
        
        // A placeholder logo generation for the new theme - can be optimized to generate a themed logo
        const { logoUrl } = await generateInitialClayLogo({ strain: product!.strain! });
        const themeAssets = await generateThemeAssets({ strain: product!.strain!, theme: themeKey, logoUrl });
        
        setGeneratedAssets(prev => ({ ...prev, [themeKey]: themeAssets }));
    } catch (error) {
        console.error(`Error generating designs for theme ${themeKey}:`, error);
        toast({ title: "Design Generation Failed", description: `Could not generate designs for ${themeKey} theme.`, variant: "destructive" });
    } finally {
        setGeneratingTheme(null);
    }
  };

  async function downscaleImage(dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } } 
            else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8)); 
        };
        img.onerror = (err) => reject(err);
        img.src = dataUrl;
    });
  }

  const handleAddToCartAndDownload = async () => {
    const currentAssets = generatedAssets[activeTab];
    if (!product || !tier || !currentAssets) return;
    setIsProcessing(true);
    toast({ title: "Processing...", description: "Preparing your design pack and cart item." });
    
    let cartImageUrl = product.imageUrls?.[0] || null;
    try {
        cartImageUrl = await downscaleImage(currentAssets.logoUrl, 150, 150);
    } catch(e) {
        toast({ title: "Image Warning", description: "Could not downscale image, using original product image.", variant: "default"});
    }
    const cartItemId = `design-${product.id}-${tier.unit}`;
    
    const designPackProduct: Product = {
      ...product,
      id: cartItemId, name: `Design Pack: ${product.name}`,
      description: `PROMO_DESIGN_PACK|${product.name}|${tier.unit}`,
      imageUrl: cartImageUrl, imageUrls: cartImageUrl ? [cartImageUrl] : [],
    };
    
    const designPackTier: PriceTier = { ...tier, unit: 'Design Pack', };
    
    addToCart(designPackProduct, designPackTier, 1);
    
    // Download logic
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const allLogosToDownload = Object.values(generatedAssets).map(asset => asset?.logoUrl).filter(Boolean) as string[];

      const fetchPromises = allLogosToDownload.map((url, i) =>
          fetch(url)
              .then(res => res.blob())
              .then(blob => ({ name: `${product.name}_logo_${Object.keys(generatedAssets)[i]}.png`, blob }))
              .catch(e => { console.error(`Failed to fetch ${url}`, e); return null; })
      );
      
      const fetchedImages = (await Promise.all(fetchPromises)).filter(Boolean) as { name: string; blob: Blob }[];
      fetchedImages.forEach(img => { zip.file(img.name, img.blob); });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${product.name}_logos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch(e) {
        toast({ title: "Download Failed", description: "Could not prepare the zip file for download.", variant: "destructive" });
    }

    setIsProcessing(false);
    onOpenChange(false);
  };
  
  const designTabs: { value: ThemeKey; title: string; }[] = [
    { value: 'clay', title: '3D Clay' },
    { value: 'comic', title: '2D Comic' },
    { value: 'rasta', title: 'Retro 420' },
    { value: 'farmstyle', title: 'Farmstyle' },
    { value: 'imaginative', title: 'Imaginative' },
  ];
  
  const currentThemeAssets = generatedAssets[activeTab];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Generated Designs for: {product?.name}</DialogTitle>
          <DialogDescription>
            Review the generated designs below. Add the pack to your cart to receive the design files and your free product sample.
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingInitial && (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <p className="mt-4 text-lg text-muted-foreground">Generating initial '3D Clay' theme...</p>
            </div>
        )}
        
        {!isLoadingInitial && (
            <>
                {currentThemeAssets && (
                    <div className="flex justify-end p-4 border-b">
                        <Button onClick={handleAddToCartAndDownload} size="lg" className="bg-green-600 hover:bg-green-700 text-white" disabled={isProcessing}>
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShoppingCart className="mr-2 h-5 w-5" />}
                            Add Design Pack to Cart &amp; Download Logos
                        </Button>
                    </div>
                )}
                <Tabs defaultValue="clay" className="w-full" onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-5">
                        {designTabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value}>{tab.title}</TabsTrigger>
                        ))}
                    </TabsList>
                    {designTabs.map(tab => (
                        <TabsContent key={tab.value} value={tab.value}>
                          {generatingTheme === tab.value ? (
                            <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                          ) : generatedAssets[tab.value] ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                               <Card><CardHeader><CardTitle>Logo</CardTitle></CardHeader><CardContent><div className="relative aspect-square"><Image src={generatedAssets[tab.value]!.logoUrl} alt={`${tab.title} Logo`} fill className="object-contain p-2"/></div></CardContent></Card>
                               <Card><CardHeader><CardTitle>Product Montage</CardTitle></CardHeader><CardContent><div className="relative aspect-square"><Image src={generatedAssets[tab.value]!.productMontageUrl} alt={`${tab.title} Montage`} fill className="object-contain p-2"/></div></CardContent></Card>
                               <Card><CardHeader><CardTitle>Sticker Sheet</CardTitle></CardHeader><CardContent><div className="relative aspect-square"><Image src={generatedAssets[tab.value]!.stickerSheetUrl} alt={`${tab.title} Sticker Sheet`} fill className="object-contain p-2"/></div></CardContent></Card>
                            </div>
                          ) : (
                             <div className="flex items-center justify-center h-64 text-muted-foreground">Select tab to generate this theme.</div>
                          )}
                        </TabsContent>
                    ))}
                </Tabs>
            </>
        )}
        
      </DialogContent>
    </Dialog>
  )
}

interface PublicProductCardProps {
  product: Product;
  tier: PriceTier;
  onGenerateDesigns: (product: Product, tier: PriceTier) => void;
}

function PublicProductCard({ product, tier, onGenerateDesigns }: PublicProductCardProps) {
  const { addToCart, cartItems } = useCart(); 
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const images = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls.filter(Boolean) as string[] : (product.imageUrl ? [product.imageUrl] : []);

  const openViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsViewerOpen(true);
  };
  
  const gridColsClass = images.length > 1 ? 'grid-cols-2' : 'grid-cols-1';
  const gridRowsClass = images.length > 2 ? 'grid-rows-2' : 'grid-rows-1';
  
  const ImageCollageComponent = images.length > 0 ? (
    <div className="mb-4">
      <div className={cn('grid h-48 w-full gap-0.5 rounded-md overflow-hidden', gridColsClass, gridRowsClass)}>
        {images.slice(0, 4).map((url, i) => (
          <div
            key={url ? `${url}-${i}` : i}
            className={cn(
              'relative cursor-pointer overflow-hidden',
              images.length === 3 && i === 2 && 'col-span-2',
              images.length === 1 && 'col-span-2 row-span-2'
            )}
            onClick={() => openViewer(i)}
          >
            {url && <Image src={url} alt={`${product.name} image ${i + 1}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-300 hover:scale-105" />}
            {images.length > 4 && i === 3 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60"><span className="text-white text-2xl font-bold">+{images.length - 3}</span></div>
            )}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const dataAiHintProduct = `${product.category} ${product.name.split(" ")[0] || ""}`;

  const tierStock = tier.quantityInStock ?? 0;
  
  const cartItemId = `${product.id}-${tier.unit}`;
  const itemInCart = cartItems.find(item => item.id === cartItemId);
  const currentQuantityInCart = itemInCart?.quantity || 0;
  const canAddToCart = tierStock > currentQuantityInCart;

  const isThcProduct = product.dispensaryType === "Cannibinoid store" && product.category === "THC";
  
  const handleAddToCartClick = () => {
    addToCart(product, tier, 1);
  };

  const effectsClasses = "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:hover:bg-purple-800/70";
  const flavorsClasses = "border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:hover:bg-green-800/70";
  const medicalClasses = "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-800/70";
  const infoClasses = "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-800/70";

  const infoButtons = (
    <div className="w-full pt-3">
      <div className="flex flex-wrap gap-2 justify-center">
        <InfoDialog className={effectsClasses} title={`Effects of ${product.name}`} triggerText="Effects" items={product.effects || []} itemType="effect" icon={Sparkles}>
          {ImageCollageComponent}
        </InfoDialog>
        <InfoDialog className={flavorsClasses} title={`Flavors in ${product.name}`} triggerText="Flavors" items={product.flavors || []} itemType="flavor" icon={LeafIcon}>
          {ImageCollageComponent}
        </InfoDialog>
        <InfoDialog className={medicalClasses} title={`Potential Medical Uses of ${product.name}`} triggerText="Medical Uses" items={product.medicalUses || []} itemType="medical" icon={Brain}>
          {ImageCollageComponent}
        </InfoDialog>
        <InfoDialog className={infoClasses} title={product.name} triggerText="Full Description" icon={Info}>
            {product.description ? (
                <>
                    {ImageCollageComponent}
                    {ImageCollageComponent && <Separator className="my-4" />}
                    <div className="py-2 whitespace-pre-wrap text-sm text-foreground">
                        {product.description}
                    </div>
                </>
            ) : ImageCollageComponent}
        </InfoDialog>
      </div>
    </div>
  );

  return (
    <>
      <Card 
          className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full bg-card text-card-foreground group border border-border hover:border-primary/60 animate-fade-in-scale-up"
          style={{ animationFillMode: 'backwards' }}
          data-ai-hint={dataAiHintProduct}
      >
        <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-muted group">
          {images.length > 0 ? (
            <div className={cn('grid h-full w-full gap-0.5', gridColsClass, gridRowsClass)}>
              {images.slice(0, 4).map((url, i) => (
                <div
                  key={url ? `${url}-${i}`: i}
                  className={cn(
                    'relative cursor-pointer overflow-hidden',
                    images.length === 3 && i === 2 && 'col-span-2',
                    images.length === 1 && 'col-span-2 row-span-2'
                  )}
                  onClick={() => openViewer(i)}
                >
                  {url && (
                    <Image
                      src={url}
                      alt={`${product.name} image ${i + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={`product image ${product.name}`}
                    />
                  )}
                  {images.length > 4 && i === 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="text-white text-2xl font-bold">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIconLucide className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
              {product.thcContent && (
                  <Badge variant="secondary" className="bg-red-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                      <Flame className="h-3.5 w-3.5 mr-1" /> THC: {product.thcContent}
                  </Badge>
              )}
              {product.cbdContent && (
                  <Badge variant="secondary" className="bg-blue-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                      <LeafIcon className="h-3.5 w-3.5 mr-1" /> CBD: {product.cbdContent}
                  </Badge>
              )}
          </div>
           {tierStock > 0 ? (
              <Badge variant="default" className="absolute top-2 right-2 bg-green-600/90 hover:bg-green-700 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">In Stock</Badge>
          ) : (
              <Badge variant="destructive" className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground backdrop-blur-sm text-xs px-2 py-1 shadow">Out of Stock</Badge>
          )}
        </div>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg font-semibold truncate text-primary" title={product.name}>{product.name}</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5"/> <span>{product.category}</span>
              {product.strain && <span className="truncate">| {product.strain}</span>}
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col space-y-2.5 py-2">
            <div className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed h-10" title={product.description}>{product.description}</p>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 pt-3 mt-auto">
          {isThcProduct ? (
            <>
              <div className="w-full text-right">
                <p className="text-2xl font-bold text-black dark:text-white">
                  <span className="text-sm font-semibold text-green-600 align-top">{product.currency} </span>
                  {tier.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-end text-xs text-muted-foreground">
                  <span className="mr-1">/ {tier.unit}</span>
                  <Gift className="h-3 w-3 mr-1" />
                  <span>Sticker price</span>
                </div>
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                  FREE SAMPLE with this sticker
                </p>
              </div>
              <div className="w-full p-2 text-center bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                  Press Buy Design below to buy a strain sticker and receive your free sample.
                </p>
              </div>
              <div className="w-full space-y-2">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-md font-bold flex items-center justify-center gap-2.5"
                  disabled={tierStock <= 0}
                  onClick={() => onGenerateDesigns(product, tier)}
                  aria-label={`Buy design for ${product.name}`}
                >
                  <Sparkles className="h-5 w-5" />
                  Buy design
                </Button>
              </div>
            </>
          ) : (
            <>
                <div className="w-full text-right">
                    <p className="text-2xl font-bold text-black dark:text-white">
                        <span className="text-sm font-semibold text-green-600 align-top">{product.currency} </span>
                        {tier.price.toFixed(2)}
                    </p>
                    <div className="flex items-center justify-end text-xs text-muted-foreground">
                        <span className="mr-1">/ {tier.unit}</span>
                    </div>
                </div>
                <div className="w-full">
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md font-semibold"
                    disabled={tierStock <= 0 || !canAddToCart}
                    onClick={handleAddToCartClick}
                    aria-label={tierStock > 0 ? (canAddToCart ? `Add ${product.name} to cart` : `Max stock of ${product.name} in cart`) : `${product.name} is out of stock`}
                >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {tierStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
                </div>
            </>
          )}
          {infoButtons}
        </CardFooter>
      </Card>
      
      {/* Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>
              Image {selectedImageIndex + 1} of {images.length}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video w-full">
            {images[selectedImageIndex] && (
              <Image
                src={images[selectedImageIndex]!}
                alt={`${product.name} image ${selectedImageIndex + 1}`}
                fill
                className="object-contain rounded-md"
                data-ai-hint={`product fullscreen ${product.name}`}
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)} aria-label="Previous image"><ChevronLeft className="h-4 w-4" /></Button>
              <div className="flex items-center gap-2 overflow-x-auto p-1">
                {images.map((url, i) => (
                  url && ( <button key={url} className={cn("h-16 w-16 rounded-md border-2 flex-shrink-0", i === selectedImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100")} onClick={() => setSelectedImageIndex(i)}><div className="relative h-full w-full rounded overflow-hidden"><Image src={url} alt={`Thumbnail ${i+1}`} fill className="object-cover"/></div></button>)
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={() => setSelectedImageIndex((prev) => (prev + 1) % images.length)} aria-label="Next image"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


export default function WellnessStorePage() {
  const params = useParams();
  const wellnessId = params.dispensaryId as string;
  const router = useRouter();

  const [wellness, setWellness] = useState<Dispensary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [designViewerState, setDesignViewerState] = useState<{product: Product | null, tier: PriceTier | null}>({product: null, tier: null});
  
  const handleGenerateDesignsClick = (product: Product, tier: PriceTier) => {
    setDesignViewerState({ product, tier });
    setIsViewerOpen(true);
  };

  useEffect(() => {
    if (!wellnessId) {
      setError("Wellness ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchWellnessData = async () => {
      setIsLoading(true);
      try {
        const wellnessDocRef = doc(db, 'dispensaries', wellnessId);
        const wellnessSnap = await getDoc(wellnessDocRef);

        if (!wellnessSnap.exists() || wellnessSnap.data()?.status !== 'Approved') {
          setError('Wellness profile not found or not available.');
          setIsLoading(false);
          return;
        }
        setWellness(wellnessSnap.data() as Dispensary);

        const productsQuery = query(
          collection(db, 'products'),
          where('dispensaryId', '==', wellnessId),
          orderBy('name')
        );
        const productsSnapshot = await getDocs(productsQuery);
        const fetchedProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);

        const uniqueCategories = Array.from(new Set(fetchedProducts.map(p => p.category)));
        setCategories(['all', ...uniqueCategories.sort()]);

      } catch (err) {
        console.error("Error fetching wellness data:", err);
        setError('Failed to load wellness information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWellnessData();
  }, [wellnessId]);

  useEffect(() => {
    let tempProducts = products;
    if (searchTerm) {
        tempProducts = tempProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }
    if (selectedCategory !== 'all') {
        tempProducts = tempProducts.filter(p => p.category === selectedCategory);
    }
    setFilteredProducts(tempProducts);
  }, [searchTerm, selectedCategory, products]);
  
  const displayItems = useMemo(() => {
    return filteredProducts.flatMap(product => {
      if (Array.isArray(product.priceTiers) && product.priceTiers.length > 0) {
        return product.priceTiers.map((tier, index) => ({
          product,
          tier,
          key: `${product.id}-${tier.unit}-${index}`
        }));
      }
      return [];
    });
  }, [filteredProducts]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading Wellness Profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-orange-500 mb-4" />
        <h2 className="text-2xl font-semibold text-destructive-foreground mb-2">{error}</h2>
        <p className="text-muted-foreground mb-6">This e-store might be temporarily unavailable or no longer exists.</p>
        <Button onClick={() => router.push('/')}>Back to Home</Button>
      </div>
    );
  }

  if (!wellness) return null; 

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card className="mb-8 shadow-xl bg-card text-card-foreground border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle 
            className="text-4xl font-extrabold text-foreground tracking-tight"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {wellness.dispensaryName}
          </CardTitle>
          <CardDescription 
            className="text-lg text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {wellness.dispensaryType}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {wellness.message && (
            <p 
                className="italic text-foreground/90"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >&quot;{wellness.message}&quot;</p>
          )}
          <div 
            className="flex items-center gap-2 text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <MapPin className="h-4 w-4" /> <span>{wellness.location}</span>
          </div>
          {(wellness.openTime || wellness.closeTime) && (
            <div 
                className="flex items-center gap-2 text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              <Clock className="h-4 w-4" />
              <span>Hours: {wellness.openTime || 'N/A'} - {wellness.closeTime || 'N/A'}</span>
            </div>
          )}
          {wellness.operatingDays && wellness.operatingDays.length > 0 && (
            <div 
                className="flex items-center gap-2 text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
               <Tag className="h-4 w-4" />
               <span>Open: {wellness.operatingDays.join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {wellness.dispensaryType === "Cannibinoid store" && (
        <Card className="mb-8 bg-primary/10 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="font-bold text-primary flex items-center justify-center gap-2">
              <Gift className="h-5 w-5"/> FREE cannabis products with your THC strain sticker, cap, t-shirt, &amp; hoodie designs.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 p-4 border rounded-lg bg-card shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                type="text"
                placeholder="Search products by name, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
            />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
                {categories.map(category => (
                    <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>


      {displayItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayItems.map(item => (
            <PublicProductCard key={item.key} product={item.product} tier={item.tier} onGenerateDesigns={handleGenerateDesignsClick} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Info className="mx-auto h-12 w-12 text-orange-500 mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Products Found</h3>
          <p 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {products.length === 0 ? "This wellness store hasn't listed any products yet." : "No products match your current filters."}
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <Button variant="outline" className="mt-4" onClick={() => {setSearchTerm(''); setSelectedCategory('all');}}>
                <FilterX className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          )}
        </div>
      )}

      <DesignViewerDialog 
        isOpen={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        product={designViewerState.product}
        tier={designViewerState.tier}
      />
    </div>
  );
}

    