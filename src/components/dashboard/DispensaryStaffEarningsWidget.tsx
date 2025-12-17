"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  DispensaryEarnings,
  DispensaryPayoutRequest,
  BankAccountDetails,
  DISPENSARY_MINIMUM_PAYOUT_AMOUNT,
  canRequestPayout,
  formatCurrency,
  getPayoutStatusColor,
  getPayoutStatusLabel,
} from "@/types/dispensary-earnings";

export default function DispensaryStaffEarningsWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [earnings, setEarnings] = useState<DispensaryEarnings | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<DispensaryPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);
  
  // Payout form state
  const [requestedAmount, setRequestedAmount] = useState(0);
  const [accountDetails, setAccountDetails] = useState<BankAccountDetails>({
    accountHolder: "",
    bankName: "",
    accountNumber: "",
    accountType: "savings",
    branchCode: "",
  });

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch own earnings
      const earningsRef = doc(db, "dispensary_earnings", user.uid);
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
        collection(db, "dispensary_payout_requests"),
        where("userId", "==", user.uid)
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requests = requestsSnap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as DispensaryPayoutRequest)
      );
      setPayoutRequests(requests);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = () => {
    setRequestedAmount(earnings?.currentBalance || 0);
    setShowPayoutDialog(true);
  };

  const handleSubmitPayout = async () => {
    if (!user || !earnings) return;

    try {
      setProcessingPayout(true);

      if (requestedAmount > earnings.currentBalance) {
        toast({
          title: "Invalid Amount",
          description: "Requested amount exceeds available balance",
          variant: "destructive",
        });
        return;
      }

      if (!canRequestPayout(requestedAmount)) {
        toast({
          title: "Minimum Amount Required",
          description: `Minimum payout amount is ${formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)}`,
          variant: "destructive",
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
          userId: user.uid,
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
        title: "Success",
        description: "Payout request submitted successfully",
      });

      setShowPayoutDialog(false);
      fetchEarningsData();
    } catch (error) {
      console.error("Error submitting payout:", error);
      toast({
        title: "Error",
        description: "Failed to submit payout request",
        variant: "destructive",
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading earnings...</div>
        </div>
      </Card>
    );
  }

  if (!earnings) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No earnings data found</p>
        </div>
      </Card>
    );
  }

  const canPayout = canRequestPayout(earnings.currentBalance);

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        {/* Balance Display */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Your Available Balance</p>
          <p className="text-4xl font-bold text-[#006B3E]">
            {formatCurrency(earnings.currentBalance)}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <p className="text-lg font-semibold text-amber-600">
              {formatCurrency(earnings.pendingBalance)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
            <p className="text-lg font-semibold text-green-600">
              {formatCurrency(earnings.totalEarned)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Withdrawn</p>
            </div>
            <p className="text-lg font-semibold text-blue-600">
              {formatCurrency(earnings.totalWithdrawn)}
            </p>
          </div>
        </div>

        {/* Request Payout Button */}
        <Button
          onClick={handleRequestPayout}
          disabled={!canPayout}
          className="w-full bg-[#006B3E] hover:bg-[#005a33]"
          size="lg"
        >
          <DollarSign className="h-5 w-5 mr-2" />
          {canPayout
            ? `Request Payout (${formatCurrency(earnings.currentBalance)})`
            : `Minimum ${formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)} Required`}
        </Button>

        {!canPayout && (
          <div className="mt-3 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              You need at least {formatCurrency(DISPENSARY_MINIMUM_PAYOUT_AMOUNT)} to request a payout.
              Current balance: {formatCurrency(earnings.currentBalance)}
            </p>
          </div>
        )}
      </Card>

      {/* Recent Payout Requests */}
      {payoutRequests.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold text-[#3D2E17] mb-4">Recent Payout Requests</h3>
          <div className="space-y-3">
            {payoutRequests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{formatCurrency(request.requestedAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.createdAt as any).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge className={getPayoutStatusColor(request.status)}>
                  {getPayoutStatusLabel(request.status)}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Enter your bank details to request a payout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount */}
            <div>
              <Label htmlFor="amount">Payout Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(parseFloat(e.target.value) || 0)}
                className="font-bold text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {formatCurrency(earnings.currentBalance)}
              </p>
            </div>

            {/* Bank Account Details */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm">Bank Account Details</h4>
              
              <div>
                <Label htmlFor="accountHolder">Account Holder Name</Label>
                <Input
                  id="accountHolder"
                  value={accountDetails.accountHolder}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, accountHolder: e.target.value })
                  }
                  placeholder="Full name as per bank account"
                />
              </div>

              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={accountDetails.bankName}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, bankName: e.target.value })
                  }
                  placeholder="e.g., FNB, Standard Bank, ABSA"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={accountDetails.accountNumber}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                    }
                    placeholder="12 digits"
                  />
                </div>

                <div>
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select
                    value={accountDetails.accountType}
                    onValueChange={(value: 'savings' | 'current') =>
                      setAccountDetails({ ...accountDetails, accountType: value })
                    }
                  >
                    <SelectTrigger id="accountType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="branchCode">Branch Code</Label>
                <Input
                  id="branchCode"
                  value={accountDetails.branchCode}
                  onChange={(e) =>
                    setAccountDetails({ ...accountDetails, branchCode: e.target.value })
                  }
                  placeholder="6 digits"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitPayout}
              disabled={processingPayout}
              className="bg-[#006B3E] hover:bg-[#005a33]"
            >
              {processingPayout ? "Processing..." : "Submit Payout Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
