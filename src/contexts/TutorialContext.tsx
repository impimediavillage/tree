'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface TutorialProgress {
  [tutorialId: string]: {
    completed: boolean;
    currentStep: number;
    lastAccessed: string;
    completedSteps: number[];
  };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

interface TutorialContextType {
  activeTutorial: string | null;
  tutorialProgress: TutorialProgress;
  achievements: Achievement[];
  showLauncher: boolean;
  totalPoints: number;
  startTutorial: (tutorialId: string) => void;
  completeTutorial: (tutorialId: string) => void;
  completeStep: (tutorialId: string, stepIndex: number) => void;
  skipTutorial: () => void;
  openLauncher: () => void;
  closeLauncher: () => void;
  resetProgress: () => void;
  unlockAchievement: (achievementId: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-tutorial', title: 'Tutorial Rookie', description: 'Complete your first tutorial', icon: '🎓' },
  { id: 'product-master', title: 'Product Master', description: 'Complete Product Management tutorial', icon: '📦' },
  { id: 'order-wizard', title: 'Order Wizard', description: 'Complete Order Management tutorial', icon: '📋' },
  { id: 'analytics-pro', title: 'Analytics Pro', description: 'Complete Analytics tutorial', icon: '📊' },
  { id: 'ad-champion', title: 'Advertising Champion', description: 'Complete Advertising tutorial', icon: '📢' },
  { id: 'settings-expert', title: 'Settings Expert', description: 'Complete Settings tutorial', icon: '⚙️' },
  { id: 'speed-learner', title: 'Speed Learner', description: 'Complete 3 tutorials in one session', icon: '⚡' },
  { id: 'completionist', title: 'Master Completionist', description: 'Complete ALL tutorials', icon: '👑' },
];

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTutorial, setActiveTutorial] = useState<string | null>(null);
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress>({});
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showLauncher, setShowLauncher] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  // Load progress from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedProgress = localStorage.getItem(`tutorial-progress-${user.uid}`);
      const savedAchievements = localStorage.getItem(`tutorial-achievements-${user.uid}`);
      const savedPoints = localStorage.getItem(`tutorial-points-${user.uid}`);

      if (savedProgress) {
        setTutorialProgress(JSON.parse(savedProgress));
      }
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      }
      if (savedPoints) {
        setTotalPoints(parseInt(savedPoints, 10));
      }
    }
  }, [user]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`tutorial-progress-${user.uid}`, JSON.stringify(tutorialProgress));
    }
  }, [tutorialProgress, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`tutorial-achievements-${user.uid}`, JSON.stringify(achievements));
    }
  }, [achievements, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`tutorial-points-${user.uid}`, totalPoints.toString());
    }
  }, [totalPoints, user]);

  const startTutorial = useCallback((tutorialId: string) => {
    setActiveTutorial(tutorialId);
    setShowLauncher(false);

    setTutorialProgress(prev => ({
      ...prev,
      [tutorialId]: {
        completed: false,
        currentStep: 0,
        lastAccessed: new Date().toISOString(),
        completedSteps: [],
      },
    }));
  }, []);

  const completeTutorial = useCallback((tutorialId: string) => {
    setActiveTutorial(null);
    setTutorialProgress(prev => ({
      ...prev,
      [tutorialId]: {
        ...prev[tutorialId],
        completed: true,
        lastAccessed: new Date().toISOString(),
      },
    }));

    // Award points
    setTotalPoints(prev => prev + 100);

    // Check for achievements
    const completedCount = Object.values(tutorialProgress).filter(p => p.completed).length + 1;
    
    // First tutorial achievement
    if (completedCount === 1) {
      unlockAchievement('first-tutorial');
    }

    // Specific tutorial achievements
    const tutorialAchievements: { [key: string]: string } = {
      'product-management': 'product-master',
      'order-management': 'order-wizard',
      'analytics': 'analytics-pro',
      'advertising': 'ad-champion',
      'settings': 'settings-expert',
    };

    if (tutorialAchievements[tutorialId]) {
      unlockAchievement(tutorialAchievements[tutorialId]);
    }

    // Speed learner (3 tutorials in one session)
    if (completedCount >= 3) {
      unlockAchievement('speed-learner');
    }

    // Completionist (all tutorials)
    const totalTutorials = 8; // Update this based on actual number
    if (completedCount >= totalTutorials) {
      unlockAchievement('completionist');
    }
  }, [tutorialProgress]);

  const completeStep = useCallback((tutorialId: string, stepIndex: number) => {
    setTutorialProgress(prev => {
      const current = prev[tutorialId] || { completed: false, currentStep: 0, lastAccessed: '', completedSteps: [] };
      const completedStepsSet = new Set([...current.completedSteps, stepIndex]);
      const completedStepsArray: number[] = [];
      completedStepsSet.forEach(step => completedStepsArray.push(step));
      
      return {
        ...prev,
        [tutorialId]: {
          ...current,
          currentStep: stepIndex + 1,
          completedSteps: completedStepsArray,
          lastAccessed: new Date().toISOString(),
        },
      };
    });

    // Award points for completing a step
    setTotalPoints(prev => prev + 10);
  }, []);

  const skipTutorial = useCallback(() => {
    setActiveTutorial(null);
  }, []);

  const openLauncher = useCallback(() => {
    setShowLauncher(true);
  }, []);

  const closeLauncher = useCallback(() => {
    setShowLauncher(false);
  }, []);

  const resetProgress = useCallback(() => {
    if (user) {
      localStorage.removeItem(`tutorial-progress-${user.uid}`);
      localStorage.removeItem(`tutorial-achievements-${user.uid}`);
      localStorage.removeItem(`tutorial-points-${user.uid}`);
      setTutorialProgress({});
      setAchievements([]);
      setTotalPoints(0);
    }
  }, [user]);

  const unlockAchievement = useCallback((achievementId: string) => {
    setAchievements(prev => {
      if (prev.some(a => a.id === achievementId)) {
        return prev; // Already unlocked
      }

      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (!achievement) return prev;

      const newAchievement = {
        ...achievement,
        unlockedAt: new Date().toISOString(),
      };

      // Award bonus points for achievements
      setTotalPoints(p => p + 50);

      return [...prev, newAchievement];
    });
  }, []);

  const value = {
    activeTutorial,
    tutorialProgress,
    achievements,
    showLauncher,
    totalPoints,
    startTutorial,
    completeTutorial,
    completeStep,
    skipTutorial,
    openLauncher,
    closeLauncher,
    resetProgress,
    unlockAchievement,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
