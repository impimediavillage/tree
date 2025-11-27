'use client';

import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from '@/components/orders/data-table/data-table-view-options';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { OrderStatus } from '@/types/order';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search orders..."
          value={(table.getColumn('orderNumber')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('orderNumber')?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn('status') && (
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title="Status"
            options={[
              {
                label: 'Pending',
                value: 'pending',
              },
              {
                label: 'Processing',
                value: 'processing',
              },
              {
                label: 'Ready for Pickup',
                value: 'ready_for_pickup',
              },
              {
                label: 'Picked Up',
                value: 'picked_up',
              },
              {
                label: 'Shipped',
                value: 'shipped',
              },
              {
                label: 'Out for Delivery',
                value: 'out_for_delivery',
              },
              {
                label: 'Delivered',
                value: 'delivered',
              },
              {
                label: 'Cancelled',
                value: 'cancelled',
              },
            ]}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}