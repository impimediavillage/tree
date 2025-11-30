
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Store, ShoppingBasket, BarChart3, Users, CreditCard, PackageCheck, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    link: string;
    buttonText: string;
    disabled?: boolean;
    variant?: 'green' | 'brown';
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon: Icon, link, buttonText, disabled, variant = 'green' }) => (
    <Card className="hover:shadow-lg transition-shadow bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl font-black text-[#3D2E17]">
          <Icon className="text-[#006B3E] h-10 w-10" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[#3D2E17] font-bold mb-4">{description}</p>
        <Button 
          asChild 
          className={`w-full transition-all duration-200 ${
            variant === 'green' 
              ? 'bg-[#006B3E] hover:bg-[#3D2E17] active:scale-95 text-white' 
              : 'bg-[#3D2E17] hover:bg-[#006B3E] active:scale-95 text-white'
          }`}
          disabled={disabled}
        >
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
      <Card className="shadow-lg bg-muted/50 border-primary/30">
        <CardHeader>
          <CardTitle className="text-3xl font-black text-[#3D2E17] flex items-center">
            <Store className="mr-3 h-10 w-10 text-[#006B3E]" /> {currentDispensary?.dispensaryName || "Your Wellness Profile"}
          </CardTitle>
          <CardDescription className="text-md text-[#3D2E17] font-bold">
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
            variant="green"
        />
        <QuickActionCard
            title="Product Sharing Pool"
            description="View and manage incoming/outgoing product requests and report issues."
            icon={ShoppingBasket}
            link="/dispensary-admin/pool"
            buttonText="Go to Pool"
            variant="brown"
        />
        <QuickActionCard
            title="Orders"
            description="Manage customer orders, shipping labels, and order tracking."
            icon={Receipt}
            link="/dispensary-admin/orders"
            buttonText="View Orders"
            variant="green"
        />
        <QuickActionCard
            title="Pool Orders"
            description="View and manage all finalized product pool orders and shipping."
            icon={PackageCheck}
            link="/dispensary-admin/product-pool-orders"
            buttonText="View Pool Orders"
            variant="brown"
        />
        <QuickActionCard
            title="Wellness Profile"
            description="Update your wellness details, operating hours, and contact information."
            icon={Store}
            link="/dispensary-admin/profile"
            buttonText="Edit Profile"
            variant="green"
        />
         <QuickActionCard
            title="Sales & Analytics"
            description="View sales reports, track product performance, and gain insights."
            icon={BarChart3}
            link="/dispensary-admin/analytics"
            buttonText="View Analytics"
            variant="brown"
        />
        <QuickActionCard
            title="Manage Staff"
            description="Add or edit staff members for your store."
            icon={Users}
            link="/dispensary-admin/users"
            buttonText="Manage Users"
            variant="green"
        />
         <QuickActionCard
            title="Credit Analytics"
            description="View your store's credit usage and history across all services."
            icon={CreditCard}
            link="/dispensary-admin/credits"
            buttonText="View Credit Usage"
            variant="brown"
        />
      </div>
    </div>
  );
}