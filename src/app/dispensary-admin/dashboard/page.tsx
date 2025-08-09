
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Users, Settings, Store, ShoppingBasket, ListOrdered, BarChart3, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Product, ProductRequest } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  link?: string;
  linkText?: string;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, link, linkText, isLoading }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-card-foreground">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <Skeleton className="h-7 w-16" />
      ) : (
        <div className="text-2xl font-bold text-primary">{value}</div>
      )}
      {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      {link && linkText && (
        <Button variant="link" asChild className="px-0 pt-2 text-accent">
          <Link href={link}>{linkText}</Link>
        </Button>
      )}
    </CardContent>
  </Card>
);

export default function WellnessAdminOverviewPage() {
  const { currentUser, currentDispensary, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const dispensaryId = currentUser?.dispensaryId;

  const fetchDashboardData = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
        const productsQuery = query(collection(db, "products"), where("dispensaryId", "==", id));
        const incomingRequestsQuery = query(collection(db, "productRequests"), where("productOwnerDispensaryId", "==", id), orderBy("createdAt", "desc"));
        
        const [productsSnapshot, incomingRequestsSnapshot] = await Promise.all([
            getDocs(productsQuery),
            getDocs(incomingRequestsQuery)
        ]);

        setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        setIncomingRequests(incomingRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest)));

    } catch(error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Data Loading Error", description: "Could not load dashboard data.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // This effect now robustly waits for a valid dispensaryId before fetching.
    if (dispensaryId) {
        fetchDashboardData(dispensaryId);
    } else if (!authLoading) {
        // If auth is done and there's still no ID, stop loading.
        setIsLoading(false);
    }
  }, [dispensaryId, authLoading, fetchDashboardData]);


  const { totalProducts, activePoolItems, pendingRequests } = useMemo(() => {
      return {
          totalProducts: products.length,
          activePoolItems: products.filter(p => p.isAvailableForPool).length,
          pendingRequests: incomingRequests.filter(r => r.requestStatus === 'pending_owner_approval').length,
      }
  }, [products, incomingRequests]);

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Total Products" 
          value={totalProducts} 
          icon={Package} 
          description="Products currently listed by your wellness profile."
          link="/dispensary-admin/products"
          linkText="Manage Products"
          isLoading={isLoading}
        />
        <StatCard 
          title="Pending Requests" 
          value={pendingRequests} 
          icon={ListOrdered} 
          description="Incoming product requests needing your approval."
          link="/dispensary-admin/pool?tab=incoming-requests"
          linkText="View Requests"
          isLoading={isLoading}
        />
        <StatCard 
          title="Active in Pool" 
          value={activePoolItems}
          icon={ShoppingBasket}
          description="Products you've made available to the sharing pool."
          link="/dispensary-admin/products?filter=pool" 
          linkText="Manage Pool Items"
          isLoading={isLoading}
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
