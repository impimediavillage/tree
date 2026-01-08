/**
 * 💰 New Order Toast - Ka-Ching Animation
 * Shows when a dispensary owner receives a new order
 */

'use client';

import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface OrderToastProps {
  orderNumber: string;
  customerName: string;
  total: number;
  currency: string;
  itemCount: number;
  orderId: string;
  onDismiss?: () => void;
}

export function OrderToast({
  orderNumber,
  customerName,
  total,
  currency,
  itemCount,
  orderId,
  onDismiss,
}: OrderToastProps) {
  const router = useRouter();

  const handleViewOrder = () => {
    router.push(`/dispensary-admin/orders/${orderId}`);
    onDismiss?.();
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 400, opacity: 0, scale: 0.8 }}
      className="relative max-w-md w-full bg-gradient-to-br from-green-50 to-emerald-50 shadow-2xl rounded-2xl pointer-events-auto overflow-hidden border-2 border-green-200"
      style={{
        boxShadow: '0 0 30px rgba(0, 107, 62, 0.3), 0 10px 40px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="w-full h-full"
          style={{
            backgroundImage: 'radial-gradient(circle, #006B3E 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>

      {/* Glowing Border Effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{
          boxShadow: [
            '0 0 20px rgba(0, 107, 62, 0.5)',
            '0 0 40px rgba(0, 107, 62, 0.8)',
            '0 0 20px rgba(0, 107, 62, 0.5)',
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative p-6">
        {/* Header with Animated Money Bag */}
        <div className="flex items-start gap-4">
          {/* Animated Money Bag Icon */}
          <motion.div
            initial={{ y: -100, rotate: -45 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="flex-shrink-0 relative"
          >
            <div className="bg-gradient-to-br from-[#006B3E] to-[#005230] p-4 rounded-2xl shadow-lg">
              <ShoppingBag className="h-8 w-8 text-white" />
            </div>
            
            {/* Coin Scatter Animation */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  scale: 0,
                  rotate: 0 
                }}
                animate={{
                  x: Math.cos((i * 360) / 5 * Math.PI / 180) * 50,
                  y: Math.sin((i * 360) / 5 * Math.PI / 180) * 50,
                  scale: [0, 1, 0],
                  rotate: 360,
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.1,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </motion.div>
            ))}
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-black text-[#3D2E17] mb-1 flex items-center gap-2">
                💰 New Order!
                <motion.span
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: 3,
                    delay: 0.3,
                  }}
                  className="inline-block"
                >
                  🎉
                </motion.span>
              </h3>
              <p className="text-sm text-[#5D4E37] font-semibold">
                Order #{orderNumber}
              </p>
            </motion.div>

            {/* Order Details */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-3 space-y-2"
            >
              <div className="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2 backdrop-blur-sm">
                <span className="text-sm text-[#5D4E37]">Customer:</span>
                <span className="text-sm font-bold text-[#3D2E17]">{customerName}</span>
              </div>
              
              <div className="flex items-center justify-between bg-white/80 rounded-lg px-3 py-2 backdrop-blur-sm">
                <span className="text-sm text-[#5D4E37]">Items:</span>
                <span className="text-sm font-bold text-[#3D2E17]">{itemCount}</span>
              </div>
              
              <div className="flex items-center justify-between bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg px-3 py-2 border-2 border-green-300">
                <span className="text-sm font-bold text-[#006B3E]">Total:</span>
                <motion.span
                  animate={{
                    scale: [1, 1.15, 1],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: 2,
                    delay: 0.6,
                  }}
                  className="text-lg font-black text-[#006B3E]"
                >
                  {currency} {total.toFixed(2)}
                </motion.span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-4 flex gap-2"
            >
              <Button
                onClick={handleViewOrder}
                className="flex-1 bg-gradient-to-r from-[#006B3E] to-[#005230] hover:from-[#005230] hover:to-[#003D23] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Order
              </Button>
              
              <Button
                onClick={onDismiss}
                variant="outline"
                className="border-2 border-green-200 hover:bg-green-50 font-bold"
                size="sm"
              >
                <Check className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Progress Bar Animation */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 5, ease: 'linear' }}
        className="h-1 bg-gradient-to-r from-[#006B3E] via-yellow-500 to-[#006B3E] origin-left"
      />
    </motion.div>
  );
}
