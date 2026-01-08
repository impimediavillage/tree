/**
 * 🚚 Shipping Update Toast - Delivery Truck Animation
 * Shows when shipping status changes
 */

'use client';

import { motion } from 'framer-motion';
import { Truck, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface ShippingToastProps {
  status: string;
  orderNumber: string;
  trackingNumber?: string;
  orderId?: string;
  estimatedDelivery?: string;
  onDismiss?: () => void;
}

export function ShippingToast({
  status,
  orderNumber,
  trackingNumber,
  orderId,
  estimatedDelivery,
  onDismiss,
}: ShippingToastProps) {
  const router = useRouter();

  const handleTrackOrder = () => {
    if (orderId) {
      router.push(`/dashboard/leaf/orders/${orderId}`);
      onDismiss?.();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'shipped': return 'from-orange-50 to-amber-50';
      case 'in_transit': return 'from-purple-50 to-pink-50';
      case 'out_for_delivery': return 'from-green-50 to-emerald-50';
      default: return 'from-blue-50 to-cyan-50';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'out_for_delivery': return '🚚';
      case 'in_transit': return '📦';
      default: return '🚚';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'shipped': return 'Order Shipped!';
      case 'in_transit': return 'In Transit';
      case 'out_for_delivery': return 'Out for Delivery!';
      case 'ready_for_pickup': return 'Ready for Pickup!';
      default: return 'Shipping Update';
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={`relative max-w-md w-full bg-gradient-to-br ${getStatusColor()} shadow-2xl rounded-2xl pointer-events-auto overflow-hidden border-2 border-orange-200`}
    >
      {/* Animated Road */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="h-full w-1/4 bg-white opacity-50"
        />
      </div>

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Animated Truck */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="flex-shrink-0 relative"
          >
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg"
            >
              <Truck className="h-8 w-8 text-white" />
            </motion.div>
            
            {/* Exhaust Puffs */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: -10, y: 10 }}
                animate={{
                  scale: [0, 1, 0],
                  x: [-10, -30],
                  y: [10, -10],
                  opacity: [0.5, 0],
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.3,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
                className="absolute bottom-2 left-0 w-3 h-3 bg-gray-400 rounded-full"
              />
            ))}
          </motion.div>

          <div className="flex-1">
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-black text-[#3D2E17] mb-1 flex items-center gap-2"
            >
              {getStatusIcon()} {getStatusText()}
            </motion.h3>
            
            <p className="text-sm text-[#5D4E37] font-semibold mb-3">
              Order #{orderNumber}
            </p>

            {/* Status Details */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              {trackingNumber && (
                <div className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Tracking Number</div>
                    <div className="text-sm font-bold text-[#3D2E17]">{trackingNumber}</div>
                  </div>
                </div>
              )}
              
              {estimatedDelivery && (
                <div className="flex items-center gap-2 bg-white/80 rounded-lg px-3 py-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Estimated Delivery</div>
                    <div className="text-sm font-bold text-[#3D2E17]">{estimatedDelivery}</div>
                  </div>
                </div>
              )}
            </motion.div>

            {orderId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 flex gap-2"
              >
                <Button
                  onClick={handleTrackOrder}
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold"
                >
                  Track Package
                </Button>
                <Button
                  onClick={onDismiss}
                  variant="outline"
                  size="sm"
                  className="border-2 border-orange-200 hover:bg-orange-50"
                >
                  OK
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 4, ease: 'linear' }}
        className="h-1 bg-gradient-to-r from-orange-500 to-amber-500 origin-left"
      />
    </motion.div>
  );
}
