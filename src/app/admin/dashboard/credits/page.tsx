
'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import type { CreditPackage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Loader2, Search, PackagePlus } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CreditPackageCard } from '@/components/admin/CreditPackageCard';

const creditPackageFormSchema = z.object({
  name: z.string().min(3, "Package name is required."),
  credits: z.coerce.number().int().positive("Credits must be a positive integer."),
  price: z.coerce.number().positive("Price must be a positive number."),
  currency: z.string().length(3, "Currency code (e.g., USD, ZAR) is required.").toUpperCase(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  bonusCredits: z.coerce.number().int().min(0).optional().nullable().default(0),
});
type CreditPackageFormData = z.infer<typeof creditPackageFormSchema>;

interface AddCreditPackageDialogProps {
  onSave: () => void;
}

function AddCreditPackageDialog({ onSave }: AddCreditPackageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreditPackageFormData>({
    resolver: zodResolver(creditPackageFormSchema),
    defaultValues: {
        name: '',
        credits: 0,
        price: 0,
        currency: 'ZAR',
        description: '',
        isActive: true,
        bonusCredits: 0,
    },
  });

  const onSubmit = async (data: CreditPackageFormData) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'creditPackages'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast({ title: "Package Created", description: `${data.name} has been added.` });
      onSave(); 
      setIsOpen(false);
      form.reset({ name: '', credits: 0, price: 0, currency: 'ZAR', description: '', isActive: true, bonusCredits: 0});
    } catch (error) {
      console.error("Error creating credit package:", error);
      toast({ title: "Creation Failed", description: "Could not create credit package.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) form.reset({ name: '', credits: 0, price: 0, currency: 'ZAR', description: '', isActive: true, bonusCredits: 0});
    }}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Package</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Credit Package</DialogTitle>
           <DialogDescription>
            Create a new package that users can purchase for credits.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Package Name</FormLabel><FormControl><Input {...field} placeholder="e.g., Starter Pack" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="credits" render={({ field }) => (
                    <FormItem><FormLabel>Credits</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bonusCredits" render={({ field }) => (
                    <FormItem><FormLabel>Bonus Credits</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? 0} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Currency</FormLabel><FormControl><Input {...field} maxLength={3} placeholder="ZAR" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Optional description" /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="font-normal text-sm">Active (available for purchase)</FormLabel>
                </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Package
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function AdminCreditPackagesPage() {
  const [allPackages, setAllPackages] = useState<CreditPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const packagesCollectionRef = collection(db, 'creditPackages');
      const q = query(packagesCollectionRef, orderBy('price')); 
      const querySnapshot = await getDocs(q);
      const fetchedPackages: CreditPackage[] = [];
      querySnapshot.forEach((doc) => {
        fetchedPackages.push({ id: doc.id, ...doc.data() } as CreditPackage);
      });
      setAllPackages(fetchedPackages);
      setFilteredPackages(fetchedPackages);
    } catch (error) {
      console.error("Error fetching credit packages:", error);
      toast({ title: "Error", description: "Could not fetch credit packages.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = allPackages.filter(item => 
        item.name.toLowerCase().includes(lowercasedFilter) ||
        (item.description && item.description.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredPackages(filteredData);
  }, [searchTerm, allPackages]);

  const handleDeletePackage = async (packageId: string, packageName: string) => {
    try {
      await deleteDoc(doc(db, 'creditPackages', packageId));
      toast({ title: "Package Deleted", description: `${packageName} has been removed.` });
      fetchPackages(); 
    } catch (error) {
      console.error("Error deleting package:", error);
      toast({ title: "Deletion Failed", description: "Could not delete package.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-muted/50 border-border/50 rounded-lg shadow-lg">
        <div>
          <h1 className="text-4xl font-extrabold flex items-center gap-3 text-[#3D2E17]">
            <PackagePlus className="h-14 w-14 text-[#006B3E]"/>Credit System Management
          </h1>
          <p className="text-lg font-bold text-[#5D4E37] mt-2">
            Create, edit, and manage credit packages available for purchase.
          </p>
        </div>
        <AddCreditPackageDialog onSave={fetchPackages} />
      </div>

       <div className="relative p-4 border rounded-lg bg-muted/50 border-border/50 shadow-lg">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-5 w-5 text-[#006B3E]" />
        <Input
            type="text"
            placeholder="Filter by package name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
            <p className="ml-2 text-[#5D4E37] font-semibold">Loading packages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
          {filteredPackages.length > 0 ? (
            filteredPackages.map((pkg) => (
              <CreditPackageCard 
                key={pkg.id} 
                creditPackage={pkg} 
                onPackageUpdate={fetchPackages}
                onPackageDelete={handleDeletePackage}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              <PackagePlus className="mx-auto h-12 w-12 mb-3 text-orange-500" />
              No credit packages found {searchTerm ? 'matching your criteria' : ''}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
