'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SocialAccountSettings } from '@/components/social-share/SocialAccountSettings';
import { useAuth } from '@/contexts/AuthContext';

export default function InfluencerSocialAccountsPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  return (
    <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Social Media Accounts"
          description="Connect your social media accounts for easy content sharing and promotion"
        />
      </div>
      
      {currentUser && (
        <SocialAccountSettings userContext="influencer" />
      )}
    </div>
  );
}
