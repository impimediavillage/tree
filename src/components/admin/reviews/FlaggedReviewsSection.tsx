'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Flag, CheckCircle, Trash2, AlertTriangle, Star, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { DispensaryReview } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface FlaggedReviewsSectionProps {
  flaggedReviews: (DispensaryReview & { id: string })[];
  onUpdate: () => void;
}

export function FlaggedReviewsSection({ flaggedReviews, onUpdate }: FlaggedReviewsSectionProps) {
  const { toast } = useToast();
  const [selectedReview, setSelectedReview] = useState<(DispensaryReview & { id: string }) | null>(null);
  const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRestore = async (reviewId: string) => {
    setIsProcessing(true);
    try {
      const reviewRef = doc(db, 'dispensaryReviews', reviewId);
      await updateDoc(reviewRef, {
        status: 'active',
      });
      
      toast({
        title: 'Review Restored',
        description: 'The review has been restored to active status.',
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error restoring review:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore review.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedReview(null);
      setActionType(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setIsProcessing(true);
    try {
      const reviewRef = doc(db, 'dispensaryReviews', reviewId);
      await deleteDoc(reviewRef);
      
      toast({
        title: 'Review Deleted',
        description: 'The flagged review has been permanently removed.',
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setSelectedReview(null);
      setActionType(null);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return 'text-green-600 bg-green-100';
    if (rating >= 7) return 'text-blue-600 bg-blue-100';
    if (rating >= 5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const categoryLabels: Record<string, string> = {
    product_quality: 'Product Quality',
    delivery_speed: 'Delivery Speed',
    packaging: 'Packaging',
    accuracy: 'Order Accuracy',
    freshness: 'Product Freshness',
    value: 'Value for Money',
    communication: 'Communication',
  };

  if (flaggedReviews.length === 0) {
    return (
      <Card className="shadow-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-600" />
          <div>
            <h3 className="text-2xl font-bold text-[#3D2E17]">All Clear!</h3>
            <p className="text-[#5D4E37] mt-2">
              No flagged reviews requiring attention at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <Flag className="h-6 w-6" />
            Flagged Reviews ({flaggedReviews.length})
          </CardTitle>
          <CardDescription>
            Reviews flagged for moderation - restore or permanently delete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flaggedReviews.map((review) => {
            const createdAt = review.createdAt instanceof Timestamp 
              ? review.createdAt.toDate() 
              : new Date(review.createdAt);

            return (
              <Card key={review.id} className="border-2 border-red-300 bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Alert Icon */}
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                    </div>

                    {/* Review Details */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`font-bold ${getRatingColor(review.rating)}`}>
                            {review.rating}/10
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        <Badge variant="destructive">
                          <Flag className="h-3 w-3 mr-1" />
                          Flagged
                        </Badge>
                      </div>

                      {/* IDs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Order:</span>{' '}
                          <span className="font-mono font-semibold">
                            {review.orderId.slice(0, 10)}...
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">User:</span>{' '}
                          <span className="font-mono font-semibold">
                            {review.userId.slice(0, 10)}...
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Dispensary:</span>{' '}
                          <span className="font-mono font-semibold">
                            {review.dispensaryId.slice(0, 10)}...
                          </span>
                        </div>
                      </div>

                      {/* Categories */}
                      {review.categories && Object.keys(review.categories).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(review.categories).map(([category, value]) => (
                            <Badge key={category} variant="outline" className="text-xs">
                              {categoryLabels[category]}: {value}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Credits */}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                          {review.creditsAwarded || 0} credits awarded
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500 text-green-700 hover:bg-green-50"
                        onClick={() => {
                          setSelectedReview(review);
                          setActionType('restore');
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedReview(review);
                          setActionType('delete');
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Restore Confirmation */}
      <AlertDialog open={actionType === 'restore'} onOpenChange={() => {
        if (!isProcessing) {
          setActionType(null);
          setSelectedReview(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Restore Review?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the review to active status and it will be included in dispensary ratings again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedReview && handleRestore(selectedReview.id)}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Review'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={actionType === 'delete'} onOpenChange={() => {
        if (!isProcessing) {
          setActionType(null);
          setSelectedReview(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Permanently Delete Review?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The review will be permanently deleted and stats will recalculate automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedReview && handleDelete(selectedReview.id)}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
