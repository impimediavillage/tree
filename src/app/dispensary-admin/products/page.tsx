
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { db, storage } from '@/lib/firebase'; // Added storage
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage'; // Added for image deletion
import type { Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, PackageSearch, Loader2, Image as ImageIconLucide, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image'; // Next.js Image component

export default function DispensaryProductsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    if (!currentUser?.dispensaryId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const productsCollectionRef = collection(db, 'products');
      const q = query(
        productsCollectionRef,
        where('dispensaryId', '==', currentUser.dispensaryId),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      const fetchedProducts: Product[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Could not fetch your products.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.dispensaryId, toast]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchProducts();
    }
  }, [authLoading, currentUser, fetchProducts]);

  const handleDeleteProduct = async (productId: string, productName: string, imageUrl?: string | null) => {
    try {
      // Delete image from Firebase Storage if it exists
      if (imageUrl) {
        try {
            const imageStorageRef = storageRef(storage, imageUrl);
            await deleteObject(imageStorageRef);
            toast({ title: "Image Deleted", description: `Image for "${productName}" removed from storage.`, variant: "default" });
        } catch (error: any) {
            if (error.code === 'storage/object-not-found') {
                console.warn(`Image not found in storage for product "${productName}": ${imageUrl}. It might have been already deleted or path is incorrect.`);
            } else {
                console.error("Error deleting product image from storage:", error);
                toast({ title: "Image Deletion Failed", description: `Could not delete image for "${productName}". Product document deletion will still proceed.`, variant: "destructive" });
                // Optionally, decide if you want to proceed with Firestore deletion if image deletion fails
            }
        }
      }

      // Delete product document from Firestore
      await deleteDoc(doc(db, 'products', productId));
      toast({ title: "Product Deleted", description: `"${productName}" has been removed.`, variant: "default" });
      fetchProducts(); // Refresh list
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ title: "Deletion Failed", description: "Could not delete product document.", variant: "destructive" });
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "imageUrl",
      header: "Image",
      cell: ({ row }) => {
        const product = row.original;
        return product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} width={40} height={40} className="rounded object-cover h-10 w-10" data-ai-hint={`product ${product.name.split(" ")[0] || ""}`} />
        ) : (
          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs"><ImageIconLucide className="h-5 w-5" /></div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => `${row.original.price.toFixed(2)} ${row.original.currency}`,
    },
    {
      accessorKey: "quantityInStock",
      header: "Stock",
    },
    {
        accessorKey: "isAvailableForPool",
        header: "In Pool",
        cell: ({ row }) => (
            row.original.isAvailableForPool ? 
            <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-4 w-4"/> Yes</Badge> :
            <Badge variant="secondary"><XCircle className="mr-1 h-4 w-4"/> No</Badge>
        ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dispensary-admin/products/edit/${product.id}`}>
                <Edit className="mr-1 h-4 w-4" /> Edit
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the product &quot;{product.name}&quot; and its associated image from storage.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id!, product.name, product.imageUrl)}>
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your products...</p>
      </div>
    );
  }

  if (!currentUser?.dispensaryId) {
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
