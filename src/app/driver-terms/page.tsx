'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, AlertTriangle, DollarSign, Users, Shield, Truck, Star } from 'lucide-react';

export default function DriverTermsPage() {
  return (
    <div className="min-h-screen relative py-12 px-4">
      {/* Animated Tree Video Background */}
      <div className="fixed inset-0 -z-10">
        <video
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/images/treevid.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="container max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 bg-white/95 backdrop-blur-md rounded-lg p-6 shadow-lg relative">
          <Link 
            href="/driver-signup" 
            className="absolute left-4 top-6 flex items-center gap-2 text-[#3D2E17] hover:text-[#006B3E] transition-colors font-bold"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Back to Application</span>
          </Link>
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/images/tree.png"
              alt="The Wellness Tree"
              width={80}
              height={80}
              className="mx-auto"
            />
          </Link>
          <h1 className="text-4xl font-black text-[#3D2E17] mb-2 flex items-center justify-center gap-3">
            <Shield className="h-10 w-10 text-[#006B3E]" />
            Driver Terms & Conditions
          </h1>
          <p className="text-lg font-bold text-[#3D2E17]/80">
            Please read carefully before submitting your application
          </p>
        </div>

        <Card className="shadow-xl border-2 border-[#006B3E]/30 bg-white/95 backdrop-blur-md">
          <CardContent className="p-8 space-y-8">
            
            {/* Public vs Private Drivers */}
            <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 border-2 border-purple-300">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-8 w-8 text-purple-700" />
                <h2 className="text-2xl font-black text-purple-900">Driver Types</h2>
              </div>
              <div className="space-y-4 text-purple-900">
                <div>
                  <h3 className="text-lg font-black mb-2">🔓 Public Drivers</h3>
                  <p className="font-semibold leading-relaxed">
                    Public drivers are independent contractors who can accept delivery requests from ANY dispensary or wellness store on The Wellness Tree platform. You have complete flexibility to choose which deliveries to accept based on distance, payout, and availability.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">🏢 Private Drivers</h3>
                  <p className="font-semibold leading-relaxed">
                    Private drivers are affiliated with specific dispensaries or cannabis clubs. You work exclusively for your assigned store(s) and handle all their in-house deliveries. Private drivers may have guaranteed hours and fixed rates negotiated directly with their employer.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment & Payouts */}
            <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl p-6 border-2 border-green-300">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-8 w-8 text-green-700" />
                <h2 className="text-2xl font-black text-green-900">Payment & Payouts</h2>
              </div>
              <div className="space-y-4 text-green-900">
                <div>
                  <h3 className="text-lg font-black mb-2">💰 Who Pays You?</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong>Public Drivers:</strong> Paid by The Wellness Tree platform. Earnings are calculated based on completed deliveries and distance traveled.</li>
                    <li><strong>Private Drivers:</strong> Paid directly by your affiliated dispensary/club according to your employment agreement.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">📅 Payout Schedule</h3>
                  <p className="font-semibold leading-relaxed">
                    <strong>Public Drivers:</strong> Weekly payouts every Friday to your registered South African bank account. Minimum payout threshold: R500. If earnings are below R500, they roll over to the following week.
                  </p>
                  <p className="font-semibold leading-relaxed mt-2">
                    <strong>Private Drivers:</strong> Payment schedule determined by your employer (dispensary/club).
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">🚗 Price Per Kilometer Rate</h3>
                  <p className="font-semibold leading-relaxed">
                    <strong className="text-red-700">IMPORTANT:</strong> Each dispensary sets their own price per kilometer (R/km) rate for deliveries. Public drivers will see the total payout amount before accepting a delivery. Rates typically range from <strong>R8-R15 per km</strong> based on distance, time, and dispensary pricing.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">📊 How to Request Payout</h3>
                  <ol className="space-y-2 font-semibold leading-relaxed list-decimal list-inside">
                    <li>Log into your Driver Dashboard</li>
                    <li>Navigate to "Earnings" section</li>
                    <li>Verify your available balance meets minimum threshold (R500)</li>
                    <li>Click "Request Payout" button</li>
                    <li>Confirm your bank account details</li>
                    <li>Payout processed within 2-3 business days</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Code of Conduct */}
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-6 border-2 border-blue-300">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-blue-700" />
                <h2 className="text-2xl font-black text-blue-900">Code of Conduct & Professional Standards</h2>
              </div>
              <div className="space-y-4 text-blue-900">
                <div>
                  <h3 className="text-lg font-black mb-2">✅ Driver Responsibilities</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li>Handle all products with care and maintain product integrity</li>
                    <li>Deliver orders on time and communicate delays immediately</li>
                    <li>Treat customers with respect and professionalism</li>
                    <li>Maintain a clean, roadworthy vehicle</li>
                    <li>Verify customer ID for age-restricted products (18+ or 21+)</li>
                    <li>Follow all traffic laws and drive safely</li>
                    <li>Keep customer information confidential</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Violations & Penalties */}
            <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-2xl p-6 border-2 border-red-300">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-700" />
                <h2 className="text-2xl font-black text-red-900">Violations & Account Termination</h2>
              </div>
              <div className="space-y-4 text-red-900">
                <div>
                  <h3 className="text-lg font-black mb-2">🚨 Immediate Termination Offenses</h3>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong className="text-red-800">Product Theft:</strong> Any driver found stealing, tampering with, or misappropriating products will be immediately removed from the platform and reported to law enforcement.</li>
                    <li><strong className="text-red-800">Fraudulent Activity:</strong> Falsifying delivery confirmations, manipulating GPS data, or submitting fake delivery proof.</li>
                    <li><strong className="text-red-800">Safety Violations:</strong> Driving under the influence, reckless driving, or endangering customers.</li>
                    <li><strong className="text-red-800">Harassment:</strong> Any form of harassment, discrimination, or inappropriate behavior toward customers or dispensary staff.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">⭐ Review-Based Performance Standards</h3>
                  <p className="font-semibold leading-relaxed mb-3">
                    Your performance is monitored through customer ratings and dispensary feedback. Drivers must maintain acceptable service standards:
                  </p>
                  <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                    <li><strong>Rating System:</strong> Customers rate drivers on a 5-star scale after each delivery</li>
                    <li><strong>Minimum Rating:</strong> Drivers must maintain at least a <strong className="text-red-800">3.5-star average rating</strong></li>
                    <li><strong>Warning Period:</strong> If your rating drops below 3.5 stars, you'll receive a warning and 30 days to improve</li>
                    <li><strong>Termination Policy:</strong> Consistent poor performance (below 3.5 stars) for <strong className="text-red-800">1 month or longer</strong> will result in account suspension or permanent removal from the platform</li>
                    <li><strong>Review Period:</strong> Multiple customer complaints about late deliveries, unprofessional behavior, or product mishandling within any 30-day period</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-black mb-2">⚖️ Appeals Process</h3>
                  <p className="font-semibold leading-relaxed">
                    Drivers have the right to appeal termination decisions within 14 days. Submit written appeals to <strong>drivers@thewellnesstree.co.za</strong> with supporting evidence. Management will review appeals within 7 business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Insurance & Liability */}
            <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-6 border-2 border-amber-300">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="h-8 w-8 text-amber-700" />
                <h2 className="text-2xl font-black text-amber-900">Vehicle Requirements & Insurance</h2>
              </div>
              <div className="space-y-4 text-amber-900">
                <ul className="space-y-2 font-semibold leading-relaxed list-disc list-inside">
                  <li>Valid South African driver's license (Code B minimum, Code C/D for larger vehicles)</li>
                  <li>Registered, roadworthy vehicle with current license disc</li>
                  <li>Comprehensive vehicle insurance (minimum third-party coverage)</li>
                  <li>You are an independent contractor responsible for your own vehicle maintenance, fuel, and insurance</li>
                  <li>The Wellness Tree is not liable for vehicle damage, accidents, or theft during deliveries</li>
                </ul>
              </div>
            </div>

            {/* Agreement */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-6 border-2 border-gray-300">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-gray-700" />
                <h2 className="text-2xl font-black text-gray-900">Acceptance of Terms</h2>
              </div>
              <div className="text-gray-900">
                <p className="font-semibold leading-relaxed">
                  By checking the "I agree to the Driver Terms & Conditions" box and submitting your driver application, you acknowledge that you have read, understood, and agree to comply with all terms outlined in this document. You understand that violation of these terms may result in immediate termination from the platform without compensation for pending earnings.
                </p>
                <p className="font-semibold leading-relaxed mt-4">
                  <strong>Last Updated:</strong> January 28, 2026
                </p>
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-4">
              <Button 
                asChild 
                size="lg" 
                className="w-full bg-[#006B3E] hover:bg-[#3D2E17] text-white font-black text-lg py-6"
              >
                <Link href="/driver-signup">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back to Application Form
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
