'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Users,
  Heart,
  MessageCircle,
  Eye,
  EyeOff,
  Star,
  Sparkles,
  Clock,
  Video,
  Tag,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import type { DispensaryEvent } from '@/types/dispensary-events';

const EVENT_CATEGORIES = [
  { value: 'workshop', label: '🎓 Workshop', color: 'bg-purple-500' },
  { value: 'sale', label: '🛍️ Sale', color: 'bg-red-500' },
  { value: 'community', label: '🤝 Community', color: 'bg-blue-500' },
  { value: 'education', label: '📚 Education', color: 'bg-green-500' },
  { value: 'social', label: '🎉 Social', color: 'bg-pink-500' },
  { value: 'wellness', label: '🧘 Wellness', color: 'bg-teal-500' },
  { value: 'other', label: '✨ Other', color: 'bg-gray-500' },
];

export default function DispensaryEventsPage() {
  const { currentUser, currentDispensary } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [events, setEvents] = useState<DispensaryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    if (!currentDispensary?.id) return;

    try {
      setLoading(true);
      const eventsRef = collection(db, 'dispensaryEvents');
      const q = query(
        eventsRef,
        where('dispensaryId', '==', currentDispensary.id),
        orderBy('eventDate', 'desc')
      );

      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DispensaryEvent[];

      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDispensary?.id]);

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteDoc(doc(db, 'dispensaryEvents', eventId));
      toast({
        title: 'Event deleted',
        description: 'Event has been removed successfully',
      });
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive',
      });
    }
  };

  const togglePublished = async (event: DispensaryEvent) => {
    try {
      const eventRef = doc(db, 'dispensaryEvents', event.id!);
      await updateDoc(eventRef, {
        isPublished: !event.isPublished,
        updatedAt: serverTimestamp(),
      } as any);
      fetchEvents();
    } catch (error) {
      console.error('Error toggling published:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    return EVENT_CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg bg-muted/50 border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-black text-[#3D2E17] flex items-center gap-3">
                <CalendarIcon className="h-10 w-10 text-[#006B3E]" />
                Events Calendar
              </CardTitle>
              <CardDescription className="text-md text-[#3D2E17] font-bold mt-2">
                Create and manage awesome events for your community
              </CardDescription>
            </div>
            <Button
              onClick={() => router.push('/dispensary-admin/events/new')}
              className="bg-[#006B3E] hover:bg-[#3D2E17] text-white"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Event
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Events Grid */}
      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="h-16 w-16 text-[#006B3E]/40 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-[#3D2E17] mb-2">No events yet</h3>
          <p className="text-[#5D4E37] mb-6">Create your first event to engage with your community!</p>
          <Button
            onClick={() => router.push('/dispensary-admin/events/new')}
            className="bg-[#006B3E] hover:bg-[#3D2E17]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create First Event
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card
              key={event.id}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 group relative"
            >
              {/* Event Flyer */}
              <div className="relative aspect-video bg-gradient-to-br from-[#006B3E]/20 to-[#3D2E17]/20">
                {event.flyerUrl ? (
                  <Image
                    src={event.flyerUrl}
                    alt={event.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Sparkles className="h-20 w-20 text-[#006B3E]/40" />
                  </div>
                )}
                
                {/* Overlay Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className={`${getCategoryColor(event.category)} text-white font-bold`}>
                    {EVENT_CATEGORIES.find(c => c.value === event.category)?.label}
                  </Badge>
                  {event.isFeatured && (
                    <Badge className="bg-yellow-500 text-black font-bold">
                      <Star className="h-3 w-3 mr-1" fill="black" />
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <Badge className={event.isPublished ? 'bg-green-500' : 'bg-gray-500'}>
                    {event.isPublished ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {event.isPublished ? 'Live' : 'Draft'}
                  </Badge>
                </div>

                {/* Engagement Stats */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Badge className="bg-black/70 text-white backdrop-blur-sm">
                    <Heart className="h-3 w-3 mr-1" fill="red" />
                    {event.likesCount}
                  </Badge>
                  <Badge className="bg-black/70 text-white backdrop-blur-sm">
                    <MessageCircle className="h-3 w-3 mr-1" />
                    {event.commentsCount}
                  </Badge>
                  <Badge className="bg-black/70 text-white backdrop-blur-sm">
                    <Users className="h-3 w-3 mr-1" />
                    {event.currentAttendees}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <h3 className="text-xl font-black text-[#3D2E17] line-clamp-2 group-hover:text-[#006B3E] transition-colors">
                  {event.title}
                </h3>

                <p className="text-sm text-[#5D4E37] line-clamp-2">
                  {event.description}
                </p>

                {/* Date & Location */}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-[#3D2E17] font-bold">
                    <Clock className="h-4 w-4 text-[#006B3E]" />
                    {event.eventDate.toDate().toLocaleDateString('en-ZA', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-[#5D4E37]">
                      <MapPin className="h-4 w-4 text-[#006B3E]" />
                      {event.location}
                    </div>
                  )}
                  {event.isVirtual && (
                    <div className="flex items-center gap-2 text-[#5D4E37]">
                      <Video className="h-4 w-4 text-[#006B3E]" />
                      Virtual Event
                    </div>
                  )}
                </div>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {event.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-[#006B3E]/30 text-[#006B3E]">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => togglePublished(event)}
                    className="flex-1"
                  >
                    {event.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dispensary-admin/events/new?id=${event.id}`)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(event.id!)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
