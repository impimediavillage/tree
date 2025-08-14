
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Flame, Leaf, Shirt, Sparkles, Gift } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

type StreamKey = 'THC' | 'CBD' | 'Apparel' | 'Smoking Gear' | 'Sticker Promo Set';

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
    // This will eventually navigate to different pages based on the stream
    // For now, all will point to the THC example page we are building.
    switch (stream) {
      case 'THC':
      case 'CBD':
        router.push('/dispensary-admin/products/add/thc');
        break;
      // Future cases for other streams would go here
      // case 'Apparel':
      //   router.push('/dispensary-admin/products/add/apparel');
      //   break;
      default:
        // You can link to a generic page or show a toast for other streams
        router.push('/dispensary-admin/products/add/thc');
        break;
    }
  };

  const availableStreams = currentDispensary?.dispensaryType === 'THC - CBD - Mushrooms wellness' 
    ? [
        { key: 'THC', title: 'THC Product', description: 'Add THC-dominant flowers, edibles, tinctures, etc. Includes strain finder.', icon: Flame },
        { key: 'CBD', title: 'CBD Product', description: 'Add CBD-dominant wellness products.', icon: Leaf, disabled: true },
        { key: 'Apparel', title: 'Apparel', description: 'T-shirts, hoodies, caps, and other merchandise.', icon: Shirt, disabled: true },
        { key: 'Smoking Gear', title: 'Smoking Gear', description: 'Bongs, pipes, grinders, and other accessories.', icon: Sparkles, disabled: true },
        { key: 'Sticker Promo Set', title: 'Sticker Promo Set', description: 'Special promotional sticker packs.', icon: Gift, disabled: true }
      ]
    : [
        // Default streams if the dispensary type is different. This can be customized.
        { key: 'THC', title: 'Product', description: 'Add a new product for your store.', icon: Flame }
      ];


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
            key={stream.key}
            title={stream.title}
            description={stream.description}
            icon={stream.icon}
            stream={stream.key as StreamKey}
            onClick={handleStreamSelection}
            disabled={stream.disabled}
          />
        ))}
      </div>
    </div>
  );
}
