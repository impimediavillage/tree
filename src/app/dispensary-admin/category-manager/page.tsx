'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, limit as firestoreLimit } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Edit, Save, X, Sparkles, Leaf, ImageIcon, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface NutritionalInfo {
  calories_per_100g?: number;
  protein_g?: number;
  fat_g?: number;
  carbohydrates_g?: number;
  fiber_g?: number;
  bioactives?: string[];
}

interface Dosage {
  [key: string]: string;
}

interface MushroomProduct {
  name: string;
  description: string;
  scientific_name?: string;
  sub_category?: string;
  benefits?: string[];
  nutritional_info?: NutritionalInfo;
  dosage?: Dosage;
  safety_warnings?: string;
  legal_disclaimer?: string;
  product_formats: string[];
  imageUrl: string;
}

interface TopLevelCategory {
  category_name: string;
  description: string;
  imageUrl: string;
  products: MushroomProduct[];
}

export default function CategoryManagerPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [categories, setCategories] = useState<TopLevelCategory[]>([]);
  
  // Category form state
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState<TopLevelCategory>({
    category_name: '',
    description: '',
    imageUrl: '',
    products: []
  });

  // Product form state
  const [editingProductData, setEditingProductData] = useState<{
    categoryIndex: number;
    productIndex: number | null;
    product: MushroomProduct;
  } | null>(null);

  const fetchCategoryData = useCallback(async () => {
    if (!currentDispensary?.dispensaryType) return;

    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'dispensaryTypeProductCategories'),
        where('name', '==', currentDispensary.dispensaryType),
        firestoreLimit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setDocId(docSnap.id);
        const data = docSnap.data();
        const categoriesData = data?.categoriesData?.mushroomProductCategories || [];
        setCategories(categoriesData);
      } else {
        toast({
          title: 'Notice',
          description: `No category structure found for ${currentDispensary.dispensaryType}`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load category structure',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentDispensary?.dispensaryType, toast]);

  useEffect(() => {
    if (!authLoading && currentDispensary?.dispensaryType === 'Mushroom store') {
      fetchCategoryData();
    }
  }, [authLoading, currentDispensary?.dispensaryType, fetchCategoryData]);

  const handleSaveCategories = async () => {
    if (!docId) {
      toast({ title: 'Error', description: 'No document ID found', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'dispensaryTypeProductCategories', docId);
      await updateDoc(docRef, {
        'categoriesData.mushroomProductCategories': categories,
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Success',
        description: 'Category structure updated successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to save category structure',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.category_name || !newCategory.description) {
      toast({ title: 'Error', description: 'Please fill in category name and description', variant: 'destructive' });
      return;
    }

    setCategories([...categories, { ...newCategory }]);
    setNewCategory({ category_name: '', description: '', imageUrl: '', products: [] });
    toast({ title: 'Success', description: 'Category added (click Save to persist)', variant: 'default' });
  };

  const handleDeleteCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
    toast({ title: 'Success', description: 'Category removed (click Save to persist)', variant: 'default' });
  };

  const handleUpdateCategory = (index: number, field: keyof TopLevelCategory, value: any) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const handleAddProduct = (categoryIndex: number) => {
    setEditingProductData({
      categoryIndex,
      productIndex: null,
      product: {
        name: '',
        description: '',
        scientific_name: '',
        sub_category: '',
        benefits: [],
        nutritional_info: { bioactives: [] },
        dosage: {},
        safety_warnings: '',
        legal_disclaimer: '',
        product_formats: [],
        imageUrl: ''
      }
    });
  };

  const handleEditProduct = (categoryIndex: number, productIndex: number) => {
    setEditingProductData({
      categoryIndex,
      productIndex,
      product: { ...categories[categoryIndex].products[productIndex] }
    });
  };

  const handleSaveProduct = () => {
    if (!editingProductData) return;

    const { categoryIndex, productIndex, product } = editingProductData;

    if (!product.name || !product.description) {
      toast({ title: 'Error', description: 'Product name and description are required', variant: 'destructive' });
      return;
    }

    const updated = [...categories];
    if (productIndex === null) {
      // Adding new product
      updated[categoryIndex].products.push(product);
    } else {
      // Updating existing product
      updated[categoryIndex].products[productIndex] = product;
    }

    setCategories(updated);
    setEditingProductData(null);
    toast({ title: 'Success', description: 'Product saved (click Save to persist)', variant: 'default' });
  };

  const handleDeleteProduct = (categoryIndex: number, productIndex: number) => {
    const updated = [...categories];
    updated[categoryIndex].products = updated[categoryIndex].products.filter((_, i) => i !== productIndex);
    setCategories(updated);
    toast({ title: 'Success', description: 'Product removed (click Save to persist)', variant: 'default' });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading category manager...</p>
        </div>
      </div>
    );
  }

  if (currentDispensary?.dispensaryType !== 'Mushroom store') {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              This category manager is only available for Mushroom store dispensaries.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#3D2E17] flex items-center gap-3">
            <Sparkles className="h-10 w-10 text-[#006B3E]" />
            Category Manager
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage product categories and subcategories for Mushroom store
          </p>
        </div>
        <Button
          onClick={handleSaveCategories}
          disabled={isSaving}
          size="lg"
          className="bg-[#006B3E] hover:bg-[#005230] text-white"
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="categories">Manage Categories</TabsTrigger>
          <TabsTrigger value="preview">Preview Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          {/* Add New Category Section */}
          <Card className="border-2 border-dashed border-[#006B3E]/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Category
              </CardTitle>
              <CardDescription>Create a new top-level category for mushroom products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-cat-name">Category Name *</Label>
                  <Input
                    id="new-cat-name"
                    value={newCategory.category_name}
                    onChange={(e) => setNewCategory({ ...newCategory, category_name: e.target.value })}
                    placeholder="e.g., Medicinal Mushrooms"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-cat-image">Image URL</Label>
                  <Input
                    id="new-cat-image"
                    value={newCategory.imageUrl}
                    onChange={(e) => setNewCategory({ ...newCategory, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-cat-desc">Description *</Label>
                <Textarea
                  id="new-cat-desc"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Describe this category..."
                  rows={3}
                />
              </div>
              <Button onClick={handleAddCategory} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardContent>
          </Card>

          {/* Existing Categories */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Existing Categories ({categories.length})</h2>
            {categories.map((category, catIndex) => (
              <Card key={catIndex} className="border-[#006B3E]/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {editingCategoryIndex === catIndex ? (
                        <>
                          <Input
                            value={category.category_name}
                            onChange={(e) => handleUpdateCategory(catIndex, 'category_name', e.target.value)}
                            className="font-bold text-lg"
                          />
                          <Textarea
                            value={category.description}
                            onChange={(e) => handleUpdateCategory(catIndex, 'description', e.target.value)}
                            rows={2}
                          />
                          <Input
                            value={category.imageUrl}
                            onChange={(e) => handleUpdateCategory(catIndex, 'imageUrl', e.target.value)}
                            placeholder="Image URL"
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-2xl">{category.category_name}</CardTitle>
                            <Badge variant="secondary">{category.products.length} products</Badge>
                          </div>
                          <CardDescription className="text-sm">{category.description}</CardDescription>
                          {category.imageUrl && (
                            <div className="relative w-full h-32 rounded-md overflow-hidden">
                              <Image src={category.imageUrl} alt={category.category_name} fill className="object-cover" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editingCategoryIndex === catIndex ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCategoryIndex(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCategoryIndex(catIndex)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(catIndex)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Products</h3>
                    <Button
                      onClick={() => handleAddProduct(catIndex)}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {category.products.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No products yet</p>
                    ) : (
                      category.products.map((product, prodIndex) => (
                        <div
                          key={prodIndex}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1">
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.scientific_name}</p>
                            <div className="flex gap-2 mt-1">
                              {product.product_formats.map((format, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {format}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(catIndex, prodIndex)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduct(catIndex, prodIndex)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Structure Preview</CardTitle>
              <CardDescription>Visual representation of your category hierarchy</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {categories.map((category, catIndex) => (
                  <AccordionItem key={catIndex} value={`cat-${catIndex}`}>
                    <AccordionTrigger className="text-lg font-bold">
                      {category.category_name} ({category.products.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-4">
                        {category.products.map((product, prodIndex) => (
                          <div key={prodIndex} className="border-l-2 border-[#006B3E] pl-4 py-2">
                            <p className="font-semibold text-[#3D2E17]">{product.name}</p>
                            {product.scientific_name && (
                              <p className="text-sm italic text-muted-foreground">{product.scientific_name}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {product.product_formats.map((format, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {format}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Edit Dialog */}
      <Dialog open={editingProductData !== null} onOpenChange={(open) => !open && setEditingProductData(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProductData?.productIndex === null ? 'Add New Product' : 'Edit Product'}
            </DialogTitle>
            <DialogDescription>
              Fill in the product details below
            </DialogDescription>
          </DialogHeader>
          
          {editingProductData && (
            <ProductForm
              product={editingProductData.product}
              onChange={(updated) => setEditingProductData({ ...editingProductData, product: updated })}
              onSave={handleSaveProduct}
              onCancel={() => setEditingProductData(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Product Form Component
function ProductForm({
  product,
  onChange,
  onSave,
  onCancel
}: {
  product: MushroomProduct;
  onChange: (product: MushroomProduct) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [newBenefit, setNewBenefit] = useState('');
  const [newBioactive, setNewBioactive] = useState('');
  const [newFormat, setNewFormat] = useState('');
  const [newDosageKey, setNewDosageKey] = useState('');
  const [newDosageValue, setNewDosageValue] = useState('');

  const updateProduct = (field: keyof MushroomProduct, value: any) => {
    onChange({ ...product, [field]: value });
  };

  const updateNutritionalInfo = (field: keyof NutritionalInfo, value: any) => {
    onChange({
      ...product,
      nutritional_info: { ...product.nutritional_info, [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Product Name *</Label>
            <Input
              value={product.name}
              onChange={(e) => updateProduct('name', e.target.value)}
              placeholder="e.g., Lion's Mane"
            />
          </div>
          <div className="space-y-2">
            <Label>Scientific Name</Label>
            <Input
              value={product.scientific_name || ''}
              onChange={(e) => updateProduct('scientific_name', e.target.value)}
              placeholder="e.g., Hericium erinaceus"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description *</Label>
          <Textarea
            value={product.description}
            onChange={(e) => updateProduct('description', e.target.value)}
            placeholder="Describe this product..."
            rows={3}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sub Category</Label>
            <Input
              value={product.sub_category || ''}
              onChange={(e) => updateProduct('sub_category', e.target.value)}
              placeholder="e.g., Culinary"
            />
          </div>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={product.imageUrl}
              onChange={(e) => updateProduct('imageUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      {/* Product Formats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Product Formats</h3>
        <div className="flex gap-2">
          <Input
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value)}
            placeholder="e.g., Powder, Capsules, Extract"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newFormat) {
                updateProduct('product_formats', [...product.product_formats, newFormat]);
                setNewFormat('');
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              if (newFormat) {
                updateProduct('product_formats', [...product.product_formats, newFormat]);
                setNewFormat('');
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.product_formats.map((format, i) => (
            <Badge key={i} variant="secondary" className="gap-2">
              {format}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateProduct('product_formats', product.product_formats.filter((_, idx) => idx !== i))}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Benefits</h3>
        <div className="flex gap-2">
          <Input
            value={newBenefit}
            onChange={(e) => setNewBenefit(e.target.value)}
            placeholder="Add a benefit..."
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newBenefit) {
                updateProduct('benefits', [...(product.benefits || []), newBenefit]);
                setNewBenefit('');
              }
            }}
          />
          <Button
            type="button"
            onClick={() => {
              if (newBenefit) {
                updateProduct('benefits', [...(product.benefits || []), newBenefit]);
                setNewBenefit('');
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {(product.benefits || []).map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
              <Leaf className="h-4 w-4 text-green-600" />
              <span className="flex-1">{benefit}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => updateProduct('benefits', product.benefits?.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Nutritional Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Nutritional Information (per 100g)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Calories</Label>
            <Input
              type="number"
              value={product.nutritional_info?.calories_per_100g || ''}
              onChange={(e) => updateNutritionalInfo('calories_per_100g', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Protein (g)</Label>
            <Input
              type="number"
              value={product.nutritional_info?.protein_g || ''}
              onChange={(e) => updateNutritionalInfo('protein_g', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fat (g)</Label>
            <Input
              type="number"
              value={product.nutritional_info?.fat_g || ''}
              onChange={(e) => updateNutritionalInfo('fat_g', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Carbs (g)</Label>
            <Input
              type="number"
              value={product.nutritional_info?.carbohydrates_g || ''}
              onChange={(e) => updateNutritionalInfo('carbohydrates_g', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fiber (g)</Label>
            <Input
              type="number"
              value={product.nutritional_info?.fiber_g || ''}
              onChange={(e) => updateNutritionalInfo('fiber_g', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bioactive Compounds</Label>
          <div className="flex gap-2">
            <Input
              value={newBioactive}
              onChange={(e) => setNewBioactive(e.target.value)}
              placeholder="e.g., Beta-glucans"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newBioactive) {
                  updateNutritionalInfo('bioactives', [...(product.nutritional_info?.bioactives || []), newBioactive]);
                  setNewBioactive('');
                }
              }}
            />
            <Button
              type="button"
              onClick={() => {
                if (newBioactive) {
                  updateNutritionalInfo('bioactives', [...(product.nutritional_info?.bioactives || []), newBioactive]);
                  setNewBioactive('');
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(product.nutritional_info?.bioactives || []).map((bioactive, i) => (
              <Badge key={i} variant="outline" className="gap-2">
                {bioactive}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => updateNutritionalInfo('bioactives', product.nutritional_info?.bioactives?.filter((_, idx) => idx !== i))}
                />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Dosage */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Dosage Information</h3>
        <div className="flex gap-2">
          <Input
            value={newDosageKey}
            onChange={(e) => setNewDosageKey(e.target.value)}
            placeholder="Dosage type (e.g., daily_serving)"
            className="flex-1"
          />
          <Input
            value={newDosageValue}
            onChange={(e) => setNewDosageValue(e.target.value)}
            placeholder="Amount (e.g., 1-2g)"
            className="flex-1"
          />
          <Button
            type="button"
            onClick={() => {
              if (newDosageKey && newDosageValue) {
                updateProduct('dosage', { ...(product.dosage || {}), [newDosageKey]: newDosageValue });
                setNewDosageKey('');
                setNewDosageValue('');
              }
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {Object.entries(product.dosage || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <span className="font-semibold">{key.replace(/_/g, ' ')}: </span>
                <span>{value}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newDosage = { ...product.dosage };
                  delete newDosage[key];
                  updateProduct('dosage', newDosage);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Legal */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Safety & Legal</h3>
        <div className="space-y-2">
          <Label>Safety Warnings</Label>
          <Textarea
            value={product.safety_warnings || ''}
            onChange={(e) => updateProduct('safety_warnings', e.target.value)}
            placeholder="Any safety warnings or contraindications..."
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Legal Disclaimer</Label>
          <Textarea
            value={product.legal_disclaimer || ''}
            onChange={(e) => updateProduct('legal_disclaimer', e.target.value)}
            placeholder="Legal disclaimer text..."
            rows={3}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={onSave} className="flex-1 bg-[#006B3E] hover:bg-[#005230]">
          <Save className="h-4 w-4 mr-2" />
          Save Product
        </Button>
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
