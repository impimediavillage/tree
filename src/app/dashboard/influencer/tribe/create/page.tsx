'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  X, 
  Award, 
  Lock, 
  Globe,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

export default function CreateTribePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [influencerName, setInfluencerName] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [currentPerk, setCurrentPerk] = useState('');
  const [perks, setPerks] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadInfluencerProfile();
    }
  }, [user]);

  const loadInfluencerProfile = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, 'influencers', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profile = docSnap.data();
        setInfluencerName(profile.name || profile.displayName || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const addPerk = () => {
    if (currentPerk.trim() && perks.length < 10) {
      setPerks([...perks, currentPerk.trim()]);
      setCurrentPerk('');
    } else if (perks.length >= 10) {
      toast.error('Maximum 10 perks allowed');
    }
  };

  const removePerk = (index: number) => {
    setPerks(perks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!name.trim() || name.length < 3) {
      toast.error('Tribe name must be at least 3 characters');
      return;
    }

    if (!tagline.trim()) {
      toast.error('Please add a tagline');
      return;
    }

    if (!description.trim() || description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, 'wellnessTribes'), {
        influencerId: user.uid,
        influencerName,
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        isPrivate,
        perks: perks,
        stats: {
          members: 0,
          activeChallenges: 0,
          totalEngagement: 0,
          totalRewards: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success('Tribe created successfully!');
      router.push('/dashboard/influencer/tribe');
    } catch (error) {
      console.error('Error creating tribe:', error);
      toast.error('Failed to create tribe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create Wellness Tribe</h1>
        <p className="text-gray-600 mt-2">Build your community and inspire wellness together</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Give your tribe an identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Tribe Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Mindful Warriors, Green Healers, Zen Squad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{name.length}/50 characters</p>
            </div>

            <div>
              <Label htmlFor="tagline">Tagline *</Label>
              <Input
                id="tagline"
                placeholder="A short, catchy phrase about your tribe"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{tagline.length}/100 characters</p>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what your tribe is about, who it's for, and what members can expect..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/500 characters</p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isPrivate ? (
                    <Lock className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Globe className="w-4 h-4 text-green-600" />
                  )}
                  <Label htmlFor="privacy" className="font-semibold">
                    {isPrivate ? 'Private Tribe' : 'Public Tribe'}
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  {isPrivate 
                    ? 'Only invited members can join'
                    : 'Anyone can discover and join your tribe'
                  }
                </p>
              </div>
              <Switch
                id="privacy"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
          </CardContent>
        </Card>

        {/* Member Perks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Member Perks
            </CardTitle>
            <CardDescription>
              Add exclusive benefits for tribe members (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="e.g., 10% discount on products, Weekly wellness tips"
                value={currentPerk}
                onChange={(e) => setCurrentPerk(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPerk();
                  }
                }}
                maxLength={50}
              />
              <Button
                type="button"
                onClick={addPerk}
                disabled={!currentPerk.trim() || perks.length >= 10}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {perks.length > 0 && (
              <div className="space-y-2">
                <Label>Added Perks ({perks.length}/10)</Label>
                <div className="flex flex-wrap gap-2">
                  {perks.map((perk, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-sm pl-3 pr-1 py-1"
                    >
                      <Award className="w-3 h-3 mr-1" />
                      {perk}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 ml-2 hover:bg-red-100"
                        onClick={() => removePerk(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {perks.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Add perks to make your tribe more attractive
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Examples: Discounts, exclusive content, priority support, wellness guides
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-2 border-[#006B3E]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#006B3E]" />
              Preview
            </CardTitle>
            <CardDescription>How your tribe will appear to others</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">
                  {name || 'Your Tribe Name'}
                </h3>
                <Badge variant={isPrivate ? "secondary" : "default"}>
                  {isPrivate ? (
                    <><Lock className="w-3 h-3 mr-1" /> Private</>
                  ) : (
                    <><Globe className="w-3 h-3 mr-1" /> Public</>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 italic">
                {tagline || 'Your tagline will appear here'}
              </p>
              <p className="text-sm text-gray-700">
                {description || 'Your description will appear here'}
              </p>
              {perks.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-semibold mb-2">Member Perks:</p>
                  <div className="flex flex-wrap gap-2">
                    {perks.map((perk, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        {perk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !name || !tagline || !description}
            className="flex-1 bg-[#006B3E] hover:bg-[#005530]"
          >
            {loading ? (
              <>Creating...</>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Tribe
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
