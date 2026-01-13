'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { getDriverProfile, verifyDriverDocuments, updateDriverStatus } from '@/lib/driver-service';
import type { DriverProfile, DriverStatus } from '@/types/driver';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Car,
  FileCheck,
  Phone,
  Star,
  Trophy,
  DollarSign,
  TrendingUp,
  Navigation,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Ban,
  Package,
  Calendar,
  Award
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function DriverDetailPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const driverId = params?.driverId as string;
  const defaultTab = searchParams?.get('tab') || 'overview';

  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser && currentUser.role !== 'DispensaryOwner' && currentUser.role !== 'Super Admin') {
      router.push('/');
      return;
    }

    if (driverId) {
      loadDriver();
    }
  }, [currentUser, authLoading, driverId]);

  const loadDriver = async () => {
    try {
      setLoading(true);
      const driverData = await getDriverProfile(driverId);
      setDriver(driverData);
    } catch (error) {
      console.error('Error loading driver:', error);
      toast({
        title: 'Error',
        description: 'Failed to load driver profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentType: 'driverLicense' | 'idDocument' | 'vehiclePhoto') => {
    if (!driver || !currentUser?.uid) return;

    try {
      setIsVerifying(true);
      await verifyDriverDocuments(driver.userId, documentType, currentUser.uid);
      
      toast({
        title: 'Document Verified ✅',
        description: 'Document has been successfully verified',
      });
      
      await loadDriver();
    } catch (error) {
      console.error('Error verifying document:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify document',
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStatusUpdate = async (newStatus: DriverStatus) => {
    if (!driver) return;

    try {
      setIsUpdatingStatus(true);
      await updateDriverStatus(driver.userId, newStatus);
      
      toast({
        title: 'Status Updated',
        description: `Driver is now ${newStatus}`,
      });
      
      await loadDriver();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update driver status',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="container max-w-5xl py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Driver not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'on_delivery': return 'bg-blue-500';
      case 'offline': return 'bg-gray-400';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dispensary-admin/drivers">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-[#3D2E17] flex items-center gap-3">
              {driver.displayName || 'Unnamed Driver'}
              <div className={`w-4 h-4 rounded-full ${getStatusColor(driver.status)} animate-pulse`} />
            </h1>
            <p className="text-[#5D4E37] mt-1">Driver Profile & Management</p>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-2">
          {driver.status === 'suspended' ? (
            <Button
              onClick={() => handleStatusUpdate('offline')}
              disabled={isUpdatingStatus}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Unsuspend Driver
            </Button>
          ) : (
            <Button
              onClick={() => handleStatusUpdate('suspended')}
              disabled={isUpdatingStatus}
              variant="destructive"
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Suspend Driver
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {(!driver.documents.driverLicense?.verified || 
        !driver.documents.idDocument?.verified || 
        !driver.documents.vehiclePhoto?.verified) && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Driver documents are pending verification. Review documents in the Verification tab.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">
              {driver.stats.completedDeliveries}
            </div>
            <p className="text-xs text-green-600 mt-1">Total deliveries</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-800 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-yellow-700">
              {driver.stats.averageRating.toFixed(1)}
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              {driver.stats.totalRatings} ratings
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-700">
              R{driver.stats.totalEarnings.toFixed(0)}
            </div>
            <p className="text-xs text-purple-600 mt-1">Total earned</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              On-Time Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700">
              {driver.stats.onTimeDeliveryRate.toFixed(0)}%
            </div>
            <p className="text-xs text-orange-600 mt-1">Punctuality</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="verification">
            Verification
            {(!driver.documents.driverLicense?.verified || 
              !driver.documents.idDocument?.verified || 
              !driver.documents.vehiclePhoto?.verified) && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                !
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-semibold">{driver.dialCode} {driver.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge variant={driver.status === 'available' ? 'default' : 'secondary'}>
                    {driver.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-semibold">
                    {driver.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-purple-600" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle Type</p>
                  <p className="font-semibold capitalize">{driver.vehicle.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registration</p>
                  <p className="font-semibold">{driver.vehicle.registrationNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Color</p>
                  <p className="font-semibold capitalize">{driver.vehicle.color}</p>
                </div>
                {driver.vehicle.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{driver.vehicle.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Verified:</p>
                  {driver.vehicle.verified ? (
                    <Badge className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Delivery */}
          {driver.status === 'on_delivery' && driver.currentDeliveryId && (
            <Card className="border-2 border-blue-500 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Navigation className="h-5 w-5 animate-pulse" />
                  Currently On Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-blue-900">
                  Order ID: #{driver.currentDeliveryId.slice(-8).toUpperCase()}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-purple-600" />
                Document Verification
              </CardTitle>
              <CardDescription>
                Review and verify driver documents. Click on images to view full size.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Driver License */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    🪪 Driver's License
                    {driver.documents.driverLicense?.verified && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </h3>
                  {!driver.documents.driverLicense?.verified && (
                    <Button
                      size="sm"
                      onClick={() => handleVerifyDocument('driverLicense')}
                      disabled={isVerifying}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </Button>
                  )}
                </div>
                {driver.documents.driverLicense?.url && (
                  <div 
                    className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedImage(driver.documents.driverLicense!.url)}
                  >
                    <Image
                      src={driver.documents.driverLicense.url}
                      alt="Driver License"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>

              {/* ID Document */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    🆔 ID Document
                    {driver.documents.idDocument?.verified && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </h3>
                  {!driver.documents.idDocument?.verified && (
                    <Button
                      size="sm"
                      onClick={() => handleVerifyDocument('idDocument')}
                      disabled={isVerifying}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </Button>
                  )}
                </div>
                {driver.documents.idDocument?.url && (
                  <div 
                    className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedImage(driver.documents.idDocument!.url)}
                  >
                    <Image
                      src={driver.documents.idDocument.url}
                      alt="ID Document"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Vehicle Photo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    🚗 Vehicle Photo
                    {driver.documents.vehiclePhoto?.verified && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </h3>
                  {!driver.documents.vehiclePhoto?.verified && (
                    <Button
                      size="sm"
                      onClick={() => handleVerifyDocument('vehiclePhoto')}
                      disabled={isVerifying}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </Button>
                  )}
                </div>
                {driver.documents.vehiclePhoto?.url && (
                  <div 
                    className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedImage(driver.documents.vehiclePhoto!.url)}
                  >
                    <Image
                      src={driver.documents.vehiclePhoto.url}
                      alt="Vehicle Photo"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Deliveries</span>
                  <span className="font-bold">{driver.stats.totalDeliveries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-bold text-green-600">{driver.stats.completedDeliveries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cancelled</span>
                  <span className="font-bold text-red-600">{driver.stats.cancelledDeliveries}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Acceptance Rate</span>
                  <span className="font-bold">{driver.stats.acceptanceRate.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold">{driver.stats.averageRating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">On-Time Rate</span>
                  <span className="font-bold">{driver.stats.onTimeDeliveryRate.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Streak</span>
                  <span className="font-bold">{driver.stats.currentStreak} 🔥</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Longest Streak</span>
                  <span className="font-bold">{driver.stats.longestStreak} 🏆</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Earnings Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <p className="text-sm text-green-800 font-medium">Total Earned</p>
                  <p className="text-2xl font-black text-green-700 mt-1">
                    R{driver.stats.totalEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">Available Now</p>
                  <p className="text-2xl font-black text-blue-700 mt-1">
                    R{driver.availableEarnings.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <p className="text-sm text-orange-800 font-medium">Pending Payouts</p>
                  <p className="text-2xl font-black text-orange-700 mt-1">
                    R{driver.pendingPayouts.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                Earned Achievements
              </CardTitle>
              <CardDescription>
                Milestones and badges earned by this driver
              </CardDescription>
            </CardHeader>
            <CardContent>
              {driver.achievements && driver.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {driver.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="p-4 border-2 rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{achievement.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-bold text-[#3D2E17]">{achievement.name}</h3>
                          <p className="text-sm text-[#5D4E37] mt-1">{achievement.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Earned {achievement.earnedAt?.toDate?.().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No achievements earned yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Complete deliveries to unlock achievements!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-[600px]">
              <Image
                src={selectedImage}
                alt="Document"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
