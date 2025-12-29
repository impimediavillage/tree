'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { 
  Package, Plus, X, Search, Loader2, ArrowLeft,
  Sparkles, TrendingUp, DollarSign, Check
} from 'lucide-react';
import type { Product } from '@/types';
import type { HealingBundle, BundleProduct } from '@/types/influencer';
import Link from 'next/link';

export default function CreateBundlePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [influencerId, setInfluencerId] = useState<string | null>(null);
  const [bundleName, setBundleName] = useState('');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [discountPercent, setDiscountPercent] = useState(15);
  const [selectedProducts, setSelectedProducts] = useState<BundleProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Get influencer profile
      const profilesRef = collection(db, 'influencers');
      const q = query(profilesRef, where('userId', '==', user.uid));
      const profileSnapshot = await getDocs(q);

      if (profileSnapshot.empty) {
        toast({
          title: 'Not Authorized',
          description: 'You must be an approved influencer to create bundles',
          variant: 'destructive'
        });
        router.push('/dashboard/influencer/apply');
        return;
      }

      const influencerDoc = profileSnapshot.docs[0];
      setInfluencerId(influencerDoc.id);

      // Load all approved products from all dispensaries
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      
      const products = productsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
        .filter(p => p.quantityInStock > 0); // Only in-stock products

      setAvailableProducts(products);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    // Early return if required fields missing
    if (!product.id || !product.dispensaryId) {
      toast({
        variant: "destructive",
        description: "Product missing required fields"
      });
      return;
    }

    if (selectedProducts.some(p => p.productId === product.id)) {
      toast({
        title: 'Already Added',
        description: 'This product is already in your bundle',
        variant: 'destructive'
      });
      return;
    }

    // After guard clause above, these are definitely strings
    const productId = product.id!;
    const dispensaryId = product.dispensaryId!;

    const bundleProduct: BundleProduct = {
      productId,
      dispensaryId,
      productName: product.name,
      price: product.priceTiers[0]?.price || 0,
      imageUrl: product.imageUrl || undefined
    };

    setSelectedProducts([...selectedProducts, bundleProduct]);
    setSearchTerm('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  const calculateTotals = () => {
    const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const discountAmount = totalPrice * (discountPercent / 100);
    const discountedPrice = totalPrice - discountAmount;
    return { totalPrice, discountAmount, discountedPrice };
  };

  const handleSubmit = async () => {
    if (!influencerId) return;

    // Validation
    if (!bundleName || bundleName.length < 3) {
      toast({
        title: 'Invalid Name',
        description: 'Bundle name must be at least 3 characters',
        variant: 'destructive'
      });
      return;
    }

    if (selectedProducts.length < 2) {
      toast({
        title: 'Add More Products',
        description: 'A bundle must contain at least 2 products',
        variant: 'destructive'
      });
      return;
    }

    if (discountPercent < 5 || discountPercent > 50) {
      toast({
        title: 'Invalid Discount',
        description: 'Discount must be between 5% and 50%',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      const { totalPrice, discountedPrice } = calculateTotals();

      const bundle: Omit<HealingBundle, 'id'> = {
        influencerId,
        name: bundleName,
        description,
        tagline: tagline || undefined,
        products: selectedProducts,
        totalPrice,
        discountedPrice,
        discountPercent,
        coverImage: selectedProducts[0]?.imageUrl,
        tags: [],
        stats: {
          views: 0,
          conversions: 0,
          revenue: 0
        },
        isActive: true,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      };

      await addDoc(collection(db, 'healingBundles'), bundle);

      toast({
        title: 'Bundle Created! 🎉',
        description: `"${bundleName}" is now live`
      });

      router.push('/dashboard/influencer/bundles');
    } catch (error) {
      console.error('Error creating bundle:', error);
      toast({
        title: 'Creation Failed',
        description: 'Failed to create bundle. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const { totalPrice, discountAmount, discountedPrice } = calculateTotals();
  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.dispensaryName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#3D2E17] flex items-center gap-2">
              <Package className="w-8 h-8 text-[#006B3E]" />
              Create Healing Bundle
            </h1>
            <p className="text-muted-foreground mt-1">Curate products for your community's wellness journey</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/influencer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Bundle Details */}
          <div className="lg:col-span-2 space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Bundle Details
                </CardTitle>
                <CardDescription>Give your bundle an engaging name and description</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bundleName">Bundle Name *</Label>
                  <Input
                    id="bundleName"
                    placeholder="e.g., Morning Serenity Pack"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{bundleName.length}/50 characters</p>
                </div>

                <div>
                  <Label htmlFor="tagline">Tagline (optional)</Label>
                  <Input
                    id="tagline"
                    placeholder="e.g., Start your day with clarity"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what makes this bundle special and who it's for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="discount">Discount Percentage *</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="discount"
                      type="number"
                      min={5}
                      max={50}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Number(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">(5% - 50% range)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#006B3E]" />
                  Add Products
                </CardTitle>
                <CardDescription>Search and add products to your bundle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searchTerm && (
                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {filteredProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
                    ) : (
                      filteredProducts.slice(0, 10).map(product => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                          onClick={() => addProduct(product)}
                        >
                          <div className="flex items-center gap-3">
                            {product.imageUrl && (
                              <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.dispensaryName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#006B3E]">R{product.priceTiers[0]?.price.toFixed(2)}</p>
                            <Button size="sm" variant="ghost" className="h-6 px-2">
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {selectedProducts.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <Label>Selected Products ({selectedProducts.length})</Label>
                    {selectedProducts.map(product => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.productName} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm font-bold text-[#006B3E]">R{product.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeProduct(product.productId)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pricing Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Original Price:</span>
                    <span className="font-medium">R{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-medium">-R{discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold">Bundle Price:</span>
                    <span className="text-2xl font-black text-[#006B3E]">R{discountedPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-amber-600">
                    <span>Customer Saves:</span>
                    <span className="font-bold">R{discountAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#006B3E]">
                    <TrendingUp className="w-4 h-4" />
                    Your Commission
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll earn commission on each bundle sale based on your tier rate (5%-20% of platform commission)
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || selectedProducts.length < 2 || !bundleName}
                  className="w-full bg-[#006B3E] hover:bg-[#005530]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Create Bundle
                    </>
                  )}
                </Button>

                {selectedProducts.length < 2 && (
                  <p className="text-xs text-center text-amber-600">Add at least 2 products to create a bundle</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
