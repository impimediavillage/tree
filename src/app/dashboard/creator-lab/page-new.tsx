'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Wand2, Plus, Loader2, AlertTriangle, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CategoryFilterButtons } from '@/components/creator-lab/CategoryFilterButtons';
import { ApparelSelector } from '@/components/creator-lab/ApparelSelector';
import { DesignStudioModal } from '@/components/creator-lab/DesignStudioModal';
import { ModelShowcase } from '@/components/creator-lab/ModelShowcase';
import type { CreatorDesign, ProductCategory, ApparelType, TreehouseProduct } from '@/types/creator-lab';
import { APPAREL_PRICES } from '@/types/creator-lab';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import Image from 'next/image';

export default function CreatorLabPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, isLeafUser, isDispensaryOwner, isDispensaryStaff } = useAuth();
  const { toast } = useToast();
  
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [showApparelSelector, setShowApparelSelector] = useState(false);
  const [showDesignStudio, setShowDesignStudio] = useState(false);
  const [showModelShowcase, setShowModelShowcase] = useState(false);
  
  const [selectedApparelType, setSelectedApparelType] = useState<ApparelType | null>(null);
  const [selectedSurface, setSelectedSurface] = useState<'front' | 'back' | undefined>(undefined);
  const [currentDesign, setCurrentDesign] = useState<CreatorDesign | null>(null);
  
  const [myProducts, setMyProducts] = useState<TreehouseProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const canAccessCreatorLab = isLeafUser || isDispensaryOwner || isDispensaryStaff;
  const userCredits = currentUser?.credits || 0;

  // Load user's Treehouse products
  useEffect(() => {
    if (currentUser?.uid) {
      loadMyProducts();
    }
  }, [currentUser, selectedCategory]);

  const loadMyProducts = async () => {
    if (!currentUser) return;
    
    setLoadingProducts(true);
    try {
      const productsRef = collection(db, 'treehouseProducts');
      let q = query(
        productsRef,
        where('creatorId', '==', currentUser.uid),
        where('isActive', '==', true)
      );

      if (selectedCategory) {
        q = query(
          productsRef,
          where('creatorId', '==', currentUser.uid),
          where('isActive', '==', true),
          where('category', '==', selectedCategory)
        );
      }

      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TreehouseProduct[];
      setMyProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCategorySelect = (category: ProductCategory) => {
    setSelectedCategory(category);
  };

  const handleAddNew = () => {
    if (selectedCategory === 'Apparel') {
      setShowApparelSelector(true);
    } else {
      toast({
        title: 'Coming Soon! 🎨',
        description: `${selectedCategory} creation tools are under development.`,
      });
    }
  };

  const handleApparelSelect = (apparelType: ApparelType, surface?: 'front' | 'back') => {
    setSelectedApparelType(apparelType);
    setSelectedSurface(surface);
    setShowApparelSelector(false);
    setShowDesignStudio(true);
  };

  const handleDesignComplete = (design: CreatorDesign) => {
    setCurrentDesign(design);
    setShowDesignStudio(false);
    setShowModelShowcase(true);
  };

  const handleModelComplete = async (modelImageUrl: string, modelPrompt: string) => {
    // Save product to Treehouse
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');
      const idToken = await firebaseUser.getIdToken();
      
      const response = await fetch('/api/creator-lab/publish-product', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          designId: currentDesign?.id,
          apparelTypes: [selectedApparelType],
          category: selectedCategory,
          surface: selectedSurface,
          modelImageUrl: modelImageUrl || undefined,
          tags: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to publish product');
      }

      toast({
        title: '🎉 Product Published!',
        description: 'Your creation is now live in The Treehouse Store!',
      });

      setShowModelShowcase(false);
      loadMyProducts(); // Refresh products list

      // Reset state
      setCurrentDesign(null);
      setSelectedApparelType(null);
      setSelectedSurface(undefined);
    } catch (error: any) {
      console.error('Error publishing product:', error);
      toast({
        title: 'Publishing Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const calculateCommission = (price: number) => {
    return Math.round(price * 0.2); // 25% commission
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E] mb-4" />
        <h2 className="text-2xl font-bold text-[#3D2E17]">Loading Creator Lab...</h2>
      </div>
    );
  }

  if (!currentUser || !canAccessCreatorLab) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertTriangle className="h-16 w-16 text-amber-600 mb-4" />
        <h2 className="text-2xl font-extrabold text-[#3D2E17] mb-2">Access Restricted</h2>
        <p className="text-[#5D4E37] font-semibold mb-6">
          Creator Lab is available to Leaf Users and Dispensary Team Members.
        </p>
        <Button onClick={() => router.push('/auth/signup')} className="bg-[#006B3E] hover:bg-[#005230]">
          Create Your Account
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F3EF] to-white">
      {/* Header with White Opacity Background (no blur) */}
      <div className="relative">
        <div className="absolute inset-0 bg-white/80" />
        <div className="relative container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-10 w-10 text-[#006B3E]" />
                <h1 className="text-5xl font-extrabold text-[#3D2E17]">The Creator Lab</h1>
              </div>
              <p className="text-xl text-[#5D4E37] font-semibold mt-2">
                Design, Create, Earn — The Easy Way! 🎨💰
              </p>
              <p className="text-[#5D4E37] mt-2">
                Create stunning designs, add them to The Treehouse Store, and earn <strong>25% commission</strong> on every sale. 
                We handle printing, shipping, and customer service — you just create and get paid! 🌳✨
              </p>
            </div>
            <Card className="border-2 border-[#006B3E]">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-[#5D4E37] font-semibold">Your Credits</p>
                <p className="text-4xl font-extrabold text-[#006B3E]">{userCredits}</p>
                <Button 
                  size="sm" 
                  variant="link" 
                  className="text-[#006B3E] font-bold mt-2"
                  onClick={() => router.push('/dashboard/leaf/credits')}
                >
                  Top Up
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Category Filter Buttons */}
        <CategoryFilterButtons
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />

        {/* Dynamic ADD NEW Button */}
        {selectedCategory && (
          <div className="flex justify-center mb-6 sm:mb-8 px-4">
            <Button
              onClick={handleAddNew}
              size="lg"
              className="h-14 sm:h-20 px-6 sm:px-12 bg-[#006B3E] hover:bg-[#005230] text-white font-extrabold text-base sm:text-xl shadow-lg w-full max-w-md sm:w-auto"
            >
              <Wand2 className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3" />
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 mr-1 sm:mr-2" />
              <span className="truncate">ADD NEW</span>
            </Button>
          </div>
        )}

        {/* My Treehouse Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-[#3D2E17]">
              My Treehouse Products
            </CardTitle>
            <CardDescription className="text-[#5D4E37] font-semibold">
              {selectedCategory
                ? `${selectedCategory} products in your store`
                : 'All your published products'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-[#006B3E] mx-auto mb-4" />
                <p className="text-[#5D4E37] font-semibold">Loading your products...</p>
              </div>
            ) : myProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-[#5D4E37]/30 mx-auto mb-4" />
                <h3 className="text-xl font-extrabold text-[#3D2E17] mb-2">
                  No Products in Treehouse Store Yet
                </h3>
                <p className="text-[#5D4E37] font-semibold mb-6">
                  {selectedCategory
                    ? `Create your first ${selectedCategory} product using the button above!`
                    : 'Select a category and start creating to fill your store!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myProducts.map((product) => (
                  <Card key={product.id} className="border-2 border-[#5D4E37]/30 overflow-hidden">
                    <div className="relative aspect-square bg-black">
                      <Image
                        src={product.modelImageUrl || product.designImageUrl}
                        alt={product.apparelType || 'Product'}
                        fill
                        className="object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-[#006B3E]">
                        {product.category}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <p className="font-bold text-[#3D2E17]">
                        {product.apparelType || product.category}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-extrabold text-[#006B3E]">
                          R{product.price.toFixed(2)}
                        </span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          You earn R{calculateCommission(product.price)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-[#5D4E37]">
                        <p>Sales: {product.salesCount}</p>
                        <p>Revenue: R{product.totalRevenue.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ApparelSelector
        open={showApparelSelector}
        onOpenChange={setShowApparelSelector}
        onSelect={handleApparelSelect}
      />

      {showDesignStudio && selectedApparelType && (
        <DesignStudioModal
          apparelType={selectedApparelType}
          surface={selectedSurface}
          onComplete={handleDesignComplete}
          onCancel={() => setShowDesignStudio(false)}
        />
      )}

      {showModelShowcase && currentDesign && currentDesign.imageUrl && (
        <ModelShowcase
          open={showModelShowcase}
          onOpenChange={setShowModelShowcase}
          designId={currentDesign.id}
          designImageUrl={currentDesign.imageUrl}
          apparelType={selectedApparelType || ''}
          onComplete={handleModelComplete}
          userCredits={userCredits}
        />
      )}
    </div>
  );
}
