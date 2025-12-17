"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle,
  ArrowRight,
  Info,
  AlertCircle,
  Calendar,
  History,
} from "lucide-react";
import { CreatorEarnings, PayoutRequest, MINIMUM_PAYOUT_AMOUNT, canRequestPayout } from "@/types/creator-earnings";
import { format } from "date-fns";

interface CreatorEarningsWidgetProps {
  userId: string;
  userName?: string;
}

export default function CreatorEarningsWidget({ userId, userName }: CreatorEarningsWidgetProps) {
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [recentPayouts, setRecentPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Payout request form
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchEarningsData();
  }, [userId]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);

      // Fetch creator earnings
      const earningsRef = doc(db, "creator_earnings", userId);
      const earningsSnap = await getDoc(earningsRef);

      if (earningsSnap.exists()) {
        const earningsData = earningsSnap.data() as CreatorEarnings;
        setEarnings(earningsData);

        // Pre-fill bank details if they exist
        if (earningsData.accountDetails) {
          setBankName(earningsData.accountDetails.bankName || "");
          setAccountNumber(earningsData.accountDetails.accountNumber || "");
          setAccountType(earningsData.accountDetails.accountType || "");
          setBranchCode(earningsData.accountDetails.branchCode || "");
          setAccountHolderName(earningsData.accountDetails.accountHolderName || "");
        }
      } else {
        // Initialize earnings document
        const initialEarnings: CreatorEarnings = {
          creatorId: userId,
          currentBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        };
        setEarnings(initialEarnings);
      }

      // Fetch recent payout requests
      const payoutsQuery = query(
        collection(db, "payout_requests"),
        where("creatorId", "==", userId)
      );
      const payoutsSnap = await getDocs(payoutsQuery);
      const payoutsData = payoutsSnap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as PayoutRequest))
        .sort((a, b) => {
          const dateA = a.requestDate instanceof Timestamp ? a.requestDate.toDate() : new Date(a.requestDate);
          const dateB = b.requestDate instanceof Timestamp ? b.requestDate.toDate() : new Date(b.requestDate);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      setRecentPayouts(payoutsData);
    } catch (error) {
      console.error("Error fetching earnings data:", error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!earnings) return;

    // Validate form
    if (!bankName || !accountNumber || !accountType || !branchCode || !accountHolderName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bank details",
        variant: "destructive",
      });
      return;
    }

    // Validate minimum payout
    if (!canRequestPayout(earnings.currentBalance)) {
      toast({
        title: "Insufficient Balance",
        description: `Minimum payout amount is R${MINIMUM_PAYOUT_AMOUNT}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payoutRequest: Omit<PayoutRequest, "id"> = {
        creatorId: userId,
        creatorName: userName || "Creator",
        requestedAmount: earnings.currentBalance,
        status: "pending",
        requestDate: Timestamp.now(),
        accountDetails: {
          bankName,
          accountNumber,
          accountType,
          branchCode,
          accountHolderName,
        },
        paymentMethod: "bank_transfer",
        creatorNotes: notes,
      };

      // Create payout request
      await addDoc(collection(db, "payout_requests"), payoutRequest);

      // Update creator earnings to move balance to pending
      const earningsRef = doc(db, "creator_earnings", userId);
      await getDoc(earningsRef).then(async (snap) => {
        if (snap.exists()) {
          const currentData = snap.data();
          await import("firebase/firestore").then(({ updateDoc }) => {
            return updateDoc(earningsRef, {
              currentBalance: 0,
              pendingBalance: (currentData.pendingBalance || 0) + earnings.currentBalance,
              accountDetails: {
                bankName,
                accountNumber,
                accountType,
                branchCode,
                accountHolderName,
              },
            });
          });
        }
      });

      toast({
        title: "Payout Requested!",
        description: `Your payout request for R${earnings.currentBalance.toFixed(2)} has been submitted`,
      });

      setRequestDialogOpen(false);
      setNotes("");
      fetchEarningsData();
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast({
        title: "Error",
        description: "Failed to submit payout request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: "Pending", color: "bg-yellow-100 text-yellow-700", icon: Clock },
      approved: { label: "Approved", color: "bg-blue-100 text-blue-700", icon: CheckCircle },
      rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: AlertCircle },
      processing: { label: "Processing", color: "bg-purple-100 text-purple-700", icon: TrendingUp },
      completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
      failed: { label: "Failed", color: "bg-red-100 text-red-700", icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
      return format(dateObj, "dd MMM yyyy");
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading earnings...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!earnings) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No earnings data available</p>
        </div>
      </Card>
    );
  }

  const canRequest = canRequestPayout(earnings.currentBalance);

  return (
    <>
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#3D2E17] flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#006B3E]" />
                Creator Earnings
              </h3>
              <p className="text-sm text-muted-foreground">Track your Treehouse earnings</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryDialogOpen(true)}
              className="text-[#006B3E]"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>

          {/* Main Balance */}
          <div className="text-center py-6 border-2 border-[#006B3E]/20 rounded-lg bg-white/50 dark:bg-black/10">
            <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
            <p className="text-5xl font-bold text-[#006B3E] mb-1">
              R{earnings.currentBalance.toFixed(2)}
            </p>
            {!canRequest && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-2">
                <Info className="h-3 w-3" />
                Minimum payout: R{MINIMUM_PAYOUT_AMOUNT}
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-white/50 dark:bg-black/10 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-lg font-bold text-[#3D2E17]">
                R{earnings.pendingBalance.toFixed(2)}
              </p>
            </div>

            <div className="text-center p-3 bg-white/50 dark:bg-black/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-[#006B3E] mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
              <p className="text-lg font-bold text-[#3D2E17]">
                R{earnings.totalEarned.toFixed(2)}
              </p>
            </div>

            <div className="text-center p-3 bg-white/50 dark:bg-black/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Withdrawn</p>
              <p className="text-lg font-bold text-[#3D2E17]">
                R{earnings.totalWithdrawn.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Last Payout Info */}
          {earnings.lastPayoutDate && (
            <div className="flex items-center justify-between text-sm p-3 bg-green-100 dark:bg-green-950/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Last payout:</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#006B3E]">
                  R{earnings.lastPayoutAmount?.toFixed(2) || "0.00"}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(earnings.lastPayoutDate)}</p>
              </div>
            </div>
          )}

          {/* Request Payout Button */}
          <Button
            onClick={() => setRequestDialogOpen(true)}
            disabled={!canRequest}
            className="w-full bg-[#006B3E] hover:bg-[#005a33] h-12 text-base font-semibold"
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Request Payout
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>

          {!canRequest && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                You need a minimum balance of R{MINIMUM_PAYOUT_AMOUNT} to request a payout. Keep creating
                and selling to reach the threshold!
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Request Payout Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#006B3E]" />
              Request Payout
            </DialogTitle>
            <DialogDescription>
              Enter your bank details to receive your earnings. Amount: R{earnings.currentBalance.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Payout Amount</p>
              <p className="text-3xl font-bold text-[#006B3E]">
                R{earnings.currentBalance.toFixed(2)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., FNB, Standard Bank"
                />
              </div>

              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger id="accountType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="current">Current/Cheque</SelectItem>
                    <SelectItem value="transmission">Transmission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account number"
                />
              </div>

              <div>
                <Label htmlFor="branchCode">Branch Code *</Label>
                <Input
                  id="branchCode"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="6-digit code"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accountHolderName">Account Holder Name *</Label>
              <Input
                id="accountHolderName"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Full name as per bank account"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Please ensure your bank details are correct. Payouts are processed within 3-5 business days.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={submitting}
              className="bg-[#006B3E] hover:bg-[#005a33]"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-[#006B3E]" />
              Payout History
            </DialogTitle>
            <DialogDescription>Your recent payout requests and their status</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentPayouts.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No payout requests yet</p>
              </div>
            ) : (
              recentPayouts.map((payout) => (
                <Card key={payout.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[#3D2E17] text-lg">
                        R{payout.requestedAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested on {formatDate(payout.requestDate)}
                      </p>
                    </div>
                    {getStatusBadge(payout.status)}
                  </div>

                  {payout.status === "completed" && payout.completedDate && (
                    <div className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        Completed on {formatDate(payout.completedDate)}
                      </span>
                    </div>
                  )}

                  {payout.status === "rejected" && payout.rejectionReason && (
                    <div className="flex items-start gap-2 text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 mb-1">Rejected</p>
                        <p className="text-muted-foreground">{payout.rejectionReason}</p>
                      </div>
                    </div>
                  )}

                  {payout.paymentReference && (
                    <div className="mt-2 text-xs">
                      <span className="text-muted-foreground">Reference: </span>
                      <span className="font-mono">{payout.paymentReference}</span>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
