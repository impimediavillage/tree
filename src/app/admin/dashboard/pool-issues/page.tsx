
'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import type { PoolIssue } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { ArrowUpDown, Edit, Eye, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';

const issueStatusOptions: PoolIssue['issueStatus'][] = [
  "new", "under_review", "awaiting_reporter_response", 
  "awaiting_reported_party_response", "resolved", "closed"
];

const issueUpdateSchema = z.object({
  issueStatus: z.enum(issueStatusOptions),
  resolutionDetails: z.string().optional().nullable(),
});
type IssueUpdateFormData = z.infer<typeof issueUpdateSchema>;

interface ManageIssueDialogProps {
  issue: PoolIssue;
  onIssueUpdate: (updatedIssue: PoolIssue) => void;
}

function ManageIssueDialog({ issue, onIssueUpdate }: ManageIssueDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<IssueUpdateFormData>({
    resolver: zodResolver(issueUpdateSchema),
    defaultValues: {
      issueStatus: issue.issueStatus,
      resolutionDetails: issue.resolutionDetails || '',
    },
  });

  const onSubmit = async (data: IssueUpdateFormData) => {
    if (!issue.id) return;
    setIsSubmitting(true);
    try {
      const issueDocRef = doc(db, 'poolIssues', issue.id);
      const updateData: Partial<PoolIssue> = {
        issueStatus: data.issueStatus,
        resolutionDetails: data.resolutionDetails,
        updatedAt: new Date(), // Or serverTimestamp()
      };
      await updateDoc(issueDocRef, updateData);
      
      onIssueUpdate({ ...issue, ...updateData });
      toast({ title: "Issue Updated", description: `Issue for product "${issue.productName}" has been updated.` });
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating issue:", error);
      toast({ title: "Update Failed", description: "Could not update issue.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatusColor = (status: PoolIssue['issueStatus']) => {
    switch (status) {
        case 'new': return 'bg-blue-100 text-blue-700';
        case 'under_review': return 'bg-yellow-100 text-yellow-700';
        case 'awaiting_reporter_response':
        case 'awaiting_reported_party_response':
            return 'bg-orange-100 text-orange-700';
        case 'resolved': return 'bg-green-100 text-green-700';
        case 'closed': return 'bg-gray-100 text-gray-700';
        default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" /> View/Manage</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Pool Issue: {issue.productName}</DialogTitle>
          <DialogDescription>
            Reported by: {issue.reporterDispensaryName} against {issue.reportedDispensaryName}. Review details and update status.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 text-sm">
            <p><strong>Issue Type:</strong> <Badge variant="secondary">{issue.issueType.replace(/_/g, ' ').toUpperCase()}</Badge></p>
            <p><strong>Description:</strong></p>
            <p className="p-2 bg-muted rounded-md whitespace-pre-wrap">{issue.description}</p>
            <p><strong>Reported At:</strong> {issue.createdAt ? format(new Date(issue.createdAt.toString()), 'PPpp') : 'N/A'}</p>
             <p><strong>Current Status:</strong> <Badge className={getStatusColor(issue.issueStatus)}>{issue.issueStatus.replace(/_/g, ' ').toUpperCase()}</Badge></p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="issueStatus" render={({ field }) => (
                <FormItem>
                    <FormLabel>Update Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {issueStatusOptions.map(status => (
                                <SelectItem key={status} value={status}>{status.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="resolutionDetails" render={({ field }) => (
                <FormItem>
                    <FormLabel>Resolution Details / Admin Notes</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Add notes about the resolution or investigation..." rows={4} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
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

export default function AdminPoolIssuesPage() {
  const [issues, setIssues] = useState<PoolIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const issuesCollectionRef = collection(db, 'poolIssues');
      const q = query(issuesCollectionRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedIssues: PoolIssue[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedIssues.push({ 
          id: doc.id, 
          ...data,
          // Ensure timestamps are JS Date objects
          createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt as string),
          updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(data.updatedAt as string),
        } as PoolIssue);
      });
      setIssues(fetchedIssues);
    } catch (error) {
      console.error("Error fetching pool issues:", error);
      toast({ title: "Error", description: "Could not fetch pool issues.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleIssueUpdate = (updatedIssue: PoolIssue) => {
    setIssues(prevIssues => prevIssues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
  };
  
  const getStatusBadgeColor = (status: PoolIssue['issueStatus']) => {
    switch (status) {
        case 'new': return 'bg-blue-500';
        case 'under_review': return 'bg-yellow-500';
        case 'awaiting_reporter_response':
        case 'awaiting_reported_party_response':
            return 'bg-orange-500';
        case 'resolved': return 'bg-green-500';
        case 'closed': return 'bg-gray-500';
        default: return 'bg-slate-500';
    }
  };

  const columns: ColumnDef<PoolIssue>[] = [
    {
      accessorKey: "productName",
      header: "Product",
    },
    {
      accessorKey: "reporterDispensaryName",
      header: "Reported By",
    },
    {
      accessorKey: "reportedDispensaryName",
      header: "Reported Against",
    },
    {
      accessorKey: "issueType",
      header: "Issue Type",
      cell: ({ row }) => row.original.issueType.replace(/_/g, ' ').toUpperCase(),
    },
    {
      accessorKey: "issueStatus",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={`${getStatusBadgeColor(row.original.issueStatus)} text-white`}>
          {row.original.issueStatus.replace(/_/g, ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Reported At <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
      cell: ({ row }) => format(new Date(row.original.createdAt.toString()), 'MMM d, yyyy HH:mm'),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <ManageIssueDialog issue={row.original} onIssueUpdate={handleIssueUpdate} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 
            className="text-2xl font-semibold text-foreground" 
            style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}
        >
            Product Pool Issues
        </h1>
        <p 
            className="text-foreground"
            style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}
          >
            Review and manage reported issues between dispensaries in the product pool.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={issues}
        isLoading={isLoading}
        searchColumn="productName"
        searchPlaceholder="Filter by product name..."
      />
    </div>
  );
}

    
