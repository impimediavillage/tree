'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DriverApplicationForm } from '@/components/driver/DriverApplicationForm';
import { CheckCircle, TruckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DriverSignupPage() {
  const router = useRouter();
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string>('');

  const handleApplicationSubmit = (appId: string) => {
    setApplicationId(appId);
    setApplicationSubmitted(true);
  };

  if (applicationSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Application Submitted! 🎉
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Thank you for applying to join The Wellness Tree driver network
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold">Application ID:</span> {applicationId}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Your application is being reviewed by our team. You'll receive an email notification once your application has been processed.
              </p>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Typical review time: 1-3 business days
              </p>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Go to Login
              </Button>
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-green-600 text-white py-12 shadow-xl">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <TruckIcon className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-black">Join Our Driver Network</h1>
                  <p className="text-purple-100 text-lg">Deliver wellness, earn on your schedule</p>
                </div>
              </div>
            </div>
            <Link href="/login">
              <Button variant="outline" className="bg-white text-purple-700 hover:bg-purple-50">
                Already Applied? Login
              </Button>
            </Link>
          </div>
          
          {/* Benefits Pills */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              '💰 Set Your Own Rates',
              '📍 Choose Your Service Area',
              '⏰ Flexible Schedule',
              '🏆 Earn Achievements & Bonuses',
              '📱 Real-Time Notifications',
              '💳 Weekly Payouts'
            ].map((benefit) => (
              <div
                key={benefit}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium"
              >
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <DriverApplicationForm onSubmit={handleApplicationSubmit} />
      </div>
    </div>
  );
}
