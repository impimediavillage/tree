'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Share2, Facebook, Twitter, Linkedin, MessageCircle, Send, 
  Instagram, Music, Mail, Smartphone, QrCode, Copy, Check,
  Sparkles, Trophy, TrendingUp, Zap, Download, ExternalLink,
  Target, BarChart3, Users, ArrowRight, Rocket, Star, Crown,
  Calendar, Image as ImageIcon, FileDown, CalendarPlus, Clock,
  CalendarClock, Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import type { ShareConfig as BaseShareConfig, ShareStats as BaseShareStats, ShareEvent, SocialPlatform, Achievement } from '@/types';
import type { ShareConfig, ShareStats, ShareAnalytics, ScheduledShare } from '@/types/social-share';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { ScheduleShareDialog, ScheduledSharesList } from './ScheduleShare';
import { CustomShareImages } from './CustomShareImages';
import { SharePerformanceLeaderboard } from './Leaderboard';
import { exportAnalyticsToCSV, exportStatsToCSV, calculatePerformanceScore, getPerformanceRank } from '@/lib/social-share-utils';

interface SocialShareHubProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Platform configurations
const platformConfig = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Share to your Facebook page or profile',
  },
  twitter: {
    name: 'X (Twitter)',
    icon: Twitter,
    color: '#000000',
    gradient: 'from-gray-800 to-black',
    description: 'Post to X with your custom message',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    gradient: 'from-blue-600 to-blue-700',
    description: 'Share with professional network',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    gradient: 'from-green-500 to-green-600',
    description: 'Send to WhatsApp contacts',
  },
  telegram: {
    name: 'Telegram',
    icon: Send,
    color: '#0088cc',
    gradient: 'from-cyan-500 to-blue-500',
    description: 'Share on Telegram channels',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    gradient: 'from-pink-500 via-purple-500 to-yellow-500',
    description: 'Copy link for Instagram bio/stories',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: '#000000',
    gradient: 'from-gray-900 to-pink-600',
    description: 'Share link in TikTok bio',
  },
  email: {
    name: 'Email',
    icon: Mail,
    color: '#EA4335',
    gradient: 'from-red-500 to-orange-500',
    description: 'Send via email',
  },
  sms: {
    name: 'SMS',
    icon: Smartphone,
    color: '#34C759',
    gradient: 'from-green-400 to-green-600',
    description: 'Share via text message',
  },
};

// Achievement definitions
const achievementDefinitions: Record<string, Achievement> = {
  first_share: {
    id: 'first_share',
    title: 'First Steps',
    description: 'Shared your store for the first time',
    icon: '🎉',
  },
  social_butterfly: {
    id: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Shared on 5+ different platforms',
    icon: '🦋',
  },
  century_club: {
    id: 'century_club',
    title: 'Century Club',
    description: 'Reached 100 total shares',
    icon: '💯',
  },
  viral_master: {
    id: 'viral_master',
    title: 'Viral Master',
    description: 'Generated 1000+ clicks',
    icon: '🚀',
  },
  omni_channel: {
    id: 'omni_channel',
    title: 'Omni-Channel',
    description: 'Shared on all platforms',
    icon: '👑',
  },
  daily_sharer: {
    id: 'daily_sharer',
    title: 'Daily Sharer',
    description: 'Shared 7 days in a row',
    icon: '🔥',
  },
  qr_master: {
    id: 'qr_master',
    title: 'QR Master',
    description: 'Generated 10+ QR codes',
    icon: '📱',
  },
};

