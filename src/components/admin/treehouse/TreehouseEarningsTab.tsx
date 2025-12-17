"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

interface EarningsData {
  month: string;
  totalEarnings: number;
  totalOrders: number;
  activeCreators: number;
}

interface TopCreator {
  creatorId: string;
  creatorName: string;
  totalEarnings: number;
  totalOrders: number;
  totalProducts: number;
}

export default function TreehouseEarningsTab() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const { toast } = useToast();

  // Overall stats
  const [totalEarningsPaid, setTotalEarningsPaid] = useState(0);
  const [totalPendingEarnings, setTotalPendingEarnings] = useState(0);
  const [activeCreatorsCount, setActiveCreatorsCount] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgEarningsPerCreator, setAvgEarningsPerCreator] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  useEffect(() => {
    fetchEarningsData();
  }, [timeRange]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate = new Date(0); // Beginning of time

      switch (timeRange) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      // Fetch all orders
      const ordersQuery =
        timeRange === "all"
          ? query(collection(db, "treehouse_orders"), orderBy("orderDate", "desc"))
          : query(
              collection(db, "treehouse_orders"),
              where("orderDate", ">=", Timestamp.fromDate(startDate)),
              orderBy("orderDate", "desc")
            );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Fetch all payout requests
      const payoutsQuery = query(
        collection(db, "payout_requests"),
        where("status", "==", "completed")
      );
      const payoutsSnapshot = await getDocs(payoutsQuery);
      const completedPayouts = payoutsSnapshot.docs.map((doc) => doc.data());

      // Fetch all creator earnings
      const earningsQuery = query(collection(db, "creator_earnings"));
      const earningsSnapshot = await getDocs(earningsQuery);
      const creatorEarnings = earningsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate total earnings paid
      const totalPaid = completedPayouts.reduce(
        (sum, payout: any) => sum + (payout.requestedAmount || 0),
        0
      );
      setTotalEarningsPaid(totalPaid);

      // Calculate total pending earnings
      const totalPending = creatorEarnings.reduce(
        (sum, earning: any) => sum + (earning.currentBalance || 0) + (earning.pendingBalance || 0),
        0
      );
      setTotalPendingEarnings(totalPending);

      // Active creators (those with earnings > 0)
      const activeCreators = creatorEarnings.filter(
        (e: any) => (e.totalEarned || 0) > 0
      ).length;
      setActiveCreatorsCount(activeCreators);

      // Total orders and revenue
      setTotalOrders(orders.length);
      const revenue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
      setTotalRevenue(revenue);

      // Calculate average earnings per creator
      const avgEarnings = activeCreators > 0 ? totalPaid / activeCreators : 0;
      setAvgEarningsPerCreator(avgEarnings);

      // Calculate average order value
      const avgOrder = orders.length > 0 ? revenue / orders.length : 0;
      setAvgOrderValue(avgOrder);

      // Calculate growth rate (compare current period to previous period)
      const periodDays = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
      const previousStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
      const previousOrdersQuery = query(
        collection(db, "treehouse_orders"),
        where("orderDate", ">=", Timestamp.fromDate(previousStartDate)),
        where("orderDate", "<", Timestamp.fromDate(startDate))
      );
      const previousOrdersSnapshot = await getDocs(previousOrdersQuery);
      const previousRevenue = previousOrdersSnapshot.docs.reduce(
        (sum, doc) => sum + (doc.data().totalAmount || 0),
        0
      );
      const growth = previousRevenue > 0 ? ((revenue - previousRevenue) / previousRevenue) * 100 : 0;
      setGrowthRate(growth);

      // Generate earnings timeline data
      const months = eachMonthOfInterval({
        start: startDate,
        end: now,
      });

      const timelineData: EarningsData[] = months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthOrders = orders.filter((order: any) => {
          const orderDate = order.orderDate instanceof Timestamp
            ? order.orderDate.toDate()
            : new Date(order.orderDate);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });

        const monthEarnings = monthOrders.reduce(
          (sum: number, order: any) => sum + (order.creatorEarnings || 0),
          0
        );

        const monthCreators = new Set(monthOrders.map((order: any) => order.creatorId)).size;

        return {
          month: format(month, "MMM yyyy"),
          totalEarnings: monthEarnings,
          totalOrders: monthOrders.length,
          activeCreators: monthCreators,
        };
      });

      setEarningsData(timelineData);

      // Calculate top creators
      const creatorMap = new Map<string, any>();

      orders.forEach((order: any) => {
        const creatorId = order.creatorId;
        if (!creatorId) return;

        if (!creatorMap.has(creatorId)) {
          creatorMap.set(creatorId, {
            creatorId,
            creatorName: order.creatorName || "Unknown Creator",
            totalEarnings: 0,
            totalOrders: 0,
            products: new Set(),
          });
        }

        const creator = creatorMap.get(creatorId);
        creator.totalEarnings += order.creatorEarnings || 0;
        creator.totalOrders += 1;
        if (order.productId) {
          creator.products.add(order.productId);
        }
      });

      const topCreatorsData: TopCreator[] = Array.from(creatorMap.values())
        .map((creator) => ({
          creatorId: creator.creatorId,
          creatorName: creator.creatorName,
          totalEarnings: creator.totalEarnings,
          totalOrders: creator.totalOrders,
          totalProducts: creator.products.size,
        }))
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 10);

      setTopCreators(topCreatorsData);
    } catch (error) {
      console.error("Error fetching earnings data:", error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGrowthIcon = () => {
    if (growthRate > 0) return <ArrowUp className="h-4 w-4" />;
    if (growthRate < 0) return <ArrowDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getGrowthColor = () => {
    if (growthRate > 0) return "text-green-600";
    if (growthRate < 0) return "text-red-600";
    return "text-gray-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#3D2E17]">Earnings Overview</h3>
          <p className="text-sm text-muted-foreground">Track creator earnings and platform performance</p>
        </div>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-full bg-[#006B3E]/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-[#006B3E]" />
            </div>
            <Badge className="bg-[#006B3E]">Paid Out</Badge>
          </div>
          <p className="text-3xl font-bold text-[#006B3E] mb-1">
            R{totalEarningsPaid.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">Total Earnings Paid</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-full bg-yellow-600/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-yellow-600" />
            </div>
            <Badge className="bg-yellow-600">Pending</Badge>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mb-1">
            R{totalPendingEarnings.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">Pending Earnings</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-full bg-blue-600/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <Badge className="bg-blue-600">Active</Badge>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-1">{activeCreatorsCount}</p>
          <p className="text-sm text-muted-foreground">Active Creators</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="h-10 w-10 rounded-full bg-purple-600/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <Badge className="bg-purple-600">Avg/Creator</Badge>
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-1">
            R{avgEarningsPerCreator.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">Average Earnings</p>
        </Card>
      </div>

      {/* Secondary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-[#3D2E17]">R{totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-teal-600" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{totalOrders}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Order Value</p>
              <p className="text-2xl font-bold text-[#3D2E17]">R{avgOrderValue.toFixed(2)}</p>
            </div>
            <Package className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Growth Rate Card */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Revenue Growth Rate</p>
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-bold ${getGrowthColor()}`}>
                {growthRate > 0 ? "+" : ""}{growthRate.toFixed(1)}%
              </p>
              <span className={getGrowthColor()}>{getGrowthIcon()}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Compared to previous period</p>
          </div>
          <TrendingUp className={`h-12 w-12 ${getGrowthColor()}`} />
        </div>
      </Card>

      {/* Earnings Timeline Chart */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#3D2E17] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#006B3E]" />
            Earnings Timeline
          </h3>
          <p className="text-sm text-muted-foreground">Monthly earnings breakdown</p>
        </div>

        {earningsData.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No earnings data for this period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {earningsData.map((data, index) => {
              const maxEarnings = Math.max(...earningsData.map((d) => d.totalEarnings));
              const percentage = maxEarnings > 0 ? (data.totalEarnings / maxEarnings) * 100 : 0;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#3D2E17]">{data.month}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{data.totalOrders} orders</span>
                      <span className="text-muted-foreground">{data.activeCreators} creators</span>
                      <span className="font-semibold text-[#006B3E]">
                        R{data.totalEarnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="h-8 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#006B3E] to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Top Creators Table */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#3D2E17] flex items-center gap-2">
            <Award className="h-5 w-5 text-[#006B3E]" />
            Top Earning Creators
          </h3>
          <p className="text-sm text-muted-foreground">Highest earning creators in this period</p>
        </div>

        {topCreators.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No creator data available</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead className="text-right">Total Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCreators.map((creator, index) => (
                <TableRow key={creator.creatorId}>
                  <TableCell>
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                          ? "bg-gray-100 text-gray-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[#3D2E17]">{creator.creatorName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {creator.creatorId.substring(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{creator.totalProducts}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span>{creator.totalOrders}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-[#006B3E] text-lg">
                      R{creator.totalEarnings.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
