'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, TrendingUp, Users, DollarSign } from 'lucide-react';

export default function InfluencerApplicationPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    healingStory: '',
    primaryNiche: [] as string[],
    instagram: '',
    tiktok: '',
    youtube: '',
    twitter: '',
    facebook: '',
    agreedToTerms: false
  });

  const wellnessNiches = [
    'Cannabinoid Products',
    'Homeopathy',
    'Traditional Medicine',
    'Mushrooms',
    'Permaculture',
    'Healers & Practitioners',
    'CBD Products',
    'THC Products'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to apply as an influencer',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.agreedToTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please agree to the terms and conditions',
        variant: 'destructive'
      });
      return;
    }

    if (formData.primaryNiche.length === 0) {
      toast({
        title: 'Niche Required',
        description: 'Please select at least one wellness niche',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Generate referral code from display name
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'USER';
      const baseCode = displayName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const referralCode = `${baseCode}${randomSuffix}`;
      const referralLink = `${window.location.origin}?ref=${referralCode}`;

      const response = await fetch('/api/influencer/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: currentUser.displayName || 'Wellness Influencer',
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          bio: formData.bio,
          healingStory: formData.healingStory,
          primaryNiche: formData.primaryNiche,
          socialLinks: {
            instagram: formData.instagram || undefined,
            tiktok: formData.tiktok || undefined,
            youtube: formData.youtube || undefined,
            twitter: formData.twitter || undefined,
            facebook: formData.facebook || undefined
          },
          referralCode,
          referralLink
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      toast({
        title: 'Application Submitted!',
        description: 'Your influencer application is under review. We\'ll notify you once it\'s approved.',
      });

      router.push('/dashboard/influencer');
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Application Failed',
        description: error.message || 'Failed to submit your application',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-16 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-[#3D2E17] mb-4 flex items-center justify-center gap-3">
          <Sparkles className="h-12 w-12 text-yellow-500" />
          Become an Influencer
        </h1>
        <p className="text-xl text-[#5D4E37] font-semibold">
          Join our wellness community and earn while sharing healing
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="font-bold text-lg mb-2">Earn Up to 20%</h3>
            <p className="text-sm text-muted-foreground">
              Tiered commissions from 5% to 20% based on your performance
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="font-bold text-lg mb-2">Weekly Payouts</h3>
            <p className="text-sm text-muted-foreground">
              Automatic payments every Friday when you reach R500
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <h3 className="font-bold text-lg mb-2">Build Your Tribe</h3>
            <p className="text-sm text-muted-foreground">
              Create your own wellness community and grow together
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Form */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Application Form</CardTitle>
          <CardDescription>
            Tell us about yourself and your wellness journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself in a few sentences..."
                required
                rows={3}
              />
            </div>

            {/* Healing Story */}
            <div className="space-y-2">
              <Label htmlFor="healingStory">Your Healing Story</Label>
              <Textarea
                id="healingStory"
                value={formData.healingStory}
                onChange={(e) => setFormData({ ...formData, healingStory: e.target.value })}
                placeholder="Share your personal wellness journey (optional)"
                rows={4}
              />
            </div>

            {/* Wellness Niche */}
            <div className="space-y-2">
              <Label>Wellness Niche(s) *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {wellnessNiches.map((niche) => (
                  <div key={niche} className="flex items-center space-x-2">
                    <Checkbox
                      id={niche}
                      checked={formData.primaryNiche.includes(niche)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            primaryNiche: [...formData.primaryNiche, niche]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            primaryNiche: formData.primaryNiche.filter(n => n !== niche)
                          });
                        }
                      }}
                    />
                    <label htmlFor={niche} className="text-sm cursor-pointer">
                      {niche}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media Links */}
            <div className="space-y-4">
              <Label>Social Media (Optional)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    placeholder="Instagram @username"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    placeholder="TikTok @username"
                    value={formData.tiktok}
                    onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    placeholder="YouTube Channel URL"
                    value={formData.youtube}
                    onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Twitter/X @username"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreedToTerms}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, agreedToTerms: checked as boolean })
                }
              />
              <label htmlFor="terms" className="text-sm cursor-pointer">
                I agree to the Influencer Program Terms and Conditions
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#006B3E] hover:bg-[#005830]"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
