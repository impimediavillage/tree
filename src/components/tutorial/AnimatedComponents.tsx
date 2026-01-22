'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ChatBubbleProps {
  message: string;
  avatar?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  onClose?: () => void;
  showClose?: boolean;
  delay?: number;
}

const positionClasses = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

export function ChatBubble({
  message,
  avatar = '🤖',
  position = 'bottom-right',
  onClose,
  showClose = true,
  delay = 0,
}: ChatBubbleProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        transition={{ 
          delay,
          type: 'spring',
          damping: 20,
          stiffness: 300,
        }}
        className={`fixed ${positionClasses[position]} z-[10000] max-w-md`}
      >
        <div className="relative">
          {/* Main Bubble */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl p-5 shadow-2xl border-2 border-purple-400">
            {/* Avatar */}
            <div className="absolute -top-6 left-4">
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
                className="bg-white rounded-full p-2 shadow-lg border-2 border-purple-400"
              >
                <span className="text-2xl">{avatar}</span>
              </motion.div>
            </div>

            {/* Close Button */}
            {showClose && onClose && (
              <button
                onClick={onClose}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            )}

            {/* Message */}
            <div className="mt-4">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.3 }}
                className="text-sm leading-relaxed"
              >
                {message}
              </motion.p>
            </div>

            {/* Typing Indicator Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'loop',
              }}
              className="flex gap-1 mt-2"
            >
              <div className="w-2 h-2 bg-white/60 rounded-full" />
              <div className="w-2 h-2 bg-white/60 rounded-full" />
              <div className="w-2 h-2 bg-white/60 rounded-full" />
            </motion.div>
          </div>

          {/* Speech Bubble Tail */}
          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-indigo-600 rotate-45 border-r-2 border-b-2 border-purple-400" />
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 bg-purple-500 rounded-2xl blur-xl opacity-30 -z-10" />
      </motion.div>
    </AnimatePresence>
  );
}

// Animated Pointer Component
interface AnimatedPointerProps {
  targetElement?: string; // CSS selector
  direction?: 'up' | 'down' | 'left' | 'right';
  color?: string;
  message?: string;
}

export function AnimatedPointer({
  targetElement,
  direction = 'down',
  color = '#8B5CF6',
  message,
}: AnimatedPointerProps) {
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (targetElement) {
      const element = document.querySelector(targetElement);
      if (element) {
        const rect = element.getBoundingClientRect();
        const offset = 50;
        
        const positions = {
          up: { x: rect.left + rect.width / 2, y: rect.top - offset },
          down: { x: rect.left + rect.width / 2, y: rect.bottom + offset },
          left: { x: rect.left - offset, y: rect.top + rect.height / 2 },
          right: { x: rect.right + offset, y: rect.top + rect.height / 2 },
        };

        setPosition(positions[direction]);
      }
    }
  }, [targetElement, direction]);

  const rotations = {
    up: '180deg',
    down: '0deg',
    left: '90deg',
    right: '-90deg',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        y: direction === 'down' || direction === 'up' ? [0, -10, 0] : 0,
        x: direction === 'left' || direction === 'right' ? [0, 10, 0] : 0,
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatType: 'reverse',
      }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) rotate(${rotations[direction]})`,
        zIndex: 10001,
      }}
      className="pointer-events-none"
    >
      {/* Arrow SVG */}
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <motion.path
          d="M30 10 L30 50 M30 50 L20 40 M30 50 L40 40"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{
            pathLength: [0, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            repeatType: 'loop',
          }}
        />
      </svg>

      {/* Optional Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white text-purple-900 text-sm font-bold px-4 py-2 rounded-lg shadow-lg whitespace-nowrap"
          style={{ transform: `translate(-50%, 0) rotate(-${rotations[direction]})` }}
        >
          {message}
        </motion.div>
      )}

      {/* Glow Effect */}
      <div 
        className="absolute inset-0 blur-xl opacity-50"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
}

// Spotlight Overlay Component
interface SpotlightOverlayProps {
  targetElement?: string;
  onClose?: () => void;
}

export function SpotlightOverlay({ targetElement, onClose }: SpotlightOverlayProps) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    if (targetElement) {
      const element = document.querySelector(targetElement);
      if (element) {
        setRect(element.getBoundingClientRect());
      }
    }
  }, [targetElement]);

  if (!rect) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] pointer-events-none"
      onClick={onClose}
    >
      {/* Dark Overlay with Cutout */}
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - 10}
              y={rect.top - 10}
              width={rect.width + 20}
              height={rect.height + 20}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Animated Border Around Highlighted Element */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 0 4px rgba(139, 92, 246, 0.5)',
            '0 0 0 8px rgba(139, 92, 246, 0.3)',
            '0 0 0 4px rgba(139, 92, 246, 0.5)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        style={{
          position: 'absolute',
          left: rect.left - 10,
          top: rect.top - 10,
          width: rect.width + 20,
          height: rect.height + 20,
          borderRadius: '12px',
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}

// Confetti Animation (for achievements)
export function ConfettiExplosion() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  const confettiCount = 50;

  return (
    <div className="fixed inset-0 pointer-events-none z-[10002]">
      {Array.from({ length: confettiCount }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: '50vw',
            y: '50vh',
            scale: 1,
            opacity: 1,
          }}
          animate={{
            x: `${Math.random() * 100}vw`,
            y: `${Math.random() * 100}vh`,
            scale: 0,
            opacity: 0,
            rotate: Math.random() * 720,
          }}
          transition={{
            duration: 2 + Math.random(),
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0%',
          }}
        />
      ))}
    </div>
  );
}
