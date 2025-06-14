
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { DispensaryTypeProductCategoriesDoc, ProductCategory, User } from '@/types';
import { dispensaryTypeProductCategoriesSchema, type DispensaryTypeProductCategoriesFormData } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowLeft, PackagePlus, Save, ListFilter, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';

export default function EditDispensaryTypeCategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const dispensaryTypeName = params.dispensaryTypeName ? decodeURIComponent(params.dispensaryTypeName as string) : null;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [initialCategories, setInitialCategories] = useState<ProductCategory[]>([]);

  const form = useForm<DispensaryTypeProductCategoriesFormData>({
    resolver: zodResolver(dispensaryTypeProductCategoriesSchema),
    defaultValues: {
      categories: [],
    },
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory, update: updateCategory } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  const fetchCategories = useCallback(async () => {
    if (!dispensaryTypeName) {
      toast({ title: "Error", description: "Dispensary type name not provided.", variant: "destructive" });
      router.push('/admin/dashboard/dispensary-types');
      return;
    }
    setIsFetchingData(true);
    try {
      const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', dispensaryTypeName);
      const docSnap = await getDoc(categoriesDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as DispensaryTypeProductCategoriesDoc;
        form.reset({ categories: data.categories || [] });
        setInitialCategories(data.categories || []);
      } else {
        form.reset({ categories: [] }); // No existing categories, start fresh
        setInitialCategories([]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({ title: "Error", description: "Could not load categories for this type.", variant: "destructive" });
    } finally {
      setIsFetchingData(false);
    }
  }, [dispensaryTypeName, form, toast, router]);

  useEffect(() => {
     if (authLoading) return;
     if (!currentUser || currentUser.role !== 'Super Admin') {
        toast({ title: "Access Denied", description: "Only Super Admins can manage these settings.", variant: "destructive" });
        router.push('/admin/dashboard');
        return;
     }
    fetchCategories();
  }, [authLoading, currentUser, fetchCategories, router, toast]);


  const onSubmit = async (data: DispensaryTypeProductCategoriesFormData) => {
    if (!dispensaryTypeName || !currentUser || currentUser.role !== 'Super Admin') return;
    setIsLoading(true);
    try {
      const categoriesDocRef = doc(db, 'dispensaryTypeProductCategories', dispensaryTypeName);
      await setDoc(categoriesDocRef, {
        name: dispensaryTypeName, // Store the type name for reference
        categories: data.categories,
        updatedAt: serverTimestamp(),
      }, { merge: true }); // Use merge to create if not exists, or update if it does

      toast({ title: "Categories Saved", description: `Product categories for "${dispensaryTypeName}" have been updated.` });
      router.push('/admin/dashboard/dispensary-types');
    } catch (error) {
      console.error("Error saving categories:", error);
      toast({ title: "Save Failed", description: "Could not save product categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const addSubcategory = (categoryIndex: number) => {
    const currentCategory = form.getValues(`categories.${categoryIndex}`);
    const newSubcategories = [...(currentCategory.subcategories || []), "New Subcategory"];
    updateCategory(categoryIndex, { ...currentCategory, subcategories: newSubcategories });
  };

  const removeSubcategory = (categoryIndex: number, subcategoryIndex: number) => {
    const currentCategory = form.getValues(`categories.${categoryIndex}`);
    const updatedSubcategories = currentCategory.subcategories?.filter((_, index) => index !== subcategoryIndex);
    updateCategory(categoryIndex, { ...currentCategory, subcategories: updatedSubcategories });
  };


  if (authLoading || isFetchingData) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <Skeleton className="h-10 w-1/2 mb-2" />
        <Skeleton className="h-8 w-3/4 mb-6" />
        <Card className="shadow-xl">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentUser || currentUser.role !== 'Super Admin') {
    return <div className="p-4 text-center text-destructive">Access Denied.</div>;
  }


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold text-primary flex items-center">
                <ListFilter className="mr-3 h-8 w-8" /> Manage Product Categories
            </h1>
            <p className="text-muted-foreground text-lg">
                For Dispensary Type: <span className="font-semibold text-foreground">{dispensaryTypeName}</span>
            </p>
        </div>
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard/dispensary-types"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Types</Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Categories & Subcategories</CardTitle>
              <CardDescription>
                Define the main product categories and their respective subcategories for this dispensary type.
                This structure will guide product creation for dispensaries of this type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categoryFields.map((categoryItem, categoryIndex) => (
                <Card key={categoryItem.id} className="p-4 border bg-card shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <FormField
                      control={form.control}
                      name={`categories.${categoryIndex}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-grow mr-2">
                          <FormLabel className="text-base">Main Category Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Flowers, Edibles, Concentrates" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" type="button" className="text-destructive hover:bg-destructive/10 mt-6">
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Main Category?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the category &quot;{form.getValues(`categories.${categoryIndex}.name`)}&quot; and all its subcategories? This action cannot be undone.
                            </AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeCategory(categoryIndex)} className="bg-destructive hover:bg-destructive/90">Delete Category</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  
                  <div className="ml-4 pl-4 border-l space-y-3">
                    <FormLabel className="text-sm text-muted-foreground">Subcategories:</FormLabel>
                    {form.watch(`categories.${categoryIndex}.subcategories`)?.map((_, subcategoryIndex) => (
                      <div key={`${categoryItem.id}-sub-${subcategoryIndex}`} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`categories.${categoryIndex}.subcategories.${subcategoryIndex}`}
                          render={({ field }) => (
                            <FormItem className="flex-grow">
                              <FormControl>
                                <Input {...field} placeholder="Subcategory name (e.g., Indica, Gummies)" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button variant="ghost" size="icon" type="button" onClick={() => removeSubcategory(categoryIndex, subcategoryIndex)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addSubcategory(categoryIndex)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Subcategory
                    </Button>
                  </div>
                </Card>
              ))}
              <Button type="button" variant="secondary" onClick={() => appendCategory({ name: 'New Category', subcategories: [] })}>
                <PackagePlus className="mr-2 h-4 w-4" /> Add Main Category
              </Button>
            </CardContent>
            <CardFooter className="border-t pt-6">
                <div className="flex gap-4 w-full">
                    <Button type="submit" size="lg" className="flex-1 text-lg" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Save Category Structure
                    </Button>
                    <Button type="button" variant="outline" size="lg" className="flex-1 text-lg" disabled={isLoading} onClick={() => router.back()}>
                        Cancel
                    </Button>
                </div>
            </CardFooter>
          </Card>
        </form>
      </Form>
       {initialCategories.length === 0 && !isFetchingData && categoryFields.length === 0 && (
        <Card className="mt-6 border-dashed border-yellow-500 bg-yellow-50">
            <CardContent className="pt-6 text-center text-yellow-700">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
                <p className="font-semibold">No categories defined yet for &quot;{dispensaryTypeName}&quot;.</p>
                <p className="text-sm">Click &quot;Add Main Category&quot; to start building the product structure.</p>
            </CardContent>
        </Card>
       )}
    </div>
  );
}
