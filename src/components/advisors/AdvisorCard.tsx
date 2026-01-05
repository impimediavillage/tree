'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Coins, ArrowRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { AIAdvisor } from '@/types';

interface AdvisorCardProps {
  advisor: AIAdvisor;
}

export const AdvisorCard: React.FC<AdvisorCardProps> = ({ advisor }) => {
  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="h-8 w-8" />;
    }
    return <Brain className="h-8 w-8" />;
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

  const imageUrl = getImageUrl(advisor);

  return (
    <Card className="flex flex-col hover:shadow-xl transition-shadow duration-300 bg-muted/50 border-border/50 overflow-hidden">
      {imageUrl && (
        <div className="relative h-64 w-full bg-muted overflow-hidden">
          <Image
            src={imageUrl}
            alt={advisor.name}
            fill
            className="object-cover object-top"
            style={{ objectFit: 'cover', objectPosition: 'top' }}
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-black text-[#3D2E17] flex items-center gap-2">
            <div className="text-[#006B3E]">
              {renderIcon(advisor.iconName)}
            </div>
            {advisor.name}
          </CardTitle>
          {getTierBadge(advisor.tier)}
        </div>
        <CardDescription className="text-sm font-bold text-[#3D2E17]/80">
          {advisor.shortDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Coins className="h-5 w-5 text-[#006B3E]" />
          <span className="font-bold text-[#3D2E17]">
            {advisor.creditCostBase} credits base
          </span>
        </div>

        {advisor.tags && advisor.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {advisor.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} className="text-xs font-bold bg-[#3D2E17] text-white hover:bg-[#2D1E0F]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Button asChild className="w-full font-bold bg-[#006B3E] hover:bg-[#3D2E17] active:bg-[#005230] hover:scale-105 active:scale-95 transition-all duration-300 text-white">
          <Link href={`/advisors/${advisor.slug}`}>
            Consult Advisor
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
