// Tutorial System - Main Exports
// Import everything you need from this single file!

export { TutorialProvider, useTutorial } from '@/contexts/TutorialContext';
export { TutorialLauncher } from './TutorialLauncher';
export { TutorialManager } from './TutorialManager';
export { TutorialTriggerButton } from './TutorialTriggerButton';
export { TutorialTour } from './TutorialTour';
export {
  ChatBubble,
  AnimatedPointer,
  SpotlightOverlay,
  ConfettiExplosion,
} from './AnimatedComponents';

// Tutorial content
export { tutorialContent } from './tutorials/tutorialContent';

// Types
// Tutorial tour step interface
export interface TutorialStep {
  element: string | Element | (() => Element);
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
  chatMessage?: string;
  showPointer?: boolean;
  pointerDirection?: 'up' | 'down' | 'left' | 'right';
  onNext?: () => void;
}

/**
 * Quick Usage Example:
 * 
 * // 1. In your root layout:
 * import { TutorialProvider } from '@/components/tutorial';
 * <TutorialProvider>{children}</TutorialProvider>
 * 
 * // 2. In your dashboard:
 * import { TutorialLauncher, TutorialManager, TutorialTriggerButton } from '@/components/tutorial';
 * <>
 *   {children}
 *   <TutorialLauncher />
 *   <TutorialManager />
 *   <TutorialTriggerButton />
 * </>
 * 
 * // 3. Use the hook anywhere:
 * import { useTutorial } from '@/components/tutorial';
 * const { openLauncher, startTutorial } = useTutorial();
 * 
 * // 4. Add data-tour attributes to your elements:
 * <button data-tour="add-product-btn">Add Product</button>
 */
