
'use server';
// This file can be used to share type definitions between your main app and Cloud Functions
// It's a good practice to have a single source of truth for your types.

// Example:
// export interface MyCustomType {
//   id: string;
//   name: string;
//   createdAt: FirebaseFirestore.Timestamp;
// }
export interface JustBrandVariant {
  title: string;
  sku: string | null;
  price: number;
  image: string | null;
}

export interface JustBrandProduct {
  title: string;
  handle: string;
  productUrl: string;
  description: string;
  price: number;
  priceMin: number;
  priceMax: number;
  images: string[];
  variants: JustBrandVariant[];
}

export interface JustBrandCategory {
  name: string;
  slug: string;
  url: string;
  products: JustBrandProduct[];
}

export interface ScrapeLog {
  status: 'started' | 'completed' | 'failed';
  startTime: FirebaseFirestore.Timestamp;
  endTime?: FirebaseFirestore.Timestamp;
  itemCount: number;
  successCount: number;
  failCount: number;
  error?: string;
  messages: string[];
}
