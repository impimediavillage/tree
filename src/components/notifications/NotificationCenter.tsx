/**
 * 📊 Notification Center - Full History Drawer
 * Complete notification management interface
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Search, Filter, Settings, Trash2, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { 
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUserNotificationPreferences,
  playNotificationSound,
} from '@/lib/notificationService';
import type { Notification, NotificationPreferences } from '@/types/notification';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Subscribe to notifications
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToNotifications(
      currentUser.uid,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);
        
        // Play sound for new notification
        if (notification.sound && preferences?.enableSounds) {
          playNotificationSound(notification.sound, preferences);
        }
      }
    );

    // Load preferences
    getUserNotificationPreferences(currentUser.uid).then(setPreferences);

    return unsubscribe;
  }, [currentUser?.uid, preferences]);

  // Filter notifications
  useEffect(() => {
    let filtered = [...notifications];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by read status
    if (filterRead === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filterRead === 'read') {
      filtered = filtered.filter(n => n.read);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filterType, filterRead, searchQuery]);

  const handleNotificationClick = async (notification: Notification) => {
    await markNotificationAsRead(notification.id);
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.uid) return;
    await markAllNotificationsAsRead(currentUser.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
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
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const groups: { [key: string]: Notification[] } = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      'This Month': [],
      Older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisMonth = new Date(today);
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    notifications.forEach(notification => {
      const date = notification.createdAt?.toDate?.() || new Date(notification.createdAt);
      
      if (date >= today) {
        groups.Today.push(notification);
      } else if (date >= yesterday) {
        groups.Yesterday.push(notification);
      } else if (date >= thisWeek) {
        groups['This Week'].push(notification);
      } else if (date >= thisMonth) {
        groups['This Month'].push(notification);
      } else {
        groups.Older.push(notification);
      }
    });

    return Object.entries(groups).filter(([, items]) => items.length > 0);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[540px] p-0 bg-gradient-to-br from-white via-white/95 to-white/90 backdrop-blur-sm">
        <SheetHeader className="p-6 border-b border-[#3D2E17]/10 bg-gradient-to-r from-[#006B3E]/5 to-[#3D2E17]/5">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-3xl font-black text-[#3D2E17]">Notification Center</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-red-500/10 transition-all duration-200">
              <X className="h-6 w-6 text-[#3D2E17]/60 hover:text-red-500" />
            </Button>
          </div>
          
          {unreadCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mt-4 bg-gradient-to-r from-blue-50 via-green-50 to-yellow-50 rounded-lg p-3 border-2 border-[#006B3E]/30 shadow-md"
            >
              <p className="text-sm font-black text-[#3D2E17]">
                🔔 You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
              <Button
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs font-bold bg-[#006B3E] hover:bg-[#005230] text-white transition-all duration-200 hover:scale-105"
              >
                Mark all read
              </Button>
            </motion.div>
          )}
        </SheetHeader>

        {/* Filters */}
        <div className="p-4 border-b border-[#3D2E17]/10 space-y-3 bg-white/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#006B3E]/60" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 font-bold text-[#3D2E17] border-[#3D2E17]/20 focus:border-[#006B3E] transition-all duration-200"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1 font-bold text-[#3D2E17] border-[#3D2E17]/20">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold">All Types</SelectItem>
                <SelectItem value="order" className="font-bold">💰 Orders</SelectItem>
                <SelectItem value="payment" className="font-bold">💳 Payments</SelectItem>
                <SelectItem value="shipment" className="font-bold">🚚 Shipping</SelectItem>
                <SelectItem value="achievement" className="font-bold">🏆 Achievements</SelectItem>
                <SelectItem value="product" className="font-bold">📦 Products</SelectItem>
                <SelectItem value="influencer" className="font-bold">🌟 Influencer</SelectItem>
                <SelectItem value="treehouse" className="font-bold">🎨 Treehouse</SelectItem>
                <SelectItem value="system" className="font-bold">⚙️ System</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="flex-1 font-bold text-[#3D2E17] border-[#3D2E17]/20">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold">All</SelectItem>
                <SelectItem value="unread" className="font-bold">Unread Only</SelectItem>
                <SelectItem value="read" className="font-bold">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[calc(100vh-280px)] bg-white/30">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
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
                <Bell className="h-20 w-20 text-[#3D2E17]/20" />
              </motion.div>
              <p className="text-xl font-black text-[#3D2E17]/70 mb-2 mt-6">
                {searchQuery || filterType !== 'all' || filterRead !== 'all'
                  ? 'No notifications found'
                  : 'No notifications yet'}
              </p>
              <p className="text-sm font-bold text-[#3D2E17]/40">
                {searchQuery || filterType !== 'all' || filterRead !== 'all'
                  ? 'Try adjusting your filters'
                  : "You'll be notified when something important happens"}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {groupedNotifications.map(([groupName, groupNotifications]) => (
                <div key={groupName}>
                  <h4 className="text-xs font-black text-[#006B3E] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="h-1 w-8 bg-gradient-to-r from-[#006B3E] to-transparent rounded-full" />
                    {groupName}
                  </h4>
                  <div className="space-y-2">
                    {groupNotifications.map((notification) => (
                      <motion.button
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                          !notification.read
                            ? 'bg-gradient-to-r from-blue-50/90 via-green-50/70 to-yellow-50/50 border-2 border-[#006B3E] shadow-lg hover:shadow-xl'
                            : 'bg-white/60 border border-[#3D2E17]/10 hover:bg-white/80 hover:shadow-md'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 text-3xl">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`text-sm font-black ${
                                !notification.read ? 'text-[#3D2E17]' : 'text-[#3D2E17]/60'
                              }`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <motion.div 
                                  className="flex-shrink-0 w-3 h-3 bg-[#006B3E] rounded-full mt-1 shadow-lg"
                                  animate={{ scale: [1, 1.3, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                />
                              )}
                            </div>
                            
                            <p className="text-sm font-semibold text-[#3D2E17]/70 mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-[#006B3E]/60">
                                {format(
                                  notification.createdAt?.toDate?.() || new Date(notification.createdAt),
                                  'MMM d, yyyy h:mm a'
                                )}
                              </p>
                              
                              {notification.priority === 'critical' && (
                                <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                                  ⚠️ Urgent
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#3D2E17]/10 bg-gradient-to-r from-[#006B3E]/5 to-[#3D2E17]/5 backdrop-blur-sm">
          <Button
            variant="outline"
            className="w-full font-black text-[#3D2E17] border-[#3D2E17]/30 hover:bg-[#006B3E]/10 hover:border-[#006B3E] transition-all duration-200 hover:scale-105"
            onClick={() => {
              router.push('/dashboard/leaf/settings?tab=notifications');
              onClose();
            }}
          >
            <Settings className="h-5 w-5 mr-2" />
            Notification Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
