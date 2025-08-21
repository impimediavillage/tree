import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getProductCollectionName = (dispensaryType?: string | null): string => {
    if (!dispensaryType) return 'products'; // Fallback for safety
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
        // This default is a fallback, but we should aim to have all types explicitly defined.
        default:
            console.warn(`[getProductCollectionName] Using fallback for dispensary type: ${dispensaryType}`);
            return 'products';
    }
};
