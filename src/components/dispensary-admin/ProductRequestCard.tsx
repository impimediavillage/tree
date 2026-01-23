
'use client';

import * as React from 'react';
import type { ProductRequest, NoteData, Product } from '@/types';
import type { ShippingRate } from '@/types/checkout';
import type { PudoLocker } from '@/types/shipping';
import type { ProductType } from '@/types/product';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, addDoc, collection, writeBatch, deleteDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calculatePriceBreakdown, PRODUCT_POOL_COMMISSION_RATE } from '@/lib/pricing';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '../ui/separator';
import Image from 'next/image';
import { ArrowUpDown, Eye, MessageSquare, Check, X, Ban, Truck, Package, AlertTriangle, Inbox, Send, Calendar, User, Phone, MapPin, Loader2, ThumbsUp, ThumbsDown, Trash2, ShoppingCart, CheckCircle, Search } from 'lucide-react';
import { getProductCollectionName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Order, OrderItem, OrderShipment } from '@/types/order';
import { useProductPoolShipping } from '@/hooks/use-product-pool-shipping';


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
    const [showShippingSelection, setShowShippingSelection] = React.useState(false);
    const [selectedShipping, setSelectedShipping] = React.useState<ShippingRate | null>(null);
    const [selectedDestinationLocker, setSelectedDestinationLocker] = React.useState<PudoLocker | null>(null);
    const [availableShippingMethods, setAvailableShippingMethods] = React.useState<string[]>([]);
    const [sellerDispensary, setSellerDispensary] = React.useState<any>(null);
    const [buyerDispensary, setBuyerDispensary] = React.useState<any>(null);
    const [selectedShippingTier, setSelectedShippingTier] = React.useState<string | null>(null);
    const [isLockerModalOpen, setIsLockerModalOpen] = React.useState(false);
    const [lockerSearchTerm, setLockerSearchTerm] = React.useState('');
    
    // Use the shipping hook
    const shipping = useProductPoolShipping();
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

    // Fetch seller's shipping methods when dialog opens
    React.useEffect(() => {
        const fetchDispensaryDetails = async () => {
            if (!isOpen || !showShippingSelection) return;
            
            try {
                const [sellerSnap, buyerSnap] = await Promise.all([
                    getDoc(doc(db, 'dispensaries', request.productOwnerDispensaryId)),
                    getDoc(doc(db, 'dispensaries', request.requesterDispensaryId))
                ]);

                if (sellerSnap.exists() && buyerSnap.exists()) {
                    const sellerData = sellerSnap.data();
                    const buyerData = buyerSnap.data();
                    setSellerDispensary(sellerData);
                    setBuyerDispensary(buyerData);
                    setAvailableShippingMethods(sellerData.shippingMethods || []);
                }
            } catch (error) {
                console.error('Error fetching dispensary details:', error);
                toast({
                    title: 'Error',
                    description: 'Could not load shipping options',
                    variant: 'destructive'
                });
            }
        };

        fetchDispensaryDetails();
    }, [isOpen, showShippingSelection, request.productOwnerDispensaryId, request.requesterDispensaryId, toast]);

    const handleOwnerFinalAccept = async () => {
        if (!request.id) return;
        
        // Step 1: Show shipping selection if not already shown
        if (!showShippingSelection) {
            setShowShippingSelection(true);
            return;
        }

        // Step 2: Validate shipping selection
        if (!selectedShipping) {
            toast({
                title: 'Shipping Required',
                description: 'Please select a shipping method before finalizing the order.',
                variant: 'destructive'
            });
            return;
        }

        // TypeScript: selectedShipping is guaranteed non-null here with all required ShippingRate properties
        const shippingMethod: ShippingRate = selectedShipping;

        setIsSubmitting(true);
        try {
            // Fetch both dispensary details
            const [sellerDispensarySnap, buyerDispensarySnap] = await Promise.all([
                getDoc(doc(db, 'dispensaries', request.productOwnerDispensaryId)),
                getDoc(doc(db, 'dispensaries', request.requesterDispensaryId))
            ]);

            if (!sellerDispensarySnap.exists() || !buyerDispensarySnap.exists()) {
                throw new Error('Could not fetch dispensary details');
            }

            const sellerDispensary = sellerDispensarySnap.data();
            const buyerDispensary = buyerDispensarySnap.data();

            // Validate requested tier exists
            if (!request.requestedTier) {
                throw new Error('No price tier specified in request');
            }

            // Fetch the actual product to get current stock levels
            const productCollectionName = getProductCollectionName(request.productDetails?.dispensaryType || sellerDispensary.dispensaryType);
            const productRef = doc(db, productCollectionName, request.productId);
            const productSnap = await getDoc(productRef);
            
            let quantityInStock = 0;
            let productData: Product | null = null;
            if (productSnap.exists()) {
                productData = productSnap.data() as Product;
                // Find the matching tier in poolPriceTiers
                const matchingPoolTier = productData.poolPriceTiers?.find(
                    tier => tier.unit === request.requestedTier?.unit
                );
                quantityInStock = matchingPoolTier?.quantityInStock || 0;
            }

            // Calculate 5% commission using existing pricing function
            const tierPrice = request.requestedTier.price;
            const taxRate = buyerDispensary.taxRate || 0;
            const priceBreakdown = calculatePriceBreakdown(tierPrice, taxRate, true); // isProductPool = true

            // Generate order number
            const orderNumber = `POOL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Create OrderItem structure
            const orderItem: OrderItem = {
                id: request.productId,
                productId: request.productId,
                name: request.productName,
                imageUrl: request.productImage || null,
                category: request.productDetails?.category || 'Product Pool',
                productOwnerEmail: sellerDispensary.contactEmail || '',
                quantity: request.quantityRequested,
                quantityInStock: quantityInStock,
                price: tierPrice,
                originalPrice: tierPrice,
                unit: request.requestedTier.unit,
                weight: request.requestedTier.weightKgs || 0.5,
                dispensaryId: request.productOwnerDispensaryId,
                dispensaryName: sellerDispensary.dispensaryName || '',
                dispensaryType: sellerDispensary.dispensaryType,
                productType: (productData?.productType || 'Other') as ProductType,
                
                // Pricing breakdown with 5% commission
                dispensarySetPrice: tierPrice,
                basePrice: priceBreakdown.basePrice,
                platformCommission: priceBreakdown.commission,
                commissionRate: PRODUCT_POOL_COMMISSION_RATE,
                subtotalBeforeTax: priceBreakdown.subtotalBeforeTax,
                taxAmount: priceBreakdown.basePrice * taxRate * request.quantityRequested,
                lineTotal: priceBreakdown.finalPrice * request.quantityRequested,
            };

            // Create OrderShipment structure
            const orderShipment: OrderShipment = {
                dispensaryId: request.productOwnerDispensaryId,
                items: [orderItem],
                shippingMethod: shippingMethod,
                status: 'pending',
                shippingProvider: shippingMethod.provider,
                originLocker: sellerDispensary.originLocker || undefined,
                destinationLocker: selectedDestinationLocker || buyerDispensary.originLocker || undefined,
                statusHistory: [{
                    status: 'pending',
                    timestamp: Timestamp.now(),
                    message: 'Order created from Product Pool negotiation',
                    updatedBy: currentUser?.uid
                }]
            };

            // Calculate totals
            const subtotal = orderItem.subtotalBeforeTax * orderItem.quantity;
            const tax = orderItem.taxAmount;
            const shippingCost = shippingMethod.price || 0;
            const total = subtotal + tax + shippingCost;
            const totalDispensaryEarnings = orderItem.basePrice * orderItem.quantity;
            const totalPlatformCommission = orderItem.platformCommission * orderItem.quantity;

            // Create Order structure - use buyer dispensary as "customer"
            const orderData: Partial<Order> = {
                userId: request.requesterUserId, // Buyer user ID
                orderNumber: orderNumber,
                items: [orderItem],
                shippingCost: shippingCost,
                
                // Pricing breakdown
                subtotal: subtotal,
                tax: tax,
                taxRate: taxRate,
                shippingTotal: shippingCost,
                total: total,
                currency: buyerDispensary.currency || 'ZAR',
                
                // Revenue tracking (5% commission)
                totalDispensaryEarnings: totalDispensaryEarnings,
                totalPlatformCommission: totalPlatformCommission,
                
                // Payment details (B2B - likely invoice-based)
                paymentMethod: 'payfast',
                paymentStatus: 'pending',
                
                // Use buyer dispensary details as customer
                customerDetails: {
                    name: buyerDispensary.dispensaryName || buyerDispensary.contactName || '',
                    email: buyerDispensary.contactEmail || '',
                    phone: buyerDispensary.contactPhone || request.contactPhone || '',
                },
                
                // Use buyer dispensary address as shipping address
                shippingAddress: {
                    streetAddress: buyerDispensary.address || buyerDispensary.streetAddress || '',
                    suburb: buyerDispensary.suburb || '',
                    city: buyerDispensary.city || '',
                    province: buyerDispensary.province || '',
                    postalCode: buyerDispensary.postalCode || '',
                    country: buyerDispensary.country || 'South Africa',
                    latitude: buyerDispensary.latitude,
                    longitude: buyerDispensary.longitude,
                },
                
                // Shipments
                shipments: {
                    [request.productOwnerDispensaryId]: orderShipment
                },
                
                // Order metadata - mark as Product Pool order
                orderType: 'dispensary',
                isProductPoolOrder: true, // Flag to identify Product Pool orders
                status: 'pending',
                statusHistory: [{
                    status: 'pending',
                    timestamp: Timestamp.now(),
                    message: 'Product Pool order created',
                    updatedBy: currentUser?.uid
                }],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                
                // Stock tracking
                stockDeducted: false,
            };
            
            // Save to orders collection (not productPoolOrders)
            const batch = writeBatch(db);
            const newOrderRef = doc(collection(db, 'orders'));
            batch.set(newOrderRef, orderData);
            
            // Delete the product request
            const requestRef = doc(db, 'productRequests', request.id);
            batch.delete(requestRef);
            
            await batch.commit();
            
            toast({ 
                title: "Order Created! 🎉", 
                description: `Order ${orderNumber} created with ${(PRODUCT_POOL_COMMISSION_RATE * 100).toFixed(0)}% platform commission.` 
            });

            onUpdate();
            setIsOpen(false);
            setShowShippingSelection(false);
            setSelectedShipping(null);
        } catch (error) {
            console.error("Error finalizing order:", error);
            toast({ 
                title: "Order Creation Failed", 
                variant: "destructive", 
                description: "Could not create the order. " + (error as Error).message 
            });
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
                                <div className="space-y-1"><p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4"/>Delivery Address</p><p>{typeof request.deliveryAddress === 'string' ? request.deliveryAddress : `${request.deliveryAddress.streetAddress}, ${request.deliveryAddress.suburb}, ${request.deliveryAddress.city}, ${request.deliveryAddress.province}, ${request.deliveryAddress.postalCode}`}</p></div>
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
                                            {/* Modern Shipping Selection UI */}
                                            {showShippingSelection && (
                                                <div className="col-span-full space-y-6">
                                                    {/* Method Selection Card */}
                                                    <Card className="border-2 border-primary/30 bg-gradient-to-br from-amber-50 via-orange-50 to-green-50 dark:from-gray-900 dark:via-amber-950 dark:to-green-950">
                                                        <CardHeader>
                                                            <CardTitle className="flex items-center gap-2 text-lg">
                                                                <Truck className="h-6 w-6 text-[#006B3E]" />
                                                                <span className="font-black text-[#3D2E17]">1. Select Shipping Method</span>
                                                            </CardTitle>
                                                            <CardDescription className="font-semibold text-[#5D4E37]">
                                                                Choose delivery from {sellerDispensary?.dispensaryName || 'seller'} to {request.requesterDispensaryName}
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            {availableShippingMethods.length === 0 ? (
                                                                <div className="text-center py-8 bg-white/60 rounded-xl border-2 border-dashed border-[#006B3E]/30">
                                                                    <AlertTriangle className="h-12 w-12 text-[#006B3E]/30 mx-auto mb-3" />
                                                                    <p className="text-lg font-bold text-[#5D4E37]">No shipping methods configured</p>
                                                                    <p className="text-sm font-semibold text-muted-foreground mt-1">The seller dispensary needs to configure shipping methods in their profile.</p>
                                                                </div>
                                                            ) : (
                                                                <RadioGroup 
                                                                    value={selectedShippingTier || ''} 
                                                                    onValueChange={async (value) => {
                                                                        setSelectedShippingTier(value);
                                                                        setSelectedShipping(null);
                                                                        setSelectedDestinationLocker(null);
                                                                        shipping.resetShipping();
                                                                        
                                                                        if (!buyerDispensary || !sellerDispensary || !request.requestedTier) return;
                                                                        
                                                                        const buyerAddress = {
                                                                            streetAddress: buyerDispensary.address || buyerDispensary.streetAddress || '',
                                                                            suburb: buyerDispensary.suburb || '',
                                                                            city: buyerDispensary.city || '',
                                                                            province: buyerDispensary.province || '',
                                                                            postalCode: buyerDispensary.postalCode || '',
                                                                            country: buyerDispensary.country || 'South Africa',
                                                                            latitude: buyerDispensary.latitude,
                                                                            longitude: buyerDispensary.longitude,
                                                                        };
                                                                        
                                                                        const shippingConfig = {
                                                                            items: [{
                                                                                productId: request.productId,
                                                                                name: request.productName,
                                                                                quantity: request.quantityRequested,
                                                                                weight: request.requestedTier.weightKgs || 0.5,
                                                                                lengthCm: request.requestedTier.lengthCm,
                                                                                widthCm: request.requestedTier.widthCm,
                                                                                heightCm: request.requestedTier.heightCm,
                                                                            }],
                                                                            sellerDispensary,
                                                                            buyerDispensary,
                                                                        };
                                                                        
                                                                        // Fetch rates based on method
                                                                        if (value === 'dtd') {
                                                                            await shipping.fetchShiplogicRates(shippingConfig, buyerAddress);
                                                                        } else if (value === 'collection') {
                                                                            const collectionRate = shipping.createCollectionRate(sellerDispensary);
                                                                            setSelectedShipping(collectionRate);
                                                                        } else if (value === 'in_house') {
                                                                            const inHouseRate = shipping.calculateInHouseDelivery(sellerDispensary, buyerAddress);
                                                                            if (inHouseRate) setSelectedShipping(inHouseRate);
                                                                        } else if (['dtl', 'ltd', 'ltl'].includes(value)) {
                                                                            // Fetch PUDO lockers for buyer
                                                                            if (value === 'dtl' || value === 'ltl') {
                                                                                await shipping.fetchPudoLockers(
                                                                                    buyerAddress,
                                                                                    request.requestedTier.weightKgs || 0.5,
                                                                                    request.requestedTier.lengthCm && request.requestedTier.widthCm && request.requestedTier.heightCm
                                                                                        ? { length: request.requestedTier.lengthCm, width: request.requestedTier.widthCm, height: request.requestedTier.heightCm }
                                                                                        : undefined
                                                                                );
                                                                            } else if (value === 'ltd' && sellerDispensary.originLocker) {
                                                                                // LTD: Only needs origin locker (from seller)
                                                                                await shipping.fetchPudoRates(shippingConfig, value as any, buyerAddress);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                                                                >
                                                                    {availableShippingMethods.map((method) => {
                                                                        const methodLabels: Record<string, string> = {
                                                                            'dtd': 'Door-to-Door Courier',
                                                                            'dtl': 'Door-to-Locker',
                                                                            'ltd': 'Locker-to-Door',
                                                                            'ltl': 'Locker-to-Locker',
                                                                            'collection': 'Collection from Store',
                                                                            'in_house': 'In-house Delivery'
                                                                        };
                                                                        
                                                                        const methodDescriptions: Record<string, string> = {
                                                                            'dtd': 'ShipLogic courier service',
                                                                            'dtl': 'To PUDO locker near buyer',
                                                                            'ltd': 'From seller locker to buyer',
                                                                            'ltl': 'Between PUDO lockers',
                                                                            'collection': 'Free pickup at store',
                                                                            'in_house': 'Local delivery service'
                                                                        };
                                                                        
                                                                        return (
                                                                            <Label 
                                                                                key={method}
                                                                                htmlFor={`shipping-${method}`}
                                                                                className={cn(
                                                                                    "flex items-center p-4 rounded-xl cursor-pointer border-2 transition-all",
                                                                                    selectedShippingTier === method
                                                                                        ? "bg-[#006B3E] border-[#006B3E] shadow-xl ring-2 ring-[#006B3E]/30"
                                                                                        : "bg-white/80 dark:bg-gray-800/50 border-[#006B3E]/20 hover:border-[#006B3E] hover:shadow-lg"
                                                                                )}
                                                                            >
                                                                                <RadioGroupItem value={method} id={`shipping-${method}`} className="sr-only" />
                                                                                <div className="flex-1">
                                                                                    <p className={cn(
                                                                                        "font-black text-base",
                                                                                        selectedShippingTier === method ? "text-white" : "text-[#3D2E17]"
                                                                                    )}>
                                                                                        {methodLabels[method] || method}
                                                                                    </p>
                                                                                    <p className={cn(
                                                                                        "text-sm font-semibold",
                                                                                        selectedShippingTier === method ? "text-green-100" : "text-[#5D4E37]"
                                                                                    )}>
                                                                                        {methodDescriptions[method]}
                                                                                    </p>
                                                                                </div>
                                                                                {selectedShippingTier === method && (
                                                                                    <CheckCircle className="h-6 w-6 text-white ml-2" />
                                                                                )}
                                                                            </Label>
                                                                        );
                                                                    })}
                                                                </RadioGroup>
                                                            )}
                                                        </CardContent>
                                                    </Card>

                                                    {/* Origin Locker Display (for LTL/LTD) */}
                                                    {selectedShippingTier && ['ltd', 'ltl'].includes(selectedShippingTier) && sellerDispensary?.originLocker && (
                                                        <Card className="border-[#006B3E]/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
                                                            <CardHeader className="pb-3">
                                                                <CardTitle className="text-base flex items-center gap-2">
                                                                    <MapPin className="h-5 w-5 text-[#006B3E]" />
                                                                    Origin Locker (Seller)
                                                                </CardTitle>
                                                                <CardDescription>Seller ships from:</CardDescription>
                                                            </CardHeader>
                                                            <CardContent>
                                                                <div className="flex items-start gap-3">
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-[#3D2E17]">{sellerDispensary.originLocker.name || sellerDispensary.originLocker.pudoName}</p>
                                                                        <p className="text-sm text-muted-foreground">{sellerDispensary.originLocker.address}</p>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )}

                                                    {/* Destination Locker Selection (for DTL/LTL) */}
                                                    {selectedShippingTier && ['dtl', 'ltl'].includes(selectedShippingTier) && (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <p className="font-extrabold text-[#3D2E17] text-lg">2. Select Destination Locker</p>
                                                                {shipping.parcelSizeCategory && shipping.parcelSizeCategory !== 'UNKNOWN' && (
                                                                    <Badge className={cn(
                                                                        "font-bold",
                                                                        shipping.parcelSizeCategory === 'OVERSIZED' 
                                                                            ? "bg-destructive text-white" 
                                                                            : "bg-primary text-white"
                                                                    )}>
                                                                        {shipping.parcelSizeCategory === 'OVERSIZED' ? '⚠️ Oversized' : `Size: ${shipping.parcelSizeCategory}`}
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {shipping.isFetchingLockers ? (
                                                                <div className="flex items-center justify-center p-8 bg-white/60 rounded-xl border-2 border-dashed border-[#006B3E]/30">
                                                                    <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
                                                                    <p className="ml-3 font-semibold text-[#5D4E37]">Fetching PUDO lockers...</p>
                                                                </div>
                                                            ) : shipping.pudoLockers.length > 0 ? (
                                                                <Button 
                                                                    className="w-full h-auto py-4 bg-[#006B3E] hover:bg-[#005030] text-white font-black text-left justify-start"
                                                                    onClick={() => setIsLockerModalOpen(true)}
                                                                >
                                                                    {selectedDestinationLocker ? (
                                                                        <div className="text-left">
                                                                            <p className="font-semibold">{selectedDestinationLocker.name}</p>
                                                                            <p className="text-sm text-green-100">{selectedDestinationLocker.address}</p>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="flex items-center gap-2">
                                                                            <Search className="h-5 w-5" />
                                                                            Select destination locker near buyer
                                                                        </span>
                                                                    )}
                                                                </Button>
                                                            ) : null}

                                                            {!selectedDestinationLocker && shipping.pudoLockers.length > 0 && (
                                                                <p className="text-xs text-primary font-semibold">
                                                                    ⬆️ Please select a destination locker to see shipping rates
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Locker Search Modal */}
                                                    <Dialog open={isLockerModalOpen} onOpenChange={setIsLockerModalOpen}>
                                                        <DialogContent className="max-w-[95vw] sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-green-50 dark:from-gray-900 dark:via-amber-950 dark:to-green-950">
                                                            <DialogHeader className="pb-4 border-b-2 border-[#006B3E]/30">
                                                                <DialogTitle className="text-2xl font-black text-[#3D2E17] flex items-center gap-2">
                                                                    <MapPin className="h-6 w-6 text-[#006B3E]" />
                                                                    Select Destination Locker
                                                                </DialogTitle>
                                                                <DialogDescription className="text-base font-semibold text-[#5D4E37]">
                                                                    Showing lockers near {buyerDispensary?.city || 'buyer location'}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="relative mt-4">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#006B3E]" />
                                                                <Input 
                                                                    placeholder="Search by name or address..."
                                                                    className="pl-10 border-2 border-[#006B3E]/30 focus:border-[#006B3E] font-semibold"
                                                                    value={lockerSearchTerm}
                                                                    onChange={(e) => setLockerSearchTerm(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="mt-4 flex-1 overflow-y-auto space-y-3 p-2 pr-3">
                                                                {shipping.pudoLockers
                                                                    .filter(locker => 
                                                                        locker.name.toLowerCase().includes(lockerSearchTerm.toLowerCase()) ||
                                                                        (locker.address && locker.address.toLowerCase().includes(lockerSearchTerm.toLowerCase()))
                                                                    )
                                                                    .map(locker => {
                                                                        const isSelected = selectedDestinationLocker?.id === locker.id;
                                                                        return (
                                                                            <button
                                                                                key={locker.id}
                                                                                onClick={async () => {
                                                                                    setSelectedDestinationLocker(locker);
                                                                                    setIsLockerModalOpen(false);
                                                                                    
                                                                                    // Fetch PUDO rates with selected locker
                                                                                    if (selectedShippingTier && buyerDispensary && sellerDispensary && request.requestedTier) {
                                                                                        const buyerAddress = {
                                                                                            streetAddress: buyerDispensary.address || buyerDispensary.streetAddress || '',
                                                                                            suburb: buyerDispensary.suburb || '',
                                                                                            city: buyerDispensary.city || '',
                                                                                            province: buyerDispensary.province || '',
                                                                                            postalCode: buyerDispensary.postalCode || '',
                                                                                            country: buyerDispensary.country || 'South Africa',
                                                                                            latitude: buyerDispensary.latitude,
                                                                                            longitude: buyerDispensary.longitude,
                                                                                        };
                                                                                        
                                                                                        const shippingConfig = {
                                                                                            items: [{
                                                                                                productId: request.productId,
                                                                                                name: request.productName,
                                                                                                quantity: request.quantityRequested,
                                                                                                weight: request.requestedTier.weightKgs || 0.5,
                                                                                                lengthCm: request.requestedTier.lengthCm,
                                                                                                widthCm: request.requestedTier.widthCm,
                                                                                                heightCm: request.requestedTier.heightCm,
                                                                                            }],
                                                                                            sellerDispensary,
                                                                                            buyerDispensary,
                                                                                        };
                                                                                        
                                                                                        await shipping.fetchPudoRates(
                                                                                            shippingConfig, 
                                                                                            selectedShippingTier as any, 
                                                                                            buyerAddress,
                                                                                            locker
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full rounded-xl p-4 text-left transition-all duration-200 border-2",
                                                                                    isSelected 
                                                                                        ? "bg-[#006B3E] border-[#006B3E] shadow-xl scale-[1.02] ring-4 ring-[#006B3E]/30" 
                                                                                        : "bg-white/80 dark:bg-gray-800/50 border-[#006B3E]/20 hover:border-[#006B3E] hover:bg-gradient-to-br hover:from-white hover:to-green-50 dark:hover:from-gray-800 dark:hover:to-green-950/30 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                                                                                )}
                                                                            >
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <MapPin className={cn(
                                                                                                "h-5 w-5 flex-shrink-0",
                                                                                                isSelected ? "text-white" : "text-[#006B3E]"
                                                                                            )} />
                                                                                            <p className={cn(
                                                                                                "font-black text-base truncate",
                                                                                                isSelected ? "text-white" : "text-[#3D2E17]"
                                                                                            )}>{locker.name}</p>
                                                                                        </div>
                                                                                        <p className={cn(
                                                                                            "text-sm font-semibold line-clamp-2 ml-7",
                                                                                            isSelected ? "text-green-100" : "text-muted-foreground"
                                                                                        )}>{locker.address}</p>
                                                                                    </div>
                                                                                    {isSelected && (
                                                                                        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                                                                                            <CheckCircle className="h-5 w-5 text-white" />
                                                                                            <span className="text-sm font-black text-white uppercase tracking-wide">Selected</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>

                                                    {/* Shipping Rates Display */}
                                                    {shipping.isLoading && (
                                                        <div className="flex items-center justify-center p-8 bg-white/60 rounded-xl border-2 border-dashed border-[#006B3E]/30">
                                                            <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
                                                            <p className="ml-3 font-semibold text-[#5D4E37]">Calculating shipping rates...</p>
                                                        </div>
                                                    )}

                                                    {shipping.error && (
                                                        <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-xl">
                                                            <p className="text-destructive font-semibold">{shipping.error}</p>
                                                        </div>
                                                    )}

                                                    {shipping.rates.length > 0 && !shipping.isLoading && (
                                                        <div className="space-y-3">
                                                            <p className="font-extrabold text-[#3D2E17] text-lg flex items-center gap-2">
                                                                <Package className="h-6 w-6 text-[#006B3E]" />
                                                                3. Confirm Shipping Rate
                                                            </p>
                                                            <RadioGroup 
                                                                value={selectedShipping?.id.toString() || ''} 
                                                                onValueChange={(value) => {
                                                                    const rate = shipping.rates.find(r => r.id.toString() === value);
                                                                    if (rate) {
                                                                        // Add locker data to rate
                                                                        const rateWithLockers: ShippingRate = {
                                                                            ...rate,
                                                                            originLocker: sellerDispensary?.originLocker || undefined,
                                                                            destinationLocker: selectedDestinationLocker || undefined
                                                                        };
                                                                        setSelectedShipping(rateWithLockers);
                                                                    }
                                                                }}
                                                                className="space-y-3"
                                                            >
                                                                {shipping.rates.map(rate => {
                                                                    const isSelected = selectedShipping?.id.toString() === rate.id.toString();
                                                                    return (
                                                                        <Label
                                                                            key={rate.id}
                                                                            className={cn(
                                                                                "flex justify-between items-center rounded-xl p-5 border-2 cursor-pointer transition-all relative",
                                                                                isSelected
                                                                                    ? "bg-[#006B3E] border-[#006B3E] shadow-xl ring-2 ring-[#006B3E]/30"
                                                                                    : "bg-white/80 dark:bg-gray-800/50 border-[#006B3E]/20 hover:border-[#006B3E] hover:shadow-lg"
                                                                            )}
                                                                        >
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 mb-1">
                                                                                    <Truck className={cn(
                                                                                        "h-5 w-5",
                                                                                        isSelected ? "text-white" : "text-[#006B3E]"
                                                                                    )} />
                                                                                    <p className={cn(
                                                                                        "font-black text-base",
                                                                                        isSelected ? "text-white" : "text-[#3D2E17]"
                                                                                    )}>{rate.courier_name}</p>
                                                                                </div>
                                                                                <p className={cn(
                                                                                    "text-sm font-semibold ml-7",
                                                                                    isSelected ? "text-green-100" : "text-[#5D4E37]"
                                                                                )}>{rate.name}</p>
                                                                                <p className={cn(
                                                                                    "text-sm font-bold mt-1 ml-7",
                                                                                    isSelected ? "text-green-50" : "text-[#006B3E]"
                                                                                )}>⏱️ Est. Delivery: {rate.delivery_time || rate.estimatedDays}</p>
                                                                            </div>
                                                                            <div className="flex-shrink-0 ml-4">
                                                                                <div className={cn(
                                                                                    "px-4 py-2 rounded-lg",
                                                                                    isSelected ? "bg-white/20 backdrop-blur-sm" : "bg-[#006B3E]/10"
                                                                                )}>
                                                                                    <p className={cn(
                                                                                        "text-2xl font-black",
                                                                                        isSelected ? "text-white" : "text-[#006B3E]"
                                                                                    )}>R{(rate.price || rate.rate).toFixed(2)}</p>
                                                                                </div>
                                                                            </div>
                                                                            <RadioGroupItem value={rate.id.toString()} className="sr-only" />
                                                                            {isSelected && (
                                                                                <div className="absolute top-3 right-3">
                                                                                    <CheckCircle className="h-6 w-6 text-white" />
                                                                                </div>
                                                                            )}
                                                                        </Label>
                                                                    );
                                                                })}
                                                            </RadioGroup>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <Button 
                                                className="bg-gradient-to-r from-[#006B3E] to-[#008B4E] hover:from-[#005030] hover:to-[#006B3E] text-white font-black text-lg h-14 shadow-xl col-span-full" 
                                                onClick={handleOwnerFinalAccept} 
                                                disabled={isSubmitting || (showShippingSelection && !selectedShipping)}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                        Creating Order...
                                                    </>
                                                ) : showShippingSelection ? (
                                                    <>
                                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                                        Confirm & Create Order with 5% Commission
                                                    </>
                                                ) : (
                                                    <>
                                                        <ThumbsUp className="mr-2 h-4 w-4" />
                                                        Finalize & Create Order
                                                    </>
                                                )}
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
