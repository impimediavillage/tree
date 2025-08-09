
'use client';

import * as React from 'react';
import type { ProductRequest, NoteData } from '@/types';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowUpDown, Eye, MessageSquare, Check, X, Ban, Truck, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '../ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const addNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty.").max(1000, "Note is too long."),
});
type AddNoteFormData = z.infer<typeof addNoteSchema>;


const getStatusProps = (status: ProductRequest['requestStatus']) => {
    switch (status) {
        case 'pending_owner_approval': return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Eye className="h-3 w-3" /> };
        case 'accepted': return { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Check className="h-3 w-3" /> };
        case 'rejected': return { color: 'bg-red-100 text-red-800 border-red-300', icon: <X className="h-3 w-3" /> };
        case 'cancelled': return { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: <Ban className="h-3 w-3" /> };
        case 'fulfilled_by_sender': return { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: <Truck className="h-3 w-3" /> };
        case 'received_by_requester': return { color: 'bg-green-100 text-green-800 border-green-300', icon: <Package className="h-3 w-3" /> };
        case 'issue_reported': return { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: <AlertTriangle className="h-3 w-3" /> };
        default: return { color: 'bg-gray-200 text-gray-800 border-gray-400', icon: <MessageSquare className="h-3 w-3" /> };
    }
};

const ManageRequestDialog = ({ request, type, onUpdate }: { request: ProductRequest; type: 'incoming' | 'outgoing'; onUpdate: () => void; }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();
    const { currentUser } = useAuth();

    const form = useForm<AddNoteFormData>({
        resolver: zodResolver(addNoteSchema),
        defaultValues: { note: '' },
    });

    const handleStatusUpdate = async (newStatus: ProductRequest['requestStatus']) => {
        if (!request.id) return;
        setIsSubmitting(true);
        try {
            const requestRef = doc(db, 'productRequests', request.id);
            await updateDoc(requestRef, { requestStatus: newStatus, updatedAt: serverTimestamp() });
            toast({ title: "Status Updated", description: `Request status set to ${newStatus.replace(/_/g, ' ')}.` });
            onUpdate();
            setIsOpen(false);
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ title: "Update Failed", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const onNoteSubmit = async (data: AddNoteFormData) => {
        if (!request.id || !currentUser) return;
        setIsSubmitting(true);
        const newNote: NoteData = {
            note: data.note,
            byName: currentUser.displayName || 'Unnamed User',
            senderRole: type === 'incoming' ? 'owner' : 'requester',
            timestamp: serverTimestamp() as any,
        };
        try {
            const requestRef = doc(db, 'productRequests', request.id);
            await updateDoc(requestRef, { notes: arrayUnion(newNote) });
            toast({ title: "Note Added", description: "Your note has been added to the request." });
            form.reset();
            onUpdate();
        } catch (error) {
            console.error("Error adding note:", error);
            toast({ title: "Error", description: "Could not add your note.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4" />Manage</Button></DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Request: {request.productName}</DialogTitle>
                    <DialogDescription>
                        {type === 'incoming' ? `From: ${request.requesterDispensaryName}` : `To: ${request.productOwnerDispensaryId}`}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow pr-4">
                    <div className="space-y-4">
                        {/* Details */}
                        <div className="text-sm space-y-2">
                           <p><strong>Quantity:</strong> {request.quantityRequested}</p>
                           <p><strong>Delivery Address:</strong> {request.deliveryAddress}</p>
                           <p><strong>Contact:</strong> {request.contactPerson} at {request.contactPhone}</p>
                        </div>
                        <Separator />
                        {/* Notes */}
                        <div>
                            <h4 className="font-semibold mb-2">Notes</h4>
                            {request.notes && request.notes.length > 0 ? (
                                <div className="space-y-2 text-sm">
                                    {request.notes.map((note, idx) => (
                                        <div key={idx} className="bg-muted p-2 rounded-md">
                                            <p className="font-semibold">{note.byName} <span className="text-xs text-muted-foreground">({(note.timestamp as any)?.toDate ? format((note.timestamp as any).toDate(), 'PPp') : '...'})</span></p>
                                            <p className="whitespace-pre-wrap">{note.note}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (<p className="text-sm text-muted-foreground">No notes yet.</p>)}
                            
                             <Form {...form}>
                                <form onSubmit={form.handleSubmit(onNoteSubmit)} className="space-y-2 mt-4">
                                     <FormField control={form.control} name="note" render={({ field }) => (
                                         <FormItem><FormLabel>Add a Note</FormLabel><FormControl><Textarea placeholder="Type your message..." {...field} /></FormControl><FormMessage /></FormItem>
                                     )} />
                                     <Button type="submit" size="sm" disabled={isSubmitting}>Add Note</Button>
                                </form>
                            </Form>
                        </div>
                         <Separator />
                        {/* Actions */}
                        <div>
                            <h4 className="font-semibold mb-2">Actions</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {type === 'incoming' && request.requestStatus === 'pending_owner_approval' && (
                                    <>
                                        <Button onClick={() => handleStatusUpdate('accepted')} disabled={isSubmitting}>Accept</Button>
                                        <Button variant="destructive" onClick={() => handleStatusUpdate('rejected')} disabled={isSubmitting}>Reject</Button>
                                    </>
                                )}
                                {type === 'outgoing' && request.requestStatus === 'pending_owner_approval' && (
                                    <Button variant="secondary" onClick={() => handleStatusUpdate('cancelled')} disabled={isSubmitting}>Cancel Request</Button>
                                )}
                                {type === 'incoming' && request.requestStatus === 'accepted' && (
                                    <Button onClick={() => handleStatusUpdate('fulfilled_by_sender')} disabled={isSubmitting}>Mark as Fulfilled</Button>
                                )}
                                {type === 'outgoing' && request.requestStatus === 'fulfilled_by_sender' && (
                                    <Button onClick={() => handleStatusUpdate('received_by_requester')} disabled={isSubmitting}>Mark as Received</Button>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface ProductRequestTableProps {
  data: ProductRequest[];
  type: 'incoming' | 'outgoing';
  onUpdate: () => void;
}

export const ProductRequestTable: React.FC<ProductRequestTableProps> = ({ data, type, onUpdate }) => {

    const columns: ColumnDef<ProductRequest>[] = [
        {
          accessorKey: 'productName',
          header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Product <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
        },
        {
          accessorKey: type === 'incoming' ? 'requesterDispensaryName' : 'productOwnerDispensaryId',
          header: type === 'incoming' ? 'From' : 'To (Owner ID)',
        },
        {
          accessorKey: 'quantityRequested',
          header: 'Quantity',
        },
        {
          accessorKey: 'requestStatus',
          header: 'Status',
          cell: ({ row }) => {
            const { color, icon } = getStatusProps(row.original.requestStatus);
            return (
              <Badge className={color}>
                {icon}
                <span className="ml-1.5">{row.original.requestStatus.replace(/_/g, ' ').toUpperCase()}</span>
              </Badge>
            );
          },
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
            cell: ({ row }) => {
                const date = (row.original.createdAt as any)?.toDate ? (row.original.createdAt as any).toDate() : new Date();
                return format(date, 'MMM d, yyyy');
            },
        },
        {
          id: 'actions',
          cell: ({ row }) => <ManageRequestDialog request={row.original} type={type} onUpdate={onUpdate} />,
        },
    ];

  return (
    <DataTable
      columns={columns}
      data={data}
      searchColumn="productName"
      searchPlaceholder="Filter by product name..."
    />
  );
};
