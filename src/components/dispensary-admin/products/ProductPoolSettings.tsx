
'use client';

import { Controller } from 'react-hook-form';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DispensarySelector } from '@/components/dispensary-admin/DispensarySelector';
import { ProductTiers } from './ProductTiers';
import type { Dispensary } from '@/types';

interface ProductPoolSettingsProps {
  control: any;
  watch: any;
  allDispensaries: Dispensary[];
  isLoadingDispensaries: boolean;
  currency: string;
}

export function ProductPoolSettings({
  control,
  watch,
  allDispensaries,
  isLoadingDispensaries,
  currency,
}: ProductPoolSettingsProps) {
  const watchIsAvailableForPool = watch('isAvailableForPool');
  const watchPoolSharingRule = watch('poolSharingRule');

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="isAvailableForPool"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Available for Product Pool</FormLabel>
              <FormDescription>
                Allow other stores to request this product.
              </FormDescription>
            </div>
            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )}
      />
      {watchIsAvailableForPool && (
        <Card className="p-4 bg-muted/50 space-y-4">
          <FormField
            control={control}
            name="poolSharingRule"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Pool Sharing Rule *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'same_type'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select how to share this product" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="same_type">Share with all dispensaries in my Wellness type</SelectItem>
                    <SelectItem value="all_types">Share with all Wellness types</SelectItem>
                    <SelectItem value="specific_stores">Share with specific stores only</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {watchPoolSharingRule === 'specific_stores' && (
            <Controller
              control={control}
              name="allowedPoolDispensaryIds"
              render={({ field }) => (
                <DispensarySelector
                  allDispensaries={allDispensaries}
                  isLoading={isLoadingDispensaries}
                  selectedIds={field.value as string[] || []}
                  onSelectionChange={field.onChange}
                />
              )}
            />
          )}
          <ProductTiers control={control} currency={currency} tierType="pool" />
        </Card>
      )}
    </div>
  );
}
