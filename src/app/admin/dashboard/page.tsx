
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building, ListChecks, CreditCard, ShieldAlert, Bell, Settings, Package, Loader2, Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, CollectionReference, DocumentData } from 'firebase/firestore';
import type { Dispensary } from '@/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  link?: string;
  linkText?: string;
  isLoading: boolean;
  badgeCount?: number;
  badgeColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, link, linkText, isLoading, badgeCount, badgeColor }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow relative overflow-hidden">
    {badgeCount && badgeCount > 0 && (
        <div 
            className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${badgeColor || 'bg-destructive'}`}
            title={`${badgeCount} pending`}
        >
            {badgeCount}
        </div>
    )}
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <div className="text-2xl font-bold">Loading...</div>
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
      {link && linkText && (
        <Button variant="link" asChild className="px-0 pt-2 text-primary">
          <Link href={link}>{linkText}</Link>
        </Button>
      )}
    </CardContent>
  </Card>
);


export default function AdminDashboardOverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDispensaries: 0,
    pendingDispensaries: 0,
    activeProducts: 0, 
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        const dispensariesCollection = collection(db, "dispensaries") as CollectionReference<Dispensary, DocumentData>;
        const dispensariesSnapshot = await getDocs(dispensariesCollection);
        
        const pendingDispensariesQuery = query(dispensariesCollection, where("status", "==", "Pending Approval"));
        const pendingDispensariesSnapshot = await getDocs(pendingDispensariesQuery);
        
        const productsSnapshot = await getDocs(collection(db, "products")); 

        setStats({
          totalUsers: usersSnapshot.size,
          totalDispensaries: dispensariesSnapshot.size,
          pendingDispensaries: pendingDispensariesSnapshot.size,
          activeProducts: productsSnapshot.size,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg bg-card border-primary/30">
        <CardHeader>
          <CardTitle 
            className="text-3xl font-bold text-foreground flex items-center"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            <Settings className="mr-3 h-8 w-8 text-primary" /> Super Admin Dashboard
          </CardTitle>
          <CardDescription 
            className="text-md text-foreground"
            style={{ textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #fff' }}
          >
            Welcome to the control center. Oversee and manage all aspects of The Dispensary Tree platform.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={Users} 
          description="All registered users on the platform."
          link="/admin/dashboard/users"
          linkText="Manage Users"
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="Total Dispensaries" 
          value={stats.totalDispensaries} 
          icon={Building} 
          description="All registered dispensaries."
          link="/admin/dashboard/dispensaries"
          linkText="Manage Dispensaries"
          isLoading={isLoadingStats}
          badgeCount={stats.pendingDispensaries}
          badgeColor="bg-yellow-500"
        />
         <StatCard 
          title="Pending Applications" 
          value={stats.pendingDispensaries} 
          icon={Hourglass} 
          description="New dispensaries awaiting review."
          link="/admin/dashboard/dispensaries?status=Pending+Approval" // URL encode space
          linkText="Review Applications"
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="Listed Products" 
          value={stats.activeProducts}
          icon={Package}
          description="Total products across all dispensaries."
          link="/admin/dashboard/product-pool"
          linkText="View Product Pool"
          isLoading={isLoadingStats}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="text-accent h-6 w-6" /> Manage Dispensaries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Approve, view, edit, or suspend dispensary accounts.</p>
            <Button asChild className="w-full bg-primary text-primary-foreground">
              <Link href="/admin/dashboard/dispensaries">Go to Dispensaries</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="text-accent h-6 w-6" /> Manage Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">View user details, manage roles, and oversee user activity.</p>
            <Button asChild className="w-full bg-primary text-primary-foreground">
              <Link href="/admin/dashboard/users">Go to Users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-accent h-6 w-6" /> Dispensary Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Create and manage the types of dispensaries available.</p>
            <Button asChild className="w-full bg-primary text-primary-foreground">
              <Link href="/admin/dashboard/dispensary-types">Manage Types</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="text-accent h-6 w-6" /> Credit System</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Configure credit packages and monitor transactions.</p>
            <Button asChild className="w-full bg-primary text-primary-foreground">
              <Link href="/admin/dashboard/credits">Credit Admin</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-accent h-6 w-6" /> Pool Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Review and resolve reported issues in the product sharing pool.</p>
            <Button asChild className="w-full bg-primary text-primary-foreground">
              <Link href="/admin/dashboard/pool-issues">View Issues</Link>
            </Button>
          </CardContent>
        </Card>
         <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="text-accent h-6 w-6" /> Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Manage and send platform-wide notifications.</p>
            <Button asChild className="w-full bg-primary text-primary-foreground">
              <Link href="/admin/dashboard/notifications">Manage Notifications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
