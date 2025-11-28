'use client';

import type { AIAdvisor } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Brain, Image as ImageIcon, Zap, Coins, Star, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';

interface AIAdvisorCardProps {
  advisor: AIAdvisor;
  onToggleActive: (advisorId: string, currentStatus: boolean) => Promise<void>;
  onDelete: (advisorId: string) => void;
}

export function AIAdvisorCard({ advisor, onToggleActive, onDelete }: AIAdvisorCardProps) {
  const getTierColor = (tier: AIAdvisor['tier']) => {
    switch (tier) {
      case 'basic':
        return 'bg-slate-100 text-slate-700 font-bold';
      case 'standard':
        return 'bg-blue-100 text-blue-700 font-bold';
      case 'premium':
        return 'bg-purple-100 text-purple-700 font-bold';
      default:
        return 'bg-gray-100 text-gray-700 font-bold';
    }
  };

  const renderIcon = () => {
    const IconComponent = (LucideIcons as any)[advisor.iconName];
    if (IconComponent) {
      return <IconComponent className="h-6 w-6 stroke-[2.5]" />;
    }
    return <Brain className="h-6 w-6 stroke-[2.5]" />;
  };

  // Normalize image URL for display
  const getImageUrl = () => {
    if (!advisor.imageUrl) return null;
    
    if (advisor.imageUrl.startsWith('/') || advisor.imageUrl.startsWith('http')) {
      return advisor.imageUrl;
    }
    
    // Handle partial paths - infer category from advisor name
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

  const imageUrl = getImageUrl();

  return (
    <Card
      className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card text-card-foreground animate-fade-in-scale-up"
      style={{ animationFillMode: 'backwards' }}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-xl font-bold text-[#5D4E37] flex items-center gap-2">
            {renderIcon()}
            {advisor.name}
          </CardTitle>
          <Badge className={getTierColor(advisor.tier)}>
            {advisor.tier.toUpperCase()}
          </Badge>
        </div>
        <CardDescription className="text-xs text-[#5D4E37]/70 font-medium">
          <span className="font-mono">{advisor.slug}</span> • Order: {advisor.order}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-3 text-sm font-medium">
        {/* Image Preview */}
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

        {/* Short Description */}
        <div className="flex items-start gap-2">
          <MessageSquare className="h-5 w-5 text-[#5D4E37] flex-shrink-0 mt-0.5 stroke-[2.5]" />
          <p className="text-[#5D4E37] font-semibold line-clamp-3" title={advisor.shortDescription}>
            {advisor.shortDescription || "No description provided."}
          </p>
        </div>

        {/* Model & Credits */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#5D4E37]/70 stroke-[2.5]" />
            <div>
              <p className="text-xs font-bold text-[#5D4E37]/70">Model</p>
              <p className="text-[#5D4E37] font-semibold text-xs">{advisor.model}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-[#5D4E37]/70 stroke-[2.5]" />
            <div>
              <p className="text-xs font-bold text-[#5D4E37]/70">Base Cost</p>
              <p className="text-[#5D4E37] font-semibold text-xs">{advisor.creditCostBase} credits</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {advisor.tags && advisor.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {advisor.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs font-semibold">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Active Status */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs font-bold text-[#5D4E37]/70">Active Status:</span>
          <Switch
            checked={advisor.isActive}
            onCheckedChange={() => onToggleActive(advisor.id!, advisor.isActive)}
          />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t pt-4 mt-auto">
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1 font-bold" asChild>
            <Link href={`/admin/dashboard/ai-advisors/edit/${advisor.id}`}>
              <Edit className="mr-2 h-5 w-5 stroke-[2.5]" /> Edit
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex-1 font-bold">
                <Trash2 className="mr-2 h-5 w-5 stroke-[2.5]" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the AI advisor &quot;{advisor.name}&quot;. 
                  Any dispensary types linked to this advisor will lose the connection.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(advisor.id!)}>
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
