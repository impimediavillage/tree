
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Users, Settings, Store, ShoppingBasket, ListOrdered, BarChart3, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Dispensary, Product, ProductRequest } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function DispensaryAdminOverviewPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingRequests: 0, // Incoming requests needing approval
    activePoolItems: 0, // Products currently shared in the pool
  });
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading || !currentUser || !currentUser.dispensaryId) {
      if (!authLoading && !currentUser) setIsLoadingData(false); // Not logged in, stop loading
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch wellness store details
        const dispensaryDocRef = doc(db, 'dispensaries', currentUser.dispensaryId!);
        const dispensarySnap = await getDoc(dispensaryDocRef);
        if (dispensarySnap.exists()) {
          setDispensary({ id: dispensarySnap.id, ...dispensarySnap.data() } as Dispensary);
        } else {
          console.error("Wellness store data not found for current user.");
          setIsLoadingData(false);
          return;
        }

        // Fetch product count
        const productsQuery = query(collection(db, "products"), where("dispensaryId", "==", currentUser.dispensaryId));
        const productsSnapshot = await getDocs(productsQuery);
        const activePoolItemsCount = productsSnapshot.docs.filter(doc => (doc.data() as Product).isAvailableForPool).length;
        
        // Fetch pending product requests (incoming)
        const requestsQuery = query(
          collection(db, "productRequests"),
          where("productOwnerDispensaryId", "==", currentUser.dispensaryId),
          where("requestStatus", "==", "pending_owner_approval")
        );
        const requestsSnapshot = await getDocs(requestsQuery);

        setStats({
          totalProducts: productsSnapshot.size,
          pendingRequests: requestsSnapshot.size,
          activePoolItems: activePoolItemsCount,
        });
      } catch (error) {
        console.error("Error fetching wellness store dashboard data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [currentUser, authLoading]);

  if (authLoading) {
    return <div className="p-4"><Skeleton className="h-12 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }
  
  if (!currentUser) {
    return <div className="p-4 text-center text-destructive">You are not logged in. Please log in to access your dashboard.</div>;
  }
  if (currentUser.role !== 'DispensaryOwner') {
      return <div className="p-4 text-center text-destructive">Access Denied. This dashboard is for Wellness Store Owners only.</div>;
  }
  if (isLoadingData && !dispensary) { // Show loading if wellness store data isn't available yet, but user is owner
     return <div className="p-4"><Skeleton className="h-12 w-1/2 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }
   if (!dispensary && !isLoadingData) { // Finished loading but no wellness store data
    return <div className="p-4 text-center text-destructive">Could not load wellness store data. Please contact support.</div>;
  }


  return (
    <div className="space-y-8">
      <Card className="shadow-lg bg-card border-primary/30">
        <CardHeader>
          <CardTitle 
            className="text-3xl font-bold text-foreground flex items-center"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <Store className="mr-3 h-8 w-8 text-primary" /> {dispensary?.dispensaryName || "Your Wellness Store"}
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
          value={stats.totalProducts} 
          icon={Package} 
          description="Products currently listed by your wellness store."
          link="/dispensary-admin/products"
          linkText="Manage Products"
          isLoading={isLoadingData}
        />
        <StatCard 
          title="Pending Requests" 
          value={stats.pendingRequests} 
          icon={ListOrdered} 
          description="Incoming product requests needing your approval."
          link="/dispensary-admin/pool?tab=incoming-requests"
          linkText="View Requests"
          isLoading={isLoadingData}
        />
        <StatCard 
          title="Active in Pool" 
          value={stats.activePoolItems}
          icon={ShoppingBasket}
          description="Products you've made available to the sharing pool."
          link="/dispensary-admin/products?filter=pool" // Example filter
          linkText="Manage Pool Items"
          isLoading={isLoadingData}
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
            title="Wellness Store Profile"
            description="Update your wellness store's details, operating hours, and contact information."
            icon={Store}
            link="/dispensary-admin/profile"
            buttonText="Edit Profile"
        />
         <QuickActionCard
            title="Sales & Analytics"
            description="View sales reports, track product performance, and gain insights. (Coming Soon)"
            icon={BarChart3}
            link="#"
            buttonText="View Analytics"
            disabled
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
