'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { Loader } from '@googlemaps/js-api-loader';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TimePicker } from '@/components/ui/time-picker';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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

function NewEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams?.get('id') || null;
  const { currentUser, currentDispensary } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(!!eventId);
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

  // Load event data if editing
  useEffect(() => {
    if (eventId) {
      loadEvent(eventId);
    }
  }, [eventId]);

  const loadEvent = async (id: string) => {
    try {
      setLoading(true);
      const eventDoc = await getDoc(doc(db, 'dispensaryEvents', id));
      if (eventDoc.exists()) {
        const event = { id: eventDoc.id, ...eventDoc.data() } as DispensaryEvent;
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
      }
    } catch (error) {
      console.error('Error loading event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Maps autocomplete
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
              latitude: place.geometry?.location?.lat() || null,
              longitude: place.geometry?.location?.lng() || null,
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  }, []);

  useEffect(() => {
    if (!formData.isVirtual) {
      initializeGoogleMaps();
    }
  }, [formData.isVirtual, initializeGoogleMaps]);

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
        description: 'Failed to upload flyer image',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDispensary?.id || !currentUser?.uid) return;

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

      let flyerUrl = flyerPreview;
      if (flyerFile) {
        const uploadedUrl = await uploadFlyer();
        if (uploadedUrl) flyerUrl = uploadedUrl;
      }

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

      if (eventId) {
        await updateDoc(doc(db, 'dispensaryEvents', eventId), eventData);
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

      router.push('/dispensary-admin/events');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dispensary-admin/events">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black text-[#3D2E17]">
            {eventId ? '✏️ Edit Event' : '✨ Create New Event'}
          </h1>
          <p className="text-[#5D4E37]">
            {eventId ? 'Update your event details' : 'Create an awesome event for your community'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-[#3D2E17]">Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dispensary-admin/events')}
                disabled={uploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="flex-1 bg-[#006B3E] hover:bg-[#3D2E17]"
              >
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {eventId ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <NewEventForm />
    </Suspense>
  );
}
