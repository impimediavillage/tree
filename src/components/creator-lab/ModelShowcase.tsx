'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface ModelShowcaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designId: string;
  designImageUrl: string;
  apparelType: string;
  onComplete: (modelImageUrl: string, modelPrompt: string) => void;
  userCredits: number;
}

export function ModelShowcase({ 
  open, 
  onOpenChange, 
  designId,
  designImageUrl, 
  apparelType,
  onComplete,
  userCredits 
}: ModelShowcaseProps) {
  const { toast } = useToast();
  const { refreshUserProfile } = useAuth();
  const [modelPrompt, setModelPrompt] = useState('');
  const [generatedModelImage, setGeneratedModelImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const defaultPrompts = [
    'A young professional wearing this design in an urban setting',
    'A confident athlete wearing this at a gym',
    'A creative artist wearing this in a bright studio',
    'A nature enthusiast wearing this on a mountain trail',
    'A stylish person wearing this at a coffee shop',
  ];

  const handleGenerateModel = async () => {
    if (!modelPrompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please describe your model or choose a suggestion.',
        variant: 'destructive',
      });
      return;
    }

    if (userCredits < 10) {
      toast({
        title: 'Insufficient Credits',
        description: 'You need 10 credits to generate a model showcase.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const generateModel = httpsCallable(functions, 'generateModelShowcase');
      const result = await generateModel({
        designId,
        apparelType,
        modelPrompt: modelPrompt.trim(),
      });

      const data = result.data as { modelImageUrl: string; creditsRemaining: number };
      setGeneratedModelImage(data.modelImageUrl);
      
      // Refresh user profile to update credits
      await refreshUserProfile();
      
      toast({
        title: 'Model Generated! ✨',
        description: '10 credits deducted. Looking great!',
      });
    } catch (error: any) {
      console.error('Error generating model:', error);
      
      // Check if it's a content policy violation
      const errorMessage = error.message || '';
      const isContentViolation = errorMessage.includes('Content Policy Violation') || errorMessage.includes('content policy');
      
      toast({
        title: isContentViolation ? '🚫 Content Policy Issue' : 'Generation Failed',
        description: isContentViolation
          ? 'Your model description contains content that violates our guidelines. Please use professional, family-friendly language and try again. No credits were charged.'
          : errorMessage || 'Please try again.',
        variant: 'destructive',
        duration: isContentViolation ? 8000 : 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    if (!generatedModelImage) {
      toast({
        title: 'Model Required',
        description: 'Please generate a model showcase before continuing.',
        variant: 'destructive',
      });
      return;
    }
    onComplete(generatedModelImage, modelPrompt);
    
    // Reset state
    setModelPrompt('');
    setGeneratedModelImage(null);
  };

  const handleSkip = () => {
    onComplete('', ''); // Empty strings indicate skipped
    setModelPrompt('');
    setGeneratedModelImage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-extrabold text-[#3D2E17] flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-[#006B3E]" />
            Add Lifestyle Photo with Model
          </DialogTitle>
          <DialogDescription className="text-[#5D4E37] text-base font-semibold">
            Create a lifestyle photo showing your {apparelType} worn by a model in a real setting. 
            This helps customers visualize themselves wearing it! Products with lifestyle photos sell 3x better! 📈
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Product Mockup Preview */}
          <div className="space-y-4">
            <div className="border-2 border-[#5D4E37]/30 rounded-lg p-4 bg-white">
              <p className="text-[#3D2E17] font-bold mb-2 text-sm">Studio Mockup (Already Created):</p>
              <div className="relative aspect-square rounded-lg overflow-hidden border">
                <Image
                  src={designImageUrl}
                  alt="Product Mockup"
                  fill
                  className="object-contain"
                />
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-[#3D2E17]">💡 Model Photo Ideas:</p>
              <div className="space-y-2">
                {defaultPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setModelPrompt(prompt)}
                    className="w-full text-left text-sm p-3 rounded-lg border-2 border-[#5D4E37]/20 hover:border-[#006B3E] hover:bg-[#006B3E]/5 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Model Generation */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#3D2E17]">
                Describe Your Lifestyle Scene:
              </label>
              <Textarea
                value={modelPrompt}
                onChange={(e) => setModelPrompt(e.target.value)}
                placeholder="A confident young person in an urban coffee shop, wearing this black cap with the design..."
                rows={4}
                className="resize-none border-2 border-[#5D4E37]/30 focus:border-[#006B3E]"
                data-tour="ai-generator"
              />
              <p className="text-xs text-[#5D4E37]">
                📸 Describe the person, setting, and mood. We'll place your {apparelType} on them!
              </p>
            </div>

            <Button
              onClick={handleGenerateModel}
              disabled={isGenerating || !modelPrompt.trim() || userCredits < 10}
              className="w-full h-12 bg-[#006B3E] hover:bg-[#005230] font-extrabold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Lifestyle Photo...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Lifestyle Photo (10 Credits)
                </>
              )}
            </Button>

            {/* Generated Model Preview */}
            {generatedModelImage && (
              <div className="border-4 border-[#006B3E] rounded-lg p-4 bg-[#006B3E]/5" data-tour="preview-3d">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-[#3D2E17]">Your Model Showcase:</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setGeneratedModelImage(null);
                      setModelPrompt('');
                    }}
                    className="border-[#006B3E] text-[#006B3E]"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={generatedModelImage}
                    alt="Model Showcase"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900 font-semibold">
            ✨ <strong>Why add a model?</strong> Products with model photos sell 3x better! 
            Customers love seeing how the design looks in real life. This is your secret weapon! 🚀
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="border-2 border-[#5D4E37]/30"
          >
            Skip Model Showcase
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!generatedModelImage}
            className="bg-[#006B3E] hover:bg-[#005230] font-extrabold"
          >
            Add to Treehouse Store 🌳
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
