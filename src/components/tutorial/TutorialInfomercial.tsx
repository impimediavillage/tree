'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Sparkles,
  Package,
  ShoppingCart,
  BarChart3,
  Megaphone,
  Settings,
  Users,
  CreditCard,
  Truck,
  Store,
  Brain,
  Palette,
  Crown,
  Plus,
  Edit,
  Eye,
  Search,
  Filter,
  TrendingUp,
  Target,
  Share2,
  Bell,
  MapPin,
  DollarSign,
  Gift,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';

interface TutorialInfomercialProps {
  tutorialId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface Step {
  title: string;
  description: string;
  animation: React.ReactNode;
  tips?: string[];
  proTip?: string;
}

// Animation Components for each tutorial
const ProductManagementAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="add-product"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-white p-8 rounded-xl shadow-2xl"
            >
              <Package className="h-16 w-16 text-purple-600 mb-4" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-2 -right-2 bg-green-500 rounded-full p-2"
              >
                <Plus className="h-6 w-6 text-white" />
              </motion.div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-purple-900 mt-4"
            >
              Click "Add Product" to start!
            </motion.p>
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="fill-form"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="space-y-4"
          >
            {['Product Name', 'Description', 'Price', 'Stock'].map((field, i) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="bg-white p-3 rounded-lg shadow flex items-center gap-3"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ delay: i * 0.2 + 0.5, duration: 0.5 }}
                  className="w-3 h-3 bg-green-500 rounded-full"
                />
                <span className="font-semibold text-gray-700">{field}</span>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: i * 0.2 + 0.3, duration: 0.8 }}
                  className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full ml-auto"
                  style={{ maxWidth: '120px' }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 2 && (
          <motion.div
            key="product-live"
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex items-center justify-center h-full"
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(168, 85, 247, 0.4)',
                  '0 0 0 20px rgba(168, 85, 247, 0)',
                  '0 0 0 0 rgba(168, 85, 247, 0)'
                ]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 p-12 rounded-2xl"
            >
              <Eye className="h-20 w-20 text-white" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute top-4 right-4 bg-green-500 px-4 py-2 rounded-full"
            >
              <span className="text-white font-bold">LIVE!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrderManagementAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="new-order"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-white p-6 rounded-xl shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <ShoppingCart className="h-10 w-10 text-blue-600" />
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="bg-red-500 rounded-full w-6 h-6 flex items-center justify-center"
                >
                  <span className="text-white text-xs font-bold">3</span>
                </motion.div>
              </div>
              <p className="text-lg font-bold text-blue-900">New Orders Arriving!</p>
            </motion.div>
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="process-order"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {['Review Order', 'Confirm Payment', 'Prepare Items', 'Ship'].map((action, i) => (
              <motion.div
                key={action}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.3 }}
                className="bg-white p-4 rounded-lg shadow-md flex items-center gap-3"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.3 + 0.2 }}
                  className="bg-green-500 rounded-full p-1"
                >
                  <CheckCircle className="h-5 w-5 text-white" />
                </motion.div>
                <span className="font-semibold">{action}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnalyticsAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="charts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-4 h-full"
          >
            {[1, 2, 3, 4].map((chart, i) => (
              <motion.div
                key={chart}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
                className="bg-white p-4 rounded-lg shadow-lg"
              >
                <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: i * 0.1 + 0.5, duration: 1 }}
                  className="h-2 bg-gradient-to-r from-green-400 to-emerald-600 rounded-full"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 rounded-full"
            >
              <TrendingUp className="h-16 w-16 text-white" />
            </motion.div>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-green-900 mt-4"
            >
              Revenue Up 45%!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Tutorial Content Definitions
const TUTORIAL_CONTENT: Record<string, { steps: Step[], color: string, icon: React.ReactNode, AnimationComponent: React.ComponentType<{ step: number }> }> = {
  'product-management': {
    color: 'from-purple-600 to-pink-600',
    icon: <Package className="h-8 w-8" />,
    AnimationComponent: ProductManagementAnimation,
    steps: [
      {
        title: 'Adding Your First Product',
        description: 'Navigate to Products → Add New Product. Fill in the essential details: name, description, price, and stock quantity. Don\'t forget to upload high-quality images!',
        animation: <ProductManagementAnimation step={0} />,
        tips: [
          'Use clear, descriptive names',
          'Include detailed product descriptions',
          'Add multiple high-quality images from different angles'
        ],
        proTip: 'Set up bulk pricing tiers to encourage larger orders and increase average order value!'
      },
      {
        title: 'Product Information Best Practices',
        description: 'The more detail you provide, the better! Include strain type, THC/CBD percentages, effects, flavors, and usage recommendations. This builds trust and helps customers make informed decisions.',
        animation: <ProductManagementAnimation step={1} />,
        tips: [
          'Be transparent about product specifications',
          'Use keywords customers search for',
          'Update stock levels in real-time'
        ],
        proTip: 'Products with complete information convert 3x better than incomplete listings!'
      },
      {
        title: 'Making Products Live',
        description: 'Once you\'ve filled in all the details, click "Publish" to make your product visible to customers. You can always edit or hide products later from your product dashboard.',
        animation: <ProductManagementAnimation step={2} />,
        tips: [
          'Preview your product before publishing',
          'Set appropriate visibility (public/pool)',
          'Monitor performance after launch'
        ],
        proTip: 'Schedule product launches during peak traffic hours for maximum visibility!'
      }
    ]
  },
  'order-management': {
    color: 'from-blue-600 to-cyan-600',
    icon: <ShoppingCart className="h-8 w-8" />,
    AnimationComponent: OrderManagementAnimation,
    steps: [
      {
        title: 'Receiving New Orders',
        description: 'When a customer places an order, you\'ll receive instant notifications. Check your Orders dashboard to see all pending orders that need your attention.',
        animation: <OrderManagementAnimation step={0} />,
        tips: [
          'Enable push notifications for real-time alerts',
          'Check orders multiple times daily',
          'Respond to customers within 1 hour'
        ],
        proTip: 'Fast response times increase customer satisfaction by 80%!'
      },
      {
        title: 'Processing Orders Efficiently',
        description: 'Review order details → Confirm payment → Prepare items → Update shipping status. Keep customers informed at every step with automated notifications.',
        animation: <OrderManagementAnimation step={1} />,
        tips: [
          'Use order tags to organize by priority',
          'Print packing slips for accuracy',
          'Double-check addresses before shipping'
        ],
        proTip: 'Batch similar orders together to save time on packing!'
      },
      {
        title: 'Shipping & Fulfillment',
        description: 'Choose from multiple shipping options: your own drivers, PUDO lockers, or The Courier Guy. Add tracking information so customers can follow their order in real-time.',
        animation: <OrderManagementAnimation step={1} />,
        tips: [
          'Always add tracking numbers',
          'Pack items securely and discreetly',
          'Include a thank-you note for personal touch'
        ],
        proTip: 'Offer free shipping on orders over a threshold to increase average cart value!'
      }
    ]
  },
  'analytics': {
    color: 'from-green-600 to-emerald-600',
    icon: <BarChart3 className="h-8 w-8" />,
    AnimationComponent: AnalyticsAnimation,
    steps: [
      {
        title: 'Understanding Your Dashboard',
        description: 'Your analytics dashboard shows key metrics: total sales, revenue, top products, customer demographics, and traffic sources. Use these insights to make data-driven decisions.',
        animation: <AnalyticsAnimation step={0} />,
        tips: [
          'Check analytics weekly to spot trends',
          'Compare performance month-over-month',
          'Identify your best-selling products'
        ],
        proTip: 'Use the date range filter to compare seasonal performance!'
      },
      {
        title: 'Growing with Data Insights',
        description: 'Identify which products generate the most revenue, which marketing channels drive traffic, and when your peak sales hours are. Adjust your strategy based on these insights.',
        animation: <AnalyticsAnimation step={1} />,
        tips: [
          'Stock up on best-sellers before they run out',
          'Promote underperforming products with ads',
          'Schedule posts during peak engagement times'
        ],
        proTip: 'Set up weekly automated reports to track progress without manual checking!'
      },
      {
        title: 'Setting and Achieving Goals',
        description: 'Use the goal-setting feature to track revenue targets, customer acquisition, and product performance. The system will alert you when you\'re on track or falling behind.',
        animation: <AnalyticsAnimation step={1} />,
        tips: [
          'Set realistic monthly revenue goals',
          'Track customer retention rates',
          'Monitor your conversion rate'
        ],
        proTip: 'Break down annual goals into weekly targets for easier tracking!'
      }
    ]
  },
  'advertising': {
    color: 'from-orange-600 to-red-600',
    icon: <Megaphone className="h-8 w-8" />,
    AnimationComponent: OrderManagementAnimation,
    steps: [
      {
        title: 'Creating Your First Campaign',
        description: 'Navigate to Advertising → Create New Ad. Choose your ad type: Special Deal, Featured Product, Bundle, or Social Campaign. Set your budget and duration.',
        animation: <OrderManagementAnimation step={0} />,
        tips: [
          'Start with a small budget to test',
          'Use eye-catching images',
          'Write compelling ad copy'
        ],
        proTip: 'Social Campaigns with influencer collaboration see 5x better ROI!'
      },
      {
        title: 'Setting Influencer Bonuses',
        description: 'Enable influencer promotion and set an ad bonus rate (0-5% of platform commission). Higher bonuses attract top-tier influencers who can drive massive traffic to your products.',
        animation: <OrderManagementAnimation step={1} />,
        tips: [
          'Start with 3% bonus for competitive offers',
          'Increase bonuses for premium products',
          'Monitor which influencers perform best'
        ],
        proTip: 'A 5% ad bonus can attract Diamond-tier influencers with huge followings!'
      },
      {
        title: 'Tracking Campaign Performance',
        description: 'Monitor impressions, clicks, conversions, and ROI in real-time. Pause underperforming ads and boost successful ones. Analyze which placements and audiences work best.',
        animation: <OrderManagementAnimation step={1} />,
        tips: [
          'Check campaign metrics daily',
          'A/B test different ad creatives',
          'Adjust budgets based on performance'
        ],
        proTip: 'Hero banner ads get 3x more visibility than product grid placements!'
      }
    ]
  },
  'shipping-fulfillment': {
    color: 'from-indigo-600 to-purple-600',
    icon: <Truck className="h-8 w-8" />,
    AnimationComponent: OrderManagementAnimation,
    steps: [
      {
        title: 'Setting Up Shipping Options',
        description: 'Configure multiple shipping methods: In-house delivery team, PUDO lockers, The Courier Guy, or customer collection. Set rates and delivery zones for each method.',
        animation: <OrderManagementAnimation step={0} />,
        tips: [
          'Offer 3+ shipping options for flexibility',
          'Calculate rates based on weight/distance',
          'Set realistic delivery timeframes'
        ],
        proTip: 'Free collection options reduce your costs and attract budget-conscious customers!'
      },
      {
        title: 'Building Your Driver Team',
        description: 'Hire and manage your own delivery drivers directly in the platform. Assign orders, track deliveries in real-time, and manage driver schedules all in one place.',
        animation: <OrderManagementAnimation step={1} />,
        tips: [
          'Verify driver licenses and insurance',
          'Set delivery radius limits',
          'Track driver performance metrics'
        ],
        proTip: 'Your own driver team gives you complete control and faster deliveries!'
      },
      {
        title: 'PUDO & Courier Integration',
        description: 'Connect with PUDO lockers for convenient pickup points and The Courier Guy for professional door-to-door service. Real-time rate calculations and tracking included!',
        animation: <OrderManagementAnimation step={1} />,
        tips: [
          'PUDO is cost-effective for bulk orders',
          'Courier Guy is best for premium service',
          'Always provide tracking information'
        ],
        proTip: 'Locker-to-locker shipping can be up to 40% cheaper than door-to-door!'
      }
    ]
  }
};

export function TutorialInfomercial({ tutorialId, isOpen, onClose, onComplete }: TutorialInfomercialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const tutorial = TUTORIAL_CONTENT[tutorialId];
  
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!tutorial) {
    return null;
  }

  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;
  const currentStepData = tutorial.steps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete the tutorial
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        onComplete();
        onClose();
      }, 1500);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${tutorial.color} text-white p-6 rounded-t-2xl sticky top-0 z-10`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {tutorial.icon}
                  <h2 className="text-2xl font-black">Interactive Tutorial</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Step {currentStep + 1} of {tutorial.steps.length}</span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2 bg-white/30" />
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Step Title */}
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 mb-3 flex items-center gap-2">
                      <Sparkles className="h-8 w-8 text-yellow-500" />
                      {currentStepData.title}
                    </h3>
                    <p className="text-lg text-gray-700 leading-relaxed">
                      {currentStepData.description}
                    </p>
                  </div>

                  {/* Animation */}
                  <tutorial.AnimationComponent step={currentStep} />

                  {/* Tips */}
                  {currentStepData.tips && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Quick Tips:
                      </h4>
                      <ul className="space-y-2">
                        {currentStepData.tips.map((tip, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-2 text-blue-800"
                          >
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{tip}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Pro Tip */}
                  {currentStepData.proTip && (
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-5"
                    >
                      <h4 className="font-black text-purple-900 mb-2 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        Pro Tip:
                      </h4>
                      <p className="text-purple-800 font-semibold">
                        {currentStepData.proTip}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="border-t border-gray-200 p-6 flex items-center justify-between bg-gray-50 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="font-bold"
              >
                <ChevronLeft className="h-5 w-5 mr-1" />
                Previous
              </Button>
              
              <div className="flex gap-2">
                {tutorial.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full transition-all ${
                      i === currentStep ? 'bg-purple-600 w-8' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                className={`font-black bg-gradient-to-r ${tutorial.color} text-white`}
              >
                {currentStep === tutorial.steps.length - 1 ? (
                  <>
                    Complete
                    <CheckCircle className="h-5 w-5 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
