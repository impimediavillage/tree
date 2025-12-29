'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, Plus, Edit, Trash2, Eye, EyeOff, Loader2,
  TrendingUp, ShoppingCart, DollarSign, ArrowLeft
} from 'lucide-react';
import type { HealingBundle } from '@/types/influencer';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BundlesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bundles, setBundles] = useState<(HealingBundle & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBundles();
    }
  }, [user]);

  const loadBundles = async () => {
    if (!user) return;

    try {
      // Get influencer profile
      const profilesRef = collection(db, 'influencers');
      const q = query(profilesRef, where('userId', '==', user.uid));
      const profileSnapshot = await getDocs(q);

      if (profileSnapshot.empty) return;

      const influencerDoc = profileSnapshot.docs[0];
      const influencerId = influencerDoc.id;

      // Load bundles
      const bundlesRef = collection(db, 'healingBundles');
      const bundlesQuery = query(bundlesRef, where('influencerId', '==', influencerId));
      const bundlesSnapshot = await getDocs(bundlesQuery);

      const loadedBundles = bundlesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HealingBundle & { id: string }));

      setBundles(loadedBundles);
    } catch (error) {
      console.error('Error loading bundles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load bundles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (bundleId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'healingBundles', bundleId), {
        isActive: !currentStatus
      });

      setBundles(bundles.map(b => 
        b.id === bundleId ? { ...b, isActive: !currentStatus } : b
      ));

      toast({
        title: currentStatus ? 'Bundle Deactivated' : 'Bundle Activated',
        description: currentStatus ? 'Bundle is now hidden from customers' : 'Bundle is now visible to customers'
      });
    } catch (error) {
      console.error('Error toggling bundle:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bundle status',
        variant: 'destructive'
      });
    }
  };

  const deleteBundle = async () => {
    if (!deleteId) return;

    try {
      await deleteDoc(doc(db, 'healingBundles', deleteId));
      setBundles(bundles.filter(b => b.id !== deleteId));
      
      toast({
        title: 'Bundle Deleted',
        description: 'Bundle has been permanently removed'
      });
    } catch (error) {
      console.error('Error deleting bundle:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete bundle',
        variant: 'destructive'
      });
    } finally {
      setDeleteId(null);
    }
  };

  const calculateEarnings = (bundle: HealingBundle) => {
    // Estimated earnings at 5% of platform commission (25% of price)
    // This is simplified - actual calculation would be in order processing
    const platformCommission = bundle.discountedPrice * 0.25;
    const influencerCommission = platformCommission * 0.05; // Seed tier minimum
    return influencerCommission;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#3D2E17] flex items-center gap-2">
              <Package className="w-8 h-8 text-[#006B3E]" />
              My Bundles
            </h1>
            <p className="text-muted-foreground mt-1">Manage your curated product collections</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/influencer">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <Button asChild className="bg-[#006B3E] hover:bg-[#005530]">
              <Link href="/dashboard/influencer/bundles/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Bundle
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        {bundles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#006B3E]" />
                  Total Bundles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bundles.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Active Bundles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bundles.filter(b => b.isActive).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-600" />
                  Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bundles.reduce((sum, b) => sum + (b.stats?.conversions || 0), 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#006B3E]">
                  R{bundles.reduce((sum, b) => sum + (b.stats?.revenue || 0), 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bundles List */}
        {bundles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bundles yet</h3>
              <p className="text-muted-foreground mb-4">Create your first healing bundle to start earning more!</p>
              <Button asChild className="bg-[#006B3E] hover:bg-[#005530]">
                <Link href="/dashboard/influencer/bundles/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Bundle
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map(bundle => (
              <Card key={bundle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {bundle.coverImage && (
                  <div className="relative h-48 bg-muted">
                    <img 
                      src={bundle.coverImage} 
                      alt={bundle.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className={bundle.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                        {bundle.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <CardHeader>
                  <CardTitle className="line-clamp-1">{bundle.name}</CardTitle>
                  {bundle.tagline && (
                    <CardDescription className="line-clamp-1">{bundle.tagline}</CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{bundle.products.length} products</span>
                    <Badge variant="outline" className="text-green-600">
                      {bundle.discountPercent}% OFF
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Original:</span>
                      <span className="line-through">R{bundle.totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Bundle Price:</span>
                      <span className="text-xl font-bold text-[#006B3E]">
                        R{bundle.discountedPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div>
                      <div className="text-sm font-semibold">{bundle.stats?.views || 0}</div>
                      <div className="text-xs text-muted-foreground">Views</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{bundle.stats?.conversions || 0}</div>
                      <div className="text-xs text-muted-foreground">Sales</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#006B3E]">
                        R{(bundle.stats?.revenue || 0).toFixed(0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Revenue</div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(bundle.id, bundle.isActive)}
                      className="flex-1"
                    >
                      {bundle.isActive ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(bundle.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The bundle will be permanently removed from your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteBundle} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
