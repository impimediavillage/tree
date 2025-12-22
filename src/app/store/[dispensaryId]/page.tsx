'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Dispensary, Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, ArrowLeft, Store, Search, MapPin, Info } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { PublicProductCard } from '@/components/cards/PublicProductCard';
import { Badge } from '@/components/ui/badge';
import { VideoLibraryGallery } from '@/components/video-library/VideoLibraryGallery';

export default function DispensaryStorePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const dispensaryId = params?.dispensaryId as string;

  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchDispensaryAndProducts = async () => {
      if (!dispensaryId) {
        setError('Dispensary not found');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch dispensary details
        const dispensaryDoc = await getDoc(doc(db, 'dispensaries', dispensaryId));
        
        if (!dispensaryDoc.exists()) {
          setError('Dispensary not found');
          setIsLoading(false);
          return;
        }

        const dispensaryData = { id: dispensaryDoc.id, ...dispensaryDoc.data() } as Dispensary;
        setDispensary(dispensaryData);

        // Get the correct collection name based on dispensary type
        const getCollectionName = (dispensaryType: string): string => {
          const typeMap: Record<string, string> = {
            'Cannibinoid store': 'cannibinoid_store_products',
            'Traditional Medicine dispensary': 'traditional_medicine_dispensary_products',
            'Homeopathic store': 'homeopathy_store_products',
            'Mushroom store': 'mushroom_store_products',
            'Permaculture & gardening store': 'permaculture_store_products',
          };
          return typeMap[dispensaryType] || 'products';
        };

        const collectionName = getCollectionName(dispensaryData.dispensaryType);

        // Fetch products for this dispensary from the correct collection
        const productsQuery = query(
          collection(db, collectionName),
          where('dispensaryId', '==', dispensaryId)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const fetchedProducts = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Product[];

        setProducts(fetchedProducts);
      } catch (err) {
        console.error('Error fetching dispensary:', err);
        setError('Failed to load dispensary');
        toast({
          title: 'Error',
          description: 'Failed to load dispensary details',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDispensaryAndProducts();
  }, [dispensaryId, toast]);

  // Extract unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...uniqueCategories.sort()];
  }, [products]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(lowerSearchTerm) ||
        product.description.toLowerCase().includes(lowerSearchTerm) ||
        product.category.toLowerCase().includes(lowerSearchTerm) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    return filtered;
  }, [products, searchTerm, selectedCategory]);

  // Count products per category
  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(product => {
      if (product.category) {
        counts[product.category] = (counts[product.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !dispensary) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{error || 'Dispensary not found'}</h2>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Simple Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Store Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 truncate">{dispensary.dispensaryName}</h1>
              {dispensary.showLocation && dispensary.city && dispensary.province && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>{dispensary.city}, {dispensary.province}</span>
                </div>
              )}
            </div>
            
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => router.back()}
              size="sm"
              className="flex-shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        {/* About Section - Collapsible/Compact */}
        {dispensary.message && (
          <Card className="mb-6 border-2 bg-muted/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-primary" />
                About this store
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm md:text-base">
                {dispensary.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Educational Video Library */}
        {dispensary.dispensaryType && (
          <VideoLibraryGallery dispensaryType={dispensary.dispensaryType} />
        )}

        {/* Search and Category Filters */}
        <Card className="mb-6 border-2 bg-muted/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Category Dropdown */}
              {categories.length > 1 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[250px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        <span className="flex items-center gap-2">
                          {category === 'all' ? 'All Products' : category}
                          <Badge variant="secondary" className="ml-auto">
                            {categoryCount[category] || 0}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div>
          {filteredProducts.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {selectedCategory === 'all' ? 'All Products' : selectedCategory}
                </h2>
                <p className="text-muted-foreground">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.flatMap(product => 
                  product.priceTiers.map((tier, tierIndex) => (
                    <PublicProductCard
                      key={`${product.id}-tier-${tierIndex}`}
                      product={product}
                      tier={tier}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <Card className="border-2 border-dashed bg-muted/50 border-border/50">
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                <Store className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'No products found' 
                    : 'No Products Yet'}
                </h3>
                <p className="text-sm">
                  {searchTerm || selectedCategory !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'This dispensary hasn\'t listed any products yet.'}
                </p>
                {(searchTerm || selectedCategory !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="mt-4"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
