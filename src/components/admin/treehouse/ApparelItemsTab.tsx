"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from "firebase/firestore";
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
  Shirt,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Ruler,
  Weight,
  Package,
  Tag,
  Palette,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { ApparelItem, STANDARD_APPAREL_TYPES, STANDARD_COLORS } from "@/types/apparel-items";
import { format } from "date-fns";

export default function ApparelItemsTab() {
  const [items, setItems] = useState<ApparelItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ApparelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ApparelItem | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    itemType: "tshirt",
    name: "",
    description: "",
    category: "tops",
    basePrice: 0,
    retailPrice: 0,
    availableSizes: [] as string[],
    availableColors: [] as string[],
    primaryColor: "black",
    weight: 0.2,
    length: 30,
    width: 25,
    height: 2,
    frontTemplateUrl: "",
    backTemplateUrl: "",
    sku: "",
    manufacturer: "",
    materialComposition: "100% Cotton",
    careInstructions: "Machine wash cold, tumble dry low",
    isActive: true,
    inStock: true,
  });

  // Stats
  const totalItems = items.length;
  const activeItems = items.filter((i) => i.isActive).length;
  const inactiveItems = items.filter((i) => !i.isActive).length;
  const avgWeight = items.length > 0 ? items.reduce((sum, i) => sum + i.weight, 0) / items.length : 0;

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, categoryFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const itemsQuery = query(
        collection(db, "apparel_items"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(itemsQuery);
      const itemsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ApparelItem[];
      setItems(itemsData);
    } catch (error) {
      console.error("Error fetching apparel items:", error);
      toast({
        title: "Error",
        description: "Failed to load apparel items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((i) => i.category === categoryFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name?.toLowerCase().includes(term) ||
          i.itemType?.toLowerCase().includes(term) ||
          i.description?.toLowerCase().includes(term) ||
          i.sku?.toLowerCase().includes(term)
      );
    }

    setFilteredItems(filtered);
  };

  const handleViewDetails = (item: ApparelItem) => {
    setSelectedItem(item);
    setDetailsDialogOpen(true);
  };

  const handleAddNew = () => {
    setIsEditing(false);
    setFormData({
      itemType: "tshirt",
      name: "",
      description: "",
      category: "tops",
      basePrice: 0,
      retailPrice: 0,
      availableSizes: ["S", "M", "L", "XL", "XXL"],
      availableColors: ["black"],
      primaryColor: "black",
      weight: 0.2,
      length: 30,
      width: 25,
      height: 2,
      frontTemplateUrl: "",
      backTemplateUrl: "",
      sku: "",
      manufacturer: "",
      materialComposition: "100% Cotton",
      careInstructions: "Machine wash cold, tumble dry low",
      isActive: true,
      inStock: true,
    });
    setAddEditDialogOpen(true);
  };

  const handleEditItem = (item: ApparelItem) => {
    setIsEditing(true);
    setSelectedItem(item);
    setFormData({
      itemType: item.itemType,
      name: item.name,
      description: item.description || "",
      category: item.category,
      basePrice: item.basePrice,
      retailPrice: item.retailPrice,
      availableSizes: item.availableSizes,
      availableColors: item.availableColors,
      primaryColor: item.primaryColor,
      weight: item.weight,
      length: item.dimensions.length,
      width: item.dimensions.width,
      height: item.dimensions.height,
      frontTemplateUrl: item.frontTemplateUrl || "",
      backTemplateUrl: item.backTemplateUrl || "",
      sku: item.sku || "",
      manufacturer: item.manufacturer || "",
      materialComposition: item.materialComposition || "100% Cotton",
      careInstructions: item.careInstructions || "Machine wash cold, tumble dry low",
      isActive: item.isActive,
      inStock: item.inStock,
    });
    setAddEditDialogOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const itemData: any = {
        itemType: formData.itemType,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        basePrice: Number(formData.basePrice),
        retailPrice: Number(formData.retailPrice),
        availableSizes: formData.availableSizes,
        availableColors: formData.availableColors,
        primaryColor: formData.primaryColor,
        weight: Number(formData.weight),
        dimensions: {
          length: Number(formData.length),
          width: Number(formData.width),
          height: Number(formData.height),
        },
        frontTemplateUrl: formData.frontTemplateUrl,
        backTemplateUrl: formData.backTemplateUrl,
        printAreas: STANDARD_APPAREL_TYPES[formData.itemType as keyof typeof STANDARD_APPAREL_TYPES].printAreas,
        sku: formData.sku,
        manufacturer: formData.manufacturer,
        materialComposition: formData.materialComposition,
        careInstructions: formData.careInstructions,
        isActive: formData.isActive,
        inStock: formData.inStock,
        updatedAt: Timestamp.now(),
      };

      if (isEditing && selectedItem) {
        // Update existing item
        const itemRef = doc(db, "apparel_items", selectedItem.id!);
        await updateDoc(itemRef, itemData);
        toast({
          title: "Success",
          description: "Apparel item updated successfully",
        });
      } else {
        // Create new item
        itemData.createdAt = Timestamp.now();
        await addDoc(collection(db, "apparel_items"), itemData);
        toast({
          title: "Success",
          description: "Apparel item created successfully",
        });
      }

      setAddEditDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error("Error saving apparel item:", error);
      toast({
        title: "Error",
        description: "Failed to save apparel item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = (item: ApparelItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      await deleteDoc(doc(db, "apparel_items", selectedItem.id!));
      toast({
        title: "Success",
        description: "Apparel item deleted successfully",
      });
      setDeleteDialogOpen(false);
      fetchItems();
    } catch (error) {
      console.error("Error deleting apparel item:", error);
      toast({
        title: "Error",
        description: "Failed to delete apparel item",
        variant: "destructive",
      });
    }
  };

  const handleItemTypeChange = (itemType: string) => {
    const standard = STANDARD_APPAREL_TYPES[itemType as keyof typeof STANDARD_APPAREL_TYPES];
    if (standard) {
      setFormData({
        ...formData,
        itemType,
        category: standard.category,
        weight: standard.weight,
        length: standard.dimensions.length,
        width: standard.dimensions.width,
        height: standard.dimensions.height,
        availableSizes: standard.availableSizes,
      });
    }
  };

  const toggleSize = (size: string) => {
    const sizes = formData.availableSizes.includes(size)
      ? formData.availableSizes.filter((s) => s !== size)
      : [...formData.availableSizes, size];
    setFormData({ ...formData, availableSizes: sizes });
  };

  const toggleColor = (color: string) => {
    const colors = formData.availableColors.includes(color)
      ? formData.availableColors.filter((c) => c !== color)
      : [...formData.availableColors, color];
    setFormData({ ...formData, availableColors: colors });
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
          <Shirt className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading apparel items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{totalItems}</p>
            </div>
            <Shirt className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-[#006B3E]">{activeItems}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-red-600">{inactiveItems}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4 bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Weight</p>
              <p className="text-2xl font-bold text-[#3D2E17]">{avgWeight.toFixed(2)} kg</p>
            </div>
            <Weight className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items, SKU, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="tops">Tops</SelectItem>
              <SelectItem value="headwear">Headwear</SelectItem>
              <SelectItem value="outerwear">Outerwear</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddNew} className="bg-[#006B3E] hover:bg-[#005a33]">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </Card>

      {/* Items Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sizes</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Shirt className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No apparel items found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-[#006B3E]/10 flex items-center justify-center">
                        <Shirt className="h-5 w-5 text-[#006B3E]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#3D2E17]">{item.name}</p>
                        {item.sku && <p className="text-xs text-muted-foreground">{item.sku}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.itemType.replace('_', ' ').toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.availableSizes.slice(0, 3).map((size) => (
                        <Badge key={size} variant="outline" className="text-xs">
                          {size}
                        </Badge>
                      ))}
                      {item.availableSizes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.availableSizes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <span>{item.weight} kg</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">
                        {item.dimensions.length}×{item.dimensions.width}×{item.dimensions.height} cm
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-[#006B3E]">R{item.retailPrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Base: R{item.basePrice.toFixed(2)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={item.isActive ? "default" : "secondary"} className={item.isActive ? "bg-[#006B3E]" : ""}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {item.inStock && <Badge variant="outline" className="text-xs">In Stock</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(item)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditItem(item)}
                        title="Edit Item"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item)}
                        title="Delete Item"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shirt className="h-5 w-5 text-[#006B3E]" />
              Apparel Item Details
            </DialogTitle>
            <DialogDescription>Complete information about this apparel item</DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium text-[#3D2E17]">{selectedItem.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Badge variant="outline">{selectedItem.itemType.replace('_', ' ').toUpperCase()}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <Badge variant="secondary">{selectedItem.category}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SKU</Label>
                  <p className="font-mono text-sm">{selectedItem.sku || "N/A"}</p>
                </div>
              </div>

              {selectedItem.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedItem.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Base Price</Label>
                  <p className="text-lg font-bold text-[#3D2E17]">R{selectedItem.basePrice.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Retail Price</Label>
                  <p className="text-lg font-bold text-[#006B3E]">R{selectedItem.retailPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    Weight
                  </Label>
                  <p className="text-lg font-bold text-[#3D2E17]">{selectedItem.weight} kg</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    Dimensions (L×W×H)
                  </Label>
                  <p className="text-lg font-bold text-[#3D2E17]">
                    {selectedItem.dimensions.length}×{selectedItem.dimensions.width}×{selectedItem.dimensions.height} cm
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Available Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.availableSizes.map((size) => (
                    <Badge key={size} variant="outline" className="bg-white">
                      {size}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Available Colors
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.availableColors.map((color) => (
                    <Badge key={color} variant="outline" className="bg-white capitalize">
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedItem.materialComposition && (
                <div>
                  <Label className="text-xs text-muted-foreground">Material</Label>
                  <p className="text-sm mt-1">{selectedItem.materialComposition}</p>
                </div>
              )}

              {selectedItem.careInstructions && (
                <div>
                  <Label className="text-xs text-muted-foreground">Care Instructions</Label>
                  <p className="text-sm mt-1">{selectedItem.careInstructions}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p>{formatDate(selectedItem.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Last Updated</Label>
                  <p>{formatDate(selectedItem.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={addEditDialogOpen} onOpenChange={setAddEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Add"} Apparel Item</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update" : "Create a new"} apparel item with dimensions and weight for shipping
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemType">Item Type *</Label>
                <Select value={formData.itemType} onValueChange={handleItemTypeChange}>
                  <SelectTrigger id="itemType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tshirt">T-Shirt</SelectItem>
                    <SelectItem value="hoodie">Hoodie</SelectItem>
                    <SelectItem value="sweatshirt">Sweatshirt</SelectItem>
                    <SelectItem value="cap">Cap</SelectItem>
                    <SelectItem value="beanie">Beanie</SelectItem>
                    <SelectItem value="long_sleeve">Long Sleeve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Black T-Shirt"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the item..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g., TSH-BLK-001"
                />
              </div>
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Manufacturer name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basePrice">Base Price (R) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="retailPrice">Retail Price (R) *</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  value={formData.retailPrice}
                  onChange={(e) => setFormData({ ...formData, retailPrice: Number(e.target.value) })}
                  step="0.01"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-4">
              <h4 className="font-semibold text-[#3D2E17] flex items-center gap-2">
                <Package className="h-4 w-4" />
                Shipping Details
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground">Required for Pudo shipping calculations</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="length">Length (cm) *</Label>
                  <Input
                    id="length"
                    type="number"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="width">Width (cm) *</Label>
                  <Input
                    id="width"
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (cm) *</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Available Sizes *</Label>
              <div className="flex flex-wrap gap-2">
                {["XS", "S", "M", "L", "XL", "XXL", "3XL", "One Size"].map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={formData.availableSizes.includes(size) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSize(size)}
                    className={formData.availableSizes.includes(size) ? "bg-[#006B3E]" : ""}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Available Colors *</Label>
              <div className="flex flex-wrap gap-2">
                {STANDARD_COLORS.map((color) => (
                  <Button
                    key={color.value}
                    type="button"
                    variant={formData.availableColors.includes(color.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleColor(color.value)}
                    className={formData.availableColors.includes(color.value) ? "bg-[#006B3E]" : ""}
                  >
                    <div
                      className="w-4 h-4 rounded-full border mr-2"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="materialComposition">Material Composition</Label>
              <Input
                id="materialComposition"
                value={formData.materialComposition}
                onChange={(e) => setFormData({ ...formData, materialComposition: e.target.value })}
                placeholder="e.g., 100% Cotton"
              />
            </div>

            <div>
              <Label htmlFor="careInstructions">Care Instructions</Label>
              <Textarea
                id="careInstructions"
                value={formData.careInstructions}
                onChange={(e) => setFormData({ ...formData, careInstructions: e.target.value })}
                placeholder="Care instructions..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={formData.inStock}
                  onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="inStock" className="cursor-pointer">In Stock</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveItem} className="bg-[#006B3E] hover:bg-[#005a33]">
              {isEditing ? "Update" : "Create"} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Apparel Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{selectedItem?.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteItem}
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
