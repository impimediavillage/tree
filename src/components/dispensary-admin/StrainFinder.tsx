
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Loader2, Search as SearchIcon, Leaf, Brain, Sparkles, Check, SkipForward } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ProductAttribute } from '@/types';
import { InfoDialog } from '../dialogs/InfoDialog';

interface StrainFinderProps {
  onStrainSelect: (strainData: any) => void;
  onSkip?: () => void;
}

const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

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
        const processAttributes = (attributes: Record<string, string | null> | undefined): { active: ProductAttribute[], inactive: string[] } => {
            const active: ProductAttribute[] = [];
            const inactive: string[] = [];

            if (!attributes || typeof attributes !== 'object') return { active, inactive };

            for (const key in attributes) {
                if (Object.prototype.hasOwnProperty.call(attributes, key)) {
                    const name = toTitleCase(key);
                    const value = attributes[key];
                    
                    if (value && typeof value === 'string' && value.trim() && !value.includes('0%')) {
                        active.push({ name, percentage: value.endsWith('%') ? value : `${value}%` });
                    } else {
                        inactive.push(name);
                    }
                }
            }
            return { active, inactive };
        };

        const flavorKeywords = ['earthy', 'sweet', 'citrus', 'pine', 'skunky', 'grape', 'woody', 'diesel', 'berry', 'lemon', 'pungent', 'flowery', 'spicy', 'herbal', 'orange', 'vanilla', 'nutty', 'minty', 'honey', 'lavender', 'fruity'];
        const extractFlavors = (name: string, description: string): string[] => {
            const foundFlavors = new Set<string>();
            const textToSearch = `${name} ${description}`.toLowerCase();
            flavorKeywords.forEach(flavor => {
                if (textToSearch.includes(flavor)) {
                    foundFlavors.add(toTitleCase(flavor));
                }
            });
            return Array.from(foundFlavors);
        };
        
        const { active: activeEffects, inactive: zeroPercentEffects } = processAttributes(selectedStrain.effects);
        const { active: activeMedicalUses, inactive: zeroPercentMedical } = processAttributes(selectedStrain.medical);
        
        const extractedFlavors = extractFlavors(selectedStrain.name || '', selectedStrain.description || '');
        const combinedFlavors = Array.from(new Set([...(selectedStrain.flavor || []), ...extractedFlavors]));

        onStrainSelect({
            name: selectedStrain.name,
            strainType: selectedStrain.type,
            description: selectedStrain.description,
            thcContent: selectedStrain.thc_level,
            mostCommonTerpene: selectedStrain.most_common_terpene,
            effects: activeEffects,
            medicalUses: activeMedicalUses,
            flavors: combinedFlavors,
            zeroPercentEffects,
            zeroPercentMedical,
        });
    }
  };
  
  const getFilteredAttributes = (attributes: Record<string, string | null> | undefined): ProductAttribute[] => {
    if (!attributes) return [];
    return Object.entries(attributes)
        .map(([name, percentage]) => ({name: toTitleCase(name), percentage: String(percentage)}))
        .filter((attr: ProductAttribute) => {
            const percValue = attr.percentage;
            return percValue && percValue.trim() !== '0%' && percValue.trim() !== '' && percValue.trim() !== 'null';
    });
  };

  const filteredEffects = React.useMemo(() => getFilteredAttributes(selectedStrain?.effects), [selectedStrain]);
  const filteredMedical = React.useMemo(() => getFilteredAttributes(selectedStrain?.medical), [selectedStrain]);
  
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
                             <div className="flex flex-wrap gap-2 justify-center">
                                <InfoDialog title={`Description of ${selectedStrain.name}`} triggerText="Description" icon={Info}>
                                    <p className="text-muted-foreground mt-1 text-sm">{selectedStrain.description || "No description available."}</p>
                                </InfoDialog>
                                <InfoDialog title={`Effects of ${selectedStrain.name}`} triggerText="Effects" items={filteredEffects} itemType="effect" icon={Sparkles} />
                                <InfoDialog title={`Potential Medical Uses of ${selectedStrain.name}`} triggerText="Medical Uses" items={filteredMedical} itemType="medical" icon={Brain} />
                                <InfoDialog title={`Flavors in ${selectedStrain.name}`} triggerText="Flavors" items={selectedStrain.flavor || []} itemType="flavor" icon={Leaf} />
                            </div>
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
