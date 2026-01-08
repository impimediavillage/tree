/**
 * 🏆 Achievement Toast - Trophy Rise with Fireworks
 * Shows when user reaches milestones
 */

'use client';

import { motion } from 'framer-motion';
import { Trophy, Award, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface AchievementToastProps {
  title: string;
  description: string;
  achievementType: 'order_milestone' | 'sales_milestone' | 'level_up' | 'first_order' | 'streak';
  xpGained?: number;
  levelReached?: number;
  actionUrl?: string;
  onDismiss?: () => void;
}

export function AchievementToast({
  title,
  description,
  achievementType,
  xpGained,
  levelReached,
  actionUrl,
  onDismiss,
}: AchievementToastProps) {
  const router = useRouter();

  const handleViewStats = () => {
    if (actionUrl) {
      router.push(actionUrl);
      onDismiss?.();
    }
  };

  const getAchievementIcon = () => {
    switch (achievementType) {
      case 'level_up': return <Crown className="h-10 w-10 text-yellow-300" />;
      case 'first_order': return <Award className="h-10 w-10 text-yellow-300" />;
      case 'streak': return <Zap className="h-10 w-10 text-yellow-300" />;
      default: return <Trophy className="h-10 w-10 text-yellow-300" />;
    }
  };

  return (
    <motion.div
      initial={{ scale: 0, y: 100, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0, y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      className="relative max-w-md w-full bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 shadow-2xl rounded-2xl pointer-events-auto overflow-hidden border-4 border-yellow-300"
      style={{
        boxShadow: '0 0 50px rgba(255, 215, 0, 0.6), 0 10px 50px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Radial Light Rays */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{
            background: 'repeating-conic-gradient(from 0deg, transparent 0deg 10deg, rgba(255, 215, 0, 0.1) 10deg 20deg)',
          }}
        />
      </div>

      {/* Firework Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: '50%', 
              y: '50%', 
              scale: 0,
              opacity: 1 
            }}
            animate={{
              x: `${50 + Math.cos((i * 360 / 20) * Math.PI / 180) * 100}%`,
              y: `${50 + Math.sin((i * 360 / 20) * Math.PI / 180) * 100}%`,
              scale: [0, 1, 0],
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.05,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: ['#FFD700', '#FFA500', '#FF6347', '#FF69B4'][i % 4],
            }}
          />
        ))}
      </div>

      <div className="relative p-6">
        <div className="flex flex-col items-center text-center">
          {/* Trophy Animation */}
          <motion.div
            initial={{ y: 100, scale: 0, rotate: -180 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            transition={{ 
              type: 'spring', 
              stiffness: 200,
              damping: 10,
              delay: 0.2 
            }}
            className="mb-4"
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 p-6 rounded-3xl shadow-2xl border-4 border-yellow-300">
                {getAchievementIcon()}
              </div>
              
              {/* Glow Effect */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-yellow-400 rounded-3xl blur-xl -z-10"
              />
            </motion.div>
          </motion.div>

          {/* Achievement Text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h3 className="text-2xl font-black text-[#3D2E17]">
              🎉 {title}
            </h3>
            <p className="text-sm text-[#5D4E37] font-semibold">
              {description}
            </p>
          </motion.div>

          {/* XP and Level Display */}
          {(xpGained || levelReached) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 flex gap-3 justify-center"
            >
              {xpGained && (
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full border-2 border-purple-300">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2, delay: 0.8 }}
                    className="flex items-center gap-1"
                  >
                    <Zap className="h-4 w-4 text-purple-600 fill-purple-600" />
                    <span className="text-sm font-black text-purple-600">+{xpGained} XP</span>
                  </motion.div>
                </div>
              )}
              
              {levelReached && (
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-full border-2 border-yellow-400">
                  <div className="flex items-center gap-1">
                    <Crown className="h-4 w-4 text-yellow-600 fill-yellow-600" />
                    <span className="text-sm font-black text-yellow-600">Level {levelReached}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 flex gap-2 w-full"
          >
            {actionUrl && (
              <Button
                onClick={handleViewStats}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-black shadow-lg"
                size="sm"
              >
                View Stats
              </Button>
            )}
            
            <Button
              onClick={onDismiss}
              variant="outline"
              size="sm"
              className={`${actionUrl ? '' : 'flex-1'} border-2 border-yellow-300 hover:bg-yellow-50 font-bold`}
            >
              Awesome!
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Gold Progress Bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 6, ease: 'linear' }}
        className="h-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 origin-left"
      />
    </motion.div>
  );
}
