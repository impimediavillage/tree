"use client";

import { useState } from "react";
import { collection, addDoc, Timestamp, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Database, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Seed data from ApparelSelector
const SEED_DATA = {
  types: [
    { name: 'T-Shirt', slug: 'tshirt', category: 'tops', displayOrder: 0 },
    { name: 'Hoodie', slug: 'hoodie', category: 'outerwear', displayOrder: 1 },
    { name: 'Sweatshirt', slug: 'sweatshirt', category: 'outerwear', displayOrder: 2 },
    { name: 'Cap', slug: 'cap', category: 'headwear', displayOrder: 3 },
    { name: 'Beanie', slug: 'beanie', category: 'headwear', displayOrder: 4 },
    { name: 'Long Sleeve Shirt', slug: 'long_sleeve', category: 'tops', displayOrder: 5 },
    { name: 'Backpack', slug: 'backpack', category: 'accessories', displayOrder: 6 },
  ],
  items: [
    {
      itemType: 'cap',
      name: 'Black Cap',
      description: 'Classic black cap with customizable front design',
      category: 'headwear',
      basePrice: 89,
      retailPrice: 120,
      availableSizes: ['One Size'],
      availableColors: ['black'],
      primaryColor: 'black',
      weight: 0.15,
      dimensions: { length: 25, width: 20, height: 12 },
      mockImageUrl: '/images/apparel/black-cap.jpg',
      printAreas: { front: { x: 0, y: 0, width: 200, height: 150 } },
      restrictions: '⭕ Circular badge (20cm diameter) - Front or peak position',
      hasSurface: false,
      isActive: true,
      inStock: true,
      materialComposition: '100% Cotton',
      careInstructions: 'Hand wash cold, air dry',
    },
    {
      itemType: 'beanie',
      name: 'Black Beanie',
      description: 'Cozy black beanie with center design area',
      category: 'headwear',
      basePrice: 69,
      retailPrice: 95,
      availableSizes: ['One Size'],
      availableColors: ['black'],
      primaryColor: 'black',
      weight: 0.12,
      dimensions: { length: 22, width: 20, height: 10 },
      mockImageUrl: '/images/apparel/black-beannie.jpg',
      printAreas: { front: { x: 0, y: 0, width: 180, height: 120 } },
      restrictions: '⭕ Circular badge (20cm diameter) - Center fold area',
      hasSurface: false,
      isActive: true,
      inStock: true,
      materialComposition: '100% Acrylic',
      careInstructions: 'Hand wash cold, lay flat to dry',
    },
    {
      itemType: 'tshirt',
      name: 'Black T-Shirt',
      description: 'Premium black t-shirt with front/back design options',
      category: 'tops',
      basePrice: 119,
      retailPrice: 160,
      availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
      availableColors: ['black'],
      primaryColor: 'black',
      weight: 0.2,
      dimensions: { length: 30, width: 25, height: 2 },
      mockImageUrl: '/images/apparel/black-tshirt-front.jpg',
      mockImageFront: '/images/apparel/black-tshirt-front.jpg',
      printAreas: {
        front: { x: 0, y: 0, width: 280, height: 350 },
        back: { x: 0, y: 0, width: 280, height: 350 },
      },
      restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
      hasSurface: true,
      isActive: true,
      inStock: true,
      materialComposition: '100% Cotton',
      careInstructions: 'Machine wash cold, tumble dry low',
    },
    {
      itemType: 'long_sleeve',
      name: 'Black Long Sleeve Shirt',
      description: 'Long sleeve shirt with front/back design areas',
      category: 'tops',
      basePrice: 149,
      retailPrice: 200,
      availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
      availableColors: ['black'],
      primaryColor: 'black',
      weight: 0.3,
      dimensions: { length: 32, width: 28, height: 4 },
      mockImageUrl: '/images/apparel/black-long-sleeve-sweatshirt-front.jpg',
      mockImageFront: '/images/apparel/black-long-sleeve-sweatshirt-front.jpg',
      printAreas: {
        front: { x: 0, y: 0, width: 280, height: 350 },
        back: { x: 0, y: 0, width: 280, height: 350 },
      },
      restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
      hasSurface: true,
      isActive: true,
      inStock: true,
      materialComposition: '100% Cotton',
      careInstructions: 'Machine wash cold, tumble dry low',
    },
    {
      itemType: 'hoodie',
      name: 'Black Hoodie',
      description: 'Premium black hoodie with spacious design areas',
      category: 'outerwear',
      basePrice: 249,
      retailPrice: 330,
      availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
      availableColors: ['black'],
      primaryColor: 'black',
      weight: 0.6,
      dimensions: { length: 35, width: 30, height: 8 },
      mockImageUrl: '/images/apparel/black-hoodie-front.jpg',
      mockImageFront: '/images/apparel/black-hoodie-front.jpg',
      printAreas: {
        front: { x: 0, y: 0, width: 280, height: 350 },
        back: { x: 0, y: 0, width: 320, height: 400 },
      },
      restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
      hasSurface: true,
      isActive: true,
      inStock: true,
      materialComposition: '80% Cotton, 20% Polyester',
      careInstructions: 'Machine wash cold, tumble dry low',
    },
    {
      itemType: 'backpack',
      name: 'Black Backpack',
      description: 'Durable black backpack with front panel design',
      category: 'accessories',
      basePrice: 299,
      retailPrice: 400,
      availableSizes: ['One Size'],
      availableColors: ['black'],
      primaryColor: 'black',
      weight: 0.4,
      dimensions: { length: 40, width: 30, height: 15 },
      mockImageUrl: '/images/apparel/black-backpack.jpg',
      printAreas: { front: { x: 0, y: 0, width: 250, height: 300 } },
      restrictions: '▭ Rectangular design (20cm x 40cm) - Front panel',
      hasSurface: false,
      isActive: true,
      inStock: true,
      materialComposition: '100% Polyester',
      careInstructions: 'Spot clean only',
    },
  ],
};

export function ApparelDataSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [status, setStatus] = useState<{
    types: { total: number; seeded: number };
    items: { total: number; seeded: number };
  }>({ types: { total: 0, seeded: 0 }, items: { total: 0, seeded: 0 } });
  const { toast } = useToast();

  const checkExistingData = async () => {
    const typesSnapshot = await getDocs(collection(db, "apparel_types"));
    const itemsSnapshot = await getDocs(collection(db, "apparel_items"));
    return {
      hasTypes: typesSnapshot.size > 0,
      hasItems: itemsSnapshot.size > 0,
      typesCount: typesSnapshot.size,
      itemsCount: itemsSnapshot.size,
    };
  };

  const seedDatabase = async () => {
    setSeeding(true);
    try {
      // Check existing data
      const existing = await checkExistingData();
      
      if (existing.hasTypes && existing.hasItems) {
        const confirmed = confirm(
          `Database already has ${existing.typesCount} types and ${existing.itemsCount} items. Do you want to add more data anyway?`
        );
        if (!confirmed) {
          setSeeding(false);
          return;
        }
      }

      // Seed Types
      setStatus({ types: { total: SEED_DATA.types.length, seeded: 0 }, items: { total: 0, seeded: 0 } });
      for (let i = 0; i < SEED_DATA.types.length; i++) {
        const type = SEED_DATA.types[i];
        await addDoc(collection(db, "apparel_types"), {
          ...type,
          isActive: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        setStatus(prev => ({ ...prev, types: { ...prev.types, seeded: i + 1 } }));
      }

      // Seed Items
      setStatus(prev => ({ ...prev, items: { total: SEED_DATA.items.length, seeded: 0 } }));
      for (let i = 0; i < SEED_DATA.items.length; i++) {
        const item = SEED_DATA.items[i];
        await addDoc(collection(db, "apparel_items"), {
          ...item,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        setStatus(prev => ({ ...prev, items: { ...prev.items, seeded: i + 1 } }));
      }

      toast({
        title: "Seed Complete! 🎉",
        description: `Seeded ${SEED_DATA.types.length} types and ${SEED_DATA.items.length} items successfully`,
      });
    } catch (error: any) {
      console.error("Seed error:", error);
      toast({
        title: "Seed Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Card className="p-6 bg-muted/50 border-2 border-[#006B3E]/20">
      <div className="flex items-start gap-4">
        <Database className="h-8 w-8 text-[#006B3E] flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-xl font-black text-[#3D2E17] mb-2">
            Seed Apparel Database
          </h3>
          <p className="text-sm text-[#5D4E37] font-bold mb-4">
            Initialize your database with {SEED_DATA.types.length} apparel types and {SEED_DATA.items.length} default items.
            This migrates hardcoded data from ApparelSelector to Firestore.
          </p>

          {seeding && (
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <Loader className="h-4 w-4 animate-spin text-[#006B3E]" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-[#3D2E17]">Seeding Types</span>
                    <Badge variant="secondary">
                      {status.types.seeded} / {status.types.total}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#006B3E] h-2 rounded-full transition-all"
                      style={{
                        width: `${(status.types.seeded / status.types.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {status.items.total > 0 && (
                <div className="flex items-center gap-3">
                  <Loader className="h-4 w-4 animate-spin text-[#006B3E]" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-[#3D2E17]">Seeding Items</span>
                      <Badge variant="secondary">
                        {status.items.seeded} / {status.items.total}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#006B3E] h-2 rounded-full transition-all"
                        style={{
                          width: `${(status.items.seeded / status.items.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={seedDatabase}
            disabled={seeding}
            className="bg-[#006B3E] hover:bg-[#005a33]"
          >
            {seeding ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Seeding Database...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Seed Script
              </>
            )}
          </Button>

          <div className="mt-4 pt-4 border-t border-[#006B3E]/10">
            <p className="text-xs text-[#5D4E37] font-bold mb-2">
              ⚠️ Note: Run this once to initialize. Mock images will need to be uploaded manually via UI.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
