
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface MushroomProductCardProps {
  product: any;
  onSelect: (product: any, format: string) => void;
}

const InfoBadge = ({ label, value, unit, className }: { label: string, value: string | number, unit: string, className?: string }) => (
    <div className={cn("flex items-center justify-between text-xs border rounded-full px-2.5 py-1", className)}>
        <span className="font-medium mr-1.5">{label}</span>
        <span className="font-bold text-lg text-green-600">{value}</span>
        <span className="text-muted-foreground ml-0.5">{unit}</span>
    </div>
);

export function MushroomProductCard({ product, onSelect }: MushroomProductCardProps) {
  const placeholderImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(product.name)}`;
  const imageUrl = product.imageUrl || placeholderImage;
  const [selectedFormat, setSelectedFormat] = React.useState<string>('');

  React.useEffect(() => {
    // Pre-select the first format if available
    if (Array.isArray(product.product_formats) && product.product_formats.length > 0) {
      setSelectedFormat(product.product_formats[0]);
    }
  }, [product.product_formats]);

  const handleSelectClick = () => {
    if (selectedFormat) {
      onSelect(product, selectedFormat);
    }
  };

  const nutritionalInfo = product.nutritional_info || {};

  return (
    <Card className="w-80 flex-shrink-0 snap-start flex flex-col shadow-lg bg-card text-card-foreground border border-border/50">
        <CardHeader className="p-4">
            <CardTitle className="text-xl font-bold truncate text-primary" title={product.name}>{product.name}</CardTitle>
            <div className="relative aspect-video w-full mt-2">
                <Image
                src={imageUrl}
                alt={product.name}
                layout="fill"
                objectFit="cover"
                className="rounded-lg"
                data-ai-hint={`mushroom ${product.name}`}
                />
            </div>
             <div className="text-sm text-muted-foreground mt-2 space-y-1">
                {product.scientific_name && <p><span className="font-semibold">Scientific Name:</span> {product.scientific_name}</p>}
                {product.sub_category && <p><span className="font-semibold">Sub Category:</span> {product.sub_category}</p>}
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow flex flex-col">
            <Accordion type="single" collapsible className="w-full">
                {Array.isArray(product.benefits) && product.benefits.length > 0 && (
                    <AccordionItem value="benefits">
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
                )}
                 <AccordionItem value="nutrition">
                    <AccordionTrigger className="text-sm font-medium">Nutritional Info</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                         {Array.isArray(nutritionalInfo.bioactives) && nutritionalInfo.bioactives.length > 0 && (
                            <Select>
                                <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="View Bioactives" /></SelectTrigger>
                                <SelectContent>
                                    {nutritionalInfo.bioactives.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <InfoBadge label="Calories" value={nutritionalInfo.calories_per_100g || 0} unit="/100g" className="bg-blue-50 border-blue-200" />
                            <InfoBadge label="Carbs" value={nutritionalInfo.carbohydrates_g || 0} unit="g" className="bg-orange-50 border-orange-200" />
                            <InfoBadge label="Fat" value={nutritionalInfo.fat_g || 0} unit="g" className="bg-yellow-50 border-yellow-200" />
                            <InfoBadge label="Fiber" value={nutritionalInfo.fiber_g || 0} unit="g" className="bg-lime-50 border-lime-200" />
                            <InfoBadge label="Protein" value={nutritionalInfo.protein_g || 0} unit="g" className="bg-purple-50 border-purple-200" />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
        <CardFooter className="p-4 pt-2 mt-auto flex-col space-y-2">
            {Array.isArray(product.product_formats) && product.product_formats.length > 0 && (
                 <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select Product Format" /></SelectTrigger>
                    <SelectContent>
                        {product.product_formats.map((format: string) => <SelectItem key={format} value={format}>{format}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
            <Button className="w-full" onClick={handleSelectClick} disabled={!selectedFormat}>Use This Product</Button>
        </CardFooter>
    </Card>
  );
}

