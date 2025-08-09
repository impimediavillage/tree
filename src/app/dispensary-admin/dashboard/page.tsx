
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Settings, Store, ShoppingBasket, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';


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
