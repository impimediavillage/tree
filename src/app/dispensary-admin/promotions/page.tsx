
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { StickerSet } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, AlertTriangle, Eye, Trash2, ToggleLeft, ToggleRight, BarChartHorizontal } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const themeDisplay: Record<StickerSet['theme'], string> = {
  clay: '3D Clay',
  comic: '2D Comic',
  rasta: 'Retro 420',
  farmstyle: 'Farmstyle',
  imaginative: 'Imaginative',
};

export default function PromoCollectionsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [stickerSets, setStickerSets] = useState<StickerSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStickerSets = useCallback(async () => {
    if (!currentUser?.uid) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const setsQuery = query(
        collection(db, 'stickersets'),
        where('creatorUid', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(setsQuery);
      const sets = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as any).toDate(),
      } as StickerSet));
      setStickerSets(sets);
    } catch (error) {
      console.error("Error fetching sticker sets:", error);
      toast({ title: "Error", description: "Could not load your sticker sets.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchStickerSets();
    }
  }, [authLoading, fetchStickerSets]);

  const handleTogglePublic = async (set: StickerSet) => {
    if (!set.id) return;
    const newStatus = !set.isPublic;
    try {
      await updateDoc(doc(db, 'stickersets', set.id), { isPublic: newStatus });
      setStickerSets(prev => prev.map(s => s.id === set.id ? { ...s, isPublic: newStatus } : s));
      toast({ title: "Visibility Updated", description: `${set.name} is now ${newStatus ? 'public' : 'private'}.` });
    } catch (error) {
      console.error("Error toggling public status:", error);
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDeleteSet = async (set: StickerSet) => {
    if (!set.id) return;
    try {
      await deleteDoc(doc(db, 'stickersets', set.id));
      setStickerSets(prev => prev.filter(s => s.id !== set.id));
      toast({ title: "Set Deleted", description: `${set.name} has been permanently deleted.` });
    } catch (error) {
      console.error("Error deleting set:", error);
      toast({ title: "Deletion Failed", variant: "destructive" });
    }
  };
  
   if (authLoading || isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({length: 3}).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="p-0 relative h-56 bg-muted rounded-t-lg"/>
                        <CardContent className="p-4 space-y-2">
                           <Skeleton className="h-6 w-3/4"/>
                           <Skeleton className="h-4 w-1/2"/>
                           <Skeleton className="h-4 w-1/4"/>
                        </CardContent>
                        <CardFooter className="p-4">
                            <Skeleton className="h-10 w-full"/>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2"><Palette className="text-primary"/>My Created Sticker Sets</CardTitle>
          <CardDescription>Manage your generated design packs. Public sets may be featured on the homepage.</CardDescription>
          <CardDescription className="font-bold pt-2">
            Sticker sets are sold for R60 including V.A.T and a 20% commission is added for the Wellness Tree. You earn R25-00 for any Sticker set sold.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {stickerSets.length === 0 ? (
        <Card className="text-center py-10">
          <CardContent>
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">No Sticker Sets Yet</h3>
            <p className="mt-2 text-muted-foreground">You haven&apos;t created any design packs. Go to the AI Asset Generator to start!</p>
            <Button asChild className="mt-4"><Link href="/design/brand-assets">Create a Design</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stickerSets.map(set => (
            <Card key={set.id} className="flex flex-col">
              <CardHeader className="p-0 relative aspect-square">
                 <Image src={set.assets.circularStickerUrl} alt={set.name} layout="fill" objectFit="contain" className="p-4" />
              </CardHeader>
              <CardContent className="pt-4 flex-grow">
                <h3 className="font-bold text-lg truncate">{set.name}</h3>
                <p className="text-sm text-muted-foreground">Theme: {themeDisplay[set.theme]}</p>
                <p className="text-xs text-muted-foreground">Created: {format(set.createdAt as Date, 'PP')}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant={set.isPublic ? "default" : "secondary"}>{set.isPublic ? 'Public' : 'Private'}</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" /> {set.viewCount}
                    <BarChartHorizontal className="h-4 w-4" /> {set.salesCount}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 pt-0 p-4">
                <Button onClick={() => handleTogglePublic(set)} variant="outline" className="w-full">
                    {set.isPublic ? <ToggleRight className="mr-2 h-4 w-4 text-green-500"/> : <ToggleLeft className="mr-2 h-4 w-4 text-gray-500" />}
                    Make {set.isPublic ? 'Private' : 'Public'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this Sticker Set?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the &quot;{set.name}&quot; set. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDeleteSet(set)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
