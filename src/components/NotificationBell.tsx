'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  sound?: string;
  read: boolean;
  actionUrl?: string;
  createdAt: any;
  showConfetti?: boolean;
}

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Subscribe to notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      let unread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({
          id: doc.id,
          ...data,
        } as Notification);

        if (!data.read) {
          unread++;
          // Play sound for new notifications
          if (data.sound && !data.read) {
            playNotificationSound(data.sound);
          }
        }
      });

      setNotifications(notifs);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const playNotificationSound = (soundName: string) => {
    try {
      const audio = new Audio(`/api/sounds/${soundName}.mp3`);
      audio.volume = 0.3;
      audio.play().catch((err) => {
        console.error('Error playing sound:', soundName, err);
      });
    } catch (error) {
      console.error('Error playing sound:', soundName, error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    setIsOpen(false);
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter((n) => !n.read);
    await Promise.all(
      unreadNotifs.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`cursor-pointer p-3 ${
                  !notification.read ? 'bg-blue-50 dark:bg-blue-950' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(
                        notification.priority
                      )}`}
                    >
                      {notification.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {notification.createdAt &&
                        formatDistanceToNow(notification.createdAt.toDate(), {
                          addSuffix: true,
                        })}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
