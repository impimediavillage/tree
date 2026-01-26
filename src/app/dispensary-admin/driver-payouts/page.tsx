'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet,
  TrendingUp, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Users,
  Sparkles,
  Zap,
  Trophy,
  AlertCircle,
  Download,
  FileText,
  Ban
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DriverPayoutRequest, PayoutStatus } from '@/types/driver';
import { format } from 'date-fns';

// Animated Counter Component
function AnimatedCounter({ end, prefix = '', suffix = '' }: { 
  end: number; 
  prefix?: string; 
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    const startCount = 0;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(startCount + (end - startCount) * easeOutQuart);
      
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };

    updateCount();
  }, [end]);

  return <>{prefix}{count}{suffix}</>;
}

export default function DriverPayoutsPage() {
  const { currentUser, currentDispensary, isDispensaryOwner, canAccessDispensaryPanel } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [payoutRequests, setPayoutRequests] = useState<DriverPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'paid' | 'rejected'>('pending');
  
  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DriverPayoutRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Form states
  const [paymentReference, setPaymentReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!isDispensaryOwner || !canAccessDispensaryPanel) {
      router.push('/dispensary-admin/dashboard');
      return;
    }

    if (currentDispensary?.id) {
      fetchPayoutRequests();
    }
  }, [isDispensaryOwner, canAccessDispensaryPanel, currentDispensary, router]);

  const fetchPayoutRequests = async () => {
    if (!currentDispensary?.id) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, 'driver_payout_requests'),
        where('dispensaryId', '==', currentDispensary.id)
      );
      
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DriverPayoutRequest[];

      // Sort by requested date (newest first)
      requests.sort((a, b) => {
        const aTime = a.requestedAt as any;
        const bTime = b.requestedAt as any;
        return (bTime?.toMillis?.() || 0) - (aTime?.toMillis?.() || 0);
      });

      setPayoutRequests(requests);
    } catch (error) {
      console.error('Error fetching payout requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest || !currentUser || !paymentReference.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a payment reference',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);
      const payoutRef = doc(db, 'driver_payout_requests', selectedRequest.id);
      
      await updateDoc(payoutRef, {
        status: 'approved' as PayoutStatus,
        approvedAt: Timestamp.now(),
        approvedBy: currentUser.uid,
        paymentReference: paymentReference.trim(),
        updatedAt: Timestamp.now()
      });

      toast({
        title: '✅ Payout Approved',
        description: `Driver will be notified about the approval`,
      });

      setShowApproveDialog(false);
      setPaymentReference('');
      setSelectedRequest(null);
      fetchPayoutRequests();
    } catch (error) {
      console.error('Error approving payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve payout request',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !currentUser || !rejectionReason.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a rejection reason',
        variant: 'destructive'
      });
      return;
    }

    try {
      setProcessing(true);
      const payoutRef = doc(db, 'driver_payout_requests', selectedRequest.id);
      
      await updateDoc(payoutRef, {
        status: 'rejected' as PayoutStatus,
        rejectedAt: Timestamp.now(),
        rejectedBy: currentUser.uid,
        rejectionReason: rejectionReason.trim(),
        updatedAt: Timestamp.now()
      });

      // Restore driver's available earnings (move from pending back to available)
      // This would need to be done in a Cloud Function for data integrity
      // For now, just update the payout status

      toast({
        title: '❌ Payout Rejected',
        description: 'Driver will be notified about the rejection',
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedRequest(null);
      fetchPayoutRequests();
    } catch (error) {
      console.error('Error rejecting payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject payout request',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedRequest || !currentUser) return;

    try {
      setProcessing(true);
      const payoutRef = doc(db, 'driver_payout_requests', selectedRequest.id);
      
      await updateDoc(payoutRef, {
        status: 'paid' as PayoutStatus,
        paidAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast({
        title: '💰 Marked as Paid',
        description: 'Payout has been marked as completed',
      });

      setShowMarkPaidDialog(false);
      setSelectedRequest(null);
      fetchPayoutRequests();
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payout status',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const openApproveDialog = (request: DriverPayoutRequest) => {
    setSelectedRequest(request);
    setShowApproveDialog(true);
  };

  const openRejectDialog = (request: DriverPayoutRequest) => {
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const openMarkPaidDialog = (request: DriverPayoutRequest) => {
    setSelectedRequest(request);
    setShowMarkPaidDialog(true);
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MMM dd, yyyy HH:mm');
  };

  const getStatusColor = (status: PayoutStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!isDispensaryOwner || !canAccessDispensaryPanel) {
    return null;
  }

  const pendingRequests = payoutRequests.filter(r => r.status === 'pending');
  const approvedRequests = payoutRequests.filter(r => r.status === 'approved');
  const paidRequests = payoutRequests.filter(r => r.status === 'paid');
  const rejectedRequests = payoutRequests.filter(r => r.status === 'rejected');

  const totalPending = pendingRequests.reduce((sum, r) => sum + r.amount, 0);
  const totalApproved = approvedRequests.reduce((sum, r) => sum + r.amount, 0);
  const totalPaid = paidRequests.reduce((sum, r) => sum + r.amount, 0);

  const renderPayoutTable = (requests: DriverPayoutRequest[]) => {
    if (requests.length === 0) {
      return (
        <div className="text-center py-12">
          <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No payout requests found</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/50">
              <TableHead className="font-bold text-[#3D2E17]">Driver</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Amount</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Deliveries</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Bank Details</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Requested</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Status</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} className="hover:bg-white/50 transition-colors">
                <TableCell>
                  <div>
                    <p className="font-semibold text-[#3D2E17]">{request.driverName}</p>
                    <p className="text-xs text-gray-600">ID: {request.driverId.slice(0, 8)}...</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-green-700 text-lg">
                    R{request.amount.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    {request.totalDeliveries} deliveries
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    {request.bankName && <p className="font-semibold">{request.bankName}</p>}
                    {request.accountHolderName && <p className="text-gray-600">{request.accountHolderName}</p>}
                    {request.accountNumber && (
                      <p className="text-gray-600 font-mono">
                        ****{request.accountNumber.slice(-4)}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="text-gray-700">{formatTimestamp(request.requestedAt)}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(request.status)} font-semibold border-2`}>
                    {request.status.toUpperCase()}
                  </Badge>
                  {request.paymentReference && (
                    <p className="text-xs text-gray-600 mt-1">Ref: {request.paymentReference}</p>
                  )}
                  {request.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">{request.rejectionReason}</p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => openApproveDialog(request)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRejectDialog(request)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => openMarkPaidDialog(request)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-500 p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-green-400 rounded-2xl blur-lg opacity-50" />
                <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                  <Wallet className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-2">
                  💰 Driver Payouts Hub
                  <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
                </h1>
                <p className="text-white/90 text-lg">Manage your private driver payment requests</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => router.back()}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pending Requests */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  ⏳ Pending
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Pending Requests</p>
              <div className="text-4xl font-extrabold text-white mb-2">
                <AnimatedCounter end={pendingRequests.length} />
              </div>
              <div className="flex items-center gap-1 text-white/90">
                <span className="text-lg font-bold">
                  R<AnimatedCounter end={totalPending} />
                </span>
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  ✅ Approved
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Approved Payouts</p>
              <div className="text-4xl font-extrabold text-white mb-2">
                <AnimatedCounter end={approvedRequests.length} />
              </div>
              <div className="flex items-center gap-1 text-white/90">
                <span className="text-lg font-bold">
                  R<AnimatedCounter end={totalApproved} />
                </span>
              </div>
            </div>
          </div>

          {/* Paid */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  💸 Paid
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Completed Payouts</p>
              <div className="text-4xl font-extrabold text-white mb-2">
                <AnimatedCounter end={paidRequests.length} />
              </div>
              <div className="flex items-center gap-1 text-white/90">
                <span className="text-lg font-bold">
                  R<AnimatedCounter end={totalPaid} />
                </span>
              </div>
            </div>
          </div>

          {/* Total Drivers */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  🚗 Drivers
                </Badge>
              </div>
              <p className="text-sm font-medium text-white/80 mb-2">Active Drivers</p>
              <div className="text-4xl font-extrabold text-white mb-2">
                <AnimatedCounter end={new Set(payoutRequests.map(r => r.driverId)).size} />
              </div>
              <div className="flex items-center gap-1 text-white/90">
                <span className="text-sm">
                  {payoutRequests.length} total requests
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-white/50 shadow-2xl">
          <CardHeader className="border-b-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-extrabold text-[#3D2E17] flex items-center gap-2">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  Payout Requests Management
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 mt-2">
                  Review and process driver payment requests
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger 
                  value="pending" 
                  className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-800 font-bold"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Pending ({pendingRequests.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="approved"
                  className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 font-bold"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approved ({approvedRequests.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="paid"
                  className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800 font-bold"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Paid ({paidRequests.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="rejected"
                  className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800 font-bold"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejected ({rejectedRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {renderPayoutTable(pendingRequests)}
              </TabsContent>

              <TabsContent value="approved">
                {renderPayoutTable(approvedRequests)}
              </TabsContent>

              <TabsContent value="paid">
                {renderPayoutTable(paidRequests)}
              </TabsContent>

              <TabsContent value="rejected">
                {renderPayoutTable(rejectedRequests)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Approve Payout Request
            </DialogTitle>
            <DialogDescription>
              Confirm approval and provide payment reference details
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Driver:</strong> {selectedRequest.driverName}</p>
                    <p><strong>Amount:</strong> <span className="text-green-700 font-bold text-lg">R{selectedRequest.amount.toFixed(2)}</span></p>
                    <p><strong>Deliveries:</strong> {selectedRequest.totalDeliveries}</p>
                    {selectedRequest.bankName && <p><strong>Bank:</strong> {selectedRequest.bankName}</p>}
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="paymentRef" className="text-base font-semibold">
                  Payment Reference *
                </Label>
                <Input
                  id="paymentRef"
                  placeholder="e.g., EFT123456789"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="text-base"
                />
                <p className="text-sm text-gray-500">
                  Enter the bank transfer reference or transaction ID
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setPaymentReference('');
                setSelectedRequest(null);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing || !paymentReference.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Payout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <XCircle className="h-6 w-6 text-red-600" />
              Reject Payout Request
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payout request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Driver:</strong> {selectedRequest.driverName}</p>
                    <p><strong>Amount:</strong> R{selectedRequest.amount.toFixed(2)}</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="rejectionReason" className="text-base font-semibold">
                  Rejection Reason *
                </Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Explain why this payout is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="text-base min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setSelectedRequest(null);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
              variant="destructive"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <DollarSign className="h-6 w-6 text-green-600" />
              Mark as Paid
            </DialogTitle>
            <DialogDescription>
              Confirm that the payment has been successfully transferred
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>Driver:</strong> {selectedRequest.driverName}</p>
                    <p><strong>Amount:</strong> <span className="text-green-700 font-bold text-lg">R{selectedRequest.amount.toFixed(2)}</span></p>
                    <p><strong>Reference:</strong> {selectedRequest.paymentReference}</p>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will mark the payout as completed. The driver will be notified.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowMarkPaidDialog(false);
                setSelectedRequest(null);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkPaid}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
