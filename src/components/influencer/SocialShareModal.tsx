'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Instagram, Share2, Copy, Check, MessageCircle,
  Facebook, Twitter, Link as LinkIcon, Download,
  Sparkles
} from 'lucide-react';

interface SocialShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralCode: string;
  type?: 'profile' | 'product' | 'bundle';
  title?: string;
  imageUrl?: string;
}

export function SocialShareModal({ 
  open, 
  onOpenChange, 
  referralCode,
  type = 'profile',
  title,
  imageUrl
}: SocialShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = `${baseUrl}?ref=${referralCode}`;
  
  // Generate share URLs with referral tracking
  const getShareUrl = (platform: string) => {
    const message = customMessage || getDefaultMessage();
    const url = encodeURIComponent(referralLink);
    const text = encodeURIComponent(message);

    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
      case 'whatsapp':
        return `https://wa.me/?text=${text}%20${url}`;
      case 'instagram':
        // Instagram doesn't support direct sharing via URL, copy message instead
        return null;
      default:
        return referralLink;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'product':
        return `Check out this amazing wellness product I'm recommending! ${title || '🌿'}`;
      case 'bundle':
        return `I've curated a special bundle for your wellness journey! ${title || '✨'}`;
      default:
        return `Join me on The Wellness Tree - your trusted source for natural wellness products! 🌳`;
    }
  };

  const getInstagramStoryPrompt = () => {
    return `
      📱 To share on Instagram:
      
      1. Copy the message and link below
      2. Open Instagram and create a new Story
      3. Add a photo or use our template
      4. Add text sticker with your message
      5. Add link sticker with: ${referralLink}
      6. Share and earn commissions! 🎉
    `.trim();
  };

  const getTikTokPrompt = () => {
    return `
      🎵 To share on TikTok:
      
      1. Create a video about wellness/product
      2. Add your referral link in bio
      3. Use caption: "${getDefaultMessage()}"
      4. Add hashtags: #wellness #naturalhealing #wellnesstree
      5. Post and start earning! 💰
    `.trim();
  };

  const copyToClipboard = async (text: string, label: string = 'Link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: `${label} Copied!`,
        description: 'Paste it anywhere to share'
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Please copy manually',
        variant: 'destructive'
      });
    }
  };

  const shareToSocial = (platform: string) => {
    const url = getShareUrl(platform);
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      toast({
        title: 'Share Window Opened',
        description: `Share on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`
      });
    }
  };

  const downloadShareImage = () => {
    // In a real implementation, this would generate a custom share image
    toast({
      title: 'Coming Soon',
      description: 'Custom share graphics will be available soon!',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#006B3E]" />
            Share & Earn
          </DialogTitle>
          <DialogDescription>
            Share your referral link across social media to earn commissions
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick">Quick Share</TabsTrigger>
            <TabsTrigger value="custom">Custom Message</TabsTrigger>
            <TabsTrigger value="graphics">Graphics</TabsTrigger>
          </TabsList>

          {/* Quick Share */}
          <TabsContent value="quick" className="space-y-4">
            <div>
              <Label>Your Referral Link</Label>
              <div className="flex gap-2 mt-2">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(referralLink)}
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp */}
              <Button
                variant="outline"
                className="justify-start h-auto py-3 border-green-600 hover:bg-green-50"
                onClick={() => shareToSocial('whatsapp')}
              >
                <MessageCircle className="w-5 h-5 mr-2 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">WhatsApp</div>
                  <div className="text-xs text-muted-foreground">Share in groups/status</div>
                </div>
              </Button>

              {/* Twitter */}
              <Button
                variant="outline"
                className="justify-start h-auto py-3 border-blue-400 hover:bg-blue-50"
                onClick={() => shareToSocial('twitter')}
              >
                <Twitter className="w-5 h-5 mr-2 text-blue-400" />
                <div className="text-left">
                  <div className="font-semibold">Twitter/X</div>
                  <div className="text-xs text-muted-foreground">Post to timeline</div>
                </div>
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                className="justify-start h-auto py-3 border-blue-600 hover:bg-blue-50"
                onClick={() => shareToSocial('facebook')}
              >
                <Facebook className="w-5 h-5 mr-2 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Facebook</div>
                  <div className="text-xs text-muted-foreground">Share on your wall</div>
                </div>
              </Button>

              {/* Instagram */}
              <Button
                variant="outline"
                className="justify-start h-auto py-3 border-pink-600 hover:bg-pink-50"
                onClick={() => {
                  copyToClipboard(referralLink, 'Instagram Link');
                  toast({
                    title: 'Instagram Instructions',
                    description: getInstagramStoryPrompt(),
                    duration: 8000
                  });
                }}
              >
                <Instagram className="w-5 h-5 mr-2 text-pink-600" />
                <div className="text-left">
                  <div className="font-semibold">Instagram</div>
                  <div className="text-xs text-muted-foreground">Story/Bio link</div>
                </div>
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <div className="font-semibold text-amber-900 mb-1">💡 Pro Tips:</div>
              <ul className="text-amber-800 space-y-1 text-xs">
                <li>• Share in wellness groups for better engagement</li>
                <li>• Add personal stories to connect with your audience</li>
                <li>• Post consistently (3-5 times per week)</li>
                <li>• Use hashtags: #wellness #naturalhealing</li>
              </ul>
            </div>
          </TabsContent>

          {/* Custom Message */}
          <TabsContent value="custom" className="space-y-4">
            <div>
              <Label>Custom Message</Label>
              <textarea
                className="w-full min-h-[120px] mt-2 p-3 border rounded-md resize-vertical"
                placeholder="Write your own message... (e.g., 'I've been on an amazing wellness journey...')"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                maxLength={280}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Add your personal touch</span>
                <span>{customMessage.length}/280</span>
              </div>
            </div>

            <div>
              <Label>Link</Label>
              <Input 
                value={referralLink} 
                readOnly 
                className="mt-2 font-mono text-sm"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <div className="font-semibold text-sm mb-2">Preview:</div>
              <div className="bg-background rounded p-3 border text-sm">
                {customMessage || getDefaultMessage()}
                <div className="text-[#006B3E] font-medium mt-2">{referralLink}</div>
              </div>
            </div>

            <Button
              onClick={() => copyToClipboard(`${customMessage || getDefaultMessage()}\n\n${referralLink}`, 'Message')}
              className="w-full bg-[#006B3E] hover:bg-[#005530]"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Message & Link
            </Button>
          </TabsContent>

          {/* Graphics */}
          <TabsContent value="graphics" className="space-y-4">
            <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold mb-2">Custom Share Graphics</h3>
              <p className="text-sm text-muted-foreground mb-4 px-4">
                Download professionally designed share images for your social media posts
              </p>
              
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto px-4">
                <Button variant="outline" onClick={downloadShareImage}>
                  <Download className="w-4 h-4 mr-2" />
                  Instagram Story
                </Button>
                <Button variant="outline" onClick={downloadShareImage}>
                  <Download className="w-4 h-4 mr-2" />
                  Facebook Post
                </Button>
                <Button variant="outline" onClick={downloadShareImage}>
                  <Download className="w-4 h-4 mr-2" />
                  Twitter Card
                </Button>
                <Button variant="outline" onClick={downloadShareImage}>
                  <Download className="w-4 h-4 mr-2" />
                  WhatsApp Status
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                🎨 Custom graphics featuring your referral code coming soon!
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="font-semibold text-blue-900 mb-1">📸 Photo Tips:</div>
              <ul className="text-blue-800 space-y-1 text-xs">
                <li>• Use natural lighting for product photos</li>
                <li>• Show products in use (lifestyle shots)</li>
                <li>• Include your face for authenticity</li>
                <li>• Keep backgrounds clean and simple</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
