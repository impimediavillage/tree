
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Product, PriceTier, ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PublicProductCard } from '@/components/cards/PublicProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ShoppingBasket, FilterX, AlertTriangle, Truck } from 'lucide-react';

const productCollectionNames = [
    "cannibinoid_store_products",
    "traditional_medicine_dispensary_products",
    "homeopathy_store_products",
    "mushroom_store_products",
    "permaculture_store_products",
    "products" 
];

type ProductWithRequestInfo = {
    product: Product;
    tier: PriceTier;
    key: string;
    requestStatus?: 'negotiating';
    requestCount: number;
    totalRequestedByUser: number;
};

export default function BrowsePoolPage() {
  const router = useRouter();
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [poolProducts, setPoolProducts] = useState<Product[]>([]);
  const [myOpenRequests, setMyOpenRequests] = useState<ProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  const fetchPoolData = useCallback(async () => {
    if (!currentUser?.dispensaryId || !currentDispensary?.dispensaryType) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    const myDispensaryId = currentUser.dispensaryId;
    const myDispensaryType = currentDispensary.dispensaryType;
    const productsMap = new Map<string, Product>();

    try {
        for (const collectionName of productCollectionNames) {
            const productsCollectionRef = collection(db, collectionName);
            const sameTypeQuery = query(productsCollectionRef, where('isAvailableForPool', '==', true), where('poolSharingRule', '==', 'same_type'), where('dispensaryType', '==', myDispensaryType));
            const allTypesQuery = query(productsCollectionRef, where('isAvailableForPool', '==', true), where('poolSharingRule', '==', 'all_types'));
            const specificStoresQuery = query(productsCollectionRef, where('isAvailableForPool', '==', true), where('poolSharingRule', '==', 'specific_stores'), where('allowedPoolDispensaryIds', 'array-contains', myDispensaryId));

            const [sameTypeSnapshot, allTypesSnapshot, specificStoresSnapshot] = await Promise.all([
                getDocs(sameTypeQuery).catch(e => { console.warn(`Query (same_type) failed for ${collectionName}:`, e.message); return null; }),
                getDocs(allTypesQuery).catch(e => { console.warn(`Query (all_types) failed for ${collectionName}:`, e.message); return null; }),
                getDocs(specificStoresQuery).catch(e => { console.warn(`Query (specific_stores) failed for ${collectionName}:`, e.message); return null; })
            ]);

            const processSnapshot = (snapshot: any) => {
              snapshot?.forEach((doc: any) => {
                if (doc.data().dispensaryId !== myDispensaryId) productsMap.set(doc.id, { id: doc.id, ...doc.data() } as Product);
              });
            };
            processSnapshot(sameTypeSnapshot);
            processSnapshot(allTypesSnapshot);
            processSnapshot(specificStoresSnapshot);
        }
        
        const allFetchedProducts = Array.from(productsMap.values());
        setPoolProducts(allFetchedProducts);

        if (allFetchedProducts.length > 0) {
            const uniqueCategories = Array.from(new Set(allFetchedProducts.map(p => p.category).filter(Boolean)));
            setCategories(['all', ...uniqueCategories.sort()]);
        }
        
        const openRequestStatuses: ProductRequest['requestStatus'][] = ['pending_owner_approval', 'accepted', 'fulfilled_by_sender'];
        const requestsQuery = query(collection(db, 'productRequests'), 
            where('requesterDispensaryId', '==', myDispensaryId),
            where('requestStatus', 'in', openRequestStatuses)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const openRequests = requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest));
        setMyOpenRequests(openRequests);

    } catch (error) {
        console.error("[Browse Pool] Critical error during fetch:", error);
        toast({ title: "Error", description: "A critical error occurred while loading products from the pool.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [currentUser, currentDispensary, toast]);


  useEffect(() => {
    if (!authLoading) {
      fetchPoolData();
    }
  }, [authLoading, fetchPoolData]);

  // Listen for when a request is submitted and refresh data
  useEffect(() => {
    const checkForRefresh = () => {
      const shouldRefresh = localStorage.getItem('poolRequestSubmitted');
      if (shouldRefresh === 'true') {
        localStorage.removeItem('poolRequestSubmitted');
        fetchPoolData();
      }
    };

    // Check on mount
    checkForRefresh();

    // Also check when window regains focus (in case user navigates back)
    window.addEventListener('focus', checkForRefresh);
    return () => window.removeEventListener('focus', checkForRefresh);
  }, [fetchPoolData]);
  
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
        return product.poolPriceTiers.map((tier, index) => {
          const requestsForThisTier = myOpenRequests.filter(req => req.productId === product.id && req.requestedTier?.unit === tier.unit);
          const totalRequestedByUser = requestsForThisTier.reduce((sum, req) => sum + req.quantityRequested, 0);
          return {
            product,
            tier,
            key: `${product.id}-${tier.unit}-${index}`,
            requestStatus: requestsForThisTier.length > 0 ? 'negotiating' : undefined,
            requestCount: requestsForThisTier.length,
            totalRequestedByUser,
          } as ProductWithRequestInfo;
        });
      }
      return [];
    });
  }, [filteredProducts, myOpenRequests]);

  const handleRequestClick = (product: Product, tier: PriceTier) => {
    // For pool tiers, use unit + price as composite key since tierId might not exist
    const tierIdentifier = `${tier.unit}-${tier.price}`;
    
    // Navigate to the request page with URL params
    // Pass the collection name so we know where to find the product
    const params = new URLSearchParams({
      productId: product.id || '',
      tierId: tierIdentifier,
      ownerDispensaryId: product.dispensaryId,
      collectionName: product.dispensaryType ? getCollectionName(product.dispensaryType) : 'products',
    });
    router.push(`/dispensary-admin/browse-pool/request?${params.toString()}`);
  };

  // Helper to get collection name from dispensary type
  const getCollectionName = (dispensaryType: string): string => {
    const typeMap: Record<string, string> = {
      'Cannibinoid store': 'cannibinoid_store_products',
      'Traditional Medicine dispensary': 'traditional_medicine_dispensary_products',
      'Homeopathy store': 'homeopathy_store_products',
      'Mushroom store': 'mushroom_store_products',
      'Permaculture store': 'permaculture_store_products',
    };
    return typeMap[dispensaryType] || 'products';
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
              <PublicProductCard 
                key={item.key} 
                product={item.product} 
                tier={item.tier} 
                onRequestProduct={handleRequestClick} 
                requestStatus={item.requestStatus}
                requestCount={item.requestCount}
                totalRequestedByUser={item.totalRequestedByUser}
              />
            ))}
          </div>
        ) : (
          <Card className="col-span-full">
            <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                <Truck className="mx-auto h-12 w-12 mb-4 text-orange-500" />
                <h3 className="text-2xl font-semibold">The Pool is Empty</h3>
                <p>No products are currently available in the pool that match your criteria or store type.</p>
            </CardContent>
        </Card>
        )}
      </div>
    </>
  );
}
