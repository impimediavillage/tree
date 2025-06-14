
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase'; 
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { User, Dispensary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card'; 
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Edit, Loader2, PlusCircle, Users as UsersIcon, Filter } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCard } from '@/components/admin/UserCard';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';


const userEditSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email(), // Typically read-only for existing user email through this form
  role: z.enum(['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff']),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']),
  credits: z.coerce.number().int().min(0, "Credits cannot be negative."),
  dispensaryId: z.string().optional().nullable(),
}).refine(data => data.role !== 'DispensaryOwner' || (data.role === 'DispensaryOwner' && data.dispensaryId && data.dispensaryId.trim() !== ''), {
  message: "Dispensary ID is required for Dispensary Owners.",
  path: ["dispensaryId"],
});

type UserEditFormData = z.infer<typeof userEditSchema>;

interface EditUserDialogProps {
  user: User | null; // Can be null when dialog is closed
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate: () => void; // Callback to refresh user list
  dispensaries: Dispensary[];
}

function EditUserDialogComponent({ user, isOpen, onOpenChange, onUserUpdate, dispensaries }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    // Default values will be set when user prop changes
  });

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || '',
        email: user.email,
        role: user.role || 'User',
        status: user.status || 'Active',
        credits: user.credits || 0,
        dispensaryId: user.dispensaryId || null,
      });
    } else {
      form.reset({ // Reset to defaults if no user (dialog closed or new state)
        displayName: '', email: '', role: 'LeafUser', status: 'Active', credits: 0, dispensaryId: null,
      });
    }
  }, [user, form, isOpen]); // Rerun effect when user or isOpen changes

  const watchedRole = form.watch('role');

  useEffect(() => {
    if (watchedRole !== 'DispensaryOwner') {
      form.setValue('dispensaryId', null);
    }
  }, [watchedRole, form]);

  const onSubmit = async (data: UserEditFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const updateData: Partial<User> = {
        displayName: data.displayName,
        role: data.role,
        status: data.status,
        credits: data.credits,
        dispensaryId: data.role === 'DispensaryOwner' ? data.dispensaryId : null,
        // Email cannot be changed this way directly; Firebase Auth requires re-authentication.
        // Password changes also require re-authentication.
      };
      await updateDoc(userDocRef, updateData);
      
      toast({ title: "User Updated", description: `${data.displayName}'s profile has been updated.` });
      onUserUpdate();
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: "Update Failed", description: "Could not update user.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null; // Don't render if no user is selected for editing

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.displayName || user.email}</DialogTitle>
          <DialogDescription>Modify user details below. Note: Email/Password changes require separate Firebase Auth flows.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
             <FormItem>
                <FormLabel>Email (Read-only)</FormLabel>
                <Input value={user.email} readOnly disabled />
            </FormItem>
            <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="LeafUser">Leaf User</SelectItem>
                            <SelectItem value="DispensaryStaff">Dispensary Staff</SelectItem>
                            <SelectItem value="DispensaryOwner">Dispensary Owner</SelectItem>
                            <SelectItem value="Super Admin">Super Admin</SelectItem>
                            <SelectItem value="User">User (Generic)</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            {watchedRole === 'DispensaryOwner' && (
                 <FormField control={form.control} name="dispensaryId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Associated Dispensary</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select dispensary" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {/* Removed: <SelectItem value="" disabled>Select a dispensary</SelectItem> */}
                                {dispensaries.filter(d => d.status === "Approved").map(d => (
                                    <SelectItem key={d.id} value={d.id!}>{d.dispensaryName} ({d.id?.substring(0,6)}...)</SelectItem>
                                ))}
                                {dispensaries.filter(d => d.status === "Approved").length === 0 && <SelectItem value="no-approved-dispensaries" disabled>No approved dispensaries</SelectItem>}
                            </SelectContent>
                        </Select>
                        <FormDescription>Required if role is Dispensary Owner.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
            )}
             <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Suspended">Suspended</SelectItem>
                            <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
             <FormField control={form.control} name="credits" render={({ field }) => (
                <FormItem>
                    <FormLabel>Credits</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<User['role'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<User['status'] | 'all'>('all');

  const fetchUsersAndDispensaries = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const usersQuery = query(usersCollectionRef, orderBy('displayName'), orderBy('email'));
      const usersSnapshot = await getDocs(usersQuery);
      const fetchedUsers: User[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(fetchedUsers);

      const dispensariesCollectionRef = collection(db, 'dispensaries');
      const dispensariesQuery = query(dispensariesCollectionRef, orderBy('dispensaryName'));
      const dispensariesSnapshot = await getDocs(dispensariesQuery);
      const fetchedDispensaries: Dispensary[] = dispensariesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Dispensary));
      setDispensaries(fetchedDispensaries);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Could not fetch users or dispensaries.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsersAndDispensaries();
  }, [fetchUsersAndDispensaries]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  };

  const filteredUsers = users.filter(user => {
    const nameMatch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = filterRole === 'all' || user.role === filterRole;
    const statusMatch = filterStatus === 'all' || user.status === filterStatus;
    return (nameMatch || emailMatch) && roleMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-primary">
            <UsersIcon className="h-8 w-8" /> Manage Users
          </h1>
          <p className="text-muted-foreground">View, edit, and add user accounts and roles.</p>
        </div>
        <AddUserDialog onUserAdded={fetchUsersAndDispensaries} dispensaries={dispensaries} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-card">
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
                    <SelectItem value="LeafUser">Leaf User</SelectItem>
                    <SelectItem value="DispensaryStaff">Dispensary Staff</SelectItem>
                    <SelectItem value="DispensaryOwner">Dispensary Owner</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="User">User (Generic)</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as User['status'] | 'all')}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                    <SelectItem value="PendingApproval">Pending Approval</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="shadow-lg p-6 space-y-3 animate-pulse bg-card">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-muted rounded-full"></div>
                <div>
                  <div className="h-5 w-32 bg-muted rounded mb-1"></div>
                  <div className="h-4 w-40 bg-muted rounded"></div>
                </div>
              </div>
              <div className="h-4 w-20 bg-muted rounded"></div>
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="h-10 w-full bg-muted rounded mt-3"></div>
            </Card>
          ))}
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-6">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.uid}
              user={user}
              dispensaryName={user.role === 'DispensaryOwner' && user.dispensaryId ? dispensaries.find(d => d.id === user.dispensaryId)?.dispensaryName : undefined}
              onEdit={handleEditUser}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 col-span-full">
          <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-xl font-semibold">No Users Found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {users.length === 0 ? "There are no users in the system yet." : "No users match your current filters."}
          </p>
          {users.length > 0 && (
            <Button variant="outline" className="mt-4" onClick={() => {setSearchTerm(''); setFilterRole('all'); setFilterStatus('all');}}>
              <Filter className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          )}
        </div>
      )}

      <EditUserDialogComponent
        user={editingUser}
        isOpen={isEditUserDialogOpen}
        onOpenChange={setIsEditUserDialogOpen}
        onUserUpdate={fetchUsersAndDispensaries}
        dispensaries={dispensaries}
      />
    </div>
  );
}
