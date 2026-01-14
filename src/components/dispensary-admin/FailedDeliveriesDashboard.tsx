'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Calendar, DollarSign, Eye, Filter, Phone, User, XCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DriverDelivery, DeliveryFailureReason } from '@/types/driver';
import { getFailureReasonLabel } from '@/types/driver';
import { formatDistanceToNow } from 'date-fns';

interface FailedDeliveriesDashboardProps {
  dispensaryId: string;
}

export default function FailedDeliveriesDashboard({ dispensaryId }: FailedDeliveriesDashboardProps) {
  const [failedDeliveries, setFailedDeliveries] = useState<DriverDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DriverDelivery | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Filters
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    const q = query(
      collection(db, 'deliveries'),
      where('dispensaryId', '==', dispensaryId),
      where('status', '==', 'failed'),
      orderBy('failedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const deliveries: DriverDelivery[] = [];
        snapshot.forEach((doc) => {
          deliveries.push({ id: doc.id, ...doc.data() } as DriverDelivery);
        });
        setFailedDeliveries(deliveries);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching failed deliveries:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dispensaryId]);

  const filteredDeliveries = failedDeliveries.filter((delivery) => {
    if (reasonFilter !== 'all' && delivery.failureReason !== reasonFilter) return false;
    if (driverFilter !== 'all' && delivery.driverName !== driverFilter) return false;
    if (paymentFilter === 'paid' && !delivery.driverPaidDespiteFailure) return false;
    if (paymentFilter === 'not_paid' && delivery.driverPaidDespiteFailure) return false;
    return true;
  });

  const uniqueDrivers = Array.from(new Set(failedDeliveries.map((d) => d.driverName)));

  const totalPaidDespiteFailure = failedDeliveries
    .filter((d) => d.driverPaidDespiteFailure)
    .reduce((sum, d) => sum + d.driverEarnings, 0);

  const totalUnpaidFailures = failedDeliveries
    .filter((d) => !d.driverPaidDespiteFailure)
    .reduce((sum, d) => sum + d.driverEarnings, 0);

  const handleViewDetails = (delivery: DriverDelivery) => {
    setSelectedDelivery(delivery);
    setShowDetailsDialog(true);
  };

  const getFailureCategoryColor = (reason?: DeliveryFailureReason): string => {
    if (!reason) return 'bg-gray-500';
    
    const customerIssues = ['customer_no_show', 'customer_not_home', 'customer_refused', 'customer_wrong_address', 'unsafe_location'];
    const locationIssues = ['cannot_find_address', 'access_denied', 'location_inaccessible'];
    const driverIssues = ['driver_vehicle_issue', 'driver_emergency', 'driver_error'];
    
    if (customerIssues.includes(reason)) return 'bg-orange-500';
    if (locationIssues.includes(reason)) return 'bg-blue-500';
    if (driverIssues.includes(reason)) return 'bg-red-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Loading failed deliveries...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Failed Deliveries
          </CardTitle>
          <CardDescription>
            Track and analyze failed delivery attempts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Failed</p>
                    <p className="text-2xl font-bold">{failedDeliveries.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Despite Failure</p>
                    <p className="text-2xl font-bold text-green-600">
                      R{totalPaidDespiteFailure.toFixed(2)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Not Paid</p>
                    <p className="text-2xl font-bold text-red-600">
                      R{totalUnpaidFailures.toFixed(2)}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="customer_no_show">Customer No Show</SelectItem>
                  <SelectItem value="customer_not_home">Customer Not Home</SelectItem>
                  <SelectItem value="customer_refused">Customer Refused</SelectItem>
                  <SelectItem value="customer_wrong_address">Wrong Address</SelectItem>
                  <SelectItem value="unsafe_location">Unsafe Location</SelectItem>
                  <SelectItem value="cannot_find_address">Cannot Find Address</SelectItem>
                  <SelectItem value="access_denied">Access Denied</SelectItem>
                  <SelectItem value="location_inaccessible">Location Inaccessible</SelectItem>
                  <SelectItem value="driver_vehicle_issue">Driver Vehicle Issue</SelectItem>
                  <SelectItem value="driver_emergency">Driver Emergency</SelectItem>
                  <SelectItem value="driver_error">Driver Error</SelectItem>
                  <SelectItem value="system_error">System Error</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by driver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {uniqueDrivers.map((driver) => (
                    <SelectItem key={driver} value={driver}>
                      {driver}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by payment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Driver Paid</SelectItem>
                  <SelectItem value="not_paid">Driver Not Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Failed Deliveries Table */}
          {filteredDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <XCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Failed Deliveries</h3>
              <p className="text-sm text-muted-foreground">
                {failedDeliveries.length === 0
                  ? 'All deliveries have been successful'
                  : 'No deliveries match the selected filters'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Failure Reason</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">
                        #{delivery.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {delivery.driverName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{delivery.customerName}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {delivery.customerPhone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getFailureCategoryColor(delivery.failureReason)}>
                          {delivery.failureReason
                            ? getFailureReasonLabel(delivery.failureReason)
                            : 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {delivery.failedAt
                            ? formatDistanceToNow((delivery.failedAt as Timestamp).toDate(), {
                                addSuffix: true,
                              })
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {delivery.driverPaidDespiteFailure ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                            Not Paid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        R{delivery.driverEarnings.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(delivery)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Failed Delivery Details</DialogTitle>
            <DialogDescription>
              Order #{selectedDelivery?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-4">
              {/* Delivery Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Driver</p>
                  <p className="text-sm">{selectedDelivery.driverName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p className="text-sm">{selectedDelivery.customerName}</p>
                  <p className="text-xs text-muted-foreground">{selectedDelivery.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Failed</p>
                  <p className="text-sm">
                    {selectedDelivery.failedAt
                      ? formatDistanceToNow((selectedDelivery.failedAt as Timestamp).toDate(), {
                          addSuffix: true,
                        })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Earnings</p>
                  <p className="text-sm font-bold">R{selectedDelivery.driverEarnings.toFixed(2)}</p>
                </div>
              </div>

              {/* Failure Reason */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Failure Reason</p>
                <Badge className={getFailureCategoryColor(selectedDelivery.failureReason)}>
                  {selectedDelivery.failureReason
                    ? getFailureReasonLabel(selectedDelivery.failureReason)
                    : 'Unknown'}
                </Badge>
              </div>

              {/* Payment Status */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Payment Status</p>
                {selectedDelivery.driverPaidDespiteFailure ? (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      ✅ Driver was paid R{selectedDelivery.driverEarnings.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      Failure was not driver's fault
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      ❌ Payment not processed
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Driver-side issue
                    </p>
                  </div>
                )}
              </div>

              {/* Failure Note */}
              {selectedDelivery.failureNote && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Driver's Explanation</p>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm whitespace-pre-wrap">{selectedDelivery.failureNote}</p>
                  </div>
                </div>
              )}

              {/* Delivery Address */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Delivery Address</p>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">{selectedDelivery.deliveryAddress.streetAddress}</p>
                  {selectedDelivery.deliveryAddress.suburb && (
                    <p className="text-sm">{selectedDelivery.deliveryAddress.suburb}</p>
                  )}
                  <p className="text-sm">{selectedDelivery.deliveryAddress.city}</p>
                </div>
              </div>

              {/* Photos Placeholder */}
              {selectedDelivery.failurePhotos && selectedDelivery.failurePhotos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Photo Evidence</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDelivery.failurePhotos.length} photo(s) attached
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
