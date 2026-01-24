'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Coins, 
  Scale, 
  ShieldAlert, 
  Handshake, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  Lock,
  Eye,
  Users
} from 'lucide-react';

interface ProductPoolOnboardingDialogProps {
  isOpen: boolean;
  onOptIn: () => void;
  onOptOut: () => void;
}

export function ProductPoolOnboardingDialog({ 
  isOpen, 
  onOptIn, 
  onOptOut 
}: ProductPoolOnboardingDialogProps) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Product Pool Onboarding</DialogTitle>
          <DialogDescription>
            Welcome to the Product Pool! Learn about the 5% commission structure, shipping options, and privacy controls for B2B wholesale trading.
          </DialogDescription>
        </VisuallyHidden>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Handshake className="h-10 w-10" />
            <div>
              <h2 className="text-3xl font-black">Welcome to the Product Pool!</h2>
              <p className="text-emerald-50 text-sm mt-1">
                Your private B2B wholesale trading space
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6">
          
          {/* What is the Pool */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Handshake className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-blue-900 mb-2">
                  What is the Product Pool?
                </h3>
                <p className="text-blue-800 leading-relaxed">
                  A <span className="font-bold">private trading space</span> exclusively for verified dispensaries 
                  and wellness wholesalers. Buy and sell products in bulk, negotiate prices, and expand your 
                  inventory—all within a trusted network of professional businesses.
                </p>
              </div>
            </div>
          </div>

          {/* Commission Structure */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-amber-500 p-3 rounded-lg">
                <Coins className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-amber-900 mb-2">
                  5% Commission Structure
                </h3>
                <div className="text-amber-800 space-y-3">
                  <p className="leading-relaxed">
                    As a <span className="font-bold">seller</span>, the platform charges a flat{' '}
                    <span className="font-black text-amber-600 text-lg">5% commission</span> on all 
                    Product Pool transactions.
                  </p>
                  <div className="bg-white/60 rounded-lg p-4 border border-amber-300">
                    <p className="font-semibold text-amber-900 mb-2">💡 How it works:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>The 5% is <span className="font-bold">automatically deducted</span> from your public store payouts</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>Deduction occurs when you mark the order as <span className="font-bold">"Delivered"</span> or <span className="font-bold">"Shipped"</span></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span><span className="font-bold">Pro tip:</span> When negotiating prices, factor in the 5% if discussions happen outside the platform</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fair Trade Notice */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500 p-3 rounded-lg">
                <Scale className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-emerald-900 mb-2">
                  Keep It Fair & Transparent
                </h3>
                <p className="text-emerald-800 leading-relaxed">
                  The 5% commission ensures the platform can provide secure payment processing, 
                  dispute resolution, and continuous improvements. We keep fees low so you can 
                  focus on growing your business through fair B2B partnerships.
                </p>
              </div>
            </div>
          </div>

          {/* Shipping & Driver Features */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-purple-900 mb-2">
                  Built-In Shipping & Driver Management
                </h3>
                <div className="text-purple-800 space-y-3">
                  <p className="leading-relaxed">
                    Managing Product Pool logistics has never been easier! Our platform integrates 
                    powerful shipping solutions to help you fulfill orders efficiently.
                  </p>
                  <div className="bg-white/60 rounded-lg p-4 border border-purple-300">
                    <p className="font-semibold text-purple-900 mb-2">🚚 Your Shipping Options:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>
                          <span className="font-bold">Build Your Own Driver Team</span> - Manage in-house 
                          delivery with real-time tracking and driver assignments
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>
                          <span className="font-bold">PUDO Lockers</span> - Door-to-locker, locker-to-locker, 
                          and locker-to-door shipping with instant rate calculations
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>
                          <span className="font-bold">The Courier Guy (ShipLogic)</span> - Professional 
                          door-to-door courier services with competitive rates
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-purple-600 font-bold">•</span>
                        <span>
                          <span className="font-bold">Collection Option</span> - Allow buyers to collect 
                          directly from your location
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-sm text-purple-700 italic">
                    All shipping methods include tracking, automated notifications, and seamless 
                    integration with your Product Pool orders!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Sharing Controls */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-cyan-500 p-3 rounded-lg">
                <Lock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-cyan-900 mb-2 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Complete Privacy & Sharing Control
                </h3>
                <div className="text-cyan-800 space-y-3">
                  <p className="leading-relaxed">
                    <span className="font-bold">Your Product Pool is private.</span> You have full control 
                    over who can see and request your bulk products.
                  </p>
                  <div className="bg-white/60 rounded-lg p-4 border border-cyan-300">
                    <p className="font-semibold text-cyan-900 mb-2">🔒 Sharing Options:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="text-cyan-600 font-bold">•</span>
                        <span>
                          <span className="font-bold">Same Store Type Only</span> - Share only with 
                          dispensaries of your own type (e.g., only Cannibinoid stores see your products)
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-cyan-600 font-bold">•</span>
                        <span>
                          <span className="font-bold">All Store Types</span> - Make your products visible 
                          to all verified dispensaries across all wellness categories
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-cyan-600 font-bold">•</span>
                        <span>
                          <span className="font-bold">Specific Dispensaries Only</span> - Handpick exactly 
                          which dispensaries can see and request specific products
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 bg-cyan-100/50 rounded-lg p-3 border border-cyan-300">
                    <Users className="h-5 w-5 text-cyan-700 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-cyan-900">
                      <span className="font-bold">Pro Tip:</span> You can set different sharing rules 
                      for each product tier, giving you maximum flexibility in your B2B relationships!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Legal Compliance & Platform Rules
                </h3>
                <div className="text-red-800 space-y-3">
                  <p className="leading-relaxed font-semibold">
                    You must only trade legal, compliant products on The Wellness Tree platform.
                  </p>
                  <div className="bg-white/60 rounded-lg p-4 border border-red-300 space-y-2 text-sm">
                    <p className="font-semibold text-red-900">⚠️ Important Terms:</p>
                    <ul className="space-y-2">
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          The platform <span className="font-bold">does not micromanage</span> professional businesses 
                          or their inventory decisions
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          You <span className="font-bold">absolve the platform of any responsibility</span> if you 
                          choose to trade illegal or non-compliant products
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          We <span className="font-bold">reserve the right to suspend</span> your platform usage if 
                          your content results in legal challenges to the platform
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>
                          You are responsible for ensuring all products comply with local laws and regulations
                        </span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-xs text-red-700 italic mt-3">
                    By opting in, you acknowledge and agree to these terms and take full responsibility 
                    for your trading activities on the platform.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Checkbox 
                id="terms-agreement"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
              />
              <label 
                htmlFor="terms-agreement" 
                className="text-sm text-gray-700 leading-relaxed cursor-pointer flex-1"
              >
                I have read and understand the <span className="font-bold">5% commission structure</span>, 
                the <span className="font-bold">legal compliance requirements</span>, and agree to absolve 
                The Wellness Tree platform of any responsibility for my trading activities. I acknowledge 
                that the platform reserves the right to suspend my usage if legal issues arise.
              </label>
            </div>
          </div>

        </div>

        {/* Fixed Footer with CTAs */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 p-6 rounded-b-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={onOptOut}
              variant="outline"
              size="lg"
              className="flex-1 text-lg font-bold border-2 border-gray-400 hover:bg-gray-200 hover:border-gray-500"
            >
              <XCircle className="mr-2 h-5 w-5" />
              I'm Out
            </Button>
            <Button
              onClick={onOptIn}
              disabled={!agreedToTerms}
              size="lg"
              className="flex-1 text-lg font-black bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              I'm In - Let's Trade!
            </Button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            You must agree to the terms to participate in the Product Pool
          </p>
        </div>

      </DialogContent>
    </Dialog>
  );
}
