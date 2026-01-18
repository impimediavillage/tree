'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Bell, Volume2, Moon, Clock, TestTube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getUserNotificationPreferences,
  updateNotificationPreferences,
  playNotificationSound,
} from '@/lib/notificationService';
import type { NotificationPreferences } from '@/types/notification';
import { useSearchParams } from 'next/navigation';

export default function DispensaryAdminSettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab');
  
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
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
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
        title: 'Settings Saved',
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
      playNotificationSound('ka-ching', preferences);
      toast({
        title: 'Test Notification 🔔',
        description: 'This is how your notifications will look and sound!',
      });
    } else {
      toast({
        title: 'Test Notification 🔔',
        description: 'This is how your notifications will look (sounds are disabled)!',
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
          Customize how you receive notifications for orders, payments, and updates
        </p>
      </div>

      <div className="space-y-6">
        {/* Notification Channels */}
        <Card className="border-[#3D2E17]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#006B3E]" />
              Notification Channels
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sounds" className="font-semibold">Sound Effects</Label>
                <p className="text-sm text-muted-foreground">
                  Play audio notifications for important events
                </p>
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
                <Label htmlFor="push" className="font-semibold">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications even when the app is closed
                </p>
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
                <Label htmlFor="toasts" className="font-semibold">In-App Toasts</Label>
                <p className="text-sm text-muted-foreground">
                  Show notification popups while using the app
                </p>
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

        {/* Sound Volume */}
        {preferences.enableSounds && (
          <Card className="border-[#3D2E17]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-[#006B3E]" />
                Sound Volume
              </CardTitle>
              <CardDescription>
                Adjust the volume of notification sounds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume: {preferences.soundVolume}%</Label>
                </div>
                <Slider
                  value={[preferences.soundVolume]}
                  onValueChange={([value]) =>
                    setPreferences({ ...preferences, soundVolume: value })
                  }
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification Types */}
        <Card className="border-[#3D2E17]/20">
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="orders">💰 Order Notifications</Label>
                <p className="text-sm text-muted-foreground">New orders and updates</p>
              </div>
              <Switch
                id="orders"
                checked={preferences.orderNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, orderNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="payments">💳 Payment Notifications</Label>
                <p className="text-sm text-muted-foreground">Payment confirmations</p>
              </div>
              <Switch
                id="payments"
                checked={preferences.paymentNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, paymentNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="shipping">🚚 Shipping Notifications</Label>
                <p className="text-sm text-muted-foreground">Shipping and delivery updates</p>
              </div>
              <Switch
                id="shipping"
                checked={preferences.shippingNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, shippingNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="products">📦 Product Notifications</Label>
                <p className="text-sm text-muted-foreground">New products and updates</p>
              </div>
              <Switch
                id="products"
                checked={preferences.productNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, productNotifications: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="system">⚙️ System Notifications</Label>
                <p className="text-sm text-muted-foreground">Important system updates</p>
              </div>
              <Switch
                id="system"
                checked={preferences.systemNotifications}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, systemNotifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Do Not Disturb */}
        <Card className="border-[#3D2E17]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-[#006B3E]" />
              Do Not Disturb
            </CardTitle>
            <CardDescription>
              Silence notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="dnd">Enable Do Not Disturb</Label>
                <p className="text-sm text-muted-foreground">
                  Mute notifications during scheduled hours
                </p>
              </div>
              <Switch
                id="dnd"
                checked={preferences.doNotDisturb}
                onCheckedChange={(checked) =>
                  setPreferences({ ...preferences, doNotDisturb: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#006B3E] hover:bg-[#005230] text-white flex-1"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button
            onClick={handleTestNotification}
            variant="outline"
            className="border-[#3D2E17]/30 text-[#3D2E17] hover:bg-[#006B3E]/10"
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Notification
          </Button>
        </div>
      </div>
    </div>
  );
}
