
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Sparkles, Leaf, Heart, Flower, Sun, Moon, Star, Zap, Wind, Droplet, Flame, TreePine, Sprout, Activity, Atom, Dna, Microscope, Beaker, Pill, Stethoscope, Eye, Smile, Users, UserCheck, Waves, Mountain, Globe, Compass, ShieldCheck, HandHelping, ArrowRight, Coins } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import type { AIAdvisor } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

const AdvisorsPage = () => {
  const [advisors, setAdvisors] = useState<AIAdvisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchAdvisors = async () => {
      setIsLoading(true);
      try {
        const advisorsQuery = query(
          collection(db, 'aiAdvisors'),
          where('isActive', '==', true),
          orderBy('order', 'asc')
        );
        const querySnapshot = await getDocs(advisorsQuery);
        const advisorsData: AIAdvisor[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as AIAdvisor));
        setAdvisors(advisorsData);
      } catch (error) {
        console.error('Error fetching advisors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvisors();
  }, []);

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="h-6 w-6" />;
    }
    return <Brain className="h-6 w-6" />;
  };

  const getTierBadge = (tier: AIAdvisor['tier']) => {
    const colors = {
      basic: 'bg-slate-100 text-slate-700',
      standard: 'bg-blue-100 text-blue-700',
      premium: 'bg-purple-100 text-purple-700',
    };
    return (
      <Badge className={`${colors[tier]} font-bold`}>
        {tier.toUpperCase()}
      </Badge>
    );
  };

  // Normalize image URL
  const getImageUrl = (advisor: AIAdvisor) => {
    if (!advisor.imageUrl) return null;
    if (advisor.imageUrl.startsWith('/') || advisor.imageUrl.startsWith('http')) {
      return advisor.imageUrl;
    }
    const advisorName = advisor.name.toLowerCase();
    let category = 'general';
    if (advisorName.includes('cbd') || advisorName.includes('cannabinoid')) category = 'cbd';
    else if (advisorName.includes('thc')) category = 'thc';
    else if (advisorName.includes('mushroom')) category = 'mushrooms';
    else if (advisorName.includes('flower') || advisorName.includes('homeopathy')) category = 'homeopathy';
    else if (advisorName.includes('aromatherapy')) category = 'aromatherapy';
    else if (advisorName.includes('traditional')) category = 'traditional-medicine';
    return `/images/${category}/${advisor.imageUrl}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-10 w-10 text-primary" />
          AI Advisors
        </h1>
        <p className="text-muted-foreground text-lg">
          Consult with our specialized AI advisors for personalized wellness guidance.
          {currentUser && (
            <span className="ml-2">
              Your credits: <span className="font-bold text-primary">{currentUser.credits ?? 0}</span>
            </span>
          )}
        </p>
      </div>

      {advisors.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No advisors available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advisors.map((advisor) => {
            const imageUrl = getImageUrl(advisor);
            return (
              <Card
                key={advisor.id}
                className="flex flex-col hover:shadow-xl transition-shadow duration-300 bg-card"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl font-bold text-[#5D4E37] flex items-center gap-2">
                      {renderIcon(advisor.iconName)}
                      {advisor.name}
                    </CardTitle>
                    {getTierBadge(advisor.tier)}
                  </div>
                  <CardDescription className="text-sm font-medium text-[#5D4E37]/70">
                    {advisor.shortDescription}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow space-y-3">
                  {imageUrl && (
                    <div className="relative h-40 w-full rounded-lg overflow-hidden border bg-muted">
                      <Image
                        src={imageUrl}
                        alt={advisor.name}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-[#5D4E37]/70" />
                    <span className="font-semibold text-[#5D4E37]">
                      {advisor.creditCostBase} credits base
                    </span>
                  </div>

                  {advisor.tags && advisor.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {advisor.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="border-t pt-4">
                  <Button asChild className="w-full font-bold">
                    <Link href={`/advisors/${advisor.slug}`}>
                      Consult Advisor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdvisorsPage;
