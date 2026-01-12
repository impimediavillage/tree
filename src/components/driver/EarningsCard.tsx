"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Star,
} from 'lucide-react';
import { createPayoutRequest } from '@/lib/driver-service';
import type { DriverProfile, DriverDashboardStats } from '@/types/driver';
import { format } from 'date-fns';

interface EarningsCardProps {
  driverProfile: DriverProfile;
  stats: DriverDashboardStats | null;
  onPayoutRequest: () => void;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchCode: string;
}

export default function EarningsCard({
  driverProfile,
  stats,
  onPayoutRequest,
}: EarningsCardProps) {
  const { toast } = useToast();
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: '',
    accountNumber: '',
    accountHolderName: driverProfile.displayName || '',
    branchCode: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWednesday = new Date().getDay() === 3;
  const availableEarnings = driverProfile.availableEarnings || 0;
  const pendingPayouts = driverProfile.pendingPayouts || 0;
  const totalEarnings = stats?.allTime.earnings || 0;

  const handleRequestPayout = async () => {
    if (!isWednesday) {
      toast({
        title: "❌ Not Wednesday",
        description: "Payout requests can only be made on Wednesdays",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(payoutAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "❌ Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > availableEarnings) {
      toast({
        title: "❌ Insufficient Balance",
        description: `You only have R${availableEarnings.toFixed(2)} available`,
        variant: "destructive",
      });
      return;
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountHolderName || !bankDetails.branchCode) {
      toast({
        title: "❌ Missing Bank Details",
        description: "Please fill in all bank details",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createPayoutRequest(
        driverProfile.userId,
        driverProfile.displayName || driverProfile.phoneNumber || 'Driver',
        driverProfile.dispensaryId,
        amount,
        [], // deliveryIds - we'll track this in the service
        bankDetails
      );

      toast({
        title: "✅ Payout Requested!",
        description: `R${amount.toFixed(2)} payout request submitted`,
      });

      setShowPayoutDialog(false);
      setPayoutAmount('');
      setBankDetails({
        bankName: '',
        accountNumber: '',
        accountHolderName: driverProfile.displayName || '',
        branchCode: '',
      });
      onPayoutRequest(); // Refresh dashboard data
    } catch (error: any) {
      console.error('Error requesting payout:', error);
      toast({
        title: "❌ Request Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Earnings Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Total Earnings</span>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">R{totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Available</span>
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">R{availableEarnings.toFixed(2)}</div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">Ready to withdraw</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending</span>
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-600">R{pendingPayouts.toFixed(2)}</div>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">In process</p>
            </CardContent>
          </Card>
        </div>

        {/* Request Payout Button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Request Payout
            </CardTitle>
            <CardDescription>
              {isWednesday 
                ? "Today is Wednesday! You can request a payout."
                : "Payout requests are only available on Wednesdays"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!isWednesday && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900">
                  <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-100">Wednesday Only</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Payout requests can only be submitted on Wednesdays. Come back next Wednesday to request your earnings!
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowPayoutDialog(true)}
                disabled={!isWednesday || availableEarnings <= 0}
                size="lg"
                className="w-full"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Request Payout (R{availableEarnings.toFixed(2)} Available)
              </Button>

              {availableEarnings <= 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  You need to complete deliveries to have earnings available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        {stats && stats.today.deliveries > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Today's Deliveries</CardTitle>
              <CardDescription>
                {stats.today.deliveries} {stats.today.deliveries === 1 ? 'delivery' : 'deliveries'} completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Earnings</span>
                  <span className="font-bold text-green-600">R{stats.today.earnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <span className="font-medium flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {stats.today.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payout History */}
        {driverProfile.payoutHistory && driverProfile.payoutHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your recent payout requests</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverProfile.payoutHistory.map((payout: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(payout.requestedAt.toDate(), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">R{payout.amount.toFixed(2)}</TableCell>
                      <TableCell>{getPayoutStatusBadge(payout.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payout.paymentReference || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Weekly Summary */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>This Week's Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Deliveries</p>
                  <p className="text-2xl font-bold">{stats.week.deliveries}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Earnings</p>
                  <p className="text-2xl font-bold text-green-600">R{stats.week.earnings.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Rating</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    {stats.week.averageRating.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">On-Time</p>
                  <p className="text-2xl font-bold">{stats.week.onTimeRate.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payout Request Dialog */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Enter the amount and your bank details to request a payout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payout Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="pl-9"
                  step="0.01"
                  min="0"
                  max={availableEarnings}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Max: R{availableEarnings.toFixed(2)}
              </p>
            </div>

            {/* Bank Details */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="e.g., Standard Bank"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  placeholder="Full name as per bank account"
                  value={bankDetails.accountHolderName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="1234567890"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchCode">Branch Code</Label>
                <Input
                  id="branchCode"
                  placeholder="123456"
                  value={bankDetails.branchCode}
                  onChange={(e) => setBankDetails({ ...bankDetails, branchCode: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900">
              <AlertCircle className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-medium">Processing Time</p>
                <p>Payouts are typically processed within 3-5 business days after approval.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayoutDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={isSubmitting || !isWednesday}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
