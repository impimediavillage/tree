
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import type { Product } from '@/types';
import { useDispensaryData } from '@/contexts/DispensaryDataContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, PackageSearch, Loader2, Search, FilterX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCard } from '@/components/dispensary-admin/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

const PRODUCTS_PER_PAGE = 24;

export default function WellnessProductsPage() {
  const { products: allProducts, isLoading, fetchDispensaryData } = useDispensaryData();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (allProducts.length > 0) {
      const uniqueCategories = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
      setCategories(['all', ...uniqueCategories.sort()]);
    }
  }, [allProducts]);
  
  const displayableProductVariants = useMemo(() => {
    return allProducts.flatMap(product => {
      if (product.priceTiers && product.priceTiers.length > 0) {
        return product.priceTiers.map((tier, index) => ({
          ...product,
          __variant_key__: `${product.id}-${tier.unit}-${index}`,
          priceTiers: [tier],
          quantityInStock: tier.quantityInStock ?? 0,
        }));
      }
      return [{ ...product, __variant_key__: product.id! }];
    });
  }, [allProducts]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...displayableProductVariants];

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
  }, [displayableProductVariants, searchTerm, selectedCategory]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);

  const handleDeleteProduct = async (productId: string, productName: string, imageUrls?: (string | null)[] | null) => {
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
      await fetchDispensaryData(); // Refetch all dispensary data
      
      if (paginatedProducts.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-full rounded-lg" />
          ))}
        </div>
      ) : paginatedProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 py-6">
            {paginatedProducts.map((productVariant) => (
              <ProductCard key={(productVariant as any).__variant_key__} product={productVariant as Product} onDelete={handleDeleteProduct} />
            ))}
          </div>
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
        </>
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
