import { z } from 'zod';

import type { ProductCategory as ProductCategoryType } from '../functions/src/types';

const timeFormatRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
const timeErrorMessage = "Invalid time format (HH:MM). Leave empty if not applicable.";

// =================================================================
// REFACTORED BASE SCHEMA
const pudoLockerSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  distanceKm: z.number().optional().nullable(),
});
// =================================================================
export const baseWellnessSchema = z.object({
  fullName: z.string().min(2, { message: "Owner's full name must be at least 2 characters." }),
  phone: z.string().min(9, { message: "Phone number seems too short." }),    
  ownerEmail: z.string().email({ message: "Invalid email address." }),
  dispensaryName: z.string().min(2, { message: "Wellness name must be at least 2 characters." }),
  dispensaryType: z.string({ required_error: "Please select a wellness type." }).min(1, { message: "Please select a wellness type." }),
  currency: z.string({ required_error: "Please select a currency." }).min(1, { message: "Please select a currency." }),
  openTime: z.string().refine(val => val === '' || timeFormatRegex.test(val), { message: timeErrorMessage }).optional().nullable(),
  closeTime: z.string().refine(val => val === '' || timeFormatRegex.test(val), { message: timeErrorMessage }).optional().nullable(),
  operatingDays: z.array(z.string()).optional().default([]),
  shippingMethods: z.array(z.string()).optional().default([]),
  
  // --- NEW STRUCTURED ADDRESS FIELDS ---
  streetAddress: z.string().min(1, { message: "Street address is required (auto-filled from map)." }),
  suburb: z.string().optional().nullable(),
  city: z.string().min(1, { message: "City is required (auto-filled from map)." }),
  postalCode: z.string().min(1, { message: "Postal code is required (auto-filled from map)." }),
  province: z.string().min(1, { message: "Province is required." }),
  country: z.string().min(1, { message: "Country is required." }),  
  latitude: z.number({ invalid_type_error: "A valid location must be selected on the map." }),
  longitude: z.number({ invalid_type_error: "A valid location must be selected on the map." }),
  showLocation: z.boolean().default(true).optional(),
  deliveryRadius: z.string().optional().nullable(),
  message: z.string().max(500, { message: "Message cannot exceed 500 characters." }).optional().nullable(),
  originLocker: pudoLockerSchema.nullable().optional(),
});
export type BaseWellnessFormData = z.infer<typeof baseWellnessSchema>;


// =================================================================
// DEPENDENT SCHEMAS (These will now inherit the correct fields)
// =================================================================

export const dispensarySignupSchema = baseWellnessSchema.extend({
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions.",
  }),
}).superRefine((data, ctx) => {
  if (data.openTime && data.closeTime && data.openTime >= data.closeTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Open time must be before close time.", path: ["openTime"] });
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Close time must be after open time.", path: ["closeTime"] });
  }
});
export type DispensarySignupFormData = z.infer<typeof dispensarySignupSchema>;

export const adminCreateDispensarySchema = baseWellnessSchema.extend({
  status: z.enum(['Pending Approval', 'Approved', 'Rejected', 'Suspended']),
});
export type AdminCreateDispensaryFormData = z.infer<typeof adminCreateDispensarySchema>;

export const editDispensarySchema = baseWellnessSchema.extend({
  status: z.enum(['Pending Approval', 'Approved', 'Rejected', 'Suspended'], { required_error: "Please select a status." }),
  applicationDate: z.any().optional(), // Allow any type for applicationDate
}).superRefine((data, ctx) => {
   if (data.openTime && data.closeTime && data.openTime >= data.closeTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Open time must be before close time.", path: ["openTime"] });
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Close time must be after open time.", path: ["closeTime"] });
  }
});
export type EditDispensaryFormData = z.infer<typeof editDispensarySchema>;

