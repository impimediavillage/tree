'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Star, Sparkles, Loader2, Gift, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DispensaryReview, ReviewCategory, ReviewCategoryValue } from '@/types';

interface ReviewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  dispensaryId: string;
  dispensaryName: string;
  dispensaryType: string;
  productIds: string[];
}

const CATEGORY_OPTIONS = {
  product_quality: {
    label: 'Product Quality',
    icon: '⭐',
    options: [
      { value: 'exceeded', label: 'Exceeded expectations' },
      { value: 'met', label: 'Met expectations' },
      { value: 'below', label: 'Below expectations' },
    ],
  },
  delivery_speed: {
    label: 'Delivery Experience',
    icon: '🚚',
    options: [
      { value: 'very_fast', label: 'Very fast' },
      { value: 'on_time', label: 'On time' },
      { value: 'delayed', label: 'Delayed' },
      { value: 'never', label: 'Never arrived' },
    ],
  },
  packaging: {
    label: 'Product Packaging',
    icon: '📦',
    options: [
      { value: 'excellent', label: 'Excellent condition' },
      { value: 'good', label: 'Good condition' },
      { value: 'damaged', label: 'Damaged packaging' },
      { value: 'poor', label: 'Poor packaging' },
    ],
  },
  accuracy: {
    label: 'Product Accuracy',
    icon: '✓',
    options: [
      { value: 'exact', label: 'Exactly as described' },
      { value: 'mostly', label: 'Mostly accurate' },
      { value: 'different', label: 'Different than expected' },
      { value: 'wrong', label: 'Wrong product' },
    ],
  },
  freshness: {
    label: 'Freshness/Condition',
    icon: '🌿',
    options: [
      { value: 'fresh', label: 'Fresh and potent' },
      { value: 'good', label: 'Good quality' },
      { value: 'acceptable', label: 'Acceptable' },
      { value: 'poor', label: 'Poor condition' },
    ],
  },
  value: {
    label: 'Value for Money',
    icon: '💰',
    options: [
      { value: 'excellent', label: 'Excellent value' },
      { value: 'good', label: 'Fair price' },
      { value: 'overpriced', label: 'Overpriced' },
    ],
  },
  communication: {
    label: 'Dispensary Communication',
    icon: '💬',
    options: [
      { value: 'excellent', label: 'Excellent support' },
      { value: 'good', label: 'Good response' },
      { value: 'poor', label: 'Slow response' },
      { value: 'never', label: 'No response' },
    ],
  },
};

