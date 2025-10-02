import { z } from 'zod';

export const userSigninSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
});

export type UserSigninFormData = z.infer<typeof userSigninSchema>;

export const PriceTierSchema = z.object({
  unit: z.string().min(1, 'Unit is required'),
  price: z.preprocess(
    (val) => val === '' ? null : Number(val),
    z.number().positive('Price must be a positive number').nullable()
  ),
  quantityInStock: z.preprocess(
    (val) => val === '' ? null : Number(val),
    z.number().int().min(0, 'Stock cannot be negative').nullable()
  ),
  description: z.string().optional(),
    weightKgs: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Weight must be a number' }).positive('Weight must be positive').optional().nullable()
  ),
  lengthCm: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Length must be a number' }).positive('Length must be positive').optional().nullable()
  ),
  widthCm: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Width must be a number' }).positive('Width must be positive').optional().nullable()
  ),
  heightCm: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Height must be a number' }).positive('Height must be positive').optional().nullable()
  ),
});

export const PoolPriceTierSchema = z.object({
  unit: z.string().min(1, 'Unit is required'),
  price: z.preprocess(
    (val) => val === '' ? null : Number(val),
    z.number().positive('Price must be a positive number').nullable()
  ),
  quantityInStock: z.preprocess(
    (val) => val === '' ? null : Number(val),
    z.number().int().min(0, 'Stock cannot be negative').nullable()
  ),
  description: z.string().optional(),
      weightKgs: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Weight must be a number' }).positive('Weight must be positive').optional().nullable()
  ),
  lengthCm: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Length must be a number' }).positive('Length must be positive').optional().nullable()
  ),
  widthCm: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Width must be a number' }).positive('Width must be positive').optional().nullable()
  ),
  heightCm: z.preprocess(
    (val) => (val === '' || val === null) ? undefined : Number(val),
    z.number({ invalid_type_error: 'Height must be a number' }).positive('Height must be positive').optional().nullable()
  ),
});

export const ProductAttributeSchema = z.object({
  name: z.string(),
  level: z.number(),
});

export const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters long'),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().nullable(),
  subSubcategory: z.string().nullable(),
  priceTiers: z.array(PriceTierSchema).min(1, 'At least one price tier is required'),
  isAvailableForPool: z.boolean(),
  poolPriceTiers: z.array(PoolPriceTierSchema).optional(),
  tags: z.array(z.string()).optional(),
  productType: z.enum(['THC', 'CBD', 'HEMP', 'Apparel', 'Gear', 'Other', 'Homeopathy', 'Mushroom', 'Permaculture', 'Traditional Medicine']),
  labTested: z.boolean(),
  labTestReportUrl: z.string().url().nullable(),
  effects: z.array(ProductAttributeSchema).optional(),
  medicalUses: z.array(ProductAttributeSchema).optional(),
  flavors: z.array(z.string()).optional(),
  genetics: z.string().optional(),
  thcContent: z.string().optional(),
  cbdContent: z.string().optional(),
  terpeneProfile: z.string().optional(),
  currency: z.string().optional(),
  gender: z.enum(['Mens', 'Womens', 'Unisex']).optional(),
  sizingSystem: z.enum(['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other']).optional(),
  sizes: z.array(z.string()).optional(),
  poolSharingRule: z.enum(['same_type', 'all_types', 'specific_stores']).optional(),
  allowedPoolDispensaryIds: z.array(z.string()).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type ProductAttribute = z.infer<typeof ProductAttributeSchema>;
