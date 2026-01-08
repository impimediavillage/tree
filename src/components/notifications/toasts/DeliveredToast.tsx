/**
 * 🎉 Delivery Complete Toast - Confetti Explosion
 * Shows when order is successfully delivered
 */

'use client';

import { motion } from 'framer-motion';
import { Gift, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Confetti from 'react-confetti';
import { useState, useEffect } from 'react';

interface DeliveredToastProps {
  orderNumber: string;
  orderId?: string;
  customerName?: string;
  onDismiss?: () => void;
}

export function DeliveredToast({
  orderNumber,
  orderId,
  customerName,
  onDismiss,
}: DeliveredToastProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleReview = () => {
    if (orderId) {
      router.push(`/dashboard/leaf/orders/${orderId}?review=true`);
      onDismiss?.();
    }
  };

  return (
    <>
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Confetti
            numberOfPieces={200}
            recycle={false}
            colors={['#006B3E', '#3D2E17', '#FFD700', '#FF6B6B', '#4ECDC4']}
            gravity={0.3}
          />
        </div>
      )}
      
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -180 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0, opacity: 0, rotate: 180 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative max-w-md w-full bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 shadow-2xl rounded-2xl pointer-events-auto overflow-hidden border-2 border-pink-200"
        style={{
          boxShadow: '0 0 40px rgba(255, 107, 107, 0.4), 0 10px 50px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Animated Stars Background */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                x: Math.random() * 300,
                y: Math.random() * 200,
                rotate: 360,
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: Infinity,
                repeatDelay: 1,
              }}
              className="absolute"
            >
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            </motion.div>
          ))}
        </div>

        <div className="relative p-6">
          <div className="flex items-start gap-4">
            {/* Animated Gift Box */}
            <motion.div
              initial={{ y: -100, rotate: 0 }}
              animate={{ y: 0, rotate: [0, -10, 10, -10, 0] }}
              transition={{ 
                y: { type: 'spring', stiffness: 200 },
                rotate: { duration: 0.5, delay: 0.3 }
              }}
              className="flex-shrink-0 relative"
            >
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                <Gift className="h-10 w-10 text-white" />
              </div>
              
              {/* Floating Hearts */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 1, scale: 0 }}
                  animate={{
                    y: -50,
                    opacity: 0,
                    scale: [0, 1, 1],
                    x: (i - 2) * 15,
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.5 + i * 0.2,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                >
                  <Heart className="h-3 w-3 text-red-400 fill-red-400" />
                </motion.div>
              ))}
            </motion.div>

            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-2xl font-black text-[#3D2E17] mb-1 flex items-center gap-2">
                  🎉 Delivered!
                  <motion.span
                    animate={{ rotate: [0, 20, -20, 20, 0] }}
                    transition={{ duration: 0.5, repeat: 3, delay: 0.5 }}
                  >
                    🎊
                  </motion.span>
                </h3>
                <p className="text-sm text-[#5D4E37] font-semibold">
                  Order #{orderNumber}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl px-4 py-3 border-2 border-pink-300"
              >
                <p className="text-center text-sm font-bold text-[#3D2E17] mb-2">
                  Your order has been successfully delivered! 🎁
                </p>
                {customerName && (
                  <p className="text-center text-xs text-[#5D4E37]">
                    Hope you enjoy your wellness products, {customerName}!
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-4 space-y-2"
              >
                {orderId && (
                  <Button
                    onClick={handleReview}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold shadow-lg"
                    size="sm"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Your Experience
                  </Button>
                )}
                
                <Button
                  onClick={onDismiss}
                  variant="outline"
                  size="sm"
                  className="w-full border-2 border-pink-200 hover:bg-pink-50 font-bold"
                >
                  Awesome!
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Rainbow Progress Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 5, ease: 'linear' }}
          className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 origin-left"
        />
      </motion.div>
    </>
  );
}
