"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, query, orderBy, Timestamp } from "firebase/firestore";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Store,
  Search,
  TrendingUp,
  Package,
  DollarSign,
  Edit,
  Power,
  Trash2,
  Eye,
  ExternalLink,
  Users,
  ShoppingBag,
  Calendar,
} from "lucide-react";
import { CreatorStore } from "@/types/creator-store";
import { format } from "date-fns";

export default function TreehouseStoresTab() {
  const [stores, setStores] = useState<CreatorStore[]>([]);
  const [filteredStores, setFilteredStores] = useState<CreatorStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedStore, setSelectedStore] = useState<CreatorStore | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    storeName: "",
    storeDescription: "",
    creatorNickname: "",
  });
  const { toast } = useToast();

  // Stats
  const totalStores = stores.length;
  const activeStores = stores.filter((s) => s.isActive).length;
  const inactiveStores = stores.filter((s) => !s.isActive).length;
  const totalProducts = stores.reduce((sum, s) => sum + (s.stats?.totalProducts || 0), 0);
  const totalSales = stores.reduce((sum, s) => sum + (s.stats?.totalSales || 0), 0);
  const totalRevenue = stores.reduce((sum, s) => sum + (s.stats?.totalRevenue || 0), 0);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    filterStores();
  }, [stores, searchTerm, statusFilter]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const storesQuery = query(
        collection(db, "creator_stores"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(storesQuery);
      const storesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CreatorStore[];
      setStores(storesData);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast({
        title: "Error",
        description: "Failed to load stores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStores = () => {
    let filtered = stores;

    // Filter by status
    if (statusFilter === "active") {
      filtered = filtered.filter((s) => s.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((s) => !s.isActive);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.storeName?.toLowerCase().includes(term) ||
          s.creatorNickname?.toLowerCase().includes(term) ||
          s.ownerId?.toLowerCase().includes(term) ||
          s.storeDescription?.toLowerCase().includes(term)
      );
    }

    setFilteredStores(filtered);
  };

  const handleViewDetails = (store: CreatorStore) => {
    setSelectedStore(store);
    setDetailsDialogOpen(true);
  };

  const handleEditStore = (store: CreatorStore) => {
    setSelectedStore(store);
    setEditFormData({
      storeName: store.storeName || "",
      storeDescription: store.storeDescription || "",
      creatorNickname: store.creatorNickname || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedStore) return;

    try {
      const storeRef = doc(db, "creator_stores", selectedStore.id!);
      await updateDoc(storeRef, {
        storeName: editFormData.storeName,
        storeDescription: editFormData.storeDescription,
        creatorNickname: editFormData.creatorNickname,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Store updated successfully",
      });

      setEditDialogOpen(false);
      fetchStores();
    } catch (error) {
      console.error("Error updating store:", error);
      toast({
        title: "Error",
        description: "Failed to update store",
        variant: "destructive",
      });
    }
  };

  const handleToggleStore = (store: CreatorStore) => {
    setSelectedStore(store);
    setToggleDialogOpen(true);
  };

  const confirmToggleStore = async () => {
    if (!selectedStore) return;

    try {
      const storeRef = doc(db, "creator_stores", selectedStore.id!);
      await updateDoc(storeRef, {
        isActive: !selectedStore.isActive,
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: `Store ${selectedStore.isActive ? "deactivated" : "activated"} successfully`,
      });

      setToggleDialogOpen(false);
      fetchStores();
    } catch (error) {
      console.error("Error toggling store:", error);
      toast({
        title: "Error",
        description: "Failed to toggle store status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStore = (store: CreatorStore) => {
    setSelectedStore(store);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteStore = async () => {
    if (!selectedStore) return;

    try {
      // Soft delete - just deactivate
      const storeRef = doc(db, "creator_stores", selectedStore.id!);
      await updateDoc(storeRef, {
        isActive: false,
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast({
        title: "Success",
        description: "Store deleted successfully",
      });

      setDeleteDialogOpen(false);
      fetchStores();
    } catch (error) {
      console.error("Error deleting store:", error);
      toast({
        title: "Error",
        description: "Failed to delete store",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    try {
      const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
      return format(dateObj, "dd MMM yyyy");
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Stores</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{totalStores}</p>
            </div>
            <Store className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-[#006B3E]">{activeStores}</p>
            </div>
            <Power className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{inactiveStores}</p>
            </div>
            <Power className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{totalProducts}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 dark:bg-orange-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{totalSales}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-orange-600" />
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
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#006B3E]" />
            <Input
              placeholder="Search stores, creators, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 font-semibold text-[#3D2E17]"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stores Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold text-[#3D2E17]">Store</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Creator</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Status</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Products</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Sales</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Revenue</TableHead>
              <TableHead className="font-bold text-[#3D2E17]">Created</TableHead>
              <TableHead className="text-right font-bold text-[#3D2E17]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Store className="h-12 w-12 text-[#006B3E] mx-auto mb-2" />
                  <p className="text-[#3D2E17] font-bold">No stores found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredStores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-[#006B3E]/10 flex items-center justify-center">
                        <Store className="h-6 w-6 text-[#006B3E]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#3D2E17]">{store.storeName}</p>
                        <p className="text-xs text-muted-foreground">{store.storeSlug}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{store.creatorNickname}</p>
                      <p className="text-xs text-muted-foreground">{store.ownerId?.substring(0, 8)}...</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={store.isActive ? "default" : "secondary"} className={store.isActive ? "bg-[#006B3E]" : ""}>
                      {store.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{store.stats?.totalProducts || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span>{store.stats?.totalSales || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-[#006B3E]">
                      R{(store.stats?.totalRevenue || 0).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(store.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(store)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditStore(store)}
                        title="Edit Store"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStore(store)}
                        title={store.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power className={`h-4 w-4 ${store.isActive ? "text-green-600" : "text-red-600"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStore(store)}
                        title="Delete Store"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`/treehouse/store/${store.storeSlug}`, "_blank")}
                        title="View Storefront"
                      >
                        <ExternalLink className="h-4 w-4" />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[#006B3E]" />
              Store Details
            </DialogTitle>
            <DialogDescription>Complete information about this creator store</DialogDescription>
          </DialogHeader>

          {selectedStore && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Store Name</Label>
                  <p className="font-medium text-[#3D2E17]">{selectedStore.storeName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Store Slug</Label>
                  <p className="font-medium">{selectedStore.storeSlug}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Creator Nickname</Label>
                  <p className="font-medium">{selectedStore.creatorNickname}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant={selectedStore.isActive ? "default" : "secondary"} className={selectedStore.isActive ? "bg-[#006B3E]" : ""}>
                    {selectedStore.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1">{selectedStore.storeDescription || "No description provided"}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Owner ID</Label>
                <p className="font-mono text-xs">{selectedStore.ownerId}</p>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <Package className="h-6 w-6 text-[#006B3E] mx-auto mb-1" />
                  <p className="text-2xl font-bold text-[#3D2E17]">{selectedStore.stats?.totalProducts || 0}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
                <div className="text-center">
                  <ShoppingBag className="h-6 w-6 text-[#006B3E] mx-auto mb-1" />
                  <p className="text-2xl font-bold text-[#3D2E17]">{selectedStore.stats?.totalSales || 0}</p>
                  <p className="text-xs text-muted-foreground">Sales</p>
                </div>
                <div className="text-center">
                  <DollarSign className="h-6 w-6 text-[#006B3E] mx-auto mb-1" />
                  <p className="text-2xl font-bold text-[#006B3E]">R{(selectedStore.stats?.totalRevenue || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p>{formatDate(selectedStore.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p>{formatDate(selectedStore.updatedAt)}</p>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  onClick={() => window.open(`/treehouse/store/${selectedStore.storeSlug}`, "_blank")}
                  className="flex-1 bg-[#006B3E] hover:bg-[#005a33]"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Storefront
                </Button>
                <Button
                  onClick={() => window.open(`/dashboard/creator-lab`, "_blank")}
                  variant="outline"
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Creator Dashboard
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
            <DialogDescription>Update store information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={editFormData.storeName}
                onChange={(e) => setEditFormData({ ...editFormData, storeName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="creatorNickname">Creator Nickname</Label>
              <Input
                id="creatorNickname"
                value={editFormData.creatorNickname}
                onChange={(e) => setEditFormData({ ...editFormData, creatorNickname: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="storeDescription">Description</Label>
              <Textarea
                id="storeDescription"
                value={editFormData.storeDescription}
                onChange={(e) => setEditFormData({ ...editFormData, storeDescription: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-[#006B3E] hover:bg-[#005a33]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Confirmation Dialog */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStore?.isActive ? "Deactivate" : "Activate"} Store?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStore?.isActive
                ? "This store will be hidden from the Treehouse and customers won't be able to browse products."
                : "This store will be visible in the Treehouse and customers can browse products."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggleStore}
              className={selectedStore?.isActive ? "bg-amber-600 hover:bg-amber-700" : "bg-[#006B3E] hover:bg-[#005a33]"}
            >
              {selectedStore?.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <span className="font-semibold">{selectedStore?.storeName}</span> and mark it as deleted. This action can be reversed by reactivating the store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStore}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
