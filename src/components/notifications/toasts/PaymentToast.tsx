/**
 * 💳 Payment Received Toast - Coin Drop Animation
 * Shows when payment is successfully processed
 */

'use client';

import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentToastProps {
  amount: number;
  currency: string;
  orderNumber?: string;
  paymentMethod?: string;
  onDismiss?: () => void;
}

export function PaymentToast({
  amount,
  currency,
  orderNumber,
  paymentMethod = 'PayFast',
  onDismiss,
}: PaymentToastProps) {
  return (
    <motion.div
      initial={{ x: 400, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="relative max-w-md w-full bg-gradient-to-br from-blue-50 to-cyan-50 shadow-2xl rounded-2xl pointer-events-auto overflow-hidden border-2 border-blue-200"
    >
      {/* Sparkle Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, x: Math.random() * 100 + '%', y: Math.random() * 100 + '%' }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              rotate: 360,
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            className="absolute"
          >
            <Sparkles className="h-3 w-3 text-blue-300" />
          </motion.div>
        ))}
      </div>

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Animated Credit Card Icon */}
          <motion.div
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex-shrink-0"
          >
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-2xl shadow-lg relative">
              <CreditCard className="h-8 w-8 text-white" />
              
              {/* Checkmark Overlay */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1"
              >
                <CheckCircle className="h-5 w-5 text-white" />
              </motion.div>
            </div>
          </motion.div>

          <div className="flex-1">
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-black text-[#3D2E17] mb-1"
            >
              💳 Payment Received!
            </motion.h3>
            
            {orderNumber && (
              <p className="text-sm text-[#5D4E37] font-semibold">
                Order #{orderNumber}
              </p>
            )}

            {/* Amount Display with Coin Drop Animation */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="mt-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl px-4 py-3 border-2 border-blue-300"
            >
              <div className="text-center">
                <div className="text-sm text-blue-600 font-semibold mb-1">Amount Received</div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.5, repeat: 2, delay: 0.5 }}
                  className="text-2xl font-black text-blue-600"
                >
                  {currency} {amount.toFixed(2)}
                </motion.div>
                <div className="text-xs text-blue-500 mt-1">via {paymentMethod}</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-3 text-center"
            >
              <Button
                onClick={onDismiss}
                variant="outline"
                size="sm"
                className="border-2 border-blue-200 hover:bg-blue-50 font-bold"
              >
                Got it!
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 3, ease: 'linear' }}
        className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500 origin-left"
      />
    </motion.div>
  );
}