export const ownerEditDispensarySchema = z.object({
  dispensaryName: z.string().min(2, { message: "Wellness name must be at least 2 characters." }),
  currency: z.string({ required_error: "Please select a currency." }).min(1, { message: "Please select a currency." }),
  phone: z.string().min(9, { message: "A complete phone number is required." }),
  streetAddress: z.string().min(1, { message: "Street address is required." }),
  suburb: z.string().min(1, { message: "Suburb is required." }),
  city: z.string().min(1, { message: "City is required." }),
  postalCode: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  latitude: z.number({ required_error: "A valid location must be selected on the map.", invalid_type_error: "A valid location must be selected on the map." }),
  longitude: z.number({ required_error: "A valid location must be selected on the map.", invalid_type_error: "A valid location must be selected on the map." }),
  showLocation: z.boolean().default(true).optional(),
  openTime: z.string().refine(val => val === '' || timeFormatRegex.test(val), { message: timeErrorMessage }).optional().nullable(),
  closeTime: z.string().refine(val => val === '' || timeFormatRegex.test(val), { message: timeErrorMessage }).optional().nullable(),
  operatingDays: z.array(z.string()).optional().default([]),
  shippingMethods: z.array(z.string()).min(1, { message: "Please select at least one shipping method." }),
  deliveryRadius: z.string().optional().nullable(),
  originLocker: pudoLockerSchema.nullable().optional(),
  message: z.string().max(500, { message: "Message cannot exceed 500 characters." }).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.openTime && data.closeTime && data.openTime >= data.closeTime) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Open time must be before close time.', path: ['openTime'] });
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Close time must be after open time.', path: ['closeTime'] });
  }

  const lockerRequired = data.shippingMethods.includes('LTL') || data.shippingMethods.includes('LTD');
  if (lockerRequired && (!data.originLocker || !data.originLocker.id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'An origin locker must be selected for Locker to Locker or Locker to Door shipping.',
      path: ['originLocker'],
    });
  }
});



export type OwnerEditDispensaryFormData = z.infer<typeof ownerEditDispensarySchema>;


// --- ALL OTHER SCHEMAS REMAIN UNCHANGED ---

export const userProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
});
export type UserProfileFormData = z.infer<typeof userProfileSchema>;

export const productCategorySchema: z.ZodType<ProductCategoryType> = z.object({
  name: z.string().min(1, "Category name cannot be empty.").max(100, "Category name too long."),
  subcategories: z.array(z.lazy(() => productCategorySchema)).optional().default([]),
});
export type ProductCategoryFormData = z.infer<typeof productCategorySchema>;

export const dispensaryTypeProductCategoriesSchema = z.object({
  categoriesData: z.array(productCategorySchema).optional().default([]), 
});
export type DispensaryTypeProductCategoriesFormData = z.infer<typeof dispensaryTypeProductCategoriesSchema>;

export const dispensaryTypeSchema = z.object({
  name: z.string().min(2, { message: "Wellness type name must be at least 2 characters." }),
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional().nullable(),
  iconPath: z.preprocess(
    (val) => (val === "" ? null : val),
    z.union([
      z.string().url({ message: "Invalid URL for icon path." }),
      z.string().startsWith('/', { message: "Icon path must be a URL or absolute path" }),
      z.null()
    ]).optional().nullable()
  ),
  image: z.preprocess(
    (val) => (val === "" ? null : val),
    z.union([
      z.string().url({ message: "Please enter a valid URL for the image." }),
      z.string().startsWith('/', { message: "Image must be a URL or absolute path" }),
      z.null()
    ]).optional().nullable()
  ),
  advisorFocusPrompt: z.string().max(1000, "Advisor focus prompt cannot exceed 1000 characters.").optional().nullable(),
  recommendedAdvisorIds: z.array(z.string()).optional().default([]),
});
export type DispensaryTypeFormData = z.infer<typeof dispensaryTypeSchema>;

