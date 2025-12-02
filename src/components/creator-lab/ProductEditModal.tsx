'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Save, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { TreehouseProduct } from '@/types/creator-lab';

interface ProductEditModalProps {
  product: TreehouseProduct;
  onClose: () => void;
  onUpdate: () => void;
}

export function ProductEditModal({ product, onClose, onUpdate }: ProductEditModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [productName, setProductName] = useState(product.productName || '');
  const [productDescription, setProductDescription] = useState(product.productDescription || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateProduct = httpsCallable(functions, 'updateTreehouseProduct');
      await updateProduct({
        productId: product.id,
        updates: {
          productName,
          productDescription,
        },
      });

      toast({
        title: 'Product Updated',
        description: 'Changes saved successfully',
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-extrabold text-[#3D2E17]">Edit Product</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Product Info</TabsTrigger>
              <TabsTrigger value="logo">Logo</TabsTrigger>
              <TabsTrigger value="mockup">Mockup</TabsTrigger>
              <TabsTrigger value="model">Model Photo</TabsTrigger>
            </TabsList>

            {/* Product Info Tab */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-bold text-[#3D2E17] mb-2">
                  Product Name
                </label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Give your product a name"
                  className="border-[#5D4E37]/30"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3D2E17] mb-2">
                  Description
                </label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Describe your design (optional)"
                  rows={4}
                  className="border-[#5D4E37]/30"
                />
              </div>

              <div className="bg-[#006B3E]/10 border-2 border-[#006B3E] rounded-lg p-4">
                <p className="text-sm font-bold text-[#3D2E17] mb-1">Product Details:</p>
                <p className="text-sm text-[#5D4E37]">
                  <strong>Type:</strong> {product.apparelType}<br />
                  <strong>Surface:</strong> {product.surface || 'front'}<br />
                  <strong>Price:</strong> R{product.price}<br />
                  <strong>Sales:</strong> {product.salesCount || 0} sold
                </p>
              </div>
            </TabsContent>

            {/* Logo Tab */}
            <TabsContent value="logo" className="space-y-4 mt-4">
              <div className="text-center">
                <p className="text-sm font-bold text-[#3D2E17] mb-4">
                  High-Resolution Logo (For Printing)
                </p>
                {product.logoImageUrl ? (
                  <div className="relative aspect-square max-w-md mx-auto border-4 border-[#006B3E] rounded-lg overflow-hidden bg-white">
                    <Image
                      src={product.logoImageUrl}
                      alt="Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-square max-w-md mx-auto border-4 border-dashed border-[#5D4E37]/30 rounded-lg flex items-center justify-center bg-gray-50">
                    <p className="text-[#5D4E37]">No logo image</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-semibold">
                  💡 <strong>Tip:</strong> The logo is the clean design file used for POD printing. Regenerating will create a new design with 10 credits.
                </p>
              </div>
            </TabsContent>

            {/* Mockup Tab */}
            <TabsContent value="mockup" className="space-y-4 mt-4">
              <div className="text-center">
                <p className="text-sm font-bold text-[#3D2E17] mb-4">
                  Product Mockup (Display Image)
                </p>
                {product.designImageUrl ? (
                  <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden bg-black p-8">
                    <Image
                      src={product.designImageUrl}
                      alt="Mockup"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-square max-w-md mx-auto border-4 border-dashed border-[#5D4E37]/30 rounded-lg flex items-center justify-center bg-gray-50">
                    <p className="text-[#5D4E37]">No mockup image</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-semibold">
                  💡 <strong>Tip:</strong> The mockup shows your logo on the black {product.apparelType}. This is generated by overlaying your logo on the apparel template.
                </p>
              </div>
            </TabsContent>

            {/* Model Photo Tab */}
            <TabsContent value="model" className="space-y-4 mt-4">
              <div className="text-center">
                <p className="text-sm font-bold text-[#3D2E17] mb-4">
                  Lifestyle Photo (Model Wearing Product)
                </p>
                {product.modelImageUrl ? (
                  <div className="relative aspect-square max-w-md mx-auto rounded-lg overflow-hidden">
                    <Image
                      src={product.modelImageUrl}
                      alt="Model"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square max-w-md mx-auto border-4 border-dashed border-[#5D4E37]/30 rounded-lg flex items-center justify-center bg-gray-50">
                    <p className="text-[#5D4E37]">No model photo yet</p>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-semibold">
                  💡 <strong>Tip:</strong> Add a lifestyle photo showing a model wearing your design. This helps customers visualize the product (10 credits).
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#5D4E37]/30"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#006B3E] hover:bg-[#005230]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
