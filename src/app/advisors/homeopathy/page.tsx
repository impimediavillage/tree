
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, WandSparkles, AlertCircle } from 'lucide-react';
import { getHomeopathicProductAdvice, type HomeopathicProductAdviceInput, type HomeopathicProductAdviceOutput } from '@/ai/flows/homeopathic-product-advice';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const ADVISOR_SLUG = 'homeopathic-advisor';
const CREDITS_TO_DEDUCT = 6;

export default function HomeopathicAdvisorPage() {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [diet, setDiet] = useState('');
  const [location, setLocation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
  const [result, setResult] = useState<HomeopathicProductAdviceOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const deductCredits = httpsCallable(functions, 'deductCreditsAndLogInteraction');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!issueType || !description || !age || !gender || !diet || !location) {
      setError('Please fill in all fields to get the best advice.');
      return;
    }
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "Please log in to get advice.", variant: "destructive" });
      return;
    }
    
    if ((currentUser.credits ?? 0) < CREDITS_TO_DEDUCT) {
      toast({ title: "Insufficient Credits", description: `You need ${CREDITS_TO_DEDUCT} credits for this advisor.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      await deductCredits({
          userId: currentUser.uid,
          advisorSlug: ADVISOR_SLUG,
          creditsToDeduct: CREDITS_TO_DEDUCT,
          wasFreeInteraction: false,
      });

      const newCredits = (currentUser.credits ?? 0) - CREDITS_TO_DEDUCT;
      setCurrentUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify({ ...currentUser, credits: newCredits }));

      const input: HomeopathicProductAdviceInput = { issueType, description, age, gender, diet, location };
      const adviceOutput = await getHomeopathicProductAdvice(input);
      setResult(adviceOutput);

      toast({ title: "Success!", description: `${CREDITS_TO_DEDUCT} credits were used.` });

    } catch (e: any) {
      setError(e.message || 'Failed to get advice. Please try again.');
      toast({ title: "Error", description: e.message || 'Failed to get advice. Your credits were not charged.', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <WandSparkles className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">Homeopathic Advisor</CardTitle>
              <CardDescription className="text-md">
                Gentle homeopathic remedies, dosage, and reputable sources.
                Each query costs {CREDITS_TO_DEDUCT} credits.
              </CardDescription>
              {currentUser && !authLoading && (
                <p className="text-sm text-muted-foreground mt-1">
                  Your credits: <span className="font-semibold text-primary">{currentUser.credits ?? 'N/A'}</span>
                </p>
              )}
              {authLoading && <p className="text-sm text-muted-foreground mt-1">Loading credits...</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueType" className="text-base">Ailment/Condition Type</Label>
                <Input id="issueType" value={issueType} onChange={(e) => setIssueType(e.target.value)} placeholder="e.g., Cold, Headache, Skin Rash" disabled={isLoading || authLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age" className="text-base">Age</Label>
                <Input id="age" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g., 35 years, 6 months" disabled={isLoading || authLoading} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">Detailed Description of Ailment & Symptoms</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Include onset, specific sensations, what makes it better or worse, etc." rows={5} disabled={isLoading || authLoading} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-base">Gender</Label>
                <Select value={gender} onValueChange={setGender} disabled={isLoading || authLoading}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="diet" className="text-base">Diet</Label>
                <Input id="diet" value={diet} onChange={(e) => setDiet(e.target.value)} placeholder="e.g., Vegetarian, Omnivore, Specific restrictions" disabled={isLoading || authLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-base">Location (City/Region)</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Cape Town, South Africa" disabled={isLoading || authLoading} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive border border-destructive/50 bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || authLoading || !currentUser}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <WandSparkles className="mr-2 h-5 w-5" />}
              Get Homeopathic Advice
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-primary">Your Personalized Homeopathic Recommendation:</h3>
              <div className="p-4 bg-muted rounded-md shadow whitespace-pre-wrap text-sm">
                {result.recommendation}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
