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
  MapPin, 
  Plus, 
  X, 
  Calendar,
  ArrowLeft,
  Sparkles,
  Smile,
  Meh,
  Frown,
  Heart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';

interface Milestone {
  id: string;
  date: string;
  title: string;
  description: string;
  emotion: 'happy' | 'neutral' | 'challenging';
  images: string[];
  productIds: string[];
}

export default function CreateJourneyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [influencerName, setInfluencerName] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Current milestone being added
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone>({
    id: '',
    date: '',
    title: '',
    description: '',
    emotion: 'happy',
    images: [],
    productIds: []
  });

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

  const addMilestone = () => {
    if (!currentMilestone.date || !currentMilestone.title || !currentMilestone.description) {
      toast({ variant: "destructive", description: "Please fill in all milestone fields" });
      return;
    }

    if (currentMilestone.description.length < 20) {
      toast({ variant: "destructive", description: "Milestone description must be at least 20 characters" });
      return;
    }

    const newMilestone: Milestone = {
      ...currentMilestone,
      id: Date.now().toString()
    };

    setMilestones([...milestones, newMilestone]);
    setCurrentMilestone({
      id: '',
      date: '',
      title: '',
      description: '',
      emotion: 'happy',
      images: [],
      productIds: []
    });
    setShowMilestoneForm(false);
    toast({ description: "Milestone added!" });
  };

  const removeMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
    toast({ description: "Milestone removed" });
  };

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy':
        return <Smile className="w-4 h-4 text-green-600" />;
      case 'neutral':
        return <Meh className="w-4 h-4 text-yellow-600" />;
      case 'challenging':
        return <Frown className="w-4 h-4 text-red-600" />;
      default:
        return <Smile className="w-4 h-4" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ variant: "destructive", description: "You must be logged in" });
      return;
    }

    if (!title.trim() || title.length < 5) {
      toast({ variant: "destructive", description: "Journey title must be at least 5 characters" });
      return;
    }

    if (!description.trim() || description.length < 50) {
      toast({ variant: "destructive", description: "Journey description must be at least 50 characters" });
      return;
    }

    if (milestones.length === 0) {
      toast({ variant: "destructive", description: "Please add at least one milestone to your journey" });
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, 'healingJourneys'), {
        influencerId: user.uid,
        influencerName,
        title: title.trim(),
        description: description.trim(),
        coverImage: coverImage.trim() || null,
        milestones: milestones.map(m => ({
          date: m.date,
          title: m.title,
          description: m.description,
          emotion: m.emotion,
          images: m.images,
          productIds: m.productIds
        })),
        isPublic,
        stats: {
          views: 0,
          likes: 0,
          shares: 0,
          productsSold: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ description: "Healing journey created successfully!" });
      router.push('/dashboard/influencer/journey');
    } catch (error) {
      console.error('Error creating journey:', error);
      toast({ variant: "destructive", description: "Failed to create journey" });
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
        <h1 className="text-3xl font-bold">Create Healing Journey</h1>
        <p className="text-gray-600 mt-2">Share your transformation story with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Journey Overview
            </CardTitle>
            <CardDescription>Start by describing your wellness transformation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Journey Title *</Label>
              <Input
                id="title"
                placeholder="e.g., My 90-Day CBD Healing Journey"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
            </div>

            <div>
              <Label htmlFor="description">Journey Description *</Label>
              <Textarea
                id="description"
                placeholder="Tell your story... What led you to start this journey? What were you hoping to achieve? What challenges did you face?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={1000}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/1000 characters</p>
            </div>

            <div>
              <Label htmlFor="coverImage">Cover Image URL (optional)</Label>
              <Input
                id="coverImage"
                type="url"
                placeholder="https://example.com/your-journey-photo.jpg"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">A beautiful photo that represents your journey</p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="visibility" className="font-semibold">
                    {isPublic ? '🌍 Public Journey' : '🔒 Private Journey'}
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  {isPublic 
                    ? 'Anyone can discover and read your story'
                    : 'Only you can see this journey'
                  }
                </p>
              </div>
              <Switch
                id="visibility"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Journey Milestones
            </CardTitle>
            <CardDescription>
              Add key moments and achievements in your journey ({milestones.length}/20)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Milestones */}
            {milestones.length > 0 && (
              <div className="space-y-3">
                {milestones.map((milestone, index) => (
                  <div
                    key={milestone.id}
                    className="p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          Milestone {index + 1}
                        </Badge>
                        <Badge variant="secondary">
                          {getEmotionIcon(milestone.emotion)}
                          <span className="ml-1 capitalize">{milestone.emotion}</span>
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(milestone.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">{milestone.date}</p>
                    <p className="font-semibold mb-1">{milestone.title}</p>
                    <p className="text-sm text-gray-600">{milestone.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Milestone Form */}
            {showMilestoneForm ? (
              <Card className="border-2 border-[#006B3E]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">New Milestone</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="milestone-date">Date *</Label>
                    <Input
                      id="milestone-date"
                      type="date"
                      value={currentMilestone.date}
                      onChange={(e) => setCurrentMilestone({...currentMilestone, date: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="milestone-title">Title *</Label>
                    <Input
                      id="milestone-title"
                      placeholder="e.g., First week on CBD oil"
                      value={currentMilestone.title}
                      onChange={(e) => setCurrentMilestone({...currentMilestone, title: e.target.value})}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="milestone-description">Description *</Label>
                    <Textarea
                      id="milestone-description"
                      placeholder="Describe what happened at this point in your journey..."
                      value={currentMilestone.description}
                      onChange={(e) => setCurrentMilestone({...currentMilestone, description: e.target.value})}
                      rows={3}
                      maxLength={500}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {currentMilestone.description.length}/500 characters
                    </p>
                  </div>

                  <div>
                    <Label>How did you feel? *</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[
                        { value: 'happy', label: 'Happy', icon: Smile, color: 'text-green-600 border-green-600' },
                        { value: 'neutral', label: 'Neutral', icon: Meh, color: 'text-yellow-600 border-yellow-600' },
                        { value: 'challenging', label: 'Challenging', icon: Frown, color: 'text-red-600 border-red-600' }
                      ].map(emotion => {
                        const Icon = emotion.icon;
                        return (
                          <button
                            key={emotion.value}
                            type="button"
                            onClick={() => setCurrentMilestone({...currentMilestone, emotion: emotion.value as any})}
                            className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                              currentMilestone.emotion === emotion.value 
                                ? `${emotion.color} bg-gray-50` 
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            <Icon className={currentMilestone.emotion === emotion.value ? emotion.color : 'w-5 h-5 text-gray-400'} />
                            <span className="text-xs font-medium">{emotion.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowMilestoneForm(false);
                        setCurrentMilestone({
                          id: '',
                          date: '',
                          title: '',
                          description: '',
                          emotion: 'happy',
                          images: [],
                          productIds: []
                        });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={addMilestone}
                      className="flex-1 bg-[#006B3E] hover:bg-[#005530]"
                    >
                      Add Milestone
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMilestoneForm(true)}
                disabled={milestones.length >= 20}
                className="w-full border-dashed border-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            )}

            {milestones.length === 0 && !showMilestoneForm && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">No milestones yet</p>
                <p className="text-xs text-gray-400">
                  Add milestones to document your journey
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {milestones.length > 0 && (
          <Card className="border-2 border-[#006B3E]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#006B3E]" />
                Journey Preview
              </CardTitle>
              <CardDescription>How your journey will look to others</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h3 className="text-xl font-bold">{title || 'Your Journey Title'}</h3>
                <p className="text-sm text-gray-700">{description || 'Your journey description'}</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{milestones.length} milestones</span>
                  <span className="text-sm text-gray-400">•</span>
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="text-sm text-gray-600">
                    {milestones.filter(m => m.emotion === 'happy').length} happy moments
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            disabled={loading || !title || !description || milestones.length === 0}
            className="flex-1 bg-[#006B3E] hover:bg-[#005530]"
          >
            {loading ? (
              <>Creating Journey...</>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Journey
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
