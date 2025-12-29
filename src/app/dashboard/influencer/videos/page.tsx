'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Plus, 
  Play, 
  Eye, 
  Heart, 
  Share2, 
  DollarSign,
  Trash2,
  ExternalLink,
  Youtube,
  TrendingUp
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

interface InfluencerVideo {
  id: string;
  influencerId: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  videoUrl: string;
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  stats: {
    views: number;
    likes: number;
    shares: number;
    commissionEarned: number;
  };
  bonusMultiplier: number;
  isActive: boolean;
  createdAt: any;
}

export default function VideosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<InfluencerVideo[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadVideos();
    }
  }, [user]);

  const loadVideos = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'influencerVideos'),
        where('influencerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InfluencerVideo[];

      setVideos(videosData);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast({ variant: "destructive", description: "Failed to load videos" });
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'influencerVideos', id));
      toast({ description: "Video deleted successfully" });
      loadVideos();
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({ variant: "destructive", description: "Failed to delete video" });
    }
  };

  const toggleActive = async (video: InfluencerVideo) => {
    try {
      await updateDoc(doc(db, 'influencerVideos', video.id), {
        isActive: !video.isActive
      });

      toast({ description: `Video ${!video.isActive ? 'activated' : 'deactivated'}` });
      loadVideos();
    } catch (error) {
      console.error('Error toggling video:', error);
      toast({ variant: "destructive", description: "Failed to update video" });
    }
  };

  const getTotalStats = () => {
    return videos.reduce((acc, video) => ({
      totalVideos: acc.totalVideos + 1,
      totalViews: acc.totalViews + video.stats.views,
      totalLikes: acc.totalLikes + video.stats.likes,
      totalEarnings: acc.totalEarnings + video.stats.commissionEarned,
    }), {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      totalEarnings: 0,
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-600" />;
      case 'tiktok':
        return <Video className="w-4 h-4 text-black" />;
      case 'instagram':
        return <Video className="w-4 h-4 text-pink-600" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B3E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Content</h1>
          <p className="text-gray-600 mt-2">Manage your wellness video content & earn bonus commissions</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/influencer/videos/upload')}
          className="bg-[#006B3E] hover:bg-[#005530]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Video
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Total Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {videos.filter(v => v.isActive).length} active
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
            <p className="text-xs text-gray-500 mt-1">Across all videos</p>
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
            <p className="text-xs text-gray-500 mt-1">Engagement score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Video Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#006B3E]">
              R{stats.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Bonus commissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Bonus Info */}
      <Card className="border-2 border-[#006B3E] bg-gradient-to-r from-[#006B3E]/5 to-[#8B4513]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#006B3E]" />
            Video Content Bonuses
          </CardTitle>
          <CardDescription>
            Earn extra commission multipliers by creating wellness content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Youtube className="w-5 h-5 text-red-600" />
                <p className="font-semibold">YouTube</p>
              </div>
              <p className="text-2xl font-bold text-[#006B3E]">1.5x</p>
              <p className="text-xs text-gray-600 mt-1">Commission multiplier</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-5 h-5 text-black" />
                <p className="font-semibold">TikTok</p>
              </div>
              <p className="text-2xl font-bold text-[#006B3E]">2.0x</p>
              <p className="text-xs text-gray-600 mt-1">Commission multiplier</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Video className="w-5 h-5 text-pink-600" />
                <p className="font-semibold">Instagram</p>
              </div>
              <p className="text-2xl font-bold text-[#006B3E]">1.8x</p>
              <p className="text-xs text-gray-600 mt-1">Commission multiplier</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <Video className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Create Your First Video</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Share your wellness journey through video content and earn bonus commissions on every sale!
            </p>
            <Button 
              onClick={() => router.push('/dashboard/influencer/videos/upload')}
              className="bg-[#006B3E] hover:bg-[#005530]"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              {/* Thumbnail */}
              <div className="relative w-full h-48 bg-gray-200">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Video className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-white/90">
                    {getPlatformIcon(video.platform)}
                    <span className="ml-1 capitalize">{video.platform}</span>
                  </Badge>
                </div>
                <div className="absolute top-2 right-2">
                  <Badge 
                    variant={video.isActive ? "default" : "secondary"}
                    className={video.isActive ? "bg-green-600" : ""}
                  >
                    {video.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {video.bonusMultiplier > 1 && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className="bg-gradient-to-r from-[#006B3E] to-[#8B4513] text-white">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {video.bonusMultiplier}x Bonus
                    </Badge>
                  </div>
                )}
              </div>

              <CardHeader className="pb-3">
                <CardTitle className="text-base line-clamp-2">
                  {video.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {video.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-gray-600">
                      <Eye className="w-3 h-3" />
                      <p className="text-xs font-semibold">{video.stats.views.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-gray-500">Views</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-pink-600">
                      <Heart className="w-3 h-3" />
                      <p className="text-xs font-semibold">{video.stats.likes.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-gray-500">Likes</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[#006B3E]">
                      <DollarSign className="w-3 h-3" />
                      <p className="text-xs font-semibold">R{video.stats.commissionEarned.toFixed(0)}</p>
                    </div>
                    <p className="text-xs text-gray-500">Earned</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(video.videoUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Watch
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(video)}
                  >
                    {video.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(video.id)}
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
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this video from your content library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteVideo(deleteId)}
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
