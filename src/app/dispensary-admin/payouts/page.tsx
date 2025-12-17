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
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-[#3D2E17]">Payouts</h1>
            <p className="text-muted-foreground mt-1">Manage your dispensary earnings and payouts</p>
          </div>
          <DollarSign className="h-14 w-14 text-[#006B3E]" />
        </div>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Available Balance</CardTitle>
            <Wallet className="h-5 w-5 text-[#006B3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">
              {formatCurrency(earnings?.currentBalance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to withdraw
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Pending Balance</CardTitle>
            <Clock className="h-5 w-5 text-[#006B3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">
              {formatCurrency(earnings?.pendingBalance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In processing
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-[#3D2E17]">Total Earned</CardTitle>
            <TrendingUp className="h-5 w-5 text-[#006B3E]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#3D2E17]">
              {formatCurrency(earnings?.totalEarned || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Payout Button */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#3D2E17]">Request Payout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Minimum payout amount: {formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)}
              </p>
              <p className="text-sm text-muted-foreground">
                Available to withdraw: {formatCurrency(earnings?.currentBalance || 0)}
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
              className="bg-[#006B3E] hover:bg-[#005530] text-white font-bold"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#3D2E17]">Payout History</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No payout requests yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {payoutRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <p className="font-semibold text-[#3D2E17]">
                          {formatCurrency(request.requestedAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.createdAt && (request.createdAt as any).toDate
                            ? (request.createdAt as any).toDate().toLocaleDateString('en-ZA', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Date unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getPayoutStatusColor(request.status)}>
                        {getPayoutStatusLabel(request.status)}
                      </Badge>
                      {request.paymentReference && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Ref: {request.paymentReference}
                        </p>
                      )}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#3D2E17]">Request Payout</DialogTitle>
            <DialogDescription>
              Fill in your bank details to request a payout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount */}
            <div>
              <Label htmlFor="amount" className="font-semibold">Amount (R)</Label>
              <Input
                id="amount"
                type="number"
                min={DISPENSARY_MINIMUM_PAYOUT_AMOUNT}
                max={earnings?.currentBalance || 0}
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                placeholder="500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {formatCurrency(earnings?.currentBalance || 0)}
              </p>
            </div>

            {/* Account Holder */}
            <div>
              <Label htmlFor="accountHolder" className="font-semibold">Account Holder Name</Label>
              <Input
                id="accountHolder"
                value={accountDetails.accountHolder}
                onChange={(e) =>
                  setAccountDetails({ ...accountDetails, accountHolder: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>

            {/* Bank Name */}
            <div>
              <Label htmlFor="bankName" className="font-semibold">Bank Name</Label>
              <Input
                id="bankName"
                value={accountDetails.bankName}
                onChange={(e) =>
                  setAccountDetails({ ...accountDetails, bankName: e.target.value })
                }
                placeholder="Standard Bank"
              />
            </div>

            {/* Account Number */}
            <div>
              <Label htmlFor="accountNumber" className="font-semibold">Account Number</Label>
              <Input
                id="accountNumber"
                value={accountDetails.accountNumber}
                onChange={(e) =>
                  setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                }
                placeholder="1234567890"
              />
            </div>

            {/* Account Type */}
            <div>
              <Label htmlFor="accountType" className="font-semibold">Account Type</Label>
              <Select
                value={accountDetails.accountType}
                onValueChange={(value: 'savings' | 'current' | 'cheque') =>
                  setAccountDetails({ ...accountDetails, accountType: value })
                }
              >
                <SelectTrigger>
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
              <Label htmlFor="branchCode" className="font-semibold">Branch Code</Label>
              <Input
                id="branchCode"
                value={accountDetails.branchCode}
                onChange={(e) =>
                  setAccountDetails({ ...accountDetails, branchCode: e.target.value })
                }
                placeholder="250655"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayoutDialog(false)}
              disabled={processingPayout}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayout}
              disabled={processingPayout}
              className="bg-[#006B3E] hover:bg-[#005530] text-white font-bold"
            >
              {processingPayout ? 'Processing...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
