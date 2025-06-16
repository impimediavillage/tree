
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, query as firestoreQuery, collection, where, limit } from 'firebase/firestore';
import type { DispensaryTypeProductCategoriesDoc, ProductCategory, User } from '@/types';
import { dispensaryTypeProductCategoriesSchema, type DispensaryTypeProductCategoriesFormData } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ArrowLeft, PackagePlus, Save, ListFilter, AlertTriangle, GripVertical, CornerDownLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Recursive component to manage nested subcategories
const NestedSubcategoryManager: React.FC<{
  nestingLevel: number;
  control: any; // Control<DispensaryTypeProductCategoriesFormData>
  pathPrefix: string; // e.g., `categories.${categoryIndex}.subcategories` OR `categories.${catIdx}.subcategories.${subCatIdx}.subcategories`
  register: any;
  getValues: any;
  setValue: any;
  disabled?: boolean;
}> = ({ nestingLevel, control, pathPrefix, register, getValues, setValue, disabled }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${pathPrefix}`,
  });

  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [expanded, setExpanded] = React.useState(true); // Manage expansion state

  const handleAddSubcategory = () => {
    if (newSubcategoryName.trim() === '') return;
    append({ name: newSubcategoryName.trim(), subcategories: [] });
    setNewSubcategoryName('');
  };

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  if (nestingLevel >= 2) { // Limit UI nesting to 2 levels of subcategories (Main -> Sub -> SubSub)
    return (
         <div className={cn("ml-4 pl-4 border-l-2 border-dashed", nestingLevel === 0 ? "border-primary/30" : "border-accent/30")}>
            <FormLabel className="text-xs text-muted-foreground block mb-1">
                {nestingLevel === 0 ? "Subcategories" : "Sub-Subcategories"}:
            </FormLabel>
            {fields.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2 mb-2 animate-fade-in-scale-up" style={{ animationDuration: '0.2s', animationDelay: `${index * 30}ms`}}>
                <FormField
                    control={control}
                    name={`${pathPrefix}.${index}.name`}
                    render={({ field }) => (
                    <FormItem className="flex-grow">
                        <FormControl>
                        <Input {...field} placeholder="Subcategory name" className="h-8 text-sm" disabled={disabled} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                    </FormItem>
                    )}
                />
                {!disabled && (
                  <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8">
                      <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                </div>
            ))}
            {!disabled && (
              <div className="flex items-center gap-2 mt-1">
                  <Input
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder={`Add ${nestingLevel === 0 ? "Subcategory" : "Sub-Subcategory"}`}
                      className="h-8 text-sm flex-grow"
                      onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddSubcategory();}}}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleAddSubcategory} className="h-8 w-8 shrink-0">
                      <CornerDownLeft className="h-3.5 w-3.5" />
                  </Button>
              </div>
            )}
        </div>
    );
  }


  return (
    <div className={cn("ml-4 pl-4 border-l-2 border-dashed", nestingLevel === 0 ? "border-primary/30" : "border-accent/30")}>
      <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center text-xs text-muted-foreground mb-1 hover:text-foreground">
        <ChevronIcon className="h-4 w-4 mr-1" />
        {expanded ? 'Hide' : 'Show'} {nestingLevel === 0 ? "Subcategories (L1)" : "Subcategories (L2)"}
      </button>
      {expanded && fields.map((item: any, index) => (
        <Card key={item.id} className="p-2.5 mb-2 bg-muted/30 border-border/50 shadow-sm animate-fade-in-scale-up" style={{ animationDuration: '0.2s', animationDelay: `${index * 30}ms`}}>
          <div className="flex items-center gap-2 mb-1.5">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
            <FormField
              control={control}
              name={`${pathPrefix}.${index}.name`}
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <FormControl>
                    <Input {...field} placeholder={`Name for Subcategory Level ${nestingLevel + 1}`} className="h-8 text-sm" disabled={disabled}/>
                  </FormControl>
                  <FormMessage className="text-xs"/>
                </FormItem>
              )}
            />
            {!disabled && (
              <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {/* Recursively render for next level if nestingLevel < 1 (allows Main -> Sub -> SubSub) */}
          {nestingLevel < 1 && (
            <NestedSubcategoryManager
              nestingLevel={nestingLevel + 1}
              control={control}
              pathPrefix={`${pathPrefix}.${index}.subcategories`}
              register={register}
              getValues={getValues}
              setValue={setValue}
              disabled={disabled}
            />
          )}
        </Card>
      ))}
       {!disabled && expanded && (
         <div className="flex items-center gap-2 mt-1">
              <Input
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  placeholder={`Add ${nestingLevel === 0 ? "Subcategory (L1)" : "Subcategory (L2)"}`}
                  className="h-8 text-sm flex-grow"
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddSubcategory();}}}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddSubcategory} className="h-8 w-8 shrink-0">
                  <CornerDownLeft className="h-3.5 w-3.5" />
              </Button>
          </div>
        )}
    </div>
  );
};


export default function EditDispensaryTypeCategoriesPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const dispensaryTypeName = params.dispensaryTypeName ? decodeURIComponent(params.dispensaryTypeName as string) : null;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const form = useForm<DispensaryTypeProductCategoriesFormData>({
    resolver: zodResolver(dispensaryTypeProductCategoriesSchema),
    defaultValues: {
      categoriesData: [], // Field name changed to categoriesData
    },
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
    control: form.control,
    name: "categoriesData", // Field name changed to categoriesData
  });

  const fetchCategories = useCallback(async () => {
    if (!dispensaryTypeName) {
      toast({ title: "Error", description: "Dispensary type name not provided.", variant: "destructive" });
      router.push('/admin/dashboard/dispensary-types');
      return;
    }
    setIsFetchingData(true);
    try {
      const categoriesCollectionRef = collection(db, 'dispensaryTypeProductCategories');
      const q = firestoreQuery(categoriesCollectionRef, where('name', '==', dispensaryTypeName), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        setDocumentId(docSnap.id);
        const data = docSnap.data() as DispensaryTypeProductCategoriesDoc;
        const sanitizedCategories = (data.categoriesData || []).map(cat => ({ // Changed from data.categories
          ...cat,
          subcategories: (cat.subcategories || []).map(subcat => ({
            ...subcat,
            subcategories: subcat.subcategories || []
          }))
        }));
        form.reset({ categoriesData: sanitizedCategories }); // Changed from categories
      } else {
        form.reset({ categoriesData: [] }); // Changed from categories
        setDocumentId(null); // No existing document, will create on save
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

    const docRef = documentId
        ? doc(db, 'dispensaryTypeProductCategories', documentId)
        : doc(collection(db, 'dispensaryTypeProductCategories'));

    try {
      const cleanCategories = (categories: ProductCategory[]): ProductCategory[] => {
        return categories
          .filter(cat => cat.name && cat.name.trim() !== '')
          .map(cat => {
            const cleanedSubcategories = cat.subcategories ? cleanCategories(cat.subcategories) : [];
            const newCat: ProductCategory = { name: cat.name.trim() };
            if (cleanedSubcategories.length > 0) {
              newCat.subcategories = cleanedSubcategories;
            }
            return newCat;
          });
      };

      const categoriesToSave = cleanCategories(data.categoriesData); // Changed from data.categories

      await setDoc(docRef, {
        name: dispensaryTypeName,
        categoriesData: categoriesToSave, // Changed from categories
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Categories Saved", description: `Product categories for "${dispensaryTypeName}" have been updated.` });
      if (!documentId) setDocumentId(docRef.id);
      fetchCategories();
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
            <h1 
              className="text-3xl font-bold text-foreground flex items-center"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
                <ListFilter className="mr-3 h-8 w-8 text-primary" /> Manage Product Categories
            </h1>
            <p 
              className="text-lg text-foreground"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
                For Dispensary Type: <span className="font-semibold text-primary">{dispensaryTypeName}</span>
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
              <CardTitle 
                className="text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
              >Category Structure Editor</CardTitle>
              <CardDescription 
                className="text-foreground"
                style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
              >
                Define main categories and up to two levels of subcategories for products of type &quot;{dispensaryTypeName}&quot;.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryFields.map((categoryItem, categoryIndex) => (
                <Card key={categoryItem.id} className="p-3 bg-card border shadow-md relative animate-fade-in-scale-up" style={{ animationDuration: '0.3s', animationDelay: `${categoryIndex * 50}ms`}}>
                  <div className="flex items-start justify-between mb-2">
                     <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab mt-7 mr-1" />
                    <FormField
                      control={form.control}
                      name={`categoriesData.${categoryIndex}.name`} // Changed from categories
                      render={({ field }) => (
                        <FormItem className="flex-grow mr-2">
                          <FormLabel className="text-md font-semibold text-foreground">Main Category</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Flowers, Edibles" className="text-md h-9"/>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" type="button" className="text-destructive hover:bg-destructive/10 mt-6 shrink-0 h-9 w-9">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete Main Category?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the category &quot;{form.getValues(`categoriesData.${categoryIndex}.name`)}&quot; and all its subcategories? This action cannot be undone.
                            </AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeCategory(categoryIndex)} className="bg-destructive hover:bg-destructive/90">Delete Category</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <NestedSubcategoryManager
                    nestingLevel={0}
                    control={form.control}
                    pathPrefix={`categoriesData.${categoryIndex}.subcategories`} // Changed from categories
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
                className="text-md py-2.5"
              >
                <PackagePlus className="mr-2 h-4 w-4" /> Add Main Category
              </Button>
            </CardContent>
            <CardFooter className="border-t pt-6 bg-muted/30 -mx-0 sm:-mx-6 px-6 pb-6 rounded-b-lg">
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

