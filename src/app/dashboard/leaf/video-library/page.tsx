'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, Play, Youtube, Facebook, Instagram, Twitter, Film, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import type { EducationalVideo } from '@/types/video-library';
import type { DispensaryType } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper function to parse video URLs
function parseVideoUrl(url: string): { embedUrl: string; source: string } | null {
  if (!url) return null;

  // YouTube
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return { embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`, source: 'youtube' };
  }

  // TikTok
  if (url.includes('tiktok.com')) {
    const tiktokId = url.split('/').pop()?.split('?')[0];
    return { embedUrl: `https://www.tiktok.com/embed/v2/${tiktokId}`, source: 'tiktok' };
  }

  // Facebook
  if (url.includes('facebook.com')) {
    return { embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`, source: 'facebook' };
  }

  // Instagram
  if (url.includes('instagram.com')) {
    return { embedUrl: `${url}embed`, source: 'instagram' };
  }

  // Vimeo
  const vimeoRegex = /vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return { embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`, source: 'vimeo' };
  }

  // Dailymotion
  const dailymotionRegex = /dailymotion\.com\/video\/([^_]+)/;
  const dailymotionMatch = url.match(dailymotionRegex);
  if (dailymotionMatch) {
    return { embedUrl: `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`, source: 'dailymotion' };
  }

  // Twitter/X
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return { embedUrl: url, source: 'twitter' };
  }

  // Direct video link
  if (url.match(/\.(mp4|webm|ogg)$/i)) {
    return { embedUrl: url, source: 'direct' };
  }

  return null;
}

// Source icon helper
function getSourceIcon(source: string) {
  switch (source) {
    case 'youtube':
      return <Youtube className="h-5 w-5 text-red-500" />;
    case 'facebook':
      return <Facebook className="h-5 w-5 text-blue-600" />;
    case 'instagram':
      return <Instagram className="h-5 w-5 text-pink-600" />;
    case 'twitter':
      return <Twitter className="h-5 w-5 text-blue-400" />;
    case 'tiktok':
      return <Film className="h-5 w-5 text-black" />;
    default:
      return <Video className="h-5 w-5 text-[#006B3E]" />;
  }
}

