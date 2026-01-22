'use client';

import React, { useEffect, useState } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTutorial } from '@/contexts/TutorialContext';
import { ChatBubble, AnimatedPointer, SpotlightOverlay, ConfettiExplosion } from './AnimatedComponents';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { completeTutorial, completeStep, skipTutorial } = useTutorial();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [driverInstance, setDriverInstance] = useState<any>(null);

  useEffect(() => {
    // Configure Driver.js with custom styling
    const driverConfig: Config = {
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: '🎉 Complete!',
      showButtons: ['next', 'previous', 'close'],
      
      steps: steps.map((step, index) => ({
        element: step.element,
        popover: {
          title: step.popover?.title || `Step ${index + 1}`,
          description: step.popover?.description || '',
          side: step.popover?.side || 'bottom',
          align: step.popover?.align || 'start',
          showButtons: ['next', 'previous'],
          popoverClass: 'tutorial-popover-custom',
          onNextClick: () => {
            completeStep(tutorialId, index);
            setCurrentStepIndex(index + 1);
            if (step.onNext) step.onNext();
            driverObj.moveNext();
          },
          onPrevClick: () => {
            setCurrentStepIndex(index - 1);
            driverObj.movePrevious();
          },
        },
      })),

      onDestroyStarted: () => {
        if (!driverInstance?.hasNextStep() || driverInstance?.getActiveIndex() === steps.length - 1) {
          completeTutorial(tutorialId);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
          if (onComplete) onComplete();
        } else {
          skipTutorial();
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
    };

    const driverObj = driver(driverConfig);
    setDriverInstance(driverObj);
    driverObj.drive();

    return () => {
      if (driverObj) {
        driverObj.destroy();
      }
    };
  }, [tutorialId, steps, completeTutorial, completeStep, skipTutorial, onComplete]);

  const currentStep = steps[currentStepIndex];

  return (
    <>
      {/* Custom Chat Bubble */}
      {currentStep?.chatMessage && (
        <ChatBubble
          message={currentStep.chatMessage}
          avatar="🎓"
          position="bottom-right"
          delay={0.5}
        />
      )}

      {/* Animated Pointer */}
      {currentStep?.showPointer && currentStep.element && typeof currentStep.element === 'string' && (
        <AnimatedPointer
          targetElement={currentStep.element}
          direction={currentStep.pointerDirection || 'down'}
          color="#8B5CF6"
          message="Click here!"
        />
      )}

      {/* Confetti on Completion */}
      <AnimatePresence>
        {showConfetti && <ConfettiExplosion />}
      </AnimatePresence>

      {/* Custom Styles */}
      <style jsx global>{`
        .driver-popover.tutorial-popover-custom {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 2px solid #8B5CF6;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(139, 92, 246, 0.4);
          max-width: 400px;
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
        }

        .driver-popover.tutorial-popover-custom button:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .driver-popover.tutorial-popover-custom .driver-popover-close-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .driver-popover.tutorial-popover-custom .driver-popover-progress-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          font-weight: 600;
        }

        .driver-active-element {
          outline: 4px solid #8B5CF6 !important;
          outline-offset: 4px;
          border-radius: 8px;
        }

        .driver-overlay {
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
        }
      `}</style>
    </>
  );
}
