
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * Creates a new array to avoid modifying the original.
 * @param array The array to shuffle.
 * @returns A new shuffled array.
 */
export const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  let currentIndex = newArray.length, randomIndex;

  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }

  return newArray;
};


export const getProductCollectionName = (dispensaryType?: string | null, forAddPage: boolean = false): string => {
    if (!dispensaryType) {
        console.warn("[getProductCollectionName] Dispensary type is null or undefined, defaulting to 'products' or a default add page.");
        return forAddPage ? '/dispensary-admin/products/add/thc' : 'products';
    }
    
    // This is for page routing for the "Add Product" pages
    if (forAddPage) {
        switch(dispensaryType) {
            case 'Cannibinoid store':
              return '/dispensary-admin/products/add/thc';
            case 'Traditional Medicine dispensary':
              return '/dispensary-admin/products/add/traditional-medicine';
            case 'Homeopathic store':
              return '/dispensary-admin/products/add/homeopathy';
            case 'Mushroom store':
              return '/dispensary-admin/products/add/mushroom';
            case 'Permaculture & gardening store':
              return '/dispensary-admin/products/add/permaculture';
            default:
              console.warn(`[getProductCollectionName] No specific add page for type: ${dispensaryType}. Defaulting.`);
              return '/dispensary-admin/products/add/thc';
        }
    }

    // This is for Firestore collection names
    switch (dispensaryType) {
        case "Cannibinoid store":
            return "cannibinoid_store_products";
        case "Traditional Medicine dispensary":
            return "traditional_medicine_dispensary_products";
        case "Homeopathic store":
            return "homeopathy_store_products";
        case "Mushroom store":
            return "mushroom_store_products";
        case "Permaculture & gardening store":
            return "permaculture_store_products";
        default:
            console.warn(`[getProductCollectionName] Using fallback 'products' collection for unknown dispensary type: ${dispensaryType}`);
            return 'products';
    }
};
