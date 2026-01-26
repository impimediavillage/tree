'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, TrendingUp, TrendingDown, Info, AlertTriangle, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateVendorPayout, formatCurrency, VENDOR_MINIMUM_PAYOUT_AMOUNT } from '@/types/vendor-earnings';

interface VendorPayoutRequestFormProps {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  dispensaryId: string;
  dispensaryCommissionRate: number; // From user.dispensaryCommissionRate
  currentBalance: number; // Available vendor earnings
  onSuccess?: () => void;
}

export function VendorPayoutRequestForm({
  vendorId,
  vendorName,
  vendorEmail,
  dispensaryId,
  dispensaryCommissionRate,
  currentBalance,
  onSuccess
}: VendorPayoutRequestFormProps) {
  const { toast } = useToast();
  const [requestedAmount, setRequestedAmount] = useState(currentBalance);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(vendorName);
  const [branchCode, setBranchCode] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Cheque'>('Savings');
  const [notes, setNotes] = useState('');

  // Calculate breakdown
  const breakdown = calculateVendorPayout(requestedAmount, dispensaryCommissionRate);

  // Validation
  const canSubmit = 
    requestedAmount >= VENDOR_MINIMUM_PAYOUT_AMOUNT &&
    requestedAmount <= currentBalance &&
    bankName && accountNumber && accountHolderName && branchCode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields and check the payout amount',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Call Cloud Function to create vendor payout request
      // This will include the breakdown calculation
      const response = await fetch('/api/vendor-payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          vendorName,
          vendorEmail,
          dispensaryId,
          requestedAmount,
          grossSales: requestedAmount,
          dispensaryCommissionRate,
          dispensaryCommission: breakdown.dispensaryCommission,
          netPayout: breakdown.vendorNetPayout,
          bankDetails: {
            bankName,
            accountNumber,
            accountHolderName,
            branchCode,
            accountType
          },
          notes
        })
      });

      if (!response.ok) throw new Error('Failed to create payout request');

      toast({
        title: 'Payout Request Submitted',
        description: `Your request for ${formatCurrency(breakdown.vendorNetPayout)} has been submitted for approval.`
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Payout request error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit payout request',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payout Breakdown Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-purple-600" />
            Payout Breakdown
          </CardTitle>
          <CardDescription>
            Understanding your commission deduction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Requested Amount */}
          <div className="space-y-2">
            <Label>Request Payout Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-semibold">R</span>
              <Input
                type="number"
                min={VENDOR_MINIMUM_PAYOUT_AMOUNT}
                max={currentBalance}
                step={1}
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-gray-600">
              Available: {formatCurrency(currentBalance)} • Minimum: {formatCurrency(VENDOR_MINIMUM_PAYOUT_AMOUNT)}
            </p>
          </div>

          {/* Breakdown Visualization */}
          <div className="space-y-3 p-4 bg-white rounded-lg border-2 border-blue-200">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-gray-700">Commission Breakdown</span>
              <span className="text-xs text-gray-500">{dispensaryCommissionRate}% to Dispensary</span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
              {/* Dispensary Commission */}
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center"
                style={{ width: `${dispensaryCommissionRate > 100 ? 100 : dispensaryCommissionRate}%` }}
              >
                {dispensaryCommissionRate > 15 && (
                  <span className="text-white text-xs font-bold drop-shadow">
                    {dispensaryCommissionRate > 100 ? '100%' : `${dispensaryCommissionRate}%`}
                  </span>
                )}
              </div>
              {/* Vendor Net */}
              {dispensaryCommissionRate <= 100 && (
                <div
                  className="absolute right-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center"
                  style={{ width: `${100 - dispensaryCommissionRate}%` }}
                >
                  {(100 - dispensaryCommissionRate) > 15 && (
                    <span className="text-white text-xs font-bold drop-shadow">
                      {100 - dispensaryCommissionRate}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Dispensary Commission */}
              <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border-2 border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">Dispensary Commission</span>
                </div>
                <div className="text-2xl font-black text-red-700">
                  -{formatCurrency(breakdown.dispensaryCommission)}
                </div>
                <p className="text-xs text-red-600 mt-1">
                  {dispensaryCommissionRate}% deducted
                </p>
              </div>

              {/* Vendor Net Payout */}
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800">You Receive</span>
                </div>
                <div className="text-2xl font-black text-green-700">
                  {formatCurrency(breakdown.vendorNetPayout)}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  {breakdown.vendorReceivesPercentage}% net payout
                </p>
              </div>
            </div>

            {/* Warning for high commission */}
            {dispensaryCommissionRate > 50 && (
              <Alert className="bg-orange-50 border-orange-300">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-xs text-orange-900">
                  {dispensaryCommissionRate > 100 ? (
                    <>
                      <strong>Commission over 100%:</strong> You'll receive R0 from this payout.
                      The dispensary takes the full amount plus extra.
                    </>
                  ) : (
                    <>
                      <strong>High commission rate:</strong> You'll receive only {breakdown.vendorReceivesPercentage}% of your gross sales.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 p-3 bg-blue-100 rounded-lg border border-blue-300">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-900 leading-relaxed">
                Your dispensary commission rate is <strong>{dispensaryCommissionRate}%</strong>.
                This is automatically deducted from all your sales when you request a payout.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Account Details</CardTitle>
          <CardDescription>Where should we send your payout?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., FNB"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountType">Account Type *</Label>
              <Select value={accountType} onValueChange={(v: 'Savings' | 'Cheque') => setAccountType(v)}>
                <SelectTrigger id="accountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name *</Label>
            <Input
              id="accountHolderName"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Full name as per bank account"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1234567890"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchCode">Branch Code *</Label>
              <Input
                id="branchCode"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="250655"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes for the dispensary admin..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={!canSubmit || isSubmitting} size="lg" className="bg-green-600 hover:bg-green-700">
          {isSubmitting ? 'Submitting...' : `Request ${formatCurrency(breakdown.vendorNetPayout)} Payout`}
        </Button>
      </div>
    </form>
  );
}
