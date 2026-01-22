'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Store,
  CreditCard,
  Truck,
  Users,
  Calendar,
  Download,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Settings,
  ChevronRight,
  Building2,
  Leaf,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Types
interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  treehouseEarnings: number;
  dispensaryRevenue: number;
  shippingCosts: number;
  creditTransactions: number;
  platformFees: number;
  pendingPayments: number;
  completedPayments: number;
  influencerRevenue: number;
  influencerCommissions: number;
  influencerROI: number;
}

interface TreehouseTransaction {
  id: string;
  creatorId: string;
  creatorName: string;
  productId: string;
  productName: string;
  orderDate: Date;
  amount: number;
  commission: number;
  status: 'pending' | 'paid' | 'disputed';
  paymentDate?: Date;
}

interface DispensaryRevenue {
  id: string;
  dispensaryId: string;
  dispensaryName: string;
  month: string;
  revenue: number;
  orders: number;
  platformFee: number;
  netRevenue: number;
  status: 'pending' | 'processed' | 'paid';
}

interface CreditTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  amount: number;
  credits: number;
  date: Date;
  description: string;
  status: 'completed' | 'pending' | 'failed';
}

interface PlatformFee {
  id: string;
  source: 'treehouse' | 'dispensary' | 'shipping';
  month: string;
  baseAmount: number;
  feePercentage: number;
  feeAmount: number;
  collected: boolean;
  notes: string;
}

type SidePanel = 'overview' | 'treehouse' | 'dispensaries' | 'shipping' | 'credits' | 'fees' | 'influencers';

