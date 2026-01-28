'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const driverImages = [
  '/images/driver-ads/dr1.jpg',
  '/images/driver-ads/dr2.jpg',
  '/images/driver-ads/dr3.jpg',
  '/images/driver-ads/dr4.jpg',
  '/images/driver-ads/dr5.jpg',
];

export function DriverSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % driverImages.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-80 overflow-hidden rounded-t-lg bg-muted">
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '-100%' }}
          transition={{ 
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
            opacity: { duration: 0.8 }
          }}
          className="absolute inset-0"
        >
          <Image
            src={driverImages[currentIndex]}
            alt={`Driver opportunity ${currentIndex + 1}`}
            fill
            className="object-cover object-center"
            priority={currentIndex === 0}
          />
          {/* Overlay gradient for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>
      
      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {driverImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? 'bg-white w-8' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
