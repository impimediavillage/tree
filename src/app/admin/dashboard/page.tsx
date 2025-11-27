
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building, ListChecks, CreditCard, ShieldAlert, Bell, Settings, Package, Loader2, Hourglass, DownloadCloud } from 'lucide-react';
import { useEffect, useState, useCallback, use } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, CollectionReference, DocumentData, doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    link?: string;
    onClick?: () => void;
    buttonText: string;
    disabled?: boolean;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon: Icon, link, onClick, buttonText, disabled }) => {
    const content = link ? (
        <Link href={link}>{buttonText}</Link>
    ) : (
        <button onClick={onClick} className="w-full h-full flex items-center justify-center">{buttonText}</button>
    );

    return (
        <Card className="hover:shadow-lg transition-shadow bg-muted/50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-card-foreground">
            <Icon className="text-accent h-6 w-6" /> {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground mb-4">{description}</p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={disabled}>
                {link ? <Link href={link}>{buttonText}</Link> : <span onClick={onClick}>{buttonText}</span>}
            </Button>
        </CardContent>
        </Card>
    );
};

export default function AdminDashboardOverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWellnessProfiles: 0,
    pendingWellnessApplications: 0,
    activeProducts: 0, 
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
      setIsLoadingStats(true);
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const wellnessCollection = collection(db, "dispensaries");
        const wellnessSnapshot = await getDocs(wellnessCollection);
        const pendingWellnessQuery = query(wellnessCollection, where("status", "==", "Pending Approval"));
        const pendingWellnessSnapshot = await getDocs(pendingWellnessQuery);
        const productsSnapshot = await getDocs(collection(db, "products")); 

        setStats({
          totalUsers: usersSnapshot.size,
          totalWellnessProfiles: wellnessSnapshot.size,
          pendingWellnessApplications: pendingWellnessSnapshot.size,
          activeProducts: productsSnapshot.size,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);


  return (
    <div className="space-y-6">
      <Card className="shadow-lg bg-muted/50 border-primary/30">
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
            Welcome to the control center. Oversee and manage all aspects of The Wellness Tree platform.
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
          title="Total Wellness Profiles" 
          value={stats.totalWellnessProfiles} 
          icon={Building} 
          description="All registered wellness profiles."
          link="/admin/dashboard/dispensaries"
          linkText="Manage Wellness Profiles"
          isLoading={isLoadingStats}
          badgeCount={stats.pendingWellnessApplications}
          badgeColor="bg-yellow-500"
        />
         <StatCard 
          title="Pending Applications" 
          value={stats.pendingWellnessApplications} 
          icon={Hourglass} 
          description="New wellness profiles awaiting review."
          link="/admin/dashboard/dispensaries?status=Pending+Approval" 
          linkText="Review Applications"
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="Listed Products" 
          value={stats.activeProducts}
          icon={Package}
          description="Total products across all wellness entities."
          link="/admin/dashboard/product-pool"
          linkText="View Product Pool"
          isLoading={isLoadingStats}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickActionCard
            title="Manage Wellness Profiles"
            description="Approve, view, edit, or suspend wellness applications."
            icon={Building}
            link="/admin/dashboard/dispensaries"
            buttonText="Go to Wellness Profiles"
        />
         <QuickActionCard
            title="Manage Users"
            description="View user details, manage roles, and oversee user activity."
            icon={Users}
            link="/admin/dashboard/users"
            buttonText="Go to Users"
        />
        <QuickActionCard
            title="Wellness Types"
            description="Create and manage the types of wellness entities available."
            icon={ListChecks}
            link="/admin/dashboard/dispensary-types"
            buttonText="Manage Types"
        />
        <QuickActionCard
            title="Credit System"
            description="Configure credit packages and monitor transactions."
            icon={CreditCard}
            link="/admin/dashboard/credits"
            buttonText="Credit Admin"
        />
        <QuickActionCard
            title="Pool Issues"
            description="Review and resolve reported issues in the product sharing pool."
            icon={ShieldAlert}
            link="/admin/dashboard/pool-issues"
            buttonText="View Issues"
        />
      </div>
    </div>
  );
}
