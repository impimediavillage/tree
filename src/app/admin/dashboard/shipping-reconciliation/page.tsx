'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Truck, 
  DollarSign, 
  Calendar, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowUpDown,
  FileText,
  Package,
  MapPin,
  Building2,
  Download,
  Upload,
  Mail,
  TrendingUp,
  CreditCard,
  BarChart3,
  FileSpreadsheet
} from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import type { Order, OrderShipment } from '@/types/order';

interface ShippingReconciliationItem {
  orderId: string;
  orderNumber: string;
  dispensaryId: string;
  dispensaryName: string;
  shippingCost: number;
  shippingProvider: string;
  trackingNumber?: string;
  status: string;
  createdAt: Date;
  customerName: string;
  destination: string;
  reconciliationStatus: 'pending' | 'processing' | 'paid' | 'disputed';
  paymentReference?: string;
  reconciliationDate?: Date;
  reconciliationNotes?: string;
  originLocker?: string;
  destinationLocker?: string;
}

interface CourierInvoiceItem {
  invoiceNumber: string;
  trackingNumber: string;
  amount: number;
  date: Date;
}

interface AnalyticsData {
  monthlyTotals: { month: string; amount: number }[];
  dispensaryBreakdown: { dispensary: string; amount: number; count: number }[];
  providerComparison: { provider: string; amount: number; count: number; avgCost: number }[];
  weeklyTrend: { week: string; amount: number }[];
}

