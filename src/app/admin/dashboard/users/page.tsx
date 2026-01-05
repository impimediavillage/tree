
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, functions } from '@/lib/firebase'; 
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User, Dispensary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; 
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
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

const adminUpdateUserCallable = httpsCallable(functions, 'adminUpdateUser');

const userEditSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email(), 
  role: z.enum(['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff']),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']),
  credits: z.coerce.number().int().min(0, "Credits cannot be negative."),
  dispensaryId: z.string().optional().nullable(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => data.role !== 'DispensaryOwner' || (data.role === 'DispensaryOwner' && data.dispensaryId && data.dispensaryId.trim() !== ''), {
  message: "Wellness ID is required for Wellness Owners.",
  path: ["dispensaryId"],
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
}).refine(data => !data.newPassword || data.newPassword.length >= 6, {
    message: "New password must be at least 6 characters.",
    path: ["newPassword"],
});

type UserEditFormData = z.infer<typeof userEditSchema>;

interface EditUserDialogProps {
  user: User | null; 
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdate: () => void; 
  dispensaries: Dispensary[];
}

function EditUserDialogComponent({ user, isOpen, onOpenChange, onUserUpdate, dispensaries }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
  });

  useEffect(() => {
    if (user && isOpen) {
      form.reset({
        displayName: user.displayName || '',
        email: user.email,
        role: user.role || 'User',
        status: user.status === 'Rejected' ? 'PendingApproval' : (user.status || 'Active'),
        credits: user.credits || 0,
        dispensaryId: user.dispensaryId || null,
        newPassword: '',
        confirmPassword: '',
      });
    }
  }, [user, isOpen, form]); 

  const watchedRole = form.watch('role');

  useEffect(() => {
    if (watchedRole !== 'DispensaryOwner') {
      form.setValue('dispensaryId', null);
    }
  }, [watchedRole, form]);

  const onSubmit = async (data: UserEditFormData) => {
    if (!user || !user.uid) return;
    setIsSubmitting(true);
    
    const updatePayload: any = {
      userId: user.uid,
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      credits: data.credits,
      dispensaryId: data.role === 'DispensaryOwner' ? data.dispensaryId : null,
    };
    if (data.newPassword) {
      updatePayload.password = data.newPassword;
    }

    try {
      await adminUpdateUserCallable(updatePayload);
      toast({ title: "User Updated", description: `${data.displayName}'s profile has been successfully updated.` });
      onUserUpdate();
      onOpenChange(false); 
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update user.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null; 

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] flex flex-col h-full max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Edit User: {user.displayName || user.email}</DialogTitle>
          <DialogDescription>Modify user details below. Changes to email require separate Firebase Auth flows.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow px-6">
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
                              <SelectItem value="DispensaryStaff">Wellness Staff</SelectItem>
                              <SelectItem value="DispensaryOwner">Wellness Owner</SelectItem>
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
                          <FormLabel>Associated Wellness Profile</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select wellness profile" /></SelectTrigger></FormControl>
                              <SelectContent>
                                  {dispensaries.filter(d => d.status === "Approved").map(d => (
                                      <SelectItem key={d.id} value={d.id!}>{d.dispensaryName} ({d.id?.substring(0,6)}...)</SelectItem>
                                  ))}
                                  {dispensaries.filter(d => d.status === "Approved").length === 0 && <SelectItem value="no-approved-wellness" disabled>No approved wellness profiles</SelectItem>}
                              </SelectContent>
                          </Select>
                          <FormDescription>Required if role is Wellness Owner.</FormDescription>
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
              <div className="pt-4 border-t">
                  <h3 className="font-semibold text-lg">Reset Password</h3>
                  <FormDescription>Leave blank to keep the current password.</FormDescription>
                  <div className="space-y-4 mt-2">
                       <FormField control={form.control} name="newPassword" render={({ field }) => (
                          <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                       <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                          <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl><Input type="password" {...field} placeholder="••••••••" /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                  </div>
              </div>
              <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-2 -mx-6 px-6 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}


export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [wellnessProfiles, setWellnessProfiles] = useState<Dispensary[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<User['role'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<User['status'] | 'all'>('all');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsersAndWellnessProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, 'users');
      const usersQuery = query(usersCollectionRef, orderBy('displayName'), orderBy('email'));
      const usersSnapshot = await getDocs(usersQuery);
      const fetchedUsers: User[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(fetchedUsers);

      const wellnessCollectionRef = collection(db, 'dispensaries');
      const wellnessQuery = query(wellnessCollectionRef, orderBy('dispensaryName'));
      const wellnessSnapshot = await getDocs(wellnessQuery);
      const fetchedWellnessProfiles: Dispensary[] = wellnessSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Dispensary));
      setWellnessProfiles(fetchedWellnessProfiles);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Could not fetch users or wellness profiles.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsersAndWellnessProfiles();
  }, [fetchUsersAndWellnessProfiles]);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      const deleteUserCallable = httpsCallable(functions, 'adminDeleteUser');
      await deleteUserCallable({ userId: userToDelete.uid });
      
      toast({ 
        title: "Success", 
        description: `User ${userToDelete.displayName || userToDelete.email} has been deleted.` 
      });
      
      // Refresh users list
      await fetchUsersAndWellnessProfiles();
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Could not delete user. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 bg-muted/50 border border-border/50 rounded-lg shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black flex items-center gap-2 sm:gap-3 text-[#3D2E17]">
            <UsersIcon className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 text-[#006B3E] flex-shrink-0" />
            <span className="break-words">Manage Users</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg font-black text-[#3D2E17]/80 mt-2">
            View, edit, and manage user accounts and roles.
          </p>
        </div>
        <AddUserDialog onUserAdded={fetchUsersAndWellnessProfiles} dispensaries={wellnessProfiles} />
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg bg-muted/50 border-border/50 shadow-lg">
        <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
        />
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 w-full">
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as User['role'] | 'all')}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="LeafUser">Leaf User</SelectItem>
                    <SelectItem value="DispensaryStaff">Wellness Staff</SelectItem>
                    <SelectItem value="DispensaryOwner">Wellness Owner</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                    <SelectItem value="User">User (Generic)</SelectItem>
                </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as User['status'] | 'all')}>
                <SelectTrigger className="w-full sm:w-[200px]">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 py-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="shadow-lg p-6 space-y-3 animate-pulse bg-muted/50">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4 bg-muted" />
                  <Skeleton className="h-4 w-full bg-muted" />
                </div>
              </div>
               <Skeleton className="h-5 w-1/4 bg-muted" />
               <Skeleton className="h-5 w-1/3 bg-muted" />
              <Skeleton className="h-10 w-full bg-muted rounded mt-4" />
            </Card>
          ))}
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 py-6">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.uid}
              user={user}
              dispensaryName={user.role === 'DispensaryOwner' && user.dispensaryId ? wellnessProfiles.find(d => d.id === user.dispensaryId)?.dispensaryName : undefined}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
          ))}
        </div>
      ) : (
        <Card className="text-center py-10 col-span-full">
          <CardContent>
            <UsersIcon className="mx-auto h-12 w-12 text-orange-500" />
            <h3 className="mt-2 text-xl font-semibold">No Users Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {users.length === 0 ? "There are no users in the system yet." : "No users match your current filters."}
            </p>
            {users.length > 0 && (
              <Button variant="outline" className="mt-4" onClick={() => {setSearchTerm(''); setFilterRole('all'); setFilterStatus('all');}}>
                <Filter className="mr-2 h-4 w-4" /> Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <EditUserDialogComponent
        user={editingUser}
        isOpen={isEditUserDialogOpen}
        onOpenChange={setIsEditUserDialogOpen}
        onUserUpdate={fetchUsersAndWellnessProfiles}
        dispensaries={wellnessProfiles}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600">Delete User?</DialogTitle>
            <DialogDescription className="text-base font-semibold">
              Are you sure you want to permanently delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="bg-muted/50 p-4 rounded-lg my-4">
              <p className="font-bold text-[#3D2E17]">User: <span className="text-[#006B3E]">{userToDelete.displayName || 'Unnamed User'}</span></p>
              <p className="font-bold text-[#3D2E17]">Email: <span className="text-[#006B3E]">{userToDelete.email}</span></p>
              <p className="font-bold text-[#3D2E17]">Role: <span className="text-[#006B3E]">{userToDelete.role}</span></p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
