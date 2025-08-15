'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { db, storage, functions } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
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

const getDispensaryProductsCallable = httpsCallable(functions, 'getDispensaryProducts');

export default function WellnessProductsPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  
  const dispensaryId = currentUser?.dispensaryId;

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
        const result = await getDispensaryProductsCallable();
        const fetchedProducts = result.data as Product[];
        setAllProducts(fetchedProducts);

        if (fetchedProducts.length > 0) {
            const uniqueCategories = Array.from(new Set(fetchedProducts.map(p => p.category).filter(Boolean)));
            setCategories(['all', ...uniqueCategories.sort()]);
        } else {
            setCategories(['all']);
        }
    } catch (error: any) {
        console.error('Error fetching products:', error);
        toast({ title: 'Error', description: `Could not fetch your products: ${error.message}`, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && dispensaryId) {
      fetchProducts();
    } else if (!authLoading) {
      // This case handles when a user is loaded but has no dispensaryId
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
      
      await deleteDoc(doc(db, 'products', productId));
      toast({ title: "Product Deleted", description: `"${productName}" has been removed.` });
      fetchProducts();
      
    } catch (error) {
      console.error("Error deleting product document:", error);
      toast({ title: "Deletion Failed", description: "Could not delete product.", variant: "destructive" });
    }
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const addProductPath = currentDispensary?.dispensaryType === 'Cannibinoid store'
    ? '/dispensary-admin/products/add/thc'
    : '/dispensary-admin/products/add';


  if (isLoading) {
    return (
       <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-1/2 space-y-2"><Skeleton className="h-9 w-1/2" /><Skeleton className="h-5 w-3/4" /></div>
            <Skeleton className="h-10 w-full sm:w-44" />
        </div>
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
            {Array.from({ length: 8 }).map((_, i) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
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
            className="mt-2 text-sm text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            {allProducts.length === 0 ? "You haven't added any products yet." : "No products match your current filters."}
          </p>
        </div>
      )}
    </div>
  );
}
