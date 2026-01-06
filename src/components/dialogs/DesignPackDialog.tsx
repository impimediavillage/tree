
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, ShoppingCart, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import JSZip from 'jszip';
import type { Product, PriceTier } from '@/types';

interface DesignPackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  tier: PriceTier | null;
}

export const DesignPackDialog: React.FC<DesignPackDialogProps> = ({ isOpen, onOpenChange, product, tier }) => {
    const { toast } = useToast();
    const { addToCart } = useCart();
    
    const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
    const [isProcessingCart, setIsProcessingCart] = useState(false);
    const [stickerImages, setStickerImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageIndex, setViewingImageIndex] = useState<number>(0);

    const maxSelectable = product && tier ? Math.ceil(tier.price / 100) : 1;

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            // Load the same sticker images as used in /triple-s-club
            fetch('/api/sticker-images')
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        toast({ title: "Error", description: "Could not load Triple S sticker designs. Please try again.", variant: "destructive" });
                        return;
                    }
                    if (data.images && Array.isArray(data.images)) {
                        setStickerImages(data.images);
                    } else {
                        toast({ title: "Error", description: "Invalid sticker images data.", variant: "destructive" });
                    }
                    setIsLoading(false);
                })
                .catch((error) => {
                    console.error('Failed to load sticker images:', error);
                    toast({ title: "Error", description: "Failed to fetch sticker designs. Please check your connection.", variant: "destructive" });
                    setIsLoading(false);
                });
        } else {
            setTimeout(() => {
                setSelectedStickers([]);
                setStickerImages([]);
                setIsLoading(false);
            }, 300);
        }
    }, [isOpen, toast]);

    const handleSelectFreebie = (imageUrl: string) => {
        setSelectedStickers(prev => {
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

    const handleViewImage = (index: number) => {
        setViewingImageIndex(index);
        setIsImageViewerOpen(true);
    };

    const handleAddToCart = async () => {
        if (!product || !tier || selectedStickers.length === 0) {
             toast({ title: "No Stickers Selected", description: "Please select at least one sticker design.", variant: "destructive" });
            return;
        }
        
        setIsProcessingCart(true);

        // Download selected stickers as ZIP
        if (selectedStickers.length > 0) {
            toast({ title: "Downloading Stickers...", description: `Preparing ${selectedStickers.length} sticker(s) for download.`});
            try {
                const zip = new JSZip();
                const imageFetchPromises = selectedStickers.map(async (url) => {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                    const blob = await response.blob();
                    const filename = url.split('/').pop() || 'sticker.png';
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
                 toast({ title: "Download Started", description: "Your stickers are downloading.", variant: "default" });
            } catch (error) {
                 console.error("Failed to create ZIP and download:", error);
                 toast({ title: "Download Failed", description: "Could not download the stickers. They will be available in your account.", variant: "destructive" });
            }
        }

        // Add to cart with the first selected sticker as the display image
        addToCart(product, tier, 1, selectedStickers[0]);
        
        toast({ title: "Design Pack Added!", description: `Your custom "${product.name}" pack is in your cart.` });
        onOpenChange(false);
        setIsProcessingCart(false);
    };

    const handleNavigateViewer = (direction: 'next' | 'prev') => {
        const newIndex = direction === 'next'
            ? (viewingImageIndex + 1) % stickerImages.length
            : (viewingImageIndex - 1 + stickerImages.length) % stickerImages.length;
        setViewingImageIndex(newIndex);
    };

    const viewingImage = stickerImages[viewingImageIndex];
    const isViewingImageSelected = viewingImage ? selectedStickers.includes(viewingImage) : false;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b">
                        <DialogTitle>Select Your Triple S Sticker Set</DialogTitle>
                        <DialogDescription>
                            Based on the price of **ZAR {tier?.price.toFixed(2)}**, you can select **{maxSelectable}** sticker(s) from our premium Triple S design collection.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {isLoading ? (
                        <div className="flex-grow flex items-center justify-center">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <ScrollArea className="flex-grow px-6 pt-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-4">
                                    {stickerImages.map((imgSrc, index) => (
                                        <Card
                                            key={`${imgSrc}-${index}`}
                                            className="cursor-pointer transition-all duration-200 overflow-hidden relative group p-0 aspect-square bg-white rounded-lg shadow-md hover:shadow-xl border-2 hover:border-[#006B3E]"
                                            onClick={() => handleViewImage(index)}
                                            style={{
                                                borderColor: selectedStickers.includes(imgSrc) ? '#006B3E' : 'rgba(0, 107, 62, 0.2)'
                                            }}
                                        >
                                            <Image 
                                                src={imgSrc} 
                                                alt={`Triple S Sticker ${index + 1}`} 
                                                fill
                                                className="object-contain p-4" 
                                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                                                unoptimized
                                            />
                                            <div 
                                                className={cn(
                                                    "absolute top-1 right-1 h-6 w-6 rounded-md flex items-center justify-center border transition-colors z-10",
                                                    selectedStickers.includes(imgSrc)
                                                        ? 'bg-primary border-primary-foreground/50'
                                                        : 'bg-black/40 border-white/50'
                                                )}
                                                 onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectFreebie(imgSrc);
                                                }}
                                            >
                                                <CheckSquare className={cn("h-4 w-4", selectedStickers.includes(imgSrc) ? 'text-white' : 'text-transparent')}/>
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#006B3E]/0 to-[#006B3E]/0 group-hover:from-[#006B3E]/10 group-hover:to-transparent transition-all duration-200" />
                                        </Card>
                                    ))}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 border-t">
                                <div className="w-full flex flex-col gap-2">
                                    <div className="text-center text-sm text-muted-foreground mb-2">
                                        Selected: {selectedStickers.length} / {maxSelectable} stickers
                                    </div>
                                    <Button 
                                        size="lg" 
                                        className="w-full bg-green-600 hover:bg-green-700" 
                                        onClick={handleAddToCart} 
                                        disabled={isProcessingCart || selectedStickers.length === 0}
                                    >
                                        {isProcessingCart ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                                        Add Design Pack to Cart
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-xl w-full p-0 flex flex-col h-auto sm:h-[90vh] sm:max-h-[800px]">
                    <DialogHeader className="p-4 border-b shrink-0">
                        <DialogTitle>Triple S Sticker Design</DialogTitle>
                         <DialogDescription>
                            Selected: {selectedStickers.length} / {maxSelectable} sticker(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex-grow flex items-center justify-center">
                        {viewingImage && (
                            <div className="relative w-full h-full max-h-[60vh] sm:max-h-full">
                                <Image src={viewingImage} alt="Sticker preview" fill className="object-contain p-2"/>
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
                                disabled={!isViewingImageSelected && selectedStickers.length >= maxSelectable}
                                className={cn(
                                    "flex items-center gap-2 shadow-md",
                                    isViewingImageSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                                )}
                            >
                                {isViewingImageSelected ? <CheckSquare className="h-5 w-5" /> : <CheckSquare className="h-5 w-5" />}
                                {isViewingImageSelected ? 'Selected' : 'Select This Sticker'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
