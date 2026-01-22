'use client';

import React from 'react';
import { useTutorial } from '@/contexts/TutorialContext';
import { TutorialTour } from './TutorialTour';
import { tutorialContent } from './tutorials/tutorialContent';

export function TutorialManager() {
  const { activeTutorial } = useTutorial();

  if (!activeTutorial || !tutorialContent[activeTutorial as keyof typeof tutorialContent]) {
    return null;
  }

  const steps = tutorialContent[activeTutorial as keyof typeof tutorialContent];

  return (
    <TutorialTour
      tutorialId={activeTutorial}
      steps={steps}
    />
  );
}
