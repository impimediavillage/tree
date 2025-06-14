
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
import { Loader2, PlusCircle, Trash2, ArrowLeft, PackagePlus, Save, ListFilter, AlertTriangle, GripVertical } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// Component for managing a single category's subcategories
function SubcategoryManager({ categoryIndex, control, register, getValues, setValue }: {
  categoryIndex: number;
  control: any; // Control<DispensaryTypeProductCategoriesFormData>
  register: any; // UseFormRegister<DispensaryTypeProductCategoriesFormData>
  getValues: any; // UseFormGetValues<DispensaryTypeProductCategoriesFormData>
  setValue: any; // UseFormSetValue<DispensaryTypeProductCategoriesFormData>
}) {
  const { fields: subcategoryFields, append: appendSubcategory, remove: removeSubcategory } = useFieldArray({
    control,
    name: `categories.${categoryIndex}.subcategories`,
  });

  return (
    <div className="ml-4 pl-4 border-l-2 border-dashed border-muted-foreground/30 space-y-3 py-3">
      <FormLabel className="text-sm text-muted-foreground block mb-2">Subcategories:</FormLabel>
      {subcategoryFields.map((subItem, subIndex) => (
        <div key={subItem.id} className="flex items-center gap-2 animate-fade-in-scale-up" style={{ animationDuration: '0.3s', animationDelay: `${subIndex * 50}ms`}}>
          <FormField
            control={control}
            name={`categories.${categoryIndex}.subcategories.${subIndex}`}
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormControl>
                  <Input {...field} placeholder="Subcategory name (e.g., Indica)" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button variant="ghost" size="icon" type="button" onClick={() => removeSubcategory(subIndex)} className="text-destructive hover:bg-destructive/10 shrink-0">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => appendSubcategory('')}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Subcategory
      </Button>
    </div>
  );
}


export default function EditDispensaryTypeCategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const dispensaryTypeName = params.dispensaryTypeName ? decodeURIComponent(params.dispensaryTypeName as string) : null;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);

  const form = useForm<DispensaryTypeProductCategoriesFormData>({
    resolver: zodResolver(dispensaryTypeProductCategoriesSchema),
    defaultValues: {
      categories: [],
    },
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
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
        // Ensure subcategories is always an array, even if undefined in Firestore
        const sanitizedCategories = (data.categories || []).map(cat => ({
          ...cat,
          subcategories: cat.subcategories || [] 
        }));
        form.reset({ categories: sanitizedCategories });
      } else {
        form.reset({ categories: [] }); 
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
      // Filter out empty subcategory strings before saving
      const categoriesToSave = data.categories.map(cat => ({
        ...cat,
        subcategories: cat.subcategories?.filter(sub => sub && sub.trim() !== '') || []
      }));

      await setDoc(categoriesDocRef, {
        name: dispensaryTypeName, 
        categories: categoriesToSave,
        updatedAt: serverTimestamp(),
      }, { merge: true }); 

      toast({ title: "Categories Saved", description: `Product categories for "${dispensaryTypeName}" have been updated.` });
      router.push('/admin/dashboard/dispensary-types');
    } catch (error) {
      console.error("Error saving categories:", error);
      toast({ title: "Save Failed", description: "Could not save product categories.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  

  if (authLoading || isFetchingData) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-8 w-3/4 mb-6" />
        <Card className="shadow-xl animate-pulse">
          <CardHeader><Skeleton className="h-8 w-1/3" /><Skeleton className="h-5 w-2/3 mt-1" /></CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-4 border bg-muted rounded-md space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="ml-4 pl-4 border-l space-y-3"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-8 w-1/4" /></div>
            </div>
            <Skeleton className="h-10 w-1/3" />
          </CardContent>
          <CardFooter><Skeleton className="h-12 w-full" /></CardFooter>
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
            <p className="text-lg text-muted-foreground">
                For Dispensary Type: <span className="font-semibold text-foreground">{dispensaryTypeName}</span>
            </p>
        </div>
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/dashboard/dispensary-types"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Types</Link>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-xl border-primary/20">
            <CardHeader>
              <CardTitle>Category Structure</CardTitle>
              <CardDescription>
                Define main product categories and their specific subcategories for dispensaries of type &quot;{dispensaryTypeName}&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {categoryFields.map((categoryItem, categoryIndex) => (
                <Card key={categoryItem.id} className="p-4 bg-card border shadow-md relative animate-fade-in-scale-up" style={{ animationDuration: '0.4s', animationDelay: `${categoryIndex * 100}ms`}}>
                  {/* <GripVertical className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-grab" /> */}
                  <div className="flex items-start justify-between mb-3">
                    <FormField
                      control={form.control}
                      name={`categories.${categoryIndex}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-grow mr-2">
                          <FormLabel className="text-base font-semibold">Main Category Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Flowers, Edibles, Concentrates" className="text-base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" type="button" className="text-destructive hover:bg-destructive/10 mt-6 shrink-0">
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
                  
                  <SubcategoryManager 
                    categoryIndex={categoryIndex} 
                    control={form.control} 
                    register={form.register} 
                    getValues={form.getValues}
                    setValue={form.setValue}
                  />
                </Card>
              ))}
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => appendCategory({ name: '', subcategories: [] })}
                className="text-base py-3"
              >
                <PackagePlus className="mr-2 h-5 w-5" /> Add Main Category
              </Button>
            </CardContent>
            <CardFooter className="border-t pt-6 bg-muted/30 -mx-6 px-6 pb-6">
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
       {categoryFields.length === 0 && !isFetchingData && (
        <Card className="mt-6 border-dashed border-amber-500 bg-amber-50/50 shadow-none">
            <CardContent className="pt-6 text-center text-amber-700">
                <AlertTriangle className="mx-auto h-10 w-10 mb-3"/>
                <p className="text-lg font-semibold">No Categories Defined Yet</p>
                <p className="text-sm">Click &quot;Add Main Category&quot; to start building the product structure for &quot;{dispensaryTypeName}&quot;.</p>
            </CardContent>
        </Card>
       )}
    </div>
  );
}

