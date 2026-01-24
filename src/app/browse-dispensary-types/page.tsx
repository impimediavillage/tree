
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Trees } from 'lucide-react';
import type { DispensaryType } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, where, query as firestoreQuery } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DispensaryTypeCard } from '@/components/cards/DispensaryTypeCard';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import { InlineAd } from '@/components/advertising/InlineAd';

export default function BrowseWellnessTypesPage() {
  const [allWellnessTypes, setAllWellnessTypes] = useState<DispensaryType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const { toast } = useToast();

  const fetchTypes = useCallback(async () => {
    setIsLoadingTypes(true);
    try {
      const typesCollectionRef = collection(db, 'dispensaryTypes');
      const q = firestoreQuery(typesCollectionRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      const fetchedTypes: DispensaryType[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as DispensaryType;
        // Only add active types
        if (data.isActive === true) {
          fetchedTypes.push({ id: docSnap.id, ...data });
        }
      });
      setAllWellnessTypes(fetchedTypes);
    } catch (error) {
      console.error("Error fetching wellness types:", error);
      toast({ title: "Error", description: "Could not load wellness types.", variant: "destructive" });
    } finally {
      setIsLoadingTypes(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return (
    <div className="container mx-auto py-12 px-4 md:px-6 lg:px-8">
        <PageHeader 
            title={<> <Trees className="inline-block h-12 w-12 text-primary mr-4" /> Explore Wellness Worlds</>}
            description="Discover a vibrant ecosystem of specialized e-stores. Each category offers unique products and services to support your holistic journey."
        />

        {/* Global Platform Advertisement - Super Admin Controlled */}
        <InlineAd placement="inline" className="mb-8" />

      {isLoadingTypes ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4].map(i => 
            <Card key={i} className="h-[380px] bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50 flex items-center justify-center"> 
              <Loader2 className="h-10 w-10 animate-spin text-primary/50"/>
            </Card>
          )}
        </div>
      ) : allWellnessTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allWellnessTypes.map((type, index) => (
            <DispensaryTypeCard 
              key={type.id} 
              dispensaryType={type} 
              basePath="/dispensaries/by-type" 
              delay={index * 100} // Staggered animation
            />
          ))}
        </div>
      ) : (
        <Card className="col-span-full bg-card/70 dark:bg-card/80 backdrop-blur-md border-border/50"> 
          <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-accent" />
            <h3 className="text-2xl font-semibold mb-2">No Wellness Types Found</h3>
            <p className="mb-6">It looks like no wellness types have been set up yet. Please check back later.</p>
            <Button asChild variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
