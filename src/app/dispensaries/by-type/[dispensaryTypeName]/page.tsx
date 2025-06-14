
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import type { Dispensary, DispensaryType } from '@/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Store, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DispensaryListingCard } from '@/components/cards/DispensaryListingCard';

export default function PublicDispensariesByTypePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const dispensaryTypeNameParam = params.dispensaryTypeName;
  const dispensaryTypeName = dispensaryTypeNameParam ? decodeURIComponent(dispensaryTypeNameParam as string) : null;

  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [dispensaryTypeDetails, setDispensaryTypeDetails] = useState<DispensaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dispensaryTypeName) {
      setError("Dispensary type not specified.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch Dispensary Type details
        const typeQuery = query(collection(db, 'dispensaryTypes'), where('name', '==', dispensaryTypeName), limit(1));
        const typeQuerySnapshot = await getDocs(typeQuery);
        
        if (!typeQuerySnapshot.empty) {
          const docData = typeQuerySnapshot.docs[0];
          setDispensaryTypeDetails({ id: docData.id, ...docData.data() } as DispensaryType);
        } else {
          toast({ title: "Type Info Missing", description: `Details for '${dispensaryTypeName}' type not found. Showing dispensaries without specific type banner.`, variant: "default"});
        }

        // Fetch dispensaries of this type that are Approved
        const dispensariesQuery = query(
          collection(db, 'dispensaries'),
          where('dispensaryType', '==', dispensaryTypeName),
          where('status', '==', 'Approved'), // Only show approved dispensaries
          orderBy('dispensaryName')
        );
        const dispensariesSnapshot = await getDocs(dispensariesQuery);
        const fetchedDispensaries = dispensariesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dispensary));
        setDispensaries(fetchedDispensaries);

      } catch (err) {
        console.error("Error fetching dispensaries by type:", err);
        setError('Failed to load dispensaries for this type.');
        toast({ title: "Loading Error", description: "Could not load dispensaries.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispensaryTypeName, toast]);

  // Use dispensaryTypeDetails.image for the main banner, fallback to placeholder
  const headerImageUrl = dispensaryTypeDetails?.image || `https://placehold.co/1200x300.png?text=${encodeURIComponent(dispensaryTypeName || "Dispensaries")}`;
  const headerDataAiHint = `banner ${dispensaryTypeName ? dispensaryTypeName.toLowerCase().replace(/\s+/g, ' ') + " dispensaries" : "dispensaries"}`;
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center mb-6">
            <Button variant="outline" size="icon" onClick={() => router.push('/browse-dispensary-types')} className="mr-4">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-primary animate-pulse">Loading {dispensaryTypeName || 'Dispensaries'}...</h1>
        </div>
        <div className="w-full h-48 md:h-64 rounded-lg bg-muted animate-pulse mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <Card key={i} className="h-[380px] animate-pulse bg-muted/50"><CardContent className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary/50"/></CardContent></Card>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive-foreground mb-2">{error}</h2>
        <Button onClick={() => router.push('/browse-dispensary-types')}>Back to Browse Types</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <Button variant="outline" onClick={() => router.push('/browse-dispensary-types')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Dispensary Types
        </Button>
        <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden shadow-lg mb-6 bg-muted">
            <Image 
              src={headerImageUrl} 
              alt={dispensaryTypeName || "Dispensary Type"} 
              layout="fill" 
              objectFit="cover" 
              data-ai-hint={headerDataAiHint}
              priority
              onError={(e) => {
                // Fallback if dispensaryTypeDetails.image fails
                e.currentTarget.srcset = `https://placehold.co/1200x300.png?text=${encodeURIComponent(dispensaryTypeName || "Dispensaries")}`;
                e.currentTarget.src = `https://placehold.co/1200x300.png?text=${encodeURIComponent(dispensaryTypeName || "Dispensaries")}`;
              }}
            />
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white text-center shadow-md">
                    {dispensaryTypeName}
                </h1>
                {dispensaryTypeDetails?.description && (
                    <p className="text-lg text-gray-200 mt-2 text-center max-w-2xl">
                        {dispensaryTypeDetails.description}
                    </p>
                )}
            </div>
        </div>
      </div>

      {dispensaries.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dispensaries.map(dispensary => (
            <DispensaryListingCard 
              key={dispensary.id} 
              dispensary={dispensary} 
              typeBannerImageUrl={dispensaryTypeDetails?.image} // Pass the custom image URL
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Store className="mx-auto h-12 w-12 mb-3" />
            <h3 className="text-xl font-semibold">No Dispensaries Found</h3>
            <p>There are currently no approved dispensaries listed for the &quot;{dispensaryTypeName}&quot; type.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

