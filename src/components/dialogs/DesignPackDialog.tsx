
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { generateStrainSticker } from '@/ai/flows/generate-strain-sticker';
import type { Product, PriceTier, CartItem, GenerateStrainStickerInput } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, ShoppingCart, Info, CheckSquare, Square, Gift, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';
import JSZip from 'jszip';


const tripleSImages = Array.from({ length: 36 }, (_, i) => `/images/2025-triple-s/t${i + 1}.jpg`);

interface DesignPackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  tier: PriceTier | null;
}

export const DesignPackDialog: React.FC<DesignPackDialogProps> = ({ isOpen, onOpenChange, product, tier }) => {
    const router = useRouter();
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const { addToCart } = useCart();
    
    const [step, setStep] = useState<'select' | 'generate' | 'result'>('select');
    const [selectedTripleS, setSelectedTripleS] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessingCart, setIsProcessingCart] = React.useState(false);
    const [generatedStickerUrl, setGeneratedStickerUrl] = useState<string | null>(null);

    // State for the image viewer
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImageIndex, setViewingImageIndex] = useState<number>(0);

    const maxSelectable = product && tier ? Math.ceil(tier.price / 100) : 1;

    useEffect(() => {
        if (!isOpen) {
            // Reset state when dialog closes
            setTimeout(() => {
                setStep('select');
                setSelectedTripleS([]);
                setIsGenerating(false);
                setGeneratedStickerUrl(null);
            }, 300);
        }
    }, [isOpen]);

    const handleSelectTripleS = (imageUrl: string) => {
        setSelectedTripleS(prev => {
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

    const handleStartGeneration = () => {
        setStep('generate');
        generateSticker();
    };

    const generateSticker = useCallback(async () => {
        if (!product) return;
        setIsGenerating(true);
        try {
            const input: GenerateStrainStickerInput = {
                strainName: product.strain || product.name,
                dispensaryName: product.dispensaryName,
                flavors: product.flavors || [],
            };
            const result = await generateStrainSticker(input);
            setGeneratedStickerUrl(result.imageUrl);
            setStep('result');
            toast({ title: 'Design Generated!', description: 'Your unique sticker is ready.' });
        } catch (error) {
            console.error("AI sticker generation failed:", error);
            toast({ title: "Generation Failed", description: "Could not create your custom sticker. Please try again.", variant: 'destructive'});
            setStep('select'); // Go back to selection on failure
        } finally {
            setIsGenerating(false);
        }
    }, [product, toast]);

     const handleAddToCart = async () => {
        if (!product || !tier || !generatedStickerUrl) return;
        
        setIsProcessingCart(true);

        if (selectedTripleS.length > 0) {
            toast({ title: "Downloading Free Stickers...", description: "Your bonus Triple S stickers are being prepared for download."});
            try {
                const zip = new JSZip();
                
                const imageFetchPromises = selectedTripleS.map(async (url) => {
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
                 toast({ title: "Download Started", description: "Check your browser downloads for the ZIP file.", variant: "default" });
            } catch (error) {
                 console.error("Failed to create ZIP and download:", error);
                 toast({ title: "Download Failed", description: "Could not download the bonus stickers. Please try again.", variant: "destructive" });
                 setIsProcessingCart(false);
                 return;
            }
        }

        const specialDescription = `PROMO_DESIGN_PACK|${product.name}|${tier.unit}`;
        
        const designPackProduct: Product = {
            ...product,
            id: `design-${product.id}-${tier.unit}`,
            name: `Sticker Design: ${product.name}`,
            description: specialDescription, 
            category: `Digital Design (${'custom'})`,
            imageUrl: generatedStickerUrl, 
            imageUrls: [generatedStickerUrl], // Only the main generated sticker
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
            ? (viewingImageIndex + 1) % tripleSImages.length
            : (viewingImageIndex - 1 + tripleSImages.length) % tripleSImages.length;
        setViewingImageIndex(newIndex);
    };

    const viewingImage = tripleSImages[viewingImageIndex];
    const isViewingImageSelected = viewingImage ? selectedTripleS.includes(viewingImage) : false;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                    {step === 'select' && (
                        <>
                            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                                <DialogTitle>Create Your Triple S Canna Club Pack</DialogTitle>
                                <DialogDescription>
                                    Based on the price of **ZAR {tier?.price.toFixed(2)}**, you can select **{maxSelectable}** sticker(s) from our collection to bundle with your unique AI-generated design.
                                </DialogDescription>
                            </DialogHeader>
                             <Alert className="bg-primary/10 border-primary/20 text-primary-foreground mx-6">
                                <Gift className="h-5 w-5 text-primary" />
                                <AlertTitle className="text-primary font-bold">Welcome to the Triple S Canna Club!</AlertTitle>
                                <AlertDescription className="text-primary/90">
                                    Select your favorite sticker designs as a FREE gift from The Wellness Tree to go with your custom creation!
                                </AlertDescription>
                            </Alert>
                            <ScrollArea className="flex-grow px-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
                                    {tripleSImages.map((imgSrc, index) => {
                                        return (
                                            <Card
                                                key={index}
                                                className="cursor-pointer transition-all duration-200 overflow-hidden relative group p-0 aspect-square"
                                                onClick={() => handleViewImage(index)}
                                            >
                                                <Image src={imgSrc} alt={`Triple S Sticker ${index + 1}`} layout="fill" objectFit="cover" />
                                                <div 
                                                    className={cn(
                                                        "absolute top-1 right-1 h-6 w-6 rounded-md flex items-center justify-center border transition-colors z-10",
                                                        selectedTripleS.includes(imgSrc)
                                                            ? 'bg-primary border-primary-foreground/50'
                                                            : 'bg-black/40 border-white/50'
                                                    )}
                                                     onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectTripleS(imgSrc);
                                                    }}
                                                >
                                                    <CheckSquare className={cn("h-4 w-4", selectedTripleS.includes(imgSrc) ? 'text-white' : 'text-transparent')} />
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 border-t">
                                <Button size="lg" className="w-full" onClick={handleStartGeneration}>
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Next: Create My Strain Sticker!
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                    {step === 'generate' && (
                        <div className="flex flex-col items-center justify-center flex-grow h-full gap-4">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <p className="text-lg text-muted-foreground">Crafting your unique sticker...</p>
                            <p className="text-sm text-center max-w-sm">Our AI is mixing 3D clay, cannabis essence, and your strain's unique flavors. This can take a moment.</p>
                        </div>
                    )}

                    {step === 'result' && generatedStickerUrl && (
                        <>
                            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                                <DialogTitle>Your Unique Sticker Is Ready!</DialogTitle>
                                <DialogDescription>
                                    Here is your AI-generated sticker for &quot;{product?.name}&quot;.
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="flex-grow">
                                <div className="p-6 flex flex-col md:flex-row items-start justify-center gap-8">
                                    <div className="flex-shrink-0 w-full max-w-sm">
                                        <h3 className="font-semibold text-center mb-2">Your Custom AI Sticker</h3>
                                        <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden border">
                                            <Image src={generatedStickerUrl} alt="AI Generated Sticker" layout="fill" objectFit="contain" className="p-4"/>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 w-full max-w-sm space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-center mb-2">Your Selected Triple S Stickers ({selectedTripleS.length})</h3>
                                            {selectedTripleS.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {selectedTripleS.map((url) => (
                                                        <div key={url} className="relative aspect-square w-full bg-muted rounded-md overflow-hidden border">
                                                            <Image src={url} alt="Selected Triple S Sticker" layout="fill" objectFit="cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">No extra stickers selected.</div>
                                            )}
                                        </div>
                                         <Alert className="bg-orange-100 border-orange-200 text-orange-800 rounded-lg text-xs space-y-2">
                                            <p>After you have completed your shipping details, a Leaf user account will be created for You. As a leaf user you can place and track orders, generate your own sticker promo sets and create your own "Cannabis enthusiast" print on demand clothing and merchandise including caps, T shirts, hoodies, and backpacks with custom Cannibinoid images you create with our AI. Funk out your own clothing gear with the Wellness tree Image Generation AI. You also get access to all our AI advisors to assist your Wellness Lifestyle. Buy credits to gain access to all our Large language models and Cannabis Merchandise Generation . Print on demand items with your custom "Green" designs. Irieness</p>
                                        </Alert>
                                    </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 border-t">
                                <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddToCart} disabled={isProcessingCart}>
                                    {isProcessingCart ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                                    Add Design Pack to Cart
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                </DialogContent>
            </Dialog>
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-xl w-full p-0 flex flex-col h-[85vh] sm:h-[90vh] max-h-[800px]">
                    <DialogHeader className="p-4 border-b shrink-0">
                        <DialogTitle>Triple S Canna Club Design</DialogTitle>
                         <DialogDescription>
                            Selected: {selectedTripleS.length} / {maxSelectable} sticker(s).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative flex-grow min-h-0">
                        {viewingImage && <Image src={viewingImage} alt="Sticker preview" layout="fill" objectFit="contain" className="p-2"/>}
                    </div>
                     <DialogFooter className="p-4 border-t bg-background/80 flex-shrink-0">
                        <div className="flex w-full justify-between items-center">
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleNavigateViewer('prev')}>
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                                size="lg"
                                variant={isViewingImageSelected ? 'default' : 'secondary'}
                                onClick={() => viewingImage && handleSelectTripleS(viewingImage)}
                                disabled={!isViewingImageSelected && selectedTripleS.length >= maxSelectable}
                                className={cn(
                                    "flex items-center gap-2 shadow-md",
                                    isViewingImageSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                                )}
                            >
                                {isViewingImageSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                {isViewingImageSelected ? 'Selected' : 'Select This Design'}
                            </Button>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleNavigateViewer('next')}>
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
