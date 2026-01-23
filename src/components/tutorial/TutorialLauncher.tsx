'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorial } from '@/contexts/TutorialContext';
import {
  X,
  Play,
  CheckCircle,
  Lock,
  Star,
  Trophy,
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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  points: number;
  category: 'Core' | 'Advanced' | 'Pro Tips';
  prerequisites?: string[];
  userType?: 'dispensary' | 'leaf';
}

const DISPENSARY_TUTORIALS: Tutorial[] = [
  {
    id: 'product-management',
    title: 'Product Management',
    description: 'Learn how to add, edit, and manage your product catalog like a pro!',
    icon: <Package className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'Beginner',
    points: 100,
    category: 'Core',
  },
  {
    id: 'order-management',
    title: 'Order Management',
    description: 'Master order processing, fulfillment, and customer communication.',
    icon: <ShoppingCart className="h-6 w-6" />,
    duration: '6 min',
    difficulty: 'Beginner',
    points: 100,
    category: 'Core',
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Unlock powerful insights to grow your business with data-driven decisions.',
    icon: <BarChart3 className="h-6 w-6" />,
    duration: '7 min',
    difficulty: 'Intermediate',
    points: 150,
    category: 'Core',
  },
  {
    id: 'advertising',
    title: 'Advertising System',
    description: 'Create campaigns, set bonuses, and attract influencers to promote your products!',
    icon: <Megaphone className="h-6 w-6" />,
    duration: '8 min',
    difficulty: 'Intermediate',
    points: 150,
    category: 'Advanced',
  },
  {
    id: 'influencer-program',
    title: 'Influencer Collaboration',
    description: 'Learn how to work with influencers and maximize your ad ROI.',
    icon: <Users className="h-6 w-6" />,
    duration: '6 min',
    difficulty: 'Intermediate',
    points: 150,
    category: 'Advanced',
  },
  {
    id: 'settings-profile',
    title: 'Settings & Profile',
    description: 'Customize your dispensary profile, payment methods, and notifications.',
    icon: <Settings className="h-6 w-6" />,
    duration: '4 min',
    difficulty: 'Beginner',
    points: 100,
    category: 'Core',
  },
  {
    id: 'shipping-fulfillment',
    title: 'Shipping & Fulfillment',
    description: 'Set up shipping zones, rates, and learn efficient order fulfillment.',
    icon: <Truck className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'Intermediate',
    points: 125,
    category: 'Advanced',
  },
  {
    id: 'payments-payouts',
    title: 'Payments & Payouts',
    description: 'Understand your earnings, payouts, and financial tracking.',
    icon: <CreditCard className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'Intermediate',
    points: 125,
    category: 'Pro Tips',
  },
];

const LEAF_TUTORIALS: Tutorial[] = [
  {
    id: 'browse-shop',
    title: 'Browse & Shop',
    description: 'Discover how to find products, use filters, and shop like a pro!',
    icon: <Store className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'Beginner',
    points: 100,
    category: 'Core',
    userType: 'leaf',
  },
  {
    id: 'ai-advisors',
    title: 'AI Wellness Advisors',
    description: 'Chat with AI experts for free personalized cannabis and wellness advice!',
    icon: <Brain className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'Beginner',
    points: 100,
    category: 'Core',
    userType: 'leaf',
  },
  {
    id: 'creator-lab',
    title: 'The Creator Lab',
    description: 'Design custom apparel with cannabis-inspired art and AI-generated designs!',
    icon: <Palette className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'Intermediate',
    points: 125,
    category: 'Advanced',
    userType: 'leaf',
  },
  {
    id: 'orders-tracking',
    title: 'Orders & Tracking',
    description: 'Track your purchases, manage deliveries, and leave reviews!',
    icon: <Package className="h-6 w-6" />,
    duration: '4 min',
    difficulty: 'Beginner',
    points: 100,
    category: 'Core',
    userType: 'leaf',
  },
  {
    id: 'triple-s-club',
    title: 'Triple S Club',
    description: 'Unlock exclusive benefits, events, and VIP perks as a club member!',
    icon: <Crown className="h-6 w-6" />,
    duration: '6 min',
    difficulty: 'Intermediate',
    points: 150,
    category: 'Pro Tips',
    userType: 'leaf',
  },
];

const DIFFICULTY_COLORS = {
  Beginner: 'bg-green-500',
  Intermediate: 'bg-yellow-500',
  Advanced: 'bg-red-500',
};

interface TutorialLauncherProps {
  userType?: 'dispensary' | 'leaf';
}

