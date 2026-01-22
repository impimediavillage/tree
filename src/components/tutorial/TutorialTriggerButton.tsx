'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Sparkles, X } from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';
import { Button } from '@/components/ui/button';

export function TutorialTriggerButton() {
  const { openLauncher, totalPoints, achievements } = useTutorial();
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasNewAchievement, setHasNewAchievement] = useState(false);

  React.useEffect(() => {
    // Check for new achievements
    const lastSeenCount = parseInt(localStorage.getItem('lastSeenAchievementCount') || '0', 10);
    if (achievements.length > lastSeenCount) {
      setHasNewAchievement(true);
    }
  }, [achievements.length]);

  const handleClick = () => {
    openLauncher();
    localStorage.setItem('lastSeenAchievementCount', achievements.length.toString());
    setHasNewAchievement(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9997]">
      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onHoverStart={() => setShowTooltip(true)}
        onHoverEnd={() => setShowTooltip(false)}
        className="relative"
      >
        <Button
          onClick={handleClick}
          className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl border-4 border-white relative overflow-hidden group"
        >
          {/* Animated Background Pulse */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full"
          />

          {/* Icon */}
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
            className="relative z-10"
          >
            <GraduationCap className="h-8 w-8 text-white" />
          </motion.div>

          {/* New Achievement Badge */}
          <AnimatePresence>
            {hasNewAchievement && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 z-20"
              >
                <div className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
                  !
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Points Badge */}
          {totalPoints > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute -bottom-1 -left-1 z-20"
            >
              <div className="bg-yellow-400 text-purple-900 text-xs font-black rounded-full px-2 py-1 border-2 border-white shadow-lg">
                ⭐ {totalPoints}
              </div>
            </motion.div>
          )}
        </Button>

        {/* Sparkle Effect */}
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          <Sparkles className="absolute top-0 right-0 h-4 w-4 text-yellow-300" />
          <Sparkles className="absolute bottom-0 left-0 h-4 w-4 text-pink-300" />
        </motion.div>

        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50 -z-10" />
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-20 bottom-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-xl whitespace-nowrap border-2 border-white"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-bold">
                {hasNewAchievement ? '🎉 New Achievement!' : 'Learn & Earn!'}
              </span>
            </div>
            <p className="text-xs mt-1">Click to start tutorials</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
