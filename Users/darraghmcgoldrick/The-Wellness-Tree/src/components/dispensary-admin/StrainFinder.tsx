
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Info, Loader2, Search as SearchIcon, Leaf, Brain, Sparkles, X as XIcon } from 'lucide-react';
import { db, functions } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { findStrainImage } from '@/ai/flows/generate-thc-promo-designs';
import { cn } from '@/lib/utils';
import type { ProductAttribute } from '@/types';

interface StrainFinderProps {
  onStrainSelect: (strain: any) => void;
  onClose: () => void;
}

const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export function StrainFinder({ onStrainSelect, onClose }: StrainFinderProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [selectedStrain, setSelectedStrain] = React.useState<any>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedStrain(null);

    try {
      const processedQuery = toTitleCase(searchTerm.trim());
      const q = query(
        collection(db, 'my-seeded-collection'),
        where('name', '>=', processedQuery),
        where('name', '<=', processedQuery + '\uf8ff'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSearchResults(results);
      if (results.length === 0) {
        toast({ title: 'No Results', description: `No strains found matching "${searchTerm}".`, variant: 'default' });
      }
    } catch (error) {
      console.error('Error searching strains:', error);
      toast({ title: 'Search Error', description: 'Could not perform search.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleStrainClick = (strain: any) => {
    setSelectedStrain(strain);
  };
  
  const handleSelectStrain = () => {
    if (selectedStrain) {
      onStrainSelect(selectedStrain);
    }
  };
  
  const badgeColors = {
    flavor: [ "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800" ],
    effect: [ "bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800", "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800", "bg-red-100 text-red-800", "bg-orange-100 text-orange-800" ],
    medical: [ "bg-green-100 text-green-800", "bg-teal-100 text-teal-800", "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800", "bg-stone-200 text-stone-800", "bg-gray-200 text-gray-800" ]
  };

  const filteredEffects = React.useMemo(() => selectedStrain?.effects?.filter((eff: ProductAttribute) => parseInt(eff.percentage, 10) > 0) || [], [selectedStrain]);
  const filteredMedical = React.useMemo(() => selectedStrain?.medical?.filter((med: ProductAttribute) => parseInt(med.percentage, 10) > 0) || [], [selectedStrain]);
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><SearchIcon className="text-primary"/> Strain Finder</DialogTitle>
          <DialogDescription>Search the Leafly database to pre-fill your product information.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input 
            placeholder="Search for a strain (e.g., Blue Dream)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
          </Button>
        </form>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Search Results ({searchResults.length})</h3>
            <ScrollArea className="flex-grow border rounded-md p-2">
              {searchResults.length > 0 ? (
                searchResults.map(strain => (
                  <Button 
                    key={strain.id} 
                    variant="ghost" 
                    onClick={() => handleStrainClick(strain)}
                    className={cn(
                        "w-full justify-start text-left h-auto py-2 px-3",
                        selectedStrain?.id === strain.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <Badge variant={strain.type === 'sativa' ? 'default' : strain.type === 'indica' ? 'secondary' : 'outline'} className="mr-2 capitalize">{strain.type}</Badge>
                    {strain.name}
                  </Button>
                ))
              ) : (
                <div className="text-center p-4 text-muted-foreground">
                    {isSearching ? <Loader2 className="animate-spin mx-auto"/> : 'No results to display. Try a search.'}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Strain Preview</h3>
            <Card className="flex-grow overflow-hidden">
              <ScrollArea className="h-full">
                {selectedStrain ? (
                  <div className="p-4 space-y-4">
                     {selectedStrain.img_url && selectedStrain.img_url !== 'none' && (
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted mb-4">
                            <Image
                                src={selectedStrain.img_url}
                                alt={`Image of ${selectedStrain.name}`}
                                layout="fill"
                                objectFit="cover"
                                data-ai-hint={`cannabis strain ${selectedStrain.name}`}
                            />
                        </div>
                    )}
                    <CardTitle>{selectedStrain.name}</CardTitle>
                    <div>
                        <h4 className="font-semibold text-lg flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>Description</h4>
                        <p className="text-muted-foreground mt-1 text-sm">{selectedStrain.description || "No description available."}</p>
                    </div>
                    <Separator/>
                    {filteredEffects.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/>Common Effects</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {filteredEffects.map((eff: ProductAttribute, i: number) => <Badge key={i} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors.effect[i % badgeColors.effect.length])}>{eff.name} ({eff.percentage})</Badge>)}
                            </div>
                        </div>
                    )}
                    {filteredMedical.length > 0 && <Separator/>}
                    {filteredMedical.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2"><Brain className="h-5 w-5 text-primary"/>Medical Uses</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                            {filteredMedical.map((med: ProductAttribute, i: number) => <Badge key={i} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors.medical[i % badgeColors.medical.length])}>{med.name} ({med.percentage})</Badge>)}
                            </div>
                        </div>
                    )}
                    {selectedStrain.flavor?.length > 0 && <Separator/>}
                    {selectedStrain.flavor?.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2"><Leaf className="h-5 w-5 text-primary"/>Flavors</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {selectedStrain.flavor?.map((flav: string, i: number) => <Badge key={i} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors.flavor[i % badgeColors.flavor.length])}>{flav}</Badge>)}
                            </div>
                        </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-4 text-center text-muted-foreground">
                    <p>Select a strain from the results to see details.</p>
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSelectStrain} disabled={!selectedStrain}>Select This Strain</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
