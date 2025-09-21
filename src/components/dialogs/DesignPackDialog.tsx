
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, ShoppingCart, CheckSquare, Square, Gift, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import JSZip from 'jszip';
import type { Product, PriceTier } from '@/types';

const allTripleSImages = Array.from({ length: 81 }, (_, i) => `/images/2025-triple-s/t${i + 1}.jpg`);
const allTripleS400Images = [
    '/images/2025-triple-s-400/1.png', '/images/2025-triple-s-400/10.png', 
    '/images/2025-triple-s-400/103.png', '/images/2025-triple-s-400/11.png', 
    '/images/2025-triple-s-400/110.png', '/images/2025-triple-s-400/111.png', 
    '/images/2025-triple-s-400/112.png', '/images/2025-triple-s-400/113.png', 
    '/images/2025-triple-s-400/114.png', '/images/2025-triple-s-400/115.png', 
    '/images/2025-triple-s-400/116.png', '/images/2025-triple-s-400/117.png', 
    '/images/2025-triple-s-400/118.png', '/images/2025-triple-s-400/119.png', 
    '/images/2025-triple-s-400/12.png', '/images/2025-triple-s-400/120.png', 
    '/images/2025-triple-s-400/121.png', '/images/2025-triple-s-400/122.png', 
    '/images/2025-triple-s-400/123.png', '/images/2025-triple-s-400/124.png', 
    '/images/2025-triple-s-400/125.png', '/images/2025-triple-s-400/126.png', 
    '/images/2025-triple-s-400/127.png', '/images/2025-triple-s-400/128.png', 
    '/images/2025-triple-s-400/129.png', '/images/2025-triple-s-400/13.png', 
    '/images/2025-triple-s-400/130.png', '/images/2025-triple-s-400/131.png', 
    '/images/2025-triple-s-400/132.png', '/images/2025-triple-s-400/133.png', 
    '/images/2025-triple-s-400/134.png', '/images/2025-triple-s-400/135.png', 
    '/images/2025-triple-s-400/136.png', '/images/2025-triple-s-400/137.png', 
    '/images/2025-triple-s-400/138.png', '/images/2025-triple-s-400/139.png', 
    '/images/2025-triple-s-400/14.png', '/images/2025-triple-s-400/140.png', 
    '/images/2025-triple-s-400/141.png', '/images/2025-triple-s-400/142.png', 
    '/images/2025-triple-s-400/143.png', '/images/2025-triple-s-400/144.png', 
    '/images/2025-triple-s-400/145.png', '/images/2025-triple-s-400/146.png', 
    '/images/2025-triple-s-400/147.png', '/images/2025-triple-s-400/148.png', 
    '/images/2025-triple-s-400/149.png', '/images/2025-triple-s-400/15.png', 
    '/images/2025-triple-s-400/150.png', '/images/2025-triple-s-400/151.png', 
    '/images/2025-triple-s-400/152.png', '/images/2025-triple-s-400/153.png', 
    '/images/2025-triple-s-400/154.png', '/images/2025-triple-s-400/155.png', 
    '/images/2025-triple-s-400/156.png', '/images/2025-triple-s-400/157.png', 
    '/images/2025-triple-s-400/158.png', '/images/2025-triple-s-400/159.png', 
    '/images/2025-triple-s-400/16.png', '/images/2025-triple-s-400/160.png',
    '/images/2025-triple-s-400/nav1.jpg', '/images/2025-triple-s-400/nav2.jpg',
    '/images/2025-triple-s-400/peak1.jpg', '/images/2025-triple-s-400/peak2.jpg',
    '/images/2025-triple-s-400/soar1.jpg', '/images/2025-triple-s-400/soar2.jpg'
];

const shuffleArray = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

interface DesignPackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  tier: PriceTier | null;
}

