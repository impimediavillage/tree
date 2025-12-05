'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Dispensary } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, LocateFixed, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DispensaryListingCard } from '@/components/cards/DispensaryListingCard';

// Haversine formula to calculate distance between two lat/lon points
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

type DispensaryWithDistance = Dispensary & { distance?: number };

// Map advisor slugs to dispensary types
const ADVISOR_TO_DISPENSARY_TYPE: Record<string, string> = {
  'cannabinoid-advisor': 'Cannibinoid store',
  'aromatherapy-advisor': 'Aromatherapy store',
  'flower-power-advisor': 'Flower Essence store',
  'traditional-medicine-advisor': 'Traditional Medicine dispensary',
  'homeopathy-advisor': 'Homeopathic store',
  'mushroom-advisor': 'Mushroom store',
  'qigong-advisor': 'Qigong & Wellness studio',
  'vegan-guru-advisor': 'Vegan & Plant-based store',
  'gardening-advisor': 'Permaculture & gardening store',
};

function NearbyDispensariesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const advisorSlug = searchParams?.get('advisor');
  const preferredType = advisorSlug ? ADVISOR_TO_DISPENSARY_TYPE[advisorSlug] : null;

  const [allDispensaries, setAllDispensaries] = useState<DispensaryWithDistance[]>([]);
  const [matchingDispensaries, setMatchingDispensaries] = useState<DispensaryWithDistance[]>([]);
  const [otherDispensaries, setOtherDispensaries] = useState<DispensaryWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  const fetchDispensaries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dispensariesQuery = query(
        collection(db, 'dispensaries'),
        where('status', '==', 'Approved'),
        orderBy('dispensaryName', 'desc')
      );
      
      const dispensariesSnapshot = await getDocs(dispensariesQuery);
      const fetchedDispensaries: DispensaryWithDistance[] = dispensariesSnapshot.docs.map(doc => 
        ({ id: doc.id, ...doc.data() } as Dispensary)
      );
      
      setAllDispensaries(fetchedDispensaries);

      // Separate matching and other dispensaries
      if (preferredType) {
        const matching = fetchedDispensaries.filter(d => d.dispensaryType === preferredType);
        const others = fetchedDispensaries.filter(d => d.dispensaryType !== preferredType);
        setMatchingDispensaries(matching);
        setOtherDispensaries(others);
      } else {
        setMatchingDispensaries([]);
        setOtherDispensaries(fetchedDispensaries);
      }

    } catch (err) {
      console.error("Error fetching dispensaries:", err);
      setError('Failed to load wellness providers.');
      toast({ title: "Loading Error", description: "Could not load wellness providers.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [preferredType, toast]);

  useEffect(() => {
    fetchDispensaries();
  }, [fetchDispensaries]);

  const sortByDistance = (dispensaries: DispensaryWithDistance[], lat: number, lon: number) => {
    return dispensaries.map(profile => {
      if (profile.latitude && profile.longitude) {
        profile.distance = getDistance(lat, lon, profile.latitude, profile.longitude);
      }
      return profile;
    }).sort((a, b) => {
      if (a.distance === undefined && b.distance === undefined) return 0;
      if (a.distance === undefined) return 1;
      if (b.distance === undefined) return -1;
      return a.distance - b.distance;
    });
  };

  const handleGeoSearch = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        toast({ title: "Location Found!", description: "Sorting stores by your location." });

        if (preferredType) {
          const sortedMatching = sortByDistance([...matchingDispensaries], latitude, longitude);
          const sortedOthers = sortByDistance([...otherDispensaries], latitude, longitude);
          setMatchingDispensaries(sortedMatching);
          setOtherDispensaries(sortedOthers);
        } else {
          const sortedAll = sortByDistance([...allDispensaries], latitude, longitude);
          setOtherDispensaries(sortedAll);
        }

        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({ 
          title: "Geolocation Error", 
          description: "Could not access your location. Please ensure location services are enabled.", 
          variant: "destructive"
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <Card className="p-8">
          <CardContent className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <span className="ml-4 text-lg">Loading wellness providers...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <p className="text-xl font-semibold mb-4">{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="text-center mb-6">
        <h1 
          className="text-4xl font-extrabold text-foreground tracking-tight"
          style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >
          {preferredType ? `${preferredType}s Near You` : 'Wellness Providers Near You'}
        </h1>
        {preferredType && (
          <p className="text-muted-foreground mt-2">
            Showing recommended stores for your advisor query
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mb-8 gap-4">
        <Button onClick={handleGeoSearch} disabled={isLocating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {isLocating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LocateFixed className="mr-2 h-5 w-5" />}
          Search near me
        </Button>
        <Button variant="outline" onClick={() => advisorSlug ? router.push(`/advisors/${advisorSlug}`) : router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {matchingDispensaries.length > 0 && (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Recommended for You ({matchingDispensaries.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {matchingDispensaries.map(dispensary => (
              <DispensaryListingCard 
                key={dispensary.id} 
                dispensary={dispensary} 
                distance={dispensary.distance}
              />
            ))}
          </div>
        </>
      )}

      {otherDispensaries.length > 0 && (
        <>
          {matchingDispensaries.length > 0 && (
            <div className="mb-4 mt-12">
              <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
                Other Wellness Providers ({otherDispensaries.length})
              </h2>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {otherDispensaries.map(dispensary => (
              <DispensaryListingCard 
                key={dispensary.id} 
                dispensary={dispensary} 
                distance={dispensary.distance}
              />
            ))}
          </div>
        </>
      )}

      {matchingDispensaries.length === 0 && otherDispensaries.length === 0 && (
        <Card className="p-8">
          <CardContent className="text-center">
            <AlertTriangle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-semibold">No wellness providers found</p>
            <p className="text-muted-foreground mt-2">Check back later for new stores in your area.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NearbyDispensariesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <NearbyDispensariesContent />
    </Suspense>
  );
}
