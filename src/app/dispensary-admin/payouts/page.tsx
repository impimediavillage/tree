'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import {
  DispensaryEarnings,
  DispensaryPayoutRequest,
  BankAccountDetails,
  DISPENSARY_MINIMUM_PAYOUT_AMOUNT,
  canRequestPayout,
  formatCurrency,
  getPayoutStatusColor,
  getPayoutStatusLabel,
} from '@/types/dispensary-earnings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export default function PayoutsPage() {
  const { currentUser, isDispensaryOwner } = useAuth();
  const { toast } = useToast();
  
  const [earnings, setEarnings] = useState<DispensaryEarnings | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<DispensaryPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  
  // Payout form state
  const [requestedAmount, setRequestedAmount] = useState(0);
  const [accountDetails, setAccountDetails] = useState<BankAccountDetails>({
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    accountType: 'savings',
    branchCode: '',
  });

  useEffect(() => {
    if (currentUser) {
      fetchEarningsData();
    }
  }, [currentUser]);

  const fetchEarningsData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Fetch own earnings
      const earningsRef = doc(db, 'dispensary_earnings', currentUser.uid);
      const earningsSnap = await getDoc(earningsRef);

      if (earningsSnap.exists()) {
        const earningsData = earningsSnap.data() as DispensaryEarnings;
        setEarnings(earningsData);

        // Pre-fill account details if available
        if (earningsData.accountDetails) {
          setAccountDetails(earningsData.accountDetails);
        }
      }

      // Fetch payout requests
      const requestsQuery = query(
        collection(db, 'dispensary_payout_requests'),
        where('userId', '==', currentUser.uid)
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requests = requestsSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as DispensaryPayoutRequest)
      );
      
      // Sort by creation date (newest first)
      requests.sort((a, b) => {
        const aDate = a.createdAt as any;
        const bDate = b.createdAt as any;
        return bDate?.toMillis?.() - aDate?.toMillis?.();
      });
      
      setPayoutRequests(requests);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load earnings data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayout = async () => {
    if (!earnings || !currentUser) return;

    try {
      setProcessingPayout(true);

      // Validate minimum amount
      if (!canRequestPayout(requestedAmount)) {
        toast({
          title: 'Minimum Amount Required',
          description: `Minimum payout amount is ${formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)}`,
          variant: 'destructive',
        });
        return;
      }

      // Validate balance
      if (requestedAmount > earnings.currentBalance) {
        toast({
          title: 'Insufficient Balance',
          description: `You only have ${formatCurrency(earnings.currentBalance)} available`,
          variant: 'destructive',
        });
        return;
      }

      // Validate account details
      if (
        !accountDetails.accountHolder ||
        !accountDetails.bankName ||
        !accountDetails.accountNumber ||
        !accountDetails.branchCode
      ) {
        toast({
          title: 'Incomplete Details',
          description: 'Please fill in all bank account details',
          variant: 'destructive',
        });
        return;
      }

      // Call Cloud Function to create payout request
      const response = await fetch('/api/create-dispensary-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          dispensaryId: earnings.dispensaryId,
          requestedAmount,
          accountDetails,
          payoutType: 'individual',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payout request');
      }

      toast({
        title: 'Success',
        description: 'Payout request submitted successfully',
      });

      setShowPayoutDialog(false);
      setRequestedAmount(0);
      fetchEarningsData();
    } catch (error) {
      console.error('Error submitting payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit payout request',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
      case 'approved':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden p-8 bg-gradient-to-r from-[#006B3E] via-[#3D2E17] to-[#006B3E] border-4 border-[#006B3E]/30 rounded-2xl shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -ml-24 -mb-24"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black text-white drop-shadow-lg tracking-tight">💰 Payouts</h1>
            <p className="text-white/90 mt-2 text-lg font-semibold">Manage your dispensary earnings and withdrawals</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-lg rounded-2xl border-2 border-white/30">
              <Wallet className="h-16 w-16 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Summary Cards - Gamestyle Design */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Available Balance - Green Theme */}
        <Card className="relative overflow-hidden border-4 border-green-500/30 bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-green-950 dark:via-gray-950 dark:to-green-950 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-black text-green-900 dark:text-green-100 uppercase tracking-wider">Available Balance</CardTitle>
            <div className="p-3 bg-green-500/20 rounded-xl backdrop-blur-sm border-2 border-green-500/30">
              <Wallet className="h-6 w-6 text-green-700 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-black text-green-700 dark:text-green-300 mb-2">
              {formatCurrency(earnings?.currentBalance || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                  style={{ width: `${Math.min((earnings?.currentBalance || 0) / DISPENSARY_MINIMUM_PAYOUT_AMOUNT * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400 mt-2 font-bold flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        {/* Pending Balance - Amber Theme */}
        <Card className="relative overflow-hidden border-4 border-amber-500/30 bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-amber-950 dark:via-gray-950 dark:to-amber-950 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-wider">Pending Balance</CardTitle>
            <div className="p-3 bg-amber-500/20 rounded-xl backdrop-blur-sm border-2 border-amber-500/30">
              <Clock className="h-6 w-6 text-amber-700 dark:text-amber-400 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-black text-amber-700 dark:text-amber-300 mb-2">
              {formatCurrency(earnings?.pendingBalance || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-bold flex items-center gap-1">
              <AlertCircle className="h-3 w-3 animate-pulse" />
              In processing
            </p>
          </CardContent>
        </Card>

        {/* Total Earned - Blue Theme */}
        <Card className="relative overflow-hidden border-4 border-blue-500/30 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950 dark:via-gray-950 dark:to-blue-950 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase tracking-wider">Total Earned</CardTitle>
            <div className="p-3 bg-blue-500/20 rounded-xl backdrop-blur-sm border-2 border-blue-500/30">
              <TrendingUp className="h-6 w-6 text-blue-700 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-4xl font-black text-blue-700 dark:text-blue-300 mb-2">
              {formatCurrency(earnings?.totalEarned || 0)}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 rounded-full"></div>
              </div>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-2 font-bold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              All time earnings (75% of sales)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown Info Card */}
      <Card className="border-4 border-[#006B3E]/30 bg-gradient-to-br from-[#006B3E]/5 via-white to-[#3D2E17]/5 dark:from-[#006B3E]/10 dark:via-gray-950 dark:to-[#3D2E17]/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-black text-[#3D2E17] dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-[#006B3E]" />
            How Your Earnings Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border-2 border-green-500/30">
              <div className="text-3xl font-black text-green-700 dark:text-green-400 mb-1">75%</div>
              <div className="text-sm font-bold text-green-900 dark:text-green-300">Your Share</div>
              <div className="text-xs text-green-700 dark:text-green-400 mt-1">Base product price goes to you</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border-2 border-red-500/30">
              <div className="text-3xl font-black text-red-700 dark:text-red-400 mb-1">25%</div>
              <div className="text-sm font-bold text-red-900 dark:text-red-300">Platform Fee</div>
              <div className="text-xs text-red-700 dark:text-red-400 mt-1">Commission for platform services</div>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border-2 border-blue-500/30">
              <div className="text-3xl font-black text-blue-700 dark:text-blue-400 mb-1">VAT</div>
              <div className="text-sm font-bold text-blue-900 dark:text-blue-300">Separate</div>
              <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">Tax collected separately</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Payout Button */}
      <Card className="border-4 border-[#006B3E]/30 bg-gradient-to-br from-white via-green-50/50 to-white dark:from-gray-950 dark:via-green-950/20 dark:to-gray-950 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-[#3D2E17] dark:text-white flex items-center gap-2">
            <Wallet className="h-7 w-7 text-[#006B3E]" />
            Request Payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Minimum payout: <span className="text-[#006B3E] font-black">{formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)}</span>
              </p>
              <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Available: <span className="text-green-700 dark:text-green-400 font-black text-lg">{formatCurrency(earnings?.currentBalance || 0)}</span>
              </p>
            </div>
            <Button
              onClick={() => {
                if (earnings && earnings.currentBalance >= DISPENSARY_MINIMUM_PAYOUT_AMOUNT) {
                  setRequestedAmount(earnings.currentBalance);
                  setShowPayoutDialog(true);
                } else {
                  toast({
                    title: 'Insufficient Balance',
                    description: `Minimum payout amount is ${formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)}`,
                    variant: 'destructive',
                  });
                }
              }}
              disabled={!earnings || earnings.currentBalance < DISPENSARY_MINIMUM_PAYOUT_AMOUNT}
              className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] hover:from-[#005530] hover:to-[#2A1F10] text-white font-black text-lg px-8 py-6 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white/20"
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Request Payout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="border-4 border-[#3D2E17]/30 bg-gradient-to-br from-white via-amber-50/30 to-white dark:from-gray-950 dark:via-amber-950/10 dark:to-gray-950 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-[#3D2E17] dark:text-white flex items-center gap-2">
            <Clock className="h-7 w-7 text-[#006B3E]" />
            Payout History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payoutRequests.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/30">
              <div className="p-4 bg-white dark:bg-gray-900 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center border-4 border-muted">
                <DollarSign className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-semibold text-lg">No payout requests yet</p>
              <p className="text-muted-foreground/70 text-sm mt-2">Your payout history will appear here</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {payoutRequests.map((request, index) => (
                  <div
                    key={request.id}
                    className={`relative overflow-hidden p-5 border-4 rounded-xl hover:scale-102 transition-all duration-300 shadow-lg hover:shadow-xl
                      ${request.status === 'completed' ? 'border-green-500/30 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-gray-950' : 
                        request.status === 'failed' || request.status === 'rejected' ? 'border-red-500/30 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-950' :
                        request.status === 'processing' || request.status === 'approved' ? 'border-blue-500/30 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-gray-950' :
                        'border-amber-500/30 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-950'}`}
                  >
                    <div className="absolute top-0 left-0 w-24 h-24 opacity-10 blur-2xl
                      ${request.status === 'completed' ? 'bg-green-500' : 
                        request.status === 'failed' || request.status === 'rejected' ? 'bg-red-500' :
                        request.status === 'processing' || request.status === 'approved' ? 'bg-blue-500' :
                        'bg-amber-500'}">
                    </div>
                    <div className="flex items-center justify-between relative">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl backdrop-blur-sm border-2
                          ${request.status === 'completed' ? 'bg-green-500/20 border-green-500/30' : 
                            request.status === 'failed' || request.status === 'rejected' ? 'bg-red-500/20 border-red-500/30' :
                            request.status === 'processing' || request.status === 'approved' ? 'bg-blue-500/20 border-blue-500/30' :
                            'bg-amber-500/20 border-amber-500/30'}`}>
                          {getStatusIcon(request.status)}
                        </div>
                        <div>
                          <p className="font-black text-2xl text-[#3D2E17] dark:text-white mb-1">
                            {formatCurrency(request.requestedAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {request.createdAt && (request.createdAt as any).toDate
                              ? (request.createdAt as any).toDate().toLocaleDateString('en-ZA', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Date unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getPayoutStatusColor(request.status)} font-black text-sm px-4 py-2 shadow-lg`}>
                          {getPayoutStatusLabel(request.status)}
                        </Badge>
                        {request.paymentReference && (
                          <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 px-2 py-1 rounded">
                            Ref: {request.paymentReference}
                          </p>
                        )}
                        {request.rejectionReason && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
                            {request.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-2xl border-4 border-[#006B3E]/30 bg-gradient-to-br from-white via-green-50/30 to-white dark:from-gray-950 dark:via-green-950/10 dark:to-gray-950">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black text-[#3D2E17] dark:text-white flex items-center gap-2">
              <div className="p-2 bg-[#006B3E]/20 rounded-lg">
                <Wallet className="h-8 w-8 text-[#006B3E]" />
              </div>
              Request Payout
            </DialogTitle>
            <DialogDescription className="text-base font-semibold">
              Fill in your bank details to request a payout. Funds typically arrive within 2-3 business days.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-5">
              {/* Amount with Visual Indicator */}
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border-2 border-green-500/30">
                <Label htmlFor="amount" className="font-black text-[#3D2E17] dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#006B3E]" />
                  Amount (R)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min={DISPENSARY_MINIMUM_PAYOUT_AMOUNT}
                  max={earnings?.currentBalance || 0}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  placeholder="500"
                  className="mt-2 text-2xl font-black border-2 border-green-500/30 focus:border-green-500"
                />
                <div className="flex items-center justify-between mt-2 text-xs font-semibold">
                  <span className="text-muted-foreground">Min: {formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)}</span>
                  <span className="text-green-700 dark:text-green-400">Available: {formatCurrency(earnings?.currentBalance || 0)}</span>
                </div>
                <div className="mt-2 h-2 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                    style={{ width: `${Math.min((requestedAmount / (earnings?.currentBalance || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border-2 border-blue-500/30 space-y-4">
                <h3 className="font-black text-[#3D2E17] dark:text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  Bank Account Details
                </h3>

                {/* Account Holder */}
                <div>
                  <Label htmlFor="accountHolder" className="font-bold text-sm">Account Holder Name</Label>
                  <Input
                    id="accountHolder"
                    value={accountDetails.accountHolder}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountHolder: e.target.value })
                    }
                    placeholder="John Doe"
                    className="mt-1 border-2 border-blue-500/30 focus:border-blue-500"
                  />
                </div>

                {/* Bank Name */}
                <div>
                  <Label htmlFor="bankName" className="font-bold text-sm">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={accountDetails.bankName}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, bankName: e.target.value })
                    }
                    placeholder="Standard Bank, FNB, ABSA, etc."
                    className="mt-1 border-2 border-blue-500/30 focus:border-blue-500"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <Label htmlFor="accountNumber" className="font-bold text-sm">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={accountDetails.accountNumber}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                    }
                    placeholder="1234567890"
                    className="mt-1 font-mono border-2 border-blue-500/30 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Account Type */}
                  <div>
                    <Label htmlFor="accountType" className="font-bold text-sm">Account Type</Label>
                    <Select
                      value={accountDetails.accountType}
                      onValueChange={(value: 'savings' | 'current' | 'cheque') =>
                        setAccountDetails({ ...accountDetails, accountType: value })
                      }
                    >
                      <SelectTrigger className="mt-1 border-2 border-blue-500/30 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Code */}
                  <div>
                    <Label htmlFor="branchCode" className="font-bold text-sm">Branch Code</Label>
                    <Input
                      id="branchCode"
                      value={accountDetails.branchCode}
                      onChange={(e) =>
                        setAccountDetails({ ...accountDetails, branchCode: e.target.value })
                      }
                      placeholder="250655"
                      className="mt-1 font-mono border-2 border-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    <p className="font-black mb-1">Security Notice</p>
                    <p>Please ensure your bank details are correct. Payouts cannot be reversed once processed. Funds typically arrive within 2-3 business days.</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPayoutDialog(false)}
              disabled={processingPayout}
              className="font-bold border-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayout}
              disabled={processingPayout}
              className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] hover:from-[#005530] hover:to-[#2A1F10] text-white font-black px-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/20"
            >
              {processingPayout ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
