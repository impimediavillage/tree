'use client';

import * as React from 'react';
import Image from 'next/image';
import type { Product, PriceTier } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Info, Leaf as LeafIcon, Plus, Minus, Gift, Sparkles, Brain, Flame, Tag, ImageIcon as ImageIconLucide, ChevronLeft, ChevronRight, Truck, Handshake } from 'lucide-react';
import { useCart } from '@/contexts/CartContext'; 
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InfoDialog } from '../dialogs/InfoDialog';
import { DesignPackDialog } from '../dialogs/DesignPackDialog';


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
  const [isDesignPackOpen, setIsDesignPackOpen] = React.useState(false);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);
  const [stickerImages, setStickerImages] = React.useState<string[]>([]);
  const [randomSticker, setRandomSticker] = React.useState<string | null>(null);

  const images = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls.filter(Boolean) as string[] : (product.imageUrl ? [product.imageUrl] : []);
  const isThcProduct = product.dispensaryType === "Cannibinoid store" && product.productType === "THC";
  // Fetch sticker images for THC products
  React.useEffect(() => {
    if (isThcProduct) {
      fetch('/api/sticker-images')
        .then(res => res.json())
        .then(data => {
          if (data.images && data.images.length > 0) {
            setStickerImages(data.images);
            // Select a random sticker
            const randomIndex = Math.floor(Math.random() * data.images.length);
            setRandomSticker(data.images[randomIndex]);
          }
        })
        .catch(err => console.error('Error fetching sticker images:', err));
    }
  }, [isThcProduct]);

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
    if (onRequestProduct) {
        if (isThcProduct) {
            return (
                <>
                    <div className="w-full text-right">
                        <p className="text-2xl font-bold text-foreground">
                            <span className="text-sm font-bold text-[#3D2E17] align-top">{product.currency} </span>
                            {tier.price.toFixed(2)}
                        </p>
                        <div className="flex items-center justify-end text-xs text-muted-foreground">
                            <span>{tier.unit}</span>
                            <span className="mx-1">/</span>
                            <span>Design pack price</span>
                        </div>
                        <p className="text-xs font-extrabold text-[#3D2E17] mt-1">
                            FREE INTERSTORE PRODUCT TRADING WITH TRIPLE S DESIGN SEASONAL BUY IN.
                        </p>
                    </div>
                    <div className="w-full p-2 text-center bg-primary/10 border border-primary/20 rounded-md">
                        <p className="text-xs font-extrabold text-[#3D2E17]">
                           Buy seasonal design packs with free wholesale products for your store.
                        </p>
                    </div>
                    <div className="w-full space-y-2">
                        <Button
                            className="w-full bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5"
                            disabled={tierStock <= 0 || requestStatus === 'negotiating'}
                            onClick={() => onRequestProduct(product, tier)}
                            aria-label={`Request product ${product.name}`}
                        >
                          {requestStatus === 'negotiating' ? <><Handshake className="mr-2 h-6 w-6" /> Negotiating</> : tierStock <= 0 ? 'Out of Stock' : <><Sparkles className="h-6 w-6" /> Buy Design Pack</>}
                        </Button>
                    </div>
                </>
            );
        }
        return (
            <>
                <div className="w-full text-right">
                    <p className="text-2xl font-bold text-foreground">
                        <span className="text-sm font-bold text-primary align-top">{product.currency} </span>
                        {tier.price.toFixed(2)}
                    </p>
                    <div className="flex items-center justify-end text-xs font-semibold text-foreground/70">
                        <span className="mr-1">/ {tier.unit}</span>
                    </div>
                </div>
                <div className="w-full">
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-md font-semibold"
                        onClick={() => onRequestProduct(product, tier)}
                        disabled={requestStatus === 'negotiating' || tierStock <= 0}
                    >
                        {requestStatus === 'negotiating' ? <><Handshake className="mr-2 h-6 w-6" /> Negotiating</> : tierStock <= 0 ? 'Out of Stock' : <><Truck className="mr-2 h-6 w-6" /> Request Product</>}
                    </Button>
                </div>
            </>
        );
    }

    if (isThcProduct) {
       return (
        <>
          {/* Price Section */}
          <div className="w-full text-center">
            <p className="text-3xl font-bold text-foreground">
              <span className="text-sm font-bold text-[#3D2E17] align-top">{product.currency} </span>
              {tier.price.toFixed(2)}
            </p>
            <p className="text-sm font-bold text-[#006B3E] mt-1">Design pack price</p>
          </div>
          
          {/* Gift Section with Header, Category, THC Badge, Gift Info, Stock, and Info Button */}
          <div className="w-full p-4 text-center bg-muted/50 border-2 border-[#006B3E]/30 rounded-md space-y-3">
            {/* Product Name and Category */}
            <div className="space-y-1">
              <CardTitle className="text-xl font-black text-[#3D2E17]" title={product.name}>{product.name}</CardTitle>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground/80">
                <Tag className="h-5 w-5 text-[#006B3E]"/> <span>{product.category}</span>
                {product.strain && <span className="truncate">| {product.strain}</span>}
              </div>
            </div>
            
            {/* THC Content Badge */}
            {product.thcContent && (
              <div className="flex justify-center">
                <Badge variant="secondary" className="bg-red-500 text-white text-sm px-3 py-1">
                  <Flame className="h-4 w-4 mr-1" /> THC: {product.thcContent}
                </Badge>
              </div>
            )}
            
            {/* View Product Info Button */}
            <Button
              variant="ghost"
              size="lg"
              className="w-full flex items-center justify-center text-[#006B3E] hover:text-[#005230] hover:bg-[#006B3E]/10"
              onClick={() => setIsProductDetailsOpen(true)}
            >
              <Info className="h-8 w-8" />
            </Button>
            
            {/* Gift Info */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <Gift className="h-8 w-8 text-[#006B3E]" />
              <span className="text-lg font-bold text-[#006B3E]">{tier.unit} as FREE gift included</span>
            </div>
            
            {/* Stock Info */}
            <p className="text-sm font-semibold text-muted-foreground">Quantity available: {tierStock}</p>
          </div>
          
          {/* Buy Button */}
          <div className="w-full space-y-2">
            <Button
              className="w-full bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl flex items-center justify-center gap-2.5"
              disabled={tierStock <= 0}
              onClick={() => setIsDesignPackOpen(true)}
              aria-label={`Buy design for ${product.name}`}
            >
              <Sparkles className="h-6 w-6" />
              Buy Design Pack
            </Button>
          </div>
        </>
      );
    }
    
    return (
      <>
        <div className="w-full text-right">
            <p className="text-2xl font-bold text-foreground">
                <span className="text-sm font-semibold text-primary align-top">{product.currency} </span>
                {tier.price.toFixed(2)}
            </p>
            <div className="flex items-center justify-end text-xs text-muted-foreground">
                <span className="mr-1">/ {tier.unit}</span>
            </div>
        </div>
        <div className="w-full">
            <Button
                className="w-full bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                disabled={tierStock <= 0 || !canAddToCart}
                onClick={handleAddToCartClick}
                aria-label={tierStock > 0 ? (canAddToCart ? `Add ${product.name} to cart` : `Max stock of ${product.name} in cart`) : `${product.name} is out of stock`}
            >
                <ShoppingCart className="mr-2 h-6 w-6" />
                {tierStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
        </div>
      </>
    );
  };

  return (
    <>
      <Card 
          className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full bg-muted/50 border-border/50 group animate-fade-in-scale-up"
          style={{ animationFillMode: 'backwards' }}
          data-ai-hint={dataAiHintProduct}
      >
        <div className="relative w-full h-48 sm:h-56 overflow-hidden bg-muted/30 group">
          {isThcProduct && randomSticker ? (
            <div className="relative h-full w-full p-0 m-0">
              <Image
                src={randomSticker}
                alt={`Triple S Sticker for ${product.name}`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
                data-ai-hint={`triple s sticker ${product.name}`}
              />
            </div>
          ) : images.length > 0 ? (
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
            <div className="flex h-full w-full items-center justify-center bg-muted/30">
              <ImageIconLucide className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          {getBadgeContent()}
           {!isThcProduct && product.thcContent && (
              <Badge variant="secondary" className="absolute bottom-2 left-2 z-10 bg-red-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                  <Flame className="h-3.5 w-3.5 mr-1" /> THC: {product.thcContent}
              </Badge>
          )}
          {!isThcProduct && product.cbdContent && (
              <Badge variant="secondary" className="absolute bottom-2 right-2 z-10 bg-blue-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                  <LeafIcon className="h-3.5 w-3.5 mr-1" /> CBD: {product.cbdContent}
              </Badge>
          )}
        </div>
        {!isThcProduct && (
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-xl font-black text-[#3D2E17]" title={product.name}>{product.name}</CardTitle>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                <Tag className="h-5 w-5 text-[#006B3E]"/> <span>{product.category}</span>
                {product.strain && <span className="truncate">| {product.strain}</span>}
            </div>
          </CardHeader>
        )}
        <CardContent className="flex-grow flex flex-col space-y-2.5 py-2">
            {!isThcProduct && (
              <div className="flex-grow">
                  <p className="text-sm font-medium text-foreground/90 line-clamp-2 leading-relaxed h-10" title={product.description}>{product.description}</p>
              </div>
            )}
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
        <DialogContent className="max-w-lg w-full p-2 sm:p-4 bg-muted/50">
          <DialogHeader className="p-2">
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>
              Image {selectedImageIndex + 1} of {images.length}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-square w-full">
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 overflow-x-auto p-1">
                {images.map((url, i) => (
                  url && (
                    <button
                      key={url}
                      className={cn(
                        "h-14 w-14 rounded-md border-2 flex-shrink-0",
                        i === selectedImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      onClick={() => setSelectedImageIndex(i)}
                    >
                      <div className="relative h-full w-full rounded overflow-hidden">
                        <Image src={url} alt={`Thumbnail ${i+1}`} fill className="object-cover"/>
                      </div>
                    </button>
                  )
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedImageIndex((prev) => (prev + 1) % images.length)}
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
       {product && tier && (
        <DesignPackDialog
          isOpen={isDesignPackOpen}
          onOpenChange={setIsDesignPackOpen}
          product={product}
          tier={tier}
        />
      )}
      
      {/* Product Details Dialog for THC Products */}
      <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-hidden bg-gradient-to-br from-amber-50/95 to-green-50/95 dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-sm">
          <DialogHeader className="pb-3 border-b border-[#006B3E]/20">
            <DialogTitle className="text-3xl font-extrabold text-[#3D2E17]">{product.name}</DialogTitle>
            <DialogDescription className="text-base font-semibold text-[#5D4E37]">
              {product.category} {product.strain && `• ${product.strain}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto smooth-scroll pr-2 space-y-4" style={{ maxHeight: 'calc(90vh - 120px)' }}>
            {/* Image Carousel at Top */}
            {images.length > 0 && (
              <div className="space-y-3 pb-4 border-b border-[#006B3E]/20">
                <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-lg">
                  {images[selectedImageIndex] && (
                    <Image
                      src={images[selectedImageIndex]!}
                      alt={`${product.name} image ${selectedImageIndex + 1}`}
                      fill
                      className="object-contain"
                      data-ai-hint={`product detail ${product.name}`}
                    />
                  )}
                </div>
                
                {images.length > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-[#006B3E]/10 hover:bg-[#006B3E] hover:text-white border-[#006B3E]"
                      onClick={() => setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2 overflow-x-auto p-1 max-w-md">
                      {images.map((url, i) => (
                        url && (
                          <button
                            key={url}
                            className={cn(
                              "h-16 w-16 rounded-lg border-3 flex-shrink-0 overflow-hidden transition-all",
                              i === selectedImageIndex ? "border-[#006B3E] scale-110 shadow-lg" : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                            )}
                            onClick={() => setSelectedImageIndex(i)}
                          >
                            <div className="relative h-full w-full">
                              <Image src={url} alt={`Thumbnail ${i+1}`} fill className="object-cover"/>
                            </div>
                          </button>
                        )
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-[#006B3E]/10 hover:bg-[#006B3E] hover:text-white border-[#006B3E]"
                      onClick={() => setSelectedImageIndex((prev) => (prev + 1) % images.length)}
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Description */}
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4 border border-[#006B3E]/20">
              <h3 className="text-xl font-extrabold text-[#3D2E17] mb-2 flex items-center gap-2">
                <Info className="h-5 w-5 text-[#006B3E]" />
                Description
              </h3>
              <p className="text-base font-semibold text-[#5D4E37] leading-relaxed">{product.description}</p>
            </div>
            
            {/* Info Buttons */}
            <div className="space-y-3">
              <h3 className="text-xl font-extrabold text-[#3D2E17]">Product Information</h3>
              <div className="flex flex-wrap gap-3">
                <InfoDialog 
                  className="flex-1 min-w-[140px] border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:hover:bg-purple-800/70 font-bold" 
                  title={`Effects of ${product.name}`} 
                  triggerText="Effects" 
                  items={product.effects || []} 
                  itemType="effect" 
                  icon={Sparkles} 
                />
                <InfoDialog 
                  className="flex-1 min-w-[140px] border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-200 dark:hover:bg-green-800/70 font-bold" 
                  title={`Flavors in ${product.name}`} 
                  triggerText="Flavors" 
                  items={product.flavors || []} 
                  itemType="flavor" 
                  icon={LeafIcon} 
                />
                <InfoDialog 
                  className="flex-1 min-w-[140px] border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-800/70 font-bold" 
                  title={`Potential Medical Uses of ${product.name}`} 
                  triggerText="Medical Uses" 
                  items={product.medicalUses || []} 
                  itemType="medical" 
                  icon={Brain} 
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
