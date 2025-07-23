
'use client';

import { useState, useEffect, type FormEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, WandSparkles, AlertCircle, Camera, Image as ImageIcon } from 'lucide-react';
import { gardeningAdvice, type GardeningAdviceInput, type GardeningAdviceOutput } from '@/ai/flows/gardening-advice';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ADVISOR_SLUG = 'gardening-advisor';
const CREDITS_TO_DEDUCT = 6;

export default function GardeningAdvisorPage() {
  const [description, setDescription] = useState('');
  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, setCurrentUser, loading: authLoading } = useAuth();
  const [result, setResult] = useState<GardeningAdviceOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUri(reader.result as string);
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!description) {
      setError('Please provide a description of your gardening needs.');
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


      const input: GardeningAdviceInput = { description };
      if (photoDataUri) {
        input.photoDataUri = photoDataUri;
      }
      const adviceOutput = await gardeningAdvice(input);
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
              <CardTitle className="text-3xl">Gardening Advisor</CardTitle>
              <CardDescription className="text-md">
                Expert guidance on organic permaculture, plant identification, and companion planting.
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
              <Label htmlFor="description" className="text-lg">Describe your gardening needs or question:</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., What are good companion plants for tomatoes? How do I deal with aphids organically?"
                rows={5}
                className="text-base"
                disabled={isLoading || authLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo" className="text-lg">Upload a plant photo (Optional):</Label>
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading || authLoading}>
                  <Camera className="mr-2 h-4 w-4" /> Choose Image
                </Button>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={isLoading || authLoading}
                />
                {photoPreview && (
                  <div className="w-20 h-20 rounded border p-1 relative">
                    <Image src={photoPreview} alt="Plant preview" layout="fill" objectFit="cover" className="rounded"/>
                  </div>
                )}
                {!photoPreview && <ImageIcon className="w-10 h-10 text-muted-foreground" />}
              </div>
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
              Get Gardening Advice
            </Button>
          </form>
        </CardContent>
        {result && (
          <CardFooter className="mt-6 border-t pt-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-primary">Gardening Advisor's Response:</h3>
              {result.plantIdentification && (
                <div>
                  <h4 className="text-lg font-medium">Plant Identification:</h4>
                  <p className="p-3 bg-muted rounded-md shadow-sm whitespace-pre-wrap text-sm">{result.plantIdentification}</p>
                </div>
              )}
              <div>
                <h4 className="text-lg font-medium">Advice:</h4>
                <p className="p-3 bg-muted rounded-md shadow-sm whitespace-pre-wrap text-sm">{result.advice}</p>
              </div>
              {result.companionPlantingSuggestions && (
                <div>
                  <h4 className="text-lg font-medium">Companion Planting Suggestions:</h4>
                  <p className="p-3 bg-muted rounded-md shadow-sm whitespace-pre-wrap text-sm">{result.companionPlantingSuggestions}</p>
                </div>
              )}
              {result.nutritionalInformation && (
                <div>
                  <h4 className="text-lg font-medium">Nutritional Information:</h4>
                  <p className="p-3 bg-muted rounded-md shadow-sm whitespace-pre-wrap text-sm">{result.nutritionalInformation}</p>
                </div>
              )}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
