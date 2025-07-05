
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Dispensary, Product, ProductAttribute, PriceTier } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, MapPin, Clock, Tag, ShoppingCart, Info, Search, FilterX, Leaf as LeafIcon, Flame, Zap, ChevronLeft, ChevronRight, X, ImageIcon as ImageIconLucide, Sparkles, Brain, Gift } from 'lucide-react';
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
const InfoDialog = ({ triggerText, title, icon: Icon, children }: { triggerText: string; title: string; icon: React.ElementType; children?: React.ReactNode }) => {
  if (!children) return null;
  
  const isDescription = triggerText === 'Full Description';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 px-2">
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Dialog for viewing generated designs
interface DesignDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  designs: {
    logoUrl_clay: string;
    productMontageUrl_clay: string;
    stickerSheetUrl_clay: string;
    logoUrl_comic: string;
    productMontageUrl_comic: string;
    stickerSheetUrl_comic: string;
    logoUrl_rasta: string;
    productMontageUrl_rasta: string;
    stickerSheetUrl_rasta: string;
    logoUrl_farmstyle: string;
    productMontageUrl_farmstyle: string;
    stickerSheetUrl_farmstyle: string;
    logoUrl_trippy: string;
    productMontageUrl_trippy: string;
    stickerSheetUrl_trippy: string;
  } | null;
  strainName: string;
}

function DesignDialog({ isOpen, onOpenChange, designs, strainName }: DesignDialogProps) {
  const downloadImage = (url: string, filename: string) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((e) => console.error('Download failed:', e));
  };

  const clayItems = [
    { label: '3D Clay Logo', url: designs?.logoUrl_clay, filename: `${strainName}-logo-clay.png` },
    { label: '3D Clay Montage', url: designs?.productMontageUrl_clay, filename: `${strainName}-montage-clay.png` },
    { label: '3D Clay Stickers', url: designs?.stickerSheetUrl_clay, filename: `${strainName}-stickers-clay.png` },
  ];

  const comicItems = [
    { label: '2D Comic Logo', url: designs?.logoUrl_comic, filename: `${strainName}-logo-comic.png` },
    { label: '2D Comic Montage', url: designs?.productMontageUrl_comic, filename: `${strainName}-montage-comic.png` },
    { label: '2D Comic Stickers', url: designs?.stickerSheetUrl_comic, filename: `${strainName}-stickers-comic.png` },
  ];
  
  const rastaItems = [
    { label: 'Rasta Logo', url: designs?.logoUrl_rasta, filename: `${strainName}-logo-rasta.png` },
    { label: 'Rasta Montage', url: designs?.productMontageUrl_rasta, filename: `${strainName}-montage-rasta.png` },
    { label: 'Rasta Stickers', url: designs?.stickerSheetUrl_rasta, filename: `${strainName}-stickers-rasta.png` },
  ];

  const farmstyleItems = [
    { label: 'Farmstyle Logo', url: designs?.logoUrl_farmstyle, filename: `${strainName}-logo-farmstyle.png` },
    { label: 'Farmstyle Montage', url: designs?.productMontageUrl_farmstyle, filename: `${strainName}-montage-farmstyle.png` },
    { label: 'Farmstyle Stickers', url: designs?.stickerSheetUrl_farmstyle, filename: `${strainName}-stickers-farmstyle.png` },
  ];

  const trippyItems = [
    { label: 'Trippy Logo', url: designs?.logoUrl_trippy, filename: `${strainName}-logo-trippy.png` },
    { label: 'Trippy Montage', url: designs?.productMontageUrl_trippy, filename: `${strainName}-montage-trippy.png` },
    { label: 'Trippy Stickers', url: designs?.stickerSheetUrl_trippy, filename: `${strainName}-stickers-trippy.png` },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Generated Designs for {strainName}</DialogTitle>
          <DialogDescription>
            Five design styles have been generated. You can download each image.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="clay" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="clay">3D Clay</TabsTrigger>
            <TabsTrigger value="comic">2D Comic</TabsTrigger>
            <TabsTrigger value="rasta">Rasta Reggae</TabsTrigger>
            <TabsTrigger value="farmstyle">Farmstyle</TabsTrigger>
            <TabsTrigger value="trippy">Trippy</TabsTrigger>
          </TabsList>
          <TabsContent value="clay" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clayItems.map((item) =>
                item.url ? (
                  <div key={item.label} className="space-y-2 flex flex-col items-center">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                      <Image src={item.url} alt={item.label} fill className="object-contain" />
                    </div>
                    <Button variant="outline" onClick={() => downloadImage(item.url!, item.filename)}>
                      Download
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          </TabsContent>
          <TabsContent value="comic" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comicItems.map((item) =>
                item.url ? (
                  <div key={item.label} className="space-y-2 flex flex-col items-center">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                      <Image src={item.url} alt={item.label} fill className="object-contain" />
                    </div>
                    <Button variant="outline" onClick={() => downloadImage(item.url!, item.filename)}>
                      Download
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          </TabsContent>
          <TabsContent value="rasta" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rastaItems.map((item) =>
                item.url ? (
                  <div key={item.label} className="space-y-2 flex flex-col items-center">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                      <Image src={item.url} alt={item.label} fill className="object-contain" />
                    </div>
                    <Button variant="outline" onClick={() => downloadImage(item.url!, item.filename)}>
                      Download
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          </TabsContent>
          <TabsContent value="farmstyle" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {farmstyleItems.map((item) =>
                item.url ? (
                  <div key={item.label} className="space-y-2 flex flex-col items-center">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                      <Image src={item.url} alt={item.label} fill className="object-contain" />
                    </div>
                    <Button variant="outline" onClick={() => downloadImage(item.url!, item.filename)}>
                      Download
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          </TabsContent>
          <TabsContent value="trippy" className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trippyItems.map((item) =>
                item.url ? (
                  <div key={item.label} className="space-y-2 flex flex-col items-center">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted">
                      <Image src={item.url} alt={item.label} fill className="object-contain" />
                    </div>
                    <Button variant="outline" onClick={() => downloadImage(item.url!, item.filename)}>
                      Download
                    </Button>
                  </div>
                ) : null
              )}
            </div>
          </TabsContent>
        </Tabs>
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
  const [generatedDesigns, setGeneratedDesigns] = useState<DesignDialogProps['designs']>(null);

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

  const handleAddToCart = () => {
    addToCart(product, tier, 1);
  };

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
    } catch (error) {
      console.error("Error generating designs:", error);
      toast({ title: "Design Generation Failed", description: "Could not generate promotional designs. Please try again later.", variant: "destructive" });
    } finally {
      setIsGeneratingDesigns(false);
    }
  };
  
  const displayTier = tier ? {
      price: tier.price,
      unit: tier.unit
  } : null;

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
    ],
  };

  const isThcProduct = product.dispensaryType === "Cannibinoid store" && product.category === "THC";


  return (
    <>
      <Card 
          className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full bg-card text-card-foreground group border border-border hover:border-primary/60"
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
        <CardContent className="flex-grow space-y-2.5 py-2">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed" title={product.description}>{product.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <InfoDialog title={`Effects of ${product.name}`} triggerText="Effects" icon={Sparkles}>
                {(product.effects && product.effects.length > 0) ? (
                    <>
                        {ImageCollageComponent}
                        {ImageCollageComponent && <Separator className="my-4" />}
                        <div className="flex flex-col items-start gap-2 py-4">
                            <div className="flex flex-wrap gap-2">
                                {product.effects.map((item, index) => (
                                    <Badge key={index} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors['effect'][index % badgeColors['effect'].length])}>
                                        {item.name} {item.percentage && <span className="ml-1.5 font-semibold">({item.percentage})</span>}
                                    </Badge>
                                ))}
                            </div>
                            <div className="p-2 mt-4 rounded-md border border-dashed bg-muted/50 text-xs w-full">
                                <p className="font-semibold text-muted-foreground mb-1.5">Percentage Key:</p>
                                <p className="text-muted-foreground leading-snug">Indicates the reported likelihood of an effect.</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
                                    <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
                                    <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </InfoDialog>

            <InfoDialog title={`Flavors in ${product.name}`} triggerText="Flavors" icon={LeafIcon}>
                {(product.flavors && product.flavors.length > 0) ? (
                    <>
                        {ImageCollageComponent}
                        {ImageCollageComponent && <Separator className="my-4" />}
                        <div className="flex flex-col items-start gap-2 py-4">
                            <div className="flex flex-wrap gap-2">
                                {product.flavors.map((item, index) => (
                                    <Badge key={index} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors['flavor'][index % badgeColors['flavor'].length])}>
                                        {item}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </>
                ) : null}
            </InfoDialog>

            <InfoDialog title={`Potential Medical Uses of ${product.name}`} triggerText="Medical Uses" icon={Brain}>
                {(product.medicalUses && product.medicalUses.length > 0) ? (
                     <>
                        {ImageCollageComponent}
                        {ImageCollageComponent && <Separator className="my-4" />}
                        <div className="flex flex-col items-start gap-2 py-4">
                            <div className="flex flex-wrap gap-2">
                                {product.medicalUses.map((item, index) => (
                                    <Badge key={index} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors['medical'][index % badgeColors['medical'].length])}>
                                        {item.name} {item.percentage && <span className="ml-1.5 font-semibold">({item.percentage})</span>}
                                    </Badge>
                                ))}
                            </div>
                            <div className="p-2 mt-4 rounded-md border border-dashed bg-muted/50 text-xs w-full">
                                <p className="font-semibold text-muted-foreground mb-1.5">Percentage Key:</p>
                                <p className="text-muted-foreground leading-snug">Indicates its potential as a medical aid.</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
                                    <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
                                    <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </InfoDialog>

            <InfoDialog title={product.name} triggerText="Full Description" icon={Info}>
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
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 pt-3 border-t mt-auto">
          {displayTier && (
              <p className="text-2xl font-bold text-accent self-end">
                  {product.currency} {displayTier.price.toFixed(2)}
                  <span className="text-xs text-muted-foreground"> / {displayTier.unit}</span>
              </p>
          )}

           {isThcProduct && (
            <p className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md w-full">
              Get this FREE product with Promo material for stickers, caps, t-shirts, and hoodies to match your chosen strain.
            </p>
          )}

          <div className="flex flex-col w-full gap-2">
            {isThcProduct && (
              <Button onClick={handleGenerateDesigns} disabled={isGeneratingDesigns || !product.strain} variant="outline" className="w-full">
                {isGeneratingDesigns ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Designs
              </Button>
            )}
            <Button 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md font-semibold" 
                disabled={tierStock <= 0 || !canAddToCart}
                onClick={handleAddToCart}
                aria-label={tierStock > 0 ? (canAddToCart ? `Add ${product.name} to cart` : `Max stock of ${product.name} in cart`) : `${product.name} is out of stock`}
            >
              <ShoppingCart className="mr-2 h-5 w-5" /> 
              {tierStock <= 0 ? 'Out of Stock' : (canAddToCart ? 'Add to Cart' : 'Max in Cart')}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Viewer for product images */}
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
      
      {/* Dialog for generated designs */}
      <DesignDialog isOpen={!!generatedDesigns} onOpenChange={() => setGeneratedDesigns(null)} designs={generatedDesigns} strainName={product.strain || 'design'} />
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