export default function LeafVideoLibraryPage() {
  const [videos, setVideos] = useState<EducationalVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<EducationalVideo | null>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [dispensaryTypes, setDispensaryTypes] = useState<DispensaryType[]>([]);

  useEffect(() => {
    fetchDispensaryTypes();
    fetchDispensaryTypes();
    fetchVideos();
  }, [selectedType]);

  const fetchDispensaryTypes = async () => {
    try {
      const typesRef = collection(db, 'dispensaryTypes');
      const q = query(typesRef, orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const types = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DispensaryType[];
      // Filter to show only active types
      const activeTypes = types.filter(type => type.isActive === true);
      setDispensaryTypes(activeTypes);
    } catch (error) {
      console.error('Error fetching dispensary types:', error);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const videosRef = collection(db, 'educationalVideos');
      
      let q;
      if (selectedType === 'all') {
        q = query(
          videosRef,
          where('isActive', '==', true),
          orderBy('order', 'asc')
        );
      } else {
        q = query(
          videosRef,
          where('dispensaryType', '==', selectedType),
          where('isActive', '==', true),
          orderBy('order', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EducationalVideo[];

      setVideos(videosData);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E] mb-4" />
        <p className="text-[#5D4E37]">Loading educational videos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg bg-muted/50 border-border/50">
        <CardContent className="p-8">
          <div className="flex items-center gap-4">
            <div className="bg-[#006B3E] p-4 rounded-2xl">
              <Video className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#3D2E17] tracking-tight">
                Video Library
              </h1>
              <p className="text-[#5D4E37] text-lg font-bold mt-1">
                Educational videos about natural wellness
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Type Filter */}
      <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
        <TabsList className="w-full flex flex-wrap justify-start gap-2 h-auto bg-muted/50 p-2">
          <TabsTrigger 
            key="all" 
            value="all" 
            className="font-bold text-[#3D2E17] data-[state=active]:bg-[#006B3E] data-[state=active]:text-white"
          >
            All Videos
          </TabsTrigger>
          {dispensaryTypes.map((type) => {
            const slug = type.name.toLowerCase().replace(/\s+/g, '-');
            return (
              <TabsTrigger
                key={type.id}
                value={slug}
                className="font-bold text-[#3D2E17] data-[state=active]:bg-[#006B3E] data-[state=active]:text-white"
              >
                {type.name}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-[#5D4E37]/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#3D2E17] mb-2">No videos available</h3>
          <p className="text-[#5D4E37]">Check back soon for educational content!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative aspect-video bg-gradient-to-br from-[#006B3E]/10 to-[#3D2E17]/10">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Video className="h-16 w-16 text-[#5D4E37]/40" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                {/* Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-16 h-16 rounded-full bg-[#006B3E] flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-white ml-1" fill="white" />
                  </div>
                </div>

                {/* Source Badge */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg">
                  {getSourceIcon(video.source)}
                </div>

                {/* Duration Badge */}
                {video.duration && (
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm rounded px-2 py-1">
                    <span className="text-white text-xs font-bold">{video.duration}</span>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-bold text-[#3D2E17] text-base mb-2 line-clamp-2 group-hover:text-[#006B3E] transition-colors">
                  {video.title}
                </h3>
                <p className="text-sm text-[#5D4E37] line-clamp-2 leading-relaxed mb-3">
                  {video.description}
                </p>

                {/* Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {video.tags.slice(0, 3).map((tag, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="text-xs border-[#006B3E]/30 text-[#006B3E]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-fit max-h-[95vh] overflow-hidden bg-transparent border-none p-0 gap-0">
          <div className="relative flex flex-col max-w-[95vw] max-h-[95vh]">
            {selectedVideo && (() => {
              // If custom embed code exists, use it
              if (selectedVideo.embedCode && selectedVideo.embedCode.trim()) {
                return (
                  <div className="flex flex-col">
                    <div
                      className="flex items-center justify-center bg-black rounded-t-lg overflow-hidden"
                      style={{ maxHeight: '80vh' }}
                      dangerouslySetInnerHTML={{ __html: selectedVideo.embedCode }}
                    />
                    <div className="bg-muted/95 backdrop-blur-sm rounded-b-lg p-6 space-y-4 border-t-2 border-[#006B3E]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-black text-[#3D2E17] mb-2">
                            {selectedVideo.title}
                          </h3>
                          <p className="text-[#5D4E37] font-bold leading-relaxed">
                            {selectedVideo.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="scale-150">
                            {getSourceIcon(selectedVideo.source)}
                          </div>
                        </div>
                      </div>

                      {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#3D2E17]/20">
                          {selectedVideo.tags.map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="border-[#006B3E] text-[#006B3E] font-black bg-white/80"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Otherwise, parse the video URL
              const parsed = parseVideoUrl(selectedVideo.videoUrl);
              return parsed ? (
                <div className="flex flex-col">
                  <div className="flex items-center justify-center bg-black rounded-t-lg overflow-hidden" style={{ maxHeight: '80vh' }}>
                    {parsed.source === 'youtube' && (
                      <iframe
                        src={`${parsed.embedUrl}?autoplay=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full aspect-video"
                        style={{ maxHeight: '80vh', minHeight: '400px' }}
                      />
                    )}
                    {parsed.source === 'tiktok' && (
                      <iframe
                        src={parsed.embedUrl}
                        allow="encrypted-media;"
                        allowFullScreen
                        className="w-auto h-[80vh]"
                        style={{ aspectRatio: '9/16', maxWidth: '95vw' }}
                      />
                    )}
                    {parsed.source === 'facebook' && (
                      <iframe
                        src={parsed.embedUrl}
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full aspect-video"
                        style={{ maxHeight: '80vh', minHeight: '400px' }}
                      />
                    )}
                    {parsed.source === 'instagram' && (
                      <iframe
                        src={parsed.embedUrl}
                        allowFullScreen
                        className="w-auto h-[80vh]"
                        style={{ aspectRatio: '9/16', maxWidth: '95vw' }}
                      />
                    )}
                    {parsed.source === 'vimeo' && (
                      <iframe
                        src={parsed.embedUrl}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="w-full aspect-video"
                        style={{ maxHeight: '80vh', minHeight: '400px' }}
                        />
                    )}
                    {parsed.source === 'dailymotion' && (
                      <iframe
                        src={parsed.embedUrl}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        className="w-full aspect-video"
                        style={{ maxHeight: '80vh', minHeight: '400px' }}
                      />
                    )}
                    {parsed.source === 'twitter' && (
                      <iframe
                        src={parsed.embedUrl}
                        allowFullScreen
                        className="w-full aspect-video"
                        style={{ maxHeight: '80vh', minHeight: '400px' }}
                      />
                    )}
                    {parsed.source === 'direct' && (
                      <video controls autoPlay className="w-full h-auto" style={{ maxHeight: '80vh' }}>
                        <source src={parsed.embedUrl} type="video/mp4" />
                      </video>
                    )}
                  </div>

                  <div className="bg-muted/95 backdrop-blur-sm rounded-b-lg p-6 space-y-4 border-t-2 border-[#006B3E]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-black text-[#3D2E17] mb-2">
                          {selectedVideo.title}
                        </h3>
                        <p className="text-[#5D4E37] font-bold leading-relaxed">
                          {selectedVideo.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="scale-150">
                          {getSourceIcon(selectedVideo.source)}
                        </div>
                      </div>
                    </div>

                    {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#3D2E17]/20">
                        {selectedVideo.tags.map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="border-[#006B3E] text-[#006B3E] font-black bg-white/80"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
