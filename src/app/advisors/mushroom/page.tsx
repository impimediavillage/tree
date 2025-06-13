
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, WandSparkles, AlertCircle, Brain } from 'lucide-react';
import { mushroomRecommendation, type MushroomRecommendationInput, type MushroomRecommendationOutput } from '@/ai/flows/mushroom-recommendation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

const ADVISOR_SLUG = 'mushroom-advisor';
const CREDITS_PER_QUESTION = 3;
const CREDITS_PER_RESPONSE = 3;

export default function MushroomAdvisorPage() {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [result, setResult] = useState<MushroomRecommendationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setIsLoadingCredits(true);
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        const user = JSON.parse(storedUserString) as User;
        setCurrentUser(user);
      } catch (e) {
        console.error("Error parsing current user:", e);
        toast({ title: "Error", description: "Could not load user data. Please try logging in again.", variant: "destructive" });
      }
    } else {
       toast({ title: "Authentication Required", description: "Please log in to use the advisors.", variant: "destructive" });
    }
    setIsLoadingCredits(false);
  }, [toast]);

  const deductCredits = async (creditsToDeduct: number): Promise<boolean> => {
    if (!currentUser || !currentUser.uid) {
      toast({ title: "Authentication Error", description: "User not found. Please log in.", variant: "destructive" });
      return false;
    }
    const functionUrl = process.env.NEXT_PUBLIC_DEDUCT_CREDITS_FUNCTION_URL;
    if (!functionUrl) {
      console.error("Deduct credits function URL is not configured.");
      toast({ title: "Configuration Error", description: "Credit system is not available.", variant: "destructive" });
      return false;
    }
    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          advisorSlug: ADVISOR_SLUG,
          creditsToDeduct,
          wasFreeInteraction: false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to deduct credits (status: ${response.status})`);
      }
      toast({ title: "Credits Deducted", description: `${creditsToDeduct} credits used.` });
      const updatedUser = { ...currentUser, credits: data.newCredits };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUser));
      return true;
    } catch (e: any) {
      console.error("Error deducting credits:", e);
      toast({ title: "Credit Deduction Failed", description: e.message || "Could not deduct credits.", variant: "destructive" });
      return false;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!issueType || !description) {
      setError('Please select an issue type and provide a description.');
      return;
    }
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "Please log in to get advice.", variant: "destructive" });
      return;
    }
    if (isLoadingCredits) {
      toast({ title: "Please wait", description: "Loading user credit information...", variant: "default" });
      return;
    }
    if ((currentUser.credits ?? 0) < CREDITS_PER_QUESTION) {
      toast({ title: "Insufficient Credits", description: `You need at least ${CREDITS_PER_QUESTION} credits to ask. You have ${currentUser.credits ?? 0}.`, variant: "destructive" });
      return;
    }
    const totalCreditsNeeded = CREDITS_PER_QUESTION + CREDITS_PER_RESPONSE;
    if ((currentUser.credits ?? 0) < totalCreditsNeeded) {
      toast({ title: "Insufficient Credits", description: `You need ${totalCreditsNeeded} credits for a full interaction. You have ${currentUser.credits ?? 0}.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    const questionCreditsDeducted = await deductCredits(CREDITS_PER_QUESTION);
    if (!questionCreditsDeducted) {
      setIsLoading(false);
      return;
    }
    if (currentUser && (currentUser.credits ?? 0) < CREDITS_PER_RESPONSE) {
        toast({ title: "Insufficient Credits for Response", description: `Need ${CREDITS_PER_RESPONSE} more for the response. Balance: ${currentUser.credits ?? 0}.`, variant: "destructive" });
        setIsLoading(false);
        return;
    }

    try {
      const input: MushroomRecommendationInput = { issueType, description };
      const adviceOutput = await mushroomRecommendation(input);
      setResult(adviceOutput);
      const responseCreditsDeducted = await deductCredits(CREDITS_PER_RESPONSE);
      if (!responseCreditsDeducted) {
        toast({title: "Warning", description: "Response received, credit deduction issue for response.", variant: "default"});
      }
    } catch (e: any) {
      console.error("Error getting mushroom recommendation:", e);
      setError(e.message || 'Failed to get recommendation. Please try again.');
      toast({ title: "Error", description: e.message || 'Failed to get recommendation.', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">Mushroom Advisor (Funguy)</CardTitle>
              <CardDescription className="text-md">
                Discover mushroom-based products for mental, physical, and spiritual well-being.
                Each query costs {CREDITS_PER_QUESTION + CREDITS_PER_RESPONSE} credits.
              </CardDescription>
              {currentUser && !isLoadingCredits && (
                <p className="text-sm text-muted-foreground mt-1">
                  Your credits: <span className="font-semibold text-primary">{currentUser.credits ?? 'N/A'}</span>
                </p>
              )}
              {isLoadingCredits && <p className="text-sm text-muted-foreground mt-1">Loading credits...</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="issueType" className="text-lg">What type of concern are you addressing?</Label>
              <Select value={issueType} onValueChange={setIssueType} disabled={isLoading || isLoadingCredits}>
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select concern type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mental">Mental Wellness (e.g., focus, anxiety)</SelectItem>
                  <SelectItem value="physical">Physical Health (e.g., immunity, energy)</SelectItem>
                  <SelectItem value="spiritual">Spiritual Exploration (e.g., insight, connection)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-lg">Describe your needs and preferences in detail:</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Looking for something to improve focus during work. Interested in natural options. What are the legal considerations for microdosing in South Africa?"
                rows={6}
                className="text-base"
                disabled={isLoading || isLoadingCredits}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive border border-destructive/50 bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || isLoadingCredits || !currentUser}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 h-5 w-5" />
              )}
              Ask the Funguy
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-primary">Mushroom Funguy's Recommendation:</h3>
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
