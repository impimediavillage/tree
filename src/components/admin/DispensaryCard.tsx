
'use client';

import type { Dispensary } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Building, Mail, MapPin, Tag, Clock, CheckCircle, XCircle, AlertTriangle, Package } from 'lucide-react';
import { format } from 'date-fns';

interface DispensaryCardProps {
  dispensary: Dispensary;
  onEdit: () => void;
  onDelete: (wellnessId: string, wellnessName: string) => Promise<void>;
  isSuperAdmin: boolean;
}

const getStatusProps = (status: Dispensary['status']) => {
  switch (status) {
    case 'Approved':
      return { VFC: CheckCircle, color: 'text-green-500', badgeVariant: 'default', badgeClass: 'bg-green-100 text-green-700 border-green-300' } as const;
    case 'Suspended':
      return { VFC: XCircle, color: 'text-red-500', badgeVariant: 'destructive', badgeClass: 'bg-red-100 text-red-700 border-red-300' } as const;
    case 'Pending Approval':
      return { VFC: AlertTriangle, color: 'text-yellow-500', badgeVariant: 'secondary', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300' } as const;
    case 'Rejected':
      return { VFC: XCircle, color: 'text-orange-500', badgeVariant: 'outline', badgeClass: 'bg-orange-100 text-orange-700 border-orange-300' } as const;
    default:
      return { VFC: AlertTriangle, color: 'text-gray-500', badgeVariant: 'outline', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300' } as const;
  }
};

export function DispensaryCard({ dispensary: wellness, onEdit, onDelete, isSuperAdmin }: DispensaryCardProps) {
  const StatusIcon = getStatusProps(wellness.status).VFC;
  const statusBadgeClass = getStatusProps(wellness.status).badgeClass;

  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'N/A';
    try {
      // Handles both Firestore Timestamps (from server) and string dates (from client-side updates)
      const date = (dateInput.toDate && typeof dateInput.toDate === 'function')
        ? dateInput.toDate()
        : new Date(dateInput);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const fullAddress = [
    wellness.streetAddress,
    wellness.suburb,
    wellness.city,
    wellness.province,
    wellness.postalCode,
  ].filter(Boolean).join(', ');

  return (
    <Card
      className="w-full flex-shrink-0 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-muted/50 text-card-foreground animate-fade-in-scale-up"
      style={{ animationFillMode: 'backwards' }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2 mb-2">
          <CardTitle className="text-lg sm:text-xl font-extrabold text-[#3D2E17] flex items-center gap-2 flex-1 min-w-0">
            <Building className="h-5 w-5 sm:h-6 sm:w-6 text-[#006B3E] flex-shrink-0" />
            <span className="truncate" title={wellness.dispensaryName}>{wellness.dispensaryName}</span>
          </CardTitle>
          <Badge className={`${statusBadgeClass} flex-shrink-0 text-xs`}>
            <StatusIcon className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{wellness.status}</span>
            <span className="sm:hidden">{wellness.status.split(' ')[0]}</span>
          </Badge>
        </div>
        <CardDescription className="text-xs text-[#5D4E37] font-semibold">
          ID: {wellness.id?.substring(0, 10)}...
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2.5 text-xs sm:text-sm font-semibold text-[#5D4E37]">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-[#006B3E] flex-shrink-0" />
          <span className="truncate" title={wellness.ownerEmail}>{wellness.ownerEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-[#006B3E] flex-shrink-0" />
          <span className="truncate" title={wellness.dispensaryType}>{wellness.dispensaryType}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-[#006B3E] flex-shrink-0 mt-0.5" />
          <span className="truncate" title={fullAddress}>{fullAddress || 'No address specified'}</span>
        </div>
        {wellness.originLocker && (
          <div className="flex items-start gap-2 text-purple-600">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 mt-0.5" />
            <span className="truncate font-bold text-xs sm:text-sm" title={`${wellness.originLocker.name} (${wellness.originLocker.address})`}>
              Origin: {wellness.originLocker.name}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <Clock className="h-5 w-5 text-[#006B3E] flex-shrink-0" />
          <span>Applied: {formatDate(wellness.applicationDate)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t pt-4 mt-auto">
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1 font-bold" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          {isSuperAdmin && (
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1 font-bold">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the wellness profile &quot;{wellness.dispensaryName}&quot; and all its associated data.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(wellness.id!, wellness.dispensaryName)}>
                      Yes, delete wellness profile
                      </AlertDialogAction>
                  </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
