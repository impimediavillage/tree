'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Calendar,
  Building,
  CreditCard,
  TrendingUp,
  Sparkles,
  Award,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InfluencerProfile {
  totalEarnings: number;
  pendingEarnings: number;
  paidOut: number;
}

interface PayoutRequest {
  id: string;
  influencerId: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  requestedAt: any;
  processedAt?: any;
  notes?: string;
}

export default function PayoutsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Request form state
  const [requestAmount, setRequestAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const MINIMUM_PAYOUT = 500; // R500 minimum

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load influencer profile
      const profileDoc = await getDoc(doc(db, 'influencers', user.uid));
      if (profileDoc.exists()) {
        setProfile(profileDoc.data() as InfluencerProfile);
      }

      // Load payout history
      const q = query(
        collection(db, 'influencerPayouts'),
        where('influencerId', '==', user.uid),
        orderBy('requestedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const payoutsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayoutRequest[];

      setPayouts(payoutsData);
    } catch (error) {
      console.error('Error loading payout data:', error);
      toast({ variant: "destructive", description: "Failed to load payout information" });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!user || !profile) {
      toast({ variant: "destructive", description: "Unable to process request" });
      return;
    }

    const amount = parseFloat(requestAmount);

    if (isNaN(amount) || amount < MINIMUM_PAYOUT) {
      toast({ variant: "destructive", description: `Minimum payout amount is R${MINIMUM_PAYOUT}` });
      return;
    }

    if (amount > profile.pendingEarnings) {
      toast({ variant: "destructive", description: "Insufficient available balance" });
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountHolder.trim()) {
      toast({ variant: "destructive", description: "Please fill in all bank details" });
      return;
    }

    try {
      setSubmitting(true);

      await addDoc(collection(db, 'influencerPayouts'), {
        influencerId: user.uid,
        amount,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        status: 'pending',
        requestedAt: serverTimestamp(),
      });

      toast({ description: "Payout request submitted successfully!" });
      setShowRequestDialog(false);
      setRequestAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountHolder('');
      loadData();
    } catch (error) {
      console.error('Error submitting payout request:', error);
      toast({ variant: "destructive", description: "Failed to submit payout request" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'paid':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006B3E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payout information...</p>
        </div>
      </div>
    );
  }

  const availableBalance = profile?.pendingEarnings || 0;
  const canRequestPayout = availableBalance >= MINIMUM_PAYOUT;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payouts</h1>
          <p className="text-gray-600 mt-2">Request withdrawals and track payment history</p>
        </div>
        <Button 
          onClick={() => setShowRequestDialog(true)}
          disabled={!canRequestPayout}
          className="bg-[#006B3E] hover:bg-[#005530]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Payout
        </Button>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              💰 Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">
              R{availableBalance.toFixed(2)}
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              Ready to withdraw
            </p>
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-emerald-700">
                  <span>💚 Base Commission (75%):</span>
                  <span className="font-semibold">R{(availableBalance * 0.75).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>🎁 Ad Bonuses (25%):</span>
                  <span className="font-semibold">R{(availableBalance * 0.25).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              R{(profile?.totalEarnings || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Lifetime commissions
            </p>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-emerald-700">
                  <span>💰 Base (Tier-based):</span>
                  <span className="font-semibold">R{((profile?.totalEarnings || 0) * 0.75).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>🎁 Ad Bonuses:</span>
                  <span className="font-semibold">R{((profile?.totalEarnings || 0) * 0.25).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Total Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              R{(profile?.paidOut || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Successfully withdrawn
            </p>
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-emerald-700">
                  <span>💚 Base Paid Out:</span>
                  <span className="font-semibold">R{((profile?.paidOut || 0) * 0.75).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>🎁 Bonuses Paid Out:</span>
                  <span className="font-semibold">R{((profile?.paidOut || 0) * 0.25).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COMMISSION STRUCTURE EXPLANATION - NEW SECTION */}
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            💎 Your Earnings Breakdown
          </CardTitle>
          <CardDescription>
            Understanding your dual-commission structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Base Commission */}
            <div className="bg-gradient-to-r from-emerald-100 to-green-100 p-5 rounded-lg border-2 border-emerald-300">
              <h3 className="font-bold text-lg text-emerald-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                💰 Base Commission (75%)
              </h3>
              <div className="space-y-3 text-sm text-emerald-800">
                <p><strong>Source:</strong> Platform's 25% profit</p>
                <p><strong>Rate:</strong> Based on your tier (5-20%)</p>
                <p><strong>Example:</strong> R100 product = R25 platform profit</p>
                <p className="text-xs bg-white/50 p-2 rounded">
                  Sprout tier (10%) earns R2.50 base commission
                </p>
                <div className="mt-4 pt-4 border-t border-emerald-300">
                  <p className="font-semibold mb-1">Your Lifetime Base:</p>
                  <p className="text-2xl font-black text-emerald-700">
                    R{((profile?.totalEarnings || 0) * 0.75).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Ad Bonuses */}
            <div className="bg-gradient-to-r from-amber-100 to-yellow-100 p-5 rounded-lg border-2 border-amber-300">
              <h3 className="font-bold text-lg text-amber-900 mb-3 flex items-center gap-2">
                <Award className="h-5 w-5" />
                🎁 Ad Bonuses (25%)
              </h3>
              <div className="space-y-3 text-sm text-amber-800">
                <p><strong>Source:</strong> Dispensary's payout (0-5%)</p>
                <p><strong>Rate:</strong> Set by each dispensary</p>
                <p><strong>Example:</strong> 3% bonus = R0.75 extra on R100 product</p>
                <p className="text-xs bg-white/50 p-2 rounded">
                  Total = R2.50 base + R0.75 bonus = R3.25!
                </p>
                <div className="mt-4 pt-4 border-t border-amber-300">
                  <p className="font-semibold mb-1">Your Lifetime Bonuses:</p>
                  <p className="text-2xl font-black text-amber-700">
                    R{((profile?.totalEarnings || 0) * 0.25).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips Section */}
          <div className="mt-6 bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-lg border-2 border-blue-300">
            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              💡 Maximize Your Earnings
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Promote high-bonus ads:</strong> Look for 5% ad bonus campaigns in the marketplace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Level up your tier:</strong> Higher tiers earn more base commission (up to 20%)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Track performance:</strong> Use analytics to see which products earn the most bonuses</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Minimum Notice */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Payout Requirements</p>
              <p className="text-sm text-yellow-800 mt-1">
                Minimum payout amount is <strong>R{MINIMUM_PAYOUT}</strong>. 
                Payouts are processed within 5-7 business days after approval.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Track all your withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No payout requests yet</h3>
              <p className="text-gray-500 mb-4">
                Once you have at least R{MINIMUM_PAYOUT} in available balance, you can request a payout
              </p>
              {canRequestPayout && (
                <Button 
                  onClick={() => setShowRequestDialog(true)}
                  className="bg-[#006B3E] hover:bg-[#005530]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request Your First Payout
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-2xl font-bold text-[#006B3E]">
                          R{payout.amount.toFixed(2)}
                        </p>
                        {getStatusBadge(payout.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span>{payout.bankName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span>****{payout.accountNumber.slice(-4)}</span>
                          <span className="text-gray-400">•</span>
                          <span>{payout.accountHolder}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Requested: {formatDate(payout.requestedAt)}</span>
                          {payout.processedAt && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>Processed: {formatDate(payout.processedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {payout.notes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded border-l-4 border-blue-500">
                          <p className="text-xs font-semibold text-gray-700">Admin Notes:</p>
                          <p className="text-sm text-gray-600">{payout.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Payout Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Enter your bank details and the amount you'd like to withdraw
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 bg-[#006B3E]/5 rounded-lg border border-[#006B3E]/20">
              <p className="text-sm text-gray-600">Available Balance</p>
              <p className="text-2xl font-bold text-[#006B3E]">
                R{availableBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="amount">Payout Amount *</Label>
              <Input
                id="amount"
                type="number"
                min={MINIMUM_PAYOUT}
                max={availableBalance}
                step="0.01"
                placeholder={`Min R${MINIMUM_PAYOUT}`}
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: R{MINIMUM_PAYOUT} • Maximum: R{availableBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                placeholder="e.g., FNB, Standard Bank, Nedbank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                placeholder="Your bank account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="accountHolder">Account Holder Name *</Label>
              <Input
                id="accountHolder"
                placeholder="Name as it appears on your account"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRequestPayout}
              disabled={submitting || !requestAmount || !bankName || !accountNumber || !accountHolder}
              className="bg-[#006B3E] hover:bg-[#005530]"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
