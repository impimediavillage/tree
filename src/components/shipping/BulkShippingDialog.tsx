'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useBulkShipping } from '@/hooks/use-bulk-shipping';
import { Loader2 } from 'lucide-react';
import type { Order } from '@/types/order';

interface BulkShippingDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  orders: Order[];
  dispensaryId: string;
}

export function BulkShippingDialog({
  open,
  onClose,
  onComplete,
  orders,
  dispensaryId,
}: BulkShippingDialogProps) {
  const { generateLabels, isProcessing, progress } = useBulkShipping({
    onSuccess: () => {
      onComplete();
      onClose();
    },
  });

  React.useEffect(() => {
    if (open && orders.length > 0) {
      generateLabels(orders, dispensaryId);
    }
  }, [open, orders, dispensaryId, generateLabels]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generating Shipping Labels</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          {isProcessing ? (
            <div className="space-y-4">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processing {orders.length} orders...
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}