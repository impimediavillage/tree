
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Info, Loader2, Search as SearchIcon, Leaf, Brain, Sparkles, X as XIcon, Check, SkipForward } from 'lucide-react';
import { db, functions } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { findStrainImage } from '@/ai/flows/generate-thc-promo-designs';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import type { ProductAttribute } from '@/types';

interface StrainFinderProps {
  onStrainSelect: (strain: any) => void;
  onSkip?: () => void;
}

const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

export function StrainFinder({ onStrainSelect, onSkip }: StrainFinderProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [selectedStrain, setSelectedStrain] = React.useState<any>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setSelectedStrain(null);

    try {
      const processedTerm = toTitleCase(searchTerm.trim());
      const strainsRef = collection(db, 'my-seeded-collection');
      const q = query(
        strainsRef,
        where('name', '>=', processedTerm),
        where('name', '<=', processedTerm + '\uf8ff'),
        limit(20)
      );

      const querySnapshot = await getDocs(q);
      const strains = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSearchResults(strains);

      if (strains.length === 0) {
        toast({ title: 'No Results', description: `No strains found matching "${searchTerm}".`, variant: 'default' });
      }
    } catch (error: any) {
      console.error('Error searching strains:', error);
      toast({ title: 'Search Error', description: error.message || 'Could not perform search.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleStrainClick = (strain: any) => {
    setSelectedStrain(strain);
  };
  
  const handleSelectStrain = () => {
    if (selectedStrain) {
        const effects: ProductAttribute[] = Object.entries(selectedStrain.effects || {})
            .filter(([, value]) => String(value).trim() !== '' && String(value).trim() !== '0%')
            .map(([key, value]) => ({ name: toTitleCase(key.replace(/_/g, ' ')), percentage: String(value) }));

        const medical: ProductAttribute[] = Object.entries(selectedStrain.medical || {})
            .filter(([, value]) => String(value).trim() !== '' && String(value).trim() !== '0%')
            .map(([key, value]) => ({ name: toTitleCase(key.replace(/_/g, ' ')), percentage: String(value) }));

        const zeroPercentEffects = Object.entries(selectedStrain.effects || {})
            .filter(([, value]) => String(value).trim() === '' || String(value).trim() === '0%')
            .map(([key]) => toTitleCase(key.replace(/_/g, ' ')));
        
        const zeroPercentMedical = Object.entries(selectedStrain.medical || {})
            .filter(([, value]) => String(value).trim() === '' || String(value).trim() === '0%')
            .map(([key]) => toTitleCase(key.replace(/_/g, ' ')));
            
        onStrainSelect({
            ...selectedStrain,
            effects,
            medical,
            zeroPercentEffects,
            zeroPercentMedical,
        });
    }
  };
  
  const badgeColors = {
    flavor: [ "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800" ],
    effect: [ "bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800", "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800", "bg-red-100 text-red-800", "bg-orange-100 text-orange-800" ],
    medical: [ "bg-green-100 text-green-800", "bg-teal-100 text-teal-800", "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800", "bg-stone-200 text-stone-800", "bg-gray-200 text-gray-800" ]
  };

  const filteredEffects = React.useMemo(() => {
    if (!selectedStrain?.effects) return [];
    return Object.entries(selectedStrain.effects)
        .map(([name, percentage]) => ({name: toTitleCase(name), percentage: String(percentage)}))
        .filter((eff: ProductAttribute) => {
            const percValue = eff.percentage;
            return percValue && percValue.trim() !== '0%' && percValue.trim() !== '';
    });
  }, [selectedStrain]);

  const filteredMedical = React.useMemo(() => {
    if (!selectedStrain?.medical) return [];
    return Object.entries(selectedStrain.medical)
        .map(([name, percentage]) => ({name: toTitleCase(name), percentage: String(percentage)}))
        .filter((med: ProductAttribute) => {
            const percValue = med.percentage;
            return percValue && percValue.trim() !== '0%' && percValue.trim() !== '';
    });
  }, [selectedStrain]);
  
  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2"><SearchIcon className="text-primary"/> Strain Finder</CardTitle>
          {onSkip && (
            <Button type="button" variant="ghost" onClick={onSkip}>
              <SkipForward className="mr-2 h-4 w-4"/>
              Skip for now
            </Button>
          )}
        </div>
        <CardDescription>Search the Leafly database to pre-fill your product information.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
            <Input 
                placeholder="Search for a strain (e.g., Blue Dream)" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                    }
                }}
            />
            <Button type="button" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
            </Button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2 lg:col-span-1">
                  <h3 className="font-semibold text-sm text-muted-foreground">Search Results ({searchResults.length})</h3>
                   <ScrollArea className="flex-grow border rounded-md p-2 h-96">
                        {searchResults.map(strain => (
                        <Card 
                            key={strain.id} 
                            className={cn(
                                "mb-2 cursor-pointer transition-colors hover:bg-muted/50",
                                selectedStrain?.id === strain.id && "bg-primary/10 border-primary ring-2 ring-primary"
                            )}
                            onClick={() => handleStrainClick(strain)}
                        >
                            <CardHeader className="flex flex-row items-center gap-3 p-3">
                                <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                {strain.img_url && strain.img_url !== 'none' ? (
                                        <Image src={strain.img_url} alt={strain.name} layout="fill" objectFit="cover" />
                                ) : <Leaf className="h-8 w-8 text-muted-foreground/50 m-auto" />}
                                </div>
                                <div>
                                    <CardTitle className="text-base">{strain.name}</CardTitle>
                                    <Badge variant={strain.type === 'sativa' ? 'default' : strain.type === 'indica' ? 'secondary' : 'outline'} className="capitalize mt-1">{strain.type}</Badge>
                                </div>
                            </CardHeader>
                        </Card>
                        ))}
                  </ScrollArea>
              </div>
              <div className="flex flex-col gap-2 md:col-span-1 lg:col-span-2">
                 <h3 className="font-semibold text-sm text-muted-foreground">Strain Preview</h3>
                 <Card className="flex-grow overflow-hidden h-96">
                    <ScrollArea className="h-full">
                        {selectedStrain ? (
                        <div className="p-4 space-y-4">
                            {selectedStrain.img_url && selectedStrain.img_url !== 'none' ? (
                                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted mb-4">
                                    <Image src={selectedStrain.img_url} alt={`Image of ${selectedStrain.name}`} layout="fill" style={{objectFit:"cover"}} data-ai-hint={`cannabis strain ${selectedStrain.name}`} />
                                </div>
                            ) : null}
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
                            {selectedStrain.flavor && Array.isArray(selectedStrain.flavor) && selectedStrain.flavor.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-lg flex items-center gap-2"><Leaf className="h-5 w-5 text-primary"/>Flavors</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedStrain.flavor.map((flav: string, i: number) => <Badge key={i} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", badgeColors.flavor[i % badgeColors.flavor.length])}>{flav}</Badge>)}
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
        )}
      </CardContent>
      {selectedStrain && (
        <CardFooter>
            <Button onClick={handleSelectStrain} className="w-full bg-green-600 hover:bg-green-700">
                <Check className="mr-2 h-4 w-4" /> Use This Strain's Data
            </Button>
        </CardFooter>
      )}
    </Card>
  );
}
