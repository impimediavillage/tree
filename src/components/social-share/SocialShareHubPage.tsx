'use client';

import { useState, useEffect } from 'react';
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
  CalendarClock, Award, ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import type { ShareConfig, ShareStats, ShareAnalytics, ScheduledShare } from '@/types/social-share';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { ScheduleShareDialog, ScheduledSharesList } from './ScheduleShare';
import { CustomShareImages } from './CustomShareImages';
import { SharePerformanceLeaderboard } from './Leaderboard';
import { exportAnalyticsToCSV, exportStatsToCSV, calculatePerformanceScore, getPerformanceRank } from '@/lib/social-share-utils';

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
    description: 'Post on X (formerly Twitter)',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    gradient: 'from-blue-600 to-blue-700',
    description: 'Share on your professional network',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    gradient: 'from-green-500 to-green-600',
    description: 'Send via WhatsApp',
  },
  telegram: {
    name: 'Telegram',
    icon: Send,
    color: '#0088cc',
    gradient: 'from-cyan-500 to-blue-500',
    description: 'Share on Telegram',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    description: 'Share on Instagram Stories',
  },
  tiktok: {
    name: 'TikTok',
    icon: Music,
    color: '#000000',
    gradient: 'from-cyan-400 via-pink-500 to-black',
    description: 'Post on TikTok',
  },
  email: {
    name: 'Email',
    icon: Mail,
    color: '#EA4335',
    gradient: 'from-red-500 to-red-600',
    description: 'Send via email',
  },
  sms: {
    name: 'SMS',
    icon: Smartphone,
    color: '#34A853',
    gradient: 'from-green-400 to-green-600',
    description: 'Share via text message',
  },
};

export function SocialShareHubPage() {
  const { currentDispensary, currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
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

  // Load share data on mount
  useEffect(() => {
    if (currentDispensary?.id) {
      loadShareData();
      loadScheduledShares();
      loadShareAnalytics();
    }
  }, [currentDispensary?.id]);

  const loadScheduledShares = async () => {
    if (!currentDispensary?.id) return;
    try {
      const scheduledRef = collection(db, 'dispensaries', currentDispensary.id, 'scheduledShares');
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

  const loadShareAnalytics = async () => {
    if (!currentDispensary?.id) return;
    try {
      const analyticsRef = collection(db, 'dispensaries', currentDispensary.id, 'shareAnalytics');
      const q = query(analyticsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      const analytics = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShareAnalytics[];
      setShareAnalytics(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadShareData = async () => {
    // Load share config and stats implementation
    // ... (rest of the loadShareData function from SocialShareHub.tsx)
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dispensary-admin/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-[#006B3E] to-[#005230] rounded-xl">
            <Share2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Social Share Hub</h1>
            <p className="text-muted-foreground">
              Amplify your reach across all social platforms 🚀
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Same tabs structure as dialog */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="share">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="mr-2 h-4 w-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Crown className="mr-2 h-4 w-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* Share Tab Content */}
        <TabsContent value="share" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Share</CardTitle>
              <CardDescription>
                Share your store across multiple platforms with one click
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Social share functionality coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs placeholder */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Share Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Analytics data coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Achievements coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Shares</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Schedule feature coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Share Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Leaderboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showScheduleDialog && currentDispensary && (
        <ScheduleShareDialog
          isOpen={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          dispensaryId={currentDispensary.id!}
          storeUrl={storeUrl}
        />
      )}

      {showImageUpload && currentDispensary && (
        <CustomShareImages
          isOpen={showImageUpload}
          onOpenChange={setShowImageUpload}
          dispensaryId={currentDispensary.id!}
          currentImages={shareConfig.platformImages || {}}
          onImagesUpdated={async (images) => {
            setShareConfig(prev => ({ ...prev, platformImages: images }));
            await loadShareData();
          }}
        />
      )}
    </div>
  );
}
