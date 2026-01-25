'use client';

import { useEffect, useState } from 'react';
import { db, auth as firebaseAuthInstance } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { DriverApplication } from '@/types/driver';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Loader2,
  Search,
  Filter,
  Download,
  User,
  MapPin,
  Car,
  FileText,
  CreditCard,
  DollarSign,
  Radius,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DriverApplicationsManagerProps {
  onStatsUpdate: () => void;
}

export function DriverApplicationsManager({ onStatsUpdate }: DriverApplicationsManagerProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<(DriverApplication & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<(DriverApplication & { id: string }) | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'driver_applications'), orderBy('submittedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (DriverApplication & { id: string })[];
      
      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredApplications = applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.applicationStatus === filterStatus;
    const matchesSearch = searchTerm === '' ||
      app.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.homeLocation.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const handleApprove = async (app: DriverApplication & { id: string }) => {
    if (!currentUser) return;

    setIsProcessing(true);
    try {
      // Geocode the address to get real coordinates
      let homeLocation = app.homeLocation;
      
      if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        try {
          const fullAddress = `${homeLocation.address}, ${homeLocation.city}, ${homeLocation.province}, ${homeLocation.country}`;
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            homeLocation = {
              ...homeLocation,
              latitude: location.lat,
              longitude: location.lng,
            };
            console.log('✅ Geocoded address:', location.lat, location.lng);
          } else {
            console.warn('⚠️ Geocoding failed, using 0,0 coordinates');
          }
        } catch (geoError) {
          console.error('❌ Error geocoding:', geoError);
        }
      }

      // Generate random password
      const tempPassword = `Driver${Math.random().toString(36).slice(-8)}!`;

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuthInstance,
        app.email,
        tempPassword
      );

      const userId = userCredential.user.uid;

      // Create user document
      await setDoc(doc(db, 'users', userId), {
        email: app.email,
        displayName: `${app.firstName} ${app.lastName}`,
        role: 'Driver',
        isDriver: true,
        phoneNumber: app.phoneNumber,
        dialCode: app.dialCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create driver profile
      await setDoc(doc(db, 'driver_profiles', userId), {
        userId,
        crewMemberType: 'Driver',
        ownershipType: 'public',
        isIndependent: true,
        approvalStatus: 'approved',
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp(),
        displayName: `${app.firstName} ${app.lastName}`,
        email: app.email,
        phoneNumber: app.phoneNumber,
        dialCode: app.dialCode,
        homeLocation, // Now has real coordinates!
        pricePerKm: app.pricePerKm,
        serviceRadius: app.serviceRadius,
        baseDeliveryFee: app.baseDeliveryFee || 0,
        vehicle: {
          type: app.vehicle.type,
          registrationNumber: app.vehicle.registrationNumber,
          color: app.vehicle.color,
          description: app.vehicle.description,
          imageUrl: app.documents.vehiclePhoto,
          verified: false,
        },
        documents: {
          driverLicense: {
            url: app.documents.driverLicenseFront,
            uploadedAt: serverTimestamp(),
            verified: false,
          },
          idDocument: {
            url: app.documents.idDocument,
            uploadedAt: serverTimestamp(),
            verified: false,
          },
          vehiclePhoto: {
            url: app.documents.vehiclePhoto,
            uploadedAt: serverTimestamp(),
            verified: false,
          },
        },
        status: 'offline',
        isActive: true,
        lastActiveAt: serverTimestamp(),
        stats: {
          totalDeliveries: 0,
          completedDeliveries: 0,
          cancelledDeliveries: 0,
          failedDeliveries: 0,
          averageRating: 0,
          totalRatings: 0,
          totalEarnings: 0,
          onTimeDeliveryRate: 100,
          acceptanceRate: 100,
          currentStreak: 0,
          longestStreak: 0,
        },
        achievements: [],
        availableEarnings: 0,
        pendingPayouts: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update application status
      await updateDoc(doc(db, 'driver_applications', app.id), {
        applicationStatus: 'approved',
        reviewedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
        reviewNotes: reviewNotes || 'Application approved',
      });

      toast({
        title: 'Application Approved! ✅',
        description: `${app.firstName} ${app.lastName} has been added as a driver. Temporary password: ${tempPassword}`,
      });

      setIsReviewDialogOpen(false);
      setSelectedApp(null);
      setReviewNotes('');
      onStatsUpdate();
    } catch (error: any) {
      console.error('Error approving application:', error);
      toast({
        title: 'Approval Failed',
        description: error.message || 'Failed to approve application',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (app: DriverApplication & { id: string }) => {
    if (!currentUser || !reviewNotes.trim()) {
      toast({
        title: 'Review Notes Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, 'driver_applications', app.id), {
        applicationStatus: 'rejected',
        reviewedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
        reviewNotes,
        rejectionReason: reviewNotes,
      });

      toast({
        title: 'Application Rejected',
        description: `${app.firstName} ${app.lastName}'s application has been rejected`,
      });

      setIsReviewDialogOpen(false);
      setSelectedApp(null);
      setReviewNotes('');
      onStatsUpdate();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: 'Rejection Failed',
        description: 'Failed to reject application',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'driver_applications', appId));
      toast({
        title: 'Application Deleted',
        description: 'The application has been permanently deleted',
      });
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete application',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">⏳ Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">✅ Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">❌ Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters & Search */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      No applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <TableCell>
                        <div className="font-medium">{app.firstName} {app.lastName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>{app.email}</div>
                          <div className="text-gray-500">{app.dialCode} {app.phoneNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{app.homeLocation.city}</div>
                          <div className="text-gray-500">{app.homeLocation.province}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="font-medium">R{app.pricePerKm}/km</div>
                          <div className="text-gray-500">{app.serviceRadius}km radius</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="capitalize">{app.vehicle.type}</div>
                          <div className="text-gray-500">{app.vehicle.color}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.applicationStatus)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {app.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedApp(app);
                              setIsReviewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {app.applicationStatus !== 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(app.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
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

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
            <DialogDescription>
              Review all details and approve or reject this driver application
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg">{selectedApp.firstName} {selectedApp.lastName}</h3>
                  <p className="text-sm text-gray-500">Application ID: {selectedApp.id}</p>
                </div>
                {getStatusBadge(selectedApp.applicationStatus)}
              </div>

              {/* Personal Info */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>{' '}
                    <span className="font-medium">{selectedApp.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{' '}
                    <span className="font-medium">{selectedApp.dialCode} {selectedApp.phoneNumber}</span>
                  </div>
                </div>
              </div>

              {/* Location & Pricing */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  Location & Pricing
                </h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Address:</span>{' '}
                    <span className="font-medium">{selectedApp.homeLocation.address}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-gray-500">City:</span>{' '}
                      <span className="font-medium">{selectedApp.homeLocation.city}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Province:</span>{' '}
                      <span className="font-medium">{selectedApp.homeLocation.province}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Country:</span>{' '}
                      <span className="font-medium">{selectedApp.homeLocation.country}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div>
                      <span className="text-gray-500">Rate:</span>{' '}
                      <span className="font-medium text-green-600">R{selectedApp.pricePerKm}/km</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Service Radius:</span>{' '}
                      <span className="font-medium">{selectedApp.serviceRadius} km</span>
                    </div>
                    {selectedApp.baseDeliveryFee && (
                      <div>
                        <span className="text-gray-500">Min Fee:</span>{' '}
                        <span className="font-medium">R{selectedApp.baseDeliveryFee}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Car className="w-5 h-5 text-purple-600" />
                  Vehicle Information
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>{' '}
                    <span className="font-medium capitalize">{selectedApp.vehicle.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Color:</span>{' '}
                    <span className="font-medium">{selectedApp.vehicle.color}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Registration:</span>{' '}
                    <span className="font-medium">{selectedApp.vehicle.registrationNumber}</span>
                  </div>
                  {selectedApp.vehicle.make && (
                    <div>
                      <span className="text-gray-500">Make/Model:</span>{' '}
                      <span className="font-medium">{selectedApp.vehicle.make} {selectedApp.vehicle.model}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Documents
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Driver License (Front)', url: selectedApp.documents.driverLicenseFront },
                    { label: 'Driver License (Back)', url: selectedApp.documents.driverLicenseBack },
                    { label: 'ID Document', url: selectedApp.documents.idDocument },
                    { label: 'Vehicle Photo', url: selectedApp.documents.vehiclePhoto },
                  ].map((doc) => (
                    <a
                      key={doc.label}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border rounded-lg hover:border-purple-500 transition-colors"
                    >
                      <div className="text-sm font-medium mb-2">{doc.label}</div>
                      <img
                        src={doc.url}
                        alt={doc.label}
                        className="w-full h-32 object-cover rounded"
                      />
                    </a>
                  ))}
                </div>
              </div>

              {/* Banking */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  Banking Information
                </h4>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div>
                    <span className="text-gray-500">Bank:</span>{' '}
                    <span className="font-medium">{selectedApp.banking.bankName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Account Holder:</span>{' '}
                    <span className="font-medium">{selectedApp.banking.accountHolderName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Account Number:</span>{' '}
                    <span className="font-medium">****{selectedApp.banking.accountNumber.slice(-4)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Branch Code:</span>{' '}
                    <span className="font-medium">{selectedApp.banking.branchCode}</span>
                  </div>
                </div>
              </div>

              {/* Review Notes */}
              {selectedApp.applicationStatus === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">Review Notes</Label>
                  <Textarea
                    id="reviewNotes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about this application (required for rejection)..."
                    rows={3}
                  />
                </div>
              )}

              {/* Previous Review */}
              {selectedApp.reviewNotes && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium text-sm mb-1">Previous Review Notes:</div>
                  <div className="text-sm">{selectedApp.reviewNotes}</div>
                  {selectedApp.reviewedAt && (
                    <div className="text-xs text-gray-500 mt-2">
                      Reviewed on {selectedApp.reviewedAt.toDate().toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {selectedApp.applicationStatus === 'pending' && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedApp)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Reject Application
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedApp)}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve & Create Driver
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
