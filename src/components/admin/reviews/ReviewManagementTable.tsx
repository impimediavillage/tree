'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, Trash2, Flag, CheckCircle, Star, Search, Filter, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { DispensaryReview } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface ReviewManagementTableProps {
  reviews: (DispensaryReview & { id: string })[];
  onReviewUpdate: () => void;
}

export function ReviewManagementTable({ reviews, onReviewUpdate }: ReviewManagementTableProps) {
  const { toast } = useToast();
  const [selectedReview, setSelectedReview] = useState<(DispensaryReview & { id: string }) | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'flagged'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredReviews = reviews.filter(review => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      review.dispensaryId.toLowerCase().includes(searchLower) ||
      review.userId.toLowerCase().includes(searchLower) ||
      review.orderId.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;

    // Rating filter
    let matchesRating = true;
    if (ratingFilter === 'high') matchesRating = review.rating >= 8;
    else if (ratingFilter === 'medium') matchesRating = review.rating >= 5 && review.rating < 8;
    else if (ratingFilter === 'low') matchesRating = review.rating < 5;

    return matchesSearch && matchesStatus && matchesRating;
  });

  const handleFlagReview = async (reviewId: string) => {
    try {
      const reviewRef = doc(db, 'dispensaryReviews', reviewId);
      await updateDoc(reviewRef, {
        status: 'flagged',
      });
      
      toast({
        title: 'Review Flagged',
        description: 'The review has been marked for moderation.',
      });
      
      onReviewUpdate();
    } catch (error) {
      console.error('Error flagging review:', error);
      toast({
        title: 'Error',
        description: 'Failed to flag review.',
        variant: 'destructive',
      });
    }
  };

  const handleUnflagReview = async (reviewId: string) => {
    try {
      const reviewRef = doc(db, 'dispensaryReviews', reviewId);
      await updateDoc(reviewRef, {
        status: 'active',
      });
      
      toast({
        title: 'Review Unflagged',
        description: 'The review has been restored to active status.',
      });
      
      onReviewUpdate();
    } catch (error) {
      console.error('Error unflagging review:', error);
      toast({
        title: 'Error',
        description: 'Failed to unflag review.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    setIsDeleting(true);
    try {
      const reviewRef = doc(db, 'dispensaryReviews', selectedReview.id);
      await deleteDoc(reviewRef);
      
      toast({
        title: 'Review Deleted',
        description: 'The review has been permanently removed. Stats will recalculate automatically.',
      });
      
      setDeleteDialogOpen(false);
      setSelectedReview(null);
      onReviewUpdate();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
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

  return (
    <Card className="shadow-lg border-2 border-[#006B3E]/20">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
          <Star className="h-6 w-6 text-yellow-500 fill-yellow-400" />
          All Reviews ({filteredReviews.length})
        </CardTitle>
        <CardDescription>
          View, manage, and moderate all customer reviews
        </CardDescription>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, user ID, or dispensary ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={(value: any) => setRatingFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <Star className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="high">High (8-10)</SelectItem>
              <SelectItem value="medium">Medium (5-7)</SelectItem>
              <SelectItem value="low">Low (1-4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Rating</TableHead>
                <TableHead className="font-bold">Order ID</TableHead>
                <TableHead className="font-bold">Dispensary</TableHead>
                <TableHead className="font-bold">Categories</TableHead>
                <TableHead className="font-bold">Credits</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No reviews found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => {
                  const createdAt = review.createdAt instanceof Timestamp 
                    ? review.createdAt.toDate() 
                    : new Date(review.createdAt);
                  
                  return (
                    <TableRow key={review.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm text-[#5D4E37]">
                        {formatDistanceToNow(createdAt, { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`font-bold ${getRatingColor(review.rating)}`}>
                          {review.rating}/10
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#5D4E37]">
                        {review.orderId.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#5D4E37]">
                        {review.dispensaryId.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[#006B3E] border-[#006B3E]">
                          {Object.keys(review.categories || {}).length}/7
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {review.creditsAwarded || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {review.status === 'flagged' ? (
                          <Badge variant="destructive" className="gap-1">
                            <Flag className="h-3 w-3" />
                            Flagged
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {review.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFlagReview(review.id)}
                            >
                              <Flag className="h-4 w-4 text-yellow-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnflagReview(review.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReview(review);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* View Review Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3D2E17] flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-400" />
              Review Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive view of this customer review
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              {/* Rating */}
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#3D2E17]">Overall Rating</span>
                  <Badge className={`text-lg font-bold ${getRatingColor(selectedReview.rating)}`}>
                    {selectedReview.rating}/10
                  </Badge>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < selectedReview.rating
                          ? 'text-yellow-500 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-[#3D2E17] mb-1">Order ID</h4>
                  <p className="text-sm font-mono text-[#5D4E37] bg-muted p-2 rounded">
                    {selectedReview.orderId}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#3D2E17] mb-1">User ID</h4>
                  <p className="text-sm font-mono text-[#5D4E37] bg-muted p-2 rounded">
                    {selectedReview.userId}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#3D2E17] mb-1">Dispensary ID</h4>
                  <p className="text-sm font-mono text-[#5D4E37] bg-muted p-2 rounded">
                    {selectedReview.dispensaryId}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#3D2E17] mb-1">Credits Awarded</h4>
                  <Badge className="bg-green-100 text-green-800 text-base font-bold">
                    {selectedReview.creditsAwarded || 0} credits
                  </Badge>
                </div>
              </div>

              {/* Categories */}
              {selectedReview.categories && Object.keys(selectedReview.categories).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#3D2E17] mb-3">Category Feedback</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedReview.categories).map(([category, value]) => (
                      <div key={category} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <span className="text-sm font-medium text-[#3D2E17]">
                          {categoryLabels[category] || category}
                        </span>
                        <Badge variant="secondary" className="bg-[#006B3E]/10 text-[#006B3E]">
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-muted-foreground border-t pt-4">
                Submitted {formatDistanceToNow(
                  selectedReview.createdAt instanceof Timestamp 
                    ? selectedReview.createdAt.toDate() 
                    : new Date(selectedReview.createdAt),
                  { addSuffix: true }
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Delete Review?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The review will be permanently deleted and stats will recalculate automatically.
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="p-4 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Rating:</span>
                <Badge className={getRatingColor(selectedReview.rating)}>
                  {selectedReview.rating}/10
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Order:</span>
                <span className="text-sm font-mono">{selectedReview.orderId.slice(0, 12)}...</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteReview} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Review
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
