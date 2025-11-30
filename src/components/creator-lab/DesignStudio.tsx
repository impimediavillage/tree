'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Wand2, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { validatePrompt } from '@/lib/dalle-service';
import type { CreatorDesign } from '@/types/creator-lab';
import { PublishDialog } from './PublishDialog';

interface DesignStudioProps {
  onDesignGenerated?: (design: CreatorDesign) => void;
}

export function DesignStudio({ onDesignGenerated }: DesignStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesign, setGeneratedDesign] = useState<CreatorDesign | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const { currentUser, setCurrentUser } = useAuth();
  const { toast } = useToast();

  const userCredits = currentUser?.credits || 0;
  const canAfford = userCredits >= 10;

  const handleGenerate = useCallback(async () => {
    if (!currentUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to generate designs.',
        variant: 'destructive',
      });
      return;
    }

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      toast({
        title: 'Invalid Prompt',
        description: validation.message,
        variant: 'destructive',
      });
      return;
    }

    if (!canAfford) {
      toast({
        title: 'Insufficient Credits',
        description: 'You need 10 credits to generate a design. Please top up your credits.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/creator-lab/generate-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          userId: currentUser.uid 
        }),
      });

      const data = await response.json();

      if (data.success && data.design) {
        setGeneratedDesign(data.design);
        
        // Update user credits in context
        if (data.newCreditBalance !== undefined) {
          setCurrentUser({ ...currentUser, credits: data.newCreditBalance });
          localStorage.setItem('currentUserHolisticAI', JSON.stringify({ ...currentUser, credits: data.newCreditBalance }));
        }

        toast({
          title: 'Design Generated! ✨',
          description: `10 credits deducted. ${data.newCreditBalance} credits remaining.`,
        });

        // Callback for parent component
        if (onDesignGenerated) {
          onDesignGenerated(data.design);
        }
      } else {
        toast({
          title: 'Generation Failed',
          description: data.message || 'An error occurred while generating your design.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Design generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate design. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentUser, prompt, canAfford, toast, setCurrentUser, onDesignGenerated]);

  const handleNewDesign = () => {
    setGeneratedDesign(null);
    setPrompt('');
  };

  return (
    <>
      <Card className="border-[#5D4E37]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#006B3E]/10">
                <Sparkles className="h-10 w-10 text-[#006B3E]" />
              </div>
              <div>
                <CardTitle className="text-2xl font-extrabold text-[#3D2E17]">
                  AI Design Studio
                </CardTitle>
                <CardDescription className="text-[#5D4E37] font-semibold">
                  Create unique apparel designs with DALL-E 3
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#5D4E37] font-semibold">Your Credits</p>
              <p className="text-2xl font-extrabold text-[#006B3E]">{userCredits}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!generatedDesign ? (
            <>
              {/* Design prompt input */}
              <div className="space-y-2">
                <label className="text-[#3D2E17] font-bold text-sm block">
                  Describe Your Design
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., 'A majestic lion made of sacred geometry with cannabis leaves, vibrant psychedelic colors, mystical energy'"
                  rows={5}
                  className="text-[#5D4E37] font-semibold resize-none"
                  disabled={isGenerating}
                />
                <div className="flex items-center justify-between text-xs">
                  <p className="text-[#5D4E37] font-semibold">
                    {prompt.length}/1000 characters
                  </p>
                  <p className="text-[#006B3E] font-bold">Cost: 10 credits</p>
                </div>
              </div>

              {/* Tips */}
              <Alert className="border-[#006B3E] bg-[#006B3E]/5">
                <AlertCircle className="h-4 w-4 text-[#006B3E]" />
                <AlertDescription className="text-[#5D4E37] font-semibold text-sm">
                  <strong className="text-[#3D2E17]">Pro Tips:</strong> Be specific! Mention colors, style, mood, and elements. 
                  Designs work best on black apparel with vibrant, high-contrast colors.
                </AlertDescription>
              </Alert>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || !canAfford}
                className="w-full bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold py-6 text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Your Design...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Design (10 Credits)
                  </>
                )}
              </Button>

              {!canAfford && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-semibold">
                    You need 10 credits to generate a design. 
                    <a href="/dashboard/leaf/credits" className="underline ml-1">Top up now</a>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              {/* Generated design preview */}
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border-4 border-[#006B3E] shadow-lg">
                  <img
                    src={generatedDesign.imageUrl}
                    alt="Generated design"
                    className="w-full h-auto"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="bg-[#006B3E] text-white px-3 py-1 rounded-full text-xs font-bold">
                      AI Generated
                    </span>
                  </div>
                </div>

                {/* Design info */}
                <div className="bg-[#5D4E37]/5 rounded-lg p-4 space-y-2">
                  <h4 className="font-extrabold text-[#3D2E17]">Original Prompt:</h4>
                  <p className="text-[#5D4E37] font-semibold text-sm">{generatedDesign.prompt}</p>
                  {generatedDesign.revisedPrompt && generatedDesign.revisedPrompt !== generatedDesign.prompt && (
                    <>
                      <h4 className="font-extrabold text-[#3D2E17] mt-3">DALL-E Enhanced:</h4>
                      <p className="text-[#5D4E37] font-semibold text-sm">{generatedDesign.revisedPrompt}</p>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleNewDesign}
                    variant="outline"
                    className="border-[#5D4E37] text-[#5D4E37] hover:bg-[#5D4E37] hover:text-white font-bold transition-all duration-300"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    New Design
                  </Button>
                  <Button
                    onClick={() => setShowPublishDialog(true)}
                    className="bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Publish to Treehouse
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Publish dialog */}
      {generatedDesign && (
        <PublishDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          design={generatedDesign}
          onPublished={() => {
            toast({
              title: 'Published Successfully!',
              description: 'Your design is now live on The Treehouse marketplace.',
            });
            setShowPublishDialog(false);
            handleNewDesign();
          }}
        />
      )}
    </>
  );
}
