
'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import type { Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { ArrowUpDown, CheckCircle, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

export default function AdminProductPoolPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const productsCollectionRef = collection(db, 'products');
      // Consider adding filters or pagination for large datasets
      const q = query(productsCollectionRef, orderBy('dispensaryName'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const fetchedProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        fetchedProducts.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Could not fetch products for the pool.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleTogglePoolAvailability = async (product: Product, available: boolean) => {
    if (!product.id) return;
    try {
      const productDocRef = doc(db, 'products', product.id);
      await updateDoc(productDocRef, { isAvailableForPool: available });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAvailableForPool: available } : p));
      toast({ title: "Success", description: `${product.name} pool availability updated.` });
    } catch (error) {
      console.error("Error updating product pool availability:", error);
      toast({ title: "Error", description: "Could not update product status.", variant: "destructive" });
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
        accessorKey: "imageUrl",
        header: "Image",
        cell: ({ row }) => {
            const imageUrl = row.original.imageUrl;
            const productName = row.original.name;
            return imageUrl ? (
                <Image 
                    src={imageUrl} 
                    alt={productName} 
                    width={40} 
                    height={40} 
                    className="rounded object-cover h-10 w-10" 
                    data-ai-hint={`product ${productName.split(" ")[0] || ""}`}
                />
            ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">No Img</div>
            );
        },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Product Name <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
    },
    {
      accessorKey: "dispensaryName",
      header: "Dispensary",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "price",
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Price <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => `${row.original.price.toFixed(2)} ${row.original.currency}`,
    },
    {
      accessorKey: "quantityInStock",
      header: "Stock",
    },
    {
      accessorKey: "isAvailableForPool",
      header: "In Pool?",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
            <Switch
                id={`pool-switch-${row.original.id}`}
                checked={row.original.isAvailableForPool}
                onCheckedChange={(value) => handleTogglePoolAvailability(row.original, value)}
                aria-label="Toggle pool availability"
            />
            {row.original.isAvailableForPool ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
        </div>
      ),
    },
    // Add more columns as needed, e.g., actions like 'View Details'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Product Pool Administration</h1>
        <p className="text-muted-foreground">Oversee all products and manage their availability in the sharing pool.</p>
      </div>
      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        searchColumn="name"
        searchPlaceholder="Filter by product name..."
      />
    </div>
  );
}

    