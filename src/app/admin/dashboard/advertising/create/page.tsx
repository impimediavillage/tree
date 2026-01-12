'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Target,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Tv,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AdType, AdPlacement } from '@/types/advertising';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const AD_PLACEMENTS: { value: AdPlacement; label: string; description: string }[] = [
  { value: 'hero_banner', label: 'Home Page Hero', description: 'Top banner on homepage (highest visibility)' },
  { value: 'product_grid', label: 'Home Page Featured', description: 'Featured section on homepage' },
  { value: 'inline', label: 'Browse Types Page', description: 'Store types browsing page' },
  { value: 'sidebar', label: 'Dispensaries List', description: 'Store listing pages' },
  { value: 'floating', label: 'Global Sidebar', description: 'Sidebar across the platform' },
];

export default function AdminCreateAdPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [adType, setAdType] = useState<AdType>('special_deal');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [ctaText, setCtaText] = useState('Learn More');
  const [ctaLink, setCtaLink] = useState('');
  const [selectedPlacements, setSelectedPlacements] = useState<AdPlacement[]>([]);
  const [targetUrl, setTargetUrl] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/admin/dashboard');
    }
  }, [isSuperAdmin, router]);

  const progress = (step / 3) * 100;

  const togglePlacement = (placement: AdPlacement) => {
    setSelectedPlacements(prev => 
      prev.includes(placement)
        ? prev.filter(p => p !== placement)
        : [...prev, placement]
    );
  };

  const handleNext = () => {
    // Step 1 validation
    if (step === 1) {
      if (!title.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Please enter an ad title',
          variant: 'destructive'
        });
        return;
      }
    }

    // Step 2 validation
    if (step === 2) {
      if (selectedPlacements.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please select at least one placement',
          variant: 'destructive'
        });
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePublish = async () => {
    if (selectedPlacements.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one placement',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      const adData = {
        // Basic Info
        type: adType,
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        ctaText: ctaText.trim() || 'Learn More',
        ctaLink: ctaLink.trim() || '/',
        
        // Platform ad identifier
        dispensaryId: 'PLATFORM',
        dispensaryName: 'The Wellness Tree',
        
        // Placements
        design: {
          template: 'modern',
          animation: 'fade',
          placements: selectedPlacements
        },
        
        // Status
        status: 'active',
        
        // Not available to influencers (platform ads)
        influencerCommission: {
          rate: 0,
          availableToInfluencers: false
        },
        
        // Products (empty for platform ads)
        products: [],
        isBundle: false,
        
        // Analytics
        analytics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          ctr: 0,
          conversionRate: 0
        },
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'advertisements'), adData);

      toast({
        title: 'Success! 🎉',
        description: 'Platform ad created successfully'
      });

      router.push(`/admin/dashboard/advertising`);
    } catch (error) {
      console.error('Error creating ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to create ad',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/dashboard/advertising')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Advertising
        </Button>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <Tv className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Create Platform Ad</h1>
            <p className="text-muted-foreground">Place ads across the platform (outside store pages)</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 3</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step 1: Ad Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Ad Details
            </CardTitle>
            <CardDescription>Create an eye-catching platform advertisement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ad Type */}
            <div className="space-y-2">
              <Label htmlFor="adType">Ad Type</Label>
              <Select value={adType} onValueChange={(value: AdType) => setAdType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="special_deal">Special Deal 🔥</SelectItem>
                  <SelectItem value="featured_product">Featured Product ⭐</SelectItem>
                  <SelectItem value="social_campaign">Social Campaign 🚀</SelectItem>
                  <SelectItem value="custom">Custom Ad 🎨</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
            </div>

            {/* CTA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctaText">Call-to-Action Text</Label>
                <Input
                  id="ctaText"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Learn More"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaLink">CTA Link *</Label>
                <Input
                  id="ctaLink"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  placeholder="/browse-dispensary-types"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Placements */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Ad Placements
            </CardTitle>
            <CardDescription>Select where this ad will appear on the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {AD_PLACEMENTS.map((placement) => (
              <Card
                key={placement.value}
                className={`cursor-pointer transition-all ${
                  selectedPlacements.includes(placement.value)
                    ? 'border-2 border-primary bg-primary/5'
                    : 'border hover:border-primary/50'
                }`}
                onClick={() => togglePlacement(placement.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        {placement.label}
                        {selectedPlacements.includes(placement.value) && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {placement.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-400/30">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Platform ads appear OUTSIDE of store pages. For store-specific ads, dispensary owners create them in their dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Publish */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Review & Publish
            </CardTitle>
            <CardDescription>Review your ad before publishing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Ad Type</Label>
                <p className="font-semibold">{adType.replace('_', ' ').toUpperCase()}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Title</Label>
                <p className="font-semibold">{title}</p>
              </div>
              
              {subtitle && (
                <div>
                  <Label className="text-muted-foreground">Subtitle</Label>
                  <p>{subtitle}</p>
                </div>
              )}
              
              {description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{description}</p>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">Call-to-Action</Label>
                <p>{ctaText} → {ctaLink}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Placements ({selectedPlacements.length})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPlacements.map(placement => (
                    <Badge key={placement} variant="secondary">
                      {AD_PLACEMENTS.find(p => p.value === placement)?.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-400/30">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Ready to go live!</strong> This ad will be active immediately across all selected placements.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={step === 1 ? () => router.push('/admin/dashboard/advertising') : handleBack}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handlePublish} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Publish Ad
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
