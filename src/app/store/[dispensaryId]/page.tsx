'use client';

import * as React from 'react';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, functions } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoDialog } from '@/components/dialogs/InfoDialog';
import { StickerSetDetailDialog } from '@/components/dialogs/StickerSetDetailDialog';
import { PublicProductCard } from '@/components/cards/PublicProductCard';
import { DesignViewerDialog } from '@/components/dialogs/DesignViewerDialog';


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

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [designViewerState, setDesignViewerState] = useState<{product: Product | null, tier: PriceTier | null}>({product: null, tier: null});
  
  const handleGenerateDesignsClick = (product: Product, tier: PriceTier) => {
    setDesignViewerState({ product, tier });
    setIsViewerOpen(true);
  };

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
        
        const wellnessData = wellnessSnap.data() as Dispensary;
        setWellness(wellnessData);

        const getProductCollectionName = (type: string | undefined): string => {
            if (!type) return 'products';
            if (type === 'Cannibinoid store') return 'cannibinoid_store_products';
            if (type === 'Traditional Medicine dispensary') return 'traditional_medicine_dispensary_products';
            if (type === 'Homeopathic store') return 'homeopathy_store_products';
            if (type === 'Mushroom store') return 'mushroom_store_products';
            if (type === 'Permaculture & gardening store') return 'permaculture_store_products';
            return 'products'; // Fallback
        };

        const productCollectionName = getProductCollectionName(wellnessData.dispensaryType);

        const productsQuery = query(
          collection(db, productCollectionName),
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
              <Gift className="h-5 w-5"/> Free smokables with each Triple S Club design pack purchased.
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
            <PublicProductCard key={item.key} product={item.product} tier={item.tier} onGenerateDesigns={handleGenerateDesignsClick} />
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

      <DesignViewerDialog 
        isOpen={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        product={designViewerState.product}
        tier={designViewerState.tier}
      />
    </div>
  );
}
