'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Bell, Volume2, TestTube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getUserNotificationPreferences,
  updateNotificationPreferences,
  playNotificationSound,
} from '@/lib/notificationService';
import type { NotificationPreferences } from '@/types/notification';

export default function LeafUserSettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.uid) {
      loadPreferences();
    }
  }, [currentUser]);

  const loadPreferences = async () => {
    if (!currentUser?.uid) return;
    
    setLoading(true);
    try {
      const prefs = await getUserNotificationPreferences(currentUser.uid);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.uid || !preferences) return;
    
    setSaving(true);
    try {
      await updateNotificationPreferences(currentUser.uid, preferences);
      toast({
        title: 'Settings Saved ✅',
        description: 'Your notification preferences have been updated',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = () => {
    if (preferences?.enableSounds) {
      playNotificationSound('delivered', preferences);
      toast({
        title: 'Order Delivered! 🎉',
        description: 'Your package has arrived - enjoy!',
      });
    } else {
      toast({
        title: 'Order Delivered! 🎉',
        description: 'Your package has arrived (sounds disabled)',
      });
    }
  };

  if (loading || !preferences) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#3D2E17] mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">
          Customize how you receive order and delivery updates
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-[#3D2E17]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#006B3E]" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sounds">Sound Effects</Label>
                <p className="text-sm text-muted-foreground">Hear when orders update</p>
              </div>
              <Switch
                id="sounds"
                checked={preferences.enableSounds}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, enableSounds: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="push">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Get alerts when app is closed</p>
              </div>
              <Switch
                id="push"
                checked={preferences.enablePushNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, enablePushNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="toasts">In-App Toasts</Label>
                <p className="text-sm text-muted-foreground">Show popup notifications</p>
              </div>
              <Switch
                id="toasts"
                checked={preferences.enableInAppToasts}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, enableInAppToasts: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {preferences.enableSounds && (
          <Card className="border-[#3D2E17]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-[#006B3E]" />
                Volume: {preferences.soundVolume}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Slider
                value={[preferences.soundVolume]}
                onValueChange={([value]) =>
                  setPreferences({ ...preferences, soundVolume: value })
                }
                max={100}
                step={5}
              />
            </CardContent>
          </Card>
        )}

        <Card className="border-[#3D2E17]/20">
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="orders">💰 Order Updates</Label>
              <Switch
                id="orders"
                checked={preferences.orderNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, orderNotifications: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="shipping">🚚 Delivery Updates</Label>
              <Switch
                id="shipping"
                checked={preferences.shippingNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, shippingNotifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#006B3E] hover:bg-[#005230] text-white flex-1"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button onClick={handleTestNotification} variant="outline">
            <TestTube className="h-4 w-4 mr-2" />
            Test
          </Button>
        </div>
      </div>
    </div>
  );
}
