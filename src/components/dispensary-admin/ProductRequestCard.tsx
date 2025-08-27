
'use client';

import * as React from 'react';
import type { ProductRequest, NoteData, Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';
import Image from 'next/image';
import { ArrowUpDown, Eye, MessageSquare, Check, X, Ban, Truck, Package, AlertTriangle, Inbox, Send, Calendar, User, Phone, MapPin, Loader2 } from 'lucide-react';
import { getProductCollectionName } from '@/lib/utils';
import { cn } from '@/lib/utils';


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
    const notesEndRef = React.useRef<HTMLDivElement>(null);

    const form = useForm<AddNoteFormData>({
        resolver: zodResolver(addNoteSchema),
        defaultValues: { note: '' },
    });

    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, [isOpen, request.notes]);


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
            timestamp: new Date(),
        };
        try {
            const requestRef = doc(db, 'productRequests', request.id);
            await updateDoc(requestRef, { notes: arrayUnion(newNote), updatedAt: serverTimestamp() });
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
            <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full"><Eye className="mr-2 h-4 w-4" />Manage</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle>Manage Request: {request.productName}</DialogTitle>
                    <DialogDescription>
                        {type === 'incoming' ? `From: ${request.requesterDispensaryName}` : `To: ${request.productOwnerEmail}`}
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 min-h-0">
                    <div className="px-6 py-4 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1"><p className="text-muted-foreground">Quantity Requested</p><p className="font-semibold">{request.quantityRequested} x {request.requestedTier?.unit || 'unit'}</p></div>
                            <div className="space-y-1"><p className="text-muted-foreground">Est. Value</p><p className="font-semibold">{request.productDetails?.currency} {(request.quantityRequested * (request.requestedTier?.price || 0)).toFixed(2)}</p></div>
                            <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4"/>Delivery Address</p><p>{request.deliveryAddress}</p></div>
                            <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><User className="h-4 w-4"/>Contact Person</p><p>{request.contactPerson}</p></div>
                            <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><Phone className="h-4 w-4"/>Contact Phone</p><p>{request.contactPhone}</p></div>
                            <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4"/>Preferred Date</p><p>{request.preferredDeliveryDate || 'Not specified'}</p></div>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold mb-2">Notes</h4>
                            <div className="space-y-3 text-sm rounded-md bg-muted/50 p-3 min-h-[150px]">
                                {request.notes && request.notes.length > 0 ? (
                                    request.notes.sort((a,b) => ((a.timestamp as any)?.seconds || 0) - ((b.timestamp as any)?.seconds || 0)).map((note, idx) => {
                                        const isCurrentUser = (type === 'incoming' && note.senderRole === 'owner') || (type === 'outgoing' && note.senderRole === 'requester');
                                        return (
                                            <div key={idx} className={cn("flex w-full", isCurrentUser ? "justify-end" : "justify-start")}>
                                                <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg shadow-sm", isCurrentUser ? "bg-primary text-primary-foreground" : "bg-background border")}>
                                                    <p className={cn("font-semibold text-xs", isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                        {note.byName} 
                                                        <span className="ml-2 text-xs">
                                                            ({(note.timestamp as any)?.toDate ? format((note.timestamp as any).toDate(), 'MMM d, h:mm a') : '...'})
                                                        </span>
                                                    </p>
                                                    <p className="whitespace-pre-wrap mt-1">{note.note}</p>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (<p className="text-sm text-center text-muted-foreground py-4">No notes yet.</p>)}
                                <div ref={notesEndRef} />
                            </div>
                        </div>
                        <Separator />
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onNoteSubmit)} className="space-y-2">
                                <FormField control={form.control} name="note" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="font-semibold">Respond</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Type your message to respond..." {...field} className="text-sm"/>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" size="sm" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Add Note
                                </Button>
                            </form>
                        </Form>
                        <Separator />
                        <div className="w-full space-y-2">
                            <h4 className="font-semibold text-sm">Update Status</h4>
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
            </DialogContent>
        </Dialog>
    );
};

interface ProductRequestCardProps {
  request: ProductRequest;
  type: 'incoming' | 'outgoing';
  onUpdate: () => void;
}

export const ProductRequestCard: React.FC<ProductRequestCardProps> = ({ request, type, onUpdate }) => {
    const { color, icon } = getStatusProps(request.requestStatus);
    const { toast } = useToast();
    const [isSoldOutLoading, setIsSoldOutLoading] = React.useState(false);

    const handleMarkAsSoldOut = async () => {
        if (!request.productDetails || !request.productDetails.dispensaryType) {
            toast({ title: "Error", description: "Missing product details to update stock.", variant: "destructive" });
            return;
        }

        setIsSoldOutLoading(true);

        const collectionName = getProductCollectionName(request.productDetails.dispensaryType);
        if (!collectionName) {
            toast({ title: "Error", description: `Cannot determine database collection for type: ${request.productDetails.dispensaryType}`, variant: "destructive" });
            setIsSoldOutLoading(false);
            return;
        }

        try {
            const productRef = doc(db, collectionName, request.productId);
            const productSnap = await getDoc(productRef);

            if (!productSnap.exists()) {
                throw new Error("The original product could not be found.");
            }

            const productData = productSnap.data() as Product;
            const updatedPriceTiers = productData.priceTiers.map(tier => {
                if (tier.unit === request.requestedTier?.unit) {
                    return { ...tier, quantityInStock: 0 };
                }
                return tier;
            });
            const updatedPoolPriceTiers = (productData.poolPriceTiers || []).map(tier => {
                if (tier.unit === request.requestedTier?.unit) {
                    return { ...tier, quantityInStock: 0 };
                }
                return tier;
            });
            
            await updateDoc(productRef, { 
                priceTiers: updatedPriceTiers,
                poolPriceTiers: updatedPoolPriceTiers,
             });

            toast({ title: "Stock Updated", description: `${request.productName} (${request.requestedTier?.unit}) has been marked as sold out.` });
            onUpdate();

        } catch (error: any) {
            console.error("Error marking as sold out:", error);
            toast({ title: "Update Failed", description: error.message || "Could not update the product stock.", variant: "destructive" });
        } finally {
            setIsSoldOutLoading(false);
        }
    };


    return (
        <Card className="flex flex-col shadow-md hover:shadow-lg transition-shadow bg-card">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                     <CardTitle className="text-lg font-semibold truncate" title={request.productName}>{request.productName}</CardTitle>
                     {request.productImage && (
                        <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                           <Image src={request.productImage} alt={request.productName} layout="fill" objectFit="cover" />
                        </div>
                     )}
                </div>
                 <Badge className={cn("self-start", color)}>
                    {icon}
                    <span className="ml-1.5">{request.requestStatus.replace(/_/g, ' ')}</span>
                </Badge>
            </CardHeader>
            <CardContent className="flex-grow text-sm space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {type === 'incoming' ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    <span>{type === 'incoming' ? `From: ${request.requesterDispensaryName}` : `To: ${request.productOwnerEmail}`}</span>
                </div>
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4"/>
                    <span>Requested on: {request.createdAt ? format((request.createdAt as any).toDate(), 'PP') : 'N/A'}</span>
                </div>
                <div className="pt-1">
                    <span className="font-semibold text-primary">{request.quantityRequested}</span>
                    <span className="text-muted-foreground"> x {request.requestedTier?.unit || 'unit'}</span>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                <ManageRequestDialog request={request} type={type} onUpdate={onUpdate} />
                {type === 'incoming' && request.requestStatus === 'pending_owner_approval' && (
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full"
                        onClick={handleMarkAsSoldOut}
                        disabled={isSoldOutLoading}
                    >
                         {isSoldOutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Mark Tier as Sold Out
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};
