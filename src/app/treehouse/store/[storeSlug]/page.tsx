'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { CreatorStore } from '@/types/creator-store';
import type { TreehouseProduct } from '@/types/creator-lab';
import { APPAREL_SIZES } from '@/types/creator-lab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ArrowLeft, Store, Search, Package } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';

export default function CreatorStorePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const storeSlug = params?.storeSlug as string;

  const [store, setStore] = useState<CreatorStore | null>(null);
  const [products, setProducts] = useState<TreehouseProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      if (!storeSlug) {
        setError('Store not found');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch store by slug
        const storesRef = collection(db, 'creator_stores');
        const storeQuery = query(storesRef, where('storeSlug', '==', storeSlug), where('isActive', '==', true));
        const storeSnapshot = await getDocs(storeQuery);
        
        if (storeSnapshot.empty) {
          setError('Store not found');
          setIsLoading(false);
          return;
        }

        const storeData = { id: storeSnapshot.docs[0].id, ...storeSnapshot.docs[0].data() } as CreatorStore;
        setStore(storeData);

        // Fetch products for this creator
        const productsRef = collection(db, 'treehouseProducts');
        const productsQuery = query(
          productsRef,
          where('creatorId', '==', storeData.ownerId),
          where('isActive', '==', true)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const fetchedProducts = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TreehouseProduct[];

        setProducts(fetchedProducts);
      } catch (err) {
        console.error('Error fetching store:', err);
        setError('Failed to load store');
        toast({
          title: 'Error',
          description: 'Failed to load store details',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStoreAndProducts();
  }, [storeSlug, toast]);

  // Extract unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...uniqueCategories.sort()];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.productName.toLowerCase().includes(lowerSearchTerm) ||
        product.productDescription?.toLowerCase().includes(lowerSearchTerm) ||
        product.category.toLowerCase().includes(lowerSearchTerm)
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

  if (error || !store) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{error || 'Store not found'}</h2>
        <Button onClick={() => router.push('/treehouse')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Treehouse
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
              <div className="flex items-center gap-3 mb-1">
                <Image src="/icons/tree-house-300.png" alt="Treehouse" width={40} height={40} className="flex-shrink-0" />
                <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{store.storeName}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                by <span className="font-bold text-[#006B3E]">{store.creatorNickname}</span>
              </p>
            </div>
            
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={() => router.push('/treehouse')}
              size="sm"
              className="flex-shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
        {/* Store Description */}
        {store.storeDescription && (
          <Card className="mb-6 border-2 bg-muted/50 border-border/50">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm md:text-base">
                {store.storeDescription}
              </p>
            </CardContent>
          </Card>
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
                {filteredProducts.map(product => {
                  const apparelType = product.apparelType || 'T-Shirt';
                  const availableSizes = APPAREL_SIZES[apparelType] || ['Standard'];
                  const needsSizeSelection = availableSizes.length > 1 && availableSizes[0] !== 'Standard';
                  const selectedSize = selectedSizes[product.id] || (needsSizeSelection ? '' : availableSizes[0]);
                  
                  return (
                  <Card key={product.id} className="bg-muted/50 border-border/50 hover:shadow-xl transition-shadow">
                    <div className="relative h-48 sm:h-56 overflow-hidden bg-muted/30">
                      {product.designImageUrl && (
                        <Image
                          src={product.designImageUrl}
                          alt={product.productName}
                          fill
                          className="object-cover"
                        />
                      )}
                      <Badge className="absolute top-2 right-2 bg-[#006B3E]">
                        {product.apparelType}
                      </Badge>
                      {/* Badge counts */}
                      <div className="absolute bottom-2 left-2 flex gap-2">
                        {product.salesCount > 0 && (
                          <Badge variant="secondary" className="bg-orange-500 text-white">
                            {product.salesCount} sold
                          </Badge>
                        )}
                        {product.addToCartCount > 0 && (
                          <Badge variant="secondary" className="bg-blue-500 text-white">
                            {product.addToCartCount} carts
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl font-black text-[#3D2E17]">
                        {product.productName}
                      </CardTitle>
                      {product.productDescription && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.productDescription}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-[#006B3E]">
                          R{product.price.toFixed(2)}
                        </span>
                        <Badge variant="secondary">{product.category}</Badge>
                      </div>
                      
                      {/* Size Selection UI */}
                      {needsSizeSelection && (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-muted-foreground">Size (International)</label>
                          <div className="flex gap-2 flex-wrap">
                            {availableSizes.map(size => (
                              <Button
                                key={size}
                                variant={selectedSize === size ? 'default' : 'outline'}
                                size="sm"
                                className={selectedSize === size ? 'bg-[#006B3E] hover:bg-[#005230]' : ''}
                                onClick={() => setSelectedSizes(prev => ({ ...prev, [product.id]: size }))}
                              >
                                {size}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Button
                        className="w-full bg-[#006B3E] hover:bg-[#005230]"
                        disabled={needsSizeSelection && !selectedSize}
                        onClick={() => {
                          // Convert Treehouse product to CartItem format
                          const sizeText = selectedSize && selectedSize !== 'Standard' ? ` - Size ${selectedSize}` : '';
                          const cartItem = {
                            id: product.id,
                            productId: product.id,
                            name: `${product.apparelType || product.productName} - Black${sizeText} (Creator Design)`,
                            description: product.productDescription || `Unique creator design by ${product.creatorName}`,
                            category: 'Treehouse',
                            dispensaryId: 'treehouse',
                            dispensaryName: 'The Treehouse',
                            dispensaryType: 'treehouse',
                            productOwnerEmail: product.creatorEmail,
                            currency: 'ZAR',
                            price: product.price,
                            unit: '1 item',
                            quantity: 1,
                            quantityInStock: 999, // POD - always in stock
                            imageUrl: product.designImageUrl,
                            productType: 'Apparel' as const,
                            weight: 0.3, // Average apparel weight
                            length: 30,
                            width: 25,
                            height: 5,
                          };

                          // @ts-ignore - addToCart expects Product and PriceTier, but we're providing compatible CartItem
                          addToCart(cartItem, { unit: '1 item', price: product.price, quantityInStock: 999 }, 1, product.designImageUrl);

                          toast({
                            title: 'Added to Cart!',
                            description: `${product.productName} by ${product.creatorName}`,
                          });
                        }}
                      >
                        Add to Cart
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Card className="border-2 border-dashed bg-muted/50 border-border/50">
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                <Package className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchTerm || selectedCategory !== 'all' 
                    ? 'No products found' 
                    : 'No Products Yet'}
                </h3>
                <p className="text-sm">
                  {searchTerm || selectedCategory !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'This store hasn\'t listed any products yet.'}
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
