'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SortSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function SortSelect({ value, onValueChange }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Sort Orders</SelectLabel>
          <SelectItem value="date_desc">Newest First</SelectItem>
          <SelectItem value="date_asc">Oldest First</SelectItem>
          <SelectItem value="total_desc">Highest Amount</SelectItem>
          <SelectItem value="total_asc">Lowest Amount</SelectItem>
          <SelectItem value="status">By Status</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}