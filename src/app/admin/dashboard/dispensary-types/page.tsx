
'use client';

import * as React from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, deleteDoc, query, orderBy, Timestamp, addDoc, serverTimestamp, where } from 'firebase/firestore';
import type { DispensaryType, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, ListChecks, Loader2, Search, ListFilter, Zap } from 'lucide-react';
import { DispensaryTypeDialog } from '@/components/admin/DispensaryTypeDialog';
import { DispensaryTypeCard } from '@/components/admin/DispensaryTypeCard';
import Link from 'next/link';

export default function AdminWellnessTypesPage() {
  const [allTypes, setAllTypes] = React.useState<DispensaryType[]>([]);
  const [filteredTypes, setFilteredTypes] = React.useState<DispensaryType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        setCurrentUser(JSON.parse(storedUserString) as User);
      } catch (e) {
        console.error("Error parsing current user from localStorage", e);
      }
    }
  }, []);

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const fetchWellnessTypes = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const typesCollectionRef = collection(db, 'dispensaryTypes');
      const q = query(typesCollectionRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      const fetchedTypes: DispensaryType[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
          updatedAt: (data.updatedAt as Timestamp)?.toDate ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
        } as DispensaryType;
      });
      setAllTypes(fetchedTypes);
      setFilteredTypes(fetchedTypes); 
    } catch (error) {
      console.error("Error fetching wellness types:", error);
      toast({ title: "Error", description: "Could not fetch store types.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchWellnessTypes();
  }, [fetchWellnessTypes]);

  React.useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = allTypes.filter(type =>
      type.name.toLowerCase().includes(lowercasedFilter) ||
      (type.description && type.description.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredTypes(filteredData);
  }, [searchTerm, allTypes]);

  const handleDeleteType = async (typeId: string, typeName: string) => {
    if (!isSuperAdmin) {
      toast({ title: "Permission Denied", description: "Only Super Admins can delete types.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, 'dispensaryTypes', typeId));
      toast({ title: "Store Type Deleted", description: `"${typeName}" has been removed.` });
      fetchWellnessTypes(); 
    } catch (error) {
      console.error("Error deleting wellness type:", error);
      toast({ title: "Deletion Failed", description: "Could not delete store type.", variant: "destructive" });
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black flex items-center gap-2 sm:gap-3 text-[#3D2E17]">
            <ListChecks className="h-10 w-10 sm:h-12 sm:w-12 text-[#006B3E] flex-shrink-0" />
            <span className="break-words">Manage Store Types</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg font-bold text-[#3D2E17]/80 mt-2">
            Create, view, edit, and delete store types for the platform.
          </p>
        </div>
        {isSuperAdmin && (
          <DispensaryTypeDialog onSave={fetchWellnessTypes} isSuperAdmin={isSuperAdmin}>
            <Button className="bg-[#006B3E] hover:bg-[#3D2E17] text-white font-bold">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Type
            </Button>
          </DispensaryTypeDialog>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-muted/50 border-border/50 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
              type="text"
              placeholder="Filter by type name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
          <p className="ml-2 text-[#3D2E17] font-semibold">Loading store types...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 py-6">
          {filteredTypes.length > 0 ? (
            filteredTypes.map((type, index) => (
              <DispensaryTypeCard
                key={type.id || index}
                dispensaryType={type}
                onSave={fetchWellnessTypes}
                onDelete={handleDeleteType}
                isSuperAdmin={isSuperAdmin}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <Card className="bg-muted/50 border-border/50 p-8">
                <CardContent>
                  <ListChecks className="mx-auto h-12 w-12 mb-3 text-[#B8651B]" />
                  <h3 className="text-xl font-bold text-[#3D2E17] mb-2">No store types found</h3>
                  <p className="text-[#5D4E37]">{searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first store type'}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
