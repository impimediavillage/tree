
'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, WandSparkles, AlertCircle, HandHelping } from 'lucide-react';
import { traditionalMedicineAdvice, type TraditionalMedicineAdviceInput, type TraditionalMedicineAdviceOutput } from '@/ai/flows/traditional-medicine-advice';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const ADVISOR_SLUG = 'traditional-medicine-advisor';
const CREDITS_TO_DEDUCT = 6;

const deductCreditsAndLog = httpsCallable(functions, 'deductcreditsandloginteraction');

export default function TraditionalMedicineAdvisorPage() {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
  const [result, setResult] = useState<TraditionalMedicineAdviceOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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
    
    if ((currentUser.credits ?? 0) < CREDITS_TO_DEDUCT) {
      toast({ title: "Insufficient Credits", description: `You need ${CREDITS_TO_DEDUCT} credits for this advisor.`, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const creditResult = await deductCreditsAndLog({ 
        userId: currentUser.uid, 
        advisorSlug: ADVISOR_SLUG, 
        creditsToDeduct: CREDITS_TO_DEDUCT, 
        wasFreeInteraction: false 
      });

      const data = creditResult.data as { success: boolean; newCredits: number; message?: string; };
      if (!data.success) { throw new Error(data.message || "Credit deduction failed."); }
      
      const updatedUser = { ...currentUser, credits: data.newCredits };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(updatedUser));


      const input: TraditionalMedicineAdviceInput = { issueType, description };
      const adviceOutput = await traditionalMedicineAdvice(input);
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
            <HandHelping className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl">Traditional Medicine Advisor</CardTitle>
              <CardDescription className="text-md">
                Culturally relevant advice on African and indigenous healing practices.
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
              <Label htmlFor="issueType" className="text-lg">What type of health issue are you addressing?</Label>
              <Input
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                placeholder="e.g., Joint Pain, Spiritual Imbalance, Skin Ailment"
                className="text-base"
                disabled={isLoading || authLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-lg">Describe the health issue in detail:</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include symptoms, duration, what you've tried, any cultural context or preferences."
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
              Get Traditional Advice
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-primary">Traditional Medicine Advisor's Recommendation:</h3>
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