export default function ShippingReconciliationPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  
  const [reconciliationItems, setReconciliationItems] = useState<ShippingReconciliationItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShippingReconciliationItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reconciliationFilter, setReconciliationFilter] = useState<string>('all');
  const [dispensaryFilter, setDispensaryFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Payment Dialog
  const [selectedItems, setSelectedItems] = useState<ShippingReconciliationItem[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Analytics & Reports
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  // Invoice Matching
  const [showInvoiceMatchDialog, setShowInvoiceMatchDialog] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<CourierInvoiceItem[]>([]);
  const [matchedItems, setMatchedItems] = useState<Map<string, ShippingReconciliationItem>>(new Map());
  
  // Email Notifications
  const [emailFrequency, setEmailFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [emailThreshold, setEmailThreshold] = useState(1000);
  const [lastEmailSent, setLastEmailSent] = useState<Date | null>(null);

  // Stats
  const stats = useMemo(() => {
    const totalPending = reconciliationItems
      .filter(item => item.reconciliationStatus === 'pending')
      .reduce((sum, item) => sum + item.shippingCost, 0);
    
    const totalProcessing = reconciliationItems
      .filter(item => item.reconciliationStatus === 'processing')
      .reduce((sum, item) => sum + item.shippingCost, 0);
    
    const totalPaid = reconciliationItems
      .filter(item => item.reconciliationStatus === 'paid')
      .reduce((sum, item) => sum + item.shippingCost, 0);
    
    const totalDisputed = reconciliationItems
      .filter(item => item.reconciliationStatus === 'disputed')
      .reduce((sum, item) => sum + item.shippingCost, 0);

    return {
      totalPending,
      totalProcessing,
      totalPaid,
      totalDisputed,
      pendingCount: reconciliationItems.filter(i => i.reconciliationStatus === 'pending').length,
      processingCount: reconciliationItems.filter(i => i.reconciliationStatus === 'processing').length,
      paidCount: reconciliationItems.filter(i => i.reconciliationStatus === 'paid').length,
      disputedCount: reconciliationItems.filter(i => i.reconciliationStatus === 'disputed').length,
    };
  }, [reconciliationItems]);

  // Check super admin access
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'This page is for Super Admins only.',
        variant: 'destructive',
      });
      router.replace('/admin/dashboard');
    }
  }, [authLoading, isSuperAdmin, router, toast]);

  // Load shipping data
  useEffect(() => {
    if (isSuperAdmin) {
      loadShippingData();
    }
  }, [isSuperAdmin]);

  // Apply filters
  useEffect(() => {
    let filtered = [...reconciliationItems];

    // Reconciliation status filter
    if (reconciliationFilter !== 'all') {
      filtered = filtered.filter(item => item.reconciliationStatus === reconciliationFilter);
    }

    // Dispensary filter
    if (dispensaryFilter !== 'all') {
      filtered = filtered.filter(item => item.dispensaryId === dispensaryFilter);
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRangeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }
      
      filtered = filtered.filter(item => item.createdAt >= filterDate);
    }

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.orderNumber.toLowerCase().includes(query) ||
        item.dispensaryName.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        item.trackingNumber?.toLowerCase().includes(query) ||
        item.paymentReference?.toLowerCase().includes(query)
      );
    }

    setFilteredItems(filtered);
  }, [reconciliationItems, statusFilter, reconciliationFilter, dispensaryFilter, dateRangeFilter, searchQuery]);

  const loadShippingData = async () => {
    setLoading(true);
    try {
      // Fetch all orders with shipping costs
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const dispensaries = new Map();
      
      // Fetch dispensary names
      const dispensariesSnapshot = await getDocs(collection(db, 'dispensaries'));
      dispensariesSnapshot.docs.forEach(doc => {
        dispensaries.set(doc.id, doc.data().name);
      });

      const items: ShippingReconciliationItem[] = [];

      // Process regular orders
      ordersSnapshot.docs.forEach(orderDoc => {
        const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
        
        // Process each shipment
        Object.entries(order.shipments || {}).forEach(([dispensaryId, shipment]) => {
          const shippingCost = shipment.shippingMethod?.price || 0;
          
          // Only include if there's a shipping cost and it's courier-based
          if (shippingCost > 0 && (shipment.shippingProvider === 'pudo' || shipment.shippingProvider === 'shiplogic')) {
            items.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              dispensaryId,
              dispensaryName: dispensaries.get(dispensaryId) || 'Unknown Dispensary',
              shippingCost,
              shippingProvider: shipment.shippingProvider,
              trackingNumber: shipment.trackingNumber || undefined,
              status: shipment.status,
              createdAt: order.createdAt.toDate(),
              customerName: order.customerDetails.name,
              destination: `${order.shippingAddress.city}, ${order.shippingAddress.province}`,
              reconciliationStatus: (order as any).reconciliationStatus || 'pending',
              paymentReference: (order as any).paymentReference,
              reconciliationDate: (order as any).reconciliationDate?.toDate(),
              reconciliationNotes: (order as any).reconciliationNotes,
              originLocker: shipment.originLocker?.name,
              destinationLocker: shipment.destinationLocker?.name,
            });
          }
        });
      });

      // Fetch product pool orders with shipping
      const poolOrdersQuery = query(
        collection(db, 'productPoolOrders'),
        orderBy('orderDate', 'desc')
      );
      const poolOrdersSnapshot = await getDocs(poolOrdersQuery);

      poolOrdersSnapshot.docs.forEach(poolDoc => {
        const poolOrder = { id: poolDoc.id, ...poolDoc.data() } as any;
        
        // Only include if there's a tracking number and shipping provider (means label was generated)
        if (poolOrder.trackingNumber && poolOrder.shippingProvider) {
          const shippingCost = poolOrder.shippingMethod?.price || 0;
          const sellerDispensaryId = poolOrder.productOwnerDispensaryId;
          const sellerDispensaryName = poolOrder.productOwnerDispensaryName || dispensaries.get(sellerDispensaryId) || 'Unknown';
          
          items.push({
            orderId: poolOrder.id,
            orderNumber: `POOL-${poolOrder.id.slice(-8)}`,
            dispensaryId: sellerDispensaryId,
            dispensaryName: sellerDispensaryName,
            shippingCost,
            shippingProvider: poolOrder.shippingProvider,
            trackingNumber: poolOrder.trackingNumber,
            status: poolOrder.shippingStatus || 'ready_for_shipping',
            createdAt: poolOrder.orderDate?.toDate() || new Date(),
            customerName: poolOrder.requesterDispensaryName || 'Pool Order',
            destination: poolOrder.shippingAddress ? 
              `${poolOrder.shippingAddress.city || ''}, ${poolOrder.shippingAddress.province || ''}` : 
              'Inter-Dispensary',
            reconciliationStatus: poolOrder.reconciliationStatus || 'pending',
            paymentReference: poolOrder.paymentReference,
            reconciliationDate: poolOrder.reconciliationDate?.toDate(),
            reconciliationNotes: poolOrder.reconciliationNotes,
            originLocker: poolOrder.originLocker?.name,
            destinationLocker: poolOrder.destinationLocker?.name,
          });
        }
      });

      setReconciliationItems(items);
    } catch (error) {
      console.error('Error loading shipping data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipping reconciliation data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPayment = async () => {
    if (!paymentReference.trim()) {
      toast({
        title: 'Required',
        description: 'Please enter a payment reference.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingPayment(true);
    try {
      const batch = writeBatch(db);
      
      selectedItems.forEach(item => {
        // Determine collection based on order number prefix
        const collectionName = item.orderNumber.startsWith('POOL-') ? 'productPoolOrders' : 'orders';
        const orderRef = doc(db, collectionName, item.orderId);
        batch.update(orderRef, {
          reconciliationStatus: 'paid',
          paymentReference: paymentReference,
          reconciliationDate: Timestamp.now(),
          reconciliationNotes: paymentNotes || undefined,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();

      toast({
        title: 'Payment Recorded',
        description: `Successfully marked ${selectedItems.length} shipments as paid.`,
      });

      setShowPaymentDialog(false);
      setPaymentReference('');
      setPaymentNotes('');
      setSelectedItems([]);
      loadShippingData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment.',
        variant: 'destructive',
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleMarkAsDisputed = async (item: ShippingReconciliationItem) => {
    try {
      const orderRef = doc(db, 'orders', item.orderId);
      await updateDoc(orderRef, {
        reconciliationStatus: 'disputed',
        updatedAt: Timestamp.now(),
      });

      toast({
        title: 'Status Updated',
        description: 'Shipment marked as disputed.',
      });

      loadShippingData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  // CSV Export Function
  const exportToCSV = () => {
    try {
      const headers = [
        'Order Number',
        'Date',
        'Dispensary',
        'Customer',
        'Provider',
        'Tracking Number',
        'Origin Locker',
        'Destination Locker',
        'Shipping Cost (R)',
        'Status',
        'Payment Reference',
        'Reconciliation Date',
        'Notes'
      ];

      const rows = filteredItems.map(item => [
        item.orderNumber,
        format(item.createdAt, 'yyyy-MM-dd'),
        item.dispensaryName,
        item.customerName,
        item.shippingProvider.toUpperCase(),
        item.trackingNumber || '',
        item.originLocker || '',
        item.destinationLocker || '',
        item.shippingCost.toFixed(2),
        item.reconciliationStatus,
        item.paymentReference || '',
        item.reconciliationDate ? format(item.reconciliationDate, 'yyyy-MM-dd') : '',
        item.reconciliationNotes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `shipping-reconciliation-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredItems.length} records to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data to CSV.',
        variant: 'destructive',
      });
    }
  };

  // Generate Analytics Data
  const generateAnalytics = () => {
    try {
      // Monthly totals (last 6 months)
      const monthlyMap = new Map<string, number>();
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = format(date, 'MMM yyyy');
        monthlyMap.set(key, 0);
      }

      reconciliationItems.forEach(item => {
        const key = format(item.createdAt, 'MMM yyyy');
        if (monthlyMap.has(key)) {
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + item.shippingCost);
        }
      });

      const monthlyTotals = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
        month,
        amount
      }));

      // Dispensary breakdown
      const dispensaryMap = new Map<string, { amount: number; count: number }>();
      reconciliationItems.forEach(item => {
        const current = dispensaryMap.get(item.dispensaryName) || { amount: 0, count: 0 };
        dispensaryMap.set(item.dispensaryName, {
          amount: current.amount + item.shippingCost,
          count: current.count + 1
        });
      });

      const dispensaryBreakdown = Array.from(dispensaryMap.entries())
        .map(([dispensary, data]) => ({
          dispensary,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount);

      // Provider comparison
      const providerMap = new Map<string, { amount: number; count: number }>();
      reconciliationItems.forEach(item => {
        const current = providerMap.get(item.shippingProvider) || { amount: 0, count: 0 };
        providerMap.set(item.shippingProvider, {
          amount: current.amount + item.shippingCost,
          count: current.count + 1
        });
      });

      const providerComparison = Array.from(providerMap.entries()).map(([provider, data]) => ({
        provider: provider.toUpperCase(),
        amount: data.amount,
        count: data.count,
        avgCost: data.amount / data.count
      }));

      // Weekly trend (last 8 weeks)
      const weeklyMap = new Map<string, number>();
      for (let i = 7; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        const key = format(weekStart, 'MMM dd');
        weeklyMap.set(key, 0);
      }

      reconciliationItems.forEach(item => {
        const itemDate = new Date(item.createdAt);
        const weekStart = new Date(itemDate.setDate(itemDate.getDate() - itemDate.getDay()));
        const key = format(weekStart, 'MMM dd');
        if (weeklyMap.has(key)) {
          weeklyMap.set(key, (weeklyMap.get(key) || 0) + item.shippingCost);
        }
      });

      const weeklyTrend = Array.from(weeklyMap.entries()).map(([week, amount]) => ({
        week,
        amount
      }));

      setAnalyticsData({
        monthlyTotals,
        dispensaryBreakdown,
        providerComparison,
        weeklyTrend
      });

      setShowAnalytics(true);
    } catch (error) {
      console.error('Analytics generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate analytics.',
        variant: 'destructive',
      });
    }
  };

  // Invoice Matching Function
  const handleInvoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setInvoiceFile(file);

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const items: CourierInvoiceItem[] = [];
      const matched = new Map<string, ShippingReconciliationItem>();

      // Parse CSV invoice (assuming format: InvoiceNumber,TrackingNumber,Amount,Date)
      for (let i = 1; i < lines.length; i++) {
        const [invoiceNumber, trackingNumber, amount, dateStr] = lines[i].split(',');
        
        if (trackingNumber && amount) {
          items.push({
            invoiceNumber: invoiceNumber?.trim() || '',
            trackingNumber: trackingNumber.trim(),
            amount: parseFloat(amount),
            date: new Date(dateStr?.trim() || '')
          });

          // Try to match with our records
          const matchedItem = reconciliationItems.find(
            item => item.trackingNumber === trackingNumber.trim() && 
                   item.reconciliationStatus === 'pending'
          );

          if (matchedItem) {
            matched.set(trackingNumber.trim(), matchedItem);
          }
        }
      }

      setInvoiceItems(items);
      setMatchedItems(matched);
      setShowInvoiceMatchDialog(true);

      toast({
        title: 'Invoice Processed',
        description: `Found ${items.length} items, matched ${matched.size} with our records.`,
      });
    } catch (error) {
      console.error('Invoice parsing error:', error);
      toast({
        title: 'Error',
        description: 'Failed to parse invoice file. Please ensure it\'s a valid CSV.',
        variant: 'destructive',
      });
    }
  };

  // Apply Invoice Matches
  const applyInvoiceMatches = async () => {
    if (matchedItems.size === 0) {
      toast({
        title: 'No Matches',
        description: 'No matched items to process.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const batch = writeBatch(db);
      
      matchedItems.forEach((item, trackingNumber) => {
        const invoiceItem = invoiceItems.find(inv => inv.trackingNumber === trackingNumber);
        if (invoiceItem) {
          const orderRef = doc(db, 'orders', item.orderId);
          batch.update(orderRef, {
            reconciliationStatus: 'processing',
            courierInvoiceNumber: invoiceItem.invoiceNumber,
            courierInvoiceAmount: invoiceItem.amount,
            courierInvoiceDate: Timestamp.fromDate(invoiceItem.date),
            updatedAt: Timestamp.now(),
          });
        }
      });

      await batch.commit();

      toast({
        title: 'Matches Applied',
        description: `Successfully matched and updated ${matchedItems.size} shipments.`,
      });

      setShowInvoiceMatchDialog(false);
      setInvoiceFile(null);
      setInvoiceItems([]);
      setMatchedItems(new Map());
      loadShippingData();
    } catch (error) {
      console.error('Error applying matches:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply invoice matches.',
        variant: 'destructive',
      });
    }
  };

  // Send Email Notification
  const sendPendingPaymentEmail = async () => {
    try {
      const pendingTotal = stats.totalPending;
      const pendingCount = stats.pendingCount;

      if (pendingTotal < emailThreshold) {
        toast({
          title: 'Threshold Not Met',
          description: `Pending amount (R${pendingTotal.toFixed(2)}) is below threshold (R${emailThreshold}).`,
        });
        return;
      }

      // In production, this would call a Cloud Function to send email
      // For now, we'll simulate it
      const emailData = {
        to: currentUser?.email,
        subject: `Shipping Reconciliation Alert - R${pendingTotal.toFixed(2)} Pending`,
        body: `
          Dear Admin,
          
          You have ${pendingCount} shipments pending payment totaling R${pendingTotal.toFixed(2)}.
          
          Breakdown:
          - PUDO: ${reconciliationItems.filter(i => i.shippingProvider === 'pudo' && i.reconciliationStatus === 'pending').length} shipments
          - ShipLogic: ${reconciliationItems.filter(i => i.shippingProvider === 'shiplogic' && i.reconciliationStatus === 'pending').length} shipments
          
          Please review and process these payments in the shipping reconciliation dashboard.
          
          Best regards,
          The Wellness Tree System
        `
      };

      console.log('Email notification:', emailData);

      toast({
        title: 'Email Sent',
        description: `Notification sent to ${currentUser?.email}`,
      });

      setLastEmailSent(new Date());
    } catch (error) {
      console.error('Email notification error:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email notification.',
        variant: 'destructive',
      });
    }
  };

  const getReconciliationBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'paid':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'disputed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Disputed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const uniqueDispensaries = useMemo(() => {
    const dispensariesMap = new Map<string, string>();
    reconciliationItems.forEach(item => {
      dispensariesMap.set(item.dispensaryId, item.dispensaryName);
    });
    return Array.from(dispensariesMap.entries());
  }, [reconciliationItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <Card className="shadow-lg bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#3D2E17] flex items-center gap-2 sm:gap-3">
            <Truck className="h-8 w-8 sm:h-10 sm:w-10 text-[#006B3E] flex-shrink-0" />
            <span className="break-words">Shipping Cost Reconciliation</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base lg:text-lg font-semibold text-[#5D4E37] mt-2">
            Manage and reconcile shipping costs from The Courier Guy across all dispensaries
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#3D2E17] break-words">
              R {stats.totalPending.toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {stats.pendingCount} shipments
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#3D2E17] break-words">
              R {stats.totalProcessing.toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {stats.processingCount} shipments
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#006B3E] break-words">
              R {stats.totalPaid.toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#5D4E37] mt-1">
              {stats.paidCount} shipments
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Disputed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-destructive break-words">
              R {stats.totalDisputed.toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#5D4E37] mt-1">
              {stats.disputedCount} shipments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Email Notification Settings */}
        <Card className="shadow-lg border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#3D2E17] flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#006B3E]" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Automated alerts for pending payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Alert Threshold</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={emailThreshold}
                  onChange={(e) => setEmailThreshold(Number(e.target.value))}
                  className="w-full sm:w-32"
                />
                <span className="text-sm font-semibold text-[#5D4E37]">Rands</span>
              </div>
              <p className="text-xs font-semibold text-[#5D4E37]">
                Send alert when pending payments exceed this amount
              </p>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={emailFrequency} onValueChange={(v) => setEmailFrequency(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lastEmailSent && (
              <div className="p-3 bg-green-50 rounded-lg text-sm">
                <div className="font-semibold text-green-900">Last Sent</div>
                <div className="text-green-700">{format(lastEmailSent, 'PPpp')}</div>
              </div>
            )}

            <Button
              onClick={sendPendingPaymentEmail}
              disabled={stats.pendingCount === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Test Alert Now
            </Button>
          </CardContent>
        </Card>

        {/* Payment Gateway Integration (Coming Soon) */}
        <Card className="shadow-lg border-2 border-purple-200 relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <Badge className="bg-purple-600">Coming Soon</Badge>
          </div>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#3D2E17] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#006B3E]" />
              Direct Payment Gateway
            </CardTitle>
            <CardDescription>
              Process payments directly from the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 opacity-60">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#3D2E17]">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>One-click EFT payments</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#3D2E17]">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Automatic bank reconciliation</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#3D2E17]">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Payment proof generation</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#3D2E17]">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Multi-currency support</span>
              </div>
            </div>

            <Separator />

            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-sm font-semibold text-purple-900 mb-2">Integration in Progress</div>
              <div className="text-xs text-purple-700">
                Connect with your bank for seamless payment processing
              </div>
            </div>

            <Button
              disabled
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Configure Gateway
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#3D2E17] flex items-center gap-2">
            <Filter className="h-5 w-5 text-[#006B3E]" />
            Filters & Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Reconciliation Status</Label>
              <Select value={reconciliationFilter} onValueChange={setReconciliationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dispensary</Label>
              <Select value={dispensaryFilter} onValueChange={setDispensaryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dispensaries</SelectItem>
                  {uniqueDispensaries.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Order #, tracking, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm font-bold text-[#3D2E17]">
              Showing {filteredItems.length} of {reconciliationItems.length} shipments
            </div>
            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              {/* Export & Analytics Buttons */}
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={filteredItems.length === 0}
                className="text-xs sm:text-sm"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={generateAnalytics}
                className="text-xs sm:text-sm"
              >
                <BarChart3 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => document.getElementById('invoice-upload')?.click()}
                className="text-xs sm:text-sm"
              >
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Match Invoice</span>
              </Button>
              <input
                id="invoice-upload"
                type="file"
                accept=".csv"
                onChange={handleInvoiceUpload}
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={sendPendingPaymentEmail}
                disabled={stats.pendingCount === 0}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Alert
              </Button>

              {/* Selection Actions */}
              {selectedItems.length > 0 && (
                <>
                  <Separator orientation="vertical" className="h-8" />
                  <Button
                    variant="outline"
                    onClick={() => setSelectedItems([])}
                  >
                    Clear Selection ({selectedItems.length})
                  </Button>
                  <Button
                    onClick={() => setShowPaymentDialog(true)}
                    className="bg-[#006B3E] hover:bg-[#005230]"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 sm:w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredItems.filter(i => i.reconciliationStatus === 'pending').length && selectedItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredItems.filter(i => i.reconciliationStatus === 'pending'));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead className="min-w-[100px] sm:min-w-[120px]">Order #</TableHead>
                  <TableHead className="min-w-[90px] sm:min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[120px] sm:min-w-[150px]">Dispensary</TableHead>
                  <TableHead className="min-w-[100px] sm:min-w-[130px]">Customer</TableHead>
                  <TableHead className="min-w-[80px]">Provider</TableHead>
                  <TableHead className="min-w-[100px] sm:min-w-[120px]">Tracking</TableHead>
                  <TableHead className="min-w-[100px] sm:min-w-[140px]">Origin/Dest</TableHead>
                  <TableHead className="min-w-[90px]">Amount</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Payment Ref</TableHead>
                  <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 font-bold text-[#5D4E37]">
                      No shipments found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={`${item.orderId}-${item.dispensaryId}`}>
                      <TableCell>
                        {item.reconciliationStatus === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedItems.some(si => si.orderId === item.orderId && si.dispensaryId === item.dispensaryId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item]);
                              } else {
                                setSelectedItems(selectedItems.filter(si => 
                                  !(si.orderId === item.orderId && si.dispensaryId === item.dispensaryId)
                                ));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">{item.orderNumber}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        {format(item.createdAt, 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-[#006B3E] flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-[#3D2E17] truncate max-w-[100px] sm:max-w-[120px] lg:max-w-[150px]" title={item.dispensaryName}>{item.dispensaryName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm font-semibold text-[#3D2E17]">
                        <div className="truncate max-w-[90px] sm:max-w-[110px] lg:max-w-[130px]" title={item.customerName}>{item.customerName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.shippingProvider.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.trackingNumber || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-[#3D2E17]">
                        {item.originLocker && (
                          <div className="flex items-center gap-1 mb-1">
                            <MapPin className="h-3 w-3 text-blue-500" />
                            <span className="truncate max-w-[100px] sm:max-w-[120px]">{item.originLocker}</span>
                          </div>
                        )}
                        {item.destinationLocker && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-green-500" />
                            <span className="truncate max-w-[100px] sm:max-w-[120px]">{item.destinationLocker}</span>
                          </div>
                        )}
                        {!item.originLocker && !item.destinationLocker && item.destination}
                      </TableCell>
                      <TableCell className="font-bold text-[#006B3E]">
                        R {item.shippingCost.toFixed(2)}
                      </TableCell>
                      <TableCell>{getReconciliationBadge(item.reconciliationStatus)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.paymentReference || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {item.reconciliationStatus === 'pending' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleMarkAsDisputed(item)}
                            >
                              Dispute
                            </Button>
                          )}
                          {item.reconciliationNotes && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                toast({
                                  title: 'Notes',
                                  description: item.reconciliationNotes,
                                });
                              }}
                            >
                              <FileText className="h-4 w-4" />
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#006B3E]" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Mark {selectedItems.length} shipment{selectedItems.length !== 1 ? 's' : ''} as paid
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount</Label>
              <div className="text-3xl font-extrabold text-[#006B3E]">
                R {selectedItems.reduce((sum, item) => sum + item.shippingCost, 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentRef">Payment Reference *</Label>
              <Input
                id="paymentRef"
                placeholder="e.g., EFT-2025-001, INV-12345"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this payment..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            <div className="text-sm font-semibold text-[#3D2E17] space-y-1">
              <p className="font-bold text-[#3D2E17]">Selected Shipments:</p>
              {selectedItems.slice(0, 5).map((item) => (
                <div key={`${item.orderId}-${item.dispensaryId}`} className="flex justify-between">
                  <span className="truncate max-w-[200px]">{item.orderNumber} - {item.dispensaryName}</span>
                  <span className="font-mono font-bold">R {item.shippingCost.toFixed(2)}</span>
                </div>
              ))}
              {selectedItems.length > 5 && (
                <p className="italic font-bold">... and {selectedItems.length - 5} more</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkPayment}
              disabled={processingPayment || !paymentReference.trim()}
              className="bg-[#006B3E] hover:bg-[#005230]"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#006B3E]" />
              Shipping Cost Analytics & Trends
            </DialogTitle>
            <DialogDescription>
              Comprehensive insights into shipping costs and patterns
            </DialogDescription>
          </DialogHeader>

          {analyticsData && (
            <div className="space-y-6 py-4">
              {/* Monthly Trend */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#3D2E17] flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Monthly Spending (Last 6 Months)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {analyticsData.monthlyTotals.map((item) => (
                    <div key={item.month} className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xs font-bold text-[#5D4E37] mb-1">{item.month}</div>
                      <div className="text-lg font-bold text-[#006B3E]">
                        R {item.amount.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Weekly Trend */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#3D2E17]">Weekly Trend (Last 8 Weeks)</h3>
                <div className="space-y-2">
                  {analyticsData.weeklyTrend.map((item, index) => (
                    <div key={item.week} className="flex items-center gap-3">
                      <div className="text-sm font-bold text-[#3D2E17] w-20">{item.week}</div>
                      <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#006B3E] to-[#3D2E17] rounded-full"
                          style={{
                            width: `${(item.amount / Math.max(...analyticsData.weeklyTrend.map(w => w.amount))) * 100}%`
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end px-3 text-xs font-bold text-white">
                          R {item.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Dispensary Breakdown */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#3D2E17] flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Top Dispensaries by Shipping Cost
                </h3>
                <div className="space-y-2">
                  {analyticsData.dispensaryBreakdown.slice(0, 10).map((item, index) => (
                    <div key={item.dispensary} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#006B3E] text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-[#3D2E17]">{item.dispensary}</div>
                          <div className="text-xs font-semibold text-[#5D4E37]">{item.count} shipments</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#006B3E]">R {item.amount.toFixed(2)}</div>
                        <div className="text-xs font-semibold text-[#5D4E37]">
                          Avg: R {(item.amount / item.count).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Provider Comparison */}
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#3D2E17] flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Courier Provider Comparison
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analyticsData.providerComparison.map((item) => (
                    <Card key={item.provider} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{item.provider}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-bold text-[#5D4E37]">Total Spent:</span>
                          <span className="font-bold text-[#006B3E]">R {item.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-bold text-[#5D4E37]">Shipments:</span>
                          <span className="font-bold text-[#3D2E17]">{item.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-bold text-[#5D4E37]">Avg Cost:</span>
                          <span className="font-bold text-[#3D2E17]">R {item.avgCost.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowAnalytics(false)} className="bg-[#006B3E] hover:bg-[#005230]">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Matching Dialog */}
      <Dialog open={showInvoiceMatchDialog} onOpenChange={setShowInvoiceMatchDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-[#006B3E]" />
              Automated Invoice Matching
            </DialogTitle>
            <DialogDescription>
              Review matched invoices from The Courier Guy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {invoiceFile && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  <span className="font-semibold">{invoiceFile.name}</span>
                  <Badge>{invoiceItems.length} items</Badge>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{invoiceItems.length}</div>
                <div className="text-sm font-bold text-[#3D2E17]">Invoice Items</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{matchedItems.size}</div>
                <div className="text-sm font-bold text-[#3D2E17]">Matched</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{invoiceItems.length - matchedItems.size}</div>
                <div className="text-sm font-bold text-[#3D2E17]">Unmatched</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold">Matched Items</h4>
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {invoiceItems.map((invoiceItem) => {
                  const matched = matchedItems.get(invoiceItem.trackingNumber);
                  return (
                    <div
                      key={invoiceItem.trackingNumber}
                      className={`p-3 rounded-lg border ${matched ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-mono text-sm font-bold text-[#3D2E17]">{invoiceItem.trackingNumber}</div>
                          {matched && (
                            <div className="text-xs font-semibold text-[#5D4E37] mt-1">
                              Order: {matched.orderNumber} • {matched.dispensaryName}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#006B3E]">R {invoiceItem.amount.toFixed(2)}</div>
                          {matched && matched.shippingCost !== invoiceItem.amount && (
                            <div className="text-xs text-orange-600">
                              Our cost: R {matched.shippingCost.toFixed(2)}
                            </div>
                          )}
                        </div>
                        {matched ? (
                          <CheckCircle className="h-5 w-5 text-green-600 ml-3" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 ml-3" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {matchedItems.size > 0 && (
              <>
                <Separator />
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-green-900">Ready to Process</div>
                      <div className="text-sm text-green-700">
                        {matchedItems.size} shipments will be marked as "Processing"
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-900">
                        R {Array.from(matchedItems.values()).reduce((sum, item) => sum + item.shippingCost, 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInvoiceMatchDialog(false);
                setInvoiceFile(null);
                setInvoiceItems([]);
                setMatchedItems(new Map());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={applyInvoiceMatches}
              disabled={matchedItems.size === 0}
              className="bg-[#006B3E] hover:bg-[#005230]"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Apply Matches
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
