
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MushroomProductCardProps {
  product: any;
  onSelect: (product: any) => void;
}

export function MushroomProductCard({ product, onSelect }: MushroomProductCardProps) {
  const placeholderImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(product.name)}`;
  const imageUrl = product.imageUrl || placeholderImage;
  
  return (
    <Card className="w-64 flex-shrink-0 snap-start flex flex-col shadow-lg">
        <CardHeader className="p-0">
            <div className="relative aspect-square w-full">
                <Image
                src={imageUrl}
                alt={product.name}
                layout="fill"
                objectFit="cover"
                className="rounded-t-lg"
                data-ai-hint={`mushroom ${product.name}`}
                />
            </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow flex flex-col">
            <CardTitle className="text-lg font-semibold truncate" title={product.name}>{product.name}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2 h-10">{product.description}</CardDescription>
            
            {Array.isArray(product.benefits) && product.benefits.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-2">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-sm font-medium">View Benefits</AccordionTrigger>
                        <AccordionContent>
                            <ul className="space-y-1.5 text-sm text-muted-foreground">
                                {product.benefits.map((benefit: string, index: number) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
            <Button className="w-full" onClick={() => onSelect(product)}>Use this Product</Button>
        </CardFooter>
    </Card>
  );
}
