
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Package, Store, ShoppingBasket, BarChart3, Users, CreditCard, PackageCheck, Receipt, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    if (!authLoading && currentDispensary) {
      // Check for first login parameter
      const params = new URLSearchParams(window.location.search);
      if (params.get('firstLogin') === 'true') {
        setShowWelcomeDialog(true);
        // Clean up URL
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

      {/* Welcome Dialog for First Login */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#3D2E17] font-bold flex items-center gap-2">
              <Store className="h-8 w-8 text-[#006B3E]" />
              Welcome to Your Dispensary Dashboard! 🎉
            </DialogTitle>
            <DialogDescription className="text-base text-[#3D2E17] font-semibold pt-4">
              Your store has been successfully activated and you're now logged in!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-[#006B3E]/10 border-l-4 border-[#006B3E] p-4 rounded-r-lg">
              <h3 className="font-bold text-[#3D2E17] text-lg mb-2">🎯 Quick Start Guide</h3>
              <p className="text-[#3D2E17] font-semibold text-sm">
                Welcome to your dashboard! From here you can manage every aspect of your dispensary.
              </p>
            </div>

            <div className="bg-[#006B3E]/10 border-l-4 border-[#006B3E] p-4 rounded-r-lg">
              <h3 className="font-bold text-[#3D2E17] text-lg mb-2">📦 Add Your Products</h3>
              <p className="text-[#3D2E17] font-semibold text-sm mb-2">
                Start by clicking <strong>"Manage My Products"</strong> to add your inventory. This is the foundation of your store!
              </p>
            </div>

            <div className="bg-[#006B3E]/10 border-l-4 border-[#006B3E] p-4 rounded-r-lg">
              <h3 className="font-bold text-[#3D2E17] text-lg mb-2">🚚 Setup Shipping (Important!)</h3>
              <p className="text-[#3D2E17] font-semibold text-sm mb-2">
                Visit your <strong>Wellness Profile</strong> to configure your shipping methods and <strong>Origin Locker</strong>:
              </p>
              <ul className="list-disc list-inside text-[#3D2E17] font-semibold text-sm space-y-1 ml-2">
                <li>Set your delivery radius for DTD (Door to Door)</li>
                <li>Configure an Origin Locker for LTD (Locker to Door) and LTL (Locker to Locker)</li>
                <li>Enable bulk shipping for larger orders</li>
              </ul>
              <p className="text-[#3D2E17] font-semibold text-xs mt-2 italic">
                💡 Even if you don't use locker shipping now, setting it up gives you flexibility later!
              </p>
            </div>

            <div className="bg-[#3D2E17]/10 border-l-4 border-[#3D2E17] p-4 rounded-r-lg">
              <h3 className="font-bold text-[#3D2E17] text-lg mb-2">🤝 Join the Product Pool</h3>
              <p className="text-[#3D2E17] font-semibold text-sm">
                Check out <strong>"Product Sharing Pool"</strong> to share products with other dispensaries and expand your offerings!
              </p>
            </div>

            <div className="bg-green-100 border-l-4 border-green-600 p-4 rounded-r-lg">
              <p className="text-[#3D2E17] font-bold text-sm">
                ✅ Ready to get started? Click any card above to dive in!
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowWelcomeDialog(false)} className="bg-[#006B3E] hover:bg-[#3D2E17] text-white font-bold">
              Got It, Let's Get Started!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}