'use client';

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { generateInitialLogos, generateApparelForTheme } from '@/ai/flows/generate-brand-assets';
import type { GenerateInitialLogosOutput, ThemeAssetSet, StickerSet, Product, PriceTier } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AlertTriangle, Eye, Loader2, ShoppingCart, Sparkles, Store, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type JSZip from 'jszip';


type ThemeKey = 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative';
type ExpandedThemeAssets = Partial<Record<ThemeKey, ThemeAssetSet>>;

interface DesignResultDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  subjectName: string;
  isStoreAsset: boolean;
}

export const DesignResultDialog: React.FC<DesignResultDialogProps> = ({ isOpen, onOpenChange, subjectName, isStoreAsset }) => {
    const router = useRouter();
    const { currentUser, setCurrentUser } = useAuth();
    const { addToCart } = useCart();
    const { toast } = useToast();

    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [generatingTheme, setGeneratingTheme] = useState<ThemeKey | null>(null);
    const [initialLogos, setInitialLogos] = useState<GenerateInitialLogosOutput | null>(null);
    const [expandedAssets, setExpandedAssets] = useState<ExpandedThemeAssets>({});
    const [stickerPackPrice, setStickerPackPrice] = useState<number>(60); // Default price
    const [isProcessing, setIsProcessing] = useState(false);
    
    const generationInitiatedRef = useRef(false);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const pricingDoc = await getDoc(doc(db, 'platformConfig', 'pricing'));
                if (pricingDoc.exists()) {
                    const data = pricingDoc.data();
                    const finalPrice = data.basePrice * (1 + data.commissionRate);
                    setStickerPackPrice(finalPrice);
                }
            } catch (error) {
                console.error("Could not fetch sticker pricing, using default.", error);
            }
        };
        fetchPricing();
    }, []);

    const deductCredits = useCallback(async (creditsToDeduct: number, interactionSlug: string): Promise<boolean> => {
        if (!currentUser?.uid) {
            toast({ title: "Authentication Error", description: "User not found. Please log in.", variant: "destructive" });
            return false;
        }

        const functionUrl = process.env.NEXT_PUBLIC_DEDUCT_CREDITS_FUNCTION_URL;
        if (!functionUrl) {
            console.error("Deduct credits function URL is not configured.");
            toast({ title: "Configuration Error", description: "Credit system is not available.", variant: "destructive" });
            return false;
        }

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.uid, advisorSlug: interactionSlug, creditsToDeduct, wasFreeInteraction: false }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: `An unknown error occurred (status: ${response.status})` }));
                const errorMessage = data.error || `Failed to deduct credits (status: ${response.status})`;
                toast({ title: "Credit Deduction Failed", description: errorMessage, variant: "destructive" });
                return false;
            }

            const data = await response.json();
            // Update user in context and localStorage
            const updatedUser = { ...currentUser, credits: data.newCredits };
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUser));
            
            toast({ title: "Credits Deducted", description: `${creditsToDeduct} credits used for asset generation.` });
            return true;
        } catch (e: any) {
            console.error("Network or parsing error in deductCredits:", e);
            toast({ title: "Credit System Error", description: "Could not communicate with the credit system.", variant: "destructive" });
            return false;
        }
    }, [currentUser, toast, setCurrentUser]);


    useEffect(() => {
        const generateLogos = async () => {
            if (!currentUser) {
                toast({ title: "Sign Up to Continue", description: "Please create a free account to generate assets and receive 20 welcome credits.", variant: "default" });
                onOpenChange(false);
                router.push('/auth/signup');
                return;
            }

            if ((currentUser.credits ?? 0) < 5) {
                toast({ title: "Insufficient Credits", description: "You need at least 5 credits to generate logos. Redirecting you to top up.", variant: "destructive" });
                onOpenChange(false);
                router.push('/dashboard/leaf/credits');
                return;
            }
            
            setIsLoadingInitial(true);
            const creditsDeducted = await deductCredits(5, 'promo-asset-generator-initial');
            if (!creditsDeducted) {
                setIsLoadingInitial(false);
                onOpenChange(false);
                return;
            }

            try {
                const result = await generateInitialLogos({ name: subjectName, isStore: isStoreAsset });
                setInitialLogos(result);
            } catch (error) {
                console.error("Error generating initial logos:", error);
                toast({ title: "Logo Generation Failed", description: "Could not generate initial logo designs. Please note credits were deducted.", variant: "destructive" });
                onOpenChange(false);
            } finally {
                setIsLoadingInitial(false);
            }
        };

        if (isOpen && !generationInitiatedRef.current) {
            generationInitiatedRef.current = true;
            generateLogos();
        } else if (!isOpen) {
            setTimeout(() => {
              setIsLoadingInitial(true);
              setInitialLogos(null);
              setExpandedAssets({});
              setGeneratingTheme(null);
              generationInitiatedRef.current = false;
            }, 300);
        }
    }, [isOpen, onOpenChange, subjectName, isStoreAsset, toast, currentUser, deductCredits, router]);
    
    const handleGenerateApparel = async (themeKey: ThemeKey, logoUrl: string) => {
        if (generatingTheme) return;

        if (!currentUser) {
            toast({ title: "Please Sign In", description: "You must be logged in to visualize assets.", variant: "destructive" });
            router.push('/auth/signin');
            return;
        }

        if ((currentUser.credits ?? 0) < 8) {
            toast({ title: "Insufficient Credits", description: "You need 8 credits to visualize on gear. Redirecting to top up.", variant: "destructive" });
            onOpenChange(false);
            router.push('/dashboard/leaf/credits');
            return;
        }

        setGeneratingTheme(themeKey);
        const creditsDeducted = await deductCredits(8, `promo-asset-generator-theme-${themeKey}`);
        if (!creditsDeducted) {
            setGeneratingTheme(null);
            return;
        }

        try {
            const result = await generateApparelForTheme({
                style: themeKey,
                circularStickerUrl: logoUrl,
                subjectName: subjectName,
                isStore: isStoreAsset,
            });
            setExpandedAssets(prev => ({ ...prev, [themeKey]: result }));
        } catch (error) {
            console.error(`Error generating apparel for theme ${themeKey}:`, error);
            toast({ title: "Apparel Generation Failed", description: `Could not generate assets for the ${themeKey} theme. Credits were deducted.`, variant: "destructive" });
        } finally {
            setGeneratingTheme(null);
        }
    };
    
    const handleDownloadZip = async (assets: ThemeAssetSet, themeName: string) => {
      try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
  
          const designImages = [
              { name: `${subjectName}-${themeName}-logo-circular.png`, url: assets.circularStickerUrl },
              { name: `${subjectName}-${themeName}-logo-rectangular.png`, url: assets.rectangularStickerUrl },
              { name: `${subjectName}-${themeName}-mockup-cap.png`, url: assets.capUrl },
              { name: `${subjectName}-${themeName}-mockup-tshirt.png`, url: assets.tShirtUrl },
              { name: `${subjectName}-${themeName}-mockup-hoodie.png`, url: assets.hoodieUrl },
              { name: `${subjectName}-${themeName}-variation-1.png`, url: assets.trippySticker1Url },
              { name: `${subjectName}-${themeName}-variation-2.png`, url: assets.trippySticker2Url },
              { name: `${subjectName}-${themeName}-sheet-circular.png`, url: assets.circularStickerSheetUrl },
              { name: `${subjectName}-${themeName}-sheet-rectangular.png`, url: assets.rectangularStickerSheetUrl },
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
          
          fetchedImages.forEach(img => {
              zip.file(img.name, img.blob);
          });
  
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          
          const link = document.createElement('a');
          link.href = URL.createObjectURL(zipBlob);
          link.download = `${subjectName}_${themeName}_design_pack.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
  
      } catch(e) {
          console.error("Failed to create or download zip", e);
          toast({ title: "Download Failed", description: "Could not prepare the zip file for download.", variant: "destructive" });
      }
    };

    const handleAddToCartAndDownload = async (assets: ThemeAssetSet, themeName: string) => {
        setIsProcessing(true);
        toast({ title: "Processing...", description: "Preparing your design pack and cart item." });

        const cartProduct: Product = {
            id: `design-pack-${subjectName.replace(/\s+/g, '-')}-${themeName}`,
            name: `Design Pack: ${subjectName} (${themeName})`,
            description: `A promotional design asset pack. Includes digital files.`,
            category: 'Digital Goods',
            dispensaryId: 'platform',
            dispensaryName: 'The Wellness Tree',
            dispensaryType: 'Digital',
            productOwnerEmail: 'platform@thewellnesstree.com',
            currency: 'ZAR',
            priceTiers: [],
            quantityInStock: 999, // Essentially unlimited
            imageUrl: assets.circularStickerUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const priceTier: PriceTier = {
            unit: '1 Pack',
            price: stickerPackPrice,
            quantityInStock: 999,
        };
        
        addToCart(cartProduct, priceTier, 1);
        await handleDownloadZip(assets, themeName);
        setIsProcessing(false);
        onOpenChange(false);
    };
    
    const handleAddToStore = async (assets: ThemeAssetSet, themeKey: ThemeKey) => {
        if (!currentUser?.dispensaryId) {
            toast({ title: "Error", description: "No store found to add assets to.", variant: "destructive" });
            return;
        }
        setIsProcessing(true);
        try {
            const stickerSet: Omit<StickerSet, 'id'> = {
                dispensaryId: currentUser.dispensaryId,
                name: subjectName,
                theme: themeKey,
                assets: assets,
                createdAt: serverTimestamp() as any,
            };
            await addDoc(collection(db, 'stickersets'), stickerSet);
            toast({ title: "Success!", description: `The ${themeKey} theme assets have been added to your store's promo collections.`});
            onOpenChange(false);
        } catch (error) {
            console.error("Error adding sticker set to store:", error);
            toast({ title: "Save Failed", description: "Could not save the asset pack to your store.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const designThemes: { key: ThemeKey; title: string; logoUrl?: string; }[] = initialLogos ? [
        { key: 'clay', title: '3D Clay', logoUrl: initialLogos.clayLogoUrl },
        { key: 'comic', title: '2D Comic', logoUrl: initialLogos.comicLogoUrl },
        { key: 'rasta', title: 'Retro 420', logoUrl: initialLogos.rastaLogoUrl },
        { key: 'farmstyle', title: 'Farmstyle', logoUrl: initialLogos.farmstyleLogoUrl },
        { key: 'imaginative', title: 'Imaginative', logoUrl: initialLogos.imaginativeLogoUrl },
    ] : [];

    const userIsOwner = currentUser?.role === 'DispensaryOwner';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle>Generated Assets for &quot;{subjectName}&quot;</DialogTitle>
                    <DialogDescription>
                        Initial generation costs 5 credits. Visualizing a theme on gear costs 8 credits. Current balance: <span className="font-bold text-primary">{currentUser?.credits ?? 0}</span>
                    </DialogDescription>
                </DialogHeader>

                {isLoadingInitial ? (
                    <div className="flex flex-col items-center justify-center flex-grow h-full gap-4">
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        <p className="text-lg text-muted-foreground">Generating initial logos (5 credits)...</p>
                    </div>
                ) : initialLogos ? (
                    <Tabs defaultValue="clay" className="flex-grow flex flex-col min-h-0">
                        <div className="px-6 border-b">
                            <ScrollArea className="whitespace-nowrap">
                                <TabsList className="w-max">
                                    {designThemes.map((theme) => (
                                        <TabsTrigger key={theme.key} value={theme.key}>{theme.title}</TabsTrigger>
                                    ))}
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                        {designThemes.map((theme) => {
                            const assets = expandedAssets[theme.key];
                            const isGeneratingThisTheme = generatingTheme === theme.key;

                            return (
                                <TabsContent key={theme.key} value={theme.key} className="flex-grow min-h-0">
                                    <ScrollArea className="h-full px-6 py-4">
                                        {assets && (
                                            <div className="sticky top-0 z-10 py-2 mb-4 bg-background/80 backdrop-blur-sm">
                                                {userIsOwner ? (
                                                    <Button size="lg" className="w-full" onClick={() => handleAddToStore(assets, theme.key)} disabled={isProcessing}>
                                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Store className="mr-2 h-4 w-4" />}
                                                        Add {theme.title} Promos To My Store
                                                    </Button>
                                                ) : (
                                                    <Button size="lg" className="w-full" onClick={() => handleAddToCartAndDownload(assets, theme.key)} disabled={isProcessing}>
                                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />}
                                                        Add Pack to Cart & Download (R{stickerPackPrice.toFixed(2)})
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            <Card className="col-span-1 flex flex-col">
                                                <CardHeader><CardTitle>1. Primary Logo</CardTitle></CardHeader>
                                                <CardContent className="flex-grow flex flex-col items-center justify-center gap-4">
                                                    <div className="relative aspect-square w-full max-w-[280px]">
                                                        <Image src={theme.logoUrl!} alt={`${theme.title} circular sticker`} fill className="object-contain p-2"/>
                                                    </div>
                                                    {!assets && (
                                                        <Button className="w-full mt-auto" onClick={() => handleGenerateApparel(theme.key, theme.logoUrl!)} disabled={!!generatingTheme || (currentUser?.credits ?? 0) < 8}>
                                                            {isGeneratingThisTheme ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Generating...</> : <><Eye className="mr-2 h-4 w-4"/>Visualize on Gear (8 credits)</>}
                                                        </Button>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {isGeneratingThisTheme && !assets && (
                                                Array.from({ length: 7 }).map((_, i) => (
                                                    <Card key={i} className="col-span-1 flex items-center justify-center min-h-[300px] animate-pulse">
                                                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                                    </Card>
                                                ))
                                            )}

                                            {assets && (
                                                <>
                                                    <Card className="col-span-1">
                                                        <CardHeader><CardTitle>2. Apparel Mockups</CardTitle></CardHeader>
                                                        <CardContent className="space-y-4">
                                                            <div className="relative aspect-square w-full"><Image src={assets.tShirtUrl} alt={`${theme.title} t-shirt`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="relative aspect-square w-full"><Image src={assets.capUrl} alt={`${theme.title} cap`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                                <div className="relative aspect-square w-full"><Image src={assets.hoodieUrl} alt={`${theme.title} hoodie`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                    <Card className="col-span-1">
                                                        <CardHeader><CardTitle>3. Rectangular Sticker</CardTitle></CardHeader>
                                                        <CardContent className="space-y-4">
                                                            <div className="relative aspect-video w-full"><Image src={assets.rectangularStickerUrl} alt={`${theme.title} rectangular sticker`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                        </CardContent>
                                                    </Card>
                                                    <Card className="col-span-1">
                                                        <CardHeader><CardTitle>4. Wacky Variations</CardTitle></CardHeader>
                                                        <CardContent className="grid grid-cols-2 gap-2">
                                                            <div className="relative aspect-square w-full"><Image src={assets.trippySticker1Url} alt={`${theme.title} trippy sticker 1`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                            <div className="relative aspect-square w-full"><Image src={assets.trippySticker2Url} alt={`${theme.title} trippy sticker 2`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                        </CardContent>
                                                    </Card>
                                                    <Card className="col-span-1">
                                                        <CardHeader><CardTitle>5. Circular Stickers</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <div className="relative aspect-[1/1.414] w-full"><Image src={assets.circularStickerSheetUrl} alt={`${theme.title} circular sticker sheet`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                            <p className="text-xs text-center text-muted-foreground mt-2">A4 Sheet</p>
                                                        </CardContent>
                                                    </Card>
                                                    <Card className="col-span-1">
                                                        <CardHeader><CardTitle>6. Rectangular Stickers</CardTitle></CardHeader>
                                                        <CardContent>
                                                            <div className="relative aspect-[1/1.414] w-full"><Image src={assets.rectangularStickerSheetUrl} alt={`${theme.title} rectangular sticker sheet`} fill className="object-contain p-2 rounded-md bg-muted"/></div>
                                                            <p className="text-xs text-center text-muted-foreground mt-2">A4 Sheet</p>
                                                        </CardContent>
                                                    </Card>
                                                </>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-grow h-full gap-4">
                        <AlertTriangle className="h-16 w-16 text-destructive" />
                        <p className="text-lg text-muted-foreground">Failed to generate logos.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
