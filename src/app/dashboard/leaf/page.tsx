
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, History, Lightbulb, Store, Loader2, AlertTriangle, Tag, Heart } from 'lucide-react';
import Link from 'next/link';
import type { User, DispensaryType } from '@/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query as firestoreQuery } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { DispensaryTypeCard } from '@/components/cards/DispensaryTypeCard'; // Import extracted component

export default function LeafDashboardOverviewPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [allDispensaryTypes, setAllDispensaryTypes] = useState<DispensaryType[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const { toast } = useToast();

   useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        const user = JSON.parse(storedUserString) as User;
        setCurrentUser(user);
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

  const userPreferredTypeNames = currentUser?.preferredDispensaryTypes || [];
  
  const preferredDispensaryTypes = allDispensaryTypes.filter(type => 
    userPreferredTypeNames.includes(type.name)
  ).sort((a,b) => a.name.localeCompare(b.name));

  const otherDispensaryTypes = allDispensaryTypes.filter(type => 
    !userPreferredTypeNames.includes(type.name)
  ).sort((a,b) => a.name.localeCompare(b.name));


  if (isLoadingUser) {
    return <div className="flex justify-center items-center h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-md bg-card border-primary/20">
        <CardHeader>
          <CardTitle 
            className="text-3xl font-semibold text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}!
          </CardTitle>
          <CardDescription 
            className="text-lg text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Manage your AI interactions, credits, and explore dispensaries. Current Credits: 
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
          {preferredDispensaryTypes.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-6">
                  <h2 
                    className="text-2xl font-bold text-foreground flex items-center"
                    style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
                  >
                      <Heart className="mr-3 h-8 w-8 text-primary" />
                      Your Preferred Dispensary Types
                  </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {preferredDispensaryTypes.map((type) => (
                  <DispensaryTypeCard 
                    key={type.id} 
                    dispensaryType={type} 
                    isPreferred 
                    basePath="/dashboard/leaf/dispensaries" 
                  />
                ))}
              </div>
            </section>
          )}

          {(preferredDispensaryTypes.length > 0 && otherDispensaryTypes.length > 0) && <Separator className="my-10" />}

          {otherDispensaryTypes.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-6">
                  <h2 
                    className="text-2xl font-bold text-foreground flex items-center"
                    style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
                  >
                      <Store className="mr-3 h-8 w-8 text-primary" />
                      Browse Other Dispensary Types
                  </h2>
                  {(preferredDispensaryTypes.length === 0) && (
                     <Button variant="outline" asChild>
                        <Link href="/dashboard/leaf/credits">
                            <DollarSign className="mr-2 h-4 w-4"/> Buy Credits
                        </Link>
                    </Button>
                  )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherDispensaryTypes.map((type) => (
                  <DispensaryTypeCard 
                    key={type.id} 
                    dispensaryType={type} 
                    basePath="/dashboard/leaf/dispensaries" 
                  />
                ))}
              </div>
            </section>
          )}
          
          {allDispensaryTypes.length === 0 && !isLoadingTypes && (
             <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto h-10 w-10 mb-2" />
                No dispensary types available at the moment. Please check back later.
              </CardContent>
            </Card>
          )}
        </>
      )}

      <section>
        <h2 
            className="text-2xl font-bold text-foreground mb-4 flex items-center"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
        >
            <Lightbulb className="mr-3 h-8 w-8 text-primary" /> Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="text-accent h-6 w-6" />Interaction History</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">Review your past interactions with our AI advisors.</p>
                <Button asChild className="w-full bg-primary text-primary-foreground"><Link href="/dashboard/leaf/history">View History</Link></Button>
            </CardContent>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
            <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="text-accent h-6 w-6" />AI Advisors</CardTitle></CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">Discover insights by consulting our specialized AI advisors.</p>
                <Button asChild className="w-full bg-primary text-primary-foreground"><Link href="/">See All Advisors</Link></Button>
            </CardContent>
            </Card>
        </div>
      </section>
    </div>
  );
}

