import { Timestamp } from 'firebase/firestore';

export type VideoSource = 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'vimeo' | 'dailymotion' | 'twitter' | 'direct';

export interface EducationalVideo {
  id?: string;
  title: string;
  description: string;
  videoUrl: string;
  embedCode?: string; // Custom embed code for videos
  thumbnailUrl?: string;
  source: VideoSource;
  dispensaryType: string; // e.g., 'cannibinoid', 'traditional-medicine', 'homeopathy', etc.
  isActive: boolean;
  order: number;
  duration?: string; // e.g., "5:23"
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface VideoLibrarySettings {
  isEnabled: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}
