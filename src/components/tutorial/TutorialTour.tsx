'use client';

import React, { useEffect, useState } from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { ConfettiExplosion } from './AnimatedComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Star, X, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TutorialStep {
  element?: string;
  popover?: {
    title?: string;
    description?: string;
    side?: string;
    align?: string;
  };
  chatMessage?: string;
  showPointer?: boolean;
  pointerDirection?: 'up' | 'down' | 'left' | 'right';
  onNext?: () => void;
}

interface TutorialTourProps {
  tutorialId: string;
  steps: TutorialStep[];
  onComplete?: () => void;
}

export function TutorialTour({ tutorialId, steps, onComplete }: TutorialTourProps) {
  const { completeTutorial, completeStep, skipTutorial, openLauncher } = useTutorial();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Only use the first step for the interactive tutorial
  const firstStep = steps[0];
  const tutorialSteps = firstStep ? [firstStep] : [];

  const handleComplete = () => {
    // Mark tutorial as complete
    completeStep(tutorialId, 0);
    completeTutorial(tutorialId);
    
    // Show completion modal
    setIsOpen(false);
    setShowCompletionModal(true);
    setShowConfetti(true);
    
    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    skipTutorial(tutorialId);
    setIsOpen(false);
  };

  const handleBackToTutorials = () => {
    setShowCompletionModal(false);
    openLauncher();
  };

  const handleContinue = () => {
    setShowCompletionModal(false);
  };

  if (tutorialSteps.length === 0) return null;

  return (
    <>
      {/* Modern Tutorial Dialog - White Background with Colorful Sections */}
      <AnimatePresence>
        {isOpen && firstStep && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99998]"
              onClick={handleSkip}
            />

            {/* Tutorial Dialog - Zoom from Center */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ 
                type: 'spring', 
                stiffness: 300, 
                damping: 25,
                duration: 0.4 
              }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                         w-[90vw] max-w-[600px] z-[99999]"
            >
              <Card className="bg-white rounded-3xl shadow-2xl border-2 border-purple-200 overflow-hidden">
                {/* Gradient Header Banner */}
                <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-6 relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkip}
                    className="absolute top-3 right-3 text-white hover:bg-white/20 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-white">
                        {firstStep.popover?.title || 'Let\'s Get Started!'}
                      </h2>
                      <p className="text-white/90 text-sm">Interactive Tutorial</p>
                    </div>
                  </motion.div>
                </div>

                {/* Content Section - White Background */}
                <div className="p-8 space-y-6">
                  {/* Description Card with Gradient Border */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-[2px] rounded-2xl">
                      <div className="bg-white rounded-2xl p-6">
                        <p className="text-gray-700 text-lg leading-relaxed">
                          {firstStep.popover?.description || 'Follow this guide to learn the basics.'}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Stats/Features Section */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl p-4 text-center border-2 border-purple-200">
                      <div className="text-3xl mb-1">🎯</div>
                      <p className="text-xs font-semibold text-purple-900">Quick</p>
                      <p className="text-xs text-purple-600">2 min</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl p-4 text-center border-2 border-pink-200">
                      <div className="text-3xl mb-1">⭐</div>
                      <p className="text-xs font-semibold text-pink-900">Earn</p>
                      <p className="text-xs text-pink-600">+100 pts</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-xl p-4 text-center border-2 border-red-200">
                      <div className="text-3xl mb-1">🚀</div>
                      <p className="text-xs font-semibold text-red-900">Level Up</p>
                      <p className="text-xs text-red-600">Beginner</p>
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <Button
                      onClick={handleComplete}
                      className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 
                                hover:from-purple-700 hover:via-pink-700 hover:to-red-700 
                                text-white font-bold py-6 text-lg rounded-xl shadow-lg 
                                hover:scale-105 transition-all"
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Got it!
                    </Button>
                    <Button
                      onClick={handleSkip}
                      variant="outline"
                      className="sm:w-auto border-2 border-gray-300 text-gray-700 
                                hover:bg-gray-100 font-semibold py-6 rounded-xl"
                    >
                      Skip Tutorial
                    </Button>
                  </motion.div>

                  {/* Help Text */}
                  <p className="text-center text-sm text-gray-500">
                    💡 Complete tutorials to earn points and unlock achievements
                  </p>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confetti on Completion */}
      <AnimatePresence>
        {showConfetti && <ConfettiExplosion />}
      </AnimatePresence>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletionModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001]"
              onClick={handleContinue}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-2xl z-[10002] p-6 md:p-8"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4"
                >
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </motion.div>

                <h2 className="text-3xl font-black text-white mb-2">
                  🎉 Tutorial Complete!
                </h2>
                <p className="text-white/90 text-lg mb-2">
                  Great job! You've mastered the basics.
                </p>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  <span className="text-white font-bold">+100 Points Earned!</span>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleBackToTutorials}
                    className="w-full bg-white text-green-600 hover:bg-white/90 font-bold py-6 text-lg rounded-xl shadow-lg"
                  >
                    📚 Continue Learning
                  </Button>
                  <Button
                    onClick={handleContinue}
                    variant="ghost"
                    className="w-full text-white hover:bg-white/10 font-semibold"
                  >
                    Continue to Dashboard
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