export const priceTierSchema = z.object({
  unit: z.string().min(1, "Unit is required."),
  price: z.coerce.number({ 
      required_error: "Price is required.",
      invalid_type_error: "Price must be a valid number (e.g., 10.99)." 
    })
    .positive({ message: "Price must be a positive number." })
    .refine(val => {
        const valueTimes100 = val * 100;
        return Math.abs(valueTimes100 - Math.round(valueTimes100)) < 0.0001;
    }, {
      message: "Price can have at most two decimal places.",
    })
    .refine(val => val <= 9999999.99, { 
        message: "Price amount is too high (max 9,999,999.99)."
    }),
  quantityInStock: z.coerce.number().int().min(0, "Stock must be a non-negative number.").optional().nullable(),
  description: z.string().optional().nullable(),
});
export type PriceTierFormData = z.infer<typeof priceTierSchema>;

const attributeSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  percentage: z.string().regex(/^\d+(\.\d+)?%?$/, 'Must be a number or percentage (e.g., "55" or "55%")'),
});

const baseProductObjectSchema = z.object({
  creatorUid: z.string().optional(),
  name: z.string().min(2, "Product name must be at least 2 characters."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description too long."),
  category: z.string().min(1, "Category is required."),
  deliveryMethod: z.string().optional().nullable(),
  productSubCategory: z.string().optional().nullable(),
  subcategory: z.string().optional().nullable(),
  subSubcategory: z.string().optional().nullable(),
  productType: z.string().optional().nullable(),
  baseProductData: z.any().optional().nullable(),
  mostCommonTerpene: z.string().optional().nullable(),
  strain: z.string().optional().nullable(),
  strainType: z.string().optional().nullable(),
  homeGrow: z.array(z.string()).optional().nullable().default([]),
  growingMedium: z.enum(['Organic Soil', 'Hydroponic', 'Coco Coir', 'Aeroponic', 'Living Soil']).optional().nullable(),
  feedingType: z.enum(['Organic feed in Pots', 'Organic feed Hydro', 'Chemical feed in Pots with flush', 'Chemical feed hydro with flush', 'Organic & Chemical in Pots Flushed', 'Organic & Chemical hydro Flushed']).optional().nullable(),
  thcContent: z.string().optional().nullable(),
  cbdContent: z.string().optional().nullable(),
  effects: z.array(attributeSchema).optional().nullable().default([]),
  flavors: z.array(z.string()).optional().nullable().default([]),
  medicalUses: z.array(attributeSchema).optional().nullable().default([]),
  stickerProgramOptIn: z.enum(['yes', 'no']).optional().nullable(), 
  gender: z.enum(['Mens', 'Womens', 'Unisex']).optional().nullable(),
  sizingSystem: z.enum(['UK/SA', 'US', 'EURO', 'Alpha (XS-XXXL)', 'Other']).optional().nullable(),
  sizes: z.array(z.string()).optional().nullable().default([]),
  currency: z.string().min(3, "Currency code required (e.g., ZAR, USD).").max(3, "Currency code too long."),
  priceTiers: z.array(priceTierSchema).optional().default([]),
  poolPriceTiers: z.array(priceTierSchema).optional().nullable(),
  shippingMethods: z.array(z.string()).optional().default([]),
  poolShippingMethods: z.array(z.string()).optional().default([]),
  quantityInStock: z.coerce.number().int().min(0, "Stock cannot be negative.").optional(),
  imageUrls: z.array(z.string().url()).max(5, "You can upload a maximum of 5 images.").optional().nullable().default([]),
  labTested: z.boolean().default(false).optional(),
  labTestReportUrl: z.string().url().optional().nullable(),
  isAvailableForPool: z.boolean().default(false).optional(),
  poolSharingRule: z.enum(['same_type', 'all_types', 'specific_stores']).optional().nullable(),
  allowedPoolDispensaryIds: z.array(z.string()).optional().nullable().default([]),
  tags: z.array(z.string()).optional().nullable(),
});


export const productSchema = baseProductObjectSchema.superRefine((data, ctx) => {
    if (data.isAvailableForPool) {
        if (!data.poolPriceTiers || data.poolPriceTiers.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pool pricing is required if the product is available for sharing.", path: ["poolPriceTiers"] });
        }
        if (!data.poolSharingRule) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a sharing rule for the product pool.", path: ["poolSharingRule"] });
        }
        if (data.poolSharingRule === 'specific_stores' && (!data.allowedPoolDispensaryIds || data.allowedPoolDispensaryIds.length === 0)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select at least one specific dispensary to share with.", path: ["allowedPoolDispensaryIds"] });
        }
    }
    if (!data.isAvailableForPool && (!data.priceTiers || data.priceTiers.length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "At least one regular price tier is required.", path: ["priceTiers"] });
    }
});
export type ProductFormData = z.infer<typeof productSchema>;
export type ProductAttribute = z.infer<typeof attributeSchema>;


