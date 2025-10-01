'use client';

import * as React from 'react';
import type { Dispensary } from '@/types';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Search, X } from 'lucide-react';

interface DispensarySelectorProps {
  allDispensaries: Dispensary[];
  isLoading: boolean;
  selectedDispensaries: string[] | null | undefined;
  onChange: (ids: string[]) => void;
}

export function DispensarySelector({
  allDispensaries,
  isLoading,
  selectedDispensaries: initialSelectedIds,
  onChange,
}: DispensarySelectorProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const selectedIds = React.useMemo(() => initialSelectedIds || [], [initialSelectedIds]);

  const selectedDispensaries = React.useMemo(() => 
    selectedIds.map(id => allDispensaries.find(d => d.id === id)).filter(Boolean) as Dispensary[],
    [selectedIds, allDispensaries]
  );
  
  const filteredDispensaries = React.useMemo(() => {
    if (!searchTerm) return [];
    return allDispensaries.filter(d => 
      !selectedIds.includes(d.id!) && 
      d.dispensaryName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allDispensaries, selectedIds]);

  const addDispensary = (id: string) => {
    onChange([...selectedIds, id]);
  };

  const removeDispensary = (id: string) => {
    onChange(selectedIds.filter(selectedId => selectedId !== id));
  };
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search for a dispensary to add..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoading}
        />
         {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
      </div>
      
      {searchTerm && !isLoading && (
        <Card className="max-h-60 overflow-y-auto">
          <CardContent className="p-2 space-y-1">
            {filteredDispensaries.length > 0 ? (
              filteredDispensaries.map(dispensary => (
                <div key={dispensary.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                  <div className="flex items-center gap-3">
                     <p className="font-medium text-sm">{dispensary.dispensaryName}</p>
                     <p className="text-xs text-muted-foreground">{dispensary.dispensaryType}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => addDispensary(dispensary.id!)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">No matching dispensaries found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedIds.length > 0 && (
        <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Selected Stores ({selectedIds.length})</p>
            <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
                {selectedDispensaries.map(dispensary => (
                    <Badge key={dispensary.id} variant="secondary" className="px-2 py-1 text-sm h-auto">
                        {dispensary.dispensaryName}
                        <button type="button" onClick={() => removeDispensary(dispensary.id!)} className="ml-2 rounded-full hover:bg-destructive/20 p-0.5">
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
