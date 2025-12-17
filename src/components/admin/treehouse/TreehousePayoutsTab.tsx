'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { PayoutRequest } from '@/types/creator-earnings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, DollarSign, CheckCircle, XCircle, Clock, AlertTriangle, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';

export function TreehousePayoutsTab() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Process payout form
  const [action, setAction] = useState<'approve' | 'reject' | 'complete' | 'fail'>('approve');
  const [paymentReference, setPaymentReference] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const payoutsRef = collection(db, 'payout_requests');
      const q = query(payoutsRef, orderBy('requestDate', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PayoutRequest[];
      setPayouts(data);
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayout || !currentUser) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      toast({
        title: 'Rejection Reason Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      });
      return;
    }

    if (action === 'complete' && !paymentReference.trim()) {
      toast({
        title: 'Payment Reference Required',
        description: 'Please provide a payment reference',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    try {
      const payoutRef = doc(db, 'payout_requests', selectedPayout.id!);
      const updateData: any = {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'complete' ? 'completed' : 'failed',
        processedBy: currentUser.uid,
        processedByName: currentUser.displayName || currentUser.email,
        processedDate: Timestamp.now(),
        adminNotes: adminNotes || null,
      };

      if (action === 'reject') {
        updateData.rejectionReason = rejectionReason;
      }

      if (action === 'complete') {
        updateData.paymentReference = paymentReference;
        updateData.completedDate = Timestamp.now();
        
        // Update creator earnings balance
        const earningsRef = doc(db, 'creator_earnings', selectedPayout.creatorId);
        await updateDoc(earningsRef, {
          currentBalance: 0, // Assuming full withdrawal
          pendingBalance: 0,
          totalWithdrawn: selectedPayout.requestedAmount,
          lastPayoutDate: Timestamp.now(),
          lastPayoutAmount: selectedPayout.requestedAmount,
          updatedAt: Timestamp.now()
        });
      }

      await updateDoc(payoutRef, updateData);

      toast({
        title: 'Payout Updated',
        description: `Payout request has been ${updateData.status}`,
      });

      setShowProcessDialog(false);
      resetForm();
      loadPayouts();
    } catch (error) {
      console.error('Error processing payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payout request',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setAction('approve');
    setPaymentReference('');
    setRejectionReason('');
    setAdminNotes('');
    setSelectedPayout(null);
  };

  const getStatusBadge = (status: PayoutRequest['status']) => {
    const variants: Record<PayoutRequest['status'], { label: string; className: string; icon: any }> = {
      pending: { label: 'Pending', className: 'bg-yellow-500', icon: Clock },
      approved: { label: 'Approved', className: 'bg-blue-500', icon: CheckCircle },
      rejected: { label: 'Rejected', className: 'bg-red-500', icon: XCircle },
      processing: { label: 'Processing', className: 'bg-purple-500', icon: Loader2 },
      completed: { label: 'Completed', className: 'bg-green-500', icon: CheckCircle },
      failed: { label: 'Failed', className: 'bg-red-600', icon: AlertTriangle },
    };
    const variant = variants[status];
    const Icon = variant.icon;
    return (
      <Badge className={`${variant.className} text-white font-bold flex items-center gap-1 w-fit`}>
        <Icon className="h-3 w-3" />
        {variant.label}
      </Badge>
    );
  };

  const filteredPayouts = payouts.filter(p => 
    filterStatus === 'all' || p.status === filterStatus
  );

  const stats = {
    total: payouts.length,
    pending: payouts.filter(p => p.status === 'pending').length,
    approved: payouts.filter(p => p.status === 'approved').length,
    completed: payouts.filter(p => p.status === 'completed').length,
    totalAmount: payouts.reduce((sum, p) => sum + p.requestedAmount, 0),
    pendingAmount: payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.requestedAmount, 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-3xl font-bold text-[#3D2E17]">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</CardTitle>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">R{stats.pendingAmount.toFixed(2)}</p>
          </CardHeader>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardHeader className="pb-3">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-3xl font-bold text-blue-700 dark:text-blue-300">R{stats.totalAmount.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-[#3D2E17]">Payout Requests</CardTitle>
              <CardDescription>Manage creator payout requests</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Payout Requests</h3>
              <p className="text-muted-foreground">
                {filterStatus === 'all' ? 'No payout requests yet' : `No ${filterStatus} requests`}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{payout.creatorName}</p>
                          <p className="text-xs text-muted-foreground">{payout.creatorEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-[#006B3E]">R{payout.requestedAmount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell>
                        {format(payout.requestDate instanceof Date ? payout.requestDate : payout.requestDate.toDate(), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payout.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {payout.status === 'pending' && (
                            <Button
                              size="sm"
                              className="bg-[#006B3E] hover:bg-[#005230]"
                              onClick={() => {
                                setSelectedPayout(payout);
                                setShowProcessDialog(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Process
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3D2E17]">
              Payout Request Details
            </DialogTitle>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Creator</Label>
                  <p className="font-semibold">{selectedPayout.creatorName}</p>
                  <p className="text-sm text-muted-foreground">{selectedPayout.creatorEmail}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="text-2xl font-bold text-[#006B3E]">R{selectedPayout.requestedAmount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPayout.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-semibold">{selectedPayout.paymentMethod}</p>
                </div>
              </div>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Bank Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Bank</Label>
                      <p>{selectedPayout.accountDetails.bankName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Type</Label>
                      <p>{selectedPayout.accountDetails.accountType}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Account Number</Label>
                      <p className="font-mono">{selectedPayout.accountDetails.accountNumber}</p>
                    </div>
                    {selectedPayout.accountDetails.branchCode && (
                      <div>
                        <Label className="text-muted-foreground">Branch Code</Label>
                        <p className="font-mono">{selectedPayout.accountDetails.branchCode}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Account Holder</Label>
                      <p>{selectedPayout.accountDetails.accountHolderName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedPayout.notes && (
                <div>
                  <Label className="text-muted-foreground">Creator Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedPayout.notes}</p>
                </div>
              )}

              {selectedPayout.rejectionReason && (
                <div>
                  <Label className="text-red-600">Rejection Reason</Label>
                  <p className="text-sm mt-1 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200">
                    {selectedPayout.rejectionReason}
                  </p>
                </div>
              )}

              {selectedPayout.paymentReference && (
                <div>
                  <Label className="text-muted-foreground">Payment Reference</Label>
                  <p className="font-mono text-sm mt-1 p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    {selectedPayout.paymentReference}
                  </p>
                </div>
              )}

              {selectedPayout.adminNotes && (
                <div>
                  <Label className="text-muted-foreground">Admin Notes</Label>
                  <p className="text-sm mt-1 p-3 bg-muted rounded">{selectedPayout.adminNotes}</p>
                </div>
              )}

              {selectedPayout.processedByName && (
                <div className="text-sm text-muted-foreground">
                  Processed by {selectedPayout.processedByName} on{' '}
                  {selectedPayout.processedDate && format(
                    selectedPayout.processedDate instanceof Date 
                      ? selectedPayout.processedDate 
                      : selectedPayout.processedDate.toDate(), 
                    'MMM dd, yyyy HH:mm'
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#3D2E17]">
              Process Payout Request
            </DialogTitle>
            <DialogDescription>
              {selectedPayout && `R${selectedPayout.requestedAmount.toFixed(2)} for ${selectedPayout.creatorName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="action">Action</Label>
              <Select value={action} onValueChange={(v: any) => setAction(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="complete">Mark as Completed</SelectItem>
                  <SelectItem value="fail">Mark as Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {action === 'reject' && (
              <div>
                <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={3}
                />
              </div>
            )}

            {action === 'complete' && (
              <div>
                <Label htmlFor="paymentReference">Payment Reference *</Label>
                <Input
                  id="paymentReference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., TXN123456789"
                />
              </div>
            )}

            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowProcessDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessPayout}
              disabled={processing}
              className="bg-[#006B3E] hover:bg-[#005230]"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
