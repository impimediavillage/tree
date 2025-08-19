
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import type { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, PackageSearch, Loader2, Search, FilterX, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCard } from '@/components/dispensary-admin/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const getProductCollectionName = (dispensaryType?: string | null): string => {
    if (!dispensaryType) return 'products'; 
    if (dispensaryType === "Homeopathic store") return 'homeopathy_store_products';
    if (dispensaryType === "Mushroom store") return 'mushroom_store_products';
    return dispensaryType.toLowerCase().replace(/[\s-&]+/g, '_') + '_products';
};

export default function WellnessProductsPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  const dispensaryId = currentUser?.dispensaryId;
  const productCollectionName = getProductCollectionName(currentDispensary?.dispensaryType);

  const fetchProducts = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
        const productsQuery = query(
            collection(db, productCollectionName),
            where('dispensaryId', '==', id),
            orderBy('name')
        );
        const productsSnapshot = await getDocs(productsQuery);
        const fetchedProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setAllProducts(fetchedProducts);

        if (fetchedProducts.length > 0) {
            const uniqueCategories = Array.from(new Set(fetchedProducts.map(p => p.category).filter(Boolean)));
            setCategories(['all', ...uniqueCategories.sort()]);
        } else {
            setCategories(['all']);
        }
    } catch (error: any) {
        console.error('Error fetching products:', error);
    } finally {
        setIsLoading(false);
    }
  }, [productCollectionName]);

  useEffect(() => {
    if (!authLoading && dispensaryId) {
      fetchProducts(dispensaryId);
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, dispensaryId, fetchProducts]);
  
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


  const handleDeleteProduct = async (productId: string, productName: string, imageUrls?: (string | null)[] | null) => {
    if (!dispensaryId) return;
    try {
      if (imageUrls && imageUrls.length > 0) {
        const deletePromises = imageUrls.map(url => {
          if (url && url.startsWith('https://firebasestorage.googleapis.com')) {
            const imageStorageRef = storageRef(storage, url);
            return deleteObject(imageStorageRef).catch(error => {
              if (error.code !== 'storage/object-not-found') {
                console.warn(`Failed to delete image ${url}:`, error);
              }
            });
          }
          return Promise.resolve();
        });
        await Promise.all(deletePromises);
      }
      
      await deleteDoc(doc(db, productCollectionName, productId));
      toast({ title: "Product Deleted", description: `"${productName}" has been removed.` });
      fetchProducts(dispensaryId);
      
    } catch (error) {
      console.error("Error deleting product document:", error);
      toast({ title: "Deletion Failed", description: "Could not delete product.", variant: "destructive" });
    }
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const addProductPath = '/dispensary-admin/products/add';


  if (isLoading) {
    return (
       <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-1/2 space-y-2"><Skeleton className="h-9 w-1/2" /><Skeleton className="h-5 w-3/4" /></div>
            <Skeleton className="h-10 w-full sm:w-44" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[420px] w-full rounded-lg" />
            ))}
        </div>
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
          <Link href={addProductPath}>
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
        {(searchTerm || selectedCategory !== 'all') && (
             <Button variant="ghost" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive">
                <FilterX className="mr-2 h-4 w-4"/> Clear Filters
            </Button>
        )}
      </div>
      
      {filteredAndSortedProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
          {filteredAndSortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} onDelete={handleDeleteProduct} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 col-span-full">
          <PackageSearch className="mx-auto h-16 w-16 text-orange-500" />
          <h3 
            className="mt-4 text-xl font-semibold text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            No Products Found
          </h3>
          <p 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {allProducts.length === 0 ? "You haven't added any products yet." : "No products match your current filters."}
          </p>
        </div>
      )}
    </div>
  );
}
