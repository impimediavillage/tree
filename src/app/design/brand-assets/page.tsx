'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const products = [
  { name: 'Apparel', image: '/images/cannibinoid-store/apparel1.jpg' },
  { name: 'Smoking Gear', image: '/images/cannibinoid-store/gear1.jpg' },
  { name: 'Art', image: '/images/cannibinoid-store/art1.jpg' },
  { name: 'Furniture', image: '/images/cannibinoid-store/furn1.jpg' },
];

export default function DesignBrandAssetsPage() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const router = useRouter();

  const handleSelectProduct = (productName: string) => {
    setSelectedProduct(productName);
  };

  const handleNext = () => {
    if (selectedProduct) {
      router.push(`/design/generate-sticker?product=${selectedProduct}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold">Create Your Triple S Canna Club Pack</h1>
        <p className="text-xl text-muted-foreground">
          Select from our range of apparel, smoking gear, art, and furniture
          to bundle with your unique Triple S bud generated design.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <motion.div
            key={product.name}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card
              onClick={() => handleSelectProduct(product.name)}
              className={cn(
                'cursor-pointer transition-all duration-300',
                selectedProduct === product.name
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'hover:shadow-xl'
              )}
            >
              <CardContent className="p-0 relative">
                <Image
                  src={product.image}
                  alt={product.name}
                  width={400}
                  height={400}
                  className="rounded-lg object-cover aspect-square"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-lg">
                  <h3 className="text-white text-2xl font-bold">{product.name}</h3>
                </div>
                <AnimatePresence>
                  {selectedProduct === product.name && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-primary/70 flex items-center justify-center rounded-lg"
                    >
                      <Check className="text-white h-16 w-16" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-center"
      >
        <Button onClick={handleNext} disabled={!selectedProduct} size="lg" className="mt-8">
          Next: Select Triple S bud sticker! <ArrowRight className="ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
