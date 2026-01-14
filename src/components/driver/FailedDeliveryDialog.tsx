'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Camera, DollarSign, XCircle } from 'lucide-react';
import { markDeliveryAsFailed } from '@/lib/driver-service';
import { useToast } from '@/hooks/use-toast';
import type { DeliveryFailureReason } from '@/types/driver';
import { getFailureReasonLabel, shouldPayDriverOnFailure } from '@/types/driver';

interface FailedDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId: string;
  driverId: string;
  driverEarnings: number;
  onSuccess: () => void;
}

const failureReasons: DeliveryFailureReason[] = [
  'customer_no_show',
  'customer_not_home',
  'customer_refused',
  'customer_wrong_address',
  'unsafe_location',
  'cannot_find_address',
  'access_denied',
  'location_inaccessible',
  'driver_vehicle_issue',
  'driver_emergency',
  'driver_error',
  'system_error',
  'other',
];

export function FailedDeliveryDialog({
  open,
  onOpenChange,
  deliveryId,
  driverId,
  driverEarnings,
  onSuccess,
}: FailedDeliveryDialogProps) {
  const { toast } = useToast();
  const [failureReason, setFailureReason] = useState<DeliveryFailureReason | ''>('');
  const [failureNote, setFailureNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const willGetPaid = failureReason ? shouldPayDriverOnFailure(failureReason as DeliveryFailureReason) : null;

  const handleSubmit = async () => {
    if (!failureReason) {
      toast({
        title: 'Error',
        description: 'Please select a failure reason',
        variant: 'destructive',
      });
      return;
    }

    if (!failureNote.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a detailed explanation',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await markDeliveryAsFailed(
        deliveryId,
        driverId,
        failureReason,
        failureNote,
        [] // Photo URLs - will implement photo upload separately
      );

      if (result.success) {
        toast({
          title: '✅ Delivery Marked as Failed',
          description: result.message,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update delivery',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonCategory = (reason: DeliveryFailureReason): string => {
    if (['customer_no_show', 'customer_not_home', 'customer_refused', 'customer_wrong_address', 'unsafe_location'].includes(reason)) {
      return 'Customer Issue';
    }
    if (['cannot_find_address', 'access_denied', 'location_inaccessible'].includes(reason)) {
      return 'Location Issue';
    }
    if (['driver_vehicle_issue', 'driver_emergency', 'driver_error'].includes(reason)) {
      return 'Driver Issue';
    }
    if (['system_error', 'other'].includes(reason)) {
      return 'Other';
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Mark Delivery as Failed
          </DialogTitle>
          <DialogDescription>
            Please provide details about why this delivery couldn't be completed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Failure Reason Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="failureReason" className="text-sm font-bold">
              Failure Reason <span className="text-red-500">*</span>
            </Label>
            <Select
              value={failureReason}
              onValueChange={(value) => setFailureReason(value as DeliveryFailureReason)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {/* Group by category */}
                <div className="px-2 py-1.5 text-xs font-semibold text-green-600">
                  Customer Issues (You get paid ✅)
                </div>
                {failureReasons
                  .filter((r) => getReasonCategory(r) === 'Customer Issue')
                  .map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {getFailureReasonLabel(reason)}
                    </SelectItem>
                  ))}

                <div className="px-2 py-1.5 text-xs font-semibold text-green-600 mt-2">
                  Location Issues (You get paid ✅)
                </div>
                {failureReasons
                  .filter((r) => getReasonCategory(r) === 'Location Issue')
                  .map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {getFailureReasonLabel(reason)}
                    </SelectItem>
                  ))}

                <div className="px-2 py-1.5 text-xs font-semibold text-red-600 mt-2">
                  Driver Issues (No payment ❌)
                </div>
                {failureReasons
                  .filter((r) => getReasonCategory(r) === 'Driver Issue')
                  .map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {getFailureReasonLabel(reason)}
                    </SelectItem>
                  ))}

                <div className="px-2 py-1.5 text-xs font-semibold text-green-600 mt-2">
                  System Issues (You get paid ✅)
                </div>
                {failureReasons
                  .filter((r) => getReasonCategory(r) === 'Other')
                  .map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {getFailureReasonLabel(reason)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Status Preview */}
          {willGetPaid !== null && (
            <div
              className={`p-3 rounded-lg border-2 ${
                willGetPaid
                  ? 'bg-green-50 border-green-300 dark:bg-green-950/20 dark:border-green-800'
                  : 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {willGetPaid ? (
                  <>
                    <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-green-900 dark:text-green-100">
                        You will still be paid R{driverEarnings.toFixed(2)}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        This issue was not your fault
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-900 dark:text-red-100">
                        Payment will not be processed
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Driver-side issue
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Detailed Explanation */}
          <div className="space-y-2">
            <Label htmlFor="failureNote" className="text-sm font-bold">
              Detailed Explanation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="failureNote"
              placeholder="Provide details about what happened... (e.g., waited 15 minutes, called 3 times, no answer)"
              value={failureNote}
              onChange={(e) => setFailureNote(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Be specific - this helps resolve issues with customers and improves your record
            </p>
          </div>

          {/* Photo Upload Placeholder */}
          <div className="p-4 border-2 border-dashed rounded-lg text-center bg-muted/20">
            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">Photo Evidence</p>
            <p className="text-xs text-muted-foreground mt-1">
              Photo upload coming soon
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !failureReason || !failureNote.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Mark as Failed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
