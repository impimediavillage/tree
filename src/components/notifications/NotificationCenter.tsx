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
      }
    );

    // Load preferences
    getUserNotificationPreferences(currentUser.uid).then(setPreferences);

    return unsubscribe;
  }, [currentUser?.uid]);

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
      <SheetContent side="right" className="w-full sm:w-[540px] p-0">
        <SheetHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-black">Notification Center</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex items-center justify-between mt-4 bg-blue-50 rounded-lg p-3">
              <p className="text-sm font-semibold text-blue-900">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            </div>
          )}
        </SheetHeader>

        {/* Filters */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="order">💰 Orders</SelectItem>
                <SelectItem value="payment">💳 Payments</SelectItem>
                <SelectItem value="shipment">🚚 Shipping</SelectItem>
                <SelectItem value="achievement">🏆 Achievements</SelectItem>
                <SelectItem value="product">📦 Products</SelectItem>
                <SelectItem value="influencer">🌟 Influencer</SelectItem>
                <SelectItem value="treehouse">🎨 Treehouse</SelectItem>
                <SelectItem value="system">⚙️ System</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground mb-2">
                {searchQuery || filterType !== 'all' || filterRead !== 'all'
                  ? 'No notifications found'
                  : 'No notifications yet'}
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || filterType !== 'all' || filterRead !== 'all'
                  ? 'Try adjusting your filters'
                  : "You'll be notified when something important happens"}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {groupedNotifications.map(([groupName, groupNotifications]) => (
                <div key={groupName}>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    {groupName}
                  </h4>
                  <div className="space-y-2">
                    {groupNotifications.map((notification) => (
                      <motion.button
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full p-4 rounded-lg text-left hover:shadow-md transition-all ${
                          !notification.read
                            ? 'bg-blue-50 border-2 border-blue-200'
                            : 'bg-muted/30 border border-border'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 text-3xl">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className={`text-sm font-bold ${
                                !notification.read ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {format(
                                  notification.createdAt?.toDate?.() || new Date(notification.createdAt),
                                  'MMM d, yyyy h:mm a'
                                )}
                              </p>
                              
                              {notification.priority === 'critical' && (
                                <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                  Urgent
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              router.push('/dashboard/leaf/settings?tab=notifications');
              onClose();
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Notification Settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
