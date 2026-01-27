'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Mail, Phone, Home } from 'lucide-react';

export default function DriverApplicationPendingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="container max-w-2xl mx-auto">
        <Card className="shadow-2xl border-2 border-[#006B3E]/20">
          <CardHeader className="bg-gradient-to-r from-[#006B3E] to-[#3D2E17] text-white rounded-t-lg text-center py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-20 w-20 text-white" />
            </div>
            <CardTitle className="text-3xl font-extrabold">Application Submitted Successfully!</CardTitle>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Clock className="h-4 w-4" />
                Pending Admin Review
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You for Applying!
              </h2>
              <p className="text-gray-600 text-lg">
                Your driver application is currently being reviewed by our team.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-bold text-gray-900 text-lg">What happens next?</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[#006B3E] text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Document Verification</p>
                    <p className="text-sm text-gray-600">We'll review your driver's license, ID, and vehicle information</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-[#006B3E] text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Background Check</p>
                    <p className="text-sm text-gray-600">Standard verification process (usually 1-3 business days)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-[#006B3E] text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Approval & Onboarding</p>
                    <p className="text-sm text-gray-600">Once approved, you'll receive login credentials and training materials</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-bold text-gray-900 mb-3">We'll contact you via:</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="h-5 w-5 text-[#006B3E]" />
                  <span className="text-sm">Email notification when approved</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-5 w-5 text-[#006B3E]" />
                  <span className="text-sm">SMS confirmation with next steps</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Check your email regularly. Approval typically takes 1-3 business days. 
                If you have questions, contact our driver support team.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="flex-1 bg-[#006B3E] hover:bg-[#3D2E17]">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Home
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/auth/login">
                  Login to Check Status
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link href="/" className="inline-block">
            <Image
              src="/images/tree.png"
              alt="The Wellness Tree"
              width={60}
              height={60}
              className="opacity-70 hover:opacity-100 transition-opacity"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
