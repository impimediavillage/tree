"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Settings,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";
import type { ApparelType } from "@/types/apparel-items";

interface ApparelTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTypesUpdated?: () => void;
}

export function ApparelTypeManager({
  open,
  onOpenChange,
  onTypesUpdated,
}: ApparelTypeManagerProps) {
  const [types, setTypes] = useState<ApparelType[]>([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ApparelType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    category: "tops" as "tops" | "headwear" | "outerwear" | "accessories",
  });

  useEffect(() => {
    if (open) {
      fetchTypes();
    }
  }, [open]);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "apparel_types"), orderBy("displayOrder", "asc"));
      const snapshot = await getDocs(q);
      const typesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ApparelType[];
      setTypes(typesData);
    } catch (error) {
      console.error("Error fetching apparel types:", error);
      toast({
        title: "Error",
        description: "Failed to load apparel types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = () => {
    setEditingType(null);
    setFormData({
      name: "",
      slug: "",
      category: "tops",
    });
    setAddDialogOpen(true);
  };

  const handleEditType = (type: ApparelType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      slug: type.slug,
      category: type.category,
    });
    setAddDialogOpen(true);
  };

  const handleSaveType = async () => {
    if (!formData.name || !formData.slug) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingType) {
        // Update existing type
        const typeRef = doc(db, "apparel_types", editingType.id!);
        await updateDoc(typeRef, {
          name: formData.name,
          slug: formData.slug,
          category: formData.category,
          updatedAt: Timestamp.now(),
        });
        toast({
          title: "Success",
          description: "Apparel type updated successfully",
        });
      } else {
        // Add new type
        await addDoc(collection(db, "apparel_types"), {
          name: formData.name,
          slug: formData.slug,
          category: formData.category,
          displayOrder: types.length,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        toast({
          title: "Success",
          description: "Apparel type added successfully",
        });
      }

      setAddDialogOpen(false);
      fetchTypes();
      onTypesUpdated?.();
    } catch (error: any) {
      console.error("Error saving type:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save apparel type",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (type: ApparelType) => {
    try {
      const typeRef = doc(db, "apparel_types", type.id!);
      await updateDoc(typeRef, {
        isActive: !type.isActive,
        updatedAt: Timestamp.now(),
      });
      toast({
        title: "Success",
        description: `Type ${type.isActive ? "deactivated" : "activated"}`,
      });
      fetchTypes();
      onTypesUpdated?.();
    } catch (error: any) {
      console.error("Error toggling type:", error);
      toast({
        title: "Error",
        description: "Failed to update type status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteType = async (type: ApparelType) => {
    if (
      !confirm(
        `Are you sure you want to delete "${type.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "apparel_types", type.id!));
      toast({
        title: "Success",
        description: "Apparel type deleted successfully",
      });
      fetchTypes();
      onTypesUpdated?.();
    } catch (error: any) {
      console.error("Error deleting type:", error);
      toast({
        title: "Error",
        description: "Failed to delete apparel type",
        variant: "destructive",
      });
    }
  };

  const handleNameChange = (value: string) => {
    setFormData({
      ...formData,
      name: value,
      slug: value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black text-[#3D2E17]">
              <Settings className="h-7 w-7 text-[#006B3E]" />
              Manage Apparel Types
            </DialogTitle>
            <DialogDescription className="text-base text-[#5D4E37] font-bold">
              Add, edit, or remove apparel types available in the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-[#5D4E37] font-bold">
                {types.length} types • {types.filter((t) => t.isActive).length} active
              </p>
              <Button onClick={handleAddType} className="bg-[#006B3E] hover:bg-[#005a33]">
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="h-8 w-8 text-[#006B3E] animate-spin" />
              </div>
            ) : (
              <div className="rounded-xl border-2 border-[#006B3E]/20 overflow-hidden bg-muted/50">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {types.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-[#5D4E37] font-bold">No types found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      types.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          </TableCell>
                          <TableCell className="font-bold text-[#3D2E17]">
                            {type.name}
                          </TableCell>
                          <TableCell>
                            <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                              {type.slug}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{type.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(type)}
                              className="h-7 px-2"
                            >
                              {type.isActive ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                  <span className="text-green-600 font-bold text-xs">Active</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-gray-400 mr-1" />
                                  <span className="text-gray-400 font-bold text-xs">Inactive</span>
                                </>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditType(type)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteType(type)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-[#3D2E17]">
              {editingType ? "Edit" : "Add"} Apparel Type
            </DialogTitle>
            <DialogDescription>
              {editingType ? "Update" : "Create a new"} apparel type for your system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="typeName" className="text-sm font-bold text-[#3D2E17]">
                Name *
              </Label>
              <Input
                id="typeName"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Tank Top, Vest, Jacket"
              />
            </div>

            <div>
              <Label htmlFor="typeSlug" className="text-sm font-bold text-[#3D2E17]">
                Slug * (auto-generated)
              </Label>
              <Input
                id="typeSlug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., tank_top"
              />
              <p className="text-xs text-[#5D4E37] mt-1">
                Used as unique identifier in code
              </p>
            </div>

            <div>
              <Label htmlFor="typeCategory" className="text-sm font-bold text-[#3D2E17]">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger id="typeCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tops">Tops</SelectItem>
                  <SelectItem value="headwear">Headwear</SelectItem>
                  <SelectItem value="outerwear">Outerwear</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveType} className="bg-[#006B3E] hover:bg-[#005a33]">
              {editingType ? "Update" : "Add"} Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
