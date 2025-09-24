'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import type { Dispensary, DispensaryType } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Store, ArrowLeft, LocateFixed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DispensaryListingCard } from '@/components/cards/DispensaryListingCard';
import TripleSShowcase from '@/components/features/TripleSShowcase';

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

export default function PublicWellnessProfilesByTypePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const wellnessTypeNameParam = params.dispensaryTypeName;
  const wellnessTypeName = wellnessTypeNameParam ? decodeURIComponent(wellnessTypeNameParam as string) : null;

  const [wellnessProfiles, setWellnessProfiles] = useState<DispensaryWithDistance[]>([]);
  const [wellnessTypeDetails, setWellnessTypeDetails] = useState<DispensaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);

  const fetchData = useCallback(async () => {
    if (!wellnessTypeName) {
      setError("Wellness type not specified.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const typeQuery = query(collection(db, 'dispensaryTypes'), where('name', '==', wellnessTypeName), limit(1));
      const typeQuerySnapshot = await getDocs(typeQuery);
      
      if (!typeQuerySnapshot.empty) {
        const docData = typeQuerySnapshot.docs[0];
        setWellnessTypeDetails({ id: docData.id, ...docData.data() } as DispensaryType);
      } else {
        toast({ title: "Type Info Missing", description: `Details for '${wellnessTypeName}' type not found.`, variant: "default"});
      }

      const wellnessQuery = query(
        collection(db, 'dispensaries'),
        where('dispensaryType', '==', wellnessTypeName),
        where('status', '==', 'Approved'), 
        orderBy('dispensaryName', 'desc') 
      );
      const wellnessSnapshot = await getDocs(wellnessQuery);
      const fetchedWellness: DispensaryWithDistance[] = wellnessSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dispensary));
      setWellnessProfiles(fetchedWellness);

    } catch (err) {
      console.error("Error fetching wellness profiles by type:", err);
      setError('Failed to load wellness profiles for this type.');
      toast({ title: "Loading Error", description: "Could not load wellness profiles.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [wellnessTypeName, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGeoSearch = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        toast({ title: "Location Found!", description: "Sorting stores by your location." });

        const sortedProfiles = [...wellnessProfiles].map(profile => {
            if (profile.location) {
                const [lat, lon] = profile.location.split(',').map(Number);
                if (!isNaN(lat) && !isNaN(lon)) {
                    profile.distance = getDistance(latitude, longitude, lat, lon);
                }
            }
            return profile;
        }).sort((a, b) => {
            if (a.distance === undefined && b.distance === undefined) return 0;
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
        });

        setWellnessProfiles(sortedProfiles);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({ title: "Geolocation Error", description: "Could not access your location. Please ensure location services are enabled.", variant: "destructive"});
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
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
             <div className="h-10 w-48 bg-muted rounded animate-pulse"></div>
             <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="w-full h-24 rounded-lg bg-muted animate-pulse mb-6"></div>
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
        <div className="text-center mb-6">
            <h1 
            className="text-4xl font-extrabold text-foreground tracking-tight"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
                {wellnessTypeName}
            </h1>
      </div>

      <div className="flex justify-between items-center mb-8 gap-4">
        <Button onClick={handleGeoSearch} disabled={isLocating} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {isLocating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LocateFixed className="mr-2 h-5 w-5" />}
          Search near me
        </Button>
        <Button variant="outline" onClick={() => router.push('/browse-dispensary-types')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      {wellnessProfiles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {wellnessProfiles.map(wellness => (
            <DispensaryListingCard 
              key={wellness.id} 
              dispensary={wellness} 
              distance={wellness.distance}
              typeBannerImageUrl={wellnessTypeDetails?.image} 
            />
          ))}
        </div>
      ) : (
        <Card className="mb-12">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Store className="mx-auto h-12 w-12 mb-3" />
            <h3 className="text-xl font-semibold">No Wellness Profiles Found</h3>
            <p>There are currently no approved wellness profiles listed for the &quot;{wellnessTypeName}&quot; type.</p>
          </CardContent>
        </Card>
      )}

      {wellnessTypeName === 'Cannibinoid store' && (
        <div className="mb-12">
          <TripleSShowcase />
        </div>
      )}
    </div>
  );
}
