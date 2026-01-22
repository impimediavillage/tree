'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Wand2, Plus, Loader2, AlertTriangle, Package, Edit, Trash2, Power, PowerOff, Store, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CategoryFilterButtons } from '@/components/creator-lab/CategoryFilterButtons';
import { ApparelSelector } from '@/components/creator-lab/ApparelSelector';
import { DesignStudioModal } from '@/components/creator-lab/DesignStudioModal';
import { ModelShowcase } from '@/components/creator-lab/ModelShowcase';
import { ProductEditModal } from '@/components/creator-lab/ProductEditModal';
import { ProductDetailsModal } from '@/components/creator-lab/ProductDetailsModal';
import { CreatorStoreSetupModal } from '@/components/creator-lab/CreatorStoreSetupModal';
import type { CreatorDesign, ProductCategory, ApparelType, TreehouseProduct } from '@/types/creator-lab';
import type { CreatorStore } from '@/types/creator-store';
import { APPAREL_PRICES } from '@/types/creator-lab';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
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
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [tempModelData, setTempModelData] = useState<{ modelImageUrl: string; modelPrompt: string } | null>(null);
  
  const [myProducts, setMyProducts] = useState<TreehouseProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<TreehouseProduct | null>(null);

  // Creator Store
  const [userStore, setUserStore] = useState<CreatorStore | null>(null);
  const [showStoreSetup, setShowStoreSetup] = useState(false);
  const [checkingStore, setCheckingStore] = useState(true);

  // Confirmation dialogs
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<TreehouseProduct | null>(null);
  const [toggleConfirmProduct, setToggleConfirmProduct] = useState<TreehouseProduct | null>(null);

  const canAccessCreatorLab = isLeafUser || isDispensaryOwner || isDispensaryStaff;
  const userCredits = currentUser?.credits || 0;

  // Check if user has a creator store
  useEffect(() => {
    const checkUserStore = async () => {
      if (!currentUser?.uid) return;
      
      setCheckingStore(true);
      try {
        const storesRef = collection(db, 'creator_stores');
        const q = query(storesRef, where('ownerId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const storeData = snapshot.docs[0].data() as CreatorStore;
          setUserStore({ ...storeData, id: snapshot.docs[0].id });
        }
      } catch (error) {
        console.error('Error checking store:', error);
      } finally {
        setCheckingStore(false);
      }
    };

    checkUserStore();
  }, [currentUser]);

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
    // Check if user has a store first
    if (!userStore) {
      setShowStoreSetup(true);
      return;
    }

    if (selectedCategory === 'Apparel') {
      setShowApparelSelector(true);
    } else {
      toast({
        title: 'Coming Soon! 🎨',
        description: `${selectedCategory} creation tools are under development.`,
      });
    }
  };

  const handleStoreCreated = (store: CreatorStore) => {
    setUserStore(store);
    toast({
      title: '🎉 Store Created!',
      description: 'You can now start creating products!',
    });
    // Continue with product creation
    if (selectedCategory === 'Apparel') {
      setShowApparelSelector(true);
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
    // Store model data temporarily and show product details modal
    setTempModelData({ modelImageUrl, modelPrompt });
    setShowModelShowcase(false);
    setShowProductDetails(true);
  };

  const handleProductDetailsComplete = async (productName: string, productDescription: string, creatorName: string) => {
    // Publish product to Treehouse using Firebase Function
    try {
      const publishProduct = httpsCallable(functions, 'publishCreatorProduct');
      
      const productData: any = {
        designId: currentDesign?.id,
        productName,
        productDescription,
        creatorName,
        category: selectedCategory,
        apparelType: selectedApparelType,
        surface: selectedSurface,
        modelImageUrl: tempModelData?.modelImageUrl || undefined,
        modelPrompt: tempModelData?.modelPrompt || undefined,
      };

      // Note: Dispensary fields are automatically populated by the Firebase Function
      // based on the authenticated user's data. This works for:
      // - LeafUser: No dispensary fields (independent creator)
      // - DispensaryOwner: Includes dispensaryId, dispensaryName, dispensaryType
      // - DispensaryStaff: Includes dispensaryId, dispensaryName, dispensaryType

      const result = await publishProduct(productData);

      const data = result.data as { productId: string; success: boolean };

      if (!data.success) {
        throw new Error('Failed to publish product');
      }

      toast({
        title: '🎉 Product Published!',
        description: `"${productName}" is now live in The Treehouse Store!`,
      });

      setShowProductDetails(false);
      loadMyProducts(); // Refresh products list

      // Reset state
      setCurrentDesign(null);
      setSelectedApparelType(null);
      setSelectedSurface(undefined);
      setTempModelData(null);
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

  const handleToggleStatus = async (productId: string) => {
    try {
      const toggleStatus = httpsCallable(functions, 'toggleProductStatus');
      const result = await toggleStatus({ productId });
      const data = result.data as { success: boolean; isActive: boolean };

      toast({
        title: 'Status Updated',
        description: data.isActive ? 'Product is now active' : 'Product is now inactive',
      });

      setToggleConfirmProduct(null);
      loadMyProducts();
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const deleteProduct = httpsCallable(functions, 'deleteTreehouseProduct');
      await deleteProduct({ productId });

      toast({
        title: 'Product Deleted',
        description: 'Product removed from Treehouse',
      });

      setDeleteConfirmProduct(null);
      loadMyProducts();
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      });
    }
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
    <div className="min-h-screen bg-gradient-to-b from-[#F5F3EF] to-white" data-tour="creator-lab-nav">
      {/* Header with White Opacity Background (no blur) */}
      <div className="relative">
        <div className="absolute inset-0 bg-white/80" />
        <div className="relative container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-[#006B3E]" />
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#3D2E17]">The Creator Lab</h1>
              </div>
              <p className="text-lg md:text-xl text-[#5D4E37] font-semibold mt-2">
                Design, Create, Earn — The Easy Way! 🎨💰
              </p>
              <p className="text-sm md:text-base text-[#5D4E37] mt-2">
                Create stunning designs, add them to The Treehouse Store, and earn <strong>25% commission</strong> on every sale. 
                We handle printing, shipping, and customer service — you just create and get paid! 🌳✨
              </p>
              {userStore && (
                <div className="mt-3 flex items-center gap-2 text-sm md:text-base">
                  <Store className="h-5 w-5 text-[#006B3E]" />
                  <span className="text-[#3D2E17] font-bold">Your Store:</span>
                  <span className="text-[#006B3E] font-semibold">{userStore.storeName}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {userStore && (
                <Button
                  size="lg"
                  onClick={() => router.push('/dashboard/creator-lab/analytics')}
                  className="bg-gradient-to-r from-[#006B3E] to-[#008B4E] hover:from-[#005230] hover:to-[#006B3E] text-white font-bold shadow-lg"
                >
                  <BarChart3 className="h-5 w-5 mr-2" />
                  View Analytics
                </Button>
              )}
              <Card className="border-2 border-[#006B3E] w-full sm:w-auto">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-[#5D4E37] font-semibold">Your Credits</p>
                  <p className="text-4xl font-extrabold text-[#006B3E]">{userCredits}</p>
                  <Button 
                    size="sm" 
                    variant="link" 
                    className="text-[#006B3E] font-bold mt-2"
                    onClick={() => {
                      const creditsRoute = currentUser?.role === 'DispensaryOwner' 
                        ? '/dispensary-admin/credits' 
                        : '/dashboard/leaf/credits';
                      router.push(creditsRoute);
                    }}
                  >
                    Top Up
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Category Filter Buttons */}
        <CategoryFilterButtons
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          data-tour="apparel-types"
        />

        {/* Dynamic ADD NEW Button */}
        {selectedCategory && (
          <div className="flex justify-center mb-6 md:mb-8">
            <Button
              onClick={handleAddNew}
              size="lg"
              className="h-16 md:h-20 px-8 md:px-12 bg-[#006B3E] hover:bg-[#005230] text-white font-extrabold text-lg md:text-xl shadow-lg w-full sm:w-auto"
              data-tour="customize-design"
            >
              <Wand2 className="h-6 w-6 md:h-8 md:w-8 mr-2 md:mr-3" />
              <Plus className="h-6 w-6 md:h-8 md:w-8 mr-1 md:mr-2" />
              ADD NEW
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-tour="design-gallery">
                {myProducts.map((product) => (
                  <Card key={product.id} className="border-2 border-[#5D4E37]/30 overflow-hidden">
                    {/* Image Section - Show both design and model if available */}
                    {product.modelImageUrl && product.designImageUrl ? (
                      // Both images available - split view
                      <div className="relative aspect-square bg-black grid grid-cols-2 gap-px">
                        <div className="relative">
                          <Image
                            src={product.designImageUrl}
                            alt="Design"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                            Design
                          </div>
                        </div>
                        <div className="relative">
                          <Image
                            src={product.modelImageUrl}
                            alt="Model"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                            Model
                          </div>
                        </div>
                        <Badge className="absolute top-2 left-2 bg-[#006B3E]">
                          {product.category}
                        </Badge>
                        <Badge className={`absolute top-2 right-2 ${product.isActive ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ) : (
                      // Single image view
                      <div className="relative aspect-square bg-black">
                        {(product.modelImageUrl || product.designImageUrl) && (
                          <Image
                            src={product.modelImageUrl || product.designImageUrl}
                            alt={product.apparelType || 'Product'}
                            fill
                            className="object-cover"
                          />
                        )}
                        <Badge className="absolute top-2 left-2 bg-[#006B3E]">
                          {product.category}
                        </Badge>
                        <Badge className={`absolute top-2 right-2 ${product.isActive ? 'bg-green-500' : 'bg-gray-500'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    )}
                    
                    <CardContent className="p-4 space-y-3">
                      <p className="font-bold text-[#3D2E17]">
                        {product.apparelType || product.category}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-extrabold text-[#006B3E]">
                          R{(product.price || 0).toFixed(2)}
                        </span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          You earn R{calculateCommission(product.price || 0)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-[#5D4E37]">
                        <p>Sales: {product.salesCount || 0}</p>
                        <p>Revenue: R{(product.totalRevenue || 0).toFixed(2)}</p>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0 flex gap-3">
                      <Button 
                        onClick={() => setToggleConfirmProduct(product)} 
                        size="sm" 
                        variant={product.isActive ? 'outline' : 'default'}
                        className="w-10 h-10 p-0 flex items-center justify-center"
                        title={product.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {product.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button 
                        onClick={() => setEditingProduct(product)} 
                        size="sm" 
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        onClick={() => setDeleteConfirmProduct(product)} 
                        size="sm" 
                        variant="destructive"
                        className="flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </CardFooter>
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

      {showModelShowcase && currentDesign && (
        <ModelShowcase
          open={showModelShowcase}
          onOpenChange={setShowModelShowcase}
          designId={currentDesign.id || ''}
          designImageUrl={currentDesign.designImageUrl || currentDesign.imageUrl || ''}
          apparelType={selectedApparelType || ''}
          onComplete={handleModelComplete}
          userCredits={userCredits}
        />
      )}

      {/* Product Details Modal */}
      {showProductDetails && (
        <ProductDetailsModal
          open={showProductDetails}
          onOpenChange={setShowProductDetails}
          apparelType={selectedApparelType || 'Product'}
          defaultName={`Custom ${selectedApparelType}`}
          defaultDescription={currentDesign?.prompt || ''}
          defaultCreatorName={userStore?.creatorNickname || currentUser?.displayName || ''}
          onComplete={handleProductDetailsComplete}
        />
      )}

      {/* Creator Store Setup Modal */}
      {showStoreSetup && (
        <CreatorStoreSetupModal
          open={showStoreSetup}
          onOpenChange={setShowStoreSetup}
          onStoreCreated={handleStoreCreated}
        />
      )}

      {/* Product Edit Modal */}
      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdate={loadMyProducts}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmProduct} onOpenChange={(open) => !open && setDeleteConfirmProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Product?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete <strong>{deleteConfirmProduct?.productName || deleteConfirmProduct?.apparelType}</strong>?
              <br />
              <br />
              This action cannot be undone. The product will be permanently removed from The Treehouse Store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmProduct && handleDelete(deleteConfirmProduct.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Confirmation Dialog */}
      <AlertDialog open={!!toggleConfirmProduct} onOpenChange={(open) => !open && setToggleConfirmProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {toggleConfirmProduct?.isActive ? (
                <>
                  <PowerOff className="h-5 w-5 text-amber-600" />
                  Deactivate Product?
                </>
              ) : (
                <>
                  <Power className="h-5 w-5 text-green-600" />
                  Activate Product?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {toggleConfirmProduct?.isActive ? (
                <>
                  Deactivating <strong>{toggleConfirmProduct?.productName || toggleConfirmProduct?.apparelType}</strong> will hide it from The Treehouse Store.
                  <br />
                  <br />
                  You can reactivate it anytime.
                </>
              ) : (
                <>
                  Activating <strong>{toggleConfirmProduct?.productName || toggleConfirmProduct?.apparelType}</strong> will make it visible in The Treehouse Store.
                  <br />
                  <br />
                  Customers will be able to purchase this product.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleConfirmProduct && handleToggleStatus(toggleConfirmProduct.id)}
              className={toggleConfirmProduct?.isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {toggleConfirmProduct?.isActive ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
