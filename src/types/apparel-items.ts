import { Timestamp } from 'firebase/firestore';

export interface ApparelType {
  id?: string;
  name: string; // e.g., "T-Shirt", "Hoodie", "Vest"
  slug: string; // e.g., "tshirt", "hoodie", "vest"
  category: 'tops' | 'headwear' | 'outerwear' | 'accessories';
  displayOrder: number; // For sorting in dropdowns
  isActive: boolean;
  defaultWeight?: number; // Default weight in kg
  defaultDimensions?: {
    length: number;
    width: number;
    height: number;
  };
  defaultSizes?: string[];
  defaultPrintAreas?: {
    front?: { x: number; y: number; width: number; height: number };
    back?: { x: number; y: number; width: number; height: number };
  };
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface ApparelItem {
  id?: string;
  itemType: string; // Now dynamic - references ApparelType slug
  name: string; // e.g., "Black T-Shirt", "Black Hoodie"
  description?: string;
  category: 'tops' | 'headwear' | 'outerwear' | 'accessories';
  basePrice: number; // Base manufacturing cost
  retailPrice: number; // Suggested retail price
  availableSizes: string[]; // e.g., ["S", "M", "L", "XL", "XXL"]
  availableColors: string[]; // e.g., ["black", "white", "navy"]
  primaryColor: string; // Default color
  
  // Shipping dimensions and weight (required for Pudo API)
  weight: number; // in kg
  dimensions: {
    length: number; // in cm
    width: number; // in cm
    height: number; // in cm
  };
  
  // Mock images for Creator Lab display (1000x1000px, <100KB, square, flat 2D product)
  mockImageUrl?: string; // Main product image for Creator Lab selector
  mockImageFront?: string; // Front view (for items with surfaces)
  mockImageBack?: string; // Back view (for items with surfaces)
  mockImageThumbnail?: string; // 300x300 thumbnail for table view
  
  // Template images (for design overlay positioning)
  frontTemplateUrl?: string; // URL to front template image
  backTemplateUrl?: string; // URL to back template image
  
  // Print areas (for design overlay)
  printAreas: {
    front?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    back?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  
  // Display restrictions for Creator Lab
  restrictions?: string; // e.g., "⭕ Circular badge (20cm diameter) - Center fold area"
  hasSurface?: boolean; // Can choose front/back surfaces
  
  // Status
  isActive: boolean;
  inStock: boolean;
  
  // Metadata
  sku?: string;
  manufacturer?: string;
  materialComposition?: string; // e.g., "100% Cotton"
  careInstructions?: string;
  
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy?: string; // Super Admin UID
}

export interface CreateApparelItemData {
  itemType: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  retailPrice: number;
  availableSizes: string[];
  availableColors: string[];
  primaryColor: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  frontTemplateUrl?: string;
  backTemplateUrl?: string;
  printAreas: any;
  sku?: string;
  manufacturer?: string;
  materialComposition?: string;
  careInstructions?: string;
}

// Standard apparel types with default dimensions/weights (will be seeded to Firestore)
export const STANDARD_APPAREL_TYPES = {
  tshirt: {
    name: 'T-Shirt',
    slug: 'tshirt',
    category: 'tops' as const,
    weight: 0.2, // kg
    dimensions: { length: 30, width: 25, height: 2 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 280, height: 350 },
    },
    hasSurface: true,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
  },
  hoodie: {
    name: 'Hoodie',
    slug: 'hoodie',
    category: 'outerwear' as const,
    weight: 0.6, // kg
    dimensions: { length: 35, width: 30, height: 8 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 320, height: 400 },
    },
    hasSurface: true,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
  },
  sweatshirt: {
    name: 'Sweatshirt',
    slug: 'sweatshirt',
    category: 'outerwear' as const,
    weight: 0.5, // kg
    dimensions: { length: 35, width: 30, height: 6 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 320, height: 400 },
    },
    hasSurface: true,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
  },
  cap: {
    name: 'Cap',
    slug: 'cap',
    category: 'headwear' as const,
    weight: 0.15, // kg
    dimensions: { length: 25, width: 20, height: 12 }, // cm
    availableSizes: ['One Size'],
    printAreas: {
      front: { x: 0, y: 0, width: 200, height: 150 },
    },
    hasSurface: false,
    restrictions: '⭕ Circular badge (20cm diameter) - Front or peak position',
  },
  beanie: {
    name: 'Beanie',
    slug: 'beanie',
    category: 'headwear' as const,
    weight: 0.12, // kg
    dimensions: { length: 22, width: 20, height: 10 }, // cm
    availableSizes: ['One Size'],
    printAreas: {
      front: { x: 0, y: 0, width: 180, height: 120 },
    },
    hasSurface: false,
    restrictions: '⭕ Circular badge (20cm diameter) - Center fold area',
  },
  long_sleeve: {
    name: 'Long Sleeve Shirt',
    slug: 'long_sleeve',
    category: 'tops' as const,
    weight: 0.3, // kg
    dimensions: { length: 32, width: 28, height: 4 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 280, height: 350 },
    },
    hasSurface: true,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front or back',
  },
  backpack: {
    name: 'Backpack',
    slug: 'backpack',
    category: 'accessories' as const,
    weight: 0.4, // kg
    dimensions: { length: 40, width: 30, height: 15 }, // cm
    availableSizes: ['One Size'],
    printAreas: {
      front: { x: 0, y: 0, width: 250, height: 300 },
    },
    hasSurface: false,
    restrictions: '▭ Rectangular design (20cm x 40cm) - Front panel',
  },
};

export const STANDARD_COLORS = [
  { value: 'black', label: 'Black', hex: '#000000' },
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'navy', label: 'Navy', hex: '#001F3F' },
  { value: 'gray', label: 'Gray', hex: '#808080' },
  { value: 'red', label: 'Red', hex: '#FF4136' },
  { value: 'green', label: 'Green', hex: '#2ECC40' },
  { value: 'blue', label: 'Blue', hex: '#0074D9' },
];
