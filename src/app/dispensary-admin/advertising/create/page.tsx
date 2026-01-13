'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Package, 
  Star, 
  Rocket, 
  Palette,
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
  Flame,
  Gift,
  Target,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types';
import type { Advertisement, AdType } from '@/types/advertising';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateBundleSavings } from '@/lib/advertising-utils';

const AD_TYPES = [
  {
    type: 'special_deal' as AdType,
    icon: Flame,
    title: 'Special Deal',
    description: 'Limited time offers & flash sales',
    gradient: 'from-orange-500 to-red-500',
    emoji: '🔥'
  },
  {
    type: 'featured_product' as AdType,
    icon: Star,
    title: 'Featured Product',
    description: 'Highlight your bestsellers',
    gradient: 'from-yellow-500 to-orange-500',
    emoji: '⭐'
  },
  {
    type: 'product_bundle' as AdType,
    icon: Gift,
    title: 'Product Bundle',
    description: 'Group products with special pricing',
    gradient: 'from-purple-500 to-pink-500',
    emoji: '📦'
  },
  {
    type: 'social_campaign' as AdType,
    icon: Users,
    title: 'Social Campaign',
    description: 'Connect with influencers',
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '🚀'
  },
  {
    type: 'custom' as AdType,
    icon: Palette,
    title: 'Custom Ad',
    description: 'Design your own unique ad',
    gradient: 'from-pink-500 to-purple-500',
    emoji: '🎨'
  }
];

