/**
 * Firestore Seed Script for Apparel System
 * 
 * This script seeds:
 * 1. apparel_types collection with standard types
 * 2. apparel_items collection with initial items from ApparelSelector
 * 
 * Run once to initialize the database with existing data
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin (only if not already initialized)
if (!getApps().length) {
  // For local development, you can use service account key
  // For production, use default credentials
  initializeApp({
    credential: cert(path.join(__dirname, '../../serviceAccountKey.json')),
  });
}

const db = getFirestore();

// Apparel Types to seed
const apparelTypes = [
  {
    name: 'T-Shirt',
    slug: 'tshirt',
    category: 'tops',
    displayOrder: 0,
    isActive: true,
    defaultWeight: 0.2,
    defaultDimensions: { length: 30, width: 25, height: 2 },
    defaultSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultPrintAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 280, height: 350 },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Hoodie',
    slug: 'hoodie',
    category: 'outerwear',
    displayOrder: 1,
    isActive: true,
    defaultWeight: 0.6,
    defaultDimensions: { length: 35, width: 30, height: 8 },
    defaultSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultPrintAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 320, height: 400 },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Sweatshirt',
    slug: 'sweatshirt',
    category: 'outerwear',
    displayOrder: 2,
    isActive: true,
    defaultWeight: 0.5,
    defaultDimensions: { length: 35, width: 30, height: 6 },
    defaultSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultPrintAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 320, height: 400 },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Cap',
    slug: 'cap',
    category: 'headwear',
    displayOrder: 3,
    isActive: true,
    defaultWeight: 0.15,
    defaultDimensions: { length: 25, width: 20, height: 12 },
    defaultSizes: ['One Size'],
    defaultPrintAreas: {
      front: { x: 0, y: 0, width: 200, height: 150 },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Beanie',
    slug: 'beanie',
    category: 'headwear',
    displayOrder: 4,
    isActive: true,
    defaultWeight: 0.12,
    defaultDimensions: { length: 22, width: 20, height: 10 },
    defaultSizes: ['One Size'],
    defaultPrintAreas: {
      front: { x: 0, y: 0, width: 180, height: 120 },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Long Sleeve Shirt',
    slug: 'long_sleeve',
    category: 'tops',
    displayOrder: 5,
    isActive: true,
    defaultWeight: 0.3,
    defaultDimensions: { length: 32, width: 28, height: 4 },
    defaultSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    defaultPrintAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 280, height: 350 },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    name: 'Backpack',
    slug: 'backpack',
    category: 'accessories',
    displayOrder: 6,
    isActive: true,
    defaultWeight: 0.4,
    defaultDimensions: { length: 40, width: 30, height: 15 },
    defaultSizes: ['One Size'],
    defaultPrintAreas: {
      front: { x: 0, y: 0, width: 250, height: 300 },
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
];

// Initial Apparel Items (from ApparelSelector hardcoded data)
const apparelItems = [
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
    printAreas: {
      front: { x: 0, y: 0, width: 200, height: 150 },
    },
    restrictions: '⭕ Circular badge (20cm diameter) - Front or peak position',
    hasSurface: false,
    isActive: true,
    inStock: true,
    materialComposition: '100% Cotton',
    careInstructions: 'Hand wash cold, air dry',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
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
    printAreas: {
      front: { x: 0, y: 0, width: 180, height: 120 },
    },
    restrictions: '⭕ Circular badge (20cm diameter) - Center fold area',
    hasSurface: false,
    isActive: true,
    inStock: true,
    materialComposition: '100% Acrylic',
    careInstructions: 'Hand wash cold, lay flat to dry',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
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
    printAreas: {
      front: { x: 0, y: 0, width: 250, height: 300 },
    },
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front panel',
    hasSurface: false,
    isActive: true,
    inStock: true,
    materialComposition: '100% Polyester',
    careInstructions: 'Spot clean only',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Seed Apparel Types
    console.log('📦 Seeding apparel types...');
    for (const type of apparelTypes) {
      const typeRef = db.collection('apparel_types').doc();
      await typeRef.set(type);
      console.log(`  ✓ Created type: ${type.name} (${type.slug})`);
    }
    console.log(`✅ Seeded ${apparelTypes.length} apparel types\n`);

    // Seed Apparel Items
    console.log('👕 Seeding apparel items...');
    for (const item of apparelItems) {
      const itemRef = db.collection('apparel_items').doc();
      await itemRef.set(item);
      console.log(`  ✓ Created item: ${item.name}`);
    }
    console.log(`✅ Seeded ${apparelItems.length} apparel items\n`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Upload mock images via Super Admin UI');
    console.log('  2. Verify items appear in Creator Lab ApparelSelector');
    console.log('  3. Test creating new custom apparel types\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('✨ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
