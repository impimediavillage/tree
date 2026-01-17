
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building, ListChecks, CreditCard, ShieldAlert, Settings, Package, Hourglass, Star } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { CategoryManagementButton } from '@/components/admin/CategoryManagementButton';

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
  <Card className="shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden bg-muted/50 border-border/50">
    {badgeCount && badgeCount > 0 && (
        <div 
            className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${badgeColor || 'bg-destructive'}`}
            title={`${badgeCount} pending`}
        >
            {badgeCount}
        </div>
    )}
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-bold text-[#3D2E17]">{title}</CardTitle>
      <Icon className="h-8 w-8 text-[#006B3E]" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
         <div className="text-3xl font-extrabold text-[#3D2E17]">Loading...</div>
      ) : (
        <div className="text-3xl font-extrabold text-[#3D2E17]">{value}</div>
      )}
      {description && <p className="text-xs text-[#5D4E37] font-semibold pt-1">{description}</p>}
      {link && linkText && (
        <Button variant="link" asChild className="px-0 pt-2 text-[#006B3E] font-bold">
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
        <Card className="hover:shadow-xl transition-shadow bg-muted/50 border-border/50">
        <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl font-extrabold text-[#3D2E17]">
            <Icon className="text-[#006B3E] h-10 w-10" /> {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-[#5D4E37] font-semibold mb-4">{description}</p>
            <Button asChild className="w-full bg-[#006B3E] hover:bg-[#5D4E37] text-white font-bold" disabled={disabled}>
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
      <Card className="shadow-lg bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-4xl font-extrabold text-[#3D2E17] flex items-center gap-3">
            <Settings className="h-14 w-14 text-[#006B3E]" /> Super Admin Dashboard
          </CardTitle>
          <CardDescription className="text-lg font-bold text-[#5D4E37] mt-2">
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
            title="Review System"
            description="Monitor, analyze, and manage dispensary reviews across the platform."
            icon={Star}
            link="/admin/dashboard/reviews"
            buttonText="Manage Reviews"
        />
        <QuickActionCard
            title="Pool Issues"
            description="Review and resolve reported issues in the product sharing pool."
            icon={ShieldAlert}
            link="/admin/dashboard/pool-issues"
            buttonText="View Issues"
        />
        <CategoryManagementButton />
      </div>
    </div>
  );
}
