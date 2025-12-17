import { Timestamp } from 'firebase/firestore';

export interface ApparelItem {
  id?: string;
  itemType: 'tshirt' | 'hoodie' | 'sweatshirt' | 'cap' | 'beanie' | 'long_sleeve';
  name: string; // e.g., "Black T-Shirt", "Black Hoodie"
  description?: string;
  category: 'tops' | 'headwear' | 'outerwear';
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
  
  // Template images
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

// Standard apparel types with default dimensions/weights
export const STANDARD_APPAREL_TYPES = {
  tshirt: {
    name: 'T-Shirt',
    category: 'tops' as const,
    weight: 0.2, // kg
    dimensions: { length: 30, width: 25, height: 2 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 280, height: 350 },
    },
  },
  hoodie: {
    name: 'Hoodie',
    category: 'outerwear' as const,
    weight: 0.6, // kg
    dimensions: { length: 35, width: 30, height: 8 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 320, height: 400 },
    },
  },
  sweatshirt: {
    name: 'Sweatshirt',
    category: 'outerwear' as const,
    weight: 0.5, // kg
    dimensions: { length: 35, width: 30, height: 6 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 320, height: 400 },
    },
  },
  cap: {
    name: 'Cap',
    category: 'headwear' as const,
    weight: 0.15, // kg
    dimensions: { length: 25, width: 20, height: 12 }, // cm
    availableSizes: ['One Size'],
    printAreas: {
      front: { x: 0, y: 0, width: 200, height: 150 },
    },
  },
  beanie: {
    name: 'Beanie',
    category: 'headwear' as const,
    weight: 0.12, // kg
    dimensions: { length: 22, width: 20, height: 10 }, // cm
    availableSizes: ['One Size'],
    printAreas: {
      front: { x: 0, y: 0, width: 180, height: 120 },
    },
  },
  long_sleeve: {
    name: 'Long Sleeve Shirt',
    category: 'tops' as const,
    weight: 0.3, // kg
    dimensions: { length: 32, width: 28, height: 4 }, // cm (folded)
    availableSizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printAreas: {
      front: { x: 0, y: 0, width: 280, height: 350 },
      back: { x: 0, y: 0, width: 280, height: 350 },
    },
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
