/**
 * Social Media Platform Types and Interfaces
 */

export type SocialPlatform = 
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'sms';

export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';

export type AuthMethod = 'oauth' | 'api_key' | 'credentials' | 'webhook';

/**
 * Social Media Account Configuration
 * Stored per dispensary in Firestore: dispensaries/{id}/socialAccounts/{platform}
 */
export interface SocialMediaAccount {
  id?: string;
  dispensaryId: string;
  platform: SocialPlatform;
  authMethod: AuthMethod;
  status: ConnectionStatus;
  
  // Display Information
  username?: string;
  profileName?: string;
  profilePicture?: string;
  accountId?: string; // Platform-specific account ID
  
  // Encrypted Credentials (stored in Firestore with encryption)
  // For OAuth platforms
  accessToken?: string; // Encrypted
  refreshToken?: string; // Encrypted
  tokenExpiry?: Date;
  scopes?: string[];
  
  // For API Key platforms
  apiKey?: string; // Encrypted
  apiSecret?: string; // Encrypted
  
  // For platforms requiring credentials (last resort, encrypted)
  encryptedCredentials?: string; // JSON string of {username, password/token}
  
  // Posting Capabilities
  canPost: boolean;
  canPostImages: boolean;
  canPostVideos: boolean;
  canSchedule: boolean;
  maxCharacters?: number;
  
  // Usage Stats
  postsCount?: number;
  lastPostAt?: Date;
  lastSyncAt?: Date;
  errorCount?: number;
  lastError?: string;
  
  // Metadata
  connectedAt: Date;
  connectedBy: string; // User ID who connected
  updatedAt: Date;
  isActive: boolean;
}

/**
 * Social Post Data
 */
export interface SocialPost {
  id?: string;
  dispensaryId: string;
  createdBy: string;
  
  // Content
  message: string;
  imageUrls?: string[];
  videoUrl?: string;
  link?: string;
  hashtags?: string[];
  
  // Targeting
  platforms: SocialPlatform[];
  scheduledFor?: Date;
  
  // Platform-specific content overrides
  platformContent?: {
    [key in SocialPlatform]?: {
      message?: string;
      hashtags?: string[];
    };
  };
  
  // Status Tracking
  status: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed';
  postResults?: {
    [key in SocialPlatform]?: {
      status: 'success' | 'failed' | 'pending';
      postId?: string;
      postUrl?: string;
      error?: string;
      postedAt?: Date;
    };
  };
  
  // Analytics
  analytics?: {
    [key in SocialPlatform]?: {
      views?: number;
      likes?: number;
      comments?: number;
      shares?: number;
      clicks?: number;
      lastUpdated?: Date;
    };
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Platform Configuration
 */
export interface PlatformConfig {
  platform: SocialPlatform;
  name: string;
  icon: string;
  color: string;
  authMethod: AuthMethod;
  requiresOAuth: boolean;
  supportsScheduling: boolean;
  maxCharacters: number;
  supportsImages: boolean;
  supportsVideos: boolean;
  supportsHashtags: boolean;
  setupInstructions: string;
  docsUrl?: string;
}

/**
 * Social Account Connection Request
 */
export interface ConnectAccountRequest {
  dispensaryId: string;
  platform: SocialPlatform;
  authMethod: AuthMethod;
  
  // For OAuth
  authCode?: string;
  redirectUri?: string;
  
  // For API Key
  apiKey?: string;
  apiSecret?: string;
  
  // For Direct Credentials (will be encrypted server-side)
  username?: string;
  password?: string;
  token?: string;
}

/**
 * Post to Social Media Request
 */
export interface PostToSocialRequest {
  dispensaryId: string;
  platforms: SocialPlatform[];
  message: string;
  imageUrls?: string[];
  videoUrl?: string;
  link?: string;
  hashtags?: string[];
  scheduledFor?: Date;
  platformContent?: SocialPost['platformContent'];
}
