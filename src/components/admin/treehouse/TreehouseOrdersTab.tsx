"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, query, where, orderBy, Timestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Search,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  Factory,
  DollarSign,
  User,
  MapPin,
  Calendar,
  Hash,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface TreehouseOrder {
  id?: string;
  orderId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  creatorId: string;
  creatorName: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  creatorEarnings: number;
  status: "pending" | "sent_to_print" | "in_production" | "shipped" | "delivered" | "cancelled";
  podStatus?: "sent_to_print" | "in_production" | "shipped";
  shippingAddress?: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: any;
  orderDate: any;
  updatedAt?: any;
  notes?: string;
  orderType: "treehouse"; // Label for Treehouse orders
}

export default function TreehouseOrdersTab() {
  const [orders, setOrders] = useState<TreehouseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<TreehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<TreehouseOrder | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateStatusDialogOpen, setUpdateStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const inProductionOrders = orders.filter((o) => o.status === "in_production").length;
  const shippedOrders = orders.filter((o) => o.status === "shipped").length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalEarnings = orders.reduce((sum, o) => sum + o.creatorEarnings, 0);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Fetch orders from treehouse_orders collection
      const ordersQuery = query(
        collection(db, "treehouse_orders"),
        orderBy("orderDate", "desc")
      );
      const snapshot = await getDocs(ordersQuery);
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        orderType: "treehouse" as const, // Add label
        ...doc.data(),
      })) as TreehouseOrder[];
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.orderId?.toLowerCase().includes(term) ||
          o.productName?.toLowerCase().includes(term) ||
          o.creatorName?.toLowerCase().includes(term) ||
          o.userEmail?.toLowerCase().includes(term) ||
          o.userName?.toLowerCase().includes(term) ||
          o.trackingNumber?.toLowerCase().includes(term)
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: string; icon: any; color: string }> = {
      pending: {
        label: "Pending",
        variant: "secondary",
        icon: Clock,
        color: "text-yellow-600",
      },
      sent_to_print: {
        label: "Sent to Print",
        variant: "default",
        icon: Printer,
        color: "text-blue-600",
      },
      in_production: {
        label: "In Production",
        variant: "default",
        icon: Factory,
        color: "text-purple-600",
      },
      shipped: {
        label: "Shipped",
        variant: "default",
        icon: Truck,
        color: "text-indigo-600",
      },
      delivered: {
        label: "Delivered",
        variant: "default",
        icon: CheckCircle,
        color: "text-green-600",
      },
      cancelled: {
        label: "Cancelled",
        variant: "destructive",
        icon: XCircle,
        color: "text-red-600",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1 w-fit">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const handleViewDetails = (order: TreehouseOrder) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  const handleUpdateStatus = (order: TreehouseOrder) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingNumber(order.trackingNumber || "");
    setAdminNotes(order.notes || "");
    setUpdateStatusDialogOpen(true);
  };

  const confirmUpdateStatus = async () => {
    if (!selectedOrder) return;

    try {
      const orderRef = doc(db, "treehouse_orders", selectedOrder.id!);
      const updateData: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      if (adminNotes) {
        updateData.notes = adminNotes;
      }

      // Update POD status based on order status
      if (["sent_to_print", "in_production", "shipped"].includes(newStatus)) {
        updateData.podStatus = newStatus;
      }

      await updateDoc(orderRef, updateData);

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });

      setUpdateStatusDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
      return format(dateObj, "dd MMM yyyy, HH:mm");
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{totalOrders}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Production</p>
              <p className="text-2xl font-bold text-purple-600">{inProductionOrders}</p>
            </div>
            <Factory className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4 bg-indigo-50 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Shipped</p>
              <p className="text-2xl font-bold text-indigo-600">{shippedOrders}</p>
            </div>
            <Truck className="h-8 w-8 text-indigo-600" />
          </div>
        </Card>

        <Card className="p-4 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{deliveredOrders}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-[#006B3E]">
                R{totalRevenue.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-4 bg-teal-50 dark:bg-teal-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Creator Earnings</p>
              <p className="text-2xl font-bold text-[#006B3E]">
                R{totalEarnings.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, product, creator, customer, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent_to_print">Sent to Print</SelectItem>
              <SelectItem value="in_production">In Production</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No orders found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs bg-blue-50">
                        TREE
                      </Badge>
                      <span className="font-mono text-sm">{order.orderId?.substring(0, 8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {order.productImage && (
                        <img
                          src={order.productImage}
                          alt={order.productName}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-[#3D2E17]">{order.productName}</p>
                        <p className="text-xs text-muted-foreground">POD Item</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.creatorName}</p>
                      <p className="text-xs text-muted-foreground">{order.creatorId?.substring(0, 8)}...</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.userName || "Customer"}</p>
                      <p className="text-xs text-muted-foreground">{order.userEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{order.quantity}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-[#3D2E17]">
                      R{order.totalAmount.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-[#006B3E]">
                      R{order.creatorEarnings.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(order.orderDate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(order)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateStatus(order)}
                        title="Update Status"
                      >
                        <TrendingUp className="h-4 w-4 text-[#006B3E]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[#006B3E]" />
              Treehouse Order Details
            </DialogTitle>
            <DialogDescription>Complete order information</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Type Badge */}
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white">
                  <ShoppingBag className="h-3 w-3 mr-1" />
                  TREEHOUSE ORDER
                </Badge>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Order ID
                  </Label>
                  <p className="font-mono font-medium">{selectedOrder.orderId}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Order Date
                  </Label>
                  <p className="font-medium">{formatDate(selectedOrder.orderDate)}</p>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm font-semibold text-[#3D2E17] mb-3 block">Product Details</Label>
                <div className="flex gap-4">
                  {selectedOrder.productImage && (
                    <img
                      src={selectedOrder.productImage}
                      alt={selectedOrder.productName}
                      className="h-24 w-24 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-[#3D2E17] mb-1">{selectedOrder.productName}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <p className="font-medium">{selectedOrder.quantity}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Unit Price</Label>
                        <p className="font-medium">R{selectedOrder.unitPrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Total Amount</Label>
                        <p className="font-semibold text-[#3D2E17]">R{selectedOrder.totalAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Creator Earnings (25%)</Label>
                        <p className="font-semibold text-[#006B3E]">R{selectedOrder.creatorEarnings.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Creator Info */}
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <Label className="text-sm font-semibold text-[#3D2E17] mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Creator Information
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Creator Name</Label>
                    <p className="font-medium">{selectedOrder.creatorName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Creator ID</Label>
                    <p className="font-mono text-xs">{selectedOrder.creatorId}</p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Label className="text-sm font-semibold text-[#3D2E17] mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="font-medium">{selectedOrder.userName || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedOrder.userEmail || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Shipping Info */}
              {selectedOrder.shippingAddress && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                  <Label className="text-sm font-semibold text-[#3D2E17] mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </Label>
                  <div className="text-sm space-y-1">
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.province}{" "}
                      {selectedOrder.shippingAddress.postalCode}
                    </p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Tracking Info */}
              {selectedOrder.trackingNumber && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <Label className="text-sm font-semibold text-[#3D2E17] mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Tracking Information
                  </Label>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Tracking Number</Label>
                      <p className="font-mono font-medium">{selectedOrder.trackingNumber}</p>
                    </div>
                    {selectedOrder.estimatedDelivery && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Estimated Delivery</Label>
                        <p className="font-medium">{formatDate(selectedOrder.estimatedDelivery)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* POD Status */}
              {selectedOrder.podStatus && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <Label className="text-sm font-semibold text-[#3D2E17] mb-2 flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    Print-on-Demand Status
                  </Label>
                  <div>{getStatusBadge(selectedOrder.podStatus)}</div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedOrder.notes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <Label className="text-sm font-semibold text-[#3D2E17] mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Admin Notes
                  </Label>
                  <p className="text-sm">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <Label className="text-sm font-semibold text-[#3D2E17] mb-3 block">Order Timeline</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Ordered:</span>
                    <span className="font-medium">{formatDate(selectedOrder.orderDate)}</span>
                  </div>
                  {selectedOrder.updatedAt && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="font-medium">{formatDate(selectedOrder.updatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateStatusDialogOpen} onOpenChange={setUpdateStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>Change the order status and add tracking information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Order Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent_to_print">Sent to Print</SelectItem>
                  <SelectItem value="in_production">In Production</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tracking">Tracking Number (Optional)</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this order..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmUpdateStatus} className="bg-[#006B3E] hover:bg-[#005a33]">
              Update Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
