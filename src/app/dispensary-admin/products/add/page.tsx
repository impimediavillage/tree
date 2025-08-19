
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flame, Leaf, Shirt, Sparkles, Gift, Heart, Home as HomeIcon, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set' | 'Traditional Medicine' | 'Homeopathy' | 'Mushroom' | 'Permaculture';

interface StreamCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  stream: StreamKey;
  onClick: (stream: StreamKey) => void;
  disabled?: boolean;
}

const StreamCard: React.FC<StreamCardProps> = ({ title, description, icon: Icon, stream, onClick, disabled }) => (
  <Card className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Icon className="h-10 w-10 text-primary" />
        <CardTitle>{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
    <CardFooter>
      <Button className="w-full" onClick={() => onClick(stream)} disabled={disabled}>
        Add {title} Product
      </Button>
    </CardFooter>
  </Card>
);

export default function AddProductStreamSelectionPage() {
  const router = useRouter();
  const { currentDispensary, loading: authLoading } = useAuth();
  
  const getAddProductPath = () => {
    const type = currentDispensary?.dispensaryType;
    if (type === 'Cannibinoid store') {
      return '/dispensary-admin/products/add/thc';
    }
    if (type === 'Traditional Medicine dispensary') {
      return '/dispensary-admin/products/add/traditional-medicine';
    }
    if (type === 'Homeopathic store') {
        return '/dispensary-admin/products/add/homeopathy';
    }
    if (type === 'Mushroom store') {
        return '/dispensary-admin/products/add/mushroom';
    }
    if (type === 'Permaculture & gardening store') {
        return '/dispensary-admin/products/add/permaculture';
    }
    return '/dispensary-admin/products/add/thc'; // Fallback for other types
  };

  if (authLoading) {
     return (
        <div className="max-w-4xl mx-auto my-8 p-6 space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-9 w-32" />
            </div>
            <Skeleton className="h-6 w-96" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
     )
  }

  // If a specific workflow exists, redirect immediately.
  // This page will only render for types that need a selection (currently none with this logic).
  if (currentDispensary?.dispensaryType) {
      router.replace(getAddProductPath());
      return (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Redirecting to the correct product flow...</p>
        </div>
      );
  }

  return (
    <div className="max-w-5xl mx-auto my-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Add a New Product</h1>
          <p className="text-muted-foreground">
            Select the type of product you want to add to your store.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dispensary-admin/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
      <p className="text-center text-muted-foreground">No product creation workflow defined for this store type. Please contact support.</p>
    </div>
  );
}
