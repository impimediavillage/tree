
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Dispensary, Product } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, MapPin, Clock, Tag, ShoppingCart, Info, Search, FilterX, Leaf as LeafIcon, Flame, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/contexts/CartContext'; 
import { useToast } from '@/hooks/use-toast';   

interface PublicProductCardProps {
  product: Product;
}

function PublicProductCard({ product }: PublicProductCardProps) {
  const { addToCart, cartItems } = useCart(); // Get cartItems to check current quantity in cart
  const { toast } = useToast();
  const dataAiHintProduct = `${product.category} ${product.name.split(" ")[0] || ""}`;

  const itemInCart = cartItems.find(item => item.id === product.id);
  const currentQuantityInCart = itemInCart?.quantity || 0;
  const canAddToCart = product.quantityInStock > currentQuantityInCart;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast({
        title: "Stock Limit Reached",
        description: `You already have the maximum available stock of ${product.name} in your cart.`,
        variant: "destructive",
      });
      return;
    }
    addToCart(product, 1); // Add one quantity
    toast({
      title: `Added to Cart!`,
      description: `${product.name} has been added to your cart.`,
      variant: "default",
    });
  };

  return (
    <Card 
        className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 h-full bg-card text-card-foreground group border border-border hover:border-primary/60"
        data-ai-hint={dataAiHintProduct}
    >
      <div className="relative w-full h-48 sm:h-56 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={`product ${product.name.split(" ")[0] || ""}`}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
            {product.thcContent !== null && product.thcContent !== undefined && product.thcContent > 0 && (
                <Badge variant="secondary" className="bg-red-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                    <Flame className="h-3.5 w-3.5 mr-1" /> THC: {product.thcContent}%
                </Badge>
            )}
            {product.cbdContent !== null && product.cbdContent !== undefined && product.cbdContent > 0 && (
                <Badge variant="secondary" className="bg-blue-500/80 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">
                    <LeafIcon className="h-3.5 w-3.5 mr-1" /> CBD: {product.cbdContent}%
                </Badge>
            )}
        </div>
         {product.quantityInStock > 0 ? (
            <Badge variant="default" className="absolute top-2 right-2 bg-green-600/90 hover:bg-green-700 text-white backdrop-blur-sm text-xs px-2 py-1 shadow">In Stock</Badge>
        ) : (
            <Badge variant="destructive" className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground backdrop-blur-sm text-xs px-2 py-1 shadow">Out of Stock</Badge>
        )}
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-semibold truncate text-primary" title={product.name}>{product.name}</CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5"/> <span>{product.category}</span>
            {product.strain && <span className="truncate">| {product.strain}</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2.5 py-2">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed" title={product.description}>{product.description}</p>
        
        {(product.effects && product.effects.length > 0) || (product.flavors && product.flavors.length > 0) ? (
            <div className="space-y-1.5 pt-1">
                {product.effects && product.effects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0"/>
                        {product.effects.slice(0, 3).map(effect => <Badge key={effect} variant="outline" className="text-xs px-1.5 py-0.5">{effect}</Badge>)}
                         {product.effects.length > 3 && <Badge variant="outline" className="text-xs px-1.5 py-0.5">+{product.effects.length - 3} more</Badge>}
                    </div>
                )}
                 {product.flavors && product.flavors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                         <LeafIcon className="h-3.5 w-3.5 text-green-500 flex-shrink-0"/>
                        {product.flavors.slice(0, 3).map(flavor => <Badge key={flavor} variant="outline" className="text-xs px-1.5 py-0.5">{flavor}</Badge>)}
                        {product.flavors.length > 3 && <Badge variant="outline" className="text-xs px-1.5 py-0.5">+{product.flavors.length - 3} more</Badge>}
                    </div>
                )}
            </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 pt-3 border-t mt-auto">
        <p className="text-2xl font-bold text-accent self-end">
            {product.currency} {product.price.toFixed(2)}
            <span className="text-xs text-muted-foreground"> / {product.unit}</span>
        </p>
        <Button 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-md font-semibold" 
            disabled={product.quantityInStock <= 0 || !canAddToCart}
            onClick={handleAddToCart}
            aria-label={product.quantityInStock > 0 ? (canAddToCart ? `Add ${product.name} to cart` : `Max stock of ${product.name} in cart`) : `${product.name} is out of stock`}
        >
          <ShoppingCart className="mr-2 h-5 w-5" /> 
          {product.quantityInStock <= 0 ? 'Out of Stock' : (canAddToCart ? 'Add to Cart' : 'Max in Cart')}
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function DispensaryStorePage() {
  const params = useParams();
  const dispensaryId = params.dispensaryId as string;
  const router = useRouter();

  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!dispensaryId) {
      setError("Dispensary ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchDispensaryData = async () => {
      setIsLoading(true);
      try {
        const dispensaryDocRef = doc(db, 'dispensaries', dispensaryId);
        const dispensarySnap = await getDoc(dispensaryDocRef);

        if (!dispensarySnap.exists() || dispensarySnap.data()?.status !== 'Approved') {
          setError('Dispensary not found or not available.');
          setIsLoading(false);
          return;
        }
        setDispensary(dispensarySnap.data() as Dispensary);

        const productsQuery = query(
          collection(db, 'products'),
          where('dispensaryId', '==', dispensaryId),
          orderBy('name')
        );
        const productsSnapshot = await getDocs(productsQuery);
        const fetchedProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);

        const uniqueCategories = Array.from(new Set(fetchedProducts.map(p => p.category)));
        setCategories(['all', ...uniqueCategories.sort()]);

      } catch (err) {
        console.error("Error fetching dispensary data:", err);
        setError('Failed to load dispensary information.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDispensaryData();
  }, [dispensaryId]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading Dispensary Store...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive-foreground mb-2">{error}</h2>
        <p className="text-muted-foreground mb-6">This e-store might be temporarily unavailable or no longer exists.</p>
        <Button onClick={() => router.push('/')}>Back to Home</Button>
      </div>
    );
  }

  if (!dispensary) return null; 

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card className="mb-8 shadow-xl bg-card text-card-foreground border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle 
            className="text-4xl font-extrabold text-foreground tracking-tight"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {dispensary.dispensaryName}
          </CardTitle>
          <CardDescription 
            className="text-lg text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {dispensary.dispensaryType}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {dispensary.message && (
            <p 
                className="italic text-foreground/90"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >&quot;{dispensary.message}&quot;</p>
          )}
          <div 
            className="flex items-center gap-2 text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <MapPin className="h-4 w-4" /> <span>{dispensary.location}</span>
          </div>
          {(dispensary.openTime || dispensary.closeTime) && (
            <div 
                className="flex items-center gap-2 text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              <Clock className="h-4 w-4" />
              <span>Hours: {dispensary.openTime || 'N/A'} - {dispensary.closeTime || 'N/A'}</span>
            </div>
          )}
          {dispensary.operatingDays && dispensary.operatingDays.length > 0 && (
            <div 
                className="flex items-center gap-2 text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
               <Tag className="h-4 w-4" />
               <span>Open: {dispensary.operatingDays.join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>

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


      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <PublicProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Products Found</h3>
          <p 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {products.length === 0 ? "This dispensary hasn't listed any products yet." : "No products match your current filters."}
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <Button variant="outline" className="mt-4" onClick={() => {setSearchTerm(''); setSelectedCategory('all');}}>
                <FilterX className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

