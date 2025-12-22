// Utility functions for video URL parsing and embedding

export type VideoSource = 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'vimeo' | 'dailymotion' | 'twitter' | 'direct';

export const parseVideoUrl = (url: string): { source: VideoSource, embedUrl: string, videoId?: string } | null => {
  // YouTube patterns (youtube.com, youtu.be, youtube shorts)
  const youtubeRegex = /(?:youtube\.com\/(?:shorts\/|[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return {
      source: 'youtube',
      videoId: youtubeMatch[1],
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`
    };
  }

  // TikTok patterns
  const tiktokRegex = /tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/v2\/)(\d+)/;
  const tiktokMatch = url.match(tiktokRegex);
  if (tiktokMatch) {
    return {
      source: 'tiktok',
      videoId: tiktokMatch[1],
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`
    };
  }

  // Facebook video patterns (watch, videos, reel)
  const facebookRegex = /facebook\.com\/(?:watch\/?\?v=|[\w.-]+\/videos\/|reel\/)(\d+)/;
  const facebookMatch = url.match(facebookRegex);
  if (facebookMatch) {
    return {
      source: 'facebook',
      videoId: facebookMatch[1],
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`
    };
  }

  // Instagram patterns (reels, tv, p - posts)
  const instagramRegex = /instagram\.com\/(?:reel|tv|p)\/([\w-]+)/;
  const instagramMatch = url.match(instagramRegex);
  if (instagramMatch) {
    return {
      source: 'instagram',
      videoId: instagramMatch[1],
      embedUrl: `https://www.instagram.com/p/${instagramMatch[1]}/embed`
    };
  }

  // Vimeo patterns
  const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return {
      source: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  // Dailymotion patterns
  const dailymotionRegex = /dailymotion\.com\/video\/([\w]+)/;
  const dailymotionMatch = url.match(dailymotionRegex);
  if (dailymotionMatch) {
    return {
      source: 'dailymotion',
      videoId: dailymotionMatch[1],
      embedUrl: `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`
    };
  }

  // Twitter/X video patterns
  const twitterRegex = /(?:twitter\.com|x\.com)\/[\w]+\/status\/(\d+)/;
  const twitterMatch = url.match(twitterRegex);
  if (twitterMatch) {
    return {
      source: 'twitter',
      videoId: twitterMatch[1],
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${twitterMatch[1]}`
    };
  }

  // Direct video file (mp4, webm, etc.)
  if (url.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
    return {
      source: 'direct',
      embedUrl: url
    };
  }

  return null;
};

export const getVideoThumbnail = (videoUrl: string): string | null => {
  const parsed = parseVideoUrl(videoUrl);
  if (!parsed) return null;

  if (parsed.source === 'youtube' && parsed.videoId) {
    return `https://img.youtube.com/vi/${parsed.videoId}/maxresdefault.jpg`;
  }

  if (parsed.source === 'vimeo' && parsed.videoId) {
    // Note: Vimeo thumbnails require API call, this is a fallback
    return `https://vumbnail.com/${parsed.videoId}.jpg`;
  }

  return null;
};

export const extractVideoId = (url: string): string | null => {
  const parsed = parseVideoUrl(url);
  return parsed?.videoId || null;
};