export const productRequestSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productOwnerDispensaryId: z.string(),
  productOwnerEmail: z.string().email(),
  productImage: z.string().url().optional().nullable(),

  requesterDispensaryId: z.string(),
  requesterDispensaryName: z.string(),
  requesterEmail: z.string().email(),

  quantityRequested: z.number().int().positive("Quantity must be positive."),
  requestedTier: priceTierSchema.optional().nullable(),
  preferredDeliveryDate: z.string().optional().nullable(),
  actualDeliveryDate: z.string().optional().nullable(),
  deliveryAddress: z.string().min(5, "Delivery address is required."),
  contactPerson: z.string().min(2, "Contact person name is required."),
  contactPhone: z.string().min(10, "Valid contact phone is required."),

  requestStatus: z.enum([
    "pending_owner_approval",
    "accepted",
    "rejected",
    "cancelled",
    "fulfilled_by_sender",
    "received_by_requester",
    "issue_reported",
    "ordered"
  ]).default("pending_owner_approval"),

  notes: z.array(z.object({
    note: z.string(),
    byName: z.string(),
    senderRole: z.enum(['requester', 'owner', 'super_admin']),
    timestamp: z.any()
  })).optional().default([]),
  
  productDetails: z.object({ 
    name: z.string(),
    category: z.string(),
    currency: z.string(),
    priceTiers: z.array(priceTierSchema), 
    imageUrl: z.string().url().optional().nullable(),
    dispensaryType: z.string(),
    dispensaryName: z.string(),
  }).optional().nullable(),
  orderDate: z.any().optional(),
});
export type ProductRequestFormData = z.infer<typeof productRequestSchema>;


export const addProductRequestNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty.").max(500, "Note is too long."),
});
export type AddProductRequestNoteFormData = z.infer<typeof addProductRequestNoteSchema>;

export const poolIssueSchema = z.object({
  productRequestId: z.string(),
  productName: z.string(),

  reporterDispensaryId: z.string(),
  reporterDispensaryName: z.string(),
  reporterEmail: z.string().email(),

  reportedDispensaryId: z.string(),
  reportedDispensaryName: z.string(),
  reportedDispensaryEmail: z.string().email(),

  issueType: z.enum([
    "product_not_as_described",
    "product_not_received",
    "product_damaged",
    "payment_issue",
    "communication_issue",
    "other"
  ]),
  description: z.string().min(20, "Please provide a detailed description of the issue (min 20 characters).").max(2000),

  issueStatus: z.enum([
    "new",
    "under_review",
    "awaiting_reporter_response",
    "awaiting_reported_party_response",
    "resolved",
    "closed"
  ]).default("new"),
  resolutionDetails: z.string().optional().nullable(),
});
export type PoolIssueFormData = z.infer<typeof poolIssueSchema>;

