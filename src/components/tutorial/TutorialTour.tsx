'use client';

import React, { useEffect, useState } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTutorial } from '@/contexts/TutorialContext';
import { ChatBubble, AnimatedPointer, SpotlightOverlay, ConfettiExplosion } from './AnimatedComponents';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TutorialStep extends DriveStep {
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
  const [driverInstance, setDriverInstance] = useState<any>(null);

  // Only use the first step for the interactive tutorial
  const firstStep = steps[0];
  const tutorialSteps = firstStep ? [firstStep] : [];

  useEffect(() => {
    if (tutorialSteps.length === 0) return;

    // Configure Driver.js with custom styling - ONLY FIRST STEP
    const driverConfig: Config = {
      showProgress: false, // Hide progress since we only show first step
      nextBtnText: '✅ Got it!',
      doneBtnText: '✅ Complete Tutorial',
      showButtons: ['next', 'close'],
      animate: true,
      
      steps: [{
        element: firstStep.element,
        popover: {
          title: firstStep.popover?.title || 'Let\'s Get Started!',
          description: firstStep.popover?.description || '',
          side: firstStep.popover?.side || 'bottom',
          align: firstStep.popover?.align || 'center',
          showButtons: ['next', 'close'],
          popoverClass: 'tutorial-popover-custom',
        },
      }],

      onDestroyStarted: () => {
        // CRITICAL: Always mark tutorial as complete when user finishes
        completeStep(tutorialId, 0);
        completeTutorial(tutorialId);
        
        // ALWAYS show completion modal for ALL tutorials
        setShowCompletionModal(true);
        setShowConfetti(true);
        
        setTimeout(() => {
          setShowConfetti(false);
        }, 3000);

        if (onComplete) onComplete();
        
        // Clean up driver instance
        if (driverInstance) {
          driverInstance.destroy();
        }
        
        return true;
      },

      onHighlightStarted: (element) => {
        // Smooth scroll to element
        element?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      },

      onPopoverRender: (popover, options) => {
        // Make popover centered and prominent on desktop, responsive on mobile
        const popoverEl = popover.wrapper;
        if (popoverEl) {
          // Add centered class immediately for CSS targeting
          popoverEl.classList.add('tutorial-centered');
          
          // Force center positioning on desktop
          // Using requestAnimationFrame to ensure Driver.js styles are applied first
          requestAnimationFrame(() => {
            const isDesktop = window.innerWidth >= 768;
            
            if (isDesktop) {
              // CRITICAL: Remove ALL Driver.js positioning first
              popoverEl.style.removeProperty('inset');
              popoverEl.style.removeProperty('top');
              popoverEl.style.removeProperty('bottom');
              popoverEl.style.removeProperty('left');
              popoverEl.style.removeProperty('right');
              popoverEl.style.removeProperty('transform');
              popoverEl.style.removeProperty('margin');
              
              // Then apply centered positioning (CSS !important will take over)
              popoverEl.style.position = 'fixed';
              popoverEl.style.top = '50%';
              popoverEl.style.left = '50%';
              popoverEl.style.right = 'auto';
              popoverEl.style.bottom = 'auto';
              popoverEl.style.transform = 'translate(-50%, -50%)';
              popoverEl.style.margin = '0';
              popoverEl.style.maxWidth = '500px';
              popoverEl.style.width = '90vw';
            } else {
              // Mobile: Keep responsive
              popoverEl.style.maxWidth = '90vw';
            }
            
            popoverEl.style.zIndex = '10000';
          });
        }
      },
    };

    const driverObj = driver(driverConfig);
    setDriverInstance(driverObj);
    driverObj.drive();

    return () => {
      if (driverObj) {
        driverObj.destroy();
      }
    };
  }, [tutorialId, completeTutorial, completeStep, onComplete]);

  const handleBackToTutorials = () => {
    setShowCompletionModal(false);
    openLauncher();
  };

  const handleContinue = () => {
    setShowCompletionModal(false);
  };

  return (
    <>
      {/* Custom Chat Bubble */}
      {firstStep?.chatMessage && (
        <ChatBubble
          message={firstStep.chatMessage}
          avatar="🎓"
          position="bottom-right"
          delay={0.5}
        />
      )}

      {/* Animated Pointer */}
      {firstStep?.showPointer && firstStep.element && typeof firstStep.element === 'string' && (
        <AnimatedPointer
          targetElement={firstStep.element}
          direction={firstStep.pointerDirection || 'down'}
          color="#8B5CF6"
          message="Click here!"
        />
      )}

      {/* Confetti on Completion */}
      <AnimatePresence>
        {showConfetti && <ConfettiExplosion />}
      </AnimatePresence>

      {/* Completion Modal - Replaces Freezing Purple Popup */}
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
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
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

      {/* Custom Styles - Centered Dialog for Desktop */}
      <style jsx global>{`
        .driver-popover.tutorial-popover-custom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 2px solid #8B5CF6;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(139, 92, 246, 0.4);
          z-index: 10000 !important;
        }

        .driver-popover.tutorial-popover-custom .driver-popover-title {
          color: white;
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .driver-popover.tutorial-popover-custom .driver-popover-description {
          color: rgba(255, 255, 255, 0.95);
          font-size: 15px;
          line-height: 1.6;
        }

        .driver-popover.tutorial-popover-custom .driver-popover-footer {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .driver-popover.tutorial-popover-custom button {
          background: white;
          color: #667eea;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .driver-popover.tutorial-popover-custom button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .driver-popover.tutorial-popover-custom .driver-popover-close-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .driver-active-element {
          outline: 4px solid #8B5CF6 !important;
          outline-offset: 4px;
          border-radius: 8px;
        }

        .driver-overlay {
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          z-index: 9999 !important;
        }

        /* CRITICAL: Force center positioning on desktop with animation */
        @media (min-width: 768px) {
          .driver-popover.tutorial-popover-custom.tutorial-centered {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            right: auto !important;
            bottom: auto !important;
            transform: translate(-50%, -50%) scale(1) !important;
            max-width: 500px !important;
            width: 90vw !important;
            margin: 0 !important;
            animation: tutorialZoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          
          .driver-popover.tutorial-popover-custom .driver-popover-title {
            font-size: 24px;
          }
          
          .driver-popover.tutorial-popover-custom .driver-popover-description {
            font-size: 16px;
          }
          
          .driver-popover.tutorial-popover-custom button {
            font-size: 16px;
            padding: 14px 28px;
          }
          
          .driver-popover.tutorial-popover-custom .driver-popover-footer {
            margin-top: 20px;
          }
        }
        
        /* Large desktop - make even more prominent */
        @media (min-width: 1024px) {
          .driver-popover.tutorial-popover-custom.tutorial-centered {
            max-width: 600px !important;
          }
        }

        /* Zoom-in animation from center */
        @keyframes tutorialZoomIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* Mobile - keep responsive */
        @media (max-width: 767px) {
          .driver-popover.tutorial-popover-custom {
            max-width: 90vw !important;
          }
        }
      `}</style>
    </>
  );
}
