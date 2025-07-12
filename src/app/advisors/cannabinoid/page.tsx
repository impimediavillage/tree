
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, WandSparkles, AlertCircle } from 'lucide-react';
import { cannabinoidAdvice, type CannabinoidAdviceInput, type CannabinoidAdviceOutput } from '@/ai/flows/cannabinoid-advice';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types'; // Assuming User type is defined with id and credits

const ADVISOR_SLUG = 'cannabinoid-advisor';
const CREDITS_PER_QUESTION = 3;
const CREDITS_PER_RESPONSE = 3;

export default function CannabinoidAdvisorPage() {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);
  const [result, setResult] = useState<CannabinoidAdviceOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // This would typically come from an auth context
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
          wasFreeInteraction: false, // Assuming paid interaction for now
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to deduct credits (status: ${response.status})`);
      }

      toast({ title: "Credits Deducted", description: `${creditsToDeduct} credits used.` });
      // Update local user credit count
      setCurrentUser(prevUser => prevUser ? { ...prevUser, credits: data.newCredits } : null);
      // Update localStorage too
       if (currentUser) {
        const updatedUser = { ...currentUser, credits: data.newCredits };
        localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUser));
      }
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
      setError('Please fill in all fields.');
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

    // Check credits for question
    if ((currentUser.credits ?? 0) < CREDITS_PER_QUESTION) {
      toast({ title: "Insufficient Credits", description: `You need at least ${CREDITS_PER_QUESTION} credits to ask a question. You have ${currentUser.credits ?? 0}.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    // Deduct credits for asking the question
    const questionCreditsDeducted = await deductCredits(CREDITS_PER_QUESTION);
    if (!questionCreditsDeducted) {
      setIsLoading(false);
      return; // Stop if deduction failed
    }
    
    // Check credits for response (important if deduction for question succeeded but user is now out of credits)
     if (currentUser && (currentUser.credits ?? 0) < CREDITS_PER_RESPONSE) {
      toast({ title: "Insufficient Credits for Response", description: `You need ${CREDITS_PER_RESPONSE} more credits for the AI to generate a response. Your current balance is ${currentUser.credits ?? 0}.`, variant: "destructive" });
      // Optional: Refund question credits if response cannot be processed. This adds complexity.
      // For simplicity now, we'll assume if question deduction passed, they had enough for response too, or it's handled by a subsequent check.
      // A better flow might be to pre-authorize total credits.
      setIsLoading(false);
      return;
    }


    try {
      const input: CannabinoidAdviceInput = { issueType, description };
      const adviceOutput = await cannabinoidAdvice(input);
      setResult(adviceOutput);

      // Deduct credits for receiving the response
      const responseCreditsDeducted = await deductCredits(CREDITS_PER_RESPONSE);
      if (!responseCreditsDeducted) {
        // Handle this scenario - e.g., show response but with a warning about credit issue.
        toast({title: "Warning", description: "Response received, but there was an issue deducting credits for the response.", variant: "default"});
      }

    } catch (e: any) {
      console.error("Error getting cannabinoid advice:", e);
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
            <WandSparkles className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">Cannabinoid Advisor</CardTitle>
              <CardDescription className="text-md">
                Get personalized advice on THC & CBD for health and wellness, based on medical knowledge.
                Each query (question + response) costs {CREDITS_PER_QUESTION + CREDITS_PER_RESPONSE} credits.
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
              <Label htmlFor="issueType" className="text-lg">What type of health issue are you addressing?</Label>
              <Input
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                placeholder="e.g., Chronic Pain, Anxiety, Insomnia"
                className="text-base"
                disabled={isLoading || isLoadingCredits}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-lg">Describe the health condition in detail:</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include symptoms, duration, severity, any current treatments, etc."
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
              Get Cannabinoid Advice
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-primary">Your Personalized Recommendation:</h3>
              <div className="p-4 bg-muted rounded-md shadow whitespace-pre-wrap text-sm">
                {result.treatmentPlan}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
