
'use client';

import * as React from 'react';
import type { ProductRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Truck, ClipboardCopy } from 'lucide-react';

interface ManageShippingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductRequest;
}

export function ManageShippingDialog({ isOpen, onOpenChange, order }: ManageShippingDialogProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to Clipboard", description: `${label} has been copied.` });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Manage Shipping
          </DialogTitle>
          <DialogDescription>
            Arrange shipping for order of &quot;{order.productName}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 text-sm">
            <p className="font-semibold text-center p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
                Full shipping provider integration coming soon!
            </p>
            <div className="space-y-1">
                <p className="font-medium">Recipient:</p>
                <div className="p-2 border rounded-md bg-muted/50 flex justify-between items-center">
                    <span>{order.contactPerson} at {order.requesterDispensaryName}</span>
                     <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${order.contactPerson} at ${order.requesterDispensaryName}`, 'Recipient')}>
                        <ClipboardCopy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="space-y-1">
                <p className="font-medium">Delivery Address:</p>
                 <div className="p-2 border rounded-md bg-muted/50 flex justify-between items-center">
                    <p className="flex-grow">{order.deliveryAddress}</p>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(order.deliveryAddress, 'Delivery Address')}>
                        <ClipboardCopy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div className="space-y-1">
                <p className="font-medium">Contact Phone:</p>
                 <div className="p-2 border rounded-md bg-muted/50 flex justify-between items-center">
                    <span>{order.contactPhone}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(order.contactPhone, 'Contact Phone')}>
                        <ClipboardCopy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
        <DialogFooter>
            <p className="text-xs text-muted-foreground w-full text-center">
                Use the details above to manually book a delivery with your preferred provider.
            </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