export function TutorialLauncher({ userType = 'dispensary' }: TutorialLauncherProps) {
  const { showLauncher, closeLauncher, startTutorial, tutorialProgress, achievements, totalPoints } = useTutorial();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Core', 'Advanced', 'Pro Tips'];

  // Select tutorials based on user type
  const TUTORIALS = userType === 'leaf' ? LEAF_TUTORIALS : DISPENSARY_TUTORIALS;

  const filteredTutorials =
    selectedCategory === 'All'
      ? TUTORIALS
      : TUTORIALS.filter(t => t.category === selectedCategory);

  const completedCount = Object.values(tutorialProgress).filter(p => p.completed).length;
  const progressPercent = (completedCount / TUTORIALS.length) * 100;

  const isLocked = (tutorial: Tutorial) => {
    if (!tutorial.prerequisites || tutorial.prerequisites.length === 0) return false;
    return tutorial.prerequisites.some(
      prereq => !tutorialProgress[prereq]?.completed
    );
  };

  const handleStartTutorial = (tutorialId: string) => {
    startTutorial(tutorialId);
  };

  return (
    <AnimatePresence>
      {showLauncher && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={closeLauncher}
          />

          {/* Main Launcher */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[95vw] md:max-w-6xl h-full md:h-[90vh] bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-none md:rounded-3xl shadow-2xl z-[9999] overflow-hidden"
          >
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse delay-1000" />
              <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse delay-500" />
            </div>

            {/* Close Button */}
            <button
              onClick={closeLauncher}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Content Container */}
            <div className="relative h-full overflow-y-auto">
              {/* Header */}
              <div className="p-8 pb-6">
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-8"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400/20 rounded-full mb-4">
                    <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                    <span className="text-yellow-300 font-bold text-sm">INTERACTIVE LEARNING</span>
                  </div>
                  
                  <h1 className="text-5xl font-black text-white mb-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">
                    🎮 {userType === 'leaf' ? 'Wellness Explorer Academy' : 'Tutorial Academy'}
                  </h1>
                  <p className="text-xl text-purple-200 max-w-2xl mx-auto">
                    {userType === 'leaf' 
                      ? 'Master shopping, AI advisors, and exclusive club benefits!' 
                      : 'Master your dispensary dashboard with fun, interactive tutorials!'}
                  </p>
                </motion.div>

                {/* Stats Bar */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
                >
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-yellow-500 rounded-xl">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">{totalPoints}</p>
                        <p className="text-sm text-purple-200">Total Points</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-500 rounded-xl">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">
                          {completedCount}/{TUTORIALS.length}
                        </p>
                        <p className="text-sm text-purple-200">Completed</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-purple-500 rounded-xl">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-white">{achievements.length}</p>
                        <p className="text-sm text-purple-200">Achievements</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Progress Bar */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-semibold">Overall Progress</span>
                    <span className="text-white font-bold">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-3 bg-white/20" />
                </motion.div>
              </div>

              {/* Category Filter */}
              <div className="px-8 mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((category, index) => (
                    <motion.button
                      key={category}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg scale-105'
                          : 'bg-white/10 text-purple-200 hover:bg-white/20'
                      }`}
                    >
                      {category}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tutorials Grid */}
              <div className="px-8 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTutorials.map((tutorial, index) => {
                    const isCompleted = tutorialProgress[tutorial.id]?.completed;
                    const isTutorialLocked = isLocked(tutorial);
                    const progress = tutorialProgress[tutorial.id];

                    return (
                      <motion.div
                        key={tutorial.id}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className={`relative group ${
                          isTutorialLocked ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all hover:scale-105 hover:shadow-2xl">
                          {/* Icon & Status */}
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-4 rounded-xl ${
                              isCompleted
                                ? 'bg-green-500'
                                : isTutorialLocked
                                ? 'bg-gray-500'
                                : 'bg-gradient-to-br from-pink-500 to-purple-500'
                            }`}>
                              {isTutorialLocked ? (
                                <Lock className="h-6 w-6 text-white" />
                              ) : isCompleted ? (
                                <CheckCircle className="h-6 w-6 text-white" />
                              ) : (
                                tutorial.icon
                              )}
                            </div>
                            <Badge
                              className={`${DIFFICULTY_COLORS[tutorial.difficulty]} text-white border-0`}
                            >
                              {tutorial.difficulty}
                            </Badge>
                          </div>

                          {/* Content */}
                          <h3 className="text-xl font-bold text-white mb-2">
                            {tutorial.title}
                          </h3>
                          <p className="text-purple-200 text-sm mb-4 line-clamp-2">
                            {tutorial.description}
                          </p>

                          {/* Meta Info */}
                          <div className="flex items-center justify-between text-sm mb-4">
                            <span className="text-purple-300">⏱️ {tutorial.duration}</span>
                            <span className="text-yellow-300 font-bold">
                              ⭐ {tutorial.points} pts
                            </span>
                          </div>

                          {/* Progress Bar (if in progress) */}
                          {progress && !isCompleted && progress.completedSteps.length > 0 && (
                            <div className="mb-4">
                              <Progress
                                value={(progress.completedSteps.length / 10) * 100}
                                className="h-2 bg-white/20"
                              />
                              <p className="text-xs text-purple-300 mt-1">
                                Step {progress.currentStep + 1}/10
                              </p>
                            </div>
                          )}

                          {/* Action Button */}
                          <Button
                            onClick={() => handleStartTutorial(tutorial.id)}
                            disabled={isTutorialLocked}
                            className={`w-full ${
                              isCompleted
                                ? 'bg-green-600 hover:bg-green-700'
                                : isTutorialLocked
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                            } text-white font-bold`}
                          >
                            {isTutorialLocked ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Locked
                              </>
                            ) : isCompleted ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Replay
                              </>
                            ) : progress ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Continue
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Start Tutorial
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Locked Tooltip */}
                        {isTutorialLocked && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/80 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              Complete prerequisites first
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Achievements Section */}
              {achievements.length > 0 && (
                <div className="px-8 pb-8">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      <Trophy className="h-6 w-6 text-yellow-400" />
                      Your Achievements
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {achievements.map((achievement, index) => (
                        <motion.div
                          key={achievement.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.8 + index * 0.1, type: 'spring' }}
                          className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-yellow-400/50 text-center"
                        >
                          <div className="text-4xl mb-2">{achievement.icon}</div>
                          <p className="text-white font-bold text-sm mb-1">
                            {achievement.title}
                          </p>
                          <p className="text-purple-300 text-xs">
                            {achievement.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
