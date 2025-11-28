'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { AIAdvisor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import AdvisorChatInterface from '@/components/advisors/AdvisorChatInterface';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';

type LucideIconName = keyof typeof LucideIcons;

export default function AdvisorChatPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [advisor, setAdvisor] = useState<AIAdvisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = params?.slug as string;

  useEffect(() => {
    if (!slug) return;

    const fetchAdvisor = async () => {
      try {
        setLoading(true);
        setError(null);

        const advisorsRef = collection(db, 'aiAdvisors');
        const q = query(
          advisorsRef,
          where('slug', '==', slug),
          where('isActive', '==', true),
          limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('Advisor not found or is not available.');
          return;
        }

        const doc = snapshot.docs[0];
        const advisorData = { id: doc.id, ...doc.data() } as AIAdvisor;
        setAdvisor(advisorData);
      } catch (err) {
        console.error('Error fetching advisor:', err);
        setError('Failed to load advisor. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisor();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
      </div>
    );
  }

  if (error || !advisor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{error || 'Advisor not found'}</h1>
          <Button onClick={() => router.push('/')} className="bg-[#006B3E] hover:bg-[#005030]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Render advisor icon
  const IconComponent = advisor.iconName
    ? (LucideIcons[advisor.iconName as LucideIconName] as React.ComponentType<any>)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Advisors
          </Button>

          <div className="flex items-start gap-6">
            {/* Advisor Image */}
            <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
              {advisor.imageUrl ? (
                <Image
                  src={advisor.imageUrl}
                  alt={advisor.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#006B3E] to-[#004D2C] flex items-center justify-center">
                  {IconComponent && <IconComponent className="h-12 w-12 text-white" />}
                </div>
              )}
            </div>

            {/* Advisor Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{advisor.name}</h1>
                <span className="px-3 py-1 bg-[#006B3E]/10 text-[#006B3E] text-sm font-medium rounded-full capitalize">
                  {advisor.tier}
                </span>
              </div>
              <p className="text-gray-600 text-lg mb-4">{advisor.shortDescription}</p>
              {advisor.longDescription && (
                <p className="text-gray-500 text-sm">{advisor.longDescription}</p>
              )}

              {/* Credit Info */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Base Cost:</span>
                  <span className="text-[#006B3E] font-bold">{advisor.creditCostBase} credits</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Per Token:</span>
                  <span className="text-[#006B3E] font-bold">{advisor.creditCostPerTokens} credits</span>
                </div>
                {currentUser && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="font-medium text-gray-700">Your Balance:</span>
                    <span className="text-[#006B3E] font-bold text-lg">
                      {currentUser.credits || 0} credits
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="container mx-auto px-4 py-8">
        {currentUser ? (
          <AdvisorChatInterface advisor={advisor} />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-6">
              Please sign in to chat with {advisor.name}.
            </p>
            <Button
              onClick={() => router.push('/auth/signin')}
              className="bg-[#006B3E] hover:bg-[#005030]"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
