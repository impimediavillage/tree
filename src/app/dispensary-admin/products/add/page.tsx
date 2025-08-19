
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

  const handleStreamSelection = (stream: StreamKey) => {
    switch (stream) {
      case 'THC':
      case 'CBD':
        router.push('/dispensary-admin/products/add/thc');
        break;
      case 'Traditional Medicine':
        router.push('/dispensary-admin/products/add/traditional-medicine');
        break;
      case 'Homeopathy':
        router.push('/dispensary-admin/products/add/homeopathy');
        break;
      case 'Mushroom':
        router.push('/dispensary-admin/products/add/mushroom');
        break;
      case 'Permaculture':
        router.push('/dispensary-admin/products/add/permaculture');
        break;
      default:
        // Pointing others to thc page as a placeholder for now
        router.push('/dispensary-admin/products/add/thc');
        break;
    }
  };
  
  let availableStreams: StreamCardProps[] = [];
  const dispensaryType = currentDispensary?.dispensaryType;

  if (dispensaryType === 'Cannibinoid store') {
    availableStreams = [
      { stream: 'THC', title: 'Cannibinoid (other)', description: 'Add THC-dominant flowers, edibles, tinctures, etc. Includes strain finder.', icon: Flame, onClick: handleStreamSelection },
      { stream: 'CBD', title: 'CBD Product', description: 'Add CBD-dominant wellness products.', icon: Leaf, onClick: handleStreamSelection },
      { stream: 'Apparel', title: 'Apparel', description: 'T-shirts, hoodies, caps, and other merchandise.', icon: Shirt, onClick: handleStreamSelection, disabled: true },
      { stream: 'Smoking Gear', title: 'Smoking Gear', description: 'Bongs, pipes, grinders, and other accessories.', icon: Sparkles, onClick: handleStreamSelection, disabled: true },
      { stream: 'Sticker Promo Set', title: 'Sticker Promo Set', description: 'Special promotional sticker packs.', icon: Gift, onClick: handleStreamSelection, disabled: true }
    ];
  } else if (dispensaryType === 'Traditional Medicine dispensary') {
    availableStreams = [
      { stream: 'Traditional Medicine', title: 'Traditional Medicine', description: 'Add traditional herbs, remedies, and other products.', icon: Heart, onClick: handleStreamSelection },
    ];
  } else if (dispensaryType === 'Homeopathic store') {
      availableStreams = [
          { stream: 'Homeopathy', title: 'Homeopathy Product', description: 'Add homeopathic remedies, tinctures, and other related products.', icon: HomeIcon, onClick: handleStreamSelection },
      ]
  } else if (dispensaryType === 'Mushroom store') {
      availableStreams = [
          { stream: 'Mushroom', title: 'Mushroom Product', description: 'Add medicinal, gourmet, or other mushroom-related products.', icon: Brain, onClick: handleStreamSelection },
      ]
  } else if (dispensaryType === 'Permaculture & gardening store') {
      availableStreams = [
          { stream: 'Permaculture', title: 'Permaculture Product', description: 'Add seeds, tools, organic soils, and other gardening products.', icon: Leaf, onClick: handleStreamSelection },
      ]
  } else {
    // Default stream for other types
    availableStreams = [
       { stream: 'THC', title: 'General Product', description: 'Add a new product for your store.', icon: Flame, onClick: handleStreamSelection }
    ];
  }


  if (authLoading) {
     return (
        <div className="max-w-4xl mx-auto my-8 space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableStreams.map((stream) => (
          <StreamCard
            key={stream.stream}
            {...stream}
          />
        ))}
      </div>
    </div>
  );
}

    