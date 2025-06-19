
'use client';

import type { User, Dispensary } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, UserCircle, CheckCircle, XCircle, AlertTriangle, Edit, Briefcase, Shield, Leaf, DollarSign } from 'lucide-react';

interface UserCardProps {
  user: User;
  dispensaryName?: string; 
  onEdit: (user: User) => void;
}

const getInitials = (name?: string | null) => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const RoleIcon = ({ role }: { role: User['role'] }) => {
  switch (role) {
    case 'Super Admin': return <Shield className="h-4 w-4 text-red-500" />;
    case 'DispensaryOwner': return <Briefcase className="h-4 w-4 text-blue-500" />;
    case 'LeafUser': return <Leaf className="h-4 w-4 text-green-500" />;
    case 'DispensaryStaff': return <UserCircle className="h-4 w-4 text-purple-500" />; 
    default: return <UserCircle className="h-4 w-4 text-gray-500" />;
  }
};

const StatusIndicator = ({ status }: { status: User['status'] }) => {
  switch (status) {
    case 'Active': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Suspended': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'PendingApproval': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default: return <UserCircle className="h-4 w-4 text-gray-400" />;
  }
};

export function UserCard({ user, dispensaryName, onEdit }: UserCardProps) {
  return (
    <Card 
      className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col animate-fade-in-scale-up bg-card text-card-foreground"
      style={{ animationFillMode: 'backwards' }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Avatar className="h-16 w-16 border-2 border-primary/50">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email} />
            <AvatarFallback className="bg-muted text-lg text-muted-foreground">
              {getInitials(user.displayName)}
            </AvatarFallback>
          </Avatar>
           <Badge 
            variant={
              user.role === 'Super Admin' ? 'destructive' :
              user.role === 'DispensaryOwner' ? 'default' :
              user.role === 'LeafUser' ? 'secondary' :
              user.role === 'DispensaryStaff' ? 'outline' : 
              'outline'
            }
            className="capitalize py-1 px-2.5 text-xs"
          >
            <RoleIcon role={user.role} /> <span className="ml-1.5">{user.role === 'DispensaryStaff' ? 'Wellness Staff' : user.role === 'DispensaryOwner' ? 'Wellness Owner' : user.role}</span>
          </Badge>
        </div>
        <CardTitle className="text-xl mt-3 truncate font-semibold">{user.displayName || 'Unnamed User'}</CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
          <Mail className="h-4 w-4 flex-shrink-0" />
          {user.email}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status:</span>
          <div className="flex items-center gap-1.5">
            <StatusIndicator status={user.status || 'Active'} />
            <span className="font-medium">{user.status || 'Active'}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Credits:</span>
          <div className="flex items-center gap-1.5 text-green-600 font-semibold">
            <DollarSign className="h-4 w-4" />
            <span>{user.credits?.toLocaleString() || '0'}</span>
          </div>
        </div>
        {user.role === 'DispensaryOwner' && user.dispensaryId && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Wellness:</span>
            <span className="font-medium truncate max-w-[150px]" title={dispensaryName || user.dispensaryId}>
              {dispensaryName || user.dispensaryId.substring(0, 10) + '...'}
            </span>
          </div>
        )}
        {user.createdAt && (
           <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5">
            <span>Joined:</span>
            <span>
              {new Date(
                typeof user.createdAt === 'string' ? user.createdAt :
                (user.createdAt as any)?.toDate ? (user.createdAt as any).toDate() : Date.now()
              ).toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto border-t pt-4"> 
        <Button variant="outline" className="w-full" onClick={() => onEdit(user)}>
          <Edit className="mr-2 h-4 w-4" /> Edit User
        </Button>
      </CardFooter>
    </Card>
  );
}

