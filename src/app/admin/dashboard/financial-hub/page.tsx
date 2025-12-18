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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

type SidePanel = 'overview' | 'treehouse' | 'dispensaries' | 'shipping' | 'credits' | 'fees';

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
        return {
          id: doc.id,
          creatorId: data.creatorId || '',
          creatorName: data.creatorName || 'Unknown',
          productId: data.productId || '',
          productName: data.productName || 'Unknown Product',
          orderDate: data.createdAt?.toDate() || new Date(),
          amount: data.totalAmount || 0,
          commission: (data.totalAmount || 0) * 0.25, // 25% commission
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
        
        if (revenueMap.has(key)) {
          const existing = revenueMap.get(key)!;
          existing.revenue += data.totalAmount || 0;
          existing.orders += 1;
          existing.platformFee = existing.revenue * 0.05; // 5% platform fee
          existing.netRevenue = existing.revenue - existing.platformFee;
        } else {
          const revenue = data.totalAmount || 0;
          revenueMap.set(key, {
            id: key,
            dispensaryId,
            dispensaryName: data.dispensaryName || 'Unknown',
            month,
            revenue,
            orders: 1,
            platformFee: revenue * 0.05,
            netRevenue: revenue * 0.95,
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

      // Calculate shipping costs from existing reconciliation
      const shippingQuery = query(
        collection(db, 'shippingReconciliation'),
        where('createdAt', '>=', Timestamp.fromDate(startDate))
      );
      const shippingSnap = await getDocs(shippingQuery);
      const totalShipping = shippingSnap.docs.reduce((sum, doc) => sum + (doc.data().courierCost || 0), 0);

      // Calculate metrics
      const treehouseTotal = treehouseTxns.reduce((sum, t) => sum + t.commission, 0);
      const dispensaryTotal = Array.from(revenueMap.values()).reduce((sum, r) => sum + r.platformFee, 0);
      const creditTotal = creditTxns.filter(c => c.type === 'purchase').reduce((sum, c) => sum + c.amount, 0);
      const feesTotal = fees.reduce((sum, f) => sum + f.feeAmount, 0);
      const totalRevenue = treehouseTotal + dispensaryTotal + creditTotal + feesTotal;
      const totalExpenses = totalShipping;
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
      await updateDoc(doc(db, collection, id), { status });
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

  // Side Panel Navigation
  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'treehouse', label: 'Treehouse', icon: Leaf },
    { id: 'dispensaries', label: 'Dispensaries', icon: Building2 },
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
                                onClick={() => handleUpdateStatus('dispensaryRevenue', revenue.id, 'processed')}
                              >
                                Process
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
                            <Button size="sm" variant="ghost">
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
        </div>
      </div>
    </div>
  );
}
