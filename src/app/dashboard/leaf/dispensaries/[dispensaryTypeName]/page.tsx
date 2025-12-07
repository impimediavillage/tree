
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

export default function WellnessProfilesByTypePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const wellnessTypeNameParam = params?.dispensaryTypeName;
  const wellnessTypeName = wellnessTypeNameParam ? decodeURIComponent(wellnessTypeNameParam as string) : null;

  const [wellnessProfiles, setWellnessProfiles] = useState<Dispensary[]>([]);
  const [wellnessTypeDetails, setWellnessTypeDetails] = useState<DispensaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wellnessTypeName) {
      setError("Wellness type not specified.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch Wellness Type details
        const typeQuery = query(collection(db, 'dispensaryTypes'), where('name', '==', wellnessTypeName), limit(1));
        const typeQuerySnapshot = await getDocs(typeQuery);
        
        if (!typeQuerySnapshot.empty) {
          const docData = typeQuerySnapshot.docs[0];
          setWellnessTypeDetails({ id: docData.id, ...docData.data() } as DispensaryType);
        } else {
          toast({ title: "Type Info Missing", description: `Details for '${wellnessTypeName}' type not found.`, variant: "default"});
        }

        // Fetch wellness profiles of this type that are Approved
        const wellnessQuery = query(
          collection(db, 'dispensaries'),
          where('dispensaryType', '==', wellnessTypeName),
          where('status', '==', 'Approved'), 
          orderBy('dispensaryName', 'desc') 
        );
        const wellnessSnapshot = await getDocs(wellnessQuery);
        const fetchedWellnessProfiles = wellnessSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dispensary));
        setWellnessProfiles(fetchedWellnessProfiles);

      } catch (err) {
        console.error("Error fetching wellness profiles by type:", err);
        setError('Failed to load wellness profiles for this type.');
        toast({ title: "Loading Error", description: "Could not load wellness profiles.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [wellnessTypeName, toast]);

  const headerImageUrl = wellnessTypeDetails?.image || `https://placehold.co/1200x300.png?text=${encodeURIComponent(wellnessTypeName || "Wellness Profiles")}`;
  const headerDataAiHint = `banner ${wellnessTypeName ? wellnessTypeName.toLowerCase() + " wellness" : "wellness"}`;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="mr-4">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 
                className="text-3xl font-bold text-foreground animate-pulse"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >Loading Wellness Profiles...</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6].map(i => <Card key={i} className="h-[380px]"><CardContent className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-orange-500 mb-4" />
        <h2 className="text-2xl font-semibold text-destructive-foreground mb-2">{error}</h2>
        <Button onClick={() => router.push('/dashboard/leaf')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="mb-8 flex justify-end">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Wellness Types
        </Button>
      </div>

      {wellnessProfiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wellnessProfiles.map(profile => (
            <DispensaryListingCard key={profile.id} dispensary={profile} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Store className="mx-auto h-12 w-12 mb-3 text-orange-500" />
            <h3 className="text-xl font-semibold">No Wellness Profiles Found</h3>
            <p>There are currently no approved wellness profiles listed for the &quot;{wellnessTypeName}&quot; type.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
