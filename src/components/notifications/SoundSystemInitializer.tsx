'use client';

import { useEffect } from 'react';
import { initializeSoundSystem } from '@/lib/notificationService';

/**
 * 🔊 Sound System Initializer
 * Preloads notification sounds on app startup
 */
export function SoundSystemInitializer() {
  useEffect(() => {
    // Initialize sound system with all notification sounds
    initializeSoundSystem();
    console.log('🔊 Notification sound system initialized');
  }, []);

  // This component renders nothing
  return null;
}
