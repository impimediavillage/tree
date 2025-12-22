'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Star, Flag, Award, BarChart3, Users, AlertTriangle, CheckCircle, XCircle, Eye, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { DispensaryReview, DispensaryReviewStats } from '@/types';
import { ReviewAnalytics } from '@/components/admin/reviews/ReviewAnalytics';
import { ReviewManagementTable } from '@/components/admin/reviews/ReviewManagementTable';
import { DispensaryLeaderboard } from '@/components/admin/reviews/DispensaryLeaderboard';
import { FlaggedReviewsSection } from '@/components/admin/reviews/FlaggedReviewsSection';

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  totalCreditsAwarded: number;
  flaggedReviews: number;
  reviewsLast7Days: number;
  reviewsLast30Days: number;
  topRatedDispensaries: number;
  averageCategories: number;
}

export default function AdminReviewDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    totalCreditsAwarded: 0,
    flaggedReviews: 0,
    reviewsLast7Days: 0,
    reviewsLast30Days: 0,
    topRatedDispensaries: 0,
    averageCategories: 0,
  });

  const [recentReviews, setRecentReviews] = useState<(DispensaryReview & { id: string })[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all reviews
      const reviewsRef = collection(db, 'dispensaryReviews');
      const allReviewsQuery = query(reviewsRef, orderBy('createdAt', 'desc'));
      const reviewsSnapshot = await getDocs(allReviewsQuery);
      
      const reviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (DispensaryReview & { id: string })[];

      // Calculate stats
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalReviews = reviews.length;
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
      const totalCreditsAwarded = reviews.reduce((sum, r) => sum + (r.creditsAwarded || 0), 0);
      const flaggedReviews = reviews.filter(r => r.status === 'flagged').length;
      
      const reviewsLast7Days = reviews.filter(r => {
        const reviewDate = r.createdAt instanceof Timestamp ? r.createdAt.toDate() : new Date(r.createdAt);
        return reviewDate >= sevenDaysAgo;
      }).length;

      const reviewsLast30Days = reviews.filter(r => {
        const reviewDate = r.createdAt instanceof Timestamp ? r.createdAt.toDate() : new Date(r.createdAt);
        return reviewDate >= thirtyDaysAgo;
      }).length;

      const averageCategories = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + Object.keys(r.categories || {}).length, 0) / reviews.length
        : 0;

      // Fetch dispensary stats for top-rated count
      const statsRef = collection(db, 'dispensaryReviewStats');
      const statsSnapshot = await getDocs(statsRef);
      const topRatedDispensaries = statsSnapshot.docs.filter(doc => {
        const data = doc.data() as DispensaryReviewStats;
        return data.averageRating >= 9.0 && data.totalReviews >= 10;
      }).length;

      setStats({
        totalReviews,
        averageRating,
        totalCreditsAwarded,
        flaggedReviews,
        reviewsLast7Days,
        reviewsLast30Days,
        topRatedDispensaries,
        averageCategories,
      });

      setRecentReviews(reviews.slice(0, 20)); // Store recent 20 for quick access

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load review dashboard data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    toast({
      title: 'Refreshing...',
      description: 'Fetching latest review data.',
    });
    fetchDashboardData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-extrabold text-[#3D2E17] tracking-tight flex items-center gap-3">
            <Star className="h-10 w-10 text-yellow-500 fill-yellow-400" />
            Review Management System
          </h1>
          <p className="text-lg text-[#5D4E37] font-semibold mt-2">
            Monitor, analyze, and manage dispensary reviews across the platform
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="border-[#006B3E] text-[#006B3E] hover:bg-[#006B3E] hover:text-white">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Total Reviews</CardTitle>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">{stats.totalReviews.toLocaleString()}</div>
            <p className="text-xs text-blue-700 font-semibold pt-1">
              {stats.reviewsLast7Days} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Platform Rating</CardTitle>
            <Star className="h-8 w-8 text-yellow-500 fill-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">{stats.averageRating.toFixed(1)}/10</div>
            <p className="text-xs text-yellow-700 font-semibold pt-1">
              {stats.averageCategories.toFixed(1)} avg categories filled
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Credits Awarded</CardTitle>
            <Award className="h-8 w-8 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">{stats.totalCreditsAwarded.toLocaleString()}</div>
            <p className="text-xs text-green-700 font-semibold pt-1">
              Avg {(stats.totalCreditsAwarded / Math.max(stats.totalReviews, 1)).toFixed(1)} per review
            </p>
          </CardContent>
        </Card>

        <Card className={`shadow-lg hover:shadow-xl transition-shadow ${
          stats.flaggedReviews > 0 
            ? 'bg-gradient-to-br from-red-50 to-rose-100 border-red-200' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Flagged Reviews</CardTitle>
            <Flag className={`h-8 w-8 ${stats.flaggedReviews > 0 ? 'text-red-600' : 'text-gray-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">{stats.flaggedReviews}</div>
            <p className={`text-xs font-semibold pt-1 ${stats.flaggedReviews > 0 ? 'text-red-700' : 'text-gray-500'}`}>
              {stats.flaggedReviews > 0 ? 'Requires attention' : 'All clear'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg border-[#006B3E]/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#3D2E17] flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#006B3E]" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5D4E37]">Last 7 days</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {stats.reviewsLast7Days} reviews
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5D4E37]">Last 30 days</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {stats.reviewsLast30Days} reviews
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-[#006B3E]/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#3D2E17] flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5D4E37]">Top Rated (≥9.0)</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {stats.topRatedDispensaries} dispensaries
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-[#006B3E]/20">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#3D2E17] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#006B3E]" />
              Engagement Quality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5D4E37]">Avg Categories</span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {stats.averageCategories.toFixed(1)} / 7
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5D4E37]">Completion Rate</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {((stats.averageCategories / 7) * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12 bg-muted">
          <TabsTrigger value="overview" className="text-sm font-semibold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-sm font-semibold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white">
            <Star className="h-4 w-4 mr-2" />
            All Reviews
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-sm font-semibold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white">
            <Award className="h-4 w-4 mr-2" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="flagged" className="text-sm font-semibold data-[state=active]:bg-[#006B3E] data-[state=active]:text-white relative">
            <Flag className="h-4 w-4 mr-2" />
            Flagged
            {stats.flaggedReviews > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {stats.flaggedReviews}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ReviewAnalytics reviews={recentReviews} />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <ReviewManagementTable 
            reviews={recentReviews}
            onReviewUpdate={fetchDashboardData}
          />
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <DispensaryLeaderboard />
        </TabsContent>

        <TabsContent value="flagged" className="space-y-6">
          <FlaggedReviewsSection 
            flaggedReviews={recentReviews.filter(r => r.status === 'flagged')}
            onUpdate={fetchDashboardData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
