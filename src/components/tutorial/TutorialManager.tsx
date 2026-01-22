'use client';

import React from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { TutorialTour } from './TutorialTour';
import { tutorialContent } from './tutorials/tutorialContent';
import { leafTutorialContent } from './tutorials/leafTutorialContent';

interface TutorialManagerProps {
  userType?: 'dispensary' | 'leaf';
}

export function TutorialManager({ userType = 'dispensary' }: TutorialManagerProps) {
  const { activeTutorial } = useTutorial();

  if (!activeTutorial) {
    return null;
  }

  // Select content based on user type
  const content = userType === 'leaf' ? leafTutorialContent : tutorialContent;
  const steps = content[activeTutorial as keyof typeof content];

  if (!steps) {
    return null;
  }

  return (
    <TutorialTour
      tutorialId={activeTutorial}
      steps={steps}
    />
  );
}
