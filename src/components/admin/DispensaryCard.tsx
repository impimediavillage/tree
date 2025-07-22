
'use client';

import type { Dispensary } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Building, Mail, MapPin, Tag, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface DispensaryCardProps {
  dispensary: Dispensary;
  onEdit: () => void;
  onStatusUpdate: (wellnessId: string, newStatus: Dispensary['status']) => Promise<void>;
  onDelete: (wellnessId: string, wellnessName: string) => Promise<void>;
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

const statusOptions: Dispensary['status'][] = ['Approved', 'Suspended', 'Pending Approval', 'Rejected'];

export function DispensaryCard({ dispensary: wellness, onEdit, onStatusUpdate, onDelete }: DispensaryCardProps) {
  const StatusIcon = getStatusProps(wellness.status).VFC;
  const statusBadgeClass = getStatusProps(wellness.status).badgeClass;

  const formatDate = (dateInput: any): string => {
    if (!dateInput) return 'N/A';
    try {
      const date = (dateInput as any)?.toDate ? (dateInput as any).toDate() : new Date(dateInput);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <Card 
      className="w-full flex-shrink-0 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card text-card-foreground animate-fade-in-scale-up"
      style={{ animationFillMode: 'backwards' }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-semibold text-primary flex items-center gap-2">
            <Building className="h-6 w-6" />
            <span className="truncate" title={wellness.dispensaryName}>{wellness.dispensaryName}</span>
          </CardTitle>
          <Badge className={statusBadgeClass}>
            <StatusIcon className="mr-1.5 h-4 w-4" />
            {wellness.status}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          ID: {wellness.id?.substring(0, 10)}...
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2.5 text-sm">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={wellness.ownerEmail}>{wellness.ownerEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={wellness.dispensaryType}>{wellness.dispensaryType}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={wellness.location}>{wellness.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span>Applied: {formatDate(wellness.applicationDate)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t pt-4 mt-auto">
        <div className="flex items-center justify-between w-full">
            <span className="text-sm font-medium">Status:</span>
            <Select value={wellness.status} onValueChange={(newStatus) => onStatusUpdate(wellness.id!, newStatus as Dispensary['status'])}>
                <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Change status..." />
                </SelectTrigger>
                <SelectContent>
                    {statusOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="w-full" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" /> Edit Details
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
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
        </div>
      </CardFooter>
    </Card>
  );
}
