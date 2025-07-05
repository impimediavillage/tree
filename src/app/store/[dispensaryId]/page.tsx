
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
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
            {children ? children : (
              <div className="flex flex-col items-start gap-2 py-4">
                <div className="flex flex-wrap gap-2">
                  {items && itemType && items.map((item, index) => {
                      const isAttribute = typeof item === 'object' && 'name' in item;
                      const name = isAttribute ? item.name : item;
                      const percentage = isAttribute ? (item as ProductAttribute).percentage : null;

                      return (
                      <Badge key={index} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors[itemType][index % badgeColors[itemType].length])}>
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

type GeneratedDesigns = {
    logoUrl_clay: string;
    productMontageUrl_clay: string;
    stickerSheetUrl_clay: string;
    logoUrl_comic: string;
    productMontageUrl_comic: string;
    stickerSheetUrl_comic: string;
    stickerSheetUrl_rasta: string;
    logoUrl_rasta: string;
    productMontageUrl_rasta: string;
    logoUrl_farmstyle: string;
    productMontageUrl_farmstyle: string;
    stickerSheetUrl_farmstyle: string;
    logoUrl_imaginative: string;
    productMontageUrl_imaginative: string;
    stickerSheetUrl_imaginative: string;
};

interface DesignCtaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  designs: GeneratedDesigns | null;
  product: Product;
  tier: PriceTier;
}

function DesignCtaDialog({ isOpen, onOpenChange, designs, product, tier }: DesignCtaDialogProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleConfirmAddToCart = () => {
    if (!product || !tier || !designs) return;
    const designProductId = `design-${product.id}-${tier.unit}`;
    const designProduct: Product = {
      ...product,
      id: designProductId,
      name: `Design Pack: ${product.name}`,
      description: `PROMO_DESIGN_PACK|${product.name}|${tier.unit}`,
      imageUrls: null,
      imageUrl: null, 
    };
    const designTier: PriceTier = {
      ...tier,
      unit: 'Design Pack',
    };
    addToCart(designProduct, designTier, 1);
    onOpenChange(false);
  };

  const handleDownloadZip = async () => {
    if (!designs) return;
    setIsDownloading(true);
    toast({ title: "Preparing Download...", description: "Please wait while we zip the design files." });
    try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        const designImages = [
            { name: `${product.name}-clay-logo.png`, url: designs.logoUrl_clay },
            { name: `${product.name}-comic-logo.png`, url: designs.logoUrl_comic },
            { name: `${product.name}-rasta-logo.png`, url: designs.logoUrl_rasta },
            { name: `${product.name}-farmstyle-logo.png`, url: designs.logoUrl_farmstyle },
            { name: `${product.name}-imaginative-logo.png`, url: designs.logoUrl_imaginative },
        ];

        const fetchPromises = designImages.map(img =>
            fetch(img.url)
                .then(res => res.blob())
                .then(blob => ({ name: img.name, blob }))
                .catch(e => {
                    console.error(`Failed to fetch ${img.url}`, e);
                    return null;
                })
        );
        
        const fetchedImages = (await Promise.all(fetchPromises)).filter(Boolean) as { name: string; blob: Blob }[];
        
        if(fetchedImages.length !== designImages.length) {
            toast({ title: "Download Incomplete", description: "Some design images could not be fetched. The zip file may be incomplete.", variant: "destructive" });
        }

        fetchedImages.forEach(img => {
            zip.file(img.name, img.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${product.name}_design_pack_preview.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch(e) {
        console.error("Failed to create or download zip", e);
        toast({ title: "Download Failed", description: "Could not prepare the zip file for download.", variant: "destructive" });
    } finally {
        setIsDownloading(false);
    }
  };

  const designPreviews = designs ? [
    { title: "3D Clay", url: designs.logoUrl_clay },
    { title: "2D Comic", url: designs.logoUrl_comic },
    { title: "Rasta Reggae", url: designs.logoUrl_rasta },
    { title: "Farmstyle", url: designs.logoUrl_farmstyle },
    { title: "Imaginative", url: designs.logoUrl_imaginative },
  ] : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Download Your Design Pack!</DialogTitle>
          <DialogDescription className="text-base text-green-600 dark:text-green-400 font-semibold flex items-center gap-2">
            <Gift className="h-5 w-5" /> Your purchase includes a FREE sample of {product.name} ({tier.unit}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4 py-4">
            {designPreviews.map(({title, url}) => (
                <div key={title} className="space-y-2 text-center">
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                        <Image src={url} alt={title} fill className="object-contain p-2"/>
                    </div>
                    <p className="text-sm font-medium">{title}</p>
                </div>
            ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
            <Button onClick={handleDownloadZip} variant="outline" className="w-full sm:w-auto" disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                Download Design Previews (ZIP)
            </Button>
            <Button onClick={handleConfirmAddToCart} size="lg" className="w-full sm:flex-grow bg-primary text-primary-foreground text-lg">
                <ShoppingCart className="mr-3 h-5 w-5" />
                Add Design Pack to Cart
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


interface PublicProductCardProps {
  product: Product;
  tier: PriceTier;
}

function PublicProductCard({ product, tier }: PublicProductCardProps) {
  const { addToCart, cartItems } = useCart(); 
  const { toast } = useToast();
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const [isGeneratingDesigns, setIsGeneratingDesigns] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesigns | null>(null);
  const [isCtaDialogOpen, setIsCtaDialogOpen] = useState(false);

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
  
  const handleGenerateDesigns = async () => {
    if (!product.strain) {
      toast({ title: "Strain Name Missing", description: "Cannot generate designs without a strain name.", variant: "destructive" });
      return;
    }
    setIsGeneratingDesigns(true);
    setGeneratedDesigns(null);
    try {
      const { generateThcPromoDesigns } = await import('@/ai/flows/generate-thc-promo-designs');
      const result = await generateThcPromoDesigns({ strain: product.strain });
      setGeneratedDesigns(result);
      setIsCtaDialogOpen(true);
    } catch (error) {
      console.error("Error generating designs:", error);
      toast({ title: "Design Generation Failed", description: "Could not generate promotional designs. Please try again later.", variant: "destructive" });
    } finally {
      setIsGeneratingDesigns(false);
    }
  };

  const handleAddToCartClick = () => {
    if (isThcProduct) {
      handleGenerateDesigns();
    } else {
      addToCart(product, tier, 1);
    }
  };

  const effectsClasses = "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:hover:bg-purple-800/70";
  const flavorsClasses = "border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:hover:bg-green-800/70";
  const medicalClasses = "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-800/70";
  const infoClasses = "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-800/70";

  const infoButtons = (
    <div className="w-full pt-3 mt-auto">
      <div className="flex flex-wrap gap-2 justify-center">
        <InfoDialog className={effectsClasses} title={`Effects of ${product.name}`} triggerText="Effects" items={product.effects || []} itemType="effect" icon={Sparkles} />
        <InfoDialog className={flavorsClasses} title={`Flavors in ${product.name}`} triggerText="Flavors" items={product.flavors || []} itemType="flavor" icon={LeafIcon} />
        <InfoDialog className={medicalClasses} title={`Potential Medical Uses of ${product.name}`} triggerText="Medical Uses" items={product.medicalUses || []} itemType="medical" icon={Brain} />
        <InfoDialog className={infoClasses} title={product.name} triggerText="Full Description" icon={Info}>
            {product.description ? (
                <>
                    {ImageCollageComponent}
                    {ImageCollageComponent && <Separator className="my-4" />}
                    <div className="py-2 whitespace-pre-wrap text-sm text-foreground">
                        {product.description}
                    </div>
                </>
            ) : null}
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
            <div className="w-full text-right">
                <p className="text-2xl font-bold text-black dark:text-white">
                    <span className="text-sm font-semibold text-green-600 align-top">{product.currency} </span>
                    {tier.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-end text-xs text-muted-foreground">
                    <span className="mr-1">/ {tier.unit}</span>
                </div>
            </div>
            
            <div className="w-full pt-2">
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md font-semibold"
                    disabled={tierStock <= 0 || !canAddToCart || isGeneratingDesigns}
                    onClick={handleAddToCartClick}
                    aria-label={tierStock > 0 ? (canAddToCart ? `Add ${product.name} to cart` : `Max stock of ${product.name} in cart`) : `${product.name} is out of stock`}
                >
                    {isGeneratingDesigns ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                    {tierStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
            </div>
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
      
      <DesignCtaDialog 
        isOpen={isCtaDialogOpen}
        onOpenChange={setIsCtaDialogOpen} 
        designs={generatedDesigns} 
        product={product}
        tier={tier}
      />
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
              <Gift className="h-5 w-5"/> FREE cannabis products with your THC strain sticker, cap, t-shirt, & hoodie designs.
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
            <PublicProductCard key={item.key} product={item.product} tier={item.tier} />
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
    </div>
  );
}
