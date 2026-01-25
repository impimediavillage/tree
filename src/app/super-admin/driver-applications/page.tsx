'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DriverApplicationsManager } from '@/components/super-admin/DriverApplicationsManager';
import { DriverReviewsManager } from '@/components/super-admin/DriverReviewsManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TruckIcon, Star, DollarSign, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

export default function SuperAdminDriverApplicationsPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDrivers: 0,
    averageRating: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'Super Admin')) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (currentUser?.role === 'Super Admin') {
      loadStats();
    }
  }, [currentUser]);

  const loadStats = async () => {
    try {
      // Get application counts
      const [pendingSnap, approvedSnap, rejectedSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'driver_applications'), where('applicationStatus', '==', 'pending'))),
        getCountFromServer(query(collection(db, 'driver_applications'), where('applicationStatus', '==', 'approved'))),
        getCountFromServer(query(collection(db, 'driver_applications'), where('applicationStatus', '==', 'rejected'))),
      ]);

      // Get driver profiles count
      const driversSnap = await getCountFromServer(
        query(collection(db, 'driver_profiles'), where('ownershipType', '==', 'public'))
      );

      // Get reviews stats
      const reviewsSnap = await getDocs(collection(db, 'driver_reviews'));
      const totalRatings = reviewsSnap.docs.reduce((sum, doc) => sum + (doc.data().rating || 0), 0);
      const avgRating = reviewsSnap.size > 0 ? totalRatings / reviewsSnap.size : 0;

      setStats({
        pending: pendingSnap.data().count,
        approved: approvedSnap.data().count,
        rejected: rejectedSnap.data().count,
        totalDrivers: driversSnap.data().count,
        averageRating: avgRating,
        totalReviews: reviewsSnap.size,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'Super Admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Epic Game-Style Hero Header */}
      <div className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-green-600 animate-gradient-x" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20" />
        
        {/* Content */}
        <div className="relative container max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/30">
                  <TruckIcon className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-black text-white tracking-tight">
                    Driver Command Center
                  </h1>
                  <p className="text-purple-100 text-lg font-medium">
                    Manage Applications • Track Performance • Control The Network
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Epic Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Pending Applications',
                value: stats.pending,
                icon: Users,
                color: 'from-yellow-400 to-orange-500',
                glow: 'shadow-yellow-500/50',
              },
              {
                label: 'Active Drivers',
                value: stats.totalDrivers,
                icon: TruckIcon,
                color: 'from-green-400 to-emerald-500',
                glow: 'shadow-green-500/50',
              },
              {
                label: 'Average Rating',
                value: stats.averageRating.toFixed(1),
                icon: Star,
                color: 'from-purple-400 to-pink-500',
                glow: 'shadow-purple-500/50',
              },
              {
                label: 'Total Reviews',
                value: stats.totalReviews,
                icon: Star,
                color: 'from-blue-400 to-cyan-500',
                glow: 'shadow-blue-500/50',
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={`relative group bg-gradient-to-br ${stat.color} rounded-2xl p-6 shadow-2xl ${stat.glow} transform hover:scale-105 transition-all duration-300`}
                >
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <Icon className="w-8 h-8 text-white" />
                      <div className="text-4xl font-black text-white tracking-tight">
                        {stat.value}
                      </div>
                    </div>
                    <div className="text-white/90 font-semibold text-sm uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>

                  {/* Pulsing Border */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-white/30 group-hover:border-white/60 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 0L60 8.33C120 16.67 240 33.33 360 41.67C480 50 600 50 720 41.67C840 33.33 960 16.67 1080 16.67C1200 16.67 1320 33.33 1380 41.67L1440 50V100H1380C1320 100 1200 100 1080 100C960 100 840 100 720 100C600 100 480 100 360 100C240 100 120 100 60 100H0V0Z"
              fill="currentColor"
              className="text-purple-50 dark:text-gray-900"
            />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-14 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-1">
            <TabsTrigger value="applications" className="text-lg font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg">
              📋 Applications
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-lg font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg">
              ⭐ Reviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <DriverApplicationsManager onStatsUpdate={loadStats} />
          </TabsContent>

          <TabsContent value="reviews">
            <DriverReviewsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
