'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Truck,
  MapPin,
  DollarSign,
  Star,
  TrendingUp,
  Clock,
  Package,
  Award,
  AlertCircle,
  Power,
  Navigation,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { getDriverProfile, getAvailableDeliveries, updateDriverStatus, getDriverDashboardStats } from '@/lib/driver-service';
import AvailableDeliveriesCard from '@/components/driver/AvailableDeliveriesCard';
import ActiveDeliveryCard from '@/components/driver/ActiveDeliveryCard';
import EarningsCard from '@/components/driver/EarningsCard';
import AchievementsCard from '@/components/driver/AchievementsCard';
import type { DriverProfile, AvailableDelivery, DriverDashboardStats } from '@/types/driver';
import { useToast } from '@/hooks/use-toast';

export default function DriverDashboardPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<AvailableDelivery[]>([]);
  const [stats, setStats] = useState<DriverDashboardStats | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser && !currentUser.isDriver) {
      toast({
        title: 'Access Denied',
        description: 'You must be a registered driver to access this page',
        variant: 'destructive'
      });
      router.push('/');
      return;
    }

    if (currentUser?.uid) {
      loadDriverProfile();
      loadAvailableDeliveries();
      loadStats();

      // Refresh available deliveries every 30 seconds
      const interval = setInterval(loadAvailableDeliveries, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, loading]);

  const loadDriverProfile = async () => {
    if (!currentUser?.uid) return;

    try {
      const profile = await getDriverProfile(currentUser.uid);
      setDriverProfile(profile);
    } catch (error) {
      console.error('Error loading driver profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load driver profile',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const loadAvailableDeliveries = async () => {
    if (!currentUser?.dispensaryId) return;

    try {
      const deliveries = await getAvailableDeliveries(currentUser.dispensaryId);
      setAvailableDeliveries(deliveries);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  const loadStats = async () => {
    if (!currentUser?.uid) return;

    try {
      const driverStats = await getDriverDashboardStats(currentUser.uid);
      setStats(driverStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!currentUser?.uid || !driverProfile) return;

    const newStatus = driverProfile.status === 'available' ? 'offline' : 'available';
    
    setIsTogglingStatus(true);
    try {
      await updateDriverStatus(currentUser.uid, newStatus);
      setDriverProfile({ ...driverProfile, status: newStatus });
      
      toast({
        title: newStatus === 'available' ? 'You\'re Online! 🚗' : 'You\'re Offline',
        description: newStatus === 'available' 
          ? 'You can now receive delivery requests' 
          : 'You won\'t receive delivery requests',
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (loading || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading driver dashboard...</p>
        </div>
      </div>
    );
  }

  if (!driverProfile) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Driver profile not found. Please contact your dispensary manager.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isOnline = driverProfile.status === 'available';
  const isOnDelivery = driverProfile.status === 'on_delivery';

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Driver Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.displayName}! 👋
          </p>
        </div>
        
        {/* Online/Offline Toggle */}
        <div className="flex items-center gap-3">
          <Badge 
            variant={isOnline ? 'default' : 'secondary'}
            className={isOnline ? 'bg-green-600' : 'bg-gray-600'}
          >
            <div className="flex items-center gap-2">
              {isOnline ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </Badge>
          <Button
            onClick={toggleOnlineStatus}
            disabled={isTogglingStatus || isOnDelivery}
            variant={isOnline ? 'destructive' : 'default'}
          >
            <Power className="mr-2 h-4 w-4" />
            {isOnline ? 'Go Offline' : 'Go Online'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today.deliveries || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.week.deliveries || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{stats?.today.earnings.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              R{stats?.week.earnings.toFixed(2) || '0.00'} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverProfile.stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {driverProfile.stats.totalRatings} ratings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{driverProfile.availableEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Ready to request payout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="deliveries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="deliveries">
            <Truck className="mr-2 h-4 w-4" />
            Available Deliveries
            {availableDeliveries.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {availableDeliveries.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            <Navigation className="mr-2 h-4 w-4" />
            Active Delivery
          </TabsTrigger>
          <TabsTrigger value="earnings">
            <DollarSign className="mr-2 h-4 w-4" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Award className="mr-2 h-4 w-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deliveries" className="space-y-4">
          <AvailableDeliveriesCard
            deliveries={availableDeliveries}
            isLoading={isLoadingDeliveries}
            isOnline={isOnline}
            driverId={currentUser?.uid || ''}
            driverName={driverProfile?.displayName || currentUser?.displayName || 'Driver'}
            onRefresh={loadAvailableDeliveries}
            onClaim={(deliveryId) => {
              // Refresh after claiming
              loadDriverProfile();
              loadAvailableDeliveries();
            }}
          />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <ActiveDeliveryCard
            driverProfile={driverProfile}
            onComplete={() => {
              loadDriverProfile();
              loadStats();
            }}
          />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <EarningsCard
            driverProfile={driverProfile}
            stats={stats}
            onPayoutRequest={() => {
              loadDriverProfile();
            }}
          />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <AchievementsCard
            achievements={driverProfile.achievements}
            stats={driverProfile.stats}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      {isOnline && !isOnDelivery && availableDeliveries.length === 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Waiting for Deliveries
            </CardTitle>
            <CardDescription>
              You're online and ready to accept deliveries. New delivery requests will appear here automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isOnline && !isOnDelivery && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. Click "Go Online" to start receiving delivery requests.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
