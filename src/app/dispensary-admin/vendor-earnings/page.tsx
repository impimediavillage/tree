'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { VendorPayoutRequestForm } from '@/components/vendor/VendorPayoutRequestForm';
import type { VendorPayoutRequest, VendorEarnings } from '@/types/vendor-earnings';
import { formatCurrency, calculateVendorPayout, VENDOR_MINIMUM_PAYOUT_AMOUNT } from '@/types/vendor-earnings';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function VendorEarningsPage() {
  const { currentUser, isVendor } = useAuth();
  const [earnings, setEarnings] = useState<VendorEarnings | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<VendorPayoutRequest[]>([]);
  const [dispensaryPaidStatus, setDispensaryPaidStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutForm, setShowPayoutForm] = useState(false);

  // Check if dispensary has been paid by platform
  useEffect(() => {
    const checkDispensaryPayment = async () => {
      if (!currentUser?.dispensaryId) return;

      try {
        // Check if dispensary has any approved/completed payouts from platform
        const dispensaryPayoutsRef = collection(db, 'dispensary_payout_requests');
        const q = query(
          dispensaryPayoutsRef,
          where('dispensaryId', '==', currentUser.dispensaryId),
          where('status', 'in', ['approved', 'completed']),
          orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        setDispensaryPaidStatus(!snapshot.empty);
      } catch (error) {
        console.error('Error checking dispensary payment status:', error);
        setDispensaryPaidStatus(false);
      }
    };

    checkDispensaryPayment();
  }, [currentUser]);

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!currentUser?.uid || !currentUser?.dispensaryId) return;

      setIsLoading(true);
      try {
        // Fetch vendor earnings
        const earningsDoc = await getDoc(doc(db, 'vendor_earnings', currentUser.uid));
        if (earningsDoc.exists()) {
          setEarnings(earningsDoc.data() as VendorEarnings);
        }

        // Fetch payout requests
        const payoutsRef = collection(db, 'vendor_payout_requests');
        const q = query(
          payoutsRef,
          where('vendorId', '==', currentUser.uid),
          orderBy('requestedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VendorPayoutRequest[];

        setPayoutRequests(requests);
      } catch (error) {
        console.error('Error fetching vendor earnings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarnings();
  }, [currentUser]);

  // Redirect non-vendors
  if (!isVendor) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            This page is only accessible to Vendor crew members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const canRequestPayout = earnings && earnings.currentBalance >= VENDOR_MINIMUM_PAYOUT_AMOUNT && dispensaryPaidStatus;

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

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-8 w-8 text-purple-600" />
          My Vendor Earnings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your sales and manage payout requests
        </p>
      </div>

      {/* Dispensary Payment Warning */}
      {!dispensaryPaidStatus && (
        <Alert className="border-orange-300 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>Payout requests are currently disabled.</strong> You can only request payouts after the dispensary has received payment from the platform.
          </AlertDescription>
        </Alert>
      )}

      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-black text-green-700">
                  {formatCurrency(earnings?.currentBalance || 0)}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Commission Rate: {currentUser?.dispensaryCommissionRate || 0}%
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Payouts */}
        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-black text-yellow-700">
                  {formatCurrency(earnings?.pendingBalance || 0)}
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  In {payoutRequests.filter(r => r.status === 'pending' || r.status === 'approved').length} request(s)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Total Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-black text-blue-700">
                  {formatCurrency(earnings?.paidBalance || 0)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  From {earnings?.totalPayouts || 0} payout(s)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Info Card */}
      {earnings && currentUser?.dispensaryCommissionRate && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Your Commission Structure
            </CardTitle>
            <CardDescription>
              Understanding what you receive from your sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="text-sm font-semibold">Dispensary Commission:</span>
                <span className="text-lg font-black text-red-600">{currentUser.dispensaryCommissionRate}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="text-sm font-semibold">You Receive:</span>
                <span className="text-lg font-black text-green-600">
                  {currentUser.dispensaryCommissionRate > 100 ? 0 : 100 - currentUser.dispensaryCommissionRate}%
                </span>
              </div>

              {/* Example */}
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-xs font-bold text-blue-900 mb-2">💡 Example Calculation:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Your Sale:</span>
                    <span className="font-bold">R1,000</span>
                  </div>
                  <div className="flex justify-between text-red-700">
                    <span>Dispensary Commission ({currentUser.dispensaryCommissionRate}%):</span>
                    <span className="font-bold">-R{((1000 * currentUser.dispensaryCommissionRate) / 100).toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-blue-300 my-1"></div>
                  <div className="flex justify-between text-green-700 font-bold">
                    <span>You Receive:</span>
                    <span>R{(1000 - ((1000 * currentUser.dispensaryCommissionRate) / 100)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="request" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request">Request Payout</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>

        {/* Request Payout Tab */}
        <TabsContent value="request" className="space-y-4">
          {canRequestPayout && currentUser ? (
            <VendorPayoutRequestForm
              vendorId={currentUser.uid}
              vendorName={currentUser.displayName || currentUser.name || 'Vendor'}
              vendorEmail={currentUser.email || ''}
              dispensaryId={currentUser.dispensaryId!}
              dispensaryCommissionRate={currentUser.dispensaryCommissionRate || 10}
              currentBalance={earnings.currentBalance}
              onSuccess={() => {
                setShowPayoutForm(false);
                // Refresh data
                window.location.reload();
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Wallet className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Cannot Request Payout</h3>
                <p className="text-gray-600 mb-4">
                  {!dispensaryPaidStatus
                    ? 'Payouts are disabled until the dispensary receives payment from the platform.'
                    : earnings && earnings.currentBalance < VENDOR_MINIMUM_PAYOUT_AMOUNT
                    ? `Minimum payout amount is ${formatCurrency(VENDOR_MINIMUM_PAYOUT_AMOUNT)}. Your current balance: ${formatCurrency(earnings.currentBalance)}`
                    : 'No earnings available for payout.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payout History Tab */}
        <TabsContent value="history" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : payoutRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Payout Requests</h3>
                <p className="text-gray-600">You haven't requested any payouts yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payoutRequests.map(request => {
                const breakdown = calculateVendorPayout(request.grossSales, request.dispensaryCommissionRate);
                return (
                  <Card key={request.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs text-gray-600">
                            {new Date(request.requestedAt.toString()).toLocaleDateString()}
                          </p>
                          <p className="text-2xl font-black text-green-600 mt-1">
                            {formatCurrency(request.netPayout)}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>

                      {/* Breakdown */}
                      <div className="space-y-1 text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Gross Sales:</span>
                          <span className="font-semibold">{formatCurrency(request.grossSales)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Commission ({request.dispensaryCommissionRate}%):</span>
                          <span className="font-semibold">-{formatCurrency(request.dispensaryCommission)}</span>
                        </div>
                        <div className="h-px bg-gray-300 my-1"></div>
                        <div className="flex justify-between font-bold">
                          <span>Net Payout:</span>
                          <span className="text-green-600">{formatCurrency(request.netPayout)}</span>
                        </div>
                      </div>

                      {/* Status Messages */}
                      {request.status === 'approved' && (
                        <p className="text-xs text-blue-600 mt-2">
                          ✓ Approved by {request.approverName || 'dispensary admin'}
                        </p>
                      )}
                      {request.status === 'rejected' && request.rejectionReason && (
                        <p className="text-xs text-red-600 mt-2">
                          ✗ Rejected: {request.rejectionReason}
                        </p>
                      )}
                      {request.status === 'paid' && request.paymentReference && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ Paid - Reference: {request.paymentReference}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
