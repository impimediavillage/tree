
'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShoppingCart, Leaf, Brain, Sparkles, Info, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { db, functions } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { findStrainImage } from '@/ai/flows/generate-thc-promo-designs';
import type { StickerSet, Product, PriceTier, ProductAttribute } from '@/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StickerSetDetailDialogProps {
  stickerSet: StickerSet;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const themeDisplay: Record<StickerSet['theme'], string> = {
  clay: '3D Clay',
  comic: '2D Comic',
  rasta: 'Retro 420',
  farmstyle: 'Farmstyle',
  imaginative: 'Imaginative',
};

const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

export function StickerSetDetailDialog({ stickerSet, isOpen, onOpenChange }: StickerSetDetailDialogProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [strainInfo, setStrainInfo] = useState<any>(null);
  const [isLoadingStrain, setIsLoadingStrain] = useState(true);

  useEffect(() => {
    if (!isOpen) {
        setStrainInfo(null);
        setIsLoadingStrain(true);
        return;
    }
    
    if (isOpen && stickerSet.name && !strainInfo) {
      const fetchAndProcessStrainInfo = async () => {
        setIsLoadingStrain(true);
        try {
          const processedQuery = toTitleCase(stickerSet.name.trim());
          const q = query(
            collection(db, 'my-seeded-collection'),
            where('name', '==', processedQuery),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const fetchedStrainInfo = { id: docSnap.id, ...docSnap.data() };
            setStrainInfo(fetchedStrainInfo);

            if (!fetchedStrainInfo.img_url || fetchedStrainInfo.img_url === 'none') {
                console.log(`Strain "${stickerSet.name}" has no image. Generating one...`);
                // This is a fire-and-forget operation to not block the UI
                (async () => {
                    try {
                        const { imageUrl: newImageUrl } = await findStrainImage({ strainName: stickerSet.name });
                        
                        const updateFunction = httpsCallable(functions, 'updateStrainImageUrl');
                        await updateFunction({ strainId: fetchedStrainInfo.id, imageUrl: newImageUrl });

                        setStrainInfo(prev => prev ? { ...prev, img_url: newImageUrl } : null);
                        console.log(`Successfully generated and updated image for "${stickerSet.name}".`);

                    } catch (genError) {
                        console.error("Failed to generate or update strain image in background:", genError);
                    }
                })();
            }

          }
        } catch (error) {
          console.error('Error fetching strain info:', error);
        } finally {
          setIsLoadingStrain(false);
        }
      };
      fetchAndProcessStrainInfo();
    } else if (isOpen && strainInfo) {
        setIsLoadingStrain(false);
    }
  }, [isOpen, stickerSet.name, strainInfo]);


  const handleAddToCart = () => {
    const stickerProduct: Product = {
      id: stickerSet.id!,
      name: `Sticker Pack: ${stickerSet.name}`,
      description: `A full sticker and apparel design pack with theme: ${themeDisplay[stickerSet.theme]}`,
      category: 'Sticker Set',
      dispensaryId: 'platform',
      dispensaryName: 'The Wellness Tree',
      currency: 'ZAR',
      priceTiers: [], 
      quantityInStock: 999, 
      imageUrl: stickerSet.assets.circularStickerUrl,
      dispensaryType: "Digital Goods",
      productOwnerEmail: "platform@wellnesstree.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const priceTier: PriceTier = {
      unit: '1 Pack',
      price: 60.00,
      quantityInStock: 999,
    };

    addToCart(stickerProduct, priceTier, 1);
    toast({ title: "Added to Cart", description: `"${stickerSet.name}" design pack added to your cart.` });
    onOpenChange(false);
  };
  
  const assetImages = Object.entries(stickerSet.assets).map(([key, url]) => ({
      name: key.replace(/([A-Z])/g, ' $1').replace(/Url$/, '').trim(),
      url
  }));

  const badgeColors = {
    flavor: [ "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800" ],
    effect: [ "bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800", "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800", "bg-red-100 text-red-800", "bg-orange-100 text-orange-800" ],
    medical: [ "bg-green-100 text-green-800", "bg-teal-100 text-teal-800", "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800", "bg-stone-200 text-stone-800", "bg-gray-200 text-gray-800" ]
  };

  const filteredEffects = useMemo(() => strainInfo?.effects?.filter((eff: ProductAttribute) => parseInt(eff.percentage, 10) > 0) || [], [strainInfo]);
  const filteredMedical = useMemo(() => strainInfo?.medical?.filter((med: ProductAttribute) => parseInt(med.percentage, 10) > 0) || [], [strainInfo]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{stickerSet.name}</DialogTitle>
          <DialogDescription>Theme: {themeDisplay[stickerSet.theme]} | By: {stickerSet.creatorDisplayName}</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="images" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images">Design Pack Images</TabsTrigger>
            <TabsTrigger value="strainInfo">Strain Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="images" className="flex-grow mt-4 min-h-0">
            <ScrollArea className="h-full pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {assetImages.map(asset => (
                  <div key={asset.name} className="space-y-2">
                    <div className="relative aspect-square w-full bg-muted rounded-md overflow-hidden">
                      <Image src={asset.url} alt={asset.name} fill style={{objectFit:"contain"}} className="p-2"/>
                    </div>
                    <p className="text-xs text-center text-muted-foreground capitalize">{asset.name}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="strainInfo" className="flex-grow mt-4 min-h-0">
            <ScrollArea className="h-full pr-4">
                {isLoadingStrain ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    </div>
                ) : strainInfo ? (
                    <div className="space-y-6">
                         {strainInfo.img_url && strainInfo.img_url !== 'none' && (
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted mb-4">
                                <Image
                                    src={strainInfo.img_url}
                                    alt={`Image of ${strainInfo.name}`}
                                    layout="fill"
                                    style={{objectFit:"cover"}}
                                    data-ai-hint={`cannabis strain ${strainInfo.name}`}
                                />
                            </div>
                        )}
                        <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>Description</h4>
                            <p className="text-muted-foreground mt-1 text-sm">{strainInfo.description || "No description available."}</p>
                        </div>
                        <Separator/>
                        {filteredEffects.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>Common Effects</h4>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {filteredEffects.map((eff: ProductAttribute, i: number) => <Badge key={i} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors.effect[i % badgeColors.effect.length])}>{eff.name} ({eff.percentage})</Badge>)}
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
                        )}
                        {filteredMedical.length > 0 && <Separator/>}
                        {filteredMedical.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-primary"/>Medical Uses</h4>
                                <div className="flex flex-wrap gap-2 mt-2">
                                {filteredMedical.map((med: ProductAttribute, i: number) => <Badge key={i} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors.medical[i % badgeColors.medical.length])}>{med.name} ({med.percentage})</Badge>)}
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
                        )}
                        {strainInfo.flavor?.length > 0 && <Separator/>}
                        {strainInfo.flavor?.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-lg flex items-center gap-2"><Leaf className="h-5 w-5 text-primary"/>Flavors</h4>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {strainInfo.flavor?.map((flav: string, i: number) => <Badge key={i} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors.flavor[i % badgeColors.flavor.length])}>{flav}</Badge>)}
                                </div>
                            </div>
                        )}
                        {filteredEffects.length === 0 && filteredMedical.length === 0 && !strainInfo.description && (
                             <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
                                <Info className="h-16 w-16 text-primary/40 mb-4 animate-pulse-slow" />
                                <h4 className="text-lg font-semibold text-foreground">No Strain Data Available</h4>
                                <p className="mt-1">Detailed info for &quot;{stickerSet.name}&quot; could not be found in our database.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
                        <Info className="h-16 w-16 text-primary/40 mb-4 animate-pulse-slow" />
                        <h4 className="text-lg font-semibold text-foreground">No Strain Data Available</h4>
                        <p className="mt-1">Detailed info for &quot;{stickerSet.name}&quot; could not be found in our database.</p>
                    </div>
                )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <div className="flex w-full justify-between items-center">
             <div className="text-2xl font-bold">R60.00</div>
             <Button size="lg" className="bg-green-600 hover:bg-[#5D4E37] active:bg-green-800 text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" onClick={handleAddToCart}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
             </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