export const DesignPackDialog: React.FC<DesignPackDialogProps> = ({ isOpen, onOpenChange, product, tier }) => {
    const { toast } = useToast();
    const { addToCart } = useCart();
    
    const [step, setStep] = useState<'select_freebies' | 'select_strain'>('select_freebies');
    const [selectedFreebies, setSelectedFreebies] = useState<string[]>([]);
    const [isProcessingCart, setIsProcessingCart] = React.useState(false);
    
    const [randomStrainImages, setRandomStrainImages] = useState<string[]>([]);
    const [selectedSticker, setSelectedSticker] = useState<string | null>(null);

    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageIndex, setViewingImageIndex] = useState<number>(0);

    const maxSelectable = product && tier ? Math.ceil(tier.price / 100) : 1;

    useEffect(() => {
        if (isOpen) {
            const shuffled = shuffleArray([...allTripleS400Images]);
            setRandomStrainImages(shuffled.slice(0, 33));
        } else {
            setTimeout(() => {
                setStep('select_freebies');
                setSelectedFreebies([]);
                setSelectedSticker(null);
                setRandomStrainImages([]);
            }, 300);
        }
    }, [isOpen]);

    const handleSelectFreebie = (imageUrl: string) => {
        setSelectedFreebies(prev => {
            if (prev.includes(imageUrl)) {
                return prev.filter(item => item !== imageUrl);
            }
            if (prev.length < maxSelectable) {
                return [...prev, imageUrl];
            }
            toast({
                title: "Selection Limit Reached",
                description: `You can only select up to ${maxSelectable} sticker(s) for this price tier.`,
                variant: 'default',
            });
            return prev;
        });
    };

    const handleSelectSticker = (imageUrl: string) => {
        setSelectedSticker(prev => prev === imageUrl ? null : imageUrl);
    };

    const handleViewImage = (index: number) => {
        setViewingImageIndex(index);
        setIsImageViewerOpen(true);
    };

    const handleProceedToStrains = () => {
        setStep('select_strain');
    };

    const handleAddToCart = async () => {
        if (!product || !tier || !selectedSticker) {
             toast({ title: "No Strain Sticker Selected", description: "Please select your primary strain design first.", variant: "destructive" });
            return;
        }
        
        setIsProcessingCart(true);

        if (selectedFreebies.length > 0) {
            toast({ title: "Downloading Free Stickers...", description: `Preparing ${selectedFreebies.length} freebie(s) for download.`});
            try {
                const zip = new JSZip();
                const imageFetchPromises = selectedFreebies.map(async (url) => {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                    const blob = await response.blob();
                    const filename = url.split('/').pop() || 'sticker.jpg';
                    zip.file(filename, blob);
                });

                await Promise.all(imageFetchPromises);
                
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `TripleS_Sticker_Pack_${product.name.replace(/\s+/g, '_')}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                 toast({ title: "Download Started", description: "Your free stickers are downloading.", variant: "default" });
            } catch (error) {
                 console.error("Failed to create ZIP and download:", error);
                 toast({ title: "Download Failed", description: "Could not download the bonus stickers. They will be available in your account.", variant: "destructive" });
            }
        }

        const specialDescription = `PROMO_DESIGN_PACK|${product.name}|${tier.unit}`;
        
        const designPackProduct: Product = {
            ...product,
            id: `design-${product.id}-${tier.unit}`,
            name: `Sticker Design: ${product.name}`,
            description: specialDescription, 
            category: `Digital Design ('custom')`,
            imageUrl: selectedSticker, 
            imageUrls: [selectedSticker],
            priceTiers: [],
            quantityInStock: 999, 
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        const designPackTier: PriceTier = { ...tier, price: tier.price };
        
        addToCart(designPackProduct, designPackTier, 1);
        toast({ title: "Design Pack Added!", description: `Your custom "${product.name}" pack is in your cart.` });
        onOpenChange(false);
        setIsProcessingCart(false);
    };

    const handleNavigateViewer = (direction: 'next' | 'prev') => {
        const newIndex = direction === 'next'
            ? (viewingImageIndex + 1) % allTripleSImages.length
            : (viewingImageIndex - 1 + allTripleSImages.length) % allTripleSImages.length;
        setViewingImageIndex(newIndex);
    };

    const viewingImage = allTripleSImages[viewingImageIndex];
    const isViewingImageSelected = viewingImage ? selectedFreebies.includes(viewingImage) : false;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                    {step === 'select_freebies' && (
                        <>
                            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                                <DialogTitle>Create Your Triple S Canna Club Pack</DialogTitle>
                                <DialogDescription>
                                    Based on the price of **ZAR {tier?.price.toFixed(2)}**, you can select **{maxSelectable}** sticker(s) from our collection to bundle with your unique Triple S bud generated design.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="flex-grow px-6 pt-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                                    {allTripleSImages.map((imgSrc, index) => (
                                        <Card
                                            key={index}
                                            className="cursor-pointer transition-all duration-200 overflow-hidden relative group p-0 aspect-square"
                                            onClick={() => handleViewImage(index)}
                                        >
                                            <Image src={imgSrc} alt={`Triple S Sticker ${index + 1}`} layout="fill" objectFit="cover" />
                                            <div 
                                                className={cn(
                                                    "absolute top-1 right-1 h-6 w-6 rounded-md flex items-center justify-center border transition-colors z-10",
                                                    selectedFreebies.includes(imgSrc)
                                                        ? 'bg-primary border-primary-foreground/50'
                                                        : 'bg-black/40 border-white/50'
                                                )}
                                                 onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectFreebie(imgSrc);
                                                }}
                                            >
                                                <CheckSquare className={cn("h-4 w-4", selectedFreebies.includes(imgSrc) ? 'text-white' : 'text-transparent')}/>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 border-t">
                                <Button size="lg" className="w-full" onClick={handleProceedToStrains}>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Next: Select Your Strain Sticker
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {step === 'select_strain' && (
                        <div className="flex flex-col flex-grow min-h-0">
                             <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                                <DialogTitle>Select Your Strain Sticker</DialogTitle>
                                <DialogDescription>
                                    You've selected {selectedFreebies.length} freebie sticker(s). Now, select your primary strain design from the collection below.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="flex-grow w-full">
                                <div className="flex space-x-4 p-6">
                                    {randomStrainImages.map((imgSrc) => (
                                        <Card
                                            key={imgSrc}
                                            className={cn(
                                                "cursor-pointer transition-all duration-200 overflow-hidden relative group shrink-0 w-64 h-64 border-4",
                                                selectedSticker === imgSrc ? 'border-primary' : 'border-transparent'
                                            )}
                                            onClick={() => handleSelectSticker(imgSrc)}
                                        >
                                            <Image src={imgSrc} alt="Strain Sticker" layout="fill" objectFit="cover" />
                                            <div 
                                                className={cn(
                                                    "absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all",
                                                    selectedSticker === imgSrc
                                                        ? 'bg-primary border-primary-foreground'
                                                        : 'bg-black/40 border-white/60'
                                                )}
                                            >
                                                <CheckSquare className={cn("h-5 w-5", selectedSticker === imgSrc ? 'text-white' : 'text-transparent')} />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                            <DialogFooter className="p-6 border-t bg-background shrink-0">
                                <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddToCart} disabled={isProcessingCart || !selectedSticker}>
                                    {isProcessingCart ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                                    Add Design to Cart
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                </DialogContent>
            </Dialog>
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-xl w-full p-0 flex flex-col h-auto sm:h-[90vh] sm:max-h-[800px]">
                    <DialogHeader className="p-4 border-b shrink-0">
                        <DialogTitle>Triple S Canna Club Design</DialogTitle>
                         <DialogDescription>
                            Selected: {selectedFreebies.length} / {maxSelectable} sticker(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex-grow flex items-center justify-center">
                        {viewingImage && (
                            <div className="relative w-full h-full max-h-[60vh] sm:max-h-full">
                                <Image src={viewingImage} alt="Sticker preview" layout="fill" objectFit="contain" className="p-2"/>
                            </div>
                        )}
                        <Button
                            variant="default" size="icon"
                            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full z-10 bg-green-600/80 hover:bg-green-500 text-white shadow-lg"
                            onClick={() => handleNavigateViewer('prev')}
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="default" size="icon"
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full z-10 bg-green-600/80 hover:bg-green-500 text-white shadow-lg"
                            onClick={() => handleNavigateViewer('next')}
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>
                     <DialogFooter className="p-4 border-t bg-background/80 flex-shrink-0">
                        <div className="w-full flex justify-center">
                            <Button
                                size="lg"
                                variant={isViewingImageSelected ? 'default' : 'secondary'}
                                onClick={() => viewingImage && handleSelectFreebie(viewingImage)}
                                disabled={!isViewingImageSelected && selectedFreebies.length >= maxSelectable}
                                className={cn(
                                    "flex items-center gap-2 shadow-md",
                                    isViewingImageSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                                )}
                            >
                                {isViewingImageSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                {isViewingImageSelected ? 'Selected' : 'Select This Design'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
