
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, WandSparkles, AlertCircle, Sprout } from 'lucide-react';
import { getFlowerPowerAdvice, type FlowerPowerAdviceInput, type FlowerPowerAdviceOutput } from '@/ai/flows/flower-power-advice';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';

const ADVISOR_SLUG = 'flower-power-advisor';
const CREDITS_PER_QUESTION = 1;
const CREDITS_PER_RESPONSE = 1;

export default function FlowerPowerAdvisorPage() {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [result, setResult] = useState<FlowerPowerAdviceOutput | null>(null);
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
    if (!description) {
      setError('Please describe your emotional state or question.');
      return;
    }
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "Please log in to get advice.", variant: "destructive" });
      return;
    }
    const totalCreditsNeeded = CREDITS_PER_QUESTION + CREDITS_PER_RESPONSE;
    if ((currentUser.credits ?? 0) < totalCreditsNeeded) {
      toast({ title: "Insufficient Credits", description: `You need ${totalCreditsNeeded} credits for a full interaction.`, variant: "destructive" });
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
    try {
      const input: FlowerPowerAdviceInput = { question: description };
      const adviceOutput = await getFlowerPowerAdvice(input);
      setResult(adviceOutput);
      await deductCredits(CREDITS_PER_RESPONSE);
    } catch (e: any) {
      setError(e.message || 'Failed to get advice. Please try again.');
      toast({ title: "Error", description: e.message || 'Failed to get advice.', variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sprout className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">Flower Power Advisor</CardTitle>
              <CardDescription className="text-md">
                Discover the perfect flower essence for your emotional well-being.
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
              <Label htmlFor="description" className="text-lg">How are you feeling?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., I'm feeling overwhelmed by change, or I lack confidence in my decisions."
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
              Get Flower Power Advice
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-primary">Your Personalized Recommendation:</h3>
              <div className="p-4 bg-muted rounded-md shadow whitespace-pre-wrap text-sm">
                {result.advice}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
