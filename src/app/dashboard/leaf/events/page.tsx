'use client';

import { useState, useEffect, useCallback } from 'react';
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
  increment,
  Timestamp,
  getDocs as getDocsQuery
} from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar as CalendarIcon,
  Heart,
  MessageCircle,
  MapPin,
  Clock,
  Users,
  Sparkles,
  Video,
  Tag,
  Star,
  Send,
  Loader2,
  PartyPopper,
  TrendingUp,
  Zap,
  ThumbsUp
} from 'lucide-react';
import Image from 'next/image';
import type { DispensaryEvent, EventLike, EventComment, EventAttendee } from '@/types/dispensary-events';

const EVENT_CATEGORIES = [
  { value: 'all', label: '🌟 All Events', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'workshop', label: '🎓 Workshop', color: 'bg-purple-500' },
  { value: 'sale', label: '🛍️ Sale', color: 'bg-red-500' },
  { value: 'community', label: '🤝 Community', color: 'bg-blue-500' },
  { value: 'education', label: '📚 Education', color: 'bg-green-500' },
  { value: 'social', label: '🎉 Social', color: 'bg-pink-500' },
  { value: 'wellness', label: '🧘 Wellness', color: 'bg-teal-500' },
  { value: 'other', label: '✨ Other', color: 'bg-gray-500' },
];

