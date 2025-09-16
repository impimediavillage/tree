
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
import { Loader2, Sparkles, ShoppingCart, Info, CheckSquare, Square, Gift, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/contexts/CartContext';


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
    const [generatedStickerUrl, setGeneratedStickerUrl] = useState<string | null>(null);

    // State for the image viewer
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

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

    const handleViewImage = (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation(); // Prevent card's onClick from firing
        setViewingImage(imageUrl);
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

    const handleAddToCart = () => {
        if (!product || !tier || !generatedStickerUrl) return;

        const specialDescription = `PROMO_DESIGN_PACK|${product.name}|${tier.unit}`;
        
        const designPackProduct: Product = {
            ...product,
            id: `design-${product.id}-${tier.unit}`,
            name: `Sticker Design: ${product.name}`,
            description: specialDescription, 
            category: `Digital Design (${'custom'})`,
            imageUrl: generatedStickerUrl, 
            imageUrls: [generatedStickerUrl, ...selectedTripleS],
            priceTiers: [],
            quantityInStock: 999, 
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        const designPackTier: PriceTier = { ...tier, price: tier.price };
        
        addToCart(designPackProduct, designPackTier, 1);
        toast({ title: "Design Pack Added!", description: `Your custom "${product.name}" pack is in your cart.` });
        onOpenChange(false);
    };

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
                            <Alert className="mx-6 my-4 bg-primary/10 border-primary/20 text-primary-foreground">
                                <Gift className="h-5 w-5 text-primary" />
                                <AlertTitle className="text-primary font-bold">Welcome to the Triple S Canna Club!</AlertTitle>
                                <AlertDescription className="text-primary/90">
                                    Select your favorite sticker designs as a FREE gift from The Wellness Tree to go with your custom creation!
                                </AlertDescription>
                            </Alert>
                            <ScrollArea className="flex-grow px-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
                                    {tripleSImages.map((imgSrc, index) => {
                                        const isSelected = selectedTripleS.includes(imgSrc);
                                        return (
                                            <Card
                                                key={index}
                                                className={cn(
                                                    "cursor-pointer transition-all duration-200 overflow-hidden relative group",
                                                    !isSelected && selectedTripleS.length >= maxSelectable && "opacity-50 cursor-not-allowed"
                                                )}
                                                onClick={(e) => handleViewImage(e, imgSrc)}
                                            >
                                                <CardContent className="p-0 aspect-square">
                                                  <Image src={imgSrc} alt={`Triple S Sticker ${index + 1}`} layout="fill" objectFit="contain" />
                                                </CardContent>
                                                 <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleSelectTripleS(imgSrc); }}
                                                    className="absolute top-2 right-2 z-10 transition-transform duration-200 group-hover:scale-110"
                                                    aria-label={`Select sticker ${index + 1}`}
                                                >
                                                    {isSelected ? <CheckSquare className="h-6 w-6 text-white bg-primary rounded-md p-0.5"/> : <Square className="h-6 w-6 text-background/50 bg-background/50 backdrop-blur-sm rounded-md"/>}
                                                </button>
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
                                <div className="p-6 flex flex-col md:flex-row items-center justify-center gap-8">
                                    <div className="flex-shrink-0 w-full max-w-sm">
                                        <h3 className="font-semibold text-center mb-2">Your Custom AI Sticker</h3>
                                        <div className="relative aspect-square w-full bg-muted rounded-lg overflow-hidden border">
                                            <Image src={generatedStickerUrl} alt="AI Generated Sticker" layout="fill" objectFit="contain" className="p-4"/>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 w-full max-w-sm">
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
                                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No extra stickers selected.</div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                            <DialogFooter className="p-6 border-t">
                                <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={handleAddToCart}>
                                    <ShoppingCart className="mr-2 h-5 w-5" /> Add Design Pack to Cart
                                </Button>
                            </DialogFooter>
                        </>
                    )}

                </DialogContent>
            </Dialog>
            <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent className="max-w-lg p-2">
                    <DialogHeader>
                        <DialogTitle>Triple S Canna club design</DialogTitle>
                    </DialogHeader>
                    <div className="relative aspect-square w-full">
                        {viewingImage && <Image src={viewingImage} alt="Sticker preview" layout="fill" objectFit="contain" />}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
