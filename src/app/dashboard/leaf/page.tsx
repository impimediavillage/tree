
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, History, Lightbulb, Store, Loader2, AlertTriangle, Tag, Heart, Users } from 'lucide-react';
import Link from 'next/link';
import type { User, DispensaryType } from '@/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query as firestoreQuery } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { DispensaryTypeCard } from '@/components/cards/DispensaryTypeCard';
import { InfluencerOnboarding } from '@/components/influencer/InfluencerOnboarding';

const LEAF_ONBOARDING_KEY = 'leaf_influencer_onboarding_seen';

export default function LeafDashboardOverviewPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [allWellnessTypes, setAllWellnessTypes] = useState<DispensaryType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

   useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        const user = JSON.parse(storedUserString) as User;
        setCurrentUser(user);
        
        // Check if user has seen onboarding on leaf dashboard
        const hasSeenOnboarding = localStorage.getItem(LEAF_ONBOARDING_KEY);
        if (!hasSeenOnboarding) {
          // Show onboarding after a short delay
          setTimeout(() => setShowOnboarding(true), 1000);
        }
      } catch (e) {
        console.error("Error parsing current user from localStorage on overview page", e);
      }
    }
    setIsLoadingUser(false);
  }, []);

  useEffect(() => {
    const fetchTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const typesCollectionRef = collection(db, 'dispensaryTypes');
        const q = firestoreQuery(typesCollectionRef, orderBy('name'));
        const querySnapshot = await getDocs(q);
        const fetchedTypes: DispensaryType[] = [];
        querySnapshot.forEach((docSnap) => {
          const typeData = docSnap.data() as DispensaryType;
          // Only show active dispensary types
          if (typeData.isActive === true) {
            fetchedTypes.push({ id: docSnap.id, ...typeData });
          }
        });
        setAllWellnessTypes(fetchedTypes);
      } catch (error) {
        console.error("Error fetching wellness types:", error);
        toast({ title: "Error", description: "Could not load wellness types.", variant: "destructive" });
      } finally {
        setIsLoadingTypes(false);
      }
    };
    fetchTypes();
  }, [toast]);

  const userPreferredTypeNames = currentUser?.preferredDispensaryTypes || [];
  
  const preferredWellnessTypes = allWellnessTypes.filter(type => 
    userPreferredTypeNames.includes(type.name)
  ).sort((a,b) => a.name.localeCompare(b.name));

  const otherWellnessTypes = allWellnessTypes.filter(type => 
    !userPreferredTypeNames.includes(type.name)
  ).sort((a,b) => a.name.localeCompare(b.name));


  if (isLoadingUser) {
    return <div className="flex justify-center items-center h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8" data-tour="leaf-dashboard">
      <Card className="shadow-md bg-muted/50 border-primary/20">
        <CardHeader>
          <CardTitle 
            className="text-2xl sm:text-3xl font-extrabold text-[#3D2E17]"
          >
            Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}!
          </CardTitle>
          <CardDescription 
            className="text-base sm:text-lg text-foreground"
          >
            Manage your AI interactions, credits, and explore wellness entities. Current Credits: 
            <span className="font-bold text-green-600 ml-1">{currentUser?.credits ?? 0}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoadingTypes ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Card key={i} className="h-[350px]"><CardContent className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary"/></CardContent></Card>)}
        </div>
      ) : (
        <>
          {preferredWellnessTypes.length > 0 && (
            <section data-tour="browse-dispensaries">
              <div className="flex justify-between items-center mb-6">
                  <h2 
                    className="text-xl sm:text-2xl font-bold text-foreground flex items-center"
                  >
                      <Heart className="mr-2 sm:mr-3 h-7 w-7 sm:h-9 sm:w-9 text-green-800" />
                      <span className="break-words">Your Preferred Wellness Types</span>
                  </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {preferredWellnessTypes.map((type, index) => (
                  <DispensaryTypeCard 
                    key={type.id} 
                    dispensaryType={type} 
                    basePath="/dashboard/leaf/dispensaries"
                    {...(index === 0 && { 'data-tour': 'dispensary-card' })}
                  />
                ))}
              </div>
            </section>
          )}

          {(preferredWellnessTypes.length > 0 && otherWellnessTypes.length > 0) && <Separator className="my-10" />}

          {otherWellnessTypes.length > 0 && (
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 bg-muted/50 p-4 rounded-lg border border-primary/20">
                  <h2 
                    className="text-xl sm:text-2xl font-extrabold text-[#3D2E17] flex items-center"
                  >
                      <Store className="mr-2 sm:mr-3 h-7 w-7 sm:h-9 sm:w-9 text-green-800" />
                      <span className="break-words">Browse Other Wellness Types</span>
                  </h2>
                  {(preferredWellnessTypes.length === 0) && (
                     <Button variant="outline" asChild className="w-full sm:w-auto hover:bg-[#5D4E37] hover:text-white active:bg-[#5D4E37]/80 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">
                        <Link href="/dashboard/leaf/credits">
                            <DollarSign className="mr-2 h-4 w-4"/> Buy Credits
                        </Link>
                    </Button>
                  )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {preferredWellnessTypes.map((type, index) => (
                  <DispensaryTypeCard 
                    key={type.id} 
                    dispensaryType={type} 
                    basePath="/dashboard/leaf/dispensaries"
                    data-tour={index === 0 ? "dispensary-card" : undefined}
                  />
                ))}
              </div>
            </section>
          )}
          
          {allWellnessTypes.length === 0 && !isLoadingTypes && (
             <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                No wellness types available at the moment. Please check back later.
              </CardContent>
            </Card>
          )}
        </>
      )}

      <section>
        <h2 
            className="text-2xl font-bold text-foreground mb-4 flex items-center"
        >
            <Lightbulb className="mr-3 h-9 w-9 text-green-800" /> Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow bg-muted/50 border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="text-orange-500 h-8 w-8" />Interaction History</CardTitle></CardHeader>
            <CardContent>
                <p className="text-foreground font-semibold mb-4">Review your past interactions with our AI advisors.</p>
                <Button asChild className="w-full bg-green-600 hover:bg-[#5D4E37] active:bg-green-800 text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"><Link href="/dashboard/leaf/history">View History</Link></Button>
            </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow bg-muted/50 border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="text-orange-500 h-8 w-8" />AI Advisors</CardTitle></CardHeader>
            <CardContent>
                <p className="text-foreground font-semibold mb-4">Discover insights by consulting our specialized AI advisors.</p>
                <Button asChild className="w-full bg-green-600 hover:bg-[#5D4E37] active:bg-green-800 text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"><Link href="/dashboard/advisors">See All Advisors</Link></Button>
            </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow bg-muted/50 border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="text-orange-500 h-8 w-8" />Become an Influencer</CardTitle></CardHeader>
            <CardContent>
                <p className="text-foreground font-semibold mb-4">Learn how to earn commissions by sharing The Wellness Tree.</p>
                <Button onClick={() => setShowOnboarding(true)} className="w-full bg-green-600 hover:bg-[#5D4E37] active:bg-green-800 text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">Learn More</Button>
            </CardContent>
            </Card>
        </div>
      </section>

      {/* Influencer Onboarding Modal */}
      <InfluencerOnboarding
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={() => {
          localStorage.setItem(LEAF_ONBOARDING_KEY, 'true');
          setShowOnboarding(false);
        }}
      />
    </div>
  );
}