export default function LeafEventsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState<DispensaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<DispensaryEvent | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userAttendance, setUserAttendance] = useState<Map<string, EventAttendee>>(new Map());
  const [comments, setComments] = useState<EventComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likeAnimations, setLikeAnimations] = useState<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, 'dispensaryEvents');
      const q = query(
        eventsRef,
        where('isPublished', '==', true),
        where('eventDate', '>=', Timestamp.now()),
        orderBy('eventDate', 'asc')
      );

      const snapshot = await getDocs(q);
      let eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DispensaryEvent[];

      // Filter by category
      if (selectedCategory !== 'all') {
        eventsData = eventsData.filter(e => e.category === selectedCategory);
      }

      // Sort featured events first
      eventsData.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return 0;
      });

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
  }, [selectedCategory, toast]);

  const fetchUserEngagement = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      // Fetch user likes
      const likesRef = collection(db, 'eventLikes');
      const likesQuery = query(likesRef, where('userId', '==', currentUser.uid));
      const likesSnapshot = await getDocs(likesQuery);
      const likedEvents = new Set(likesSnapshot.docs.map(doc => doc.data().eventId));
      setUserLikes(likedEvents);

      // Fetch user attendance
      const attendanceRef = collection(db, 'eventAttendees');
      const attendanceQuery = query(attendanceRef, where('userId', '==', currentUser.uid));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceMap = new Map();
      attendanceSnapshot.docs.forEach(doc => {
        const data = doc.data() as EventAttendee;
        attendanceMap.set(data.eventId, { id: doc.id, ...data });
      });
      setUserAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching user engagement:', error);
    }
  }, [currentUser?.uid]);

  const fetchComments = useCallback(async (eventId: string) => {
    try {
      const commentsRef = collection(db, 'eventComments');
      const q = query(
        commentsRef,
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventComment[];

      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchUserEngagement();
  }, [fetchEvents, fetchUserEngagement]);

  const handleLike = async (event: DispensaryEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser?.uid || !event.id) return;

    // Trigger animation
    setLikeAnimations(prev => new Set(prev).add(event.id!));
    setTimeout(() => {
      setLikeAnimations(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.id!);
        return newSet;
      });
    }, 1000);

    const isLiked = userLikes.has(event.id);

    try {
      if (isLiked) {
        // Unlike
        const likesRef = collection(db, 'eventLikes');
        const q = query(
          likesRef,
          where('eventId', '==', event.id),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(async (docSnap) => {
          await deleteDoc(doc(db, 'eventLikes', docSnap.id));
        });

        await updateDoc(doc(db, 'dispensaryEvents', event.id), {
          likesCount: increment(-1)
        });

        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(event.id!);
          return newSet;
        });

        setEvents(prev =>
          prev.map(e => e.id === event.id ? { ...e, likesCount: e.likesCount - 1 } : e)
        );
      } else {
        // Like
        await addDoc(collection(db, 'eventLikes'), {
          eventId: event.id,
          dispensaryId: event.dispensaryId,
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous',
          userPhotoUrl: currentUser.photoURL || null,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'dispensaryEvents', event.id), {
          likesCount: increment(1)
        });

        setUserLikes(prev => new Set(prev).add(event.id!));

        setEvents(prev =>
          prev.map(e => e.id === event.id ? { ...e, likesCount: e.likesCount + 1 } : e)
        );

        toast({
          title: '❤️ Liked!',
          description: `You liked ${event.title}`,
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive',
      });
    }
  };

  const handleAttendance = async (event: DispensaryEvent, status: EventAttendee['status'], e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUser?.uid || !currentUser?.email || !event.id) return;

    try {
      const existingAttendance = userAttendance.get(event.id);

      if (existingAttendance && existingAttendance.status === status) {
        // Remove attendance
        await deleteDoc(doc(db, 'eventAttendees', existingAttendance.id!));
        await updateDoc(doc(db, 'dispensaryEvents', event.id), {
          currentAttendees: increment(-1)
        });

        setUserAttendance(prev => {
          const newMap = new Map(prev);
          newMap.delete(event.id!);
          return newMap;
        });

        setEvents(prev =>
          prev.map(e => e.id === event.id ? { ...e, currentAttendees: e.currentAttendees - 1 } : e)
        );

        toast({
          title: 'Attendance removed',
          description: 'You\'ve been removed from this event',
        });
      } else if (existingAttendance) {
        // Update attendance
        await updateDoc(doc(db, 'eventAttendees', existingAttendance.id!), {
          status,
        });

        setUserAttendance(prev => {
          const newMap = new Map(prev);
          newMap.set(event.id!, { ...existingAttendance, status });
          return newMap;
        });

        toast({
          title: '🎉 Status updated!',
          description: `You're now marked as "${status}"`,
        });
      } else {
        // Add attendance
        const newAttendee = {
          eventId: event.id,
          dispensaryId: event.dispensaryId,
          userId: currentUser.uid,
          userName: currentUser.displayName || 'Anonymous',
          userEmail: currentUser.email,
          userPhotoUrl: currentUser.photoURL || null,
          status,
          registeredAt: serverTimestamp(),
          checkedIn: false,
        };

        const docRef = await addDoc(collection(db, 'eventAttendees'), newAttendee);

        await updateDoc(doc(db, 'dispensaryEvents', event.id), {
          currentAttendees: increment(1)
        });

        setUserAttendance(prev => new Map(prev).set(event.id!, { id: docRef.id, ...newAttendee as any }));

        setEvents(prev =>
          prev.map(e => e.id === event.id ? { ...e, currentAttendees: e.currentAttendees + 1 } : e)
        );

        toast({
          title: '🎊 You\'re in!',
          description: `You're marked as "${status}" for ${event.title}`,
        });
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to update attendance',
        variant: 'destructive',
      });
    }
  };

  const handleComment = async () => {
    if (!currentUser?.uid || !selectedEvent?.id || !newComment.trim()) return;

    try {
      setSubmittingComment(true);

      await addDoc(collection(db, 'eventComments'), {
        eventId: selectedEvent.id,
        dispensaryId: selectedEvent.dispensaryId,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous',
        userPhotoUrl: currentUser.photoURL || null,
        comment: newComment.trim(),
        createdAt: serverTimestamp(),
        isEdited: false,
        likesCount: 0,
      });

      await updateDoc(doc(db, 'dispensaryEvents', selectedEvent.id), {
        commentsCount: increment(1)
      });

      setEvents(prev =>
        prev.map(e => e.id === selectedEvent.id ? { ...e, commentsCount: e.commentsCount + 1 } : e)
      );

      setNewComment('');
      fetchComments(selectedEvent.id);

      toast({
        title: '💬 Comment posted!',
        description: 'Your comment has been added',
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const openEventDetails = (event: DispensaryEvent) => {
    setSelectedEvent(event);
    if (event.id) {
      fetchComments(event.id);
    }
  };

  const getCategoryColor = (category: string) => {
    return EVENT_CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-[#006B3E] mb-4" />
        <p className="text-[#3D2E17] font-bold text-xl">Loading awesome events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <Card className="shadow-lg bg-gradient-to-br from-[#006B3E]/10 to-[#3D2E17]/10 border-[#006B3E]/30 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-5"></div>
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-[#006B3E] p-4 rounded-2xl animate-pulse">
              <CalendarIcon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#3D2E17] tracking-tight">
                Community Events
              </h1>
              <p className="text-[#5D4E37] text-lg font-bold mt-1">
                Discover, engage, and connect with your wellness community! 🌟
              </p>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {EVENT_CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                className={`${
                  selectedCategory === cat.value
                    ? `${cat.color} text-white hover:opacity-90 shadow-lg`
                    : 'bg-white hover:bg-muted'
                } font-bold whitespace-nowrap transition-all duration-200 transform hover:scale-105`}
                onClick={() => {
                  setSelectedCategory(cat.value);
                  fetchEvents();
                }}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events Grid */}
      {events.length === 0 ? (
        <Card className="p-12 text-center">
          <PartyPopper className="h-20 w-20 text-[#006B3E]/40 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-[#3D2E17] mb-2">No events yet</h3>
          <p className="text-[#5D4E37]">Check back soon for exciting events in your area!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isLiked = userLikes.has(event.id!);
            const attendance = userAttendance.get(event.id!);
            const isAnimating = likeAnimations.has(event.id!);

            return (
              <Card
                key={event.id}
                className="overflow-hidden hover:shadow-2xl transition-all duration-300 group cursor-pointer transform hover:-translate-y-2 relative"
                onClick={() => openEventDetails(event)}
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
                      <Sparkles className="h-20 w-20 text-[#5D4E37]/30" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={`${getCategoryColor(event.category)} text-white font-bold shadow-lg`}>
                      {EVENT_CATEGORIES.find(c => c.value === event.category)?.label}
                    </Badge>
                    {event.isFeatured && (
                      <Badge className="bg-yellow-400 text-black font-bold shadow-lg animate-pulse">
                        <Star className="h-3 w-3 mr-1" fill="black" />
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Engagement Bar */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                          <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                          <span className="text-sm font-bold">{event.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm font-bold">{event.commentsCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span className="text-sm font-bold">{event.currentAttendees}</span>
                        </div>
                      </div>

                      {/* Like Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`hover:bg-white/20 transition-all duration-200 relative ${
                          isLiked ? 'bg-red-500/30' : ''
                        }`}
                        onClick={(e) => handleLike(event, e)}
                      >
                        <Heart
                          className={`h-5 w-5 transition-all duration-200 ${
                            isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-white'
                          } ${isAnimating ? 'animate-ping' : ''}`}
                        />
                      </Button>
                    </div>
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
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                    {event.isVirtual && (
                      <Badge className="bg-purple-500 text-white">
                        <Video className="h-3 w-3 mr-1" />
                        Virtual
                      </Badge>
                    )}
                  </div>

                  {/* Attendance Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button
                      size="sm"
                      variant={attendance?.status === 'going' ? 'default' : 'outline'}
                      className={`${
                        attendance?.status === 'going'
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : ''
                      } font-bold transition-all`}
                      onClick={(e) => handleAttendance(event, 'going', e)}
                    >
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      Going
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance?.status === 'interested' ? 'default' : 'outline'}
                      className={`${
                        attendance?.status === 'interested'
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                          : ''
                      } font-bold transition-all`}
                      onClick={(e) => handleAttendance(event, 'interested', e)}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Maybe
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventDetails(event);
                      }}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>

                {/* Sparkle effect on hover */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-2 right-2 animate-ping">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <div className="space-y-6">
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
                <DialogTitle className="text-3xl font-black text-[#3D2E17] flex items-start gap-3">
                  {selectedEvent.isFeatured && (
                    <Star className="h-8 w-8 text-yellow-500 flex-shrink-0 mt-1" fill="currentColor" />
                  )}
                  {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <p className="text-[#5D4E37] leading-relaxed">{selectedEvent.description}</p>

                {/* Event Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-[#006B3E]" />
                    <div>
                      <p className="text-xs text-[#5D4E37]">When</p>
                      <p className="text-sm font-bold text-[#3D2E17]">
                        {selectedEvent.eventDate.toDate().toLocaleDateString('en-ZA', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
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
                </div>

                {/* Attendance Buttons */}
                <div className="flex gap-3">
                  <Button
                    className={`flex-1 ${
                      userAttendance.get(selectedEvent.id!)?.status === 'going'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-[#006B3E] hover:bg-[#3D2E17]'
                    }`}
                    onClick={() => handleAttendance(selectedEvent, 'going')}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    I'm Going!
                  </Button>
                  <Button
                    variant="outline"
                    className={`flex-1 ${
                      userAttendance.get(selectedEvent.id!)?.status === 'interested'
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        : ''
                    }`}
                    onClick={() => handleAttendance(selectedEvent, 'interested')}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Interested
                  </Button>
                </div>

                {/* Comments Section */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-xl font-bold text-[#3D2E17] flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-[#006B3E]" />
                    Comments ({selectedEvent.commentsCount})
                  </h3>

                  {/* New Comment */}
                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="bg-[#006B3E] hover:bg-[#3D2E17] h-auto"
                    >
                      {submittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-center text-[#5D4E37] py-4">
                        No comments yet. Be the first to share!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <Card key={comment.id} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-[#006B3E] flex items-center justify-center text-white font-bold text-sm">
                              {comment.userName[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold text-[#3D2E17] text-sm">{comment.userName}</p>
                                <p className="text-xs text-[#5D4E37]">
                                  {comment.createdAt?.toDate().toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-sm text-[#5D4E37]">{comment.comment}</p>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
