'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Store, Truck, Clock, MapPin, Image as ImageIcon, Share2, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Dispensary } from '@/types';

interface ProfileCompletionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dispensary: Dispensary | null;
}

interface CompletionStatus {
  isComplete: boolean;
  missingFields: string[];
}

function checkProfileCompleteness(dispensary: Dispensary | null): CompletionStatus {
  if (!dispensary) {
    return { isComplete: false, missingFields: ['All fields'] };
  }

  const missingFields: string[] = [];

  // Check shipping methods
  if (!dispensary.shippingMethods || dispensary.shippingMethods.length === 0) {
    missingFields.push('Shipping Methods');
  }

  // Check origin locker (required even if not using LTL/LTD/DTL)
  if (!dispensary.originLocker || !dispensary.originLocker.id) {
    missingFields.push('Origin Locker');
  }

  // Check operating days
  if (!dispensary.operatingDays || dispensary.operatingDays.length === 0) {
    missingFields.push('Operating Days');
  }

  // Check operating hours
  if (!dispensary.openTime || !dispensary.closeTime) {
    missingFields.push('Operating Hours');
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields
  };
}

export function ProfileCompletionDialog({ isOpen, onOpenChange, dispensary }: ProfileCompletionDialogProps) {
  const router = useRouter();
  const completionStatus = checkProfileCompleteness(dispensary);

  const handleGoToProfile = () => {
    onOpenChange(false);
    router.push('/dispensary-admin/profile');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl text-[#3D2E17] font-black flex items-center gap-3">
            <Store className="h-10 w-10 text-[#006B3E]" />
            Welcome to The Wellness Tree! 🌿
          </DialogTitle>
          <DialogDescription className="text-base text-[#3D2E17] font-semibold pt-2">
            Let's complete your store setup to start serving customers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Completion Status */}
          {!completionStatus.isComplete && (
            <Alert className="border-l-4 border-amber-500 bg-amber-50">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <AlertDescription className="text-[#3D2E17] font-semibold">
                <strong>Profile Setup Required:</strong> Please complete the following fields in your profile:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {completionStatus.missingFields.map((field, index) => (
                    <li key={index} className="text-sm">{field}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {completionStatus.isComplete && (
            <Alert className="border-l-4 border-green-500 bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-[#3D2E17] font-semibold">
                ✅ Your profile is complete! You can now focus on adding products and growing your store.
              </AlertDescription>
            </Alert>
          )}

          {/* Shipping Methods */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Truck className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-black text-[#3D2E17] text-lg mb-2">🚚 Shipping Methods</h3>
                <p className="text-[#3D2E17] font-semibold text-sm mb-2">
                  Configure how customers receive their orders:
                </p>
                <ul className="list-disc list-inside text-[#3D2E17] text-sm space-y-1 ml-2">
                  <li><strong>DTD</strong> - Door to Door with The Courier Guy</li>
                  <li><strong>DTL/LTD/LTL</strong> - Locker delivery via Pudo</li>
                  <li><strong>In-house delivery</strong> - Your own delivery fleet</li>
                  <li><strong>Collection</strong> - Customers pick up from your store</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Origin Locker */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-black text-[#3D2E17] text-lg mb-2">📍 Origin Locker (Required!)</h3>
                <p className="text-[#3D2E17] font-semibold text-sm mb-2">
                  Set up an origin locker location near your dispensary:
                </p>
                <ul className="list-disc list-inside text-[#3D2E17] text-sm space-y-1 ml-2">
                  <li>Required for <strong>all dispensaries</strong> - even if you don't use locker shipping now</li>
                  <li>Gives you flexibility to offer locker delivery options later</li>
                  <li>Customers can choose to collect from convenient Pudo locker locations</li>
                  <li>Reduces failed deliveries and provides 24/7 pickup options</li>
                </ul>
                <p className="text-[#3D2E17] font-bold text-xs mt-3 italic bg-purple-200 p-2 rounded">
                  💡 Pro Tip: Even if you only use DTD or in-house delivery, setting up a locker gives customers more options!
                </p>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-black text-[#3D2E17] text-lg mb-2">⏰ Operating Days & Hours</h3>
                <p className="text-[#3D2E17] font-semibold text-sm">
                  Set your store's opening hours and days of operation so customers know when you're available for orders and collections.
                </p>
              </div>
            </div>
          </div>

          {/* Store Branding */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-black text-[#3D2E17] text-lg mb-2">🎨 Store Image & Icon</h3>
                <p className="text-[#3D2E17] font-semibold text-sm mb-2">
                  Upload your store logo and icon to create a professional brand presence:
                </p>
                <ul className="list-disc list-inside text-[#3D2E17] text-sm space-y-1 ml-2">
                  <li><strong>Store Image</strong> - Displays in store listings and headers</li>
                  <li><strong>Store Icon (512x512)</strong> - Used for PWA installation and social sharing</li>
                  <li>Your custom branding appears when customers share your store</li>
                  <li>Professional appearance builds trust with customers</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Store URL & PWA */}
          <div className="bg-gradient-to-r from-pink-50 to-pink-100 border-l-4 border-pink-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <div className="flex gap-2 mt-1 flex-shrink-0">
                <Share2 className="h-6 w-6 text-pink-600" />
                <Smartphone className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-black text-[#3D2E17] text-lg mb-2">🔗 Share Your Store & PWA Installation</h3>
                <p className="text-[#3D2E17] font-semibold text-sm mb-2">
                  Your store has a unique URL you can share with customers:
                </p>
                <ul className="list-disc list-inside text-[#3D2E17] text-sm space-y-1 ml-2">
                  <li>Share your store link on social media, WhatsApp, email, SMS</li>
                  <li>Visitors can <strong>install your store</strong> as an app on their devices (PWA)</li>
                  <li>When installed, your <strong>custom store icon</strong> appears on their home screen</li>
                  <li>Provides an app-like experience without app store approval</li>
                  <li>Works on Android, iOS, and desktop browsers</li>
                </ul>
                <p className="text-[#3D2E17] font-bold text-xs mt-3 italic bg-pink-200 p-2 rounded">
                  🚀 Note: If you haven't uploaded a store icon, the default Wellness Tree icon will be used
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] text-white p-5 rounded-lg shadow-lg">
            <h3 className="font-black text-xl mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              Ready to Get Started?
            </h3>
            <p className="font-semibold text-sm mb-3">
              {completionStatus.isComplete
                ? "Your profile is set up! Start adding products and sharing your store."
                : "Complete your profile to unlock all features and start accepting orders."}
            </p>
            <Button 
              onClick={handleGoToProfile} 
              className="bg-white text-[#006B3E] hover:bg-gray-100 font-bold w-full sm:w-auto"
              size="lg"
            >
              {completionStatus.isComplete ? "View My Profile" : "Complete My Profile Now"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={() => onOpenChange(false)} 
            variant="outline" 
            className="font-bold"
          >
            I'll Do This Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { checkProfileCompleteness };
