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
  Heart,
  Star,
  Trophy
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

const InfluencerProgramAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="influencer-tiers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-3 h-full"
          >
            {['Seed', 'Sprout', 'Bloom'].map((tier, i) => (
              <motion.div
                key={tier}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.2, type: 'spring' }}
                className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center justify-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                  className={`w-12 h-12 rounded-full mb-2 ${
                    i === 0 ? 'bg-green-500' : i === 1 ? 'bg-blue-500' : 'bg-purple-500'
                  } flex items-center justify-center`}
                >
                  <Users className="h-6 w-6 text-white" />
                </motion.div>
                <span className="font-bold text-sm">{tier}</span>
                <span className="text-xs text-gray-500">{5 + i * 5}%</span>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="collaboration"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-full"
          >
            <motion.div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full blur-xl opacity-50"
              />
              <div className="relative bg-gradient-to-r from-pink-600 to-rose-600 p-8 rounded-2xl">
                <Share2 className="h-16 w-16 text-white" />
              </div>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-4 right-4 bg-green-500 px-4 py-2 rounded-full"
            >
              <span className="text-white font-bold">+500 XP!</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsProfileAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="settings-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { icon: <Store className="h-8 w-8" />, label: 'Store Info', color: 'blue' },
              { icon: <Bell className="h-8 w-8" />, label: 'Notifications', color: 'yellow' },
              { icon: <CreditCard className="h-8 w-8" />, label: 'Payment', color: 'green' },
              { icon: <Users className="h-8 w-8" />, label: 'Team', color: 'purple' }
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
                className={`bg-gradient-to-br from-${item.color}-50 to-${item.color}-100 p-6 rounded-xl shadow-md flex flex-col items-center gap-2`}
              >
                <div className={`text-${item.color}-600`}>{item.icon}</div>
                <span className="font-semibold text-sm">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="profile-complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 rounded-full mb-4"
            >
              <CheckCircle className="h-16 w-16 text-white" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-gray-900"
            >
              Profile 100% Complete!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PaymentsPayoutsAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="money-flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-full gap-4"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-2xl"
            >
              <DollarSign className="h-12 w-12 text-white" />
            </motion.div>
            <motion.div
              animate={{ x: [-20, 20, -20] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-4xl"
            >
              →
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-gradient-to-r from-amber-600 to-yellow-600 p-6 rounded-2xl"
            >
              <CreditCard className="h-12 w-12 text-white" />
            </motion.div>
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="earnings"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-6xl font-black text-green-600 mb-4"
            >
              R12,450
            </motion.div>
            <p className="text-xl font-bold text-amber-900">Available Balance</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="mt-4 bg-green-500 px-6 py-3 rounded-full"
            >
              <span className="text-white font-bold">Request Payout</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const BrowseShopAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="product-cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-3 gap-3 h-full"
          >
            {[1, 2, 3].map((product, i) => (
              <motion.div
                key={product}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.15, type: 'spring' }}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="bg-gradient-to-br from-green-400 to-emerald-500 h-20" />
                <div className="p-2 space-y-1">
                  <div className="h-2 bg-gray-200 rounded" />
                  <div className="h-2 bg-gray-200 rounded w-2/3" />
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="h-6 bg-green-500 rounded mt-2"
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="cart"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-full"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-10 rounded-2xl">
                <ShoppingCart className="h-20 w-20 text-white" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-10 h-10 flex items-center justify-center"
              >
                <span className="text-white text-lg font-bold">3</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AIAdvisorsAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="ai-chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {['Hello! How can I help?', 'What strain works for anxiety?', 'I recommend Blue Dream...'].map((msg, i) => (
              <motion.div
                key={i}
                initial={{ x: i % 2 === 0 ? -100 : 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.4 }}
                className={`p-3 rounded-lg ${
                  i % 2 === 0 ? 'bg-purple-600 text-white ml-8' : 'bg-white shadow-md mr-8'
                }`}
              >
                <p className="text-sm">{msg}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="ai-brain"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-full"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-purple-400 rounded-full blur-2xl opacity-50" />
              <div className="relative bg-gradient-to-r from-violet-600 to-purple-600 p-10 rounded-full">
                <Brain className="h-16 w-16 text-white" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CreatorLabAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="design-tools"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-full gap-4"
          >
            {[Palette, Sparkles, Heart].map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.2, type: 'spring' }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="bg-gradient-to-br from-pink-500 to-fuchsia-500 p-6 rounded-xl shadow-xl cursor-pointer"
              >
                <Icon className="h-12 w-12 text-white" />
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="tshirt"
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="flex items-center justify-center h-full"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-white p-8 rounded-2xl shadow-2xl"
              >
                <div className="w-32 h-32 bg-gradient-to-br from-pink-400 via-fuchsia-400 to-purple-400 rounded-lg" />
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-2 -right-2 bg-yellow-500 p-2 rounded-full"
              >
                <Sparkles className="h-6 w-6 text-white" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrdersTrackingAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="order-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {['Processing', 'Shipped', 'Out for Delivery'].map((status, i) => (
              <motion.div
                key={status}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.2 }}
                className="bg-white p-4 rounded-lg shadow-md flex items-center gap-3"
              >
                <motion.div
                  animate={{ rotate: i === 0 ? 360 : 0 }}
                  transition={{ repeat: i === 0 ? Infinity : 0, duration: 2 }}
                  className={`p-2 rounded-full ${
                    i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-blue-500' : 'bg-green-500'
                  }`}
                >
                  <Package className="h-5 w-5 text-white" />
                </motion.div>
                <div className="flex-1">
                  <p className="font-bold text-sm">{status}</p>
                  <p className="text-xs text-gray-500">Order #12{i + 1}34</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="tracking-map"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-full"
          >
            <div className="relative w-48 h-48">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 bg-teal-500 rounded-full opacity-20"
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
                className="absolute inset-4 bg-cyan-500 rounded-full opacity-30"
              />
              <div className="absolute inset-8 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-full flex items-center justify-center">
                <MapPin className="h-16 w-16 text-white" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TripleSClubAnimation = ({ step }: { step: number }) => {
  return (
    <div className="relative w-full h-64 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="perks"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { icon: <Gift className="h-8 w-8" />, label: 'Rewards', color: 'red' },
              { icon: <Star className="h-8 w-8" />, label: 'Points', color: 'yellow' },
              { icon: <Trophy className="h-8 w-8" />, label: 'Events', color: 'purple' },
              { icon: <Crown className="h-8 w-8" />, label: 'VIP', color: 'orange' }
            ].map((perk, i) => (
              <motion.div
                key={perk.label}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
                className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-lg border-2 border-yellow-400 flex flex-col items-center gap-2"
              >
                <div className="text-yellow-600">{perk.icon}</div>
                <span className="font-bold text-sm">{perk.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {step === 1 && (
          <motion.div
            key="vip-badge"
            initial={{ opacity: 0, scale: 0.3, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="flex items-center justify-center h-full"
          >
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(251, 191, 36, 0.7)',
                  '0 0 0 30px rgba(251, 191, 36, 0)',
                ]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 p-12 rounded-full"
            >
              <Crown className="h-20 w-20 text-white" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="absolute top-4 bg-purple-600 px-6 py-3 rounded-full"
            >
              <span className="text-white font-black text-xl">VIP UNLOCKED!</span>
            </motion.div>
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
  },
  'influencer-program': {
    color: 'from-pink-600 to-rose-600',
    icon: <Users className="h-8 w-8" />,
    AnimationComponent: InfluencerProgramAnimation,
    steps: [
      {
        title: 'Understanding Influencer Tiers',
        description: 'Influencers are organized into tiers (Seed, Sprout, Growth, Bloom, Forest) based on their performance. Each tier earns a different commission rate, ranging from 5% to 20% of your platform commission.',
        animation: <InfluencerProgramAnimation step={0} />,
        tips: [
          'Higher tier influencers have larger audiences',
          'Bloom and Forest tiers drive the most sales',
          'Offer higher ad bonuses to attract top influencers'
        ],
        proTip: 'Partner with micro-influencers (Seed/Sprout) for niche products - they often have more engaged audiences!'
      },
      {
        title: 'Enabling Influencer Promotion',
        description: 'When creating ads, toggle "Available to Influencers" and set your ad bonus rate (0-5%). This bonus is added to the influencer\'s base commission, making your products more attractive to promote.',
        animation: <InfluencerProgramAnimation step={1} />,
        tips: [
          'Set 3-5% ad bonus for competitive offers',
          'Track which influencers perform best',
          'Feature top products for influencer promotion'
        ],
        proTip: 'Influencer-driven sales convert 40% better than regular ads because of the trust factor!'
      },
      {
        title: 'Building Long-Term Partnerships',
        description: 'Create exclusive deals for top-performing influencers, provide them with unique promo codes, and collaborate on special product bundles. Strong influencer relationships = consistent sales!',
        animation: <InfluencerProgramAnimation step={1} />,
        tips: [
          'Communicate regularly with your influencers',
          'Share product samples for authentic reviews',
          'Celebrate their milestones and successes'
        ],
        proTip: 'Exclusive ambassador programs with top influencers can increase your revenue by 200%!'
      }
    ]
  },
  'settings-profile': {
    color: 'from-slate-600 to-gray-600',
    icon: <Settings className="h-8 w-8" />,
    AnimationComponent: SettingsProfileAnimation,
    steps: [
      {
        title: 'Completing Your Dispensary Profile',
        description: 'A complete profile builds trust! Add your business name, logo, description, operating hours, contact info, and verification documents. The more complete your profile, the more professional you appear.',
        animation: <SettingsProfileAnimation step={0} />,
        tips: [
          'Use a high-quality logo',
          'Write a compelling "About Us" story',
          'Add professional photos of your store'
        ],
        proTip: 'Complete profiles get 60% more customer trust and higher conversion rates!'
      },
      {
        title: 'Configuring Notifications',
        description: 'Stay on top of your business with smart notifications! Enable alerts for new orders, low stock, customer messages, payout updates, and review requests. Never miss a critical update!',
        animation: <SettingsProfileAnimation step={1} />,
        tips: [
          'Enable push notifications for instant alerts',
          'Set quiet hours to avoid late-night pings',
          'Prioritize order and payment notifications'
        ],
        proTip: 'Customize notification sounds for different event types to instantly know what needs attention!'
      },
      {
        title: 'Managing Team & Permissions',
        description: 'Add staff members with specific roles: Managers, Staff, or Drivers. Control what each team member can access and do. Perfect for delegating tasks while maintaining security!',
        animation: <SettingsProfileAnimation step={1} />,
        tips: [
          'Give managers full access except payouts',
          'Limit staff to order processing only',
          'Review team activity logs regularly'
        ],
        proTip: 'Proper team permissions prevent errors and protect sensitive business information!'
      }
    ]
  },
  'payments-payouts': {
    color: 'from-yellow-600 to-amber-600',
    icon: <CreditCard className="h-8 w-8" />,
    AnimationComponent: PaymentsPayoutsAnimation,
    steps: [
      {
        title: 'Understanding Your Earnings',
        description: 'View real-time earnings from public store sales and Product Pool transactions. Track pending amounts, available balance, and payout history. Know exactly where your money is at all times!',
        animation: <PaymentsPayoutsAnimation step={0} />,
        tips: [
          'Check earnings dashboard daily',
          'Understand the difference between pending and available',
          'Monitor Product Pool commissions separately'
        ],
        proTip: 'Platform takes 25% commission on public sales and 5% on Product Pool - factor this into your pricing!'
      },
      {
        title: 'Requesting Payouts',
        description: 'Once you reach the minimum payout threshold (R500), request a payout to your bank account. Payouts are processed within 3-5 business days. Set up automatic payouts for hands-free cash flow!',
        animation: <PaymentsPayoutsAnimation step={1} />,
        tips: [
          'Verify bank details before first payout',
          'Schedule payouts on specific days',
          'Keep records for tax purposes'
        ],
        proTip: 'Enable automatic payouts every Friday to maintain consistent cash flow!'
      },
      {
        title: 'Tracking Product Pool Commissions',
        description: 'Product Pool sales generate 5% commission for the platform, automatically deducted from your public store payouts. Monitor this balance to ensure you always have enough public sales to cover it!',
        animation: <PaymentsPayoutsAnimation step={1} />,
        tips: [
          'Balance Product Pool sales with public sales',
          'Set notifications if commission exceeds R1000',
          'Factor 5% into your wholesale prices'
        ],
        proTip: 'If Product Pool commission exceeds your public store earnings, you\'ll get a notification to balance your sales mix!'
      }
    ]
  },
  'browse-shop': {
    color: 'from-indigo-600 to-blue-600',
    icon: <Store className="h-8 w-8" />,
    AnimationComponent: BrowseShopAnimation,
    steps: [
      {
        title: 'Discovering Amazing Products',
        description: 'Browse thousands of wellness products across all categories! Use filters to narrow by dispensary type, price range, effects, and ratings. Find exactly what you need in seconds!',
        animation: <BrowseShopAnimation step={0} />,
        tips: [
          'Use the search bar for specific products',
          'Filter by "Top Rated" to see customer favorites',
          'Check dispensary profiles for verification'
        ],
        proTip: 'Follow your favorite dispensaries to get notified when they add new products!'
      },
      {
        title: 'Adding to Cart & Checkout',
        description: 'Found what you love? Add items to your cart, review your order, choose delivery or collection, and checkout securely. Track your order from warehouse to doorstep!',
        animation: <BrowseShopAnimation step={1} />,
        tips: [
          'Check for bundle deals to save money',
          'Compare shipping options for best rates',
          'Apply promo codes before payment'
        ],
        proTip: 'Shopping during dispensary sale events can save you 20-50% on premium products!'
      },
      {
        title: 'Leaving Reviews & Earning Points',
        description: 'After receiving your order, leave honest reviews to help other customers. Earn points for every review, which unlock rewards, discounts, and exclusive perks!',
        animation: <BrowseShopAnimation step={1} />,
        tips: [
          'Include photos in reviews for extra points',
          'Be detailed and honest',
          'Rate both product quality and service'
        ],
        proTip: 'Top reviewers get invited to exclusive product testing programs and earn free samples!'
      }
    ]
  },
  'ai-advisors': {
    color: 'from-violet-600 to-purple-600',
    icon: <Brain className="h-8 w-8" />,
    AnimationComponent: AIAdvisorsAnimation,
    steps: [
      {
        title: 'Meet Your AI Wellness Team',
        description: 'Chat with specialized AI advisors for FREE! Dr. Green (cannabis expert), Fungi Master (mushroom specialist), Root Healer (traditional medicine), and more. Get instant, personalized advice 24/7!',
        animation: <AIAdvisorsAnimation step={0} />,
        tips: [
          'Ask specific questions for better answers',
          'Try different advisors for varied perspectives',
          'Save helpful responses for later reference'
        ],
        proTip: 'Your first 3 messages with each advisor are completely FREE - no credits needed!'
      },
      {
        title: 'Getting Personalized Recommendations',
        description: 'Tell the AI about your needs, preferences, and goals. It analyzes thousands of products to recommend the perfect matches for you. Like having a wellness expert in your pocket!',
        animation: <AIAdvisorsAnimation step={1} />,
        tips: [
          'Share your experience level honestly',
          'Mention any allergies or sensitivities',
          'Ask about dosage and usage methods'
        ],
        proTip: 'The more you chat with AI advisors, the smarter they get about your preferences!'
      },
      {
        title: 'Learning & Growing',
        description: 'Use AI advisors to learn about strains, effects, terpenes, wellness practices, and more. They provide educational content, answer questions, and guide your wellness journey!',
        animation: <AIAdvisorsAnimation step={1} />,
        tips: [
          'Ask about the science behind effects',
          'Request beginner-friendly explanations',
          'Explore different wellness modalities'
        ],
        proTip: 'AI advisors stay updated with the latest research - ask them about new discoveries!'
      }
    ]
  },
  'creator-lab': {
    color: 'from-pink-600 to-fuchsia-600',
    icon: <Palette className="h-8 w-8" />,
    AnimationComponent: CreatorLabAnimation,
    steps: [
      {
        title: 'Designing Custom Apparel',
        description: 'Unleash your creativity! Choose from t-shirts, hoodies, hats, and more. Select cannabis-inspired artwork from our gallery or upload your own designs. Make it uniquely yours!',
        animation: <CreatorLabAnimation step={0} />,
        tips: [
          'Preview designs on different products',
          'Choose high-contrast colors for visibility',
          'Check size charts before ordering'
        ],
        proTip: 'Use the AI design generator to create completely original cannabis art in seconds!'
      },
      {
        title: 'AI-Powered Design Magic',
        description: 'No design skills? No problem! Describe what you want and our AI creates stunning, original cannabis-themed designs. Psychedelic patterns, minimalist logos, trippy art - anything you imagine!',
        animation: <CreatorLabAnimation step={1} />,
        tips: [
          'Be specific in your design prompts',
          'Generate multiple options to compare',
          'Combine AI designs with gallery art'
        ],
        proTip: 'Top-selling AI-generated designs get featured in our marketplace - earn royalties!'
      },
      {
        title: 'Publishing & Earning',
        description: 'Love your design? Publish it to the marketplace! When others buy your design, you earn royalties. Turn your creativity into passive income while spreading cannabis culture!',
        animation: <CreatorLabAnimation step={1} />,
        tips: [
          'Create trending, seasonal designs',
          'Promote your designs on social media',
          'Build a portfolio of popular styles'
        ],
        proTip: 'Top creators earn R5,000+ monthly from design royalties alone!'
      }
    ]
  },
  'orders-tracking': {
    color: 'from-teal-600 to-cyan-600',
    icon: <Package className="h-8 w-8" />,
    AnimationComponent: OrdersTrackingAnimation,
    steps: [
      {
        title: 'Managing Your Orders',
        description: 'View all your orders in one place! See order status (Processing, Shipped, Delivered), track packages in real-time, and get instant updates via notifications. Never wonder "where\'s my order?" again!',
        animation: <OrdersTrackingAnimation step={0} />,
        tips: [
          'Enable notifications for status updates',
          'Check estimated delivery dates',
          'Contact dispensary if issues arise'
        ],
        proTip: 'Orders with tracking numbers are 95% less likely to get lost!'
      },
      {
        title: 'Real-Time Package Tracking',
        description: 'Follow your package every step of the way! See when it leaves the warehouse, track the driver\'s location, and get notified when it\'s nearby. Know exactly when your wellness goodies arrive!',
        animation: <OrdersTrackingAnimation step={1} />,
        tips: [
          'Watch the map view for live updates',
          'Prepare to receive packages on time',
          'Rate delivery experience after arrival'
        ],
        proTip: 'PUDO locker deliveries let you pick up 24/7 - perfect for busy schedules!'
      },
      {
        title: 'Reviews & Reordering',
        description: 'Loved your order? Leave a detailed review with photos to help the community and earn points! Want more of the same? Use "Reorder" button to add previous favorites to your cart instantly!',
        animation: <OrdersTrackingAnimation step={1} />,
        tips: [
          'Review products within 7 days for double points',
          'Save favorites for easy reordering',
          'Report issues for quick resolution'
        ],
        proTip: 'Detailed reviews with photos earn 3x the points and unlock VIP perks faster!'
      }
    ]
  },
  'triple-s-club': {
    color: 'from-yellow-600 to-orange-600',
    icon: <Crown className="h-8 w-8" />,
    AnimationComponent: TripleSClubAnimation,
    steps: [
      {
        title: 'Unlocking Club Benefits',
        description: 'Join the exclusive Triple S Club (Seed, Sprout, Sage) to access premium perks! Earn points with every purchase, review, and interaction. Unlock tiers for bigger rewards, discounts, and VIP treatment!',
        animation: <TripleSClubAnimation step={0} />,
        tips: [
          'Track your points in the rewards dashboard',
          'Complete daily challenges for bonus points',
          'Refer friends to earn huge point bonuses'
        ],
        proTip: 'Reach Sage tier (highest) to unlock lifetime 20% discounts on all purchases!'
      },
      {
        title: 'Exclusive Events & Drops',
        description: 'Club members get first access to new products, limited drops, and special events! Attend virtual sessions, win giveaways, and connect with cannabis culture legends. Being a member has privileges!',
        animation: <TripleSClubAnimation step={1} />,
        tips: [
          'Set reminders for exclusive drop times',
          'Attend virtual events for bonus rewards',
          'Network with other club members'
        ],
        proTip: 'Club members get notified 24 hours before public product launches - never miss out!'
      },
      {
        title: 'VIP Status & Perks',
        description: 'Reach VIP status and enjoy priority customer support, free shipping on all orders, birthday bonuses, and exclusive merchandise. The ultimate wellness insider experience!',
        animation: <TripleSClubAnimation step={1} />,
        tips: [
          'Maintain activity to keep VIP status',
          'Use perks regularly to maximize value',
          'Combine club discounts with sale prices'
        ],
        proTip: 'VIP members save an average of R2,500 per year through exclusive perks and discounts!'
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
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl w-[90vw] max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${tutorial.color} text-white p-8 rounded-t-3xl sticky top-0 z-10 shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    {tutorial.icon}
                  </div>
                  <div>
                    <h2 className="text-3xl font-extrabold flex items-center gap-2">
                      Interactive Tutorial
                      <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                    </h2>
                    <p className="text-white/80 text-sm mt-1">Learn by doing! 🚀</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full p-3 border border-white/20"
                >
                  <X className="h-6 w-6" />
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
            <div className="p-8 overflow-y-auto flex-1">
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
            <div className="border-t-2 border-gray-200 p-6 flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-3xl shadow-inner">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="font-bold border-2 hover:scale-105 transition-all"
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
                className={`font-black bg-gradient-to-r ${tutorial.color} text-white hover:scale-105 transition-all shadow-lg border-2 border-white/20`}
              >
                {currentStep === tutorial.steps.length - 1 ? (
                  <>
                    Complete 🎉
                    <CheckCircle className="h-5 w-5 ml-2" />
                  </>
                ) : (
                  <>
                    Next Step
                    <ChevronRight className="h-5 w-5 ml-2" />
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
