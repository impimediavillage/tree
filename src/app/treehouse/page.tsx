'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Store, Sparkles, TrendingUp, ShoppingBag, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { CreatorStore } from '@/types/creator-store';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function TreehousePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [stores, setStores] = useState<CreatorStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const storesQuery = query(
        collection(db, 'creator_stores'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(storesQuery);
      const storesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CreatorStore[];

      setStores(storesData);
    } catch (error) {
      console.error('Error loading stores:', error);
      toast({
        title: 'Failed to Load Stores',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter((store) =>
    searchQuery.trim() === '' ||
    store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.creatorNickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.storeDescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[#5D4E37]/5">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#006B3E]/10">
                <Sparkles className="h-10 w-10 text-[#006B3E]" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-[#3D2E17]">The Treehouse</h1>
                <p className="text-[#5D4E37] font-semibold">Creator Mini-Stores & AI-Generated Apparel</p>
              </div>
            </div>
            <Badge className="bg-[#006B3E] text-white font-bold px-4 py-2 text-sm">
              25% supports creators
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#5D4E37]" />
            <Input
              placeholder="Search stores by name or creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-[#5D4E37] font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Stores grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#006B3E] border-t-transparent"></div>
            <p className="mt-4 text-[#5D4E37] font-semibold">Loading creator stores...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <Card className="border-[#5D4E37] text-center py-12">
            <CardContent>
              <Store className="h-16 w-16 text-[#5D4E37]/30 mx-auto mb-4" />
              <h3 className="text-xl font-extrabold text-[#3D2E17] mb-2">No stores found</h3>
              <p className="text-[#5D4E37] font-semibold">
                {searchQuery ? 'Try a different search' : 'Check back soon for new creator stores!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 text-[#5D4E37] font-semibold">
              Showing {filteredStores.length} creator store{filteredStores.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStores.map((store) => (
                <Card
                  key={store.id}
                  className="border-[#5D4E37]/30 hover:border-[#006B3E] hover:shadow-xl transition-all duration-200 group cursor-pointer bg-muted/50"
                  onClick={() => router.push(`/treehouse/store/${store.storeSlug}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-3 rounded-lg bg-[#006B3E]/10 group-hover:bg-[#006B3E]/20 transition-colors">
                        <Store className="h-8 w-8 text-[#006B3E]" />
                      </div>
                      <Badge className="bg-[#006B3E] text-white font-bold">
                        {store.stats.totalProducts} products
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-black text-[#3D2E17] group-hover:text-[#006B3E] transition-colors">
                      {store.storeName}
                    </CardTitle>
                    <CardDescription className="text-sm font-semibold text-[#5D4E37]">
                      by {store.creatorNickname}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {store.storeDescription && (
                      <p className="text-sm text-[#5D4E37] line-clamp-2">
                        {store.storeDescription}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-[#5D4E37] font-semibold">
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="h-4 w-4 text-[#006B3E]" />
                        <span>{store.stats.totalSales} sales</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-[#006B3E]" />
                        <span>{store.stats.totalProducts} items</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Button
                      className="w-full bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold transition-all duration-300 group-hover:scale-[1.02]"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/treehouse/store/${store.storeSlug}`);
                      }}
                    >
                      View Store
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
