
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
        header: () => <span className="font-bold text-[#3D2E17]">Image</span>,
        cell: ({ row }) => {
            const imageUrl = row.original.imageUrl;
            const productName = row.original.name;
            return imageUrl ? (
                <Image 
                    src={imageUrl} 
                    alt={productName} 
                    width={50} 
                    height={50} 
                    className="rounded object-cover h-12 w-12" 
                    data-ai-hint={`product ${productName.split(" ")[0] || ""}`}
                />
            ) : (
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">No Img</div>
            );
        },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <Button variant="ghost" className="font-bold text-[#3D2E17]" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Product Name <ArrowUpDown className="ml-2 h-5 w-5 text-[#006B3E]" /></Button>,
      cell: ({ row }) => <span className="font-semibold text-[#3D2E17]">{row.original.name}</span>,
    },
    {
      accessorKey: "dispensaryName",
      header: () => <span className="font-bold text-[#3D2E17]">Store Name</span>,
      cell: ({ row }) => <span className="font-semibold text-[#5D4E37]">{row.original.dispensaryName}</span>,
    },
    {
      accessorKey: "category",
      header: () => <span className="font-bold text-[#3D2E17]">Category</span>,
      cell: ({ row }) => <span className="font-semibold text-[#5D4E37]">{row.original.category}</span>,
    },
    {
      accessorKey: "priceTiers",
      header: ({ column }) => <Button variant="ghost" className="font-bold text-[#3D2E17]" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Price <ArrowUpDown className="ml-2 h-5 w-5 text-[#006B3E]" /></Button>,
      cell: ({ row }) => {
        const tier = row.original.priceTiers?.[0];
        return <span className="font-bold text-[#006B3E]">{tier ? `${tier.price.toFixed(2)} ${row.original.currency}` : 'N/A'}</span>;
      },
    },
    {
      accessorKey: "quantityInStock",
      header: () => <span className="font-bold text-[#3D2E17]">Stock</span>,
      cell: ({ row }) => <span className="font-semibold text-[#5D4E37]">{row.original.quantityInStock}</span>,
    },
    {
      accessorKey: "isAvailableForPool",
      header: () => <span className="font-bold text-[#3D2E17]">In Pool?</span>,
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
            <Switch
                id={`pool-switch-${row.original.id}`}
                checked={row.original.isAvailableForPool}
                onCheckedChange={(value) => handleTogglePoolAvailability(row.original, value)}
                aria-label="Toggle pool availability"
            />
            {row.original.isAvailableForPool ? <CheckCircle className="h-6 w-6 text-[#006B3E]" /> : <XCircle className="h-6 w-6 text-red-600" />}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 bg-muted/50 border-border/50 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="h-14 w-14 text-[#006B3E]" />
          <h1 className="text-4xl font-extrabold text-[#3D2E17]">
            Product Pool Administration
          </h1>
        </div>
        <p className="text-lg font-bold text-[#5D4E37]">
          Oversee all products and manage their availability in the sharing pool.
        </p>
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
