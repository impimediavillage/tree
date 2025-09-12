
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Product, PriceTier } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Info, Leaf as LeafIcon, Sparkles, Brain, Gift, Flame, Tag, CheckCircle, XCircle, ImageIcon as ImageIconLucide, ChevronLeft, ChevronRight, X, Truck, Handshake } from 'lucide-react';
import { useCart } from '@/contexts/CartContext'; 
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InfoDialog } from '../dialogs/InfoDialog';
import { DesignViewerDialog } from '../dialogs/DesignViewerDialog';


interface PublicProductCardProps {
  product: Product;
  tier: PriceTier;
  onGenerateDesigns?: (product: Product, tier: PriceTier) => void;
  onRequestProduct?: (product: Product, tier: PriceTier) => void;
  requestStatus?: 'negotiating';
  requestCount?: number;
  totalRequestedByUser?: number;
}

export function PublicProductCard({ product, tier, onGenerateDesigns, onRequestProduct, requestStatus, requestCount, totalRequestedByUser = 0 }: PublicProductCardProps) {
  const { addToCart, cartItems } = useCart(); 
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

  const images = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls.filter(Boolean) as string[] : (product.imageUrl ? [product.imageUrl] : []);

  const openViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsViewerOpen(true);
  };
  
  const gridColsClass = images.length > 1 ? 'grid-cols-2' : 'grid-cols-1';
  const gridRowsClass = images.length > 2 ? 'grid-rows-2' : 'grid-rows-1';
  
  const dataAiHintProduct = `${product.category} ${product.name.split(" ")[0] || ""}`;

  const tierStock = tier.quantityInStock ?? 999;
  
  const cartItemId = `${product.id}-${tier.unit}`;
  const itemInCart = cartItems.find(item => item.id === cartItemId);
  const currentQuantityInCart = itemInCart?.quantity || 0;
  const canAddToCart = tierStock > currentQuantityInCart;

  const isThcProduct = product.dispensaryType === "Cannibinoid store" && product.stickerProgramOptIn === "yes";
  
  const handleAddToCartClick = () => {
    addToCart(product, tier, 1);
  };
  
  const getBadgeContent = () => {
    if (requestStatus === 'negotiating') {
      return (
        <Badge variant="default" className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600 text-white backdrop-blur-sm text-xs px-2 py-1 shadow flex items-center gap-1">
          <Handshake className="h-3.5 w-3.5" />
          Negotiating ({requestCount})
        </Badge>
      );
    }
    if (tierStock > 0) {
      return (
        <Badge variant="default" className="absolute top-2 right-2 bg-green-600/90 hover:bg-green-700 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">Active</Badge>
      );
    }
    return (
      <Badge variant="destructive" className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground backdrop-blur-sm text-xs px-2 py-1 shadow">Out of Stock</Badge>
    );
  };

  const effectsClasses = "border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:hover:bg-purple-800/70";
  const flavorsClasses = "border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:hover:bg-green-800/70";
  const medicalClasses = "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-800/70";
  const infoClasses = "border-transparent bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-800/70";

  const infoButtons = (
    <div className="w-full pt-3">
      <div className="flex flex-wrap gap-2 justify-center">
        <InfoDialog className={effectsClasses} title={`Effects of ${product.name}`} triggerText="Effects" items={product.effects || []} itemType="effect" icon={Sparkles} />
        <InfoDialog className={flavorsClasses} title={`Flavors in ${product.name}`} triggerText="Flavors" items={product.flavors || []} itemType="flavor" icon={LeafIcon} />
        <InfoDialog className={medicalClasses} title={`Potential Medical Uses of ${product.name}`} triggerText="Medical Uses" items={product.medicalUses || []} itemType="medical" icon={Brain} />
        <InfoDialog className={infoClasses} title={product.name} triggerText="Full Description" icon={Info}>{product.description}</InfoDialog>
      </div>
    </div>
  );
  
  const renderFooterContent = () => {
    // If onRequestProduct is provided, we are in the "Browse Pool" context.
    if (onRequestProduct) {
        // If it's a THC product in the pool context...
        if (isThcProduct) {
            // ...show the "Buy Design" UI...
            return (
                <>
                    <div className="w-full text-right">
                        <p className="text-2xl font-bold text-black dark:text-white">
                            <span className="text-sm font-semibold text-green-600 align-top">{product.currency} </span>
                            {tier.price.toFixed(2)}
                        </p>
                        <div className="flex items-center justify-end text-xs text-muted-foreground">
                            <span>{tier.unit}</span>
                            <span className="mx-1">/</span>
                            <span>Sticker price</span>
                        </div>
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                            FREE SAMPLE with this sticker
                        </p>
                    </div>
                    <div className="w-full p-2 text-center bg-green-500/10 border border-green-500/20 rounded-md">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                            Press Buy Design Pack below to request this product for your store.
                        </p>
                    </div>
                    <div className="w-full space-y-2">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-md font-bold flex items-center justify-center gap-2.5"
                            disabled={tierStock <= 0 || requestStatus === 'negotiating'}
                            onClick={() => onRequestProduct(product, tier)}
                            aria-label={`Request product ${product.name}`}
                        >
                          {requestStatus === 'negotiating' ? <><Handshake className="mr-2 h-5 w-5" /> Negotiating</> : tierStock <= 0 ? 'Out of Stock' : <><Sparkles className="h-5 w-5" /> Buy Design Pack</>}
                        </Button>
                    </div>
                </>
            );
        }
        // For non-THC products in the pool, show the standard "Request Product" button.
        return (
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
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-md font-semibold"
                        onClick={() => onRequestProduct(product, tier)}
                        disabled={requestStatus === 'negotiating' || tierStock <= 0}
                    >
                        {requestStatus === 'negotiating' ? <><Handshake className="mr-2 h-5 w-5" /> Negotiating</> : tierStock <= 0 ? 'Out of Stock' : <><Truck className="mr-2 h-5 w-5" /> Request Product</>}
                    </Button>
                </div>
            </>
        );
    }

    // Default public store view logic
    if (isThcProduct) {
       return (
        <>
          <div className="w-full text-right">
            <p className="text-2xl font-bold text-black dark:text-white">
              <span className="text-sm font-semibold text-green-600 align-top">{product.currency} </span>
              {tier.price.toFixed(2)}
            </p>
            <div className="flex items-center justify-end text-xs text-muted-foreground">
              <span>{tier.unit}</span>
              <span className="mx-1">/</span>
              <span>Sticker price</span>
            </div>
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
              FREE SAMPLE with this sticker
            </p>
          </div>
          <div className="w-full p-2 text-center bg-green-500/10 border border-green-500/20 rounded-md">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">
              Press Buy Design Pack below to buy a strain sticker and receive your free sample.
            </p>
          </div>
          <div className="w-full space-y-2">
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white text-md font-bold flex items-center justify-center gap-2.5"
              disabled={tierStock <= 0}
              onClick={() => onGenerateDesigns?.(product, tier)}
              aria-label={`Buy design for ${product.name}`}
            >
              <Sparkles className="h-5 w-5" />
              Buy Design Pack
            </Button>
          </div>
        </>
      );
    }
    
    // Default case for regular products in public store view.
    return (
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
    );
  };


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
          {getBadgeContent()}
           {product.thcContent && (
              <Badge variant="secondary" className="absolute bottom-2 left-2 z-10 bg-red-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                  <Flame className="h-3.5 w-3.5 mr-1" /> THC: {product.thcContent}
              </Badge>
          )}
          {product.cbdContent && (
              <Badge variant="secondary" className="absolute bottom-2 right-2 z-10 bg-blue-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                  <LeafIcon className="h-3.5 w-3.5 mr-1" /> CBD: {product.cbdContent}
              </Badge>
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
             {requestStatus === 'negotiating' && (
              <div className="text-xs space-y-1 pt-1">
                <p className="font-semibold text-muted-foreground">You requested: <span className="font-bold text-orange-600">{totalRequestedByUser} {tier.unit}</span></p>
                <p className="font-semibold text-muted-foreground">Remaining stock: <span className="font-bold text-primary">{tierStock - totalRequestedByUser} {tier.unit}</span></p>
              </div>
            )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 pt-3 mt-auto">
            {renderFooterContent()}
            {infoButtons}
        </CardFooter>
      </Card>
      
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
