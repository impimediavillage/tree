import type { 
  SocialPlatform, 
  PlatformConfig, 
  ShareAchievementType,
  ShareAchievement 
} from '@/types/social-share';

export const PLATFORM_CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  facebook: {
    name: 'Facebook',
    platform: 'facebook',
    color: '#1877F2',
    icon: 'Facebook',
    shareUrl: (url: string, text: string) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    supportsDirectShare: true,
    ogImageSize: { width: 1200, height: 630 }
  },
  twitter: {
    name: 'X (Twitter)',
    platform: 'twitter',
    color: '#000000',
    icon: 'Twitter',
    shareUrl: (url: string, text: string) => 
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    supportsDirectShare: true,
    ogImageSize: { width: 1200, height: 600 }
  },
  linkedin: {
    name: 'LinkedIn',
    platform: 'linkedin',
    color: '#0A66C2',
    icon: 'Linkedin',
    shareUrl: (url: string, text: string) => 
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    supportsDirectShare: true,
    ogImageSize: { width: 1200, height: 627 }
  },
  whatsapp: {
    name: 'WhatsApp',
    platform: 'whatsapp',
    color: '#25D366',
    icon: 'MessageCircle',
    shareUrl: (url: string, text: string) => 
      `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + url)}`,
    supportsDirectShare: true
  },
  telegram: {
    name: 'Telegram',
    platform: 'telegram',
    color: '#26A5E4',
    icon: 'Send',
    shareUrl: (url: string, text: string) => 
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    supportsDirectShare: true
  },
  instagram: {
    name: 'Instagram',
    platform: 'instagram',
    color: '#E4405F',
    icon: 'Instagram',
    shareUrl: (url: string, text: string) => url,
    supportsDirectShare: false,
    copyInstruction: 'Copy the link and share it in your Instagram bio or story!'
  },
  tiktok: {
    name: 'TikTok',
    platform: 'tiktok',
    color: '#000000',
    icon: 'Music',
    shareUrl: (url: string, text: string) => url,
    supportsDirectShare: false,
    copyInstruction: 'Copy the link and add it to your TikTok bio or video description!'
  },
  email: {
    name: 'Email',
    platform: 'email',
    color: '#EA4335',
    icon: 'Mail',
    shareUrl: (url: string, text: string) => 
      `mailto:?subject=${encodeURIComponent('Check out this store!')}&body=${encodeURIComponent(text + '\n\n' + url)}`,
    supportsDirectShare: true
  },
  sms: {
    name: 'SMS',
    platform: 'sms',
    color: '#34C759',
    icon: 'MessageSquare',
    shareUrl: (url: string, text: string) => 
      `sms:?body=${encodeURIComponent(text + '\n\n' + url)}`,
    supportsDirectShare: true
  }
};

export const ACHIEVEMENT_CONFIGS: Record<ShareAchievementType, Omit<ShareAchievement, 'progress' | 'unlockedAt'>> = {
  'first-share': {
    id: 'first-share',
    type: 'first-share',
    title: '🎯 First Share',
    description: 'Shared your store for the first time!',
    icon: '🎯',
    target: 1
  },
  'social-butterfly': {
    id: 'social-butterfly',
    type: 'social-butterfly',
    title: '🦋 Social Butterfly',
    description: 'Shared your store 10 times',
    icon: '🦋',
    target: 10
  },
  'influencer': {
    id: 'influencer',
    type: 'influencer',
    title: '⭐ Influencer',
    description: 'Shared your store 50 times',
    icon: '⭐',
    target: 50
  },
  'viral-legend': {
    id: 'viral-legend',
    type: 'viral-legend',
    title: '👑 Viral Legend',
    description: 'Shared your store 100 times!',
    icon: '👑',
    target: 100
  },
  'omni-channel': {
    id: 'omni-channel',
    type: 'omni-channel',
    title: '🌐 Omni-Channel Master',
    description: 'Shared to all platforms',
    icon: '🌐',
    target: Object.keys(PLATFORM_CONFIGS).length
  },
  'weekly-warrior': {
    id: 'weekly-warrior',
    type: 'weekly-warrior',
    title: '🔥 Weekly Warrior',
    description: 'Shared 7 days in a row',
    icon: '🔥',
    target: 7
  }
};

export const DEFAULT_SHARE_TEMPLATES = [
  "🌿 Check out my wellness store on The Wellness Tree! Discover amazing products and services.",
  "✨ Explore natural wellness solutions at my store! Visit us on The Wellness Tree platform.",
  "🎁 Special products available now! Find everything you need for your wellness journey.",
  "💚 Supporting local wellness! Check out our unique collection on The Wellness Tree."
];
