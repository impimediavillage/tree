'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Youtube, 
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function UploadVideoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [influencerName, setInfluencerName] = useState('');

  // Form state
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'instagram'>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadInfluencerProfile();
    }
  }, [user]);

  const loadInfluencerProfile = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, 'influencers', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profile = docSnap.data();
        setInfluencerName(profile.name || profile.displayName || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const extractVideoId = (url: string, platform: string): string => {
    try {
      if (platform === 'youtube') {
        const patterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
          /youtube\.com\/embed\/([^&\n?#]+)/,
        ];
        
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) return match[1];
        }
      } else if (platform === 'tiktok') {
        const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
        if (match) return match[1];
      } else if (platform === 'instagram') {
        const match = url.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/);
        if (match) return match[1];
      }
    } catch (error) {
      console.error('Error extracting video ID:', error);
    }
    return '';
  };

  const generateThumbnail = (url: string, platform: string): string => {
    const videoId = extractVideoId(url, platform);
    
    if (platform === 'youtube' && videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    
    return '';
  };

  const getBonusMultiplier = (platform: string): number => {
    switch (platform) {
      case 'youtube':
        return 1.5;
      case 'tiktok':
        return 2.0;
      case 'instagram':
        return 1.8;
      default:
        return 1.0;
    }
  };

  useEffect(() => {
    if (videoUrl) {
      const thumb = generateThumbnail(videoUrl, platform);
      setThumbnailUrl(thumb);
    }
  }, [videoUrl, platform]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ variant: "destructive", description: "You must be logged in" });
      return;
    }

    if (!videoUrl.trim()) {
      toast({ variant: "destructive", description: "Please enter a video URL" });
      return;
    }

    const videoId = extractVideoId(videoUrl, platform);
    if (!videoId) {
      toast({ variant: "destructive", description: "Invalid video URL. Please check the link and try again." });
      return;
    }

    if (!title.trim() || title.length < 5) {
      toast({ variant: "destructive", description: "Title must be at least 5 characters" });
      return;
    }

    if (!description.trim() || description.length < 20) {
      toast({ variant: "destructive", description: "Description must be at least 20 characters" });
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, 'influencerVideos'), {
        influencerId: user.uid,
        influencerName,
        platform,
        videoUrl: videoUrl.trim(),
        videoId,
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: thumbnailUrl || generateThumbnail(videoUrl, platform),
        bonusMultiplier: getBonusMultiplier(platform),
        stats: {
          views: 0,
          likes: 0,
          shares: 0,
          commissionEarned: 0,
        },
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ description: "Video added successfully!" });
      router.push('/dashboard/influencer/videos');
    } catch (error) {
      console.error('Error adding video:', error);
      toast({ variant: "destructive", description: "Failed to add video" });
    } finally {
      setLoading(false);
    }
  };

  const platformInfo = {
    youtube: {
      icon: <Youtube className="w-5 h-5 text-red-600" />,
      name: 'YouTube',
      multiplier: '1.5x',
      example: 'https://youtube.com/watch?v=...',
      color: 'border-red-200 bg-red-50'
    },
    tiktok: {
      icon: <Video className="w-5 h-5 text-black" />,
      name: 'TikTok',
      multiplier: '2.0x',
      example: 'https://tiktok.com/@username/video/...',
      color: 'border-black/20 bg-gray-50'
    },
    instagram: {
      icon: <Video className="w-5 h-5 text-pink-600" />,
      name: 'Instagram',
      multiplier: '1.8x',
      example: 'https://instagram.com/reel/...',
      color: 'border-pink-200 bg-pink-50'
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add Video Content</h1>
        <p className="text-gray-600 mt-2">Link your wellness content and earn bonus commissions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Choose Platform
            </CardTitle>
            <CardDescription>
              Select where your video is hosted - different platforms earn different bonus multipliers!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={platform} onValueChange={(value) => setPlatform(value as any)}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(platformInfo).map(([key, info]) => (
                  <label
                    key={key}
                    className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      platform === key 
                        ? 'border-[#006B3E] bg-[#006B3E]/5' 
                        : info.color
                    }`}
                  >
                    <RadioGroupItem value={key} className="absolute top-2 right-2" />
                    <div className="mb-3">{info.icon}</div>
                    <p className="font-semibold mb-1">{info.name}</p>
                    <Badge className="bg-gradient-to-r from-[#006B3E] to-[#8B4513]">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {info.multiplier} Bonus
                    </Badge>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Video URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Video Link
            </CardTitle>
            <CardDescription>
              Paste the full URL to your {platformInfo[platform].name} video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input
                id="videoUrl"
                type="url"
                placeholder={platformInfo[platform].example}
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Make sure your video is public and accessible
              </p>
            </div>

            {thumbnailUrl && (
              <div>
                <Label>Preview Thumbnail</Label>
                <div className="mt-2 relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Video Details
            </CardTitle>
            <CardDescription>
              Help people discover your content with a great title and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Video Title *</Label>
              <Input
                id="title"
                placeholder="e.g., My 30-Day Wellness Journey with CBD"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what your video is about, what products you used, and the results you experienced..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/500 characters</p>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Info */}
        <Card className="border-2 border-[#006B3E] bg-gradient-to-r from-[#006B3E]/5 to-[#8B4513]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#006B3E]" />
              Your Bonus Earnings
            </CardTitle>
            <CardDescription>
              This video will earn you extra commissions on every sale made through your referral link!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
              <div>
                <p className="text-sm text-gray-600">Commission Multiplier</p>
                <p className="text-3xl font-bold text-[#006B3E]">{getBonusMultiplier(platform)}x</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Example Earnings</p>
                <p className="text-lg font-semibold text-gray-700">
                  Base R100 → <span className="text-[#006B3E]">R{(100 * getBonusMultiplier(platform)).toFixed(0)}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !videoUrl || !title || !description}
            className="flex-1 bg-[#006B3E] hover:bg-[#005530]"
          >
            {loading ? (
              <>Adding Video...</>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Add Video
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
