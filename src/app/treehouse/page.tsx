'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Sparkles, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import type { TreehouseProduct, ApparelType } from '@/types/creator-lab';
import { APPAREL_PRICES, CREATOR_COMMISSION_RATE } from '@/types/creator-lab';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TreehousePage() {
  const [products, setProducts] = useState<TreehouseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const { addToCart } = useCart();
  const { toast } = useToast();

  const apparelTypes: ApparelType[] = ['T-Shirt', 'Long T-Shirt', 'Hoodie', 'Cap', 'Beanie'];

  useEffect(() => {
    loadProducts();
  }, [selectedType, sortBy]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      let productsQuery = query(
        collection(db, 'treehouseProducts'),
        where('isActive', '==', true)
      );

      // Filter by apparel type
      if (selectedType !== 'all') {
        productsQuery = query(productsQuery, where('apparelType', '==', selectedType));
      }

      // Sort
      if (sortBy === 'newest') {
        productsQuery = query(productsQuery, orderBy('publishedAt', 'desc'));
      } else if (sortBy === 'popular') {
        productsQuery = query(productsQuery, orderBy('salesCount', 'desc'));
      } else if (sortBy === 'price-low') {
        productsQuery = query(productsQuery, orderBy('price', 'asc'));
      } else if (sortBy === 'price-high') {
        productsQuery = query(productsQuery, orderBy('price', 'desc'));
      }

      productsQuery = query(productsQuery, limit(50));

      const snapshot = await getDocs(productsQuery);
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TreehouseProduct[];

      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Failed to Load Products',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: TreehouseProduct) => {
    // Convert Treehouse product to CartItem format
    const cartItem = {
      id: product.id,
      productId: product.id,
      name: `${product.apparelType} - Black (Creator Design)`,
      description: `Unique creator design by ${product.creatorName}`,
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
      description: `${product.apparelType} by ${product.creatorName}`,
    });
  };

  const filteredProducts = products.filter((product) =>
    searchQuery.trim() === '' ||
    product.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.apparelType.toLowerCase().includes(searchQuery.toLowerCase())
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
                <p className="text-[#5D4E37] font-semibold">AI-Generated Creator Apparel</p>
              </div>
            </div>
            <Badge className="bg-[#006B3E] text-white font-bold px-4 py-2 text-sm">
              25% supports creators
            </Badge>
          </div>

          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#5D4E37]" />
              <Input
                placeholder="Search by creator or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-[#5D4E37] font-semibold"
              />
            </div>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="border-[#5D4E37] font-semibold">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {apparelTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border-[#5D4E37] font-semibold">
                <TrendingUp className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#006B3E] border-t-transparent"></div>
            <p className="mt-4 text-[#5D4E37] font-semibold">Loading designs...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="border-[#5D4E37] text-center py-12">
            <CardContent>
              <Sparkles className="h-16 w-16 text-[#5D4E37]/30 mx-auto mb-4" />
              <h3 className="text-xl font-extrabold text-[#3D2E17] mb-2">No products found</h3>
              <p className="text-[#5D4E37] font-semibold">
                {searchQuery ? 'Try a different search' : 'Check back soon for new creator designs!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 text-[#5D4E37] font-semibold">
              Showing {filteredProducts.length} design{filteredProducts.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="border-[#5D4E37]/30 hover:border-[#006B3E] hover:shadow-lg transition-all duration-200 group"
                >
                  <CardHeader className="p-0">
                    {/* Design preview on black background */}
                    <div className="relative aspect-square bg-black rounded-t-lg overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center p-8">
                        <img
                          src={product.designImageUrl}
                          alt={product.apparelType}
                          className="max-w-[70%] max-h-[70%] object-contain"
                        />
                      </div>
                      
                      {/* Overlay info */}
                      <div className="absolute top-2 left-2 right-2 flex justify-between">
                        <Badge className="bg-white/90 text-black font-bold">
                          {product.apparelType}
                        </Badge>
                        {product.salesCount > 0 && (
                          <Badge className="bg-[#006B3E] text-white font-bold">
                            {product.salesCount} sold
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {/* Creator info */}
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-[#006B3E]" />
                      <p className="text-sm font-bold text-[#5D4E37]">{product.creatorName}</p>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-2xl font-extrabold text-[#3D2E17]">
                        R{product.price}
                      </span>
                      <span className="text-xs text-[#5D4E37] font-semibold">incl. VAT</span>
                    </div>

                    {/* Commission badge */}
                    <div className="text-xs text-[#006B3E] font-bold">
                      R{Math.round(product.price * CREATOR_COMMISSION_RATE)} to creator
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold transition-all duration-300 group-hover:scale-[1.02]"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
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
