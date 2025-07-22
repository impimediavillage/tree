
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, Timestamp, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { Dispensary, DispensaryType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, Filter, Loader2, Building, Store, CheckCheck } from 'lucide-react';
import { DispensaryCard } from '@/components/admin/DispensaryCard';
import { EditDispensaryDialog } from '@/components/admin/EditDispensaryDialog';
import { useAuth } from '@/contexts/AuthContext';

type WellnessStatusFilter = Dispensary['status'] | 'all';
type WellnessTypeFilter = string | 'all';

export default function AdminWellnessPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [allWellnessEntities, setAllWellnessEntities] = useState<Dispensary[]>([]);
  const [filteredWellnessEntities, setFilteredWellnessEntities] = useState<Dispensary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WellnessStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<WellnessTypeFilter>('all');
  const [wellnessTypes, setWellnessTypes] = useState<DispensaryType[]>([]);
  const { toast } = useToast();
  
  const [editingDispensary, setEditingDispensary] = useState<Dispensary | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchWellnessAndTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const typesCollectionRef = collection(db, 'dispensaryTypes');
      const typesQuery = query(typesCollectionRef, orderBy('name'));
      const typesSnapshot = await getDocs(typesQuery);
      const fetchedTypes: DispensaryType[] = typesSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as DispensaryType));
      setWellnessTypes(fetchedTypes);

      const wellnessCollectionRef = collection(db, 'dispensaries');
      const q = query(wellnessCollectionRef, orderBy('dispensaryName', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedWellness: Dispensary[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const applicationDate = data.applicationDate instanceof Timestamp ? data.applicationDate.toDate() : new Date(data.applicationDate as string);
        const approvedDate = data.approvedDate instanceof Timestamp ? data.approvedDate.toDate() : (data.approvedDate ? new Date(data.approvedDate as string) : undefined);
        
        fetchedWellness.push({ 
            id: docSnap.id, 
            ...data,
            applicationDate,
            approvedDate,
        } as Dispensary);
      });
      setAllWellnessEntities(fetchedWellness);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Could not fetch wellness profiles or types.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading) {
        fetchWellnessAndTypes();
    }
  }, [authLoading, fetchWellnessAndTypes]);

  useEffect(() => {
    let entitiesToFilter = allWellnessEntities;

    if (statusFilter !== 'all') {
      entitiesToFilter = entitiesToFilter.filter(d => d.status === statusFilter);
    }
    
    if (typeFilter !== 'all') {
      entitiesToFilter = entitiesToFilter.filter(d => d.dispensaryType === typeFilter);
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      entitiesToFilter = entitiesToFilter.filter(d =>
        d.dispensaryName.toLowerCase().includes(lowercasedFilter) ||
        d.ownerEmail.toLowerCase().includes(lowercasedFilter) ||
        (d.location && d.location.toLowerCase().includes(lowercasedFilter))
      );
    }
    setFilteredWellnessEntities(entitiesToFilter);
  }, [searchTerm, statusFilter, typeFilter, allWellnessEntities]);

  const handleEditDispensary = (dispensary: Dispensary) => {
    setEditingDispensary(dispensary);
    setIsEditDialogOpen(true);
  };

  const handleDeleteWellness = async (wellnessId: string, wellnessName: string) => {
    if (!isSuperAdmin) {
      toast({ title: "Permission Denied", description: "You are not authorized to delete profiles.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'dispensaries', wellnessId));
      toast({ title: "Wellness Profile Deleted", description: `${wellnessName} has been removed.` });
      fetchWellnessAndTypes(); 
    } catch (error) {
      console.error("Error deleting wellness profile:", error);
      toast({ title: "Deletion Failed", description: "Could not delete wellness profile.", variant: "destructive" });
    }
  };

  const statusOptions: WellnessStatusFilter[] = ['all', 'Pending Approval', 'Approved', 'Rejected', 'Suspended'];

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 
              className="text-3xl font-bold flex items-center gap-2 text-foreground"
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              <Building className="h-8 w-8 text-primary" /> Manage Wellness Profiles
            </h1>
            <p 
              className="text-foreground" 
              style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
            >
              View, edit, approve, or suspend wellness applications and profiles.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/dashboard/dispensaries/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Add new
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card shadow-sm">
          <div className="relative flex-grow sm:w-1/2 md:w-1/3 lg:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex-grow sm:flex-grow-0 relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as WellnessTypeFilter)}>
                <SelectTrigger className="pl-10 w-full sm:w-[240px]">
                  <SelectValue placeholder="Filter by store type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Store Types</SelectItem>
                  {wellnessTypes.map(type => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div className="flex-grow sm:flex-grow-0 relative">
              <CheckCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as WellnessStatusFilter)}>
                <SelectTrigger className="pl-10 w-full sm:w-[240px]">
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
            <p className="ml-2 text-muted-foreground">Loading wellness profiles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
            {filteredWellnessEntities.length > 0 ? (
              filteredWellnessEntities.map((wellness) => (
                <DispensaryCard
                  key={wellness.id}
                  dispensary={wellness} 
                  onEdit={() => handleEditDispensary(wellness)}
                  onDelete={handleDeleteWellness}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                <Building className="mx-auto h-12 w-12 mb-3 text-orange-500" />
                No wellness profiles found {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'matching your criteria' : ''}.
              </div>
            )}
          </div>
        )}
      </div>
      {editingDispensary && (
        <EditDispensaryDialog 
            dispensary={editingDispensary}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onDispensaryUpdate={fetchWellnessAndTypes}
            allDispensaryTypes={wellnessTypes}
            isSuperAdmin={!!isSuperAdmin}
        />
      )}
    </>
  );
}
