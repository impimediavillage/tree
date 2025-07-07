
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product, ProductAttribute } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Package, CheckCircle, XCircle, ImageIcon as ImageIconLucide, ChevronLeft, ChevronRight, Sparkles, Brain, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onDelete: (productId: string, productName: string, imageUrls?: (string | null)[] | null) => Promise<void>;
}

// New component for displaying info in a dialog
const InfoDialog = ({ triggerText, title, items, itemType, icon: Icon }: { triggerText: string; title: string; items: (string | ProductAttribute)[]; itemType: 'flavor' | 'effect' | 'medical'; icon: React.ElementType }) => {
  if (!items || items.length === 0) return null;

  const badgeColors = {
    flavor: [
      "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800",
      "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800",
      "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800"
    ],
    effect: [
      "bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800",
      "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800",
      "bg-red-100 text-red-800", "bg-orange-100 text-orange-800"
    ],
    medical: [
      "bg-green-100 text-green-800", "bg-teal-100 text-teal-800",
      "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800",
      "bg-stone-200 text-stone-800", "bg-gray-200 text-gray-800"
    ]
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-7 px-2">
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-start gap-2 py-4">
            <div className="flex flex-wrap gap-2">
                {items.map((item, index) => {
                    const isAttribute = typeof item === 'object' && 'name' in item;
                    const name = isAttribute ? item.name : item;
                    const percentage = isAttribute ? (item as ProductAttribute).percentage : null;

                    return (
                    <Badge key={index} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors[itemType][index % badgeColors[itemType].length])}>
                        {name} {percentage && <span className="ml-1.5 font-semibold">({percentage})</span>}
                    </Badge>
                    );
                })}
            </div>
            {(itemType === 'effect' || itemType === 'medical') && (
                <div className="p-2 mt-4 rounded-md border border-dashed bg-muted/50 text-xs w-full">
                    <p className="font-semibold text-muted-foreground mb-1.5">Percentage Key:</p>
                    <p className="text-muted-foreground leading-snug">
                        Indicates the reported likelihood of an effect or its potential as a medical aid.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
                        <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
                        <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function ProductCard({ product, onDelete }: ProductCardProps) {
  const [isViewerOpen, setIsViewerOpen] = React.useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState(0);

  const firstPriceTier = product.priceTiers && product.priceTiers.length > 0 ? product.priceTiers[0] : null;
  const tierUnit = firstPriceTier?.unit;
  const dataAiHintProduct = `product ${product.category} ${product.name.split(" ")[0] || ""}`;
  
  const images = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []);

  const openViewer = (index: number) => {
    setSelectedImageIndex(index);
    setIsViewerOpen(true);
  };
  
  const gridColsClass = images.length > 1 ? 'grid-cols-2' : 'grid-cols-1';
  const gridRowsClass = images.length > 2 ? 'grid-rows-2' : 'grid-rows-1';

  return (
    <>
      <Card 
        className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 h-full bg-card text-card-foreground group border border-border hover:border-primary/40 animate-fade-in-scale-up"
        style={{ animationFillMode: 'backwards' }}
        data-ai-hint={dataAiHintProduct}
      >
        <div className="relative w-full h-48 sm:h-52 overflow-hidden bg-muted group">
          {images.length > 0 ? (
            <div className={cn('grid h-full w-full gap-0.5', gridColsClass, gridRowsClass)}>
              {images.slice(0, 4).map((url, i) => (
                <div
                  key={url ? `${url}-${i}`: i}
                  className={cn(
                    'relative cursor-pointer overflow-hidden',
                    images.length === 3 && i === 2 && 'col-span-2',
                    images.length === 1 && 'col-span-2 row-span-2'
                  )}
                  onClick={() => openViewer(i)}
                >
                  {url && (
                    <Image
                      src={url}
                      alt={`${product.name} image ${i + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={`product image ${product.name}`}
                    />
                  )}
                  {images.length > 4 && i === 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="text-white text-2xl font-bold">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIconLucide className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          <Badge 
              variant={product.isAvailableForPool ? "default" : "secondary"} 
              className={`absolute top-2 right-2 z-10 text-xs px-2 py-1 shadow-md ${product.isAvailableForPool ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-slate-500 hover:bg-slate-600 text-white'}`}
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
            <div className="flex items-baseline gap-1.5 text-foreground">
              <span className="font-medium text-muted-foreground">{product.currency}</span>
              <span className="text-xl font-bold text-green-600">{firstPriceTier.price.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">/ {firstPriceTier.unit}</span>
            </div>
          )}
           <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Stock:</span>
              <span className={`font-semibold ${product.quantityInStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {product.quantityInStock}
              </span>
          </div>
           <div className="flex flex-wrap gap-2 pt-2">
            <InfoDialog title={`Effects of ${product.name}`} triggerText="Effects" items={product.effects || []} itemType="effect" icon={Sparkles} />
            <InfoDialog title={`Flavors in ${product.name}`} triggerText="Flavors" items={product.flavors || []} itemType="flavor" icon={Leaf} />
            <InfoDialog title={`Potential Medical Uses of ${product.name}`} triggerText="Medical Uses" items={product.medicalUses || []} itemType="medical" icon={Brain} />
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 border-t pt-3 mt-auto">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dispensary-admin/products/edit/${product.id}${tierUnit ? `?unit=${encodeURIComponent(tierUnit)}` : ''}`}>
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
                  This action cannot be undone. This will permanently delete the product &quot;{product.name}&quot; and its associated images from storage.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(product.id!, product.name, product.imageUrls)}>
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl p-2 sm:p-4">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            <DialogDescription>
              Image {selectedImageIndex + 1} of {images.length}
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video w-full">
            {images[selectedImageIndex] && (
              <Image
                src={images[selectedImageIndex]!}
                alt={`${product.name} image ${selectedImageIndex + 1}`}
                fill
                className="object-contain rounded-md"
                data-ai-hint={`product fullscreen ${product.name}`}
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 overflow-x-auto p-1">
                {images.map((url, i) => (
                  url && (
                    <button
                      key={url}
                      className={cn(
                        "h-16 w-16 rounded-md border-2 flex-shrink-0",
                        i === selectedImageIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      onClick={() => setSelectedImageIndex(i)}
                    >
                      <div className="relative h-full w-full rounded overflow-hidden">
                        <Image src={url} alt={`Thumbnail ${i+1}`} fill className="object-cover"/>
                      </div>
                    </button>
                  )
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedImageIndex((prev) => (prev + 1) % images.length)}
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
