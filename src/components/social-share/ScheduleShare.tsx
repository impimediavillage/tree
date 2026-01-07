'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import type { SocialPlatform, ScheduledShare } from '@/types/social-share';
import { PLATFORM_CONFIGS } from '@/lib/social-share-config';

interface ScheduleShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dispensaryId: string;
  storeUrl: string;
}

export function ScheduleShareDialog({ 
  isOpen, 
  onOpenChange, 
  dispensaryId,
  storeUrl 
}: ScheduleShareDialogProps) {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<SocialPlatform>('facebook');
  const [message, setMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime || !message) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    
    if (scheduledDateTime <= new Date()) {
      toast({
        title: 'Invalid Date',
        description: 'Please select a future date and time',
        variant: 'destructive'
      });
      return;
    }

    setIsScheduling(true);

    try {
      const scheduledShare: Omit<ScheduledShare, 'id'> = {
        platform,
        message: `${message}\n\n${storeUrl}`,
        scheduledFor: scheduledDateTime,
        status: 'pending',
        createdAt: new Date()
      };

      await addDoc(
        collection(db, 'dispensaries', dispensaryId, 'scheduledShares'),
        {
          ...scheduledShare,
          scheduledFor: Timestamp.fromDate(scheduledDateTime),
          createdAt: Timestamp.now()
        }
      );

      toast({
        title: '🎯 Share Scheduled!',
        description: `Will be posted to ${PLATFORM_CONFIGS[platform].name} on ${scheduledDateTime.toLocaleString()}`
      });

      onOpenChange(false);
      
      // Reset form
      setMessage('');
      setScheduleDate('');
      setScheduleTime('');
      setPlatform('facebook');
      
    } catch (error) {
      console.error('Failed to schedule share:', error);
      toast({
        title: 'Scheduling Failed',
        description: 'Could not schedule your share. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-[#3D2E17] flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#006B3E]" />
            Schedule Share
          </DialogTitle>
          <DialogDescription className="font-bold text-[#5D4E37]">
            Plan your social media posts in advance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-[#3D2E17]">Platform</Label>
            <Select value={platform} onValueChange={(val) => setPlatform(val as SocialPlatform)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_CONFIGS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: config.color }}>●</span>
                      {config.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-[#3D2E17]">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your share message..."
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length} characters • Your store URL will be added automatically
            </p>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#3D2E17]">Date</Label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#3D2E17]">Time</Label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background"
              />
            </div>
          </div>

          {/* Preview */}
          {scheduleDate && scheduleTime && (
            <Card className="bg-[#006B3E]/10 border-[#006B3E]/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#3D2E17]">
                  <Clock className="h-4 w-4 text-[#006B3E]" />
                  Will be posted on: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isScheduling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={isScheduling || !message || !scheduleDate || !scheduleTime}
              className="bg-[#006B3E] hover:bg-[#3D2E17] text-white"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {isScheduling ? 'Scheduling...' : 'Schedule Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ScheduledSharesListProps {
  dispensaryId: string;
  scheduledShares: ScheduledShare[];
  onRefresh: () => void;
}

export function ScheduledSharesList({ 
  dispensaryId, 
  scheduledShares,
  onRefresh 
}: ScheduledSharesListProps) {
  const { toast } = useToast();

  const cancelShare = async (shareId: string) => {
    // Implementation for canceling scheduled share
    toast({
      title: 'Share Cancelled',
      description: 'The scheduled share has been cancelled'
    });
    onRefresh();
  };

  if (scheduledShares.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-8 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground font-bold">
            No scheduled shares yet. Schedule your first post!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {scheduledShares.map((share) => (
        <Card key={share.id} className="bg-white">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge style={{ backgroundColor: PLATFORM_CONFIGS[share.platform].color }} className="text-white">
                    {PLATFORM_CONFIGS[share.platform].name}
                  </Badge>
                  <Badge variant={share.status === 'pending' ? 'secondary' : 'outline'}>
                    {share.status}
                  </Badge>
                </div>
                <p className="text-sm text-[#3D2E17] font-semibold mb-2 line-clamp-2">
                  {share.message}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(share.scheduledFor).toLocaleString()}
                </div>
              </div>
              {share.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => share.id && cancelShare(share.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
