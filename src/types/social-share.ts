// Social Share Types
export type SocialPlatform = 
  | 'facebook' 
  | 'twitter' 
  | 'linkedin' 
  | 'whatsapp' 
  | 'telegram' 
  | 'instagram' 
  | 'tiktok'
  | 'email' 
  | 'sms';

export type ShareAchievementType = 
  | 'first-share'
  | 'social-butterfly' // 10 shares
  | 'influencer' // 50 shares
  | 'viral-legend' // 100 shares
  | 'omni-channel' // Shared to all platforms
  | 'weekly-warrior'; // Shared 7 days in a row

export interface ShareConfig {
  title: string;
  description: string;
  shareImage?: string;
  platformImages?: Partial<Record<SocialPlatform, string>>; // Custom images per platform
  preferredPlatforms: SocialPlatform[];
  customMetadata?: Record<string, any>;
  updatedAt?: Date;
}

export interface ScheduledShare {
  id?: string;
  platform: SocialPlatform;
  message: string;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: Date;
  sentAt?: Date;
}

export interface ShareAnalytics {
  id?: string;
  platform: SocialPlatform;
  timestamp: Date;
  clicks?: number;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface ShareAchievement {
  id: string;
  type: ShareAchievementType;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
  target: number;
}

export interface ShareStats {
  totalShares: number;
  sharesByPlatform: Record<SocialPlatform, number>;
  totalClicks: number;
  clicksByPlatform: Record<SocialPlatform, number>;
  achievements: ShareAchievement[];
  lastShareDate?: Date;
  consecutiveDays: number;
  topPerformer?: SocialPlatform;
}

export interface PlatformConfig {
  name: string;
  platform: SocialPlatform;
  color: string;
  icon: string; // Lucide icon name
  shareUrl: (url: string, text: string) => string;
  supportsDirectShare: boolean;
  ogImageSize?: { width: number; height: number };
  copyInstruction?: string;
}
