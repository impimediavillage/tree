
'use client';

import * as React from 'react';
import type { ProductRequest, NoteData, Product } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc, collection, writeBatch, deleteDoc } from 'firebase/firestore';
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
import { ArrowUpDown, Eye, MessageSquare, Check, X, Ban, Truck, Package, AlertTriangle, Inbox, Send, Calendar, User, Phone, MapPin, Loader2, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { getProductCollectionName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const addNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty.").max(1000, "Note is too long."),
  actualDeliveryDate: z.string().optional(),
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
        defaultValues: { note: '', actualDeliveryDate: request.actualDeliveryDate || '' },
    });

    React.useEffect(() => {
        if (isOpen) {
            form.reset({ note: '', actualDeliveryDate: request.actualDeliveryDate || '' });
            setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, [isOpen, request.notes, request.actualDeliveryDate, form]);

    const handleOwnerFinalAccept = async () => {
        if (!request.id) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            
            const orderData = { ...request, orderDate: serverTimestamp(), requestStatus: 'ordered' };
            const newOrderRef = doc(collection(db, 'productPoolOrders'));
            batch.set(newOrderRef, orderData);
            
            const requestRef = doc(db, 'productRequests', request.id);
            batch.delete(requestRef);
            
            await batch.commit();
            toast({ title: "Order Confirmed!", description: `Order for ${request.productName} has been created and finalized.` });

            onUpdate();
            setIsOpen(false);
        } catch (error) {
            console.error("Error finalizing order:", error);
            toast({ title: "Finalization Failed", variant: "destructive", description: "Could not create the final order." });
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleStatusUpdate = async (newStatus: ProductRequest['requestStatus']) => {
        if (!request.id) return;
        setIsSubmitting(true);
        try {
            const requestRef = doc(db, 'productRequests', request.id);
            
            if (type === 'incoming' && newStatus === 'accepted' && !request.requesterConfirmed) {
                await updateDoc(requestRef, { requestStatus: 'accepted', updatedAt: serverTimestamp() });
                toast({ title: "Request Accepted", description: "Waiting for the requester to confirm the order." });
            } 
            else if (type === 'incoming' && newStatus === 'rejected') {
                 await updateDoc(requestRef, { requestStatus: 'rejected', updatedAt: serverTimestamp() });
                 toast({ title: "Request Rejected", variant: "destructive" });
            }
            else if (type === 'outgoing' && newStatus === 'cancelled') {
                 await updateDoc(requestRef, { requestStatus: 'cancelled', updatedAt: serverTimestamp() });
                 toast({ title: "Request Cancelled" });
            }
            else {
                 await updateDoc(requestRef, { requestStatus: newStatus, updatedAt: serverTimestamp() });
                 toast({ title: "Status Updated", description: `Request status set to ${newStatus.replace(/_/g, ' ')}.` });
            }
            
            onUpdate();
            setIsOpen(false);
        } catch (error) {
            console.error("Error updating status:", error);
            toast({ title: "Update Failed", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRequesterConfirm = async () => {
        if (!request.id) return;
        setIsSubmitting(true);
        try {
            const requestRef = doc(db, 'productRequests', request.id);
            await updateDoc(requestRef, { requesterConfirmed: true, updatedAt: serverTimestamp() });
            toast({ title: "Order Confirmed", description: "Your confirmation has been sent to the owner for final approval." });
            onUpdate();
        } catch (error) {
            console.error("Error confirming request:", error);
            toast({ title: "Confirmation Failed", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    const onNoteSubmit = async (data: AddNoteFormData) => {
        if (!request.id || !currentUser) return;
        setIsSubmitting(true);
        
        const updatePayload: any = {
            updatedAt: serverTimestamp(),
        };

        if(data.note.trim()) {
            const newNote: NoteData = {
                note: data.note,
                byName: currentUser.displayName || 'Unnamed User',
                senderRole: type === 'incoming' ? 'owner' : 'requester',
                timestamp: new Date(),
            };
            updatePayload.notes = arrayUnion(newNote);
        }

        if(type === 'incoming' && data.actualDeliveryDate) {
            updatePayload.actualDeliveryDate = data.actualDeliveryDate;
        }

        try {
            const requestRef = doc(db, 'productRequests', request.id);
            await updateDoc(requestRef, updatePayload);
            toast({ title: "Request Updated", description: "Your note and/or date has been saved." });
            form.reset();
            onUpdate();
        } catch (error) {
            console.error("Error updating request:", error);
            toast({ title: "Error", description: "Could not update the request.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full"><Eye className="mr-2 h-4 w-4" />Manage</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogTitle>Manage Request: {request.productName}</DialogTitle>
                    <DialogDescription>
                        {type === 'incoming' ? `From: ${request.requesterDispensaryName}` : `To: ${request.productDetails?.dispensaryName || request.productOwnerEmail}`}
                    </DialogDescription>
                </DialogHeader>
                 <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <div className="px-6 py-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1"><p className="text-muted-foreground">Quantity Requested</p><p className="font-semibold">{request.quantityRequested} x {request.requestedTier?.unit || 'unit'}</p></div>
                                <div className="space-y-1"><p className="text-muted-foreground">Est. Value</p><p className="font-semibold">{request.productDetails?.currency} {(request.quantityRequested * (request.requestedTier?.price || 0)).toFixed(2)}</p></div>
                                <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4"/>Delivery Address</p><p>{request.deliveryAddress}</p></div>
                                <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><User className="h-4 w-4"/>Contact Person</p><p>{request.contactPerson}</p></div>
                                <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><Phone className="h-4 w-4"/>Contact Phone</p><p>{request.contactPhone}</p></div>
                                
                                <div>
                                    <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4"/>Requester's Preferred Date</p><p>{request.preferredDeliveryDate || 'Not specified'}</p></div>
                                    {request.actualDeliveryDate && (
                                        <div className="mt-2 p-2 bg-orange-100 border border-orange-200 rounded-md text-orange-800">
                                            <p className="font-semibold text-xs">Seller's Actual delivery Date:</p>
                                            <p className="font-bold">{request.actualDeliveryDate}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <h4 className="font-semibold mb-2">Notes</h4>
                                <div className="space-y-4 text-sm bg-muted/50 p-3 rounded-md min-h-[150px]">
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
                                                        <p className="whitespace-pre-wrap mt-1 text-sm">{note.note}</p>
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
                                <form onSubmit={form.handleSubmit(onNoteSubmit)} className="space-y-4">
                                     {type === 'incoming' && (
                                        <FormField control={form.control} name="actualDeliveryDate" render={({ field }) => (
                                            <FormItem>
                                            <FormLabel className="font-semibold">Set Actual Delivery Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )} />
                                    )}
                                    <FormField control={form.control} name="note" render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="font-semibold">Add a Note</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Type your message..." {...field} className="text-sm"/>
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button type="submit" size="sm" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Save Note & Date
                                    </Button>
                                </form>
                            </Form>
                            <Separator />
                            <div className="w-full space-y-2">
                                <h4 className="font-semibold text-sm">Update Status</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {type === 'incoming' && request.requestStatus === 'pending_owner_approval' && (
                                        <>
                                            <Button onClick={() => handleStatusUpdate('accepted')} disabled={isSubmitting}>Accept Request</Button>
                                            <Button variant="destructive" onClick={() => handleStatusUpdate('rejected')} disabled={isSubmitting}>Reject Request</Button>
                                        </>
                                    )}
                                    {type === 'incoming' && request.requestStatus === 'accepted' && !request.requesterConfirmed && (
                                        <Badge className="col-span-full justify-center">Awaiting Requester Confirmation</Badge>
                                    )}
                                    {type === 'incoming' && request.requestStatus === 'accepted' && request.requesterConfirmed && (
                                         <>
                                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleOwnerFinalAccept} disabled={isSubmitting}>
                                                <ThumbsUp className="mr-2 h-4 w-4" /> Finalize & Create Order
                                            </Button>
                                            <Button variant="destructive" onClick={() => handleStatusUpdate('rejected')} disabled={isSubmitting}>
                                                <ThumbsDown className="mr-2 h-4 w-4" /> Reject Order
                                            </Button>
                                        </>
                                    )}

                                    {type === 'outgoing' && request.requestStatus === 'pending_owner_approval' && (
                                        <Button variant="secondary" onClick={() => handleStatusUpdate('cancelled')} disabled={isSubmitting}>Cancel Request</Button>
                                    )}
                                    {type === 'outgoing' && request.requestStatus === 'accepted' && !request.requesterConfirmed && (
                                        <>
                                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleRequesterConfirm} disabled={isSubmitting}>
                                                <ThumbsUp className="mr-2 h-4 w-4" /> Accept and Place Order
                                            </Button>
                                            <Button variant="destructive" onClick={() => handleStatusUpdate('cancelled')} disabled={isSubmitting}>
                                                <ThumbsDown className="mr-2 h-4 w-4" /> Cancel Request
                                            </Button>
                                        </>
                                    )}
                                    {type === 'outgoing' && request.requestStatus === 'accepted' && request.requesterConfirmed && (
                                        <Badge color="blue" className="col-span-full justify-center">You have confirmed. Awaiting owner to finalize.</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface ProductRequestCardProps {
  request: ProductRequest;
  type: 'incoming' | 'outgoing';
  onUpdate: () => void;
  onDelete: (requestId: string) => void;
}

export const ProductRequestCard: React.FC<ProductRequestCardProps> = ({ request, type, onUpdate, onDelete }) => {
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
        <Card className="flex flex-col shadow-md hover:shadow-lg transition-shadow bg-muted/50">
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
                    <span>{type === 'incoming' ? `From: ${request.requesterDispensaryName}` : `To: ${request.productDetails?.dispensaryName || request.productOwnerEmail}`}</span>
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
                {type === 'incoming' && (
                    <div className="w-full flex gap-2">
                        {request.requestStatus === 'pending_owner_approval' && (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="w-full"
                                onClick={handleMarkAsSoldOut}
                                disabled={isSoldOutLoading}
                            >
                                {isSoldOutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Mark Tier Sold Out
                            </Button>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full"><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete this request. This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(request.id!)}>Delete Request</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
};
