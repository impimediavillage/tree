import type { Product, PriceTier } from './index';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  originalName?: string;
  description?: string;
  category: string;
  strain?: string | null;
  dispensaryId: string;
  dispensaryName: string;
  dispensaryType?: string | null;
  productOwnerEmail: string;
  createdBy?: string; // userId who created the product (for vendor filtering)
  vendorUserId?: string | null; // Vendor user ID if product was created by vendor
  currency?: string;
  price: number;
  unit: string;
  quantity: number;
  quantityInStock: number;
  imageUrl?: string | null;
  sampleAmount?: number;
  productType: Product['productType'];
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}