export default function FinancialHubPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // State
  const [activePanel, setActivePanel] = useState<SidePanel>('overview');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'month' | 'year' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Financial Data
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    treehouseEarnings: 0,
    dispensaryRevenue: 0,
    shippingCosts: 0,
    creditTransactions: 0,
    platformFees: 0,
    pendingPayments: 0,
    completedPayments: 0,
    influencerRevenue: 0,
    influencerCommissions: 0,
    influencerROI: 0,
  });

  const [treehouseTransactions, setTreehouseTransactions] = useState<TreehouseTransaction[]>([]);
  const [dispensaryRevenues, setDispensaryRevenues] = useState<DispensaryRevenue[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [platformFees, setPlatformFees] = useState<PlatformFee[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<{ date: string; revenue: number; profit: number }[]>([]);

  // Modal States
  const [showAddTreehouseModal, setShowAddTreehouseModal] = useState(false);
  const [showAddDispensaryModal, setShowAddDispensaryModal] = useState(false);
  const [showAddCreditModal, setShowAddCreditModal] = useState(false);
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form States
  const [treehouseForm, setTreehouseForm] = useState({ creatorName: '', productName: '', amount: 0, commission: 0 });
  const [dispensaryForm, setDispensaryForm] = useState({ dispensaryName: '', revenue: 0, orders: 0 });
  const [creditForm, setCreditForm] = useState({ userName: '', type: 'purchase', amount: 0, credits: 0, description: '' });
  const [feeForm, setFeeForm] = useState({ source: 'treehouse', baseAmount: 0, feePercentage: 5, notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load financial data
  useEffect(() => {
    if (currentUser) {
      loadFinancialData();
    }
  }, [currentUser, dateRange]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate(dateRange);

      // Load Treehouse transactions
      const treehouseQuery = query(
        collection(db, 'orders'),
        where('creatorId', '!=', null),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
      const treehouseSnap = await getDocs(treehouseQuery);
      const treehouseTxns = treehouseSnap.docs.map(doc => {
        const data = doc.data();
        // Use new pricing fields if available, fallback to legacy calculation
        const amount = data.totalAmount || 0;
        const commission = data.totalPlatformCommission ?? (amount * 0.25); // New field or 25% legacy
        return {
          id: doc.id,
          creatorId: data.creatorId || '',
          creatorName: data.creatorName || 'Unknown',
          productId: data.productId || '',
          productName: data.productName || 'Unknown Product',
          orderDate: data.createdAt?.toDate() || new Date(),
          amount,
          commission,
          status: data.paymentStatus || 'pending',
          paymentDate: data.paymentDate?.toDate(),
        } as TreehouseTransaction;
      });
      setTreehouseTransactions(treehouseTxns);

      // Load Dispensary revenues (from orders)
      const dispensaryQuery = query(
        collection(db, 'orders'),
        where('dispensaryId', '!=', null),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
      const dispensarySnap = await getDocs(dispensaryQuery);
      
      // Aggregate by dispensary and month
      const revenueMap = new Map<string, DispensaryRevenue>();
      dispensarySnap.docs.forEach(doc => {
        const data = doc.data();
        const dispensaryId = data.dispensaryId;
        const month = format(data.createdAt?.toDate() || new Date(), 'yyyy-MM');
        const key = `${dispensaryId}-${month}`;
        
        // Use new pricing fields if available
        const totalAmount = data.totalAmount || 0;
        const platformCommission = data.totalPlatformCommission ?? (totalAmount * 0.25); // Default to 25% for legacy
        const dispensaryEarnings = data.totalDispensaryEarnings ?? (totalAmount - platformCommission);
        
        if (revenueMap.has(key)) {
          const existing = revenueMap.get(key)!;
          existing.revenue += totalAmount;
          existing.orders += 1;
          existing.platformFee += platformCommission;
          existing.netRevenue += dispensaryEarnings;
        } else {
          revenueMap.set(key, {
            id: key,
            dispensaryId,
            dispensaryName: data.dispensaryName || 'Unknown',
            month,
            revenue: totalAmount,
            orders: 1,
            platformFee: platformCommission,
            netRevenue: dispensaryEarnings,
            status: 'pending',
          });
        }
      });
      setDispensaryRevenues(Array.from(revenueMap.values()));

      // Load Credit transactions
      const creditsQuery = query(
        collection(db, 'creditTransactions'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const creditsSnap = await getDocs(creditsQuery);
      const creditTxns = creditsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || '',
          userName: data.userName || 'Unknown',
          type: data.type || 'purchase',
          amount: data.amount || 0,
          credits: data.credits || 0,
          date: data.createdAt?.toDate() || new Date(),
          description: data.description || '',
          status: data.status || 'completed',
        } as CreditTransaction;
      });
      setCreditTransactions(creditTxns);

      // Load Platform fees
      const feesQuery = query(
        collection(db, 'platformFees'),
        orderBy('month', 'desc'),
        limit(12)
      );
      const feesSnap = await getDocs(feesQuery);
      const fees = feesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          source: data.source || 'treehouse',
          month: data.month || '',
          baseAmount: data.baseAmount || 0,
          feePercentage: data.feePercentage || 5,
          feeAmount: data.feeAmount || 0,
          collected: data.collected || false,
          notes: data.notes || '',
        } as PlatformFee;
      });
      setPlatformFees(fees);

      // Fetch Influencer Program data
      const influencerCommissionsQuery = query(
        collection(db, 'influencerCommissions'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
      const influencerCommissionsSnap = await getDocs(influencerCommissionsQuery);
      const influencerRevenue = influencerCommissionsSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.orderTotal || 0);
      }, 0);
      const influencerCommissions = influencerCommissionsSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.commissionAmount || 0);
      }, 0);
      const influencerROI = influencerCommissions > 0 
        ? ((influencerRevenue - influencerCommissions) / influencerCommissions) * 100 
        : 0;

      // Calculate shipping costs from orders and pool orders
      let totalShipping = 0;
      
      // Shipping costs from regular orders
      dispensarySnap.docs.forEach(doc => {
        const data = doc.data();
        const shipments = data.shipments || {};
        Object.values(shipments).forEach((shipment: any) => {
          if (shipment.shippingMethod?.price && 
              (shipment.shippingProvider === 'pudo' || shipment.shippingProvider === 'shiplogic')) {
            totalShipping += shipment.shippingMethod.price;
          }
        });
      });
      
      // Shipping costs from product pool orders
      const poolOrdersQuery = query(
        collection(db, 'productPoolOrders'),
        where('orderDate', '>=', Timestamp.fromDate(startDate))
      );
      const poolOrdersSnap = await getDocs(poolOrdersQuery);
      poolOrdersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.shippingMethod?.price && data.trackingNumber) {
          totalShipping += data.shippingMethod.price;
        }
      });

      // Calculate metrics
      const treehouseTotal = treehouseTxns.reduce((sum, t) => sum + t.commission, 0);
      const dispensaryTotal = Array.from(revenueMap.values()).reduce((sum, r) => sum + r.platformFee, 0);
      const creditTotal = creditTxns.filter(c => c.type === 'purchase').reduce((sum, c) => sum + c.amount, 0);
      const feesTotal = fees.reduce((sum, f) => sum + f.feeAmount, 0);
      const totalRevenue = treehouseTotal + dispensaryTotal + creditTotal + feesTotal + influencerRevenue;
      const totalExpenses = totalShipping + influencerCommissions;
      const netProfit = totalRevenue - totalExpenses;

      setMetrics({
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        treehouseEarnings: treehouseTotal,
        dispensaryRevenue: dispensaryTotal,
        shippingCosts: totalShipping,
        creditTransactions: creditTotal,
        platformFees: feesTotal,
        pendingPayments: treehouseTxns.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.commission, 0),
        completedPayments: treehouseTxns.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.commission, 0),
        influencerRevenue,
        influencerCommissions,
        influencerROI,
      });

      // Calculate daily revenue for charts
      const dailyRevenue = new Map<string, { revenue: number; profit: number }>();
      treehouseTxns.forEach(t => {
        const date = format(t.orderDate, 'yyyy-MM-dd');
        if (dailyRevenue.has(date)) {
          dailyRevenue.get(date)!.revenue += t.commission;
        } else {
          dailyRevenue.set(date, { revenue: t.commission, profit: t.commission });
        }
      });
      
      Array.from(revenueMap.values()).forEach(r => {
        const date = `${r.month}-01`;
        if (dailyRevenue.has(date)) {
          dailyRevenue.get(date)!.revenue += r.platformFee;
        } else {
          dailyRevenue.set(date, { revenue: r.platformFee, profit: r.platformFee });
        }
      });

      setRevenueByDay(
        Array.from(dailyRevenue.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30) // Last 30 days
      );

    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load financial data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case '7d': return subDays(now, 7);
      case '30d': return subDays(now, 30);
      case '90d': return subDays(now, 90);
      case 'month': return startOfMonth(now);
      case 'year': return startOfYear(now);
      case 'all': return new Date(2020, 0, 1);
      default: return subDays(now, 30);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data available to export',
        variant: 'destructive',
      });
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: `${filename} exported successfully`,
    });
  };

  const handleUpdateStatus = async (collection: string, id: string, status: string) => {
    try {
      if (collection === 'orders') {
        // Update payment status for orders
        await updateDoc(doc(db, collection, id), { 
          paymentStatus: status,
          updatedAt: Timestamp.now()
        });
      } else {
        await updateDoc(doc(db, collection, id), { 
          status,
          updatedAt: Timestamp.now()
        });
      }
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
      loadFinancialData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleAddTreehouse = async () => {
    if (!treehouseForm.creatorName || !treehouseForm.productName || treehouseForm.amount <= 0) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'orders'), {
        creatorName: treehouseForm.creatorName,
        productName: treehouseForm.productName,
        totalAmount: treehouseForm.amount,
        commission: treehouseForm.amount * 0.25,
        paymentStatus: 'pending',
        orderType: 'treehouse',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast({ title: 'Success', description: 'Transaction added successfully' });
      setShowAddTreehouseModal(false);
      setTreehouseForm({ creatorName: '', productName: '', amount: 0, commission: 0 });
      loadFinancialData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({ title: 'Error', description: 'Failed to add transaction', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCredit = async () => {
    if (!creditForm.userName || creditForm.amount <= 0 || creditForm.credits <= 0) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'creditTransactions'), {
        userName: creditForm.userName,
        type: creditForm.type,
        amount: creditForm.amount,
        credits: creditForm.credits,
        description: creditForm.description,
        status: 'completed',
        createdAt: Timestamp.now(),
      });
      toast({ title: 'Success', description: 'Credit transaction added successfully' });
      setShowAddCreditModal(false);
      setCreditForm({ userName: '', type: 'purchase', amount: 0, credits: 0, description: '' });
      loadFinancialData();
    } catch (error) {
      console.error('Error adding credit:', error);
      toast({ title: 'Error', description: 'Failed to add credit transaction', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFee = async () => {
    if (feeForm.baseAmount <= 0 || feeForm.feePercentage <= 0) {
      toast({ title: 'Error', description: 'Please enter valid amounts', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const month = format(new Date(), 'yyyy-MM');
      const feeAmount = (feeForm.baseAmount * feeForm.feePercentage) / 100;
      await addDoc(collection(db, 'platformFees'), {
        source: feeForm.source,
        month,
        baseAmount: feeForm.baseAmount,
        feePercentage: feeForm.feePercentage,
        feeAmount,
        collected: false,
        notes: feeForm.notes,
        createdAt: Timestamp.now(),
      });
      toast({ title: 'Success', description: 'Platform fee added successfully' });
      setShowAddFeeModal(false);
      setFeeForm({ source: 'treehouse', baseAmount: 0, feePercentage: 5, notes: '' });
      loadFinancialData();
    } catch (error) {
      console.error('Error adding fee:', error);
      toast({ title: 'Error', description: 'Failed to add platform fee', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee record?')) return;
    try {
      await deleteDoc(doc(db, 'platformFees', id));
      toast({ title: 'Success', description: 'Fee deleted successfully' });
      loadFinancialData();
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast({ title: 'Error', description: 'Failed to delete fee', variant: 'destructive' });
    }
  };

  // Side Panel Navigation
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'treehouse', label: 'Treehouse', icon: Leaf },
    { id: 'dispensaries', label: 'Dispensaries', icon: Building2 },
    { id: 'influencers', label: 'Influencer Program', icon: Users },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'credits', label: 'Credits', icon: CreditCard },
    { id: 'fees', label: 'Platform Fees', icon: Receipt },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin text-[#006B3E] mx-auto mb-4" />
          <p className="text-lg text-[#5D4E37]">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F3EF] to-white">
      <div className="flex">
        {/* Side Panel */}
        <div className="w-64 min-h-screen bg-white border-r-2 border-[#E5E1D8] shadow-lg">
          <div className="p-6 border-b-2 border-[#E5E1D8]">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-8 w-8 text-[#006B3E]" />
              <h2 className="text-xl font-bold text-[#3D2E17]">Financial Hub</h2>
            </div>
            <p className="text-sm text-[#5D4E37]">Platform Reconciliation</p>
          </div>

          <nav className="p-4 space-y-2">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const isActive = activePanel === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePanel(item.id as SidePanel)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#006B3E] to-[#008B4E] text-white shadow-lg'
                      : 'hover:bg-[#F5F3EF] text-[#3D2E17]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-semibold">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t-2 border-[#E5E1D8] mt-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push('/admin/dashboard/shipping-reconciliation')}
            >
              <Truck className="h-4 w-4 mr-2" />
              Shipping Reconciliation
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#3D2E17] mb-2">
                {navigationItems.find(i => i.id === activePanel)?.label}
              </h1>
              <p className="text-[#5D4E37]">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  const data = activePanel === 'treehouse' ? treehouseTransactions :
                    activePanel === 'dispensaries' ? dispensaryRevenues :
                    activePanel === 'credits' ? creditTransactions :
                    activePanel === 'fees' ? platformFees : [];
                  exportToCSV(data, activePanel);
                }}
                className="bg-[#006B3E] hover:bg-[#005230]"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Overview Panel */}
          {activePanel === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#5D4E37] flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      R{metrics.totalRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-700">
                      <TrendingUp className="h-4 w-4" />
                      <span>Platform earnings</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#5D4E37] flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">
                      R{metrics.totalExpenses.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-red-700">
                      <Truck className="h-4 w-4" />
                      <span>Shipping & costs</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#5D4E37] flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-600" />
                      Net Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      R{metrics.netProfit.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-blue-700">
                      <PieChart className="h-4 w-4" />
                      <span>{metrics.profitMargin.toFixed(1)}% margin</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#5D4E37] flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      Pending Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600">
                      R{metrics.pendingPayments.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-purple-700">
                      <AlertCircle className="h-4 w-4" />
                      <span>Awaiting processing</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* COMMISSION STRUCTURE BREAKDOWN - NEW SECTION */}
              <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                    💰 Commission Structure Breakdown
                  </CardTitle>
                  <CardDescription>
                    Dual-tier commission system: Platform profit (25%) distribution
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Platform Profit Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                      <p className="text-xs font-semibold text-blue-600 mb-1">TOTAL PLATFORM PROFIT (25%)</p>
                      <p className="text-2xl font-black text-blue-700">
                        R{(metrics.totalRevenue * 0.25).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">25% of all dispensary sales</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-2 border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-600 mb-1">INFLUENCER BASE COMMISSIONS</p>
                      <p className="text-2xl font-black text-emerald-700">
                        R{(metrics.influencerCommissions * 0.75 || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">Tier-based (5-20% of platform profit)</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-2 border-amber-200">
                      <p className="text-xs font-semibold text-amber-600 mb-1">INFLUENCER AD BONUSES</p>
                      <p className="text-2xl font-black text-amber-700">
                        R{(metrics.influencerCommissions * 0.25 || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">Paid by dispensaries (max 5%)</p>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Platform Revenue Flow */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-[#3D2E17] flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Platform Revenue Flow
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-lg border border-green-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-green-800">💵 Gross Platform Profit (25%)</span>
                            <span className="font-bold text-green-700">
                              R{(metrics.totalRevenue * 0.25).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-green-700">Total 25% commission collected from all sales</p>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-100 to-teal-100 p-4 rounded-lg border border-emerald-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-emerald-800">💰 Influencer Base Paid Out</span>
                            <span className="font-bold text-red-600">
                              -R{(metrics.influencerCommissions * 0.75 || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700">Tier-based commissions (Seed 5% → Forest 20%)</p>
                        </div>

                        <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-lg border-2 border-blue-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-blue-800">🏦 Net Platform Revenue</span>
                            <span className="font-black text-blue-700 text-lg">
                              R{((metrics.totalRevenue * 0.25) - (metrics.influencerCommissions * 0.75 || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-blue-700">Platform keeps after base influencer commissions</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Influencer Earnings Breakdown */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-[#3D2E17] flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Influencer Earnings Breakdown
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-emerald-100 to-green-100 p-4 rounded-lg border border-emerald-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-emerald-800">💚 Base Commission (Platform Pays)</span>
                            <span className="font-bold text-emerald-700">
                              R{(metrics.influencerCommissions * 0.75 || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700">From platform's 25% profit pool</p>
                          <div className="mt-2 space-y-1 text-xs text-emerald-600">
                            <p>• Seed (5%): ~{((metrics.influencerCommissions * 0.75 || 0) * 0.05).toFixed(2)}</p>
                            <p>• Sprout (10%): ~{((metrics.influencerCommissions * 0.75 || 0) * 0.40).toFixed(2)}</p>
                            <p>• Growth-Forest (12-20%): ~{((metrics.influencerCommissions * 0.75 || 0) * 0.55).toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 p-4 rounded-lg border border-amber-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-amber-800">🎁 Ad Bonuses (Dispensaries Pay)</span>
                            <span className="font-bold text-amber-700">
                              +R{(metrics.influencerCommissions * 0.25 || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-amber-700">Deducted from dispensary payouts (0-5% max)</p>
                          <p className="text-xs text-amber-600 mt-1">⚠️ Not from platform profit!</p>
                        </div>

                        <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg border-2 border-purple-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-purple-800">💎 Total Influencer Earnings</span>
                            <span className="font-black text-purple-700 text-lg">
                              R{metrics.influencerCommissions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-xs text-purple-700">Base + Bonuses = Total paid this period</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dispensary Impact */}
                  <div className="bg-gradient-to-r from-orange-100 to-red-100 p-4 rounded-lg border-2 border-orange-300">
                    <h3 className="font-bold text-lg text-orange-900 mb-3 flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      💼 Dispensary Payout Impact
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-orange-700 mb-1">Normal Payout (100%)</p>
                        <p className="text-xl font-black text-orange-800">
                          R{metrics.dispensaryRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-1">Ad Bonuses Deducted</p>
                        <p className="text-xl font-black text-red-600">
                          -R{(metrics.influencerCommissions * 0.25 || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-1">Net Dispensary Payout</p>
                        <p className="text-xl font-black text-green-700">
                          R{(metrics.dispensaryRevenue - (metrics.influencerCommissions * 0.25 || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-orange-700 mt-3">
                      💡 Ad bonuses are voluntary (0-5%) and only apply to sales driven by influencer ad promotions
                    </p>
                  </div>

                  {/* ROI Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border-2 border-cyan-200">
                      <p className="text-xs font-semibold text-cyan-600 mb-1">INFLUENCER-DRIVEN REVENUE</p>
                      <p className="text-2xl font-black text-cyan-700">
                        R{metrics.influencerRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-cyan-600 mt-1">Sales attributed to influencers</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                      <p className="text-xs font-semibold text-purple-600 mb-1">PROGRAM ROI</p>
                      <p className="text-2xl font-black text-purple-700">
                        {metrics.influencerROI.toFixed(0)}%
                      </p>
                      <p className="text-xs text-purple-600 mt-1">Revenue vs commissions paid</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                      <p className="text-xs font-semibold text-green-600 mb-1">PLATFORM PROFIT MARGIN</p>
                      <p className="text-2xl font-black text-green-700">
                        {(((metrics.totalRevenue * 0.25) - (metrics.influencerCommissions * 0.75 || 0)) / (metrics.totalRevenue * 0.25) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-green-600 mt-1">After base commissions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-2 border-[#006B3E]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-[#006B3E]" />
                      Revenue Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Treehouse Commissions</span>
                        </div>
                        <span className="font-bold text-green-600">
                          R{metrics.treehouseEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                          style={{ width: `${(metrics.treehouseEarnings / metrics.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Dispensary Fees</span>
                        </div>
                        <span className="font-bold text-blue-600">
                          R{metrics.dispensaryRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${(metrics.dispensaryRevenue / metrics.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium">Credit Sales</span>
                        </div>
                        <span className="font-bold text-purple-600">
                          R{metrics.creditTransactions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                          style={{ width: `${(metrics.creditTransactions / metrics.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">Other Fees</span>
                        </div>
                        <span className="font-bold text-orange-600">
                          R{metrics.platformFees.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full"
                          style={{ width: `${(metrics.platformFees / metrics.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium">Influencer Program</span>
                        </div>
                        <span className="font-bold text-yellow-600">
                          R{metrics.influencerRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full"
                          style={{ width: `${(metrics.influencerRevenue / metrics.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-[#006B3E]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-[#006B3E]" />
                      Revenue Trend (Last 30 Days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {revenueByDay.slice(-10).map((day, index) => {
                        const maxRevenue = Math.max(...revenueByDay.map(d => d.revenue));
                        const percentage = (day.revenue / maxRevenue) * 100;
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-[#5D4E37]">
                                {format(new Date(day.date), 'MMM dd')}
                              </span>
                              <span className="font-bold text-[#006B3E]">
                                R{day.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-[#006B3E] to-[#008B4E] h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Health Indicators */}
              <Card className="border-2 border-[#006B3E]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#006B3E]" />
                    Financial Health Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 rounded-lg bg-gradient-to-br from-green-50 to-white border-2 border-green-200">
                      <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                      <h3 className="font-bold text-2xl text-green-600 mb-1">
                        {metrics.profitMargin.toFixed(1)}%
                      </h3>
                      <p className="text-sm text-[#5D4E37] font-semibold">Profit Margin</p>
                      <Badge className="mt-2 bg-green-600">Healthy</Badge>
                    </div>

                    <div className="text-center p-6 rounded-lg bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200">
                      <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                      <h3 className="font-bold text-2xl text-blue-600 mb-1">
                        R{(metrics.totalRevenue / 30).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
                      </h3>
                      <p className="text-sm text-[#5D4E37] font-semibold">Avg Daily Revenue</p>
                      <Badge className="mt-2 bg-blue-600">Strong</Badge>
                    </div>

                    <div className="text-center p-6 rounded-lg bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200">
                      <Wallet className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                      <h3 className="font-bold text-2xl text-purple-600 mb-1">
                        {((metrics.completedPayments / (metrics.completedPayments + metrics.pendingPayments)) * 100).toFixed(0)}%
                      </h3>
                      <p className="text-sm text-[#5D4E37] font-semibold">Payment Success Rate</p>
                      <Badge className="mt-2 bg-purple-600">Excellent</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Treehouse Panel */}
          {activePanel === 'treehouse' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#3D2E17] mb-2">Treehouse Transactions</h2>
                  <p className="text-[#5D4E37]">
                    {treehouseTransactions.length} transactions • Total: R{metrics.treehouseEarnings.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button onClick={() => setShowAddTreehouseModal(true)} className="bg-[#006B3E] hover:bg-[#005230]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by creator, product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Card className="border-2 border-[#006B3E]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Commission (25%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treehouseTransactions
                      .filter(t =>
                        searchQuery === '' ||
                        t.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        t.productName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(transaction => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.creatorName}</TableCell>
                          <TableCell>{transaction.productName}</TableCell>
                          <TableCell>{format(transaction.orderDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="font-semibold">
                            R{transaction.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="font-bold text-[#006B3E]">
                            R{transaction.commission.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                transaction.status === 'paid'
                                  ? 'bg-green-600'
                                  : transaction.status === 'pending'
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                              }
                            >
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {transaction.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus('orders', transaction.id, 'paid')}
                                >
                                  Mark Paid
                                </Button>
                              )}
                              <Button size="sm" variant="ghost">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Dispensaries Panel */}
          {activePanel === 'dispensaries' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#3D2E17] mb-2">Dispensary Revenues</h2>
                  <p className="text-[#5D4E37]">
                    {dispensaryRevenues.length} dispensaries • Total Fees: R{metrics.dispensaryRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button onClick={() => setShowAddDispensaryModal(true)} className="bg-[#006B3E] hover:bg-[#005230]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Revenue
                </Button>
              </div>

              <Card className="border-2 border-[#006B3E]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispensary</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Platform Fee (5%)</TableHead>
                      <TableHead>Net Revenue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispensaryRevenues.map(revenue => (
                      <TableRow key={revenue.id}>
                        <TableCell className="font-medium">{revenue.dispensaryName}</TableCell>
                        <TableCell>{format(new Date(revenue.month), 'MMM yyyy')}</TableCell>
                        <TableCell className="font-semibold">
                          R{revenue.revenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{revenue.orders}</TableCell>
                        <TableCell className="font-bold text-[#006B3E]">
                          R{revenue.platformFee.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          R{revenue.netRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              revenue.status === 'paid'
                                ? 'bg-green-600'
                                : revenue.status === 'processed'
                                ? 'bg-blue-600'
                                : 'bg-yellow-600'
                            }
                          >
                            {revenue.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {revenue.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  toast({
                                    title: 'Info',
                                    description: 'Dispensary revenues are calculated from orders. Mark individual orders as paid to update status.',
                                  });
                                }}
                              >
                                Process
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                toast({
                                  title: 'Info',
                                  description: 'Revenue data is aggregated from orders. Edit individual orders to modify.',
                                });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Shipping Panel */}
          {activePanel === 'shipping' && (
            <div className="space-y-6">
              <Card className="border-2 border-[#006B3E] bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-6 w-6 text-[#006B3E]" />
                    Shipping Cost Summary
                  </CardTitle>
                  <CardDescription>
                    Total shipping expenses for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-6 bg-white rounded-lg border-2 border-blue-200">
                      <div>
                        <p className="text-sm text-[#5D4E37] font-semibold mb-1">Total Shipping Costs</p>
                        <p className="text-4xl font-bold text-blue-600">
                          R{metrics.shippingCosts.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <Truck className="h-16 w-16 text-blue-300" />
                    </div>

                    <Button
                      size="lg"
                      className="w-full bg-[#006B3E] hover:bg-[#005230]"
                      onClick={() => router.push('/admin/dashboard/shipping-reconciliation')}
                    >
                      <Truck className="h-5 w-5 mr-2" />
                      View Full Shipping Reconciliation
                    </Button>

                    <p className="text-sm text-[#5D4E37] text-center">
                      Access detailed shipping reconciliation, invoice matching, and courier cost tracking
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Credits Panel */}
          {activePanel === 'credits' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#3D2E17] mb-2">Credit Transactions</h2>
                  <p className="text-[#5D4E37]">
                    {creditTransactions.length} transactions • Total: R{metrics.creditTransactions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button onClick={() => setShowAddCreditModal(true)} className="bg-[#006B3E] hover:bg-[#005230]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {['purchase', 'usage', 'refund', 'bonus'].map(type => {
                  const transactions = creditTransactions.filter(t => t.type === type);
                  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
                  return (
                    <Card key={type} className="border-2 border-[#006B3E]">
                      <CardContent className="pt-6">
                        <p className="text-sm text-[#5D4E37] font-semibold mb-1 capitalize">{type}</p>
                        <p className="text-2xl font-bold text-[#006B3E]">
                          R{total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{transactions.length} transactions</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="border-2 border-[#006B3E]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditTransactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.userName}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              transaction.type === 'purchase'
                                ? 'bg-green-600'
                                : transaction.type === 'usage'
                                ? 'bg-blue-600'
                                : transaction.type === 'refund'
                                ? 'bg-red-600'
                                : 'bg-purple-600'
                            }
                          >
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          R{transaction.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="font-bold text-[#006B3E]">{transaction.credits}</TableCell>
                        <TableCell>{format(transaction.date, 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              transaction.status === 'completed'
                                ? 'bg-green-600'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Platform Fees Panel */}
          {activePanel === 'fees' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#3D2E17] mb-2">Platform Fees</h2>
                  <p className="text-[#5D4E37]">
                    {platformFees.length} fee records • Total: R{metrics.platformFees.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Button onClick={() => setShowAddFeeModal(true)} className="bg-[#006B3E] hover:bg-[#005230]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fee
                </Button>
              </div>

              <Card className="border-2 border-[#006B3E]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Base Amount</TableHead>
                      <TableHead>Fee %</TableHead>
                      <TableHead>Fee Amount</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {platformFees.map(fee => (
                      <TableRow key={fee.id}>
                        <TableCell>
                          <Badge
                            className={
                              fee.source === 'treehouse'
                                ? 'bg-green-600'
                                : fee.source === 'dispensary'
                                ? 'bg-blue-600'
                                : 'bg-orange-600'
                            }
                          >
                            {fee.source}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(fee.month), 'MMM yyyy')}</TableCell>
                        <TableCell className="font-semibold">
                          R{fee.baseAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{fee.feePercentage}%</TableCell>
                        <TableCell className="font-bold text-[#006B3E]">
                          R{fee.feeAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {fee.collected ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{fee.notes}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteFee(fee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* Influencer Program Panel */}
          {activePanel === 'influencers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#3D2E17] mb-2">Influencer Program</h2>
                  <p className="text-[#5D4E37]">
                    Revenue & commission tracking for the influencer/affiliate program
                  </p>
                </div>
                <Button 
                  onClick={() => router.push('/admin/dashboard/influencers/analytics')} 
                  className="bg-[#006B3E] hover:bg-[#005230]"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Full Analytics
                </Button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#5D4E37] flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Revenue Generated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      R{metrics.influencerRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-green-700">
                      <TrendingUp className="h-4 w-4" />
                      <span>From referred orders</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#5D4E37] flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      Commissions Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      R{metrics.influencerCommissions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-orange-700">
                      <DollarSign className="h-4 w-4" />
                      <span>To influencers</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-[#5D4E37] flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      Program ROI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      {metrics.influencerROI.toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-sm text-blue-700">
                      <PieChart className="h-4 w-4" />
                      <span>Return on investment</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue vs Commissions */}
              <Card className="border-2 border-[#006B3E]">
                <CardHeader>
                  <CardTitle>Financial Impact</CardTitle>
                  <CardDescription>
                    How the influencer program affects overall platform revenue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#5D4E37]">Revenue Generated</span>
                          <span className="font-bold text-green-600">
                            R{metrics.influencerRevenue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#5D4E37]">Commissions Paid</span>
                          <span className="font-bold text-orange-600">
                            -R{metrics.influencerCommissions.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t-2">
                          <span className="font-semibold text-[#3D2E17]">Net Contribution</span>
                          <span className="text-xl font-bold text-[#006B3E]">
                            R{(metrics.influencerRevenue - metrics.influencerCommissions).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#5D4E37]">Commission Rate (Avg)</span>
                          <span className="font-bold">
                            {metrics.influencerRevenue > 0 
                              ? ((metrics.influencerCommissions / metrics.influencerRevenue) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#5D4E37]">% of Total Revenue</span>
                          <span className="font-bold">
                            {metrics.totalRevenue > 0
                              ? ((metrics.influencerRevenue / metrics.totalRevenue) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t-2">
                          <span className="font-semibold text-[#3D2E17]">ROI Multiple</span>
                          <span className="text-xl font-bold text-blue-600">
                            {metrics.influencerCommissions > 0
                              ? (metrics.influencerRevenue / metrics.influencerCommissions).toFixed(2)
                              : 0}x
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-[#5D4E37]">Net Revenue After Commissions</span>
                        <span className="font-bold text-[#006B3E]">
                          {metrics.influencerRevenue > 0
                            ? (((metrics.influencerRevenue - metrics.influencerCommissions) / metrics.influencerRevenue) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-[#006B3E] to-[#008B4E] h-3 rounded-full transition-all"
                          style={{ 
                            width: `${metrics.influencerRevenue > 0
                              ? (((metrics.influencerRevenue - metrics.influencerCommissions) / metrics.influencerRevenue) * 100)
                              : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-2 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/dashboard/influencers')}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#006B3E]" />
                      Manage Influencers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[#5D4E37]">
                      View and manage all influencer profiles, approvals, and tier assignments
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin/dashboard/influencers/analytics')}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-[#006B3E]" />
                      Program Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[#5D4E37]">
                      Deep dive into program performance, leaderboards, and growth metrics
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-[#006B3E]" />
                      Process Payouts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[#5D4E37]">
                      Review pending commissions and process weekly influencer payouts
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Treehouse Transaction Modal */}
      <Dialog open={showAddTreehouseModal} onOpenChange={setShowAddTreehouseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Treehouse Transaction</DialogTitle>
            <DialogDescription>Record a new creator commission transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Creator Name</Label>
              <Input
                value={treehouseForm.creatorName}
                onChange={(e) => setTreehouseForm({ ...treehouseForm, creatorName: e.target.value })}
                placeholder="Enter creator name"
              />
            </div>
            <div>
              <Label>Product Name</Label>
              <Input
                value={treehouseForm.productName}
                onChange={(e) => setTreehouseForm({ ...treehouseForm, productName: e.target.value })}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label>Order Amount (R)</Label>
              <Input
                type="number"
                value={treehouseForm.amount || ''}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value) || 0;
                  setTreehouseForm({ ...treehouseForm, amount, commission: amount * 0.25 });
                }}
                placeholder="0.00"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Commission (25%): R{(treehouseForm.amount * 0.25).toFixed(2)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTreehouseModal(false)}>Cancel</Button>
            <Button onClick={handleAddTreehouse} disabled={isSubmitting} className="bg-[#006B3E]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Credit Transaction Modal */}
      <Dialog open={showAddCreditModal} onOpenChange={setShowAddCreditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Transaction</DialogTitle>
            <DialogDescription>Record a new credit purchase or usage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User Name</Label>
              <Input
                value={creditForm.userName}
                onChange={(e) => setCreditForm({ ...creditForm, userName: e.target.value })}
                placeholder="Enter user name"
              />
            </div>
            <div>
              <Label>Transaction Type</Label>
              <Select value={creditForm.type} onValueChange={(v: any) => setCreditForm({ ...creditForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="usage">Usage</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (R)</Label>
              <Input
                type="number"
                value={creditForm.amount || ''}
                onChange={(e) => setCreditForm({ ...creditForm, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Credits</Label>
              <Input
                type="number"
                value={creditForm.credits || ''}
                onChange={(e) => setCreditForm({ ...creditForm, credits: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={creditForm.description}
                onChange={(e) => setCreditForm({ ...creditForm, description: e.target.value })}
                placeholder="Transaction details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCreditModal(false)}>Cancel</Button>
            <Button onClick={handleAddCredit} disabled={isSubmitting} className="bg-[#006B3E]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Platform Fee Modal */}
      <Dialog open={showAddFeeModal} onOpenChange={setShowAddFeeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Platform Fee</DialogTitle>
            <DialogDescription>Record a new platform fee collection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Source</Label>
              <Select value={feeForm.source} onValueChange={(v: any) => setFeeForm({ ...feeForm, source: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="treehouse">Treehouse</SelectItem>
                  <SelectItem value="dispensary">Dispensary</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Amount (R)</Label>
              <Input
                type="number"
                value={feeForm.baseAmount || ''}
                onChange={(e) => setFeeForm({ ...feeForm, baseAmount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Fee Percentage (%)</Label>
              <Input
                type="number"
                value={feeForm.feePercentage || ''}
                onChange={(e) => setFeeForm({ ...feeForm, feePercentage: parseFloat(e.target.value) || 0 })}
                placeholder="5"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Fee Amount: R{((feeForm.baseAmount * feeForm.feePercentage) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={feeForm.notes}
                onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFeeModal(false)}>Cancel</Button>
            <Button onClick={handleAddFee} disabled={isSubmitting} className="bg-[#006B3E]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Fee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
