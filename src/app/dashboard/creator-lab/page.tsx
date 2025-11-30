'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Image as ImageIcon, Package, DollarSign, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DesignStudio } from '@/components/creator-lab/DesignStudio';
import { DesignGallery } from '@/components/creator-lab/DesignGallery';
import { ApparelPreview } from '@/components/creator-lab/ApparelPreview';
import type { CreatorDesign } from '@/types/creator-lab';

export default function CreatorLabPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, isLeafUser, isDispensaryOwner, isDispensaryStaff } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedDesign, setSelectedDesign] = useState<CreatorDesign | null>(null);
  const [refreshGallery, setRefreshGallery] = useState(0);

  const canAccessCreatorLab = isLeafUser || isDispensaryOwner || isDispensaryStaff;
  const userCredits = currentUser?.credits || 0;

  const handleDesignGenerated = (design: CreatorDesign) => {
    setRefreshGallery((prev) => prev + 1);
    toast({
      title: 'Design Generated Successfully!',
      description: 'Your design has been saved. You can now publish it to The Treehouse.',
    });
  };

  const handleDesignSelect = (design: CreatorDesign) => {
    setSelectedDesign(design);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E] mb-4" />
        <h2 className="text-2xl font-bold text-[#3D2E17]">Loading Creator Lab...</h2>
        <p className="mt-2 text-[#5D4E37] font-semibold">Preparing your creative space</p>
      </div>
    );
  }

  if (!currentUser || !canAccessCreatorLab) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-[#3D2E17]">Access Denied</h2>
        <p className="mt-2 text-[#5D4E37] font-semibold text-center">
          The Creator Lab is available to registered users and dispensary owners.
        </p>
        <Button
          onClick={() => router.push('/auth/signup')}
          className="mt-6 bg-[#006B3E] hover:bg-[#5D4E37] font-bold"
        >
          Create Account
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[#006B3E]/10">
              <Sparkles className="h-12 w-12 text-[#006B3E]" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-[#3D2E17]">The Creator Lab</h1>
              <p className="text-lg text-[#5D4E37] font-semibold mt-1">
                AI-Powered Apparel Design Studio
              </p>
            </div>
          </div>
          <Card className="border-[#006B3E] bg-[#006B3E]/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-[#5D4E37] font-semibold">Your Credits</p>
              <p className="text-3xl font-extrabold text-[#006B3E]">{userCredits}</p>
              <Button
                onClick={() => router.push('/dashboard/leaf/credits')}
                variant="link"
                className="text-xs text-[#006B3E] font-bold p-0 h-auto mt-1"
              >
                Top Up
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-[#5D4E37]/10 p-1">
          <TabsTrigger
            value="generate"
            className="data-[state=active]:bg-[#006B3E] data-[state=active]:text-white font-bold"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger
            value="my-designs"
            className="data-[state=active]:bg-[#006B3E] data-[state=active]:text-white font-bold"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            My Designs
          </TabsTrigger>
          <TabsTrigger
            value="published"
            className="data-[state=active]:bg-[#006B3E] data-[state=active]:text-white font-bold"
          >
            <Package className="mr-2 h-4 w-4" />
            Published
          </TabsTrigger>
          <TabsTrigger
            value="earnings"
            className="data-[state=active]:bg-[#006B3E] data-[state=active]:text-white font-bold"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Earnings
          </TabsTrigger>
        </TabsList>

        {/* Generate Design Tab */}
        <TabsContent value="generate" className="space-y-6">
          <DesignStudio onDesignGenerated={handleDesignGenerated} />
          
          {/* Quick tips */}
          <Card className="border-[#5D4E37] bg-[#5D4E37]/5">
            <CardHeader>
              <CardTitle className="text-lg font-extrabold text-[#3D2E17]">
                💡 Creator Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[#5D4E37] font-semibold">
              <p>• Designs are optimized for printing on <strong>black apparel</strong></p>
              <p>• Use vibrant colors and high contrast for best results</p>
              <p>• You earn <strong className="text-[#006B3E]">25% commission</strong> on every sale</p>
              <p>• Popular styles: Psychedelic, Sacred Geometry, Nature, Abstract Art</p>
              <p>• Each generation costs <strong>10 credits</strong>, variations cost <strong>5 credits</strong></p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Designs Tab */}
        <TabsContent value="my-designs" className="space-y-6">
          <DesignGallery
            onDesignSelect={handleDesignSelect}
            refreshTrigger={refreshGallery}
          />
          {selectedDesign && (
            <ApparelPreview designImageUrl={selectedDesign.imageUrl} />
          )}
        </TabsContent>

        {/* Published Products Tab */}
        <TabsContent value="published">
          <Card className="border-[#5D4E37]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-[#006B3E]" />
                <div>
                  <CardTitle className="text-xl font-extrabold text-[#3D2E17]">
                    Published Products
                  </CardTitle>
                  <CardDescription className="text-[#5D4E37] font-semibold">
                    Your designs live on The Treehouse marketplace
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-[#5D4E37]/30 mx-auto mb-4" />
              <p className="text-[#5D4E37] font-semibold text-lg mb-2">Coming Soon</p>
              <p className="text-[#5D4E37] font-semibold text-sm">
                Track your published products and their performance
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <Card className="border-[#5D4E37]">
            <CardHeader>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-[#006B3E]" />
                <div>
                  <CardTitle className="text-xl font-extrabold text-[#3D2E17]">
                    Creator Earnings
                  </CardTitle>
                  <CardDescription className="text-[#5D4E37] font-semibold">
                    Track your commissions and payouts (25% of sales)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-[#006B3E] bg-[#006B3E]/5">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-[#5D4E37] font-semibold mb-2">Total Earned</p>
                    <p className="text-3xl font-extrabold text-[#006B3E]">R0</p>
                  </CardContent>
                </Card>
                <Card className="border-[#5D4E37] bg-[#5D4E37]/5">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-[#5D4E37] font-semibold mb-2">Pending Payout</p>
                    <p className="text-3xl font-extrabold text-[#3D2E17]">R0</p>
                  </CardContent>
                </Card>
                <Card className="border-green-600 bg-green-50">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-[#5D4E37] font-semibold mb-2">Paid Out</p>
                    <p className="text-3xl font-extrabold text-green-600">R0</p>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-6 text-center text-sm text-[#5D4E37] font-semibold">
                <p>Start selling to earn commissions! 🚀</p>
                <p className="mt-2">Minimum payout: <strong>R500</strong></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
