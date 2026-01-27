'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Wallet, 
  DollarSign, 
  User,
  ArrowLeft,
  Loader2,
  Sparkles,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import type { VendorPayoutRequest } from '@/types/vendor-earnings';
import { formatCurrency, calculateVendorPayout } from '@/types/vendor-earnings';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

export default function VendorPayoutsPage() {
  const { currentUser, isDispensaryOwner } = useAuth();
  const { toast } = useToast();

  const [payoutRequests, setPayoutRequests] = useState<VendorPayoutRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VendorPayoutRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'markPaid' | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats
  const stats = {
    pending: payoutRequests.filter(r => r.status === 'pending').length,
    approved: payoutRequests.filter(r => r.status === 'approved').length,
    paid: payoutRequests.filter(r => r.status === 'paid').length,
    activeVendors: new Set(payoutRequests.map(r => r.vendorId)).size
  };

  useEffect(() => {
    if (!currentUser?.dispensaryId) return;

    const fetchPayoutRequests = async () => {
      setIsLoading(true);
      try {
        const payoutsRef = collection(db, 'vendor_payout_requests');
        const q = query(
          payoutsRef,
          where('dispensaryId', '==', currentUser.dispensaryId),
          orderBy('requestedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as VendorPayoutRequest[];

        setPayoutRequests(requests);
      } catch (error) {
        console.error('Error fetching vendor payout requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to load vendor payout requests',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayoutRequests();
  }, [currentUser]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'vendor_payout_requests', selectedRequest.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: currentUser?.uid,
        approverName: currentUser?.displayName || currentUser?.name || 'Admin',
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Payout Approved',
        description: `Approved ${formatCurrency(selectedRequest.netPayout)} payout for ${selectedRequest.vendorName}`
      });

      // Refresh data
      window.location.reload();
    } catch (error: any) {
      console.error('Error approving payout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve payout',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setSelectedRequest(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'vendor_payout_requests', selectedRequest.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser?.uid,
        rejectionReason,
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Payout Rejected',
        description: `Rejected payout request from ${selectedRequest.vendorName}`
      });

      window.location.reload();
    } catch (error: any) {
      console.error('Error rejecting payout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject payout',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setSelectedRequest(null);
      setRejectionReason('');
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedRequest || !paymentReference.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a payment reference',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'vendor_payout_requests', selectedRequest.id), {
        status: 'paid',
        paidAt: serverTimestamp(),
        paymentReference,
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Payout Marked as Paid',
        description: `Marked ${formatCurrency(selectedRequest.netPayout)} as paid to ${selectedRequest.vendorName}`
      });

      window.location.reload();
    } catch (error: any) {
      console.error('Error marking payout as paid:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payout status',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setSelectedRequest(null);
      setPaymentReference('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filterByStatus = (status?: string) => {
    if (!status) return payoutRequests;
    return payoutRequests.filter(r => r.status === status);
  };

  if (!isDispensaryOwner) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600">Only dispensary owners can manage vendor payouts.</p>
        </div>
      </div>
    );
  }

  const router = useRouter();

  const totalPending = payoutRequests
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.netPayout, 0);

  const totalApproved = payoutRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.netPayout, 0);

  const totalPaid = payoutRequests
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + r.netPayout, 0);

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Gradient Hero Section */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 rounded-3xl p-8 mb-6 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-lg opacity-50" />
              <div className="relative bg-white rounded-2xl p-4 shadow-lg">
                <Users className="h-12 w-12 text-purple-600" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white mb-2 flex items-center gap-2">
                👥 Vendor Payouts Hub
                <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
              </h1>
              <p className="text-white/90 text-lg">
                Manage payout requests from your vendor crew members
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Animated Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Card */}
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
              <AnimatedCounter end={stats.pending} />
            </div>
            <div className="flex items-center gap-1 text-white/90">
              <span className="text-lg font-bold">
                R<AnimatedCounter end={totalPending} />
              </span>
            </div>
          </div>
        </div>

        {/* Approved Card */}
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
            <p className="text-sm font-medium text-white/80 mb-2">Approved Requests</p>
            <div className="text-4xl font-extrabold text-white mb-2">
              <AnimatedCounter end={stats.approved} />
            </div>
            <div className="flex items-center gap-1 text-white/90">
              <span className="text-lg font-bold">
                R<AnimatedCounter end={totalApproved} />
              </span>
            </div>
          </div>
        </div>

        {/* Paid Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-none">
                💰 Paid
              </Badge>
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Paid Out</p>
            <div className="text-4xl font-extrabold text-white mb-2">
              <AnimatedCounter end={stats.paid} />
            </div>
            <div className="flex items-center gap-1 text-white/90">
              <span className="text-lg font-bold">
                R<AnimatedCounter end={totalPaid} />
              </span>
            </div>
          </div>
        </div>

        {/* Active Vendors Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <Users className="h-8 w-8 text-white" />
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-none">
                👥 Active
              </Badge>
            </div>
            <p className="text-sm font-medium text-white/80 mb-2">Active Vendors</p>
            <div className="text-4xl font-extrabold text-white mb-2">
              <AnimatedCounter end={stats.activeVendors} />
            </div>
            <p className="text-sm text-white/80">with payout requests</p>
          </div>
        </div>
      </div>

      {/* Tabs for filtering */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {['all', 'pending', 'approved', 'paid', 'rejected'].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue} className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : filterByStatus(tabValue === 'all' ? undefined : tabValue).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payout Requests</h3>
                  <p className="text-gray-600">No {tabValue !== 'all' ? tabValue : ''} vendor payout requests found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filterByStatus(tabValue === 'all' ? undefined : tabValue).map(request => (
                  <Card key={request.id} className="border-2 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <User className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{request.vendorName}</p>
                            <p className="text-sm text-gray-600">{request.vendorEmail}</p>
                            <p className="text-xs text-gray-500">
                              Requested: {new Date(request.requestedAt.toString()).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {/* Payout Breakdown */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Gross Sales</p>
                          <p className="text-xl font-black">{formatCurrency(request.grossSales)}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-xs text-red-600 mb-1">Your Commission ({request.dispensaryCommissionRate}%)</p>
                          <p className="text-xl font-black text-red-600">
                            -{formatCurrency(request.dispensaryCommission)}
                          </p>
                        </div>
                        <div className="col-span-2 p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-2 border-green-300">
                          <p className="text-xs text-green-700 mb-1 font-semibold">Net Payout to Vendor</p>
                          <p className="text-2xl font-black text-green-700">{formatCurrency(request.netPayout)}</p>
                        </div>
                      </div>

                      {/* Bank Details */}
                      {request.bankDetails && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4 text-sm">
                          <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Bank Details:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Bank:</span> {request.bankDetails.bankName}
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Account Type:</span> {request.bankDetails.accountType}
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Account Holder:</span> {request.bankDetails.accountHolderName}
                            </div>
                            <div>
                              <span className="text-blue-700 dark:text-blue-300">Account Number:</span> {request.bankDetails.accountNumber}
                            </div>
                            <div className="col-span-2">
                              <span className="text-blue-700 dark:text-blue-300">Branch Code:</span> {request.bankDetails.branchCode}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('reject');
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType('markPaid');
                            }}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Mark as Paid
                          </Button>
                        )}
                        {request.status === 'paid' && request.paymentReference && (
                          <Badge variant="outline" className="text-xs">
                            Ref: {request.paymentReference}
                          </Badge>
                        )}
                        {request.status === 'rejected' && request.rejectionReason && (
                          <p className="text-xs text-red-600 italic">Reason: {request.rejectionReason}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Action Dialogs */}
      <Dialog open={actionType === 'approve'} onOpenChange={() => {
        setActionType(null);
        setSelectedRequest(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Vendor Payout</DialogTitle>
            <DialogDescription>
              Approve payout of {selectedRequest && formatCurrency(selectedRequest.netPayout)} to {selectedRequest?.vendorName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={isSubmitting}>
              {isSubmitting ? 'Approving...' : 'Approve Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionType === 'reject'} onOpenChange={() => {
        setActionType(null);
        setSelectedRequest(null);
        setRejectionReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Vendor Payout</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payout request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this payout is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionType(null);
              setRejectionReason('');
            }}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !rejectionReason.trim()}>
              {isSubmitting ? 'Rejecting...' : 'Reject Payout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionType === 'markPaid'} onOpenChange={() => {
        setActionType(null);
        setSelectedRequest(null);
        setPaymentReference('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Confirm payment of {selectedRequest && formatCurrency(selectedRequest.netPayout)} to {selectedRequest?.vendorName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="paymentReference">Payment Reference *</Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g., TXN123456789"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionType(null);
              setPaymentReference('');
            }}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleMarkPaid} disabled={isSubmitting || !paymentReference.trim()}>
              {isSubmitting ? 'Updating...' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