export const creditPackageSchema = z.object({
  name: z.string().min(3, "Package name must be at least 3 characters."),
  credits: z.number().int().positive("Credits must be a positive integer."),
  price: z.number().positive("Price must be a positive number."),
  currency: z.string().length(3, "Currency code must be 3 characters (e.g., USD, ZAR).").toUpperCase(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  bonusCredits: z.number().int().min(0).optional().nullable().default(0),
});
export type CreditPackageFormData = z.infer<typeof creditPackageSchema>;

export const userSignupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  preferredDispensaryTypes: z.array(z.string()).optional().default([]),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});
export type UserSignupFormData = z.infer<typeof userSignupSchema>;

export const userSigninSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
export type UserSigninFormData = z.infer<typeof userSigninSchema>;

export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional().nullable(),
  photoURL: z.string().url().optional().nullable(),
  role: z.enum(['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff']).default('User'),
  dispensaryId: z.string().optional().nullable(),
  credits: z.number().int().min(0).default(0),
  createdAt: z.any(),
  lastLoginAt: z.any().optional().nullable(),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']).default('Active'),
  preferredDispensaryTypes: z.array(z.string()).optional().default([]),
  welcomeCreditsAwarded: z.boolean().optional().default(false),
  signupSource: z.string().optional(), 
});
export type User = z.infer<typeof userSchema>;

export const adminAddUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff']),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']).default('Active'),
  credits: z.coerce.number().int().min(0, "Credits cannot be negative.").default(10),
  dispensaryId: z.string().optional().nullable(),
}).refine(data => data.role !== 'DispensaryOwner' || (data.role === 'DispensaryOwner' && data.dispensaryId && data.dispensaryId.trim() !== ''), {
  message: "Wellness ID is required for Wellness Owners.",
  path: ["dispensaryId"],
});
export type AdminAddUserFormData = z.infer<typeof adminAddUserSchema>;

export const dispensaryOwnerAddStaffSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']).default('PendingApproval'),
});
export type DispensaryOwnerAddStaffFormData = z.infer<typeof dispensaryOwnerAddStaffSchema>;

export const dispensaryOwnerAddLeafUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']).default('PendingApproval'),
  credits: z.coerce.number().int().min(0).default(0),
});
export type DispensaryOwnerAddLeafUserFormData = z.infer<typeof dispensaryOwnerAddLeafUserSchema>;

export const notificationSchema = z.object({
  recipientUid: z.string(),
  message: z.string().min(1, "Message cannot be empty."),
  link: z.string().optional().nullable(),
  read: z.boolean().default(false),
  type: z.enum([
    "product_request_new",
    "product_request_update",
    "pool_issue_new",
    "pool_issue_update",
    "credits_purchased",
    "dispensary_approved",
    "dispensary_rejected",
    "general_announcement"
  ]).optional().default("general_announcement"),
  severity: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  createdAt: z.any(),
});
export type Notification = z.infer<typeof notificationSchema>;


export const aiInteractionLogSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  dispensaryId: z.string().optional().nullable(),
  advisorSlug: z.string(),
  creditsUsed: z.number().int().min(0),
  wasFreeInteraction: z.boolean().default(false),
  timestamp: z.any(),
  promptUsed: z.string().optional().nullable(),
  responseSummary: z.string().optional().nullable(),
});
export type AIInteractionLog = z.infer<typeof aiInteractionLogSchema>;

export const dispensaryTypeDbSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Wellness type name must be at least 2 characters." }),
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional().nullable(),
  iconPath: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url({ message: "Invalid URL for icon path." }).optional().nullable()
  ),
  image: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url({ message: "Invalid URL for the image." }).optional().nullable()
  ),
  advisorFocusPrompt: z.string().max(1000, "Advisor focus prompt cannot exceed 1000 characters.").optional().nullable(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});
export type DispensaryType = z.infer<typeof dispensaryTypeDbSchema>;


