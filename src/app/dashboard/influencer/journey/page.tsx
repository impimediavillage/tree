'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Plus, 
  MapPin, 
  Eye, 
  Calendar,
  Trash2,
  Edit,
  Lock,
  Globe,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
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
import Image from 'next/image';

interface JourneyMilestone {
  date: string;
  title: string;
  description: string;
  emotion: string;
  images: string[];
  productIds: string[];
}

interface HealingJourney {
  id: string;
  influencerId: string;
  title: string;
  description: string;
  coverImage?: string;
  milestones: JourneyMilestone[];
  isPublic: boolean;
  stats: {
    views: number;
    likes: number;
    shares: number;
    productsSold: number;
  };
  createdAt: any;
}

export default function HealingJourneyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [journeys, setJourneys] = useState<HealingJourney[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadJourneys();
    }
  }, [user]);

  const loadJourneys = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'healingJourneys'),
        where('influencerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const journeysData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HealingJourney[];

      setJourneys(journeysData);
    } catch (error) {
      console.error('Error loading journeys:', error);
      toast({ variant: "destructive", description: "Failed to load healing journeys" });
    } finally {
      setLoading(false);
    }
  };

  const deleteJourney = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'healingJourneys', id));
      toast({ description: "Journey deleted successfully" });
      loadJourneys();
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting journey:', error);
      toast({ variant: "destructive", description: "Failed to delete journey" });
    }
  };

  const toggleVisibility = async (journey: HealingJourney) => {
    try {
      await updateDoc(doc(db, 'healingJourneys', journey.id), {
        isPublic: !journey.isPublic
      });

      toast({ description: `Journey is now ${!journey.isPublic ? 'public' : 'private'}` });
      loadJourneys();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({ variant: "destructive", description: "Failed to update journey visibility" });
    }
  };

  const getTotalStats = () => {
    return journeys.reduce((acc, journey) => ({
      totalJourneys: acc.totalJourneys + 1,
      totalViews: acc.totalViews + journey.stats.views,
      totalLikes: acc.totalLikes + journey.stats.likes,
      totalSales: acc.totalSales + journey.stats.productsSold,
    }), {
      totalJourneys: 0,
      totalViews: 0,
      totalLikes: 0,
      totalSales: 0,
    });
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B3E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading healing journeys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Healing Journeys</h1>
          <p className="text-gray-600 mt-2">Share your transformation story and inspire others</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/influencer/journey/create')}
          className="bg-[#006B3E] hover:bg-[#005530]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Journey
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Total Journeys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journeys.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {journeys.filter(j => j.isPublic).length} public
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Story reach</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Total Likes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {stats.totalLikes.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Community support</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Products Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#006B3E]">
              {stats.totalSales}
            </div>
            <p className="text-xs text-gray-500 mt-1">Journey conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-2 border-[#006B3E] bg-gradient-to-r from-[#006B3E]/5 to-[#8B4513]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#006B3E]" />
            Why Share Your Journey?
          </CardTitle>
          <CardDescription>
            Authentic stories inspire others and drive engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-1">🌟 Build Trust</p>
              <p className="text-xs text-gray-600">
                Real stories resonate with your audience and build credibility
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-1">💚 Inspire Others</p>
              <p className="text-xs text-gray-600">
                Your transformation can motivate someone else to start their journey
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-1">💰 Drive Sales</p>
              <p className="text-xs text-gray-600">
                Tag products in your journey and earn commissions on sales
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journeys Grid */}
      {journeys.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <MapPin className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Share Your Healing Journey</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Document your wellness transformation with milestones, photos, and the products that helped you along the way.
            </p>
            <Button 
              onClick={() => router.push('/dashboard/influencer/journey/create')}
              className="bg-[#006B3E] hover:bg-[#005530]"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Journey
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {journeys.map((journey) => (
            <Card key={journey.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              {/* Cover Image */}
              {journey.coverImage && (
                <div className="relative w-full h-48 bg-gray-200">
                  <Image
                    src={journey.coverImage}
                    alt={journey.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge variant={journey.isPublic ? "default" : "secondary"}>
                      {journey.isPublic ? (
                        <><Globe className="w-3 h-3 mr-1" /> Public</>
                      ) : (
                        <><Lock className="w-3 h-3 mr-1" /> Private</>
                      )}
                    </Badge>
                  </div>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{journey.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {journey.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Milestones Preview */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{journey.milestones?.length || 0} milestones</span>
                  {journey.milestones?.some(m => m.images?.length > 0) && (
                    <>
                      <span>•</span>
                      <ImageIcon className="w-4 h-4" />
                      <span>
                        {journey.milestones.reduce((sum, m) => sum + (m.images?.length || 0), 0)} photos
                      </span>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-center pt-4 border-t">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <Eye className="w-3 h-3" />
                      <p className="text-xs font-semibold">{journey.stats.views}</p>
                    </div>
                    <p className="text-xs text-gray-500">Views</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-pink-600">
                      <Heart className="w-3 h-3" />
                      <p className="text-xs font-semibold">{journey.stats.likes}</p>
                    </div>
                    <p className="text-xs text-gray-500">Likes</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-gray-600">
                      <TrendingUp className="w-3 h-3" />
                      <p className="text-xs font-semibold">{journey.stats.shares}</p>
                    </div>
                    <p className="text-xs text-gray-500">Shares</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[#006B3E]">
                      <TrendingUp className="w-3 h-3" />
                      <p className="text-xs font-semibold">{journey.stats.productsSold}</p>
                    </div>
                    <p className="text-xs text-gray-500">Sales</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/healing-journey/${journey.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisibility(journey)}
                  >
                    {journey.isPublic ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/influencer/journey/edit/${journey.id}`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(journey.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Healing Journey?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your journey and all its milestones. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteJourney(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
