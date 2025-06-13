
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X as XIcon, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiInputTagsProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function MultiInputTags({
  value = [],
  onChange,
  placeholder = 'Add a tag...',
  maxTags,
  className,
  disabled,
}: MultiInputTagsProps) {
  const [inputValue, setInputValue] = React.useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim();
    if (newTag && !value.includes(newTag) && (!maxTags || value.length < maxTags)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
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
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1.5 pr-1.5 group"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full opacity-50 group-hover:opacity-100 focus:opacity-100 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Remove ${tag}`}
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
