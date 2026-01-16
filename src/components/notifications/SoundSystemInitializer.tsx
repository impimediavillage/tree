'use client';

import { useEffect } from 'react';
import { initializeSoundSystem } from '@/lib/notificationService';

/**
 * 🔊 Sound System Initializer
 * Preloads notification sounds on app startup
 */
export function SoundSystemInitializer() {
  useEffect(() => {
    // Initialize sound system with all notification sounds (async with Cache API)
    initializeSoundSystem()
      .then(() => {
        console.log('🔊 Notification sound system initialized with caching');
      })
      .catch((error) => {
        console.error('❌ Failed to initialize sound system:', error);
      });
  }, []);

  // This component renders nothing
  return null;
}
