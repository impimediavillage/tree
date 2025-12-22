'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Video, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  Youtube, 
  Play,
  GripVertical,
  Save,
  X,
  Power,
  Sparkles
} from 'lucide-react';
import type { EducationalVideo, VideoLibrarySettings } from '@/types/video-library';
import { parseVideoUrl, getVideoThumbnail } from '@/lib/video-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';

const DISPENSARY_TYPES = [
  { value: 'cannibinoid', label: 'Cannabis & CBD' },
  { value: 'traditional-medicine', label: 'Traditional Medicine' },
  { value: 'homeopathy', label: 'Homeopathy' },
  { value: 'mushroom', label: 'Mushrooms' },
  { value: 'permaculture', label: 'Permaculture' },
  { value: 'healers', label: 'Muti Lounge & Healers' }
];

export default function VideoLibraryManagementPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<EducationalVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [libraryEnabled, setLibraryEnabled] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<EducationalVideo | null>(null);
  const [previewVideo, setPreviewVideo] = useState<EducationalVideo | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    dispensaryType: '',
    tags: ''
  });

  useEffect(() => {
    fetchVideos();
    fetchSettings();
  }, []);

  const fetchVideos = async () => {
    try {
      const videosRef = collection(db, 'educationalVideos');
      const q = query(videosRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EducationalVideo[];
      
      setVideos(videosData);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load videos',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'videoLibrary'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as VideoLibrarySettings;
        setLibraryEnabled(data.isEnabled);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const toggleLibrary = async (enabled: boolean) => {
    try {
      await setDoc(doc(db, 'settings', 'videoLibrary'), {
        isEnabled: enabled,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'system'
      });
      
      setLibraryEnabled(enabled);
      toast({
        title: enabled ? 'Video Library Enabled' : 'Video Library Disabled',
        description: enabled ? 'Videos are now visible to users' : 'Videos are now hidden from users'
      });
    } catch (error) {
      console.error('Error toggling library:', error);
      toast({
        title: 'Error',
        description: 'Failed to update library settings',
        variant: 'destructive'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parsed = parseVideoUrl(formData.videoUrl);
      if (!parsed) {
        toast({
          title: 'Invalid URL',
          description: 'Please provide a valid YouTube, TikTok, or direct video URL',
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      const thumbnail = getVideoThumbnail(formData.videoUrl);
      const videoData = {
        title: formData.title,
        description: formData.description,
        videoUrl: formData.videoUrl,
        thumbnailUrl: thumbnail || undefined,
        source: parsed.source,
        dispensaryType: formData.dispensaryType,
        isActive: true,
        order: videos.length,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.uid || 'system'
      };

      if (editingVideo?.id) {
        // Update existing video
        await updateDoc(doc(db, 'educationalVideos', editingVideo.id), videoData);
        toast({
          title: 'Video Updated',
          description: 'Video has been updated successfully'
        });
      } else {
        // Add new video
        await addDoc(collection(db, 'educationalVideos'), {
          ...videoData,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid || 'system'
        });
        toast({
          title: 'Video Added',
          description: 'Video has been added to the library'
        });
      }

      fetchVideos();
      resetForm();
      setShowAddDialog(false);
      setEditingVideo(null);
    } catch (error) {
      console.error('Error saving video:', error);
      toast({
        title: 'Error',
        description: 'Failed to save video',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await deleteDoc(doc(db, 'educationalVideos', videoId));
      toast({
        title: 'Video Deleted',
        description: 'Video has been removed from the library'
      });
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete video',
        variant: 'destructive'
      });
    }
  };

  const toggleVideoActive = async (video: EducationalVideo) => {
    if (!video.id) return;

    try {
      await updateDoc(doc(db, 'educationalVideos', video.id), {
        isActive: !video.isActive,
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: video.isActive ? 'Video Hidden' : 'Video Visible',
        description: video.isActive ? 'Video is now hidden from users' : 'Video is now visible to users'
      });
      
      fetchVideos();
    } catch (error) {
      console.error('Error toggling video:', error);
      toast({
        title: 'Error',
        description: 'Failed to update video',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (video: EducationalVideo) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      dispensaryType: video.dispensaryType,
      tags: video.tags?.join(', ') || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      videoUrl: '',
      dispensaryType: '',
      tags: ''
    });
    setEditingVideo(null);
  };

  const filteredVideos = selectedType === 'all' 
    ? videos 
    : videos.filter(v => v.dispensaryType === selectedType);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube': return <Youtube className="h-4 w-4 text-red-500" />;
      case 'tiktok': return <Video className="h-4 w-4 text-black" />;
      case 'facebook': return <span className="text-blue-600 font-bold text-[10px]">FB</span>;
      case 'instagram': return <span className="text-pink-600 font-bold text-[10px]">IG</span>;
      case 'vimeo': return <span className="text-blue-500 font-bold text-[10px]">VM</span>;
      case 'twitter': return <span className="text-black font-bold text-[10px]">𝕏</span>;
      default: return <Play className="h-4 w-4 text-[#006B3E]" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="bg-muted/50 rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-[#3D2E17] tracking-tight flex items-center gap-3">
              <Video className="h-10 w-10 text-[#006B3E]" />
              Video Library Management
            </h1>
            <p className="text-lg text-[#5D4E37] font-semibold mt-2">
              Manage educational videos for each dispensary type
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/80 rounded-lg px-4 py-2 border border-[#5D4E37]/20">
              <Power className={`h-5 w-5 ${libraryEnabled ? 'text-[#006B3E]' : 'text-gray-400'}`} />
              <span className="text-sm font-semibold text-[#3D2E17]">Library Status</span>
              <Switch 
                checked={libraryEnabled} 
                onCheckedChange={toggleLibrary}
                className="data-[state=checked]:bg-[#006B3E]"
              />
            </div>
            <Button 
              onClick={() => { resetForm(); setShowAddDialog(true); }} 
              className="bg-[#006B3E] hover:bg-[#006B3E]/90 text-white font-bold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Video
            </Button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <Card className="shadow-lg border-[#5D4E37]/20 bg-white/80">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-[#3D2E17] font-bold">Filter by Type:</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-64 border-[#5D4E37]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DISPENSARY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="border-[#006B3E] text-[#006B3E] font-bold">
              {filteredVideos.length} Videos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => (
          <Card 
            key={video.id} 
            className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/90 border-[#5D4E37]/20 overflow-hidden"
          >
            <div className="relative h-48 bg-gradient-to-br from-[#5D4E37]/10 to-[#006B3E]/10">
              {video.thumbnailUrl ? (
                <Image 
                  src={video.thumbnailUrl} 
                  alt={video.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Video className="h-20 w-20 text-[#5D4E37]/30" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                {getSourceIcon(video.source)}
                <Badge className={video.isActive ? 'bg-[#006B3E]' : 'bg-gray-400'}>
                  {video.isActive ? 'Active' : 'Hidden'}
                </Badge>
              </div>
              <button
                onClick={() => setPreviewVideo(video)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Play className="h-16 w-16 text-white" />
              </button>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold text-[#3D2E17] text-lg mb-2 line-clamp-2">{video.title}</h3>
              <p className="text-sm text-[#5D4E37] line-clamp-2 mb-3">{video.description}</p>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="border-[#006B3E] text-[#006B3E] text-xs">
                  {DISPENSARY_TYPES.find(t => t.value === video.dispensaryType)?.label}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleVideoActive(video)}
                  className="flex-1 border-[#5D4E37]/30"
                >
                  {video.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(video)}
                  className="flex-1 border-[#006B3E]/30"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(video.id!)}
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <Card className="shadow-lg bg-muted/30">
          <CardContent className="pt-12 pb-12 text-center">
            <Video className="h-20 w-20 mx-auto text-[#5D4E37]/30 mb-4" />
            <h3 className="text-2xl font-bold text-[#3D2E17] mb-2">No Videos Found</h3>
            <p className="text-[#5D4E37] mb-6">Start building your video library by adding educational content</p>
            <Button 
              onClick={() => { resetForm(); setShowAddDialog(true); }}
              className="bg-[#006B3E] hover:bg-[#006B3E]/90 text-white font-bold"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Video
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[#006B3E]" />
              {editingVideo ? 'Edit Video' : 'Add New Video'}
            </DialogTitle>
            <DialogDescription className="text-[#5D4E37]">
              {editingVideo ? 'Update video details below' : 'Add educational content to your video library'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label className="text-[#3D2E17] font-bold">Video URL *</Label>
              <Input
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=... or https://tiktok.com/... or any social media video URL"
                required
                className="border-[#5D4E37]/30"
              />
              <p className="text-xs text-[#5D4E37] mt-1">Supports YouTube, TikTok, Facebook, Instagram, Vimeo, Twitter/X, Dailymotion, and direct video links</p>
            </div>

            <div>
              <Label className="text-[#3D2E17] font-bold">Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., CBD Benefits and Usage Guide"
                required
                className="border-[#5D4E37]/30"
              />
            </div>

            <div>
              <Label className="text-[#3D2E17] font-bold">Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the video content..."
                required
                rows={3}
                className="border-[#5D4E37]/30"
              />
            </div>

            <div>
              <Label className="text-[#3D2E17] font-bold">Dispensary Type *</Label>
              <Select 
                value={formData.dispensaryType} 
                onValueChange={(value) => setFormData({ ...formData, dispensaryType: value })}
                required
              >
                <SelectTrigger className="border-[#5D4E37]/30">
                  <SelectValue placeholder="Select dispensary type" />
                </SelectTrigger>
                <SelectContent>
                  {DISPENSARY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#3D2E17] font-bold">Tags (Optional)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="education, beginner, benefits (comma separated)"
                className="border-[#5D4E37]/30"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setShowAddDialog(false); resetForm(); }}
                className="border-[#5D4E37]/30"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#006B3E] hover:bg-[#006B3E]/90 text-white font-bold"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingVideo ? 'Update Video' : 'Add Video'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3D2E17]">{previewVideo?.title}</DialogTitle>
            <DialogDescription className="text-[#5D4E37]">{previewVideo?.description}</DialogDescription>
          </DialogHeader>
          {previewVideo && (() => {
            const parsed = parseVideoUrl(previewVideo.videoUrl);
            return parsed ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {parsed.source === 'youtube' && (
                  <iframe
                    width="100%"
                    height="100%"
                    src={parsed.embedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {parsed.source === 'tiktok' && (
                  <iframe
                    width="100%"
                    height="100%"
                    src={parsed.embedUrl}
                    allow="encrypted-media;"
                    allowFullScreen
                  />
                )}
                {parsed.source === 'direct' && (
                  <video controls className="w-full h-full">
                    <source src={parsed.embedUrl} type="video/mp4" />
                  </video>
                )}
              </div>
            ) : null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
