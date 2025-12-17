"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, getDoc, doc, updateDoc, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  User,
  Search,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  DispensaryPayoutRequest,
  formatCurrency,
  getPayoutStatusColor,
  getPayoutStatusLabel,
} from "@/types/dispensary-earnings";

export default function DispensaryPayoutsTab() {
  const [payoutRequests, setPayoutRequests] = useState<DispensaryPayoutRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DispensaryPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<DispensaryPayoutRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [payoutRequests, searchTerm, statusFilter, typeFilter]);

  const fetchPayoutRequests = async () => {
    try {
      setLoading(true);
      const requestsQuery = query(collection(db, "dispensary_payout_requests"));
      const requestsSnap = await getDocs(requestsQuery);

      const requests: DispensaryPayoutRequest[] = [];
      for (const docSnap of requestsSnap.docs) {
        const data = docSnap.data();
        
        // Fetch user details
        const userRef = doc(db, "users", data.userId);
        const userSnap = await getDoc(userRef);
        const userName = userSnap.exists() 
          ? userSnap.data()?.displayName || userSnap.data()?.email || "Unknown"
          : "Unknown";

        // Fetch dispensary name
        const dispensaryRef = doc(db, "dispensaries", data.dispensaryId);
        const dispensarySnap = await getDoc(dispensaryRef);
        const dispensaryName = dispensarySnap.exists()
          ? dispensarySnap.data()?.businessName || "Unknown Dispensary"
          : "Unknown Dispensary";

        requests.push({
          id: docSnap.id,
          ...data,
          userName,
          dispensaryName,
        } as any);
      }

      // Sort by creation date (newest first)
      requests.sort((a, b) => {
        const aDate = a.createdAt as any;
        const bDate = b.createdAt as any;
        return bDate?.toMillis() - aDate?.toMillis();
      });

      setPayoutRequests(requests);
    } catch (error) {
      console.error("Error fetching payout requests:", error);
      toast({
        title: "Error",
        description: "Failed to load payout requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = payoutRequests;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((req) => req.payoutType === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          (req as any).userName?.toLowerCase().includes(term) ||
          (req as any).dispensaryName?.toLowerCase().includes(term) ||
          req.id.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(filtered);
  };

  const handleViewDetails = (request: DispensaryPayoutRequest) => {
    setSelectedRequest(request);
    setShowDetailsDialog(true);
  };

  const handleProcessRequest = (request: DispensaryPayoutRequest) => {
    setSelectedRequest(request);
    setPaymentReference("");
    setRejectionReason("");
    setShowProcessDialog(true);
  };

  const handleUpdateStatus = async (newStatus: DispensaryPayoutRequest['status']) => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);

      const updates: any = {
        status: newStatus,
        processedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (newStatus === 'completed' && paymentReference) {
        updates.paymentReference = paymentReference;
      }

      if (newStatus === 'rejected' && rejectionReason) {
        updates.rejectionReason = rejectionReason;
      }

      const requestRef = doc(db, "dispensary_payout_requests", selectedRequest.id);
      await updateDoc(requestRef, updates);

      // If completed or failed, update earnings (move pending back to current or mark as withdrawn)
      if (newStatus === 'completed') {
        // Update dispensary earnings for all included staff
        const staffIds = selectedRequest.payoutType === 'combined' && selectedRequest.staffIncluded
          ? selectedRequest.staffIncluded
          : [selectedRequest.userId];

        for (const staffId of staffIds) {
          const earningsRef = doc(db, "dispensary_earnings", staffId);
          const earningsSnap = await getDoc(earningsRef);
          const staffBreakdown = selectedRequest.staffBreakdown?.find((s) => s.userId === staffId);
          const amount = staffBreakdown?.amount || selectedRequest.requestedAmount;

          if (earningsSnap.exists()) {
            const earningsData = earningsSnap.data();
            await updateDoc(earningsRef, {
              pendingBalance: (earningsData.pendingBalance || 0) - amount,
              totalWithdrawn: (earningsData.totalWithdrawn || 0) + amount,
              updatedAt: Timestamp.now(),
            });
          }
        }
      } else if (newStatus === 'failed' || newStatus === 'rejected') {
        // Move pending balance back to current
        const staffIds = selectedRequest.payoutType === 'combined' && selectedRequest.staffIncluded
          ? selectedRequest.staffIncluded
          : [selectedRequest.userId];

        for (const staffId of staffIds) {
          const earningsRef = doc(db, "dispensary_earnings", staffId);
          const earningsSnap = await getDoc(earningsRef);
          if (earningsSnap.exists()) {
            const earningsData = earningsSnap.data();
            const staffBreakdown = selectedRequest.staffBreakdown?.find((s) => s.userId === staffId);
            const amount = staffBreakdown?.amount || selectedRequest.requestedAmount;

            await updateDoc(earningsRef, {
              currentBalance: earningsData.currentBalance + amount,
              pendingBalance: earningsData.pendingBalance - amount,
              updatedAt: Timestamp.now(),
            });
          }
        }
      }

      toast({
        title: "Success",
        description: `Payout request ${newStatus}`,
      });

      setShowProcessDialog(false);
      fetchPayoutRequests();
    } catch (error) {
      console.error("Error updating payout status:", error);
      toast({
        title: "Error",
        description: "Failed to update payout request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStats = () => {
    const totalRequests = payoutRequests.length;
    const pendingRequests = payoutRequests.filter((r) => r.status === "pending").length;
    const completedRequests = payoutRequests.filter((r) => r.status === "completed").length;
    const combinedRequests = payoutRequests.filter((r) => r.payoutType === "combined").length;
    const totalAmount = payoutRequests
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.requestedAmount, 0);

    return {
      totalRequests,
      pendingRequests,
      completedRequests,
      combinedRequests,
      totalAmount,
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading payout requests...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold text-[#3D2E17]">{stats.totalRequests}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-[#3D2E17]">{stats.pendingRequests}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-[#006B3E]" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-[#3D2E17]">{stats.completedRequests}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Combined</p>
                <p className="text-2xl font-bold text-[#3D2E17]">{stats.combinedRequests}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-teal-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-[#3D2E17]">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, dispensary, or request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="combined">Combined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Payout Requests Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispensary</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">No payout requests found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{(request as any).dispensaryName}</TableCell>
                      <TableCell>{(request as any).userName}</TableCell>
                      <TableCell>
                        {request.payoutType === 'combined' ? (
                          <Badge className="bg-purple-600">
                            <Users className="h-3 w-3 mr-1" />
                            Combined ({request.staffIncluded?.length || 0})
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <User className="h-3 w-3 mr-1" />
                            Individual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-bold text-[#006B3E]">
                        {formatCurrency(request.requestedAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPayoutStatusColor(request.status)}>
                          {getPayoutStatusLabel(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date((request.createdAt as any).toDate()).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === 'pending' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleProcessRequest(request)}
                              className="bg-[#006B3E] hover:bg-[#005a33]"
                            >
                              Process
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
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Request Details</DialogTitle>
            <DialogDescription>Request ID: {selectedRequest?.id}</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Dispensary</Label>
                  <p className="font-medium">{(selectedRequest as any).dispensaryName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Requester</Label>
                  <p className="font-medium">{(selectedRequest as any).userName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Payout Type</Label>
                  <div className="mt-1">
                    {selectedRequest.payoutType === 'combined' ? (
                      <Badge className="bg-purple-600">
                        <Users className="h-3 w-3 mr-1" />
                        Combined ({selectedRequest.staffIncluded?.length || 0} staff)
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <User className="h-3 w-3 mr-1" />
                        Individual
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge className={getPayoutStatusColor(selectedRequest.status)}>
                      {getPayoutStatusLabel(selectedRequest.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                <Label className="text-xs text-muted-foreground">Requested Amount</Label>
                <p className="text-3xl font-bold text-[#006B3E]">
                  {formatCurrency(selectedRequest.requestedAmount)}
                </p>
              </div>

              {/* Staff Breakdown (for combined payouts) */}
              {selectedRequest.payoutType === 'combined' && selectedRequest.staffBreakdown && (
                <div>
                  <Label className="font-semibold mb-3 block">Staff Breakdown</Label>
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 space-y-2">
                    {selectedRequest.staffBreakdown.map((staff) => (
                      <div
                        key={staff.userId}
                        className="flex justify-between items-center p-2 bg-white dark:bg-black/20 rounded"
                      >
                        <div>
                          <p className="font-medium">{staff.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {staff.role === 'dispensary-admin' ? 'Admin' : 'Staff'}
                          </p>
                        </div>
                        <p className="font-bold text-[#006B3E]">{formatCurrency(staff.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank Details */}
              <div>
                <Label className="font-semibold mb-3 block">Bank Account Details</Label>
                <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-lg p-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Account Holder</Label>
                    <p className="text-sm">{selectedRequest.accountDetails.accountHolder}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank Name</Label>
                    <p className="text-sm">{selectedRequest.accountDetails.bankName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Account Number</Label>
                    <p className="text-sm font-mono">{selectedRequest.accountDetails.accountNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Account Type</Label>
                    <p className="text-sm capitalize">{selectedRequest.accountDetails.accountType}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Branch Code</Label>
                    <p className="text-sm font-mono">{selectedRequest.accountDetails.branchCode}</p>
                  </div>
                </div>
              </div>

              {/* Payment Reference (if completed) */}
              {selectedRequest.paymentReference && (
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Reference</Label>
                  <p className="font-mono text-sm">{selectedRequest.paymentReference}</p>
                </div>
              )}

              {/* Rejection Reason (if rejected) */}
              {selectedRequest.rejectionReason && (
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                  <Label className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Rejection Reason
                  </Label>
                  <p className="text-sm mt-1">{selectedRequest.rejectionReason}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p>{new Date((selectedRequest.createdAt as any).toDate()).toLocaleString()}</p>
                </div>
                {selectedRequest.processedAt && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Processed</Label>
                    <p>{new Date((selectedRequest.processedAt as any).toDate()).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout Request</DialogTitle>
            <DialogDescription>
              Choose an action for this payout request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-[#006B3E]">
                  {formatCurrency(selectedRequest.requestedAmount)}
                </p>
                {selectedRequest.payoutType === 'combined' && (
                  <p className="text-sm text-purple-600 mt-2">
                    Combined payout for {selectedRequest.staffIncluded?.length || 0} staff members
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="paymentRef">Payment Reference (for approval)</Label>
                  <Input
                    id="paymentRef"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter payment/transaction reference"
                  />
                </div>

                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason (if rejecting)</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleUpdateStatus('rejected')}
              disabled={processing || !rejectionReason}
              className="w-full sm:w-auto"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              variant="default"
              onClick={() => handleUpdateStatus('completed')}
              disabled={processing || !paymentReference}
              className="w-full sm:w-auto bg-[#006B3E] hover:bg-[#005a33]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? "Processing..." : "Complete Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
