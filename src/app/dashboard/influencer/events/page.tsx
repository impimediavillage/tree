'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Radio, 
  Plus, 
  Calendar, 
  Clock,
  Trash2,
  Edit,
  Eye,
  Users,
  TrendingUp,
  Zap,
  PlayCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LiveEvent {
  id: string;
  influencerId: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  duration: number; // minutes
  platform: 'instagram' | 'facebook' | 'youtube' | 'tiktok';
  streamUrl?: string;
  isFlashSale: boolean;
  discountPercent?: number;
  featuredProducts: string[];
  stats: {
    registrations: number;
    attendees: number;
    sales: number;
    revenue: number;
  };
  status: 'upcoming' | 'live' | 'ended';
  createdAt: any;
}

export default function LiveEventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'liveShoppingEvents'),
        where('influencerId', '==', user.uid),
        orderBy('eventDate', 'desc')
      );

      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LiveEvent[];

      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({ variant: "destructive", description: "Failed to load events" });
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'liveShoppingEvents', id));
      toast({ description: "Event deleted successfully" });
      loadEvents();
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({ variant: "destructive", description: "Failed to delete event" });
    }
  };

  const updateStatus = async (event: LiveEvent, newStatus: 'upcoming' | 'live' | 'ended') => {
    try {
      await updateDoc(doc(db, 'liveShoppingEvents', event.id), {
        status: newStatus
      });

      toast({ description: `Event marked as ${newStatus}` });
      loadEvents();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ variant: "destructive", description: "Failed to update event status" });
    }
  };

  const getTotalStats = () => {
    return events.reduce((acc, event) => ({
      totalEvents: acc.totalEvents + 1,
      totalRegistrations: acc.totalRegistrations + event.stats.registrations,
      totalAttendees: acc.totalAttendees + event.stats.attendees,
      totalRevenue: acc.totalRevenue + event.stats.revenue,
    }), {
      totalEvents: 0,
      totalRegistrations: 0,
      totalAttendees: 0,
      totalRevenue: 0,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Upcoming
          </Badge>
        );
      case 'live':
        return (
          <Badge className="bg-red-600 text-white animate-pulse">
            <Radio className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Ended
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPlatformIcon = (platform: string) => {
    const iconClass = "w-4 h-4";
    switch (platform) {
      case 'instagram':
        return <Radio className={`${iconClass} text-pink-600`} />;
      case 'facebook':
        return <Radio className={`${iconClass} text-blue-600`} />;
      case 'youtube':
        return <PlayCircle className={`${iconClass} text-red-600`} />;
      case 'tiktok':
        return <Radio className={`${iconClass} text-black`} />;
      default:
        return <Radio className={iconClass} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getCountdown = (event: LiveEvent) => {
    const now = new Date();
    const eventDateTime = new Date(`${event.eventDate}T${event.eventTime}`);
    const diff = eventDateTime.getTime() - now.getTime();

    if (diff < 0) {
      return 'Started';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B3E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Shopping Events</h1>
          <p className="text-gray-600 mt-2">Schedule live streams and flash sales</p>
        </div>
        <Button 
          onClick={() => router.push('/dashboard/influencer/events/create')}
          className="bg-[#006B3E] hover:bg-[#005530]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Radio className="w-4 h-4" />
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {events.filter(e => e.status === 'upcoming').length} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Attendees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalAttendees}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalRegistrations} registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {events.reduce((sum, e) => sum + e.stats.sales, 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">From live events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Event Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#006B3E]">
              R{stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-2 border-[#006B3E] bg-gradient-to-r from-[#006B3E]/5 to-[#8B4513]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#006B3E]" />
            Live Shopping Benefits
          </CardTitle>
          <CardDescription>
            Engage your audience in real-time and boost sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-1">📺 Live Interaction</p>
              <p className="text-xs text-gray-600">
                Answer questions, demonstrate products, build trust
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-1">⚡ Flash Sales</p>
              <p className="text-xs text-gray-600">
                Create urgency with limited-time discounts
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="font-semibold mb-1">💰 Higher Conversions</p>
              <p className="text-xs text-gray-600">
                Live events convert 3-5x better than regular posts
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {events.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <Radio className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Schedule Your First Live Event</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Go live on your favorite platform and showcase products to your audience in real-time!
            </p>
            <Button 
              onClick={() => router.push('/dashboard/influencer/events/create')}
              className="bg-[#006B3E] hover:bg-[#005530]"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <Card key={event.id} className={`hover:shadow-lg transition-shadow ${
              event.status === 'live' ? 'border-2 border-red-500' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      {getStatusBadge(event.status)}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Event Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(event.eventDate)}</span>
                    <span className="text-gray-400">•</span>
                    <Clock className="w-4 h-4" />
                    <span>{event.eventTime}</span>
                    <span className="text-gray-400">({event.duration}min)</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    {getPlatformIcon(event.platform)}
                    <span className="capitalize">{event.platform}</span>
                    {event.isFlashSale && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="text-orange-600 font-semibold">
                          {event.discountPercent}% Flash Sale
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Countdown */}
                {event.status === 'upcoming' && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold">Starts in</p>
                    <p className="text-2xl font-bold text-blue-700">{getCountdown(event)}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-center pt-4 border-t">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-gray-600">
                      <Users className="w-3 h-3" />
                      <p className="text-xs font-semibold">{event.stats.registrations}</p>
                    </div>
                    <p className="text-xs text-gray-500">Registered</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <Eye className="w-3 h-3" />
                      <p className="text-xs font-semibold">{event.stats.attendees}</p>
                    </div>
                    <p className="text-xs text-gray-500">Attended</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-purple-600">
                      <TrendingUp className="w-3 h-3" />
                      <p className="text-xs font-semibold">{event.stats.sales}</p>
                    </div>
                    <p className="text-xs text-gray-500">Sales</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-[#006B3E]">
                      <Zap className="w-3 h-3" />
                      <p className="text-xs font-semibold">R{event.stats.revenue.toFixed(0)}</p>
                    </div>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  {event.status === 'upcoming' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => updateStatus(event, 'live')}
                    >
                      <Radio className="w-4 h-4 mr-1" />
                      Go Live
                    </Button>
                  )}
                  {event.status === 'live' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => updateStatus(event, 'ended')}
                    >
                      End Event
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/influencer/events/edit/${event.id}`)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(event.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this live event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteEvent(deleteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
