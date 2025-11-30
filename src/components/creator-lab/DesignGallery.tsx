'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Trash2, Eye, Loader2, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CreatorDesign } from '@/types/creator-lab';

interface DesignGalleryProps {
  onDesignSelect?: (design: CreatorDesign) => void;
  refreshTrigger?: number;
}

export function DesignGallery({ onDesignSelect, refreshTrigger }: DesignGalleryProps) {
  const [designs, setDesigns] = useState<CreatorDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<CreatorDesign | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      loadDesigns();
    }
  }, [currentUser, refreshTrigger]);

  const loadDesigns = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/creator-lab/my-designs?userId=${currentUser.uid}`);
      const data = await response.json();

      if (data.success) {
        setDesigns(data.designs || []);
      } else {
        toast({
          title: 'Failed to Load Designs',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading designs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your designs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDesignClick = (design: CreatorDesign) => {
    setSelectedDesign(design);
    if (onDesignSelect) {
      onDesignSelect(design);
    }
  };

  const getStatusBadge = (status: CreatorDesign['status']) => {
    const statusConfig = {
      generating: { label: 'Generating', className: 'bg-yellow-500' },
      completed: { label: 'Completed', className: 'bg-[#006B3E]' },
      failed: { label: 'Failed', className: 'bg-red-500' },
      published: { label: 'Published', className: 'bg-green-600' },
      unpublished: { label: 'Unpublished', className: 'bg-gray-500' },
    };

    const config = statusConfig[status] || statusConfig.completed;
    return (
      <Badge className={`${config.className} text-white font-bold text-xs`}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-[#5D4E37]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
          <span className="ml-3 text-[#5D4E37] font-semibold">Loading your designs...</span>
        </CardContent>
      </Card>
    );
  }

  if (designs.length === 0) {
    return (
      <Card className="border-[#5D4E37]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ImageIcon className="h-8 w-8 text-[#006B3E]" />
            <div>
              <CardTitle className="text-xl font-extrabold text-[#3D2E17]">My Designs</CardTitle>
              <CardDescription className="text-[#5D4E37] font-semibold">
                Your AI-generated creations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Package className="h-16 w-16 text-[#5D4E37]/30 mx-auto mb-4" />
          <p className="text-[#5D4E37] font-semibold text-lg mb-2">No designs yet</p>
          <p className="text-[#5D4E37] font-semibold text-sm">
            Generate your first design to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#5D4E37]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-8 w-8 text-[#006B3E]" />
            <div>
              <CardTitle className="text-xl font-extrabold text-[#3D2E17]">
                My Designs
              </CardTitle>
              <CardDescription className="text-[#5D4E37] font-semibold">
                {designs.length} design{designs.length !== 1 ? 's' : ''} generated
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map((design) => (
            <div
              key={design.id}
              onClick={() => handleDesignClick(design)}
              className={`
                group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all duration-200
                ${selectedDesign?.id === design.id
                  ? 'border-[#006B3E] shadow-lg scale-[1.02]'
                  : 'border-[#5D4E37]/30 hover:border-[#006B3E] hover:shadow-md'
                }
              `}
            >
              {/* Image */}
              <div className="relative aspect-square">
                <img
                  src={design.imageUrl}
                  alt={design.prompt}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-white" />
                </div>

                {/* Status badge */}
                <div className="absolute top-2 right-2">
                  {getStatusBadge(design.status)}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 bg-white">
                <p className="text-[#3D2E17] font-bold text-sm line-clamp-2 mb-2">
                  {design.prompt}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5D4E37] font-semibold">
                    {new Date(design.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                  </span>
                  <span className="text-[#006B3E] font-bold">
                    {design.creditsUsed} credits
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
