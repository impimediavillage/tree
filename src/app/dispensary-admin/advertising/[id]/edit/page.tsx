'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Advertisement } from '@/types/advertising';
import Link from 'next/link';

export default function EditAdPage() {
  const params = useParams();
  const adId = params?.id as string;
  const { currentUser, currentDispensary, isDispensaryOwner } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ad, setAd] = useState<Advertisement | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('');
  const [availableToInfluencers, setAvailableToInfluencers] = useState(false);
  const [commissionRate, setCommissionRate] = useState(10);

  useEffect(() => {
    if (!isDispensaryOwner) {
      toast({
        title: 'Access Denied',
        description: 'Only store owners can edit ads',
        variant: 'destructive'
      });
      router.push('/dispensary-admin/dashboard');
      return;
    }

    fetchAd();
  }, [adId]);

  const fetchAd = async () => {
    try {
      setLoading(true);
      const adDoc = await getDoc(doc(db, 'advertisements', adId));
      
      if (!adDoc.exists()) {
        toast({
          title: 'Error',
          description: 'Ad not found',
          variant: 'destructive'
        });
        router.push('/dispensary-admin/advertising');
        return;
      }

      const adData = { id: adDoc.id, ...adDoc.data() } as Advertisement;

      // Verify ownership
      if (adData.dispensaryId !== currentDispensary?.id) {
        toast({
          title: 'Access Denied',
          description: 'You can only edit your own ads',
          variant: 'destructive'
        });
        router.push('/dispensary-admin/advertising');
        return;
      }

      setAd(adData);
      setTitle(adData.title);
      setSubtitle(adData.subtitle || '');
      setDescription(adData.description || '');
      setCtaText(adData.ctaText || 'Shop Now');
      setCtaLink(adData.ctaLink || '');
      setAvailableToInfluencers(adData.influencerCommission?.availableToInfluencers || false);
      setCommissionRate(adData.influencerCommission?.rate || 10);
    } catch (error) {
      console.error('Error fetching ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ad',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!ad) return;

    // Validation
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an ad title',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, 'advertisements', adId), {
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        ctaText: ctaText.trim() || 'Shop Now',
        ctaLink: ctaLink.trim(),
        influencerCommission: {
          rate: commissionRate,
          availableToInfluencers
        },
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Success',
        description: 'Ad updated successfully'
      });

      router.push(`/dispensary-admin/advertising/${adId}`);
    } catch (error) {
      console.error('Error updating ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to update ad',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ad) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dispensary-admin/advertising/${adId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ad
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mt-2">Edit Advertisement</h1>
          <p className="text-muted-foreground">Update your ad details</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Ad Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter ad title"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Add a subtitle (optional)"
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground">{subtitle.length}/150 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your offer..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctaText">Call-to-Action Text</Label>
              <Input
                id="ctaText"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Shop Now"
                maxLength={30}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaLink">CTA Link (optional)</Label>
              <Input
                id="ctaLink"
                value={ctaLink}
                onChange={(e) => setCtaLink(e.target.value)}
                placeholder="/store/product-slug"
              />
            </div>
          </div>

          {/* Influencer Settings */}
          <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="influencer-toggle">Available to Influencers</Label>
                <p className="text-sm text-muted-foreground">
                  Allow influencers to promote this ad and earn commissions
                </p>
              </div>
              <Switch
                id="influencer-toggle"
                checked={availableToInfluencers}
                onCheckedChange={setAvailableToInfluencers}
              />
            </div>

            {availableToInfluencers && (
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="commission">Commission Rate (%)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="50"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="max-w-[120px]"
                  />
                  <span className="text-sm text-muted-foreground">
                    Influencers will earn {commissionRate}% on each conversion
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href={`/dispensary-admin/advertising/${adId}`}>
            Cancel
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
