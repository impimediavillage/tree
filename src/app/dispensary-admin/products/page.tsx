
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import type { Product, Dispensary } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, PackageSearch, Loader2, Search, FilterX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCard } from '@/components/dispensary-admin/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

const PRODUCTS_PER_PAGE = 24;
const THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME = "THC - CBD - Mushrooms wellness";

export default function WellnessProductsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentDispensaryType, setCurrentDispensaryType] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchWellnessTypeAndProducts = useCallback(async () => {
    if (!currentUser?.dispensaryId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch wellness store type
      const dispensaryDocRef = doc(db, 'dispensaries', currentUser.dispensaryId);
      const dispensarySnap = await getDoc(dispensaryDocRef);
      if (dispensarySnap.exists()) {
        const dispensaryData = dispensarySnap.data() as Dispensary;
        setCurrentDispensaryType(dispensaryData.dispensaryType);
      } else {
        toast({ title: "Error", description: "Your wellness store details could not be found.", variant: "destructive" });
      }

      // Fetch products
      const productsCollectionRef = collection(db, 'products');
      const q = query(
        productsCollectionRef,
        where('dispensaryId', '==', currentUser.dispensaryId),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      const fetchedProducts: Product[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setAllProducts(fetchedProducts);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Could not fetch your products or wellness store type.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.dispensaryId, toast]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchWellnessTypeAndProducts();
    }
  }, [authLoading, currentUser, fetchWellnessTypeAndProducts]);

  const categoryFilterOptions = useMemo(() => {
    if (currentDispensaryType === THC_CBD_MUSHROOM_WELLNESS_TYPE_NAME) {
      return ['all', 'THC', 'CBD', 'Apparel', 'Smoking Gear'];
    }
    const uniqueCategories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
    return ['all', ...uniqueCategories.sort()];
  }, [allProducts, currentDispensaryType]);


  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...allProducts];

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
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, searchTerm, selectedCategory]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);

  const handleDeleteProduct = async (productId: string, productName: string, imageUrl?: string | null) => {
    try {
      if (imageUrl && imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        try {
          const imageStorageRef = storageRef(storage, imageUrl);
          await deleteObject(imageStorageRef);
        } catch (storageError: any) {
          if (storageError.code !== 'storage/object-not-found') {
            console.error("Error deleting product image from storage:", storageError);
            toast({ title: "Image Deletion Failed", description: `Could not delete image for "${productName}". Product document deletion will proceed.`, variant: "destructive" });
          } else {
            console.warn(`Image not found in storage for product "${productName}": ${imageUrl}`);
          }
        }
      }
      await deleteDoc(doc(db, 'products', productId));
      toast({ title: "Product Deleted", description: `"${productName}" has been removed.` });
      setAllProducts(prev => prev.filter(p => p.id !== productId));
      if (currentPage > 1 && paginatedProducts.length === 1 && filteredAndSortedProducts.length > PRODUCTS_PER_PAGE) {
        setCurrentPage(prev => Math.max(1, prev -1));
      } else if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      } else if (filteredAndSortedProducts.length <= (currentPage - 1) * PRODUCTS_PER_PAGE && currentPage > 1) {
         setCurrentPage(prev => Math.max(1, prev -1));
      }

    } catch (error) {
      console.error("Error deleting product document:", error);
      toast({ title: "Deletion Failed", description: "Could not delete product.", variant: "destructive" });
    }
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setCurrentPage(1);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser?.dispensaryId && !isLoading) {
     return (
      <div className="text-center py-10">
        <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-xl font-semibold">No Wellness Store Linked</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is not linked to a wellness store. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 
            className="text-3xl font-bold text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            My Products
          </h1>
          <p 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Manage all products for your wellness store.
          </p>
        </div>
        <Button asChild>
          <Link href="/dispensary-admin/products/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Search by name, description, category, tag..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
                className="pl-10 w-full"
            />
        </div>
        <Select value={selectedCategory} onValueChange={(value) => {setSelectedCategory(value); setCurrentPage(1);}}>
            <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
                {categoryFilterOptions.map(category => (
                    <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
        {(searchTerm || selectedCategory !== 'all') && (
             <Button variant="ghost" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive">
                <FilterX className="mr-2 h-4 w-4"/> Clear Filters
            </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
          {Array.from({ length: PRODUCTS_PER_PAGE / 2 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-lg" />
          ))}
        </div>
      ) : paginatedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
          {paginatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} onDelete={handleDeleteProduct} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 col-span-full">
          <PackageSearch className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold text-foreground">No Products Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {allProducts.length === 0 ? "You haven't added any products yet." : "No products match your current filters."}
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
