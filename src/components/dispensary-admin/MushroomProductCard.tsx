
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, Info, AlertTriangle } from 'lucide-react';
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
  const placeholderImage = `https://placehold.co/600x400.png?text=${encodeURIComponent(product.name || 'Mushroom')}`;
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
  const hasNutritionalInfo = nutritionalInfo && Object.keys(nutritionalInfo).length > 0 && 
                            (nutritionalInfo.bioactives?.length > 0 || nutritionalInfo.calories_per_100g || nutritionalInfo.protein_g);
  
  const dosageInfo = product.dosage;
  const legalDisclaimer = product.legal_disclaimer;
  const safetyWarnings = product.safety_warnings;

  return (
    <Card className="w-80 flex-shrink-0 snap-start flex flex-col shadow-lg bg-card text-card-foreground border border-border/50 group">
        <CardHeader className="p-0 relative h-48 w-full overflow-hidden rounded-t-lg">
            <Image
                src={imageUrl}
                alt={product.name || 'Mushroom product'}
                layout="fill"
                objectFit="cover"
                className="transition-transform duration-300 group-hover:scale-105"
                data-ai-hint={`mushroom ${product.name}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <CardTitle className="absolute bottom-0 left-0 p-4 text-xl font-bold text-white z-10 w-full truncate" title={product.name}>
                {product.name}
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 flex-grow flex flex-col">
             <div className="text-sm text-muted-foreground mt-2 space-y-1">
                {product.scientific_name && <p><span className="font-semibold">Scientific Name:</span> {product.scientific_name}</p>}
                {product.sub_category && <p><span className="font-semibold">Sub Category:</span> {product.sub_category}</p>}
            </div>
            <Accordion type="single" collapsible className="w-full mt-2">
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
                 {hasNutritionalInfo && (
                    <AccordionItem value="nutrition">
                        <AccordionTrigger className="text-sm font-medium">Nutritional Info</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                            {Array.isArray(nutritionalInfo.bioactives) && nutritionalInfo.bioactives.length > 0 && (
                                <div className="pt-2">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Bioactives</h4>
                                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                                    {nutritionalInfo.bioactives.map((bioactive: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                            <span>{bioactive}</span>
                                        </li>
                                    ))}
                                    </ul>
                                    <Separator className="my-3"/>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                {nutritionalInfo.calories_per_100g && <InfoBadge label="Calories" value={nutritionalInfo.calories_per_100g} unit="/100g" className="bg-blue-50 border-blue-200" />}
                                {nutritionalInfo.carbohydrates_g && <InfoBadge label="Carbs" value={nutritionalInfo.carbohydrates_g} unit="g" className="bg-orange-50 border-orange-200" />}
                                {nutritionalInfo.fat_g && <InfoBadge label="Fat" value={nutritionalInfo.fat_g} unit="g" className="bg-yellow-50 border-yellow-200" />}
                                {nutritionalInfo.fiber_g && <InfoBadge label="Fiber" value={nutritionalInfo.fiber_g} unit="g" className="bg-lime-50 border-lime-200" />}
                                {nutritionalInfo.protein_g && <InfoBadge label="Protein" value={nutritionalInfo.protein_g} unit="g" className="bg-purple-50 border-purple-200" />}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                 )}
                 {dosageInfo && Object.keys(dosageInfo).length > 0 && (
                    <AccordionItem value="dosage">
                        <AccordionTrigger className="text-sm font-medium">View Dosage</AccordionTrigger>
                        <AccordionContent className="space-y-2">
                             <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Dosage:</h4>
                             {Object.entries(dosageInfo).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-baseline text-sm">
                                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                                    <span className="font-bold text-lg text-green-600">{String(value)}</span>
                                </div>
                             ))}
                        </AccordionContent>
                    </AccordionItem>
                 )}
                 {safetyWarnings && (
                    <AccordionItem value="safety">
                        <AccordionTrigger className="text-sm font-medium text-amber-600">Safety Warnings</AccordionTrigger>
                        <AccordionContent>
                           <div className="flex items-start gap-2 text-amber-700 text-sm p-2 bg-amber-50 border border-dashed border-amber-200 rounded-md">
                             <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                             <p>{safetyWarnings}</p>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                 )}
                 {legalDisclaimer && (
                    <AccordionItem value="legal">
                        <AccordionTrigger className="text-sm font-medium">Legal Info</AccordionTrigger>
                        <AccordionContent>
                           <p className="text-xs text-muted-foreground">{legalDisclaimer}</p>
                        </AccordionContent>
                    </AccordionItem>
                 )}
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
