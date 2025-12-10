'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Dispensary, Product } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, Store, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function DispensaryStorePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const dispensaryId = params?.dispensaryId as string;

  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch products for this dispensary
        const productsQuery = query(
          collection(db, 'products'),
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

  const bannerUrl = dispensary.bannerUrl || 'https://placehold.co/1200x400.png?text=' + encodeURIComponent(dispensary.dispensaryName);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      {/* Banner */}
      <div className="relative w-full h-64 mb-8 rounded-lg overflow-hidden">
        <Image
          src={bannerUrl}
          alt={dispensary.dispensaryName}
          layout="fill"
          objectFit="cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
          <div className="p-6">
            <h1 className="text-4xl font-bold text-white mb-2">{dispensary.dispensaryName}</h1>
            <p className="text-white/90">{dispensary.dispensaryType}</p>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      {/* Dispensary Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>About {dispensary.dispensaryName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {dispensary.message || 'Welcome to our store!'}
          </p>
          {dispensary.city && dispensary.province && (
            <p className="text-sm">
              <strong>Location:</strong> {dispensary.city}, {dispensary.province}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          Products
        </h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.flatMap(product => 
              product.priceTiers.map((tier, tierIndex) => (
                <Card key={`${product.id}-tier-${tierIndex}`} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative w-full h-48">
                    <Image
                      src={product.imageUrl || 'https://placehold.co/400x300.png?text=Product'}
                      alt={`${product.name} - ${tier.unit}`}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <p className="text-sm font-semibold text-muted-foreground">{tier.unit}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {tier.description || product.description}
                    </p>
                    {(tier.quantityInStock ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground mb-3">
                        In stock: {tier.quantityInStock}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-primary">
                        {product.currency || dispensary.currency} {tier.price}
                      </span>
                      <Button size="sm" disabled={(tier.quantityInStock ?? 0) === 0}>
                        {(tier.quantityInStock ?? 0) === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Store className="mx-auto h-12 w-12 mb-3" />
              <h3 className="text-xl font-semibold">No Products Yet</h3>
              <p>This dispensary hasn&apos;t listed any products yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