export default function CreateAdPage() {
  const { currentUser, currentDispensary, isDispensaryOwner } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Form state
  const [selectedType, setSelectedType] = useState<AdType | null>(null);
  const [adData, setAdData] = useState<Partial<Advertisement>>({
    type: 'special_deal',
    title: '',
    subtitle: '',
    description: '',
    tagline: '',
    productIds: [],
    isBundle: false,
    availableToInfluencers: true,
    influencerCommission: {
      enabled: true,
      rate: 15
    },
    placements: ['hero_banner'],
    design: {
      template: 'gradient_hero',
      animation: 'fade',
      ctaButton: {
        text: 'Shop Now',
        link: '',
        style: 'primary'
      }
    },
    priority: 50,
    weight: 1,
    isActive: true,
    isFeatured: false,
    isAlwaysOn: false,
    status: 'draft',
    analytics: {
      impressions: 0,
      uniqueImpressions: 0,
      clicks: 0,
      uniqueClicks: 0,
      conversions: 0,
      revenue: 0,
      spent: 0,
      profit: 0,
      ctr: 0,
      conversionRate: 0,
      revenuePerImpression: 0,
      revenuePerClick: 0,
      roi: 0,
      influencerDrivenSales: 0,
      influencerRevenue: 0,
      influencerCommissionPaid: 0
    }
  });
  
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [bundlePrice, setBundlePrice] = useState<number>(0);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!currentDispensary?.id) return;
      
      setLoadingProducts(true);
      try {
        const q = query(
          collection(db, 'products'),
          where('dispensaryId', '==', currentDispensary.id)
        );
        const snapshot = await getDocs(q);
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, [currentDispensary]);

  const progress = (step / 5) * 100;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleProductToggle = (product: Product) => {
    const isSelected = selectedProducts.find(p => p.id === product.id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const calculateOriginalPrice = () => {
    return selectedProducts.reduce((sum, p) => {
      const price = p.priceTiers[0]?.price || 0;
      return sum + price;
    }, 0);
  };

  const handlePublish = async (status: 'draft' | 'active') => {
    if (!currentDispensary?.id || !currentUser?.uid) {
      toast({
        title: 'Error',
        description: 'Please sign in to continue',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Calculate bundle savings if applicable
      let bundleConfig = undefined;
      if (adData.isBundle && bundlePrice > 0) {
        const originalPrice = calculateOriginalPrice();
        const savings = calculateBundleSavings(originalPrice, bundlePrice);
        bundleConfig = {
          originalPrice,
          bundlePrice,
          ...savings
        };
      }

      const adPayload: Partial<Advertisement> = {
        ...adData,
        creatorType: 'dispensary',
        creatorId: currentDispensary.id,
        creatorName: currentDispensary.dispensaryName,
        dispensaryId: currentDispensary.id,
        dispensaryName: currentDispensary.dispensaryName,
        productIds: selectedProducts.map(p => p.id!),
        products: selectedProducts.map(p => ({
          id: p.id!,
          name: p.name,
          price: p.priceTiers[0]?.price || 0,
          imageUrl: p.imageUrl || undefined,
          dispensaryName: p.dispensaryName || ''
        })),
        bundleConfig: bundleConfig ? {
          originalPrice: bundleConfig.originalPrice,
          bundlePrice: bundleConfig.bundlePrice,
          discountPercent: bundleConfig.discountPercent,
          discountAmount: bundleConfig.discountAmount,
          savings: bundleConfig.savingsText
        } : undefined,
        status,
        startDate: serverTimestamp() as any,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      };

      if (status === 'active') {
        adPayload.publishedAt = serverTimestamp() as any;
      }

      const docRef = await addDoc(collection(db, 'advertisements'), adPayload);

      toast({
        title: '🎉 Success!',
        description: `Your ad campaign has been ${status === 'draft' ? 'saved as draft' : 'published'}!`
      });

      router.push(`/dispensary-admin/advertising/${docRef.id}`);
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ad',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isDispensaryOwner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-extrabold text-[#5D4E37]">
              ✨ Create Ad Campaign
            </h1>
            <Badge className="bg-purple-100 text-purple-700 border-none text-sm px-4 py-2">
              Step {step} of 5
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Choose Ad Type */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-[#5D4E37]/10">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37] flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  Choose Your Ad Type
                </CardTitle>
                <CardDescription className="text-base">
                  Select the type of campaign you want to create
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {AD_TYPES.map((adType) => {
                    const Icon = adType.icon;
                    const isSelected = selectedType === adType.type;
                    
                    return (
                      <button
                        key={adType.type}
                        onClick={() => {
                          setSelectedType(adType.type);
                          setAdData({ ...adData, type: adType.type });
                        }}
                        className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 ${
                          isSelected
                            ? 'ring-4 ring-purple-500 scale-105 shadow-2xl'
                            : 'hover:scale-105 hover:shadow-xl'
                        } bg-gradient-to-br ${adType.gradient}`}
                      >
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                        <div className="relative text-center">
                          <div className="text-5xl mb-3">{adType.emoji}</div>
                          <h3 className="text-xl font-bold text-white mb-2">
                            {adType.title}
                          </h3>
                          <p className="text-sm text-white/90">
                            {adType.description}
                          </p>
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-white rounded-full p-1">
                              <Check className="h-5 w-5 text-purple-600" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                disabled={!selectedType}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold shadow-lg"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Ad Details */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-[#5D4E37]/10">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37] flex items-center gap-2">
                  <Target className="h-6 w-6 text-blue-600" />
                  Ad Details & Content
                </CardTitle>
                <CardDescription>
                  Write compelling copy that drives conversions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title" className="font-bold text-[#5D4E37]">
                    Ad Title *
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Flash Sale: 50% Off Premium CBD"
                    value={adData.title}
                    onChange={(e) => setAdData({ ...adData, title: e.target.value })}
                    className="mt-1 text-lg font-semibold"
                  />
                </div>

                <div>
                  <Label htmlFor="subtitle" className="font-bold text-[#5D4E37]">
                    Subtitle (Optional)
                  </Label>
                  <Input
                    id="subtitle"
                    placeholder="Add a catchy subtitle"
                    value={adData.subtitle || ''}
                    onChange={(e) => setAdData({ ...adData, subtitle: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="font-bold text-[#5D4E37]">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your offer in detail..."
                    value={adData.description}
                    onChange={(e) => setAdData({ ...adData, description: e.target.value })}
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tagline" className="font-bold text-[#5D4E37]">
                    Tagline (Optional)
                  </Label>
                  <Input
                    id="tagline"
                    placeholder="e.g., Limited Time Only!"
                    value={adData.tagline || ''}
                    onChange={(e) => setAdData({ ...adData, tagline: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="ctaText" className="font-bold text-[#5D4E37]">
                    Call-to-Action Button Text
                  </Label>
                  <Input
                    id="ctaText"
                    placeholder="e.g., Shop Now, Get Deal, Learn More"
                    value={adData.design?.ctaButton?.text}
                    onChange={(e) => setAdData({
                      ...adData,
                      design: {
                        ...adData.design!,
                        ctaButton: {
                          ...adData.design!.ctaButton!,
                          text: e.target.value
                        }
                      }
                    })}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                onClick={handleBack}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!adData.title || !adData.description}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select Products */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-[#5D4E37]/10">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37] flex items-center gap-2">
                  <Package className="h-6 w-6 text-green-600" />
                  Select Products to Feature
                </CardTitle>
                <CardDescription>
                  Choose products for your ad campaign. For bundles, select multiple products.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <Label className="font-bold text-[#5D4E37]">
                      Create Product Bundle
                    </Label>
                    <p className="text-sm text-[#5D4E37]/70">
                      Group multiple products with special pricing
                    </p>
                  </div>
                  <Switch
                    checked={adData.isBundle}
                    onCheckedChange={(checked) => {
                      setAdData({ ...adData, isBundle: checked });
                      if (!checked) {
                        setSelectedProducts([]);
                        setBundlePrice(0);
                      }
                    }}
                  />
                </div>

                {loadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#006B3E]" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {products.length === 0 ? (
                      <div className="text-center py-8 text-[#5D4E37]/70">
                        No products found. Add products to your store first.
                      </div>
                    ) : (
                      products.map((product) => {
                        const isSelected = selectedProducts.find(p => p.id === product.id);
                        const price = product.priceTiers[0]?.price || 0;
                        
                        return (
                          <button
                            key={product.id}
                            onClick={() => handleProductToggle(product)}
                            className={`w-full flex flex-col gap-3 p-4 rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'border-purple-500 bg-purple-50 shadow-lg'
                                : 'border-gray-200 hover:border-purple-300 hover:shadow-md bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-4 w-full">
                              <Checkbox checked={!!isSelected} className="pointer-events-none flex-shrink-0" />
                              
                              {product.imageUrl && (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              
                              <div className="flex-1 text-left min-w-0">
                                <h4 className="font-bold text-[#5D4E37] truncate">{product.name}</h4>
                                <p className="text-sm text-[#5D4E37]/70">
                                  {product.category}
                                </p>
                                <p className="text-xs text-[#5D4E37]/50 mt-1">
                                  Stock: {product.quantityInStock} units
                                </p>
                              </div>
                            </div>

                            {/* Product Tiers Detail */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pl-10">
                              {product.priceTiers && product.priceTiers.map((tier, index) => (
                                <div
                                  key={index}
                                  className={`flex items-center justify-between p-2 rounded-lg ${
                                    isSelected ? 'bg-white' : 'bg-gray-50'
                                  }`}
                                >
                                  <div>
                                    <p className="text-xs font-semibold text-[#5D4E37]/70">
                                      {tier.unit}
                                    </p>
                                    <p className="text-xs text-[#5D4E37]/50">
                                      Stock: {tier.quantityInStock ?? 0}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-[#006B3E]">
                                      R{tier.price.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-[#5D4E37]/40">
                                      per {tier.unit}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Product Description */}
                            {product.description && (
                              <div className="pl-10 text-left">
                                <p className="text-xs text-[#5D4E37]/60 line-clamp-2">
                                  {product.description}
                                </p>
                              </div>
                            )}

                            {/* Additional Product Info */}
                            <div className="flex items-center gap-3 pl-10 pt-2 border-t border-gray-200">
                              {product.thcContent && (
                                <Badge variant="outline" className="text-xs">
                                  THC: {product.thcContent}%
                                </Badge>
                              )}
                              {product.cbdContent && (
                                <Badge variant="outline" className="text-xs">
                                  CBD: {product.cbdContent}%
                                </Badge>
                              )}
                              {product.strain && (
                                <Badge variant="outline" className="text-xs">
                                  {product.strain}
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {adData.isBundle && selectedProducts.length > 0 && (
                  <div className="space-y-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#5D4E37]/70">
                          Original Bundle Price
                        </p>
                        <p className="text-2xl font-black text-[#5D4E37]">
                          R{calculateOriginalPrice().toFixed(2)}
                        </p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-purple-600" />
                      <div>
                        <Label className="text-sm font-semibold text-[#5D4E37]/70">
                          Your Bundle Price
                        </Label>
                        <Input
                          type="number"
                          value={bundlePrice || ''}
                          onChange={(e) => setBundlePrice(parseFloat(e.target.value) || 0)}
                          className="mt-1 text-2xl font-black text-green-600 w-40"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    {bundlePrice > 0 && bundlePrice < calculateOriginalPrice() && (
                      <div className="flex items-center justify-center gap-2 p-3 bg-white rounded-lg">
                        <Sparkles className="h-5 w-5 text-orange-500" />
                        <p className="font-bold text-orange-600">
                          Save R{(calculateOriginalPrice() - bundlePrice).toFixed(2)} 
                          ({Math.round(((calculateOriginalPrice() - bundlePrice) / calculateOriginalPrice()) * 100)}% OFF)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button onClick={handleBack} variant="outline" size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={selectedProducts.length === 0}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              >
                Continue ({selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''})
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Design & Placement */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-[#5D4E37]/10">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37] flex items-center gap-2">
                  <Palette className="h-6 w-6 text-pink-600" />
                  Design Your Ad
                </CardTitle>
                <CardDescription>
                  Choose templates, animations, and where your ad will appear
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Selection */}
                <div>
                  <Label className="font-bold text-[#5D4E37] mb-3 block">
                    🎨 Choose Template
                  </Label>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { id: 'gradient_hero', name: 'Gradient Hero', gradient: 'from-purple-500 to-pink-500' },
                      { id: 'product_showcase', name: 'Product Showcase', gradient: 'from-blue-500 to-cyan-500' },
                      { id: 'bundle_deal', name: 'Bundle Deal', gradient: 'from-orange-500 to-red-500' },
                    ].map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setAdData({
                          ...adData,
                          design: {
                            ...adData.design!,
                            template: template.id as any
                          }
                        })}
                        className={`p-4 rounded-xl bg-gradient-to-r ${template.gradient} text-white font-bold transition-all ${
                          adData.design?.template === template.id
                            ? 'ring-4 ring-purple-500 scale-105'
                            : 'hover:scale-105'
                        }`}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation Selection */}
                <div>
                  <Label className="font-bold text-[#5D4E37] mb-3 block">
                    ✨ Animation Style
                  </Label>
                  <Select
                    value={adData.design?.animation}
                    onValueChange={(value) => setAdData({
                      ...adData,
                      design: {
                        ...adData.design!,
                        animation: value as any
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade In</SelectItem>
                      <SelectItem value="slide">Slide In</SelectItem>
                      <SelectItem value="pulse">Pulse</SelectItem>
                      <SelectItem value="bounce">Bounce</SelectItem>
                      <SelectItem value="zoom">Zoom In</SelectItem>
                      <SelectItem value="none">No Animation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Placement Selection */}
                <div>
                  <Label className="font-bold text-[#5D4E37] mb-3 block">
                    📍 Ad Placements (Select All That Apply)
                  </Label>
                  <div className="space-y-2">
                    {[
                      { id: 'hero_banner', name: 'Hero Banner', icon: '🎯', desc: 'Full-width top section' },
                      { id: 'product_grid', name: 'Product Grid', icon: '📦', desc: 'Among product listings' },
                      { id: 'sidebar', name: 'Sidebar', icon: '📌', desc: 'Side panel ads' },
                      { id: 'inline', name: 'Inline', icon: '📄', desc: 'Between content' },
                    ].map((placement) => {
                      const isSelected = adData.placements?.includes(placement.id as any);
                      
                      return (
                        <button
                          key={placement.id}
                          onClick={() => {
                            const current = adData.placements || [];
                            const updated = isSelected
                              ? current.filter(p => p !== placement.id)
                              : [...current, placement.id as any];
                            setAdData({ ...adData, placements: updated });
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300 bg-white'
                          }`}
                        >
                          <Checkbox checked={isSelected} className="pointer-events-none" />
                          <span className="text-2xl">{placement.icon}</span>
                          <div className="flex-1 text-left">
                            <p className="font-bold text-[#5D4E37]">{placement.name}</p>
                            <p className="text-xs text-[#5D4E37]/70">{placement.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <Label className="font-bold text-[#5D4E37] mb-2 block">
                    🎯 Ad Priority (Higher shows first)
                  </Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={adData.priority}
                      onChange={(e) => setAdData({ ...adData, priority: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <Badge className="text-lg px-3 py-1">{adData.priority}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button onClick={handleBack} variant="outline" size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              >
                Continue to Launch
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-black text-[#5D4E37]">
                  🚀 Launch Your Campaign!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
                  <div>
                    <Label className="font-bold text-[#5D4E37]">
                      Make Available to Influencers
                    </Label>
                    <p className="text-sm text-[#5D4E37]/70">
                      Let influencers promote your ad and earn commission
                    </p>
                  </div>
                  <Switch
                    checked={adData.availableToInfluencers}
                    onCheckedChange={(checked) =>
                      setAdData({ ...adData, availableToInfluencers: checked })
                    }
                  />
                </div>

                {adData.availableToInfluencers && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Label className="font-bold text-[#5D4E37]">
                      Influencer Commission Rate (%)
                    </Label>
                    <Input
                      type="number"
                      value={adData.influencerCommission?.rate}
                      onChange={(e) => setAdData({
                        ...adData,
                        influencerCommission: {
                          ...adData.influencerCommission!,
                          rate: parseInt(e.target.value) || 0
                        }
                      })}
                      className="mt-2"
                      min={0}
                      max={50}
                    />
                    <p className="text-xs text-[#5D4E37]/70 mt-1">
                      Influencers earn this percentage on sales they drive
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handlePublish('draft')}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    disabled={loading}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handlePublish('active')}
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-5 w-5" />
                        Publish Ad
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-start">
              <Button onClick={handleBack} variant="outline" size="lg">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
