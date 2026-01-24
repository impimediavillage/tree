'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SocialAccountSettings } from '@/components/social-share/SocialAccountSettings';
import { PageHeader } from '@/components/ui/PageHeader';

export default function SocialAccountsPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dispensary-admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Social Media Accounts"
        description="Connect your social media accounts to share content directly from your wellness hub. Your credentials are encrypted and stored securely."
      />

      <SocialAccountSettings />
    </div>
  );
}
