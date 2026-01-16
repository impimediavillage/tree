/**
 * 🔔 Notification Permission Prompt Component
 * Beautiful prompt to request push notification permissions
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { requestFCMToken, getNotificationPermission, onForegroundMessage } from '@/lib/fcm-token-service';
import { playNotificationSound, showInAppToast } from '@/lib/notificationService';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const checkPermission = () => {
      const permission = getNotificationPermission();
      
      // Don't show if already granted or denied
      if (permission === 'granted') {
        setPermissionGranted(true);
        return;
      }
      
      if (permission === 'denied') {
        return;
      }

      // Don't show if user dismissed within last 7 days
      const lastDismissed = localStorage.getItem('notificationPromptDismissed');
      if (lastDismissed) {
        const dismissedDate = new Date(lastDismissed);
        const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return;
        }
      }

      // Show prompt after a short delay (better UX)
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    if (user) {
      checkPermission();
    }
  }, [user]);

  useEffect(() => {
    // Set up foreground message listener when permission is granted
    if (permissionGranted && user) {
      const unsubscribe = onForegroundMessage((payload) => {
        console.log('Foreground message:', payload);
        
        // Play sound if specified
        if (payload.data?.sound) {
          playNotificationSound(payload.data.sound);
        }

        // Show in-app toast
        const notification = {
          id: payload.data?.notificationId || Date.now().toString(),
          userId: user.uid,
          recipient_role: user.role || 'LeafUser',
          type: payload.data?.type || 'system',
          title: payload.notification?.title || payload.data?.title || 'Notification',
          message: payload.notification?.body || payload.data?.message || '',
          priority: payload.data?.priority || 'medium',
          sound: payload.data?.sound,
          animation: payload.data?.animation,
          read: false,
          actionUrl: payload.data?.actionUrl,
          createdAt: new Date(),
        };

        showInAppToast(notification as any);
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [permissionGranted, user]);

  const handleEnableNotifications = async () => {
    if (!user) return;

    setIsRequesting(true);

    try {
      const token = await requestFCMToken(user.uid);
      
      if (token) {
        setPermissionGranted(true);
        setShowPrompt(false);
        
        // Show success message
        console.log('🎉 Push notifications enabled!');
      } else {
        console.log('Failed to get FCM token');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('notificationPromptDismissed', new Date().toISOString());
  };

  if (!showPrompt || permissionGranted) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-6 right-6 z-50 max-w-md"
      >
        <Card className="shadow-2xl border-2 border-[#006B3E]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-[#006B3E] to-[#3D2E17] rounded-xl">
                <Bell className="h-6 w-6 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-extrabold text-xl text-[#3D2E17] mb-2 leading-tight">
                  Grow your roots
                </h3>
                <p className="text-sm text-[#5D4E37] mb-1">
                  Receive push notifications. Get instant alerts for new orders, shipment updates, and important messages even when the app is closed from
                </p>
                <p className="font-extrabold text-lg text-[#3D2E17] mb-4">
                  The Wellness Tree
                </p>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleEnableNotifications}
                    disabled={isRequesting}
                    className="bg-[#006B3E] hover:bg-[#005030] text-white font-bold flex-1"
                  >
                    {isRequesting ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Enabling...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Enable Notifications
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    className="border-[#3D2E17] text-[#3D2E17] hover:bg-[#3D2E17]/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3">
                  💡 You can change this anytime in your notification settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
