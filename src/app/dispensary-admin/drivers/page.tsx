'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getDispensaryDrivers } from '@/lib/driver-service';
import type { DriverProfile } from '@/types/driver';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  TrendingUp, 
  Users, 
  DollarSign,
  Star,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Navigation,
  Phone,
  Car,
  FileCheck,
  Eye,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Trophy,
  Target,
  Zap,
  CircleDot,
  XCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import FailedDeliveriesDashboard from '@/components/dispensary-admin/FailedDeliveriesDashboard';

export default function DispensaryDriverManagementPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'available' | 'on_delivery' | 'offline'>('all');

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser && currentUser.role !== 'DispensaryOwner' && currentUser.role !== 'Super Admin') {
      router.push('/');
      return;
    }

    if (currentUser?.dispensaryId) {
      loadDrivers();
    }
  }, [currentUser, authLoading]);

  const loadDrivers = async () => {
    if (!currentUser?.dispensaryId) return;

    try {
      setLoading(true);
      const driversData = await getDispensaryDrivers(currentUser.dispensaryId);
      setDrivers(driversData);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Calculate aggregate stats
  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;
  const onDeliveryDrivers = drivers.filter(d => d.status === 'on_delivery').length;
  const offlineDrivers = drivers.filter(d => d.status === 'offline').length;
  
  const totalDeliveries = drivers.reduce((sum, d) => sum + d.stats.completedDeliveries, 0);
  const totalEarnings = drivers.reduce((sum, d) => sum + d.stats.totalEarnings, 0);
  const avgRating = drivers.length > 0
    ? drivers.reduce((sum, d) => sum + d.stats.averageRating, 0) / drivers.length
    : 0;
  const unverifiedDrivers = drivers.filter(d => 
    !d.documents.driverLicense?.verified || 
    !d.documents.idDocument?.verified || 
    !d.documents.vehiclePhoto?.verified
  ).length;

  // Filter drivers by status
  const filteredDrivers = selectedStatus === 'all' 
    ? drivers 
    : drivers.filter(d => d.status === selectedStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'on_delivery': return 'bg-blue-500';
      case 'offline': return 'bg-gray-400';
      case 'suspended': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'on_delivery': return 'secondary';
      case 'offline': return 'outline';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[#3D2E17]">
            🚗 Driver Management Hub
          </h1>
          <p className="text-[#5D4E37] mt-2 text-lg">
            Manage your delivery crew and track performance
          </p>
        </div>
        <Link href="/dispensary-admin/users">
          <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Users className="mr-2 h-5 w-5" />
            Add Driver
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-green-600" />
              Available Now
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-700">{availableDrivers}</div>
            <p className="text-xs text-green-600 mt-1">Ready for deliveries</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Navigation className="h-4 w-4 text-blue-600" />
              On Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-700">{onDeliveryDrivers}</div>
            <p className="text-xs text-blue-600 mt-1">Active deliveries</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-600" />
              Total Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-700">{totalDeliveries}</div>
            <p className="text-xs text-purple-600 mt-1">All-time completed</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-orange-700">R{totalEarnings.toFixed(0)}</div>
            <p className="text-xs text-orange-600 mt-1">Crew earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {unverifiedDrivers > 0 && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{unverifiedDrivers}</strong> driver{unverifiedDrivers > 1 ? 's' : ''} pending document verification
          </AlertDescription>
        </Alert>
      )}

      {/* Driver List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600">
            All ({totalDrivers})
          </TabsTrigger>
          <TabsTrigger value="available" className="data-[state=active]:bg-green-600">
            Online ({availableDrivers})
          </TabsTrigger>
          <TabsTrigger value="on_delivery" className="data-[state=active]:bg-blue-600">
            Busy ({onDeliveryDrivers})
          </TabsTrigger>
          <TabsTrigger value="offline" className="data-[state=active]:bg-gray-600">
            Offline ({offlineDrivers})
          </TabsTrigger>
          <TabsTrigger value="failed" className="data-[state=active]:bg-red-600">
            <XCircle className="h-4 w-4 mr-1" />
            Failed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {drivers.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg font-semibold">No drivers found</p>
                <p className="text-gray-500 text-sm mt-2">
                  Add your first driver to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {drivers.map((driver) => (
                <Card 
                  key={driver.userId}
                  className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Status Indicator */}
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(driver.status)} animate-pulse`} />
                        <div>
                          <CardTitle className="text-lg font-bold text-[#3D2E17]">
                            {driver.displayName || 'Unnamed Driver'}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getStatusBadgeVariant(driver.status)}>
                              {driver.status === 'available' && '🟢 Available'}
                              {driver.status === 'on_delivery' && '🔵 On Delivery'}
                              {driver.status === 'offline' && '⚫ Offline'}
                              {driver.status === 'suspended' && '🔴 Suspended'}
                            </Badge>
                            {(!driver.documents.driverLicense?.verified || 
                              !driver.documents.idDocument?.verified || 
                              !driver.documents.vehiclePhoto?.verified) && (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                        <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
                        <span className="text-sm font-bold text-yellow-800">
                          {driver.stats.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Vehicle Info */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Car className="h-5 w-5 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-blue-900 capitalize">
                          {driver.vehicle.type} • {driver.vehicle.color}
                        </p>
                        <p className="text-xs text-blue-700">
                          {driver.vehicle.registrationNumber || 'No reg'}
                        </p>
                      </div>
                      {driver.vehicle.verified && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-2 text-sm text-[#5D4E37]">
                      <Phone className="h-4 w-4" />
                      <span>{driver.dialCode} {driver.phoneNumber}</span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-lg text-center border border-green-200">
                        <div className="text-xl font-black text-green-700">
                          {driver.stats.completedDeliveries}
                        </div>
                        <div className="text-xs text-green-600 font-semibold">Deliveries</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-lg text-center border border-purple-200">
                        <div className="text-xl font-black text-purple-700">
                          R{driver.stats.totalEarnings.toFixed(0)}
                        </div>
                        <div className="text-xs text-purple-600 font-semibold">Earned</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-3 rounded-lg text-center border border-orange-200">
                        <div className="text-xl font-black text-orange-700">
                          {driver.stats.onTimeDeliveryRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-orange-600 font-semibold">On Time</div>
                      </div>
                    </div>

                    {/* Achievements */}
                    {driver.achievements && driver.achievements.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                        {driver.achievements.slice(0, 3).map((achievement, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {achievement.icon} {achievement.name}
                          </Badge>
                        ))}
                        {driver.achievements.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{driver.achievements.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Current Delivery Status */}
                    {driver.status === 'on_delivery' && driver.currentDeliveryId && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800">
                          <Navigation className="h-4 w-4 animate-pulse" />
                          <span className="text-sm font-semibold">Delivering Order #{driver.currentDeliveryId.slice(-6)}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/dispensary-admin/drivers/${driver.userId}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      
                      {(!driver.documents.driverLicense?.verified || 
                        !driver.documents.idDocument?.verified || 
                        !driver.documents.vehiclePhoto?.verified) && (
                        <Link href={`/dispensary-admin/drivers/${driver.userId}?tab=verification`} className="flex-1">
                          <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700">
                            <FileCheck className="h-4 w-4 mr-2" />
                            Verify
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          {drivers.filter(d => d.status === 'available').length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg font-semibold">No online drivers</p>
                <p className="text-gray-500 text-sm mt-2">
                  No drivers are currently online
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {drivers.filter(d => d.status === 'available').map((driver) => (
                <Card 
                  key={driver.userId}
                  className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {driver.displayName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{driver.displayName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-green-600">Online</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-green-50">
                        <p className="text-xl font-bold text-green-700">{driver.stats.completedDeliveries}</p>
                        <p className="text-xs text-green-600">Deliveries</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-yellow-50">
                        <p className="text-xl font-bold text-yellow-700">{driver.stats.averageRating.toFixed(1)}</p>
                        <p className="text-xs text-yellow-600">Rating</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-purple-50">
                        <p className="text-xl font-bold text-purple-700">R{driver.stats.totalEarnings.toFixed(0)}</p>
                        <p className="text-xs text-purple-600">Earned</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dispensary-admin/drivers/${driver.userId}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="on_delivery" className="space-y-4">
          {drivers.filter(d => d.status === 'on_delivery').length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg font-semibold">No busy drivers</p>
                <p className="text-gray-500 text-sm mt-2">
                  No drivers are currently on delivery
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {drivers.filter(d => d.status === 'on_delivery').map((driver) => (
                <Card 
                  key={driver.userId}
                  className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {driver.displayName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{driver.displayName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-blue-600">On Delivery</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-green-50">
                        <p className="text-xl font-bold text-green-700">{driver.stats.completedDeliveries}</p>
                        <p className="text-xs text-green-600">Deliveries</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-yellow-50">
                        <p className="text-xl font-bold text-yellow-700">{driver.stats.averageRating.toFixed(1)}</p>
                        <p className="text-xs text-yellow-600">Rating</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-purple-50">
                        <p className="text-xl font-bold text-purple-700">R{driver.stats.totalEarnings.toFixed(0)}</p>
                        <p className="text-xs text-purple-600">Earned</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dispensary-admin/drivers/${driver.userId}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          {drivers.filter(d => d.status === 'offline').length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg font-semibold">No offline drivers</p>
                <p className="text-gray-500 text-sm mt-2">
                  All drivers are currently active
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {drivers.filter(d => d.status === 'offline').map((driver) => (
                <Card 
                  key={driver.userId}
                  className="border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-slate-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {driver.displayName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{driver.displayName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-gray-600">Offline</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-green-50">
                        <p className="text-xl font-bold text-green-700">{driver.stats.completedDeliveries}</p>
                        <p className="text-xs text-green-600">Deliveries</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-yellow-50">
                        <p className="text-xl font-bold text-yellow-700">{driver.stats.averageRating.toFixed(1)}</p>
                        <p className="text-xs text-yellow-600">Rating</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-purple-50">
                        <p className="text-xl font-bold text-purple-700">R{driver.stats.totalEarnings.toFixed(0)}</p>
                        <p className="text-xs text-purple-600">Earned</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dispensary-admin/drivers/${driver.userId}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {currentUser?.dispensaryId && (
            <FailedDeliveriesDashboard dispensaryId={currentUser.dispensaryId} />
          )}
        </TabsContent>
      </Tabs>

      {/* Performance Leaderboard */}
      {drivers.length > 0 && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-6 w-6 text-yellow-600" />
              Top Performers This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {drivers
                .sort((a, b) => b.stats.completedDeliveries - a.stats.completedDeliveries)
                .slice(0, 5)
                .map((driver, index) => (
                  <div 
                    key={driver.userId}
                    className="flex items-center gap-4 p-3 bg-white rounded-lg border-2 border-purple-200 hover:shadow-md transition-shadow"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-600' :
                      'bg-purple-500'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <p className="font-bold text-[#3D2E17]">{driver.displayName}</p>
                      <div className="flex items-center gap-4 text-xs text-[#5D4E37]/70">
                        <span>🚗 {driver.stats.completedDeliveries} deliveries</span>
                        <span>⭐ {driver.stats.averageRating.toFixed(1)}</span>
                        <span>💰 R{driver.stats.totalEarnings.toFixed(0)}</span>
                      </div>
                    </div>
                    
                    {driver.stats.currentStreak > 0 && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500">
                        🔥 {driver.stats.currentStreak} streak
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