export function SocialShareHub({ isOpen, onOpenChange }: SocialShareHubProps) {
  const { currentDispensary, currentUser } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'share' | 'analytics' | 'achievements' | 'schedule' | 'leaderboard'>('share');
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    title: '',
    description: '',
    preferredPlatforms: [],
    platformImages: {}
  });
  const [shareStats, setShareStats] = useState<ShareStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [scheduledShares, setScheduledShares] = useState<ScheduledShare[]>([]);
  const [shareAnalytics, setShareAnalytics] = useState<ShareAnalytics[]>([]);
  
  const storeUrl = currentDispensary?.publicStoreUrl || 
    `${typeof window !== 'undefined' ? window.location.origin : ''}/store/${currentDispensary?.id}`;

  // Load share config and stats
  useEffect(() => {
    if (isOpen && currentDispensary?.id) {
      loadShareData();
    }
  }, [isOpen, currentDispensary?.id]);

  // Load scheduled shares
  useEffect(() => {
    if (isOpen && currentDispensary?.id) {
      const loadScheduledShares = async () => {
        try {
          const scheduledRef = collection(db, 'dispensaries', currentDispensary.id!, 'scheduledShares');
          const q = query(scheduledRef, orderBy('scheduledFor', 'asc'));
          const snapshot = await getDocs(q);
          const shares = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ScheduledShare[];
          setScheduledShares(shares);
        } catch (error) {
          console.error('Error loading scheduled shares:', error);
        }
      };
      loadScheduledShares();
    }
  }, [isOpen, currentDispensary?.id]);

  const loadShareData = async () => {
    if (!currentDispensary?.id) return;
    
    setIsLoading(true);
    try {
      // Load share config
      const configRef = doc(db, `dispensaries/${currentDispensary.id}/shareConfig/default`);
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        const config = configSnap.data() as ShareConfig;
        // Use dispensary storeImage/storeIcon as defaults for platforms without custom images
        const defaultImage = currentDispensary.storeImage || currentDispensary.storeIcon;
        if (defaultImage && config.platformImages) {
          // Fill in missing platform images with store branding
          const platforms: SocialPlatform[] = ['facebook', 'twitter', 'linkedin', 'whatsapp', 'telegram', 'instagram', 'tiktok'];
          platforms.forEach(platform => {
            if (!config.platformImages![platform]) {
              config.platformImages![platform] = defaultImage;
            }
          });
        }
        setShareConfig(config);
        setCustomMessage(config.customMetadata?.defaultMessage || '');
      } else {
        // Initialize with defaults using store branding
        const defaultImage = currentDispensary.storeImage || currentDispensary.storeIcon;
        const defaultPlatformImages: Partial<Record<SocialPlatform, string>> = defaultImage ? {
          facebook: defaultImage,
          twitter: defaultImage,
          linkedin: defaultImage,
          whatsapp: defaultImage,
          telegram: defaultImage,
          instagram: defaultImage,
          tiktok: defaultImage,
          email: defaultImage,
          sms: defaultImage,
        } : {};
        
        const defaultConfig: ShareConfig = {
          title: `Check out ${currentDispensary.dispensaryName}!`,
          description: `Visit my wellness store for quality products and great service.`,
          preferredPlatforms: ['facebook', 'whatsapp', 'instagram'],
          platformImages: defaultPlatformImages,
          customMetadata: {
            hashtags: ['wellness', 'natural', 'health'],
            defaultMessage: `🌿 Check out my store!\n\n`,
          },
        };
        setShareConfig(defaultConfig);
        setCustomMessage(defaultConfig.customMetadata?.defaultMessage || '');
      }

      // Load stats
      await loadStats();
    } catch (error) {
      console.error('Error loading share data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load share data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentDispensary?.id) return;

    try {
      const eventsRef = collection(db, `dispensaries/${currentDispensary.id}/shareAnalytics`);
      const eventsSnap = await getDocs(eventsRef);
      
      const events = eventsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp)
        } as ShareAnalytics;
      });
      setShareAnalytics(events);
      
      // Calculate stats
      const totalShares = events.length;
      const sharesByPlatform: Record<SocialPlatform, number> = {
        facebook: 0, twitter: 0, linkedin: 0, whatsapp: 0,
        telegram: 0, instagram: 0, tiktok: 0, email: 0, sms: 0,
      };
      const clicksByPlatform: Record<SocialPlatform, number> = { ...sharesByPlatform };
      let totalClicks = 0;

      events.forEach(event => {
        sharesByPlatform[event.platform]++;
        const clicks = event.clicks || 0;
        clicksByPlatform[event.platform] += clicks;
        totalClicks += clicks;
      });

      const topPlatform = Object.entries(sharesByPlatform)
        .sort((a, b) => b[1] - a[1])[0];

      // Check achievements
      const oldAchievements = checkAchievements(sharesByPlatform, totalShares, totalClicks);

      // Calculate consecutive days (simplified - you may want more sophisticated logic)
      const consecutiveDays = 0; // TODO: Implement proper consecutive days tracking

      setShareStats({
        totalShares,
        sharesByPlatform,
        totalClicks,
        clicksByPlatform,
        topPerformer: (topPlatform?.[0] as SocialPlatform) || 'facebook',
        achievements: oldAchievements.map(a => ({
          id: a.id as any,
          title: a.title || '',
          description: a.description || '',
          type: a.id as any,
          icon: a.icon || '🏆',
          unlockedAt: a.unlockedAt instanceof Date ? a.unlockedAt : a.unlockedAt?.toDate?.() || new Date(),
          progress: 100,
          target: 100
        })),
        lastShareDate: events[events.length - 1]?.timestamp,
        consecutiveDays,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const checkAchievements = (
    sharesByPlatform: Record<SocialPlatform, number>,
    totalShares: number,
    totalClicks: number
  ): Achievement[] => {
    const achievements: Achievement[] = [];

    // First share
    if (totalShares >= 1) {
      achievements.push({ ...achievementDefinitions.first_share, unlockedAt: new Date() });
    }

    // Social butterfly (5+ platforms)
    const platformsUsed = Object.values(sharesByPlatform).filter(count => count > 0).length;
    if (platformsUsed >= 5) {
      achievements.push({ ...achievementDefinitions.social_butterfly, unlockedAt: new Date() });
    }

    // Century club (100 shares)
    if (totalShares >= 100) {
      achievements.push({ ...achievementDefinitions.century_club, unlockedAt: new Date() });
    }

    // Viral master (1000+ clicks)
    if (totalClicks >= 1000) {
      achievements.push({ ...achievementDefinitions.viral_master, unlockedAt: new Date() });
    }

    // Omni-channel (all platforms)
    if (platformsUsed === 9) {
      achievements.push({ ...achievementDefinitions.omni_channel, unlockedAt: new Date() });
    }

    return achievements;
  };

  const handleShare = async (platform: SocialPlatform) => {
    if (!currentDispensary?.id) return;

    const message = customMessage + storeUrl;
    const title = shareConfig.title;
    
    let shareUrl = '';

    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(customMessage || title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storeUrl)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(customMessage || title)}`;
        break;
      case 'email':
        shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`;
        break;
      case 'sms':
        shareUrl = `sms:?body=${encodeURIComponent(message)}`;
        break;
      case 'instagram':
      case 'tiktok':
        // Copy to clipboard
        await copyToClipboard(storeUrl, platform);
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      await logShare(platform);
      celebrateShare();
    }
  };

  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
      toast({
        title: 'Link Copied!',
        description: `Store URL copied to clipboard`,
      });
      await logShare(platform as SocialPlatform);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const logShare = async (platform: SocialPlatform) => {
    if (!currentDispensary?.id) return;

    try {
      const eventRef = collection(db, `dispensaries/${currentDispensary.id}/shareAnalytics`);
      await addDoc(eventRef, {
        dispensaryId: currentDispensary.id,
        platform,
        timestamp: Timestamp.now(),
        clicks: 0,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error('Error logging share:', error);
    }
  };

  const celebrateShare = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#006B3E', '#3D2E17', '#FFD700'],
    });

    toast({
      title: '🎉 Awesome!',
      description: 'Your store is being shared!',
    });
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `${currentDispensary?.dispensaryName}-QR-Code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast({
        title: 'QR Code Downloaded!',
        description: 'Share it on flyers, business cards, and more!',
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePowerShare = async () => {
    const platforms: SocialPlatform[] = ['facebook', 'twitter', 'linkedin', 'whatsapp'];
    
    for (const platform of platforms) {
      await handleShare(platform);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.5 },
      colors: ['#006B3E', '#3D2E17', '#FFD700', '#FF6B6B'],
    });

    toast({
      title: '🚀 POWER SHARE ACTIVATED!',
      description: 'Sharing to all major platforms!',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-[#006B3E]/10 to-[#3D2E17]/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-[#006B3E] to-[#3D2E17] shadow-lg">
              <Share2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black text-[#3D2E17] flex items-center gap-2">
                Share & Grow Hub
                <Sparkles className="h-6 w-6 text-[#006B3E] animate-pulse" />
              </DialogTitle>
              <DialogDescription className="text-[#5D4E37] font-bold">
                Amplify your reach across all platforms
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)} className="flex-1">
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-5 bg-muted">
              <TabsTrigger value="share" className="font-bold">
                <Rocket className="h-4 w-4 mr-2" />
                Share
              </TabsTrigger>
              <TabsTrigger value="analytics" className="font-bold">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="achievements" className="font-bold">
                <Trophy className="h-4 w-4 mr-2" />
                Achievements
              </TabsTrigger>
              <TabsTrigger value="schedule" className="font-bold">
                <CalendarClock className="h-4 w-4 mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="font-bold">
                <TrendingUp className="h-4 w-4 mr-2" />
                Leaderboard
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(95vh-200px)] px-6">
            <TabsContent value="share" className="space-y-6 pb-6">
              {/* Custom Images Button */}
              <Button
                onClick={() => setShowImageUpload(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-lg"
              >
                <ImageIcon className="h-5 w-5 mr-2" />
                Customize Share Images
                <Sparkles className="h-4 w-4 ml-2" />
              </Button>

              {/* Store URL Card */}
              <Card className="bg-gradient-to-br from-[#006B3E]/10 to-[#3D2E17]/10 border-[#006B3E]/30 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
                    <Target className="h-5 w-5 text-[#006B3E]" />
                    Your Store URL
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      value={storeUrl}
                      readOnly
                      className="font-mono text-sm bg-white"
                    />
                    <Button
                      onClick={() => copyToClipboard(storeUrl, 'direct')}
                      variant="outline"
                      className="shrink-0"
                    >
                      {copiedPlatform === 'direct' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div>
                    <Label className="text-[#3D2E17] font-bold">Custom Message (Optional)</Label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Add a personalized message..."
                      className="mt-2 bg-white"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Power Share Button */}
              <Button
                onClick={handlePowerShare}
                size="lg"
                className="w-full bg-gradient-to-r from-[#006B3E] to-[#3D2E17] hover:from-[#005230] hover:to-[#2D1E0F] text-white font-black text-lg py-6 shadow-xl transform transition-all hover:scale-105"
              >
                <Zap className="h-6 w-6 mr-2 animate-pulse" />
                POWER SHARE (All Platforms)
                <Zap className="h-6 w-6 ml-2 animate-pulse" />
              </Button>

              {/* Platform Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(platformConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <Card
                      key={key}
                      className="group cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1 bg-gradient-to-br from-white to-muted border-2 border-border hover:border-[#006B3E]"
                      onClick={() => handleShare(key as SocialPlatform)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-lg bg-gradient-to-br ${config.gradient} shadow-md group-hover:scale-110 transition-transform`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          {copiedPlatform === key && (
                            <Badge className="bg-green-500 text-white animate-in fade-in slide-in-from-top-1">
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-black text-[#3D2E17] group-hover:text-[#006B3E] transition-colors">
                          {config.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-semibold text-[#5D4E37]">
                          {config.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full group-hover:bg-[#006B3E] group-hover:text-white transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(key as SocialPlatform);
                          }}
                        >
                          {key === 'instagram' || key === 'tiktok' ? 'Copy Link' : 'Share Now'}
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* QR Code Section */}
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-purple-600" />
                    QR Code
                  </CardTitle>
                  <CardDescription className="font-semibold">
                    Share offline with QR codes on flyers, business cards, and storefront
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showQRCode ? (
                    <Button
                      onClick={() => setShowQRCode(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                    >
                      Generate QR Code
                      <QrCode className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-white rounded-lg shadow-md">
                        <QRCodeSVG
                          id="qr-code-svg"
                          value={storeUrl}
                          size={200}
                          level="H"
                          includeMargin
                          fgColor="#3D2E17"
                        />
                      </div>
                      <Button
                        onClick={downloadQRCode}
                        variant="outline"
                        className="font-bold"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download QR Code
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 pb-6">
              {shareStats ? (
                <>
                  {/* Export Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => exportAnalyticsToCSV(shareAnalytics, currentDispensary?.dispensaryName || 'Dispensary')}
                      variant="outline"
                      className="flex-1 font-bold border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Analytics
                    </Button>
                    <Button
                      onClick={() => exportStatsToCSV(shareStats, currentDispensary?.dispensaryName || 'Dispensary')}
                      variant="outline"
                      className="flex-1 font-bold border-[#3D2E17] text-[#3D2E17] hover:bg-[#3D2E17] hover:text-white"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export Summary
                    </Button>
                  </div>

                  {/* Performance Score */}
                  <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-600" />
                        Performance Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-5xl font-black text-[#006B3E]">
                          {calculatePerformanceScore(shareStats)}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-yellow-600">
                            {getPerformanceRank(calculatePerformanceScore(shareStats)).rank}
                          </div>
                          <div className="text-sm text-[#5D4E37] font-semibold">out of 100</div>
                        </div>
                      </div>
                      <div className="text-xs text-[#5D4E37] font-semibold space-y-1">
                        <div>📊 Formula: Shares×10 + Clicks×5 + ConsecutiveDays×20 + Achievements×50</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-[#006B3E]/10 to-[#006B3E]/20 border-[#006B3E]/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-[#5D4E37]">Total Shares</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-black text-[#006B3E]">{shareStats.totalShares}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-blue-900">Total Clicks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-black text-blue-600">{shareStats.totalClicks}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-purple-900">Top Platform</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-black text-purple-600 capitalize">
                          {shareStats.topPerformer || 'N/A'}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Platform Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl font-black text-[#3D2E17]">Platform Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(shareStats.sharesByPlatform)
                        .filter(([_, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([platform, count]) => {
                          const config = platformConfig[platform as SocialPlatform];
                          const Icon = config.icon;
                          const clicks = shareStats.clicksByPlatform[platform as SocialPlatform];
                          return (
                            <div key={platform} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient}`}>
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <div className="font-bold text-[#3D2E17]">{config.name}</div>
                                  <div className="text-xs text-[#5D4E37]">{clicks} clicks</div>
                                </div>
                              </div>
                              <div className="text-2xl font-black text-[#006B3E]">{count}</div>
                            </div>
                          );
                        })}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="p-8 text-center">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-black text-[#3D2E17] mb-2">No Data Yet</h3>
                  <p className="text-[#5D4E37] font-semibold">Start sharing to see your analytics!</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6 pb-6">
              {/* Schedule Share Button */}
              <Button
                onClick={() => setShowScheduleDialog(true)}
                className="w-full bg-gradient-to-r from-[#006B3E] to-[#3D2E17] hover:from-[#006B3E]/90 hover:to-[#3D2E17]/90 text-white font-bold shadow-lg"
              >
                <CalendarPlus className="h-5 w-5 mr-2" />
                Schedule New Share
                <Clock className="h-4 w-4 ml-2" />
              </Button>

              {/* Scheduled Shares List */}
              <ScheduledSharesList
                dispensaryId={currentDispensary?.id || ''}
                scheduledShares={scheduledShares}
                onRefresh={() => {
                  // Reload scheduled shares
                  if (currentDispensary?.id) {
                    const scheduledRef = collection(db, 'dispensaries', currentDispensary.id, 'scheduledShares');
                    const q = query(scheduledRef, orderBy('scheduledFor', 'asc'));
                    getDocs(q).then(snapshot => {
                      const shares = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                      })) as ScheduledShare[];
                      setScheduledShares(shares);
                    });
                  }
                }}
              />
            </TabsContent>

            <TabsContent value="leaderboard" className="space-y-6 pb-6">
              {currentDispensary?.id && shareStats && (
                <SharePerformanceLeaderboard 
                  currentDispensaryId={currentDispensary.id}
                  currentDispensaryName={currentDispensary.dispensaryName}
                  currentStats={shareStats}
                />
              )}
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(achievementDefinitions).map((achievement) => {
                  const unlocked = shareStats?.achievements.some(a => a.id === achievement.id);
                  return (
                    <Card
                      key={achievement.id}
                      className={`transition-all ${
                        unlocked
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400 shadow-lg'
                          : 'bg-muted/50 border-border opacity-60'
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`text-4xl ${unlocked ? 'animate-bounce' : 'grayscale'}`}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-black text-[#3D2E17] flex items-center gap-2">
                              {achievement.title}
                              {unlocked && <Crown className="h-4 w-4 text-yellow-600" />}
                            </CardTitle>
                            <CardDescription className="font-semibold">
                              {achievement.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>

      {/* Schedule Share Dialog */}
      <ScheduleShareDialog
        isOpen={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        storeUrl={storeUrl}
        dispensaryId={currentDispensary?.id || ''}
      />

      {/* Custom Share Images Dialog */}
      <CustomShareImages
        isOpen={showImageUpload}
        onOpenChange={setShowImageUpload}
        dispensaryId={currentDispensary?.id || ''}
        currentImages={shareConfig.platformImages || {}}
        onImagesUpdated={(updatedImages) => {
          setShareConfig(prev => ({
            ...prev,
            platformImages: updatedImages
          }));
        }}
      />
    </Dialog>
  );
}
