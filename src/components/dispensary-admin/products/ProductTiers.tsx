
'use client';

import { useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Trash2, PlusCircle, ChevronsUpDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const regularUnits = [ "gram", "10 grams", "0.25 oz", "0.5 oz", "3ml", "5ml", "10ml", "ml", "clone", "joint", "mg", "pack", "box", "piece", "seed", "unit" ];
const poolUnits = [ "100 grams", "200 grams", "200 grams+", "500 grams", "500 grams+", "1kg", "2kg", "5kg", "10kg", "10kg+", "oz", "50ml", "100ml", "1 litre", "2 litres", "5 litres", "10 litres", "pack", "box" ];

interface ProductTiersProps {
  control: any;
  currency: string;
  tierType: 'regular' | 'pool';
  nesting?: 'priceTiers' | 'poolPriceTiers';
}

export function ProductTiers({ control, currency, tierType, nesting = tierType === 'regular' ? 'priceTiers' : 'poolPriceTiers' }: ProductTiersProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: nesting,
  });

  const dataListId = tierType === 'regular' ? 'regular-units-list' : 'pool-units-list';

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <Card key={field.id} className="p-4 bg-muted/30 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <FormField control={control} name={`${nesting}.${index}.unit`} render={({ field: f }) => ( <FormItem><FormLabel>Unit *</FormLabel><FormControl><Input {...f} list={dataListId} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={control} name={`${nesting}.${index}.price`} render={({ field: f }) => ( <FormItem><FormLabel>Price ({currency}) *</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem> )} />
            <FormField control={control} name={`${nesting}.${index}.quantityInStock`} render={({ field: f }) => ( <FormItem><FormLabel>Stock *</FormLabel><FormControl><Input type="number" {...f} /></FormControl><FormMessage /></FormItem> )} />
          </div>
          <Collapsible className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center w-full justify-start p-2 -ml-2">
                <ChevronsUpDown className="h-4 w-4 mr-2" />
                <span className="text-md font-semibold">Packaging Details (Optional)</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-fade-in-scale-up">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start pt-2">
                <FormField control={control} name={`${nesting}.${index}.weight`} render={({ field: f }) => ( <FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" step="0.001" {...f} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={control} name={`${nesting}.${index}.length`} render={({ field: f }) => ( <FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={control} name={`${nesting}.${index}.width`} render={({ field: f }) => ( <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={control} name={`${nesting}.${index}.height`} render={({ field: f }) => ( <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" step="0.1" {...f} /></FormControl><FormMessage /></FormItem> )} />
              </div>
            </CollapsibleContent>
          </Collapsible>
          {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>}
        </Card>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ unit: '', price: '' as any, quantityInStock: '' as any, description: '', weight: null, length: null, width: null, height: null })}><PlusCircle className="mr-2 h-4 w-4" />Add Price Tier</Button>
      <datalist id="regular-units-list"> {regularUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
      <datalist id="pool-units-list"> {poolUnits.map(unit => <option key={unit} value={unit} />)} </datalist>
    </div>
  );
}
