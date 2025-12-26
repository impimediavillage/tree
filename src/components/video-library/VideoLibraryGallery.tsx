'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Video, Play, Youtube, Sparkles, X } from 'lucide-react';
import type { EducationalVideo } from '@/types/video-library';
import { parseVideoUrl } from '@/lib/video-utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';

interface VideoLibraryGalleryProps {
  dispensaryType: string;
}

export function VideoLibraryGallery({ dispensaryType }: VideoLibraryGalleryProps) {
  const [videos, setVideos] = useState<EducationalVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<EducationalVideo | null>(null);
  const [libraryEnabled, setLibraryEnabled] = useState(false);

  useEffect(() => {
    fetchLibrarySettings();
  }, []);

  useEffect(() => {
    if (libraryEnabled) {
      fetchVideos();
    }
  }, [dispensaryType, libraryEnabled]);

  const fetchLibrarySettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'videoLibrary'));
      if (settingsDoc.exists()) {
        setLibraryEnabled(settingsDoc.data().isEnabled);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      const videosRef = collection(db, 'educationalVideos');
      const q = query(
        videosRef,
        where('dispensaryType', '==', dispensaryType),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const videosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EducationalVideo[];
      
      setVideos(videosData);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'youtube': return <Youtube className="h-5 w-5 text-red-500" />;
      case 'tiktok': return <Video className="h-5 w-5 text-black" />;
      case 'facebook': return <span className="text-blue-600 font-bold text-xs">FB</span>;
      case 'instagram': return <span className="text-pink-600 font-bold text-xs">IG</span>;
      case 'vimeo': return <span className="text-blue-500 font-bold text-xs">VM</span>;
      case 'twitter': return <span className="text-black font-bold text-xs">𝕏</span>;
      default: return <Play className="h-5 w-5 text-[#006B3E]" />;
    }
  };

  if (!libraryEnabled || videos.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-[#5D4E37]/10 via-[#006B3E]/10 to-[#5D4E37]/10 rounded-xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-[#006B3E] rounded-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-[#3D2E17] tracking-tight">
                Educational Video Library
              </h2>
              <p className="text-lg text-[#5D4E37] font-semibold mt-1">
                Learn more about our products and services
              </p>
            </div>
          </div>
          <Badge className="bg-[#006B3E] text-white font-bold">
            {videos.length} {videos.length === 1 ? 'Video' : 'Videos'} Available
          </Badge>
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video, index) => (
          <Card
            key={video.id}
            className="group cursor-pointer hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-[#5D4E37]/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
            onClick={() => setSelectedVideo(video)}
          >
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#5D4E37]/20 to-[#006B3E]/20">
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

              {/* Duration Badge (if available) */}
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
              <p className="text-sm text-[#5D4E37] line-clamp-2 leading-relaxed">
                {video.description}
              </p>
              
              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
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

      {/* Video Player Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-5xl bg-gradient-to-br from-white to-[#5D4E37]/5 border-[#5D4E37]/20 p-0 overflow-hidden">
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setSelectedVideo(null)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Video Player */}
            {selectedVideo && (() => {
              // If custom embed code exists, use it
              if (selectedVideo.embedCode && selectedVideo.embedCode.trim()) {
                return (
                  <div className="relative">
                    <div 
                      className="aspect-video bg-black"
                      dangerouslySetInnerHTML={{ __html: selectedVideo.embedCode }}
                    />
                    {/* Video Info */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-extrabold text-[#3D2E17] mb-2">
                            {selectedVideo.title}
                          </h3>
                          <p className="text-[#5D4E37] leading-relaxed">
                            {selectedVideo.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSourceIcon(selectedVideo.source)}
                        </div>
                      </div>

                      {/* Tags */}
                      {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#5D4E37]/10">
                          {selectedVideo.tags.map((tag, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline"
                              className="border-[#006B3E] text-[#006B3E] font-semibold"
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
                <div className="relative">
                  <div className="aspect-video bg-black">
                    {parsed.source === 'youtube' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`${parsed.embedUrl}?autoplay=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}
                    {parsed.source === 'tiktok' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={parsed.embedUrl}
                        allow="encrypted-media;"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}
                    {parsed.source === 'facebook' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={parsed.embedUrl}
                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}
                    {parsed.source === 'instagram' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={parsed.embedUrl}
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}
                    {parsed.source === 'vimeo' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={parsed.embedUrl}
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}
                    {parsed.source === 'dailymotion' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={parsed.embedUrl}
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}
                    {parsed.source === 'twitter' && (
                      <iframe
                        width="100%"
                        height="100%"
                        src={parsed.embedUrl}
                        allowFullScreen
                        className="w-full h-full"
                      />
                    )}
                    {parsed.source === 'direct' && (
                      <video controls autoPlay className="w-full h-full">
                        <source src={parsed.embedUrl} type="video/mp4" />
                      </video>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-2xl font-extrabold text-[#3D2E17] mb-2">
                          {selectedVideo.title}
                        </h3>
                        <p className="text-[#5D4E37] leading-relaxed">
                          {selectedVideo.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSourceIcon(selectedVideo.source)}
                      </div>
                    </div>

                    {/* Tags */}
                    {selectedVideo.tags && selectedVideo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#5D4E37]/10">
                        {selectedVideo.tags.map((tag, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline"
                            className="border-[#006B3E] text-[#006B3E] font-semibold"
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
