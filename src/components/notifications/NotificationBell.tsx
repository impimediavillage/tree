/**
 * 🔔 Notification Bell - Top Navigation Component
 * Shows unread notification count and dropdown preview
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUserNotificationPreferences,
  updateNotificationPreferences,
  playNotificationSound,
} from '@/lib/notificationService';
import type { Notification, NotificationPreferences } from '@/types/notification';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface NotificationBellProps {
  onOpenCenter?: () => void;
}

export function NotificationBell({ onOpenCenter }: NotificationBellProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Subscribe to notifications
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToNotifications(
      currentUser.uid,
      (notification) => {
        setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep only latest 5
        
        // Play sound for new notification
        if (notification.sound && preferences?.enableSounds) {
          playNotificationSound(notification.sound, preferences);
        }
      },
      { limit: 5 }
    );

    // Load preferences
    getUserNotificationPreferences(currentUser.uid).then(setPreferences);

    return unsubscribe;
  }, [currentUser?.uid, preferences]);

  // Calculate unread count
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const handleNotificationClick = async (notification: Notification) => {
    await markNotificationAsRead(notification.id);
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.uid) return;
    await markAllNotificationsAsRead(currentUser.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleToggleSounds = async () => {
    if (!currentUser?.uid || !preferences) return;
    
    const newPrefs = { ...preferences, enableSounds: !preferences.enableSounds };
    await updateNotificationPreferences(currentUser.uid, newPrefs);
    setPreferences(newPrefs);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order': return '💰';
      case 'payment': return '💳';
      case 'shipment': return '🚚';
      case 'achievement': return '🏆';
      case 'product': return '📦';
      case 'influencer': return '🌟';
      case 'treehouse': return '🎨';
      default: return '🔔';
    }
  };

  if (!currentUser) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-accent"
        >
          <motion.div
            animate={unreadCount > 0 ? {
              rotate: [0, 15, -15, 15, 0],
            } : {}}
            transition={{
              duration: 0.5,
              repeat: unreadCount > 0 ? Infinity : 0,
              repeatDelay: 3,
            }}
          >
            {preferences?.enableSounds ? (
              <Bell className="h-5 w-5" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </motion.div>
          
          {/* Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0 bg-gradient-to-br from-white via-white/95 to-white/90 backdrop-blur-sm border-[#3D2E17]/20 shadow-2xl" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#3D2E17]/10 bg-gradient-to-r from-[#006B3E]/5 to-[#3D2E17]/5">
          <h3 className="font-black text-xl text-[#3D2E17]">Notifications</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleSounds}
              title={preferences?.enableSounds ? 'Mute sounds' : 'Enable sounds'}
              className="hover:bg-[#006B3E]/10 transition-all duration-200"
            >
              {preferences?.enableSounds ? (
                <Volume2 className="h-5 w-5 text-[#006B3E]" />
              ) : (
                <VolumeX className="h-5 w-5 text-[#3D2E17]/40" />
              )}
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-[#006B3E] hover:bg-[#006B3E]/10 transition-all duration-200"
              >
                Mark all read
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="hover:bg-red-500/10 transition-all duration-200"
            >
              <X className="h-5 w-5 text-[#3D2E17]/60 hover:text-red-500" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px] bg-white/50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="relative">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Bell className="h-16 w-16 text-[#3D2E17]/20" />
                </motion.div>
              </div>
              <p className="text-base font-bold text-[#3D2E17]/60 mt-4">
                No notifications yet
              </p>
              <p className="text-sm text-[#3D2E17]/40 mt-1">
                We'll notify you when something happens!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#3D2E17]/5">
              {notifications.map((notification) => (
                <motion.button
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left transition-all duration-200 ${
                    !notification.read 
                      ? 'bg-gradient-to-r from-blue-50/80 via-green-50/50 to-yellow-50/30 hover:from-blue-50 hover:via-green-50 hover:to-yellow-50 border-l-4 border-[#006B3E]' 
                      : 'bg-white/30 hover:bg-white/60'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 text-3xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-black text-[#3D2E17]">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <motion.div 
                            className="flex-shrink-0 w-3 h-3 bg-[#006B3E] rounded-full mt-1 shadow-lg"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                      </div>
                      
                      <p className="text-sm font-semibold text-[#3D2E17]/70 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <p className="text-xs font-bold text-[#006B3E]/60 mt-2">
                        {notification.createdAt && formatDistanceToNow(
                          notification.createdAt.toDate?.() || new Date(notification.createdAt),
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-[#3D2E17]/10 p-3 bg-gradient-to-r from-[#006B3E]/5 to-[#3D2E17]/5">
            <Button
              variant="ghost"
              className="w-full text-sm font-black text-[#006B3E] hover:text-[#005230] hover:bg-[#006B3E]/10 transition-all duration-200 hover:scale-105"
              onClick={() => {
                setIsOpen(false);
                onOpenCenter?.();
              }}
            >
              View All Notifications →
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