export const dispensaryDbSchema = baseWellnessSchema.extend({
  id: z.string().optional(),
  status: z.enum(['Pending Approval', 'Approved', 'Rejected', 'Suspended']),
  applicationDate: z.any(),
  approvedDate: z.any().optional().nullable(),
  lastActivityDate: z.any().optional().nullable(),
  publicStoreUrl: z.string().url().optional().nullable(),

  productCount: z.number().int().min(0).default(0).optional(),
  incomingRequestCount: z.number().int().min(0).default(0).optional(),
  outgoingRequestCount: z.number().int().min(0).default(0).optional(),

  averageRating: z.number().min(0).max(5).optional().nullable(),
  reviewCount: z.number().int().min(0).default(0).optional(),
});
export type Dispensary = z.infer<typeof dispensaryDbSchema>;


export const baseProductDbSchema = baseProductObjectSchema.extend({
  id: z.string().optional(),
  dispensaryId: z.string(),
  dispensaryName: z.string(),
  dispensaryType: z.string(), 
  productOwnerEmail: z.string().email(),
  createdAt: z.any(),
  updatedAt: z.any(),
  dispensaryLocation: z.object({
    address: z.string(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
  }).optional().nullable(),
});
export const productDbSchema = baseProductDbSchema;
export type Product = z.infer<typeof productDbSchema>; 

export const productRequestDbSchema = productRequestSchema.extend({
  id: z.string().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
  productDetails: z.object({ 
    name: z.string(),
    category: z.string(),
    currency: z.string(),
    priceTiers: z.array(priceTierSchema), 
    imageUrl: z.string().url().optional().nullable(),
  }).optional().nullable(),
});
export type ProductRequest = z.infer<typeof productRequestDbSchema>;


export const poolIssueDbSchema = poolIssueSchema.extend({
  id: z.string().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
});
export type PoolIssue = z.infer<typeof poolIssueDbSchema>;

export const creditPackageDbSchema = creditPackageSchema.extend({
  id: z.string().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});
export type CreditPackage = z.infer<typeof creditPackageDbSchema>;

export const aiAdvisorConfigSchema = z.object({
  id: z.string().optional(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string().optional().nullable(),
  flowName: z.string(),
  inputSchemaPrompt: z.string().optional().nullable(),
  creditsPerQuery: z.number().int().min(0).default(1),
  freeQueriesAllowed: z.number().int().min(0).default(0),
  isEnabled: z.boolean().default(true),
  dataAiHint: z.string().optional().nullable(),
});
export type AIAdvisorConfig = z.infer<typeof aiAdvisorConfigSchema>;


// Schemas for Brand Asset Generation
export const GenerateInitialLogosInputSchema = z.object({
  name: z.string().describe('The name of the store or strain for which to generate logos.'),
  isStore: z.boolean().describe('Whether the name provided is a store name or a strain name.'),
});

export const GenerateInitialLogosOutputSchema = z.object({
  clayLogoUrl: z.string().url(),
  comicLogoUrl: z.string().url(),
  rastaLogoUrl: z.string().url(),
  farmstyleLogoUrl: z.string().url(),
  imaginativeLogoUrl: z.string().url(),
});

export const GenerateApparelInputSchema = z.object({
  style: z.enum(['clay', 'comic', 'rasta', 'farmstyle', 'imaginative']),
  circularStickerUrl: z.string().url().describe("The URL of the pre-generated circular logo for the chosen theme."),
  subjectName: z.string().describe('The name of the store or strain.'),
  isStore: z.boolean().describe('Whether the subject is a store or strain for prompt context.'),
});

// Schemas for Strain Sticker Generation
export const GenerateStrainStickerInputSchema = z.object({
  strainName: z.string().describe('The name of the cannabis strain.'),
  dispensaryName: z.string().describe('The name of the dispensary selling the product.'),
  flavors: z.array(z.string()).optional().describe('A list of flavors associated with the strain to influence the background.'),
});

export const GenerateStrainStickerOutputSchema = z.object({
  imageUrl: z.string().url().describe('The URL of the generated circular sticker image.'),
});


