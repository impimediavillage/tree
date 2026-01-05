'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { Loader } from '@googlemaps/js-api-loader';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Users,
  Heart,
  MessageCircle,
  Eye,
  EyeOff,
  Star,
  Loader2,
  Upload,
  X,
  Sparkles,
  Clock,
  Video,
  Tag
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
  
  const [events, setEvents] = useState<DispensaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<DispensaryEvent | null>(null);
  const [uploading, setUploading] = useState(false);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventTime: '',
    endDate: '',
    endTime: '',
    location: '',
    streetAddress: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isVirtual: false,
    virtualLink: '',
    category: 'community' as DispensaryEvent['category'],
    tags: '',
    maxAttendees: '',
    isPublished: true,
    isFeatured: false,
  });

  const fetchEvents = useCallback(async () => {
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
  }, [currentDispensary?.id, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Initialize Google Maps autocomplete for location
  const initializeGoogleMaps = useCallback(async () => {
    try {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        libraries: ['places'],
      });
      await loader.load();
      
      if (locationInputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(locationInputRef.current, {
          fields: ['address_components', 'geometry', 'formatted_address'],
          types: ['address'],
        });
        
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.address_components && place.geometry) {
            let street = '';
            let city = '';
            let state = '';
            let postalCode = '';
            let country = '';
            
            place.address_components.forEach((component: any) => {
              const types = component.types;
              if (types.includes('street_number')) {
                street = component.long_name + ' ';
              }
              if (types.includes('route')) {
                street += component.long_name;
              }
              if (types.includes('locality')) {
                city = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                state = component.long_name;
              }
              if (types.includes('postal_code')) {
                postalCode = component.long_name;
              }
              if (types.includes('country')) {
                country = component.long_name;
              }
            });
            
            setFormData(prev => ({
              ...prev,
              location: place.formatted_address || '',
              streetAddress: street.trim(),
              city,
              state,
              postalCode,
              country,
              latitude: place.geometry.location?.lat() || null,
              longitude: place.geometry.location?.lng() || null,
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  }, []);

  useEffect(() => {
    if (showDialog && !formData.isVirtual) {
      initializeGoogleMaps();
    }
  }, [showDialog, formData.isVirtual, initializeGoogleMaps]);

  const handleFlyerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setFlyerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFlyerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFlyer = async (): Promise<string | null> => {
    if (!flyerFile || !currentDispensary?.id) return null;

    try {
      const fileName = `events/${currentDispensary.id}/${Date.now()}_${flyerFile.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, flyerFile);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading flyer:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload event flyer',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDispensary?.id || !currentUser?.uid) return;

    // Validate required fields
    if (!formData.eventDate || !formData.eventTime) {
      toast({
        title: 'Missing Information',
        description: 'Please provide event date and start time',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      let flyerUrl = editingEvent?.flyerUrl;
      if (flyerFile) {
        const uploadedUrl = await uploadFlyer();
        if (uploadedUrl) flyerUrl = uploadedUrl;
      }

      // Combine date and time into single timestamp
      const startDateTime = new Date(`${formData.eventDate}T${formData.eventTime}`);
      const endDateTime = formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : undefined;

      const eventData: any = {
        dispensaryId: currentDispensary.id,
        dispensaryName: currentDispensary.dispensaryName,
        title: formData.title,
        description: formData.description,
        eventDate: Timestamp.fromDate(startDateTime),
        endDate: endDateTime ? Timestamp.fromDate(endDateTime) : undefined,
        location: formData.location || undefined,
        streetAddress: formData.streetAddress || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
        isVirtual: formData.isVirtual,
        virtualLink: formData.virtualLink || undefined,
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
        isPublished: formData.isPublished,
        isFeatured: formData.isFeatured,
        updatedAt: serverTimestamp(),
      };

      if (flyerUrl) {
        eventData.flyerUrl = flyerUrl;
      }

      if (editingEvent) {
        const eventRef = doc(db, 'dispensaryEvents', editingEvent.id!);
        await updateDoc(eventRef, eventData);
        toast({
          title: '🎉 Event updated!',
          description: `${formData.title} has been updated successfully`,
        });
      } else {
        const newEventData: any = {
          ...eventData,
          currentAttendees: 0,
          likesCount: 0,
          commentsCount: 0,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
        };
        await addDoc(collection(db, 'dispensaryEvents'), newEventData);
        toast({
          title: '🎉 Event created!',
          description: `${formData.title} has been created successfully`,
        });
      }

      resetForm();
      setShowDialog(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: 'Failed to save event',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (event: DispensaryEvent) => {
    setEditingEvent(event);
    const startDate = event.eventDate.toDate();
    const endDate = event.endDate?.toDate();
    
    setFormData({
      title: event.title,
      description: event.description,
      eventDate: startDate.toISOString().split('T')[0],
      eventTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate ? endDate.toISOString().split('T')[0] : '',
      endTime: endDate ? endDate.toTimeString().slice(0, 5) : '',
      location: event.location || '',
      streetAddress: (event as any).streetAddress || '',
      city: (event as any).city || '',
      state: (event as any).state || '',
      postalCode: (event as any).postalCode || '',
      country: (event as any).country || '',
      latitude: (event as any).latitude || null,
      longitude: (event as any).longitude || null,
      isVirtual: event.isVirtual,
      virtualLink: event.virtualLink || '',
      category: event.category,
      tags: event.tags?.join(', ') || '',
      maxAttendees: event.maxAttendees?.toString() || '',
      isPublished: event.isPublished,
      isFeatured: event.isFeatured,
    });
    setFlyerPreview(event.flyerUrl || null);
    setShowDialog(true);
  };

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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventDate: '',
      eventTime: '',
      endDate: '',
      endTime: '',
      location: '',
      streetAddress: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      latitude: null,
      longitude: null,
      isVirtual: false,
      virtualLink: '',
      category: 'community',
      tags: '',
      maxAttendees: '',
      isPublished: true,
      isFeatured: false,
    });
    setEditingEvent(null);
    setFlyerFile(null);
    setFlyerPreview(null);
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
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
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
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
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
                    <ImageIcon className="h-20 w-20 text-[#5D4E37]/30" />
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
                    onClick={() => handleEdit(event)}
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

      {/* Create/Edit Event Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowDialog(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#3D2E17]">
              {editingEvent ? '✏️ Edit Event' : '✨ Create New Event'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Flyer Upload */}
            <div className="space-y-2">
              <Label className="text-[#3D2E17] font-bold">Event Flyer (Optional)</Label>
              <div className="border-2 border-dashed border-[#006B3E]/30 rounded-lg p-4 hover:border-[#006B3E] transition-colors">
                {flyerPreview ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <Image src={flyerPreview} alt="Flyer preview" fill className="object-contain" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setFlyerFile(null);
                        setFlyerPreview(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-8">
                    <Upload className="h-12 w-12 text-[#006B3E] mb-2" />
                    <span className="text-[#3D2E17] font-bold">Upload Event Flyer</span>
                    <span className="text-xs text-[#5D4E37] mt-1">PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFlyerChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label className="text-[#3D2E17] font-bold">Event Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Summer Wellness Workshop"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[#3D2E17] font-bold">Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell your community about this amazing event..."
                rows={4}
                required
              />
            </div>

            {/* Category & Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#3D2E17] font-bold">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#3D2E17] font-bold">Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="wellness, community, fun"
                />
              </div>
            </div>

            {/* Dates with Analog Clock TimePicker */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#3D2E17] font-bold">Start Date *</Label>
                <Input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#3D2E17] font-bold">Start Time *</Label>
                <TimePicker
                  value={formData.eventTime}
                  onChange={(value) => setFormData({ ...formData, eventTime: value || '' })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#3D2E17] font-bold">End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#3D2E17] font-bold">End Time (Optional)</Label>
                <TimePicker
                  value={formData.endTime}
                  onChange={(value) => setFormData({ ...formData, endTime: value || '' })}
                />
              </div>
            </div>

            {/* Virtual Event Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-[#3D2E17] font-bold">Virtual Event?</Label>
                <p className="text-xs text-[#5D4E37]">Event will be held online</p>
              </div>
              <Switch
                checked={formData.isVirtual}
                onCheckedChange={(checked) => setFormData({ ...formData, isVirtual: checked })}
              />
            </div>

            {/* Location or Virtual Link */}
            {formData.isVirtual ? (
              <div className="space-y-2">
                <Label className="text-[#3D2E17] font-bold">Virtual Link</Label>
                <Input
                  value={formData.virtualLink}
                  onChange={(e) => setFormData({ ...formData, virtualLink: e.target.value })}
                  placeholder="https://zoom.us/..."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#3D2E17] font-bold">Event Location *</Label>
                  <Input
                    ref={locationInputRef}
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Start typing to search for an address..."
                  />
                  <p className="text-xs text-[#5D4E37]">Use Google autocomplete to auto-fill address details</p>
                </div>

                {/* Display address fields if populated */}
                {(formData.streetAddress || formData.city) && (
                  <div className="bg-[#006B3E]/10 border-l-4 border-[#006B3E] p-4 rounded-r-lg space-y-1">
                    <p className="text-xs text-[#3D2E17] font-bold">📍 Address Details:</p>
                    {formData.streetAddress && <p className="text-sm text-[#5D4E37]"><strong>Street:</strong> {formData.streetAddress}</p>}
                    {formData.city && <p className="text-sm text-[#5D4E37]"><strong>City:</strong> {formData.city}</p>}
                    {formData.state && <p className="text-sm text-[#5D4E37]"><strong>State:</strong> {formData.state}</p>}
                    {formData.postalCode && <p className="text-sm text-[#5D4E37]"><strong>Postal Code:</strong> {formData.postalCode}</p>}
                    {formData.country && <p className="text-sm text-[#5D4E37]"><strong>Country:</strong> {formData.country}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Max Attendees */}
            <div className="space-y-2">
              <Label className="text-[#3D2E17] font-bold">Max Attendees (Optional)</Label>
              <Input
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                placeholder="Leave empty for unlimited"
              />
            </div>

            {/* Publishing Options */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[#3D2E17] font-bold">Publish Immediately</Label>
                  <p className="text-xs text-[#5D4E37]">Make event visible to users</p>
                </div>
                <Switch
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublished: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[#3D2E17] font-bold">Featured Event</Label>
                  <p className="text-xs text-[#5D4E37]">Show on top of the list</p>
                </div>
                <Switch
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="bg-[#006B3E] hover:bg-[#3D2E17]"
              >
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
