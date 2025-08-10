
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, WandSparkles, AlertCircle, Sparkles } from 'lucide-react';
import { getAromatherapyAdvice, type AromatherapyAdviceInput, type AromatherapyAdviceOutput } from '@/ai/flows/aromatherapy-advice';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const ADVISOR_SLUG = 'aromatherapy-advisor';
const CREDITS_TO_DEDUCT = 2;

const deductCreditsAndLog = httpsCallable(functions, 'deductcreditsandloginteraction');

export default function AromatherapyAdvisorPage() {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
  const [result, setResult] = useState<AromatherapyAdviceOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!description) {
      setError('Please describe what you are looking for.');
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
      // 1. Deduct credits via Cloud Function
      const creditResult = await deductCreditsAndLog({ 
        userId: currentUser.uid, 
        advisorSlug: ADVISOR_SLUG, 
        creditsToDeduct: CREDITS_TO_DEDUCT, 
        wasFreeInteraction: false 
      });

      const data = creditResult.data as { success: boolean; newCredits: number; message?: string; };

      if (!data.success) {
        throw new Error(data.message || "Credit deduction failed.");
      }
      
      // 2. Update local user state immediately for instant UI feedback
      const updatedUser = { ...currentUser, credits: data.newCredits };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUser));


      // 3. Call the AI flow
      const input: AromatherapyAdviceInput = { question: description };
      const adviceOutput = await getAromatherapyAdvice(input);
      setResult(adviceOutput);

      toast({ title: "Success!", description: `${CREDITS_TO_DEDUCT} credits were used.` });

    } catch (e: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (e instanceof FunctionsError) {
        errorMessage = e.message;
      } else if (e.message) {
        errorMessage = e.message;
      }
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">Aromatherapy AI</CardTitle>
              <CardDescription className="text-md">
                Find the perfect essential oil blends for your mood, health, and home environment.
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
            <div className="space-y-2">
              <Label htmlFor="description" className="text-lg">What is your goal or question?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., I need a blend to help me relax before sleep, or what are the benefits of lavender oil?"
                rows={6}
                className="text-base"
                disabled={isLoading || authLoading}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-destructive border border-destructive/50 bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || authLoading || !currentUser}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 h-5 w-5" />
              )}
              Get Aromatherapy Advice
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
