'use client';

import * as React from 'react';
import type { ProductRequest } from '@/types';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Truck, PackageCheck, Calendar, Inbox, Send } from 'lucide-react';
import { ManageShippingDialog } from './ManageShippingDialog';

interface ProductPoolOrderCardProps {
  order: ProductRequest;
  type: 'incoming' | 'outgoing';
}

export const ProductPoolOrderCard: React.FC<ProductPoolOrderCardProps> = ({ order, type }) => {
    const [isShippingDialogOpen, setIsShippingDialogOpen] = React.useState(false);

    return (
        <>
            <Card className="flex flex-col shadow-md hover:shadow-lg transition-shadow bg-card">
                <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg font-semibold truncate" title={order.productName}>{order.productName}</CardTitle>
                        {order.productImage && (
                            <div className="relative h-14 w-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <Image src={order.productImage} alt={order.productName} layout="fill" objectFit="cover" />
                            </div>
                        )}
                    </div>
                    <Badge className="self-start bg-green-100 text-green-800 border-green-300">
                        <PackageCheck className="h-3 w-3 mr-1.5" /> Ordered
                    </Badge>
                </CardHeader>
                <CardContent className="flex-grow text-sm space-y-2">
                     <div className="flex items-center gap-2 text-muted-foreground">
                        {type === 'incoming' ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        <span>{type === 'incoming' ? `Sold To: ${order.requesterDispensaryName}` : `Purchased From: ${order.productDetails?.dispensaryName}`}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4"/>
                        <span>Ordered on: {order.orderDate ? format((order.orderDate as any).toDate(), 'PP') : 'N/A'}</span>
                    </div>
                    {order.actualDeliveryDate && (
                      <div className="flex items-center gap-2 text-orange-600 font-semibold text-xs p-2 bg-orange-50 rounded-md border border-orange-200">
                          <Truck className="h-4 w-4"/>
                          <span>Seller delivery by date: {format(new Date(order.actualDeliveryDate), 'PP')}</span>
                      </div>
                    )}
                    <div className="pt-2 grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Quantity</span>
                            <span className="font-semibold">{order.quantityRequested} x {order.requestedTier?.unit || 'unit'}</span>
                        </div>
                         <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Total Value</span>
                            <span className="font-semibold text-green-600 flex items-center gap-1">
                                {(order.quantityRequested * (order.requestedTier?.price || 0)).toFixed(2)}
                                <span className="text-xs text-muted-foreground ml-1">{order.productDetails?.currency}</span>
                            </span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setIsShippingDialogOpen(true)}>
                        <Truck className="mr-2 h-4 w-4" /> Manage Shipping
                    </Button>
                </CardFooter>
            </Card>
            <ManageShippingDialog
                isOpen={isShippingDialogOpen}
                onOpenChange={setIsShippingDialogOpen}
                order={order}
            />
        </>
    );
};
