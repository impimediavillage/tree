
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, WandSparkles, AlertCircle, Leaf } from 'lucide-react';
import { getVeganFoodAdvice, type VeganFoodAdviceInput, type VeganFoodAdviceOutput } from '@/ai/flows/vegan-food-advice';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ADVISOR_SLUG = 'vegan-food-guru';
const CREDITS_TO_DEDUCT = 2;

export default function VeganGuruAdvisorPage() {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
  const [result, setResult] = useState<VeganFoodAdviceOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!description) {
      setError('Please ask a question about vegan food or nutrition.');
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
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
          credits: increment(-CREDITS_TO_DEDUCT)
      });
      
      const newCredits = (currentUser.credits ?? 0) - CREDITS_TO_DEDUCT;
      setCurrentUser(prevUser => prevUser ? { ...prevUser, credits: newCredits } : null);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify({ ...currentUser, credits: newCredits }));

      const input: VeganFoodAdviceInput = { question: description };
      const adviceOutput = await getVeganFoodAdvice(input);
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
            <Leaf className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">Vegan Food Guru AI</CardTitle>
              <CardDescription className="text-md">
                Get plant-based recipes, nutritional advice, and vegan lifestyle tips.
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
              <Label htmlFor="description" className="text-lg">What's on your mind?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., I need a high-protein vegan breakfast recipe, or how do I get enough iron on a vegan diet?"
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
              Ask the Vegan Guru
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-primary">The Guru's Wisdom:</h3>
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
