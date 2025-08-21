
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collectionGroup, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { Product, PriceTier, ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { PublicProductCard } from '@/components/cards/PublicProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShoppingBasket, FilterX, AlertTriangle, Truck } from 'lucide-react';
import { RequestProductDialog } from '@/components/dispensary-admin/RequestProductDialog';

export default function BrowsePoolPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [poolProducts, setPoolProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<{product: Product, tier: PriceTier} | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  const fetchPoolProducts = useCallback(async () => {
    if (!currentUser?.dispensaryId || !currentDispensary?.dispensaryType) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        // Query for products shared with the same type OR all types
        const typeQuery = query(
            collectionGroup(db, 'products'),
            where('isAvailableForPool', '==', true),
            where('poolSharingRule', 'in', ['same_type', 'all_types'])
        );
        
        // Query for products shared specifically with this store
        const specificQuery = query(
            collectionGroup(db, 'products'),
            where('isAvailableForPool', '==', true),
            where('poolSharingRule', '==', 'specific_stores'),
            where('allowedPoolDispensaryIds', 'array-contains', currentUser.dispensaryId)
        );

        const [typeSnapshot, specificSnapshot] = await Promise.all([
            getDocs(typeQuery),
            getDocs(specificQuery)
        ]);
        
        const productsMap = new Map<string, Product>();

        const processSnapshot = (snapshot: any) => {
            snapshot.docs.forEach((doc: any) => {
                const product = { id: doc.id, ...doc.data() } as Product;
                // Exclude own products and filter by type if rule is 'same_type'
                if (product.dispensaryId !== currentUser.dispensaryId && !productsMap.has(doc.id)) {
                    if (product.poolSharingRule !== 'same_type' || (product.poolSharingRule === 'same_type' && product.dispensaryType === currentDispensary.dispensaryType)) {
                         productsMap.set(doc.id, product);
                    }
                }
            });
        };
        
        processSnapshot(typeSnapshot);
        processSnapshot(specificSnapshot);
        
        const allFetchedProducts = Array.from(productsMap.values());
        setPoolProducts(allFetchedProducts);

        const uniqueCategories = Array.from(new Set(allFetchedProducts.map(p => p.category).filter(Boolean)));
        setCategories(['all', ...uniqueCategories.sort()]);

    } catch (error) {
        console.error("Error fetching pool products:", error);
        toast({ title: "Error", description: "Failed to load products from the pool.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, currentDispensary, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchPoolProducts();
    }
  }, [authLoading, fetchPoolProducts]);
  
  const filteredProducts = useMemo(() => {
    return poolProducts.filter(product => {
      const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
      const searchMatch = !searchTerm || product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.description.toLowerCase().includes(searchTerm.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [poolProducts, searchTerm, selectedCategory]);

  const displayItems = useMemo(() => {
    return filteredProducts.flatMap(product => {
      if (Array.isArray(product.poolPriceTiers) && product.poolPriceTiers.length > 0) {
        return product.poolPriceTiers.map((tier, index) => ({
          product,
          tier,
          key: `${product.id}-${tier.unit}-${index}`
        }));
      }
      return [];
    });
  }, [filteredProducts]);

  const handleRequestClick = (product: Product, tier: PriceTier) => {
    setSelectedProduct({ product, tier });
    setIsRequestDialogOpen(true);
  };
  
  if (!authLoading && (!currentUser?.dispensary?.participateSharing || currentUser.dispensary.participateSharing === 'no')) {
    return (
        <Card className="mt-6 text-center">
            <CardHeader>
                <AlertTriangle className="mx-auto h-12 w-12 text-orange-500" />
                <CardTitle className="text-xl font-semibold">Product Sharing Disabled</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>
                    Your wellness profile is not set up to participate in the product sharing pool. To enable this feature, please edit your profile settings.
                </CardDescription>
            </CardContent>
        </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="shadow-lg bg-card border-primary/30">
            <CardHeader>
            <CardTitle 
                className="text-3xl font-bold text-foreground flex items-center"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
                <ShoppingBasket className="mr-3 h-8 w-8 text-primary" /> Browse Product Pool
            </CardTitle>
            <CardDescription 
                className="text-md text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
                Discover and request products from other participating wellness stores.
            </CardDescription>
            </CardHeader>
        </Card>
        
        <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card shadow-sm">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input type="text" placeholder="Search by name or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>)}</SelectContent>
            </Select>
            {(searchTerm || selectedCategory !== 'all') && <Button variant="ghost" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}><FilterX className="mr-2 h-4 w-4"/> Clear</Button>}
        </div>

        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[420px] w-full rounded-lg" />)}
            </div>
        ) : displayItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
            {displayItems.map((item) => (
              <PublicProductCard key={item.key} product={item.product} tier={item.tier} onRequestProduct={handleRequestClick} />
            ))}
          </div>
        ) : (
          <Card className="col-span-full">
            <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                <Truck className="mx-auto h-12 w-12 mb-4 text-orange-500" />
                <h3 className="text-2xl font-semibold mb-2">The Pool is Empty</h3>
                <p>No products are currently available in the pool that match your criteria or store type.</p>
            </CardContent>
        </Card>
        )}
      </div>
      {selectedProduct && currentDispensary && (
        <RequestProductDialog
          isOpen={isRequestDialogOpen}
          onOpenChange={setIsRequestDialogOpen}
          product={selectedProduct.product}
          tier={selectedProduct.tier}
          requesterDispensary={currentDispensary}
          onSuccess={() => {
            setIsRequestDialogOpen(false);
            // Optionally, you can refetch or just show a toast
            toast({ title: 'Request Sent!', description: 'Your product request has been sent to the owner.' });
          }}
        />
      )}
    </>
  );
}
