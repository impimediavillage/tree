
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Trees, ShoppingCart } from 'lucide-react';
import type { DispensaryType } from '@/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query as firestoreQuery } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DispensaryTypeCard } from '@/components/cards/DispensaryTypeCard';
import Link from 'next/link';

export default function BrowseDispensaryTypesPage() {
  const [allDispensaryTypes, setAllDispensaryTypes] = useState<DispensaryType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const typesCollectionRef = collection(db, 'dispensaryTypes');
        const q = firestoreQuery(typesCollectionRef, orderBy('name', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedTypes: DispensaryType[] = [];
        querySnapshot.forEach((docSnap) => {
          fetchedTypes.push({ id: docSnap.id, ...docSnap.data() } as DispensaryType);
        });
        setAllDispensaryTypes(fetchedTypes);
      } catch (error) {
        console.error("Error fetching dispensary types:", error);
        toast({ title: "Error", description: "Could not load dispensary types.", variant: "destructive" });
      } finally {
        setIsLoadingTypes(false);
      }
    };
    fetchTypes();
  }, [toast]);

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 lg:px-8">
      <div className="mb-12">
        <div className="bg-card/60 dark:bg-card/70 backdrop-blur-md rounded-xl shadow-lg p-6 md:p-8 text-center max-w-3xl mx-auto">
          <Trees className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-5xl font-extrabold tracking-tight text-primary">
            Explore Dispensary Types
          </h1>
          <p className="text-xl text-card-foreground/90 dark:text-card-foreground/80 mt-3 max-w-2xl mx-auto">
            Discover a variety of dispensaries offering unique products and services. Click on a type to see available stores.
          </p>
        </div>
      </div>

      {isLoadingTypes ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1,2,3,4].map(i => 
            <Card key={i} className="h-[380px] animate-pulse bg-muted/50">
              <CardContent className="flex items-center justify-center h-full">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50"/>
              </CardContent>
            </Card>
          )}
        </div>
      ) : allDispensaryTypes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {allDispensaryTypes.map((type) => (
            <DispensaryTypeCard 
              key={type.id} 
              dispensaryType={type} 
              basePath="/dispensaries/by-type" 
            />
          ))}
        </div>
      ) : (
        <Card className="col-span-full">
          <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-destructive" />
            <h3 className="text-2xl font-semibold mb-2">No Dispensary Types Found</h3>
            <p className="mb-6">It looks like no dispensary types have been set up yet. Please check back later.</p>
            <Button asChild variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
