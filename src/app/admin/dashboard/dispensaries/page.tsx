
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { Dispensary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, Filter, Loader2, Building } from 'lucide-react';
import { DispensaryCard } from '@/components/admin/DispensaryCard'; // New Card component

type DispensaryStatusFilter = Dispensary['status'] | 'all';

export default function AdminDispensariesPage() {
  const [allDispensaries, setAllDispensaries] = useState<Dispensary[]>([]);
  const [filteredDispensaries, setFilteredDispensaries] = useState<Dispensary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DispensaryStatusFilter>('all');
  const { toast } = useToast();

  const fetchDispensaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const dispensariesCollectionRef = collection(db, 'dispensaries');
      // Initial query can be simple, filtering will happen client-side for this example
      // For larger datasets, server-side filtering/pagination would be better.
      const q = query(dispensariesCollectionRef, orderBy('applicationDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedDispensaries: Dispensary[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Ensure timestamps are correctly handled if they come as Firestore Timestamps
        const applicationDate = data.applicationDate instanceof Timestamp ? data.applicationDate.toDate() : new Date(data.applicationDate as string);
        const approvedDate = data.approvedDate instanceof Timestamp ? data.approvedDate.toDate() : (data.approvedDate ? new Date(data.approvedDate as string) : undefined);
        
        fetchedDispensaries.push({ 
            id: docSnap.id, 
            ...data,
            applicationDate,
            approvedDate,
        } as Dispensary);
      });
      setAllDispensaries(fetchedDispensaries);
    } catch (error) {
      console.error("Error fetching dispensaries:", error);
      toast({ title: "Error", description: "Could not fetch dispensaries.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDispensaries();
  }, [fetchDispensaries]);

  useEffect(() => {
    let dispensariesToFilter = allDispensaries;

    if (statusFilter !== 'all') {
      dispensariesToFilter = dispensariesToFilter.filter(d => d.status === statusFilter);
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      dispensariesToFilter = dispensariesToFilter.filter(d =>
        d.dispensaryName.toLowerCase().includes(lowercasedFilter) ||
        d.ownerEmail.toLowerCase().includes(lowercasedFilter) ||
        (d.location && d.location.toLowerCase().includes(lowercasedFilter))
      );
    }
    setFilteredDispensaries(dispensariesToFilter);
  }, [searchTerm, statusFilter, allDispensaries]);

  const handleStatusToggle = async (dispensaryId: string, currentStatus: Dispensary['status']) => {
    const newStatus = currentStatus === 'Approved' ? 'Suspended' : 'Approved';
    try {
      const dispensaryDocRef = doc(db, 'dispensaries', dispensaryId);
      await updateDoc(dispensaryDocRef, { status: newStatus });
      toast({ title: "Status Updated", description: `Dispensary status changed to ${newStatus}.` });
      // Optimistically update UI or refetch
      setAllDispensaries(prev => prev.map(d => d.id === dispensaryId ? { ...d, status: newStatus } : d));
    } catch (error) {
      console.error("Error updating dispensary status:", error);
      toast({ title: "Update Failed", description: "Could not update dispensary status.", variant: "destructive" });
    }
  };

  const handleDeleteDispensary = async (dispensaryId: string, dispensaryName: string) => {
    // Consider implications: what happens to products, users associated with this dispensary?
    // For now, just deletes the dispensary document.
    try {
      await deleteDoc(doc(db, 'dispensaries', dispensaryId));
      toast({ title: "Dispensary Deleted", description: `${dispensaryName} has been removed.` });
      fetchDispensaries(); // Refresh list
    } catch (error) {
      console.error("Error deleting dispensary:", error);
      toast({ title: "Deletion Failed", description: "Could not delete dispensary.", variant: "destructive" });
    }
  };

  const statusOptions: DispensaryStatusFilter[] = ['all', 'Pending Approval', 'Approved', 'Rejected', 'Suspended'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" /> Manage Dispensaries
          </h1>
          <p className="text-muted-foreground">View, edit, approve, or suspend dispensary applications and profiles.</p>
        </div>
        <Button asChild>
          <Link href="/admin/dashboard/dispensaries/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Add new
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <div className="relative flex-grow sm:flex-grow-0 sm:w-1/2 md:w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <div className="relative flex-grow sm:flex-grow-0 sm:w-auto">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DispensaryStatusFilter)}>
              <SelectTrigger className="pl-10 w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All Statuses' : opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading dispensaries...</p>
        </div>
      ) : (
        <div className="flex overflow-x-auto space-x-6 pb-6 scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted">
          {filteredDispensaries.length > 0 ? (
            filteredDispensaries.map((dispensary) => (
              <DispensaryCard
                key={dispensary.id}
                dispensary={dispensary}
                onStatusToggle={handleStatusToggle}
                onDelete={handleDeleteDispensary}
              />
            ))
          ) : (
            <div className="w-full text-center py-10 text-muted-foreground">
              No dispensaries found matching your criteria.
            </div>
          )}
        </div>
      )}
       {filteredDispensaries.length > 0 && (
         <p className="text-xs text-center text-muted-foreground pt-2">Scroll horizontally to see all dispensaries.</p>
       )}
    </div>
  );
}
