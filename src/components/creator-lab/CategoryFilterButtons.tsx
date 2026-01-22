'use client';

import { Shirt, Palette, Hammer, Sofa, Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProductCategory } from '@/types/creator-lab';

interface CategoryFilterButtonsProps {
  selectedCategory: ProductCategory | null;
  onCategorySelect: (category: ProductCategory) => void;
  'data-tour'?: string;
}

const categories: Array<{
  value: ProductCategory;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  { value: 'Apparel', label: 'Apparel', icon: Shirt, description: 'T-Shirts, Hoodies, Caps & More' },
  { value: 'Art', label: 'Art', icon: Palette, description: 'Canvas Prints & Wall Art' },
  { value: 'Metalwork', label: 'Metalwork', icon: Hammer, description: 'Metal Signs & Sculptures' },
  { value: 'Furniture', label: 'Furniture', icon: Sofa, description: 'Custom Furniture Designs' },
  { value: 'Resin', label: 'Resin', icon: Droplet, description: 'Resin Art & Coasters' },
];

export function CategoryFilterButtons({ selectedCategory, onCategorySelect, 'data-tour': dataTour }: CategoryFilterButtonsProps) {
  // Temporarily hidden categories (not deleted, just hidden)
  const hiddenCategories = ['Art', 'Metalwork', 'Furniture', 'Resin'];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8" data-tour={dataTour}>
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.value;
        const isHidden = hiddenCategories.includes(category.value);
        
        return (
          <Button
            key={category.value}
            onClick={() => onCategorySelect(category.value)}
            variant={isSelected ? 'default' : 'outline'}
            className={`h-auto py-6 px-4 flex flex-col items-center gap-3 transition-all ${
              isSelected
                ? 'bg-[#006B3E] hover:bg-[#005230] text-white border-2 border-[#006B3E] shadow-lg scale-105'
                : 'bg-white hover:bg-[#006B3E]/10 text-[#3D2E17] border-2 border-[#5D4E37]/30 hover:border-[#006B3E]'
            } ${isHidden ? 'hidden' : ''}`}
          >
            <Icon className={`h-8 w-8 ${isSelected ? 'text-white' : 'text-[#006B3E]'}`} />
            <div className="text-center">
              <p className="font-extrabold text-lg">{category.label}</p>
              <p className={`text-xs mt-1 ${isSelected ? 'text-white/90' : 'text-[#5D4E37]'}`}>
                {category.description}
              </p>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
