'use client';

import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { PlatformDriverPayout, PayoutStats } from '@/types/platform-payout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Upload,
  Eye,
  Search,
  Filter,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface PublicDriverPayoutsProps {
  dateRange: { from: Date; to: Date };
}

export function PublicDriverPayouts({ dateRange }: PublicDriverPayoutsProps) {
  const [payouts, setPayouts] = useState<PlatformDriverPayout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<PlatformDriverPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState<PayoutStats>({
    totalPending: 0,
    totalPendingAmount: 0,
    totalProcessing: 0,
    totalProcessingAmount: 0,
    totalPaidThisMonth: 0,
    totalPaidAmountThisMonth: 0,
    totalFailedThisMonth: 0,
    averagePayoutAmount: 0,
    uniqueDriversCount: 0,
  });
  
  // Mark as paid dialog
  const [markAsPaidDialog, setMarkAsPaidDialog] = useState<{
    open: boolean;
    payout: PlatformDriverPayout | null;
  }>({ open: false, payout: null });
  const [paymentReference, setPaymentReference] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // View details dialog
  const [viewDetailsDialog, setViewDetailsDialog] = useState<{
    open: boolean;
    payout: PlatformDriverPayout | null;
  }>({ open: false, payout: null });

  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Real-time listener for payouts
  useEffect(() => {
    const q = query(
      collection(db, 'platform_driver_payouts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt,
        processedAt: doc.data().processedAt,
        paidAt: doc.data().paidAt,
      })) as PlatformDriverPayout[];
      
      setPayouts(data);
      calculateStats(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load driver payouts',
        variant: 'destructive',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Filter payouts
  useEffect(() => {
    let filtered = payouts;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.driverName.toLowerCase().includes(term) ||
          p.driverEmail.toLowerCase().includes(term) ||
          p.orderNumber?.toLowerCase().includes(term) ||
          p.dispensaryName.toLowerCase().includes(term)
      );
    }

    // Filter by date range
    filtered = filtered.filter(p => {
      if (!p.createdAt) return false;
      const payoutDate = p.createdAt.toDate();
      return payoutDate >= dateRange.from && payoutDate <= dateRange.to;
    });

    setFilteredPayouts(filtered);
  }, [payouts, searchTerm, filterStatus, dateRange]);

  // Calculate statistics
  const calculateStats = (data: PlatformDriverPayout[]) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const pending = data.filter(p => p.status === 'pending');
    const processing = data.filter(p => p.status === 'processing');
    const paidThisMonth = data.filter(p => {
      if (p.status !== 'paid' || !p.paidAt) return false;
      const paidDate = p.paidAt.toDate();
      return paidDate >= monthStart && paidDate <= monthEnd;
    });
    const failedThisMonth = data.filter(p => {
      if (p.status !== 'failed' || !p.processedAt) return false;
      const failedDate = p.processedAt.toDate();
      return failedDate >= monthStart && failedDate <= monthEnd;
    });

    const uniqueDrivers = new Set(data.map(p => p.driverId)).size;
    const totalAmount = data.reduce((sum, p) => sum + p.driverEarnings, 0);
    const avgAmount = data.length > 0 ? totalAmount / data.length : 0;

    setStats({
      totalPending: pending.length,
      totalPendingAmount: pending.reduce((sum, p) => sum + p.driverEarnings, 0),
      totalProcessing: processing.length,
      totalProcessingAmount: processing.reduce((sum, p) => sum + p.driverEarnings, 0),
      totalPaidThisMonth: paidThisMonth.length,
      totalPaidAmountThisMonth: paidThisMonth.reduce((sum, p) => sum + p.driverEarnings, 0),
      totalFailedThisMonth: failedThisMonth.length,
      averagePayoutAmount: avgAmount,
      uniqueDriversCount: uniqueDrivers,
    });
  };

  // Select/deselect payout
  const toggleSelectPayout = (payoutId: string) => {
    setSelectedPayouts(prev =>
      prev.includes(payoutId)
        ? prev.filter(id => id !== payoutId)
        : [...prev, payoutId]
    );
  };

  // Select/deselect all pending
  const toggleSelectAll = () => {
    const pendingIds = filteredPayouts
      .filter(p => p.status === 'pending')
      .map(p => p.id);
    
    if (selectedPayouts.length === pendingIds.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(pendingIds);
    }
  };

  // Export selected for payment
  const handleExportForPayment = () => {
    const selected = payouts.filter(p => selectedPayouts.includes(p.id));
    
    // Generate CSV
    const headers = ['Driver Name', 'Bank Name', 'Account Number', 'Branch Code', 'Amount', 'Reference'];
    const rows = selected.map(p => [
      p.banking.accountHolderName,
      p.banking.bankName,
      p.banking.accountNumber,
      p.banking.branchCode,
      `${p.currency} ${p.driverEarnings.toFixed(2)}`,
      `PAY-${p.deliveryId.slice(-8)}`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `driver-payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported Successfully',
      description: `Exported ${selected.length} payout(s) for bank processing`,
    });
  };

  // Open mark as paid dialog
  const openMarkAsPaidDialog = (payout: PlatformDriverPayout) => {
    setMarkAsPaidDialog({ open: true, payout });
    setPaymentReference('');
    setAdminNotes('');
    setProofFile(null);
  };

  // Upload proof of payment
  const uploadProofOfPayment = async (file: File, payoutId: string): Promise<string> => {
    const storageRef = ref(storage, `platform-payouts/${payoutId}/proof-${Date.now()}.${file.name.split('.').pop()}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Mark as paid
  const handleMarkAsPaid = async () => {
    if (!markAsPaidDialog.payout || !currentUser) return;
    if (!paymentReference.trim()) {
      toast({
        title: 'Payment Reference Required',
        description: 'Please enter a payment reference number',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let proofUrl = '';
      if (proofFile) {
        proofUrl = await uploadProofOfPayment(proofFile, markAsPaidDialog.payout.id);
      }

      await updateDoc(doc(db, 'platform_driver_payouts', markAsPaidDialog.payout.id), {
        status: 'paid',
        paidAt: serverTimestamp(),
        paymentReference: paymentReference.trim(),
        proofOfPaymentUrl: proofUrl,
        adminNotes: adminNotes.trim(),
        processedBy: currentUser.uid,
        processorName: currentUser.displayName || currentUser.email,
      });

      // Update delivery record
      if (markAsPaidDialog.payout.deliveryId) {
        await updateDoc(doc(db, 'deliveries', markAsPaidDialog.payout.deliveryId), {
          platformPayoutStatus: 'paid',
          platformPayoutDate: serverTimestamp(),
        });
      }

      toast({
        title: 'Payout Marked as Paid',
        description: `Successfully paid R${markAsPaidDialog.payout.driverEarnings.toFixed(2)} to ${markAsPaidDialog.payout.driverName}`,
      });

      setMarkAsPaidDialog({ open: false, payout: null });
      setSelectedPayouts(prev => prev.filter(id => id !== markAsPaidDialog.payout?.id));
    } catch (error) {
      console.error('Error marking payout as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark payout as paid',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'processing':
        return <Badge variant="default" className="gap-1"><TrendingUp className="w-3 h-3" />Processing</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle2 className="w-3 h-3" />Paid</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading driver payouts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPending}</div>
            <p className="text-xs text-muted-foreground">
              Total: R{stats.totalPendingAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProcessing}</div>
            <p className="text-xs text-muted-foreground">
              Total: R{stats.totalProcessingAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPaidThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Total: R{stats.totalPaidAmountThisMonth.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueDriversCount}</div>
            <p className="text-xs text-muted-foreground">
              Avg payout: R{stats.averagePayoutAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Public Driver Payouts</CardTitle>
              <CardDescription>
                Manage payments to independent drivers for completed deliveries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportForPayment}
                disabled={selectedPayouts.length === 0}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export {selectedPayouts.length > 0 && `(${selectedPayouts.length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by driver, order, or dispensary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredPayouts.filter(p => p.status === 'pending').length > 0 &&
                        selectedPayouts.length === filteredPayouts.filter(p => p.status === 'pending').length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Dispensary</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Banking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No payouts found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {payout.status === 'pending' && (
                          <Checkbox
                            checked={selectedPayouts.includes(payout.id)}
                            onCheckedChange={() => toggleSelectPayout(payout.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payout.driverName}</div>
                          <div className="text-sm text-muted-foreground">{payout.driverEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">#{payout.orderNumber || payout.orderId.slice(-6)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{payout.dispensaryName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {payout.createdAt && format(payout.createdAt.toDate(), 'PP')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-green-600">
                          {payout.currency} {payout.driverEarnings.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="font-medium">{payout.banking.bankName}</div>
                          <div className="text-muted-foreground font-mono">
                            ****{payout.banking.accountNumber.slice(-4)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewDetailsDialog({ open: true, payout })}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {payout.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => openMarkAsPaidDialog(payout)}
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mark as Paid Dialog */}
      <Dialog open={markAsPaidDialog.open} onOpenChange={(open) => setMarkAsPaidDialog({ open, payout: null })}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mark Payout as Paid</DialogTitle>
            <DialogDescription>
              Confirm payment to {markAsPaidDialog.payout?.driverName}
            </DialogDescription>
          </DialogHeader>
          
          {markAsPaidDialog.payout && (
            <div className="space-y-4">
              {/* Payout Summary */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Driver:</span>
                    <span className="font-medium">{markAsPaidDialog.payout.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="font-bold text-green-600">
                      {markAsPaidDialog.payout.currency} {markAsPaidDialog.payout.driverEarnings.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bank:</span>
                    <span className="text-sm">{markAsPaidDialog.payout.banking.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account:</span>
                    <span className="text-sm font-mono">{markAsPaidDialog.payout.banking.accountNumber}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Reference */}
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference *</Label>
                <Input
                  id="paymentReference"
                  placeholder="e.g., REF123456789"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>

              {/* Proof of Payment */}
              <div className="space-y-2">
                <Label htmlFor="proof">Proof of Payment (Optional)</Label>
                <Input
                  id="proof"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                {proofFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {proofFile.name}
                  </p>
                )}
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this payment..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkAsPaidDialog({ open: false, payout: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialog.open} onOpenChange={(open) => setViewDetailsDialog({ open, payout: null })}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              Complete information for this driver payout
            </DialogDescription>
          </DialogHeader>
          
          {viewDetailsDialog.payout && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(viewDetailsDialog.payout.status)}
              </div>

              {/* Driver Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Driver Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{viewDetailsDialog.payout.driverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span>{viewDetailsDialog.payout.driverEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver ID:</span>
                    <span className="font-mono text-xs">{viewDetailsDialog.payout.driverId}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Banking Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Banking Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">{viewDetailsDialog.payout.banking.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Holder:</span>
                    <span>{viewDetailsDialog.payout.banking.accountHolderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="font-mono">{viewDetailsDialog.payout.banking.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch Code:</span>
                    <span className="font-mono">{viewDetailsDialog.payout.banking.branchCode}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee:</span>
                    <span>{viewDetailsDialog.payout.currency} {viewDetailsDialog.payout.deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Driver Earnings:</span>
                    <span className="font-bold text-green-600">
                      {viewDetailsDialog.payout.currency} {viewDetailsDialog.payout.driverEarnings.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Order & Delivery Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Order & Delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Number:</span>
                    <span className="font-mono">#{viewDetailsDialog.payout.orderNumber || viewDetailsDialog.payout.orderId.slice(-6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dispensary:</span>
                    <span>{viewDetailsDialog.payout.dispensaryName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>
                      {viewDetailsDialog.payout.createdAt && format(viewDetailsDialog.payout.createdAt.toDate(), 'PPp')}
                    </span>
                  </div>
                  {viewDetailsDialog.payout.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid:</span>
                      <span>{format(viewDetailsDialog.payout.paidAt.toDate(), 'PPp')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Info (if paid) */}
              {viewDetailsDialog.payout.status === 'paid' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {viewDetailsDialog.payout.paymentReference && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reference:</span>
                        <span className="font-mono">{viewDetailsDialog.payout.paymentReference}</span>
                      </div>
                    )}
                    {viewDetailsDialog.payout.processorName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processed By:</span>
                        <span>{viewDetailsDialog.payout.processorName}</span>
                      </div>
                    )}
                    {viewDetailsDialog.payout.adminNotes && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="text-sm">{viewDetailsDialog.payout.adminNotes}</p>
                      </div>
                    )}
                    {viewDetailsDialog.payout.proofOfPaymentUrl && (
                      <div className="pt-2">
                        <a
                          href={viewDetailsDialog.payout.proofOfPaymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          <Upload className="w-4 h-4" />
                          View Proof of Payment
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewDetailsDialog({ open: false, payout: null })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
