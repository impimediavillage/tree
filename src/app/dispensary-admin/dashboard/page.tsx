
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Package, Store, ShoppingBasket, BarChart3, Users, CreditCard, PackageCheck, Receipt, Calendar, Share2, Users2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileCompletionDialog, checkProfileCompleteness } from '@/components/dispensary-admin/ProfileCompletionDialog';
import { InfluencerOnboarding } from '@/components/influencer/InfluencerOnboarding';

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
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-black text-[#3D2E17]">
          <Icon className="text-[#006B3E] h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0" />
          <span className="break-words">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm sm:text-base text-[#3D2E17] font-bold mb-4">{description}</p>
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
  const router = useRouter();
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showInfluencerOnboarding, setShowInfluencerOnboarding] = useState(false);

  useEffect(() => {
    if (!authLoading && currentDispensary) {
      // Check for first login or if profile is incomplete
      const params = new URLSearchParams(window.location.search);
      const isFirstLogin = params.get('firstLogin') === 'true';
      const completionStatus = checkProfileCompleteness(currentDispensary);
      
      // Show dialog if first login OR if profile is incomplete
      if (isFirstLogin || !completionStatus.isComplete) {
        setShowWelcomeDialog(true);
      }
      
      // Clean up URL if first login
      if (isFirstLogin) {
        router.replace('/dispensary-admin/dashboard');
      }
    }
  }, [currentDispensary, authLoading, router]);
  
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
          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-black text-[#3D2E17] flex items-center gap-2">
            <Store className="h-8 w-8 sm:h-10 sm:w-10 text-[#006B3E] flex-shrink-0" />
            <span className="break-words">{currentDispensary?.dispensaryName || "Your Wellness Profile"}</span>
          </CardTitle>
          <CardDescription className="text-sm sm:text-base md:text-md text-[#3D2E17] font-bold">
            Welcome to your control panel. Manage products, pool interactions, and settings.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Epic Share Button - Featured Prominently */}
      <Card className="shadow-lg bg-muted/50 hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-[#006B3E] to-[#3D2E17] flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Share2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-2xl font-black text-[#3D2E17] mb-2">
                🚀 Share Your Store & Grow!
              </h3>
              <p className="text-sm text-[#5D4E37] font-bold">
                Share your store across all social platforms, track performance, and unlock achievements! Get discovered by more customers.
              </p>
            </div>
            <Button
              onClick={() => router.push('/dispensary-admin/social-share')}
              size="lg"
              className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] hover:from-[#3D2E17] hover:to-[#006B3E] text-white font-black px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Share2 className="h-5 w-5 mr-2" />
              Open Share Hub
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
            title="Events Calendar"
            description="Create and manage awesome events to engage your community."
            icon={Calendar}
            link="/dispensary-admin/events"
            buttonText="Manage Events"
            variant="brown"
        />
        <QuickActionCard
            title="Pool Orders"
            description="View and manage all finalized product pool orders and shipping."
            icon={PackageCheck}
            link="/dispensary-admin/product-pool-orders"
            buttonText="View Pool Orders"
            variant="green"
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

      {/* Influencer Program Card */}
      <Card className="shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-shadow border-green-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <Users2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-2xl font-black text-[#3D2E17] mb-2">
                💰 Influencer Program
              </h3>
              <p className="text-sm text-[#5D4E37] font-bold">
                Learn how customers can earn commissions by sharing The Wellness Tree. Perfect for educating your staff and customers!
              </p>
            </div>
            <Button
              onClick={() => setShowInfluencerOnboarding(true)}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-emerald-600 hover:to-green-600 text-white font-black px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Users2 className="h-5 w-5 mr-2" />
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Profile Completion Dialog */}
      <ProfileCompletionDialog
        isOpen={showWelcomeDialog}
        onOpenChange={setShowWelcomeDialog}
        dispensary={currentDispensary}
      />

      {/* Influencer Onboarding Dialog */}
      <InfluencerOnboarding
        open={showInfluencerOnboarding}
        onOpenChange={setShowInfluencerOnboarding}
        onComplete={() => setShowInfluencerOnboarding(false)}
      />
    </div>
  );
}