'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import type { DriverReview } from '@/types/driver';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Star,
  Flag,
  Trash2,
  Eye,
  Search,
  Filter,
  Loader2,
  MessageCircle,
  User,
  TruckIcon,
} from 'lucide-react';

export function DriverReviewsManager() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<(DriverReview & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<(DriverReview & { id: string }) | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [filterRating, setFilterRating] = useState<string>('all');
  const [filterFlagged, setFilterFlagged] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'driver_reviews'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (DriverReview & { id: string })[];
      
      setReviews(reviewsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredReviews = reviews.filter(review => {
    const matchesRating = filterRating === 'all' || review.rating === parseInt(filterRating);
    const matchesFlagged = filterFlagged === 'all' || 
      (filterFlagged === 'flagged' && review.isFlagged) ||
      (filterFlagged === 'not-flagged' && !review.isFlagged);
    const matchesSearch = searchTerm === '' ||
      review.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.dispensaryName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesRating && matchesFlagged && matchesSearch;
  });

  const handleToggleFlag = async (reviewId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'driver_reviews', reviewId), {
        isFlagged: !currentStatus,
      });

      toast({
        title: currentStatus ? 'Flag Removed' : 'Review Flagged',
        description: currentStatus ? 'The flag has been removed from this review' : 'This review has been flagged for attention',
      });
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast({
        title: 'Action Failed',
        description: 'Failed to update review flag',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'driver_reviews', reviewId));
      
      toast({
        title: 'Review Deleted',
        description: 'The review has been permanently deleted',
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete review',
        variant: 'destructive',
      });
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4.5) return <Badge className="bg-green-500">⭐ Excellent</Badge>;
    if (rating >= 3.5) return <Badge className="bg-blue-500">👍 Good</Badge>;
    if (rating >= 2.5) return <Badge className="bg-yellow-500">😐 Average</Badge>;
    if (rating >= 1.5) return <Badge className="bg-orange-500">👎 Poor</Badge>;
    return <Badge className="bg-red-500">😠 Terrible</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Calculate stats
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 0;
  const flaggedCount = reviews.filter(r => r.isFlagged).length;
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: totalReviews > 0 ? (reviews.filter(r => r.rating === rating).length / totalReviews) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalReviews}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-black">{averageRating.toFixed(1)}</div>
              <Star className="w-6 h-6 fill-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-pink-500 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">Flagged Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{flaggedCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-400 to-emerald-500 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium opacity-90">5-Star Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">
              {reviews.filter(r => r.rating === 5).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-20">
                  <span className="font-medium">{rating}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm text-gray-600 dark:text-gray-400">
                  {count} ({percentage.toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters & Search */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by driver, customer, or dispensary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-48">
                <Star className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFlagged} onValueChange={setFilterFlagged}>
              <SelectTrigger className="w-48">
                <Flag className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reviews</SelectItem>
                <SelectItem value="flagged">Flagged Only</SelectItem>
                <SelectItem value="not-flagged">Not Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Dispensary</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => (
                    <TableRow key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TruckIcon className="w-4 h-4 text-purple-600" />
                          <div>
                            <div className="font-medium">{review.driverName}</div>
                            <div className="text-xs text-gray-500">Order #{review.orderNumber}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{review.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{review.dispensaryName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getRatingStars(review.rating)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {review.review || <span className="text-gray-400 italic">No comment</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {review.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getRatingBadge(review.rating)}
                          {review.isFlagged && (
                            <Badge variant="destructive" className="w-fit">
                              <Flag className="w-3 h-3 mr-1" />
                              Flagged
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedReview(review);
                              setIsReviewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFlag(review.id, review.isFlagged)}
                          >
                            <Flag className={`w-4 h-4 ${review.isFlagged ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review Detail Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Complete information about this driver review
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getRatingStars(selectedReview.rating)}
                    <span className="font-bold text-lg">{selectedReview.rating}.0</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedReview.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                  </div>
                </div>
                {selectedReview.isFlagged && (
                  <Badge variant="destructive">
                    <Flag className="w-3 h-3 mr-1" />
                    Flagged for Review
                  </Badge>
                )}
              </div>

              {/* Parties Involved */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Driver</div>
                  <div className="font-medium">{selectedReview.driverName}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Customer</div>
                  <div className="font-medium">{selectedReview.customerName}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">Dispensary</div>
                  <div className="font-medium">{selectedReview.dispensaryName}</div>
                </div>
              </div>

              {/* Order Info */}
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Details</div>
                <div className="font-medium">Order #{selectedReview.orderNumber}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Delivery ID: {selectedReview.deliveryId}
                </div>
              </div>

              {/* Detailed Ratings */}
              {(selectedReview.punctuality || selectedReview.professionalism || 
                selectedReview.communication || selectedReview.vehicleCondition) && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Detailed Ratings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedReview.punctuality && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Punctuality</span>
                        <div className="flex items-center gap-1">
                          {getRatingStars(selectedReview.punctuality)}
                        </div>
                      </div>
                    )}
                    {selectedReview.professionalism && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Professionalism</span>
                        <div className="flex items-center gap-1">
                          {getRatingStars(selectedReview.professionalism)}
                        </div>
                      </div>
                    )}
                    {selectedReview.communication && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Communication</span>
                        <div className="flex items-center gap-1">
                          {getRatingStars(selectedReview.communication)}
                        </div>
                      </div>
                    )}
                    {selectedReview.vehicleCondition && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Vehicle Condition</span>
                        <div className="flex items-center gap-1">
                          {getRatingStars(selectedReview.vehicleCondition)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Review Text */}
              {selectedReview.review && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Customer Feedback
                  </h4>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    {selectedReview.review}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedReview.tags && selectedReview.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReview.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Driver Response */}
              {selectedReview.driverResponse && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Driver's Response</h4>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                    {selectedReview.driverResponse}
                    <div className="text-xs text-gray-500 mt-2">
                      Responded on {selectedReview.driverRespondedAt?.toDate?.()?.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant={selectedReview.isFlagged ? "outline" : "destructive"}
                  onClick={() => {
                    handleToggleFlag(selectedReview.id, selectedReview.isFlagged);
                    setIsReviewDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  {selectedReview.isFlagged ? 'Remove Flag' : 'Flag Review'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteReview(selectedReview.id);
                    setIsReviewDialogOpen(false);
                  }}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Review
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
