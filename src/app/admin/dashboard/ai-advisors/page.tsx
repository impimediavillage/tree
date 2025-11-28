'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { AIAdvisor } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Brain, Database, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { AIAdvisorCard } from '@/components/admin/AIAdvisorCard';

export default function AdminAIAdvisorsPage() {
  const [advisors, setAdvisors] = useState<AIAdvisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchAdvisors = useCallback(async () => {
    setIsLoading(true);
    try {
      const advisorsCollectionRef = collection(db, 'aiAdvisors');
      const advisorsQuery = query(advisorsCollectionRef, orderBy('order', 'asc'));
      const advisorsSnapshot = await getDocs(advisorsQuery);
      
      const advisorsData: AIAdvisor[] = advisorsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as AIAdvisor;
      });
      
      setAdvisors(advisorsData);
    } catch (error) {
      console.error('Error fetching AI advisors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI advisors.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdvisors();
  }, [fetchAdvisors]);

  const handleToggleActive = async (advisorId: string, currentStatus: boolean) => {
    try {
      const advisorDocRef = doc(db, 'aiAdvisors', advisorId);
      await updateDoc(advisorDocRef, {
        isActive: !currentStatus,
        updatedAt: new Date(),
      });
      
      setAdvisors((prev) =>
        prev.map((advisor) =>
          advisor.id === advisorId
            ? { ...advisor, isActive: !currentStatus }
            : advisor
        )
      );
      
      toast({
        title: 'Status Updated',
        description: `Advisor ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      console.error('Error toggling advisor status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update advisor status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (advisorId: string) => {
    try {
      await deleteDoc(doc(db, 'aiAdvisors', advisorId));
      
      setAdvisors((prev) => prev.filter((advisor) => advisor.id !== advisorId));
      
      toast({
        title: 'Advisor Deleted',
        description: 'AI advisor has been permanently deleted.',
      });
    } catch (error) {
      console.error('Error deleting advisor:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete advisor.',
        variant: 'destructive',
      });
    }
  };

  const handleSeedAdvisors = async () => {
    setIsSeeding(true);
    try {
      const functions = getFunctions();
      const seedAdvisors = httpsCallable(functions, 'seedAIAdvisors');
      
      const result = await seedAdvisors();
      const data = result.data as { success: boolean; message: string; count: number };
      
      if (data.success) {
        toast({
          title: 'Seeding Complete',
          description: data.message,
        });
        
        // Refresh the advisors list
        await fetchAdvisors();
      }
    } catch (error: any) {
      console.error('Error seeding advisors:', error);
      toast({
        title: 'Seeding Failed',
        description: error.message || 'Failed to seed advisors. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  // Filter advisors based on search query
  const filteredAdvisors = advisors.filter((advisor) =>
    advisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    advisor.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    advisor.shortDescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              AI Advisors Management
            </h1>
            <p className="text-muted-foreground">
              Manage AI advisors displayed on the homepage and linked to dispensary types.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/admin/dashboard/ai-advisors/create">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New Advisor
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search advisors by name, slug, or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 py-6 text-base font-medium"
        />
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : filteredAdvisors.length === 0 ? (
        <div className="text-center py-20">
          <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-muted-foreground mb-2">
            {searchQuery ? 'No advisors found' : 'No advisors yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Get started by seeding advisors or creating a new one'}
          </p>
          {!searchQuery && (
            <div className="flex gap-2 justify-center">
              <Button asChild>
                <Link href="/admin/dashboard/ai-advisors/create">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Add New Advisor
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAdvisors.map((advisor, index) => (
            <AIAdvisorCard
              key={advisor.id}
              advisor={advisor}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}