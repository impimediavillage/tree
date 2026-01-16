/**
 * 🔊 Sound Cache Service
 * Pre-caches all notification sounds for offline use and guaranteed playback
 */

import type { NotificationSound } from '@/types/notification';

const CACHE_NAME = 'wellness-tree-sounds-v1';
const SOUND_FILES: Record<NotificationSound, string> = {
  'ka-ching': '/sounds/ka-ching.mp3',
  'coin-drop': '/sounds/coin-drop.mp3',
  'success-chime': '/sounds/success-chime.mp3',
  'vroom': '/sounds/vroom.mp3',
  'package-ready': '/sounds/package-ready.mp3',
  'level-up': '/sounds/level-up.mp3',
  'delivered': '/sounds/delivered.mp3',
  'nearby': '/sounds/nearby.mp3',
  'notification-pop': '/sounds/notification-pop.mp3',
};

/**
 * Check if sound files are already cached
 */
async function areSoundsCached(): Promise<boolean> {
  if (!('caches' in window)) return false;
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const soundUrls = Object.values(SOUND_FILES);
    
    // Check if all sound files are cached
    for (const soundUrl of soundUrls) {
      const cached = keys.some(req => req.url.includes(soundUrl));
      if (!cached) return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking sound cache:', error);
    return false;
  }
}

/**
 * Pre-cache all sound files using Cache API
 */
export async function cacheSoundFiles(): Promise<void> {
  // Only works in browsers that support Cache API
  if (!('caches' in window)) {
    console.warn('Cache API not supported - sounds will load on-demand');
    return;
  }
  
  try {
    // Check if already cached
    const alreadyCached = await areSoundsCached();
    if (alreadyCached) {
      console.log('🔊 All sound files already cached');
      return;
    }
    
    console.log('🔊 Pre-caching sound files...');
    
    const cache = await caches.open(CACHE_NAME);
    const soundUrls = Object.values(SOUND_FILES);
    
    // Fetch and cache all sounds in parallel
    const fetchPromises = soundUrls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log(`✅ Cached: ${url}`);
        } else {
          console.warn(`⚠️ Failed to cache ${url}: ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ Error caching ${url}:`, error);
      }
    });
    
    await Promise.all(fetchPromises);
    console.log('🔊 Sound file caching complete');
    
  } catch (error) {
    console.error('Error pre-caching sound files:', error);
  }
}

/**
 * Clear sound cache (useful for updates)
 */
export async function clearSoundCache(): Promise<void> {
  if (!('caches' in window)) return;
  
  try {
    const deleted = await caches.delete(CACHE_NAME);
    if (deleted) {
      console.log('🗑️ Sound cache cleared');
    }
  } catch (error) {
    console.error('Error clearing sound cache:', error);
  }
}

/**
 * Get cache info (for debugging/settings)
 */
export async function getSoundCacheInfo(): Promise<{
  supported: boolean;
  cached: boolean;
  totalFiles: number;
  cachedFiles: number;
}> {
  const totalFiles = Object.keys(SOUND_FILES).length;
  
  if (!('caches' in window)) {
    return {
      supported: false,
      cached: false,
      totalFiles,
      cachedFiles: 0,
    };
  }
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const soundUrls = Object.values(SOUND_FILES);
    
    let cachedFiles = 0;
    for (const soundUrl of soundUrls) {
      const cached = keys.some(req => req.url.includes(soundUrl));
      if (cached) cachedFiles++;
    }
    
    return {
      supported: true,
      cached: cachedFiles === totalFiles,
      totalFiles,
      cachedFiles,
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return {
      supported: true,
      cached: false,
      totalFiles,
      cachedFiles: 0,
    };
  }
}

/**
 * Verify all sounds are accessible
 */
export async function verifySoundFiles(): Promise<{
  sound: string;
  available: boolean;
  cached: boolean;
}[]> {
  const results = await Promise.all(
    Object.entries(SOUND_FILES).map(async ([name, url]) => {
      let available = false;
      let cached = false;
      
      try {
        const response = await fetch(url, { method: 'HEAD' });
        available = response.ok;
        
        if ('caches' in window) {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(url);
          cached = !!cachedResponse;
        }
      } catch (error) {
        console.error(`Error checking ${name}:`, error);
      }
      
      return { sound: name, available, cached };
    })
  );
  
  return results;
}
