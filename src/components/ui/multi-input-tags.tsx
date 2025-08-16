
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X as XIcon, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductAttribute } from '@/types';

interface MultiInputTagsProps {
  value?: ProductAttribute[] | string[];
  onChange: (value: any) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
  getTagClassName?: (tag: string) => string;
  inputType?: 'string' | 'attribute';
}

export function MultiInputTags({
  value = [],
  onChange,
  placeholder = 'Add a tag...',
  maxTags,
  className,
  disabled,
  getTagClassName,
  inputType = 'string',
}: MultiInputTagsProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState('');

  const isAttributeType = inputType === 'attribute';
  
  const processedValue: ProductAttribute[] = React.useMemo(() => {
    if (isAttributeType) {
      // Ensure every item is an object, even if it's passed incorrectly
      return (value as any[]).map(item =>
        typeof item === 'string'
          ? { name: item, percentage: '1%' } // Convert strings to objects if needed
          : { name: item.name, percentage: item.percentage || '1%' }
      );
    }
    // If it's a string type, convert to object array for consistent internal handling
    return (value as string[] || []).map(item => ({ name: item, percentage: '' }));
  }, [value, isAttributeType]);

  const addTag = (tagToAdd: string) => {
    const newTagName = tagToAdd.trim();
    if (newTagName && !processedValue.some(tag => tag.name.toLowerCase() === newTagName.toLowerCase()) && (!maxTags || processedValue.length < maxTags)) {
      const newItem = isAttributeType ? { name: newTagName, percentage: '1%' } : newTagName;
      const newValue = [...value, newItem];
      onChange(newValue);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      const newValue = value.slice(0, -1);
      onChange(newValue);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newValue = processedValue.filter(tag => tag.name !== tagToRemove);
    onChange(isAttributeType ? newValue : newValue.map(item => item.name));
  };
  
  const startEditing = (index: number) => {
    if(disabled) return;
    setEditingIndex(index);
    setEditingValue((processedValue[index]?.percentage || '').replace('%', ''));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value.replace(/[^0-9]/g, ''));
  };
  
  const finishEditing = (index: number) => {
    if (editingIndex === null) return;
    const newPercentage = editingValue.trim() ? `${editingValue.trim()}%` : '0%';
    const updatedTags = [...processedValue];
    if(updatedTags[index]) {
      updatedTags[index]!.percentage = newPercentage;
    }
    onChange(updatedTags);
    setEditingIndex(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing(index);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingIndex(null);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-grow"
          disabled={disabled || (maxTags !== undefined && value.length >= maxTags)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => addTag(inputValue)}
          disabled={disabled || !inputValue.trim() || (maxTags !== undefined && value.length >= maxTags)}
          aria-label="Add tag"
        >
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </div>
       {processedValue.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed mt-2">
          {processedValue.map((tag, index) => (
            <Badge
              key={`${tag.name}-${index}`}
              variant="secondary"
              className={cn(
                "flex items-center gap-1.5 pr-1.5 group border h-7 text-sm", // Ensure consistent size and text
                getTagClassName ? getTagClassName(tag.name) : 'border-border'
              )}
            >
              <span>{tag.name}</span>
              {isAttributeType && (
                <>
                    <span className="text-xs text-muted-foreground">(</span>
                    {editingIndex === index ? (
                        <Input 
                        type="text"
                        value={editingValue}
                        onChange={handleEditChange}
                        onKeyDown={(e) => handleEditKeyDown(e, index)}
                        onBlur={() => finishEditing(index)}
                        autoFocus
                        className="w-8 h-4 text-xs p-0 m-0 text-center bg-transparent border-b border-primary focus:ring-0 focus:outline-none"
                        />
                    ) : (
                        <span onClick={() => startEditing(index)} className={cn(!disabled && "cursor-pointer")}>
                          {tag.percentage || '0%'}
                        </span>
                    )}
                    <span className="text-xs text-muted-foreground">)</span>
                </>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag.name)}
                  className="rounded-full opacity-50 group-hover:opacity-100 focus:opacity-100 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Remove ${tag.name}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {maxTags !== undefined && (
         <p className="text-xs text-muted-foreground">
            {value.length} / {maxTags} tags added.
        </p>
      )}
    </div>
  );
}