export function ReviewSubmissionDialog({
  open,
  onOpenChange,
  orderId,
  dispensaryId,
  dispensaryName,
  dispensaryType,
  productIds,
}: ReviewSubmissionDialogProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [categories, setCategories] = useState<Record<ReviewCategory, ReviewCategoryValue | undefined>>({} as any);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [creditsEarned, setCreditsEarned] = useState(0);

  const handleRatingClick = (value: number) => {
    setRating(value);
  };

  const handleCategoryChange = (category: ReviewCategory, value: ReviewCategoryValue) => {
    setCategories(prev => ({ ...prev, [category]: value }));
  };

  const calculateCreditsReward = () => {
    let credits = 5; // Base reward
    const categoryCount = Object.keys(categories).length;
    
    if (categoryCount >= 3) credits += 10; // Detailed feedback bonus
    if (rating >= 9) credits += 5; // High rating bonus
    
    return credits;
  };

  const handleSubmit = async () => {
    if (!currentUser || rating === 0) {
      toast({
        title: 'Rating Required',
        description: 'Please select a rating before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const creditsReward = calculateCreditsReward();
      
      const review: Omit<DispensaryReview, 'id'> = {
        orderId,
        userId: currentUser.uid,
        userName: currentUser.displayName || undefined,
        dispensaryId,
        dispensaryName,
        dispensaryType,
        productIds,
        rating,
        categories: Object.keys(categories).length > 0 ? categories : undefined,
        createdAt: serverTimestamp() as any,
        verifiedPurchase: true,
        isAnonymous: true,
        creditsAwarded: creditsReward,
        status: 'active',
      };

      // Save review to Firestore
      await addDoc(collection(db, 'dispensaryReviews'), review);

      setCreditsEarned(creditsReward);
      setSubmitted(true);

      toast({
        title: 'Review Submitted! 🎉',
        description: `Thank you for your feedback! You earned ${creditsReward} credits.`,
      });

      // Close dialog after 3 seconds
      setTimeout(() => {
        onOpenChange(false);
        // Reset state
        setTimeout(() => {
          setRating(0);
          setCategories({} as any);
          setSubmitted(false);
          setCreditsEarned(0);
        }, 300);
      }, 3000);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit your review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-[#3D2E17] flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-[#006B3E]" />
                Rate Your Experience
              </DialogTitle>
              <DialogDescription className="text-lg text-gray-600">
                How was your order from <span className="font-bold text-[#006B3E]">{dispensaryName}</span>?
              </DialogDescription>
            </DialogHeader>

            {/* Rating Section */}
            <div className="space-y-6 py-6">
              {/* 10-Star Rating */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border-2 border-[#006B3E]/20 shadow-lg">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-[#3D2E17] mb-2">Your Rating</h3>
                  <p className="text-sm text-gray-600">Tap a star to rate (1-10)</p>
                </div>
                
                <div className="flex justify-center items-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className={cn(
                        "transition-all duration-200 transform hover:scale-125",
                        "focus:outline-none focus:ring-2 focus:ring-[#006B3E] rounded-full p-1"
                      )}
                    >
                      <Star
                        className={cn(
                          "h-8 w-8 transition-all duration-200",
                          value <= displayRating
                            ? "fill-[#006B3E] text-[#006B3E] drop-shadow-lg"
                            : "text-gray-300"
                        )}
                      />
                    </button>
                  ))}
                </div>

                {rating > 0 && (
                  <div className="text-center">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-2xl transition-all duration-300",
                      rating >= 9 ? "bg-green-100 text-green-700" :
                      rating >= 7 ? "bg-yellow-100 text-yellow-700" :
                      rating >= 5 ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      <Star className="h-6 w-6 fill-current" />
                      {rating} / 10
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Categories - Only show if rating <= 8 or if already selected */}
              {(rating > 0 && rating <= 8) || Object.keys(categories).length > 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-[#006B3E]/20 shadow-lg">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-[#3D2E17] mb-1">Help us improve (optional)</h3>
                    <p className="text-sm text-gray-600">Select categories that influenced your rating</p>
                    <p className="text-xs text-[#006B3E] font-medium mt-1">
                      💡 Select 3+ categories to earn +10 bonus credits
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(CATEGORY_OPTIONS).map(([key, config]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          {config.label}
                        </label>
                        <Select
                          value={categories[key as ReviewCategory]}
                          onValueChange={(value) => handleCategoryChange(key as ReviewCategory, value as ReviewCategoryValue)}
                        >
                          <SelectTrigger className="bg-white border-gray-300">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {config.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Credit Reward Preview */}
              {rating > 0 && (
                <div className="bg-gradient-to-r from-[#006B3E] to-[#004D2C] rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gift className="h-8 w-8" />
                      <div>
                        <p className="text-sm font-medium opacity-90">You'll Earn</p>
                        <p className="text-3xl font-bold">{calculateCreditsReward()} Credits</p>
                      </div>
                    </div>
                    <Sparkles className="h-12 w-12 opacity-50" />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
                className="bg-[#006B3E] hover:bg-[#005030] text-white px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Submit Review
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          // Success State
          <div className="py-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-6">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#3D2E17] mb-2">Thank You!</h3>
              <p className="text-lg text-gray-600 mb-4">Your feedback helps the community</p>
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#006B3E] to-[#004D2C] text-white px-8 py-4 rounded-full font-bold text-xl">
                <Gift className="h-6 w-6" />
                +{creditsEarned} Credits Earned!
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
