'use client';

import * as React from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, startAfter, orderBy, DocumentData } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search, X } from 'lucide-react';
import Image from 'next/image';

interface StrainFinderProps {
  onStrainSelect: (strainData: any) => void;
  onClose: () => void;
}

const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

export function StrainFinder({ onStrainSelect, onClose }: StrainFinderProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [strains, setStrains] = React.useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastVisible, setLastVisible] = React.useState<DocumentData | null>(null);

  const fetchStrains = React.useCallback(async (term: string, loadMore = false) => {
    setIsLoading(true);
    try {
      const strainsRef = collection(db, 'my-seeded-collection');
      let q;
      const processedTerm = toTitleCase(term);

      if (loadMore && lastVisible) {
        q = query(
          strainsRef,
          orderBy('name'),
          where('name', '>=', processedTerm),
          where('name', '<=', processedTerm + '\uf8ff'),
          startAfter(lastVisible),
          limit(20)
        );
      } else {
        q = query(
          strainsRef,
          orderBy('name'),
          where('name', '>=', processedTerm),
          where('name', '<=', processedTerm + '\uf8ff'),
          limit(20)
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedStrains = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (loadMore) {
        setStrains(prev => [...prev, ...fetchedStrains]);
      } else {
        setStrains(fetchedStrains);
      }
      
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);

    } catch (error) {
      console.error("Error fetching strains:", error);
    } finally {
      setIsLoading(false);
    }
  }, [lastVisible]);
  
  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchStrains(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, fetchStrains]);


  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2"><Search /> Strain Finder</DialogTitle>
          <DialogDescription>Search for a strain to auto-fill product details.</DialogDescription>
        </DialogHeader>
        <div className="p-4 border-b">
          <div className="relative">
            <Input
              placeholder="Search by strain name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <ScrollArea className="flex-grow p-4">
          {isLoading && strains.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : strains.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {strains.map(strain => (
                <button
                  key={strain.id}
                  onClick={() => onStrainSelect(strain)}
                  className="p-3 border rounded-lg text-left hover:bg-muted/50 transition-colors w-full flex items-center gap-4"
                >
                  {strain.img_url && strain.img_url !== 'none' && (
                     <div className="relative h-16 w-16 rounded-md overflow-hidden bg-slate-200 shrink-0">
                        <Image src={strain.img_url} alt={strain.name} layout="fill" objectFit="cover" />
                     </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold truncate">{strain.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{strain.type}</p>
                    <p className="text-xs text-muted-foreground truncate">THC: {strain.thc_level || 'N/A'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">No strains found for &quot;{searchTerm}&quot;.</p>
          )}
          {strains.length > 0 && lastVisible && (
             <div className="text-center mt-4">
                <Button variant="outline" onClick={() => fetchStrains(searchTerm, true)} disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : 'Load More'}
                </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
