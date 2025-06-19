
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Package, DollarSign, CheckCircle, XCircle, ImageIcon as ImageIconLucide } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onDelete: (productId: string, productName: string, imageUrl?: string | null) => Promise<void>;
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const firstPriceTier = product.priceTiers && product.priceTiers.length > 0 ? product.priceTiers[0] : null;
  const dataAiHintProduct = `product ${product.category} ${product.name.split(" ")[0] || ""}`;

  return (
    <Card 
      className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 h-full bg-card text-card-foreground group border border-border hover:border-primary/40 animate-fade-in-scale-up"
      style={{ animationFillMode: 'backwards' }}
      data-ai-hint={dataAiHintProduct}
    >
      <div className="relative w-full h-48 sm:h-52 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={`product image ${product.name.split(" ")[0] || ""}`}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIconLucide className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
         <Badge 
            variant={product.isAvailableForPool ? "default" : "secondary"} 
            className={`absolute top-2 right-2 text-xs px-2 py-1 shadow-md ${product.isAvailableForPool ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-slate-500 hover:bg-slate-600 text-white'}`}
          >
            {product.isAvailableForPool ? <CheckCircle className="mr-1 h-3 w-3"/> : <XCircle className="mr-1 h-3 w-3"/>}
            {product.isAvailableForPool ? 'In Pool' : 'Not In Pool'}
          </Badge>
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg font-semibold truncate text-primary" title={product.name}>
          {product.name}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5"/> 
          <span className="truncate" title={product.category}>{product.category}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2.5 py-2 text-sm">
        <p className="text-muted-foreground line-clamp-2 leading-relaxed h-10" title={product.description}>
          {product.description}
        </p>
        {firstPriceTier && (
          <div className="flex items-center gap-1.5 text-foreground font-medium">
            <DollarSign className="h-4 w-4 text-accent" />
            <span>{firstPriceTier.price.toFixed(2)} {product.currency}</span>
            <span className="text-muted-foreground">/ {firstPriceTier.unit}</span>
          </div>
        )}
         <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Stock:</span>
            <span className={`font-semibold ${product.quantityInStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.quantityInStock}
            </span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 border-t pt-3 mt-auto">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <Link href={`/dispensary-admin/products/edit/${product.id}`}>
            <Edit className="mr-1.5 h-4 w-4" /> Edit
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="flex-1">
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
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
              <AlertDialogAction onClick={() => onDelete(product.id!, product.name, product.imageUrl)}>
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
