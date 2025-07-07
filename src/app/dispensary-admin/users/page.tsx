
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase'; 
import { collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Edit, Loader2, PlusCircle, Users as UsersIcon, Filter, UserCog } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCard } from '@/components/admin/UserCard'; 
import { DispensaryAddStaffDialog } from '@/components/dispensary-admin/DispensaryAddStaffDialog';
import { DispensaryAddLeafUserDialog } from '@/components/dispensary-admin/DispensaryAddLeafUserDialog';


const wellnessUserEditSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  role: z.enum(['DispensaryStaff', 'LeafUser', 'User']), 
  status: z.enum(['Active', 'Suspended', 'PendingApproval']),
  credits: z.coerce.number().int().min(0, "Credits cannot be negative.").optional(),
});
type WellnessUserEditFormData = z.infer<typeof wellnessUserEditSchema>;

interface EditWellnessUserDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate: () => void;
}

function EditWellnessUserDialog({ user, isOpen, onOpenChange, onUserUpdate }: EditWellnessUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<WellnessUserEditFormData>({
    resolver: zodResolver(wellnessUserEditSchema),
  });

  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        displayName: user.displayName || '',
        role: user.role as 'DispensaryStaff' | 'LeafUser' | 'User',
        status: user.status || 'Active',
        credits: user.role === 'LeafUser' ? (user.credits || 0) : undefined,
      });
    }
  }, [user, isOpen, form]);

  const onSubmit = async (data: WellnessUserEditFormData) => {
    if (!user || !user.uid) return;
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updateData: Partial<User> = {
        displayName: data.displayName,
        role: data.role,
        status: data.status,
        updatedAt: serverTimestamp() as any, 
      };

      if (data.role === 'LeafUser' && data.status === 'Active' && user.status !== 'Active' && !user.welcomeCreditsAwarded) {
        updateData.credits = (user.credits || 0) + 10;
        updateData.welcomeCreditsAwarded = true;
        toast({ title: "User Activated", description: `${data.displayName} activated and 10 welcome credits awarded.` });
      } else if (data.role === 'LeafUser' && data.credits !== undefined) {
        updateData.credits = data.credits;
      }


      await updateDoc(userDocRef, updateData);
      if (!(data.role === 'LeafUser' && data.status === 'Active' && user.status !== 'Active' && !user.welcomeCreditsAwarded)) {
        toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });
      }
      onUserUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: "Update Failed", description: "Could not update user.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User: {user.displayName || user.email}</DialogTitle>
          <DialogDescription>Modify details for this user associated with your wellness profile.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="displayName" render={({ field }) => (
              <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormItem><FormLabel>Email (Read-only)</FormLabel><Input value={user.email} readOnly disabled /></FormItem>
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="DispensaryStaff">Wellness Staff</SelectItem>
                    <SelectItem value="LeafUser">Leaf User (Linked)</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            {form.watch('role') === 'LeafUser' && (
              <FormField control={form.control} name="credits" render={({ field }) => (
                <FormItem>
                  <FormLabel>Credits</FormLabel>
                  <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                  {user.role === 'LeafUser' && user.status !== 'Active' && data.status === 'Active' && !user.welcomeCreditsAwarded &&
                    <FormDescription className="text-xs text-green-600">10 welcome credits will be added upon activation.</FormDescription>
                  }
                </FormItem>
              )} />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function WellnessManageUsersPage() {
  const { currentUser, loading: authLoading, currentDispensaryStatus } = useAuth();
  const [managedUsers, setManagedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<User['role'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<User['status'] | 'all' | 'PendingApproval'>('all');


  const fetchManagedUsers = useCallback(async () => {
    if (!currentUser?.dispensaryId || currentDispensaryStatus !== 'Approved') {
      setIsLoading(false);
      if (currentDispensaryStatus !== 'Approved' && currentUser?.dispensaryId) {
         toast({ title: "Access Restricted", description: "User management is available for approved wellness profiles only.", variant: "destructive"});
      }
      setManagedUsers([]);
      return;
    }
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const usersQuery = query(
        usersCollectionRef,
        where('dispensaryId', '==', currentUser.dispensaryId),
        orderBy('displayName')
      );
      const usersSnapshot = await getDocs(usersQuery);
      const fetchedUsers: User[] = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(user => user.uid !== currentUser.uid); 
      setManagedUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching managed users:", error);
      toast({ title: "Error", description: "Could not fetch users for your wellness profile.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.dispensaryId, currentDispensaryStatus, toast, currentUser?.uid]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchManagedUsers();
    }
  }, [authLoading, currentUser, fetchManagedUsers]);
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  };

  const filteredDisplayUsers = managedUsers.filter(user => {
    const nameMatch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = filterRole === 'all' || user.role === filterRole;
    const statusMatch = filterStatus === 'all' || user.status === filterStatus;
    return (nameMatch || emailMatch) && roleMatch && statusMatch;
  });


  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!currentUser || currentUser.role !== 'DispensaryOwner' || currentDispensaryStatus !== 'Approved') {
    return (
      <Card className="p-6 text-center">
        <UsersIcon className="mx-auto h-12 w-12 text-orange-500" />
        <h3 className="mt-2 text-xl font-semibold">Access Restricted</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          User management is only available for approved wellness profiles. Your current wellness profile status is: {currentDispensaryStatus || 'Not set'}.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 
            className="text-3xl font-bold flex items-center gap-2 text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <UserCog className="h-8 w-8 text-primary" /> Manage Your Users
          </h1>
          <p 
            className="text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Add, view, and manage wellness staff and linked Leaf Users for your wellness profile.
          </p>
        </div>
        <div className="flex gap-2">
          <DispensaryAddStaffDialog onUserAdded={fetchManagedUsers} dispensaryId={currentUser.dispensaryId!} />
          <DispensaryAddLeafUserDialog onUserAdded={fetchManagedUsers} dispensaryId={currentUser.dispensaryId!} />
        </div>
      </div>

       <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card shadow-sm">
        <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-xs"
        />
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as User['role'] | 'all')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="DispensaryStaff">Wellness Staff</SelectItem>
                    <SelectItem value="LeafUser">Leaf Users (Linked)</SelectItem>
                </SelectContent>
            </Select>
             <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as User['status'] | 'all' | 'PendingApproval')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-lg p-6 space-y-3 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-muted rounded-full"></div>
                <div>
                  <div className="h-5 w-32 bg-muted rounded mb-1"></div>
                  <div className="h-4 w-40 bg-muted rounded"></div>
                </div>
              </div>
              <div className="h-4 w-20 bg-muted rounded"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
            </Card>
          ))}
        </div>
      ) : filteredDisplayUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDisplayUsers.map((user) => (
            <UserCard
              key={user.uid}
              user={user}
              onEdit={handleEditUser}
            />
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <UsersIcon className="mx-auto h-12 w-12 text-orange-500" />
          <h3 className="mt-2 text-xl font-semibold">No Users Found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {managedUsers.length === 0 ? "You haven't added any wellness staff or Leaf Users yet." : "No users match your current filters."}
          </p>
           {(searchTerm || filterRole !== 'all' || filterStatus !== 'all') && managedUsers.length > 0 && (
            <Button variant="outline" className="mt-4" onClick={() => {setSearchTerm(''); setFilterRole('all'); setFilterStatus('all');}}>
              <Filter className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          )}
        </Card>
      )}
      <EditWellnessUserDialog
        user={editingUser}
        isOpen={isEditUserDialogOpen}
        onOpenChange={setIsEditUserDialogOpen}
        onUserUpdate={fetchManagedUsers}
      />
    </div>
  );
}
