'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Radio, 
  ArrowLeft,
  Calendar,
  Clock,
  Zap,
  Sparkles,
  PlayCircle,
  Plus,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
}

export default function CreateEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [influencerName, setInfluencerName] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [platform, setPlatform] = useState<'instagram' | 'facebook' | 'youtube' | 'tiktok'>('instagram');
  const [streamUrl, setStreamUrl] = useState('');
  const [isFlashSale, setIsFlashSale] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('10');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (user) {
      loadInfluencerProfile();
      loadProducts();
    }
  }, [user]);

  const loadInfluencerProfile = async () => {
    if (!user) return;

    try {
      const docRef = doc(db, 'influencers', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profile = docSnap.data();
        setInfluencerName(profile.name || profile.displayName || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const q = query(collection(db, 'products'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      
      const products: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        imageUrl: doc.data().imageUrl,
        price: doc.data().tiers?.[0]?.price || 0,
      }));

      setAllProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({ variant: "destructive", description: "Failed to load products" });
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else if (selectedProducts.length < 10) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      toast({ variant: "destructive", description: "Maximum 10 products per event" });
    }
  };

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ variant: "destructive", description: "You must be logged in" });
      return;
    }

    if (!title.trim() || title.length < 5) {
      toast({ variant: "destructive", description: "Event title must be at least 5 characters" });
      return;
    }

    if (!description.trim() || description.length < 20) {
      toast({ variant: "destructive", description: "Description must be at least 20 characters" });
      return;
    }

    if (!eventDate || !eventTime) {
      toast({ variant: "destructive", description: "Please set event date and time" });
      return;
    }

    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    if (eventDateTime < new Date()) {
      toast({ variant: "destructive", description: "Event must be scheduled in the future" });
      return;
    }

    if (selectedProducts.length === 0) {
      toast({ variant: "destructive", description: "Please select at least one product to feature" });
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, 'liveShoppingEvents'), {
        influencerId: user.uid,
        influencerName,
        title: title.trim(),
        description: description.trim(),
        eventDate,
        eventTime,
        duration: parseInt(duration),
        platform,
        streamUrl: streamUrl.trim() || null,
        isFlashSale,
        discountPercent: isFlashSale ? parseInt(discountPercent) : 0,
        featuredProducts: selectedProducts,
        stats: {
          registrations: 0,
          attendees: 0,
          sales: 0,
          revenue: 0,
        },
        status: 'upcoming',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ description: "Live event created successfully!" });
      router.push('/dashboard/influencer/events');
    } catch (error) {
      console.error('Error creating event:', error);
      toast({ variant: "destructive", description: "Failed to create event" });
    } finally {
      setLoading(false);
    }
  };

  const platformInfo = {
    instagram: {
      icon: <Radio className="w-5 h-5 text-pink-600" />,
      name: 'Instagram Live',
      color: 'border-pink-200 bg-pink-50'
    },
    facebook: {
      icon: <Radio className="w-5 h-5 text-blue-600" />,
      name: 'Facebook Live',
      color: 'border-blue-200 bg-blue-50'
    },
    youtube: {
      icon: <PlayCircle className="w-5 h-5 text-red-600" />,
      name: 'YouTube Live',
      color: 'border-red-200 bg-red-50'
    },
    tiktok: {
      icon: <Radio className="w-5 h-5 text-black" />,
      name: 'TikTok Live',
      color: 'border-black/20 bg-gray-50'
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Create Live Shopping Event</h1>
        <p className="text-gray-600 mt-2">Schedule your live stream and showcase products</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Event Details
            </CardTitle>
            <CardDescription>Set up your live shopping experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Weekend Wellness Flash Sale"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="What can viewers expect? What products will you showcase? Any special offers?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/500 characters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="eventDate">Date *</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label htmlFor="eventTime">Time *</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="180"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Platform *</CardTitle>
            <CardDescription>Where will you be streaming?</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={platform} onValueChange={(value) => setPlatform(value as any)}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(platformInfo).map(([key, info]) => (
                  <label
                    key={key}
                    className={`relative flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      platform === key 
                        ? 'border-[#006B3E] bg-[#006B3E]/5' 
                        : info.color
                    }`}
                  >
                    <RadioGroupItem value={key} className="absolute top-2 right-2" />
                    <div className="mb-2">{info.icon}</div>
                    <p className="text-sm font-semibold text-center">{info.name}</p>
                  </label>
                ))}
              </div>
            </RadioGroup>

            <div className="mt-4">
              <Label htmlFor="streamUrl">Stream URL (optional)</Label>
              <Input
                id="streamUrl"
                type="url"
                placeholder="https://..."
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Link to your live stream (if available beforehand)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Flash Sale */}
        <Card className={isFlashSale ? 'border-2 border-orange-500' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Flash Sale
            </CardTitle>
            <CardDescription>Offer a limited-time discount during your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="flashSale" className="font-semibold">
                    {isFlashSale ? '⚡ Flash Sale Enabled' : 'Flash Sale Disabled'}
                  </Label>
                </div>
                <p className="text-sm text-gray-600">
                  {isFlashSale 
                    ? 'Products will be discounted during the live event'
                    : 'Products will be sold at regular prices'
                  }
                </p>
              </div>
              <Switch
                id="flashSale"
                checked={isFlashSale}
                onCheckedChange={setIsFlashSale}
              />
            </div>

            {isFlashSale && (
              <div>
                <Label htmlFor="discountPercent">Discount Percentage *</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  min="5"
                  max="50"
                  step="5"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  required={isFlashSale}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Between 5% and 50% off
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Featured Products */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Products * ({selectedProducts.length}/10)</CardTitle>
            <CardDescription>
              Select products to showcase during your live event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />

            {selectedProducts.length > 0 && (
              <div>
                <Label className="mb-2 block">Selected Products</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map(id => {
                    const product = allProducts.find(p => p.id === id);
                    if (!product) return null;
                    return (
                      <Badge key={id} variant="secondary" className="pl-3 pr-1 py-1">
                        {product.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 ml-2 hover:bg-red-100"
                          onClick={() => toggleProduct(id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingProducts ? (
              <p className="text-center py-4 text-gray-500">Loading products...</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedProducts.includes(product.id)
                        ? 'border-[#006B3E] bg-[#006B3E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-600">R{product.price.toFixed(2)}</p>
                      </div>
                      {selectedProducts.includes(product.id) && (
                        <div className="flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-[#006B3E]" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !title || !description || !eventDate || !eventTime || selectedProducts.length === 0}
            className="flex-1 bg-[#006B3E] hover:bg-[#005530]"
          >
            {loading ? (
              <>Creating Event...</>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
