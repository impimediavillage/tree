'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Heart,
  MessageCircle,
  Sparkles,
  Video,
  Star,
  ChevronRight,
  PartyPopper
} from 'lucide-react';
import Image from 'next/image';
import type { DispensaryEvent } from '@/types/dispensary-events';

interface DispensaryEventsShowcaseProps {
  dispensaryId: string;
  dispensaryName?: string;
  variant?: 'full' | 'compact';
}

const EVENT_CATEGORIES = [
  { value: 'workshop', label: '🎓 Workshop', color: 'bg-purple-500' },
  { value: 'sale', label: '🛍️ Sale', color: 'bg-red-500' },
  { value: 'community', label: '🤝 Community', color: 'bg-blue-500' },
  { value: 'education', label: '📚 Education', color: 'bg-green-500' },
  { value: 'social', label: '🎉 Social', color: 'bg-pink-500' },
  { value: 'wellness', label: '🧘 Wellness', color: 'bg-teal-500' },
  { value: 'other', label: '✨ Other', color: 'bg-gray-500' },
];

export function DispensaryEventsShowcase({
  dispensaryId,
  dispensaryName,
  variant = 'full'
}: DispensaryEventsShowcaseProps) {
  const [events, setEvents] = useState<DispensaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DispensaryEvent | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventsRef = collection(db, 'dispensaryEvents');
        const q = query(
          eventsRef,
          where('dispensaryId', '==', dispensaryId),
          where('isPublished', '==', true),
          where('eventDate', '>=', Timestamp.now()),
          orderBy('eventDate', 'asc'),
          limit(variant === 'compact' ? 3 : 6)
        );

        const snapshot = await getDocs(q);
        const eventsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DispensaryEvent[];

        // Sort featured events first
        eventsData.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1;
          if (!a.isFeatured && b.isFeatured) return 1;
          return 0;
        });

        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [dispensaryId, variant]);

  const getCategoryColor = (category: string) => {
    return EVENT_CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-500';
  };

  if (loading) {
    return null; // Don't show loading state, just hide until loaded
  }

  if (events.length === 0) {
    return null; // Don't show anything if no events
  }

  return (
    <Card className="overflow-hidden border-2 bg-gradient-to-br from-[#006B3E]/5 to-[#3D2E17]/5 border-[#006B3E]/20 shadow-lg">
      <CardContent className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#006B3E] p-3 rounded-xl animate-pulse">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-[#3D2E17]">
                Upcoming Events
              </h3>
              <p className="text-[#5D4E37] font-bold">
                {dispensaryName ? `Hosted by ${dispensaryName}` : 'Check out what\'s happening!'}
              </p>
            </div>
          </div>
          {events.length > 3 && variant === 'compact' && (
            <Button variant="outline" size="sm" className="gap-2">
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Events Grid */}
        <div className={`grid gap-4 ${variant === 'compact' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {events.map((event) => (
            <Card
              key={event.id}
              className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 group transform hover:-translate-y-1 border-2 border-[#006B3E]/20"
              onClick={() => setSelectedEvent(event)}
            >
              {/* Event Flyer/Image */}
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
                    <PartyPopper className="h-16 w-16 text-[#5D4E37]/30" />
                  </div>
                )}

                {/* Overlay Badges */}
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  <Badge className={`${getCategoryColor(event.category)} text-white font-bold text-xs shadow-lg`}>
                    {EVENT_CATEGORIES.find(c => c.value === event.category)?.label}
                  </Badge>
                  {event.isFeatured && (
                    <Badge className="bg-yellow-400 text-black font-bold text-xs shadow-lg">
                      <Star className="h-3 w-3 mr-1" fill="black" />
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Engagement Stats */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <Badge className="bg-black/70 text-white backdrop-blur-sm text-xs">
                    <Heart className="h-3 w-3 mr-1" />
                    {event.likesCount}
                  </Badge>
                  <Badge className="bg-black/70 text-white backdrop-blur-sm text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {event.currentAttendees}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-3 space-y-2">
                <h4 className="text-base font-black text-[#3D2E17] line-clamp-1 group-hover:text-[#006B3E] transition-colors">
                  {event.title}
                </h4>

                <p className="text-xs text-[#5D4E37] line-clamp-2">
                  {event.description}
                </p>

                {/* Date & Location */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 text-[#3D2E17] font-bold">
                    <Clock className="h-3 w-3 text-[#006B3E] flex-shrink-0" />
                    <span className="truncate">
                      {event.eventDate.toDate().toLocaleDateString('en-ZA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-[#5D4E37]">
                      <MapPin className="h-3 w-3 text-[#006B3E] flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  {event.isVirtual && (
                    <Badge className="bg-purple-500 text-white text-xs">
                      <Video className="h-3 w-3 mr-1" />
                      Virtual
                    </Badge>
                  )}
                </div>

                <Button
                  size="sm"
                  className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-xs font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                  }}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </CardContent>

              {/* Sparkle effect on hover */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-2 right-2 animate-ping">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <div className="space-y-4">
              {/* Flyer */}
              {selectedEvent.flyerUrl && (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={selectedEvent.flyerUrl}
                    alt={selectedEvent.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-[#3D2E17] flex items-start gap-2">
                  {selectedEvent.isFeatured && (
                    <Star className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" fill="currentColor" />
                  )}
                  {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <p className="text-[#5D4E37] leading-relaxed">{selectedEvent.description}</p>

                {/* Event Details Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#006B3E]" />
                    <div>
                      <p className="text-xs text-[#5D4E37]">When</p>
                      <p className="text-sm font-bold text-[#3D2E17]">
                        {selectedEvent.eventDate.toDate().toLocaleDateString('en-ZA', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-[#006B3E]" />
                      <div>
                        <p className="text-xs text-[#5D4E37]">Where</p>
                        <p className="text-sm font-bold text-[#3D2E17]">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#006B3E]" />
                    <div>
                      <p className="text-xs text-[#5D4E37]">Attendees</p>
                      <p className="text-sm font-bold text-[#3D2E17]">
                        {selectedEvent.currentAttendees}
                        {selectedEvent.maxAttendees && ` / ${selectedEvent.maxAttendees}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-[#006B3E]" />
                    <div>
                      <p className="text-xs text-[#5D4E37]">Likes</p>
                      <p className="text-sm font-bold text-[#3D2E17]">{selectedEvent.likesCount}</p>
                    </div>
                  </div>

                  {selectedEvent.isVirtual && selectedEvent.virtualLink && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Video className="h-5 w-5 text-[#006B3E]" />
                      <div>
                        <p className="text-xs text-[#5D4E37]">Virtual Link</p>
                        <a
                          href={selectedEvent.virtualLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-[#006B3E] hover:underline"
                        >
                          Join Event
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="border-[#006B3E] text-[#006B3E]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="pt-4 border-t">
                  <Button
                    className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-white font-bold"
                    onClick={() => {
                      // Redirect to leaf events page if user wants to engage
                      window.location.href = '/dashboard/leaf/events';
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    View All Events & RSVP
                  </Button>
                  <p className="text-xs text-center text-[#5D4E37] mt-2">
                    Sign in to like, comment, and RSVP to events
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
