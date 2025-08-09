'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Settings, Store, ShoppingBasket, BarChart3, Users, ListOrdered } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading: boolean;
  link: string;
  linkText: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, isLoading, link, linkText }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-card-foreground">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <Skeleton className="h-7 w-20" />
      ) : (
        <div className="text-2xl font-bold text-primary">{value}</div>
      )}
      {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
       <Button variant="link" asChild className="px-0 pt-2 text-primary">
          <Link href={link}>{linkText}</Link>
        </Button>
    </CardContent>
  </Card>
);

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    link: string;
    buttonText: string;
    disabled?: boolean;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon: Icon, link, buttonText, disabled }) => (
    <Card className="hover:shadow-lg transition-shadow bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-card-foreground">
          <Icon className="text-accent h-6 w-6" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={disabled}>
          <Link href={disabled ? '#' : link}>{buttonText}</Link>
        </Button>
      </CardContent>
    </Card>
);


export default function WellnessAdminOverviewPage() {
  const { currentDispensary, loading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg bg-card border-primary/30">
        <CardHeader>
          <CardTitle 
            className="text-3xl font-bold text-foreground flex items-center"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <Store className="mr-3 h-8 w-8 text-primary" /> {currentDispensary?.dispensaryName || "Your Wellness Profile"}
          </CardTitle>
          <CardDescription 
            className="text-md text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Welcome to your control panel. Manage products, pool interactions, and settings.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Products"
            value={currentDispensary?.productCount ?? 0}
            icon={Package}
            description="Products in your inventory."
            isLoading={authLoading}
            link="/dispensary-admin/products"
            linkText="Manage Products"
          />
          <StatCard
            title="Incoming Requests"
            value={currentDispensary?.incomingRequestCount ?? 0}
            icon={ListOrdered}
            description="From other wellness stores."
            isLoading={authLoading}
            link="/dispensary-admin/pool"
            linkText="View Requests"
          />
           <StatCard
            title="Outgoing Requests"
            value={currentDispensary?.outgoingRequestCount ?? 0}
            icon={ShoppingBasket}
            description="Made to other wellness stores."
            isLoading={authLoading}
            link="/dispensary-admin/pool"
            linkText="View Requests"
          />
           <StatCard
            title="Manage Staff"
            value={"..."}
            icon={Users}
            description="Add or edit staff members."
            isLoading={authLoading}
            link="/dispensary-admin/users"
            linkText="Manage Users"
          />
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionCard
            title="Manage My Products"
            description="Add new products, update existing listings, and manage your inventory."
            icon={Package}
            link="/dispensary-admin/products"
            buttonText="Go to Products"
        />
        <QuickActionCard
            title="Product Sharing Pool"
            description="View and manage incoming/outgoing product requests and report issues."
            icon={ShoppingBasket}
            link="/dispensary-admin/pool"
            buttonText="Go to Pool"
        />
        <QuickActionCard
            title="Wellness Profile"
            description="Update your wellness details, operating hours, and contact information."
            icon={Store}
            link="/dispensary-admin/profile"
            buttonText="Edit Profile"
        />
         <QuickActionCard
            title="Sales & Analytics"
            description="View sales reports, track product performance, and gain insights."
            icon={BarChart3}
            link="/dispensary-admin/analytics"
            buttonText="View Analytics"
        />
      </div>
    </div>
  );
}
