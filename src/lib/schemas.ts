
import { z } from 'zod';

const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeErrorMessage = "Invalid time format (HH:MM). Leave empty if not applicable.";

// Base schema for common dispensary fields
const baseDispensarySchema = z.object({
  fullName: z.string().min(2, { message: "Owner's full name must be at least 2 characters." }),
  phone: z.string()
    .min(10, { message: "Phone number seems too short." })
    .regex(/^\+\d{1,3}\d{6,14}$/, { message: "Invalid phone number format. Include country code (e.g., +27821234567)." }),
  ownerEmail: z.string().email({ message: "Invalid email address." }),
  dispensaryName: z.string().min(2, { message: "Dispensary name must be at least 2 characters." }),
  dispensaryType: z.string({ required_error: "Please select a dispensary type." }).min(1, { message: "Please select a dispensary type." }),
  currency: z.string({ required_error: "Please select a currency." }).min(1, { message: "Please select a currency." }),
  openTime: z.string().refine(val => val === '' || timeFormatRegex.test(val), { message: timeErrorMessage }).optional().nullable(),
  closeTime: z.string().refine(val => val === '' || timeFormatRegex.test(val), { message: timeErrorMessage }).optional().nullable(),
  operatingDays: z.array(z.string()).min(1, { message: "Select at least one operating day." }),
  location: z.string().min(5, { message: "Location address must be at least 5 characters." }),
  latitude: z.number({invalid_type_error: "Invalid latitude"}).optional().nullable(),
  longitude: z.number({invalid_type_error: "Invalid longitude"}).optional().nullable(),
  deliveryRadius: z.string().optional().nullable(),
  bulkDeliveryRadius: z.string().optional().nullable(),
  collectionOnly: z.boolean().default(false).optional(),
  orderType: z.enum(["small", "bulk", "both"], { required_error: "Please select an order type." }).optional().nullable(),
  participateSharing: z.enum(["yes", "no"], { required_error: "Please select participation preference." }).optional().nullable(),
  leadTime: z.string().optional().nullable(),
  message: z.string().max(500, { message: "Message cannot exceed 500 characters." }).optional().nullable(),
});

// Schema for Dispensary Signup
export const dispensarySignupSchema = baseDispensarySchema.extend({
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions.",
  }),
}).superRefine((data, ctx) => {
  if (data.participateSharing === "yes" && (!data.leadTime || data.leadTime.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lead time is required if participating in product sharing.",
      path: ["leadTime"],
    });
  }
  if (data.openTime && data.closeTime && data.openTime >= data.closeTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Open time must be before close time.",
      path: ["openTime"],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Close time must be after open time.",
      path: ["closeTime"],
    });
  }
});
export type DispensarySignupFormData = z.infer<typeof dispensarySignupSchema>;


// Schema for Admin Creating Dispensary
export const adminCreateDispensarySchema = baseDispensarySchema.extend({
  status: z.enum(['Pending Approval', 'Approved', 'Rejected', 'Suspended'], { required_error: "Please select a status." }),
}).superRefine((data, ctx) => {
  if (data.participateSharing === "yes" && (!data.leadTime || data.leadTime.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lead time is required if participating in product sharing.",
      path: ["leadTime"],
    });
  }
   if (data.openTime && data.closeTime && data.openTime >= data.closeTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Open time must be before close time.",
      path: ["openTime"],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Close time must be after open time.",
      path: ["closeTime"],
    });
  }
});
export type AdminCreateDispensaryFormData = z.infer<typeof adminCreateDispensarySchema>;


// Schema for Admin Editing Dispensary
export const editDispensarySchema = baseDispensarySchema.extend({
  status: z.enum(['Pending Approval', 'Approved', 'Rejected', 'Suspended'], { required_error: "Please select a status." }),
  applicationDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.participateSharing === "yes" && (!data.leadTime || data.leadTime.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lead time is required if participating in product sharing.",
      path: ["leadTime"],
    });
  }
   if (data.openTime && data.closeTime && data.openTime >= data.closeTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Open time must be before close time.",
      path: ["openTime"],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Close time must be after open time.",
      path: ["closeTime"],
    });
  }
});
export type EditDispensaryFormData = z.infer<typeof editDispensarySchema>;

// Schema for Dispensary Owner Editing their Dispensary Profile
export const ownerEditDispensarySchema = baseDispensarySchema.omit({
  ownerEmail: true,
  fullName: true,
}).extend({
  // status: z.enum(['Pending Approval', 'Approved', 'Rejected', 'Suspended']), // Status not editable by owner
  // applicationDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.participateSharing === "yes" && (!data.leadTime || data.leadTime.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Lead time is required if participating in product sharing.",
      path: ["leadTime"],
    });
  }
   if (data.openTime && data.closeTime && data.openTime >= data.closeTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Open time must be before close time.",
      path: ["openTime"],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Close time must be after open time.",
      path: ["closeTime"],
    });
  }
});
export type OwnerEditDispensaryFormData = z.infer<typeof ownerEditDispensarySchema>;


// Schema for User Profile (Example, if needed later)
export const userProfileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
});
export type UserProfileFormData = z.infer<typeof userProfileSchema>;

// Schema for Product Category object (can include subcategories)
export const productCategorySchema = z.object({
  name: z.string().min(1, "Category name cannot be empty."),
  subcategories: z.array(z.string().min(1, "Subcategory name cannot be empty.")).optional().default([]),
});
export type ProductCategoryFormData = z.infer<typeof productCategorySchema>;

// Schema for Dispensary Type (used in admin forms for adding new types)
export const dispensaryTypeSchema = z.object({
  name: z.string().min(2, { message: "Dispensary type name must be at least 2 characters." }),
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional().nullable(),
  iconPath: z.string().url({ message: "Invalid URL for icon path."}).or(z.literal(null)).optional().nullable(),
  image: z.string().url({ message: "Please enter a valid URL for the image." }).or(z.literal(null)).optional().nullable(),
  advisorFocusPrompt: z.string().max(1000, "Advisor focus prompt cannot exceed 1000 characters.").optional().nullable(),
  productCategories: z.array(productCategorySchema).optional().default([]), // Updated to use productCategorySchema
});
export type DispensaryTypeFormData = z.infer<typeof dispensaryTypeSchema>;

// Schema for Product
export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters."),
  description: z.string().min(10, "Description must be at least 10 characters.").max(1000, "Description too long."),
  category: z.string().min(1, "Category is required."),
  subcategory: z.string().optional().nullable(), // New field for subcategory
  strain: z.string().optional().nullable(),
  thcContent: z.coerce.number().min(0).max(100).optional().nullable(),
  cbdContent: z.coerce.number().min(0).max(100).optional().nullable(),
  price: z.coerce.number().positive("Price must be a positive number."),
  currency: z.string().min(3, "Currency code required (e.g., ZAR, USD).").max(3, "Currency code too long."),
  unit: z.string().min(1, "Unit is required (e.g., gram, oz, ml, piece)."),
  quantityInStock: z.coerce.number().int().min(0, "Stock cannot be negative."),
  imageUrl: z.string().url("Invalid image URL.").or(z.literal(null)).optional().nullable(),
  labTested: z.boolean().default(false).optional(),
  effects: z.array(z.string()).optional().default([]),
  flavors: z.array(z.string()).optional().default([]),
  medicalUses: z.array(z.string()).optional().default([]),
  isAvailableForPool: z.boolean().default(false).optional(),
  tags: z.array(z.string()).optional().default([]),
});
export type ProductFormData = z.infer<typeof productSchema>;

// Schema for creating a Product Request
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
  preferredDeliveryDate: z.string().optional().nullable(),
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
    "issue_reported"
  ]).default("pending_owner_approval"),

  notes: z.array(z.object({
    note: z.string(),
    byName: z.string(),
    senderRole: z.enum(['requester', 'owner', 'super_admin']),
    timestamp: z.any()
  })).optional().default([]),
});
export type ProductRequestFormData = z.infer<typeof productRequestSchema>;


// Schema for adding a note to a Product Request
export const addProductRequestNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty.").max(500, "Note is too long."),
  byName: z.string(),
  senderRole: z.enum(['requester', 'owner', 'super_admin']),
});
export type AddProductRequestNoteFormData = z.infer<typeof addProductRequestNoteSchema>;

// Schema for reporting an issue with a product pool transaction
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

// Schema for Credit Package (Admin CRUD)
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

// Schema for user signup
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

// Schema for user signin
export const userSigninSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});
export type UserSigninFormData = z.infer<typeof userSigninSchema>;

// Schema for User (Firestore document, used for role management etc.)
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
  welcomeCreditsAwarded: z.boolean().optional().default(false), // New field
});
export type User = z.infer<typeof userSchema>;

// Schema for Super Admin Adding a New User
export const adminAddUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff']),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']).default('Active'),
  credits: z.coerce.number().int().min(0, "Credits cannot be negative.").default(10),
  dispensaryId: z.string().optional().nullable(),
}).refine(data => data.role !== 'DispensaryOwner' || (data.role === 'DispensaryOwner' && data.dispensaryId && data.dispensaryId.trim() !== ''), {
  message: "Dispensary ID is required for Dispensary Owners.",
  path: ["dispensaryId"],
});
export type AdminAddUserFormData = z.infer<typeof adminAddUserSchema>;

// Schema for Dispensary Owner Adding Staff
export const dispensaryOwnerAddStaffSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']).default('PendingApproval'), // Staff start as pending
});
export type DispensaryOwnerAddStaffFormData = z.infer<typeof dispensaryOwnerAddStaffSchema>;

// Schema for Dispensary Owner Adding Leaf User
export const dispensaryOwnerAddLeafUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  status: z.enum(['Active', 'Suspended', 'PendingApproval']).default('PendingApproval'), // Leaf users also start as pending
  credits: z.coerce.number().int().min(0).default(0), // Start with 0, award on activation
});
export type DispensaryOwnerAddLeafUserFormData = z.infer<typeof dispensaryOwnerAddLeafUserSchema>;

// Schema for Notifications
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


// Schema for logging AI interactions
export const aiInteractionLogSchema = z.object({
  userId: z.string(),
  advisorSlug: z.string(),
  creditsUsed: z.number().int().min(0),
  wasFreeInteraction: z.boolean().default(false),
  timestamp: z.any(),
  promptUsed: z.string().optional().nullable(),
  responseSummary: z.string().optional().nullable(),
});
export type AIInteractionLog = z.infer<typeof aiInteractionLogSchema>;

// Schema for DispensaryType (used in various places)
export const dispensaryTypeDbSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Dispensary type name must be at least 2 characters." }),
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional().nullable(),
  iconPath: z.string().url({ message: "Invalid URL for icon path."}).or(z.literal(null)).optional().nullable(),
  image: z.string().url({ message: "Please enter a valid URL for the image." }).or(z.literal(null)).optional().nullable(),
  advisorFocusPrompt: z.string().max(1000, "Advisor focus prompt cannot exceed 1000 characters.").optional().nullable(),
  productCategories: z.array(productCategorySchema).optional().default([]), // Corrected
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});
export type DispensaryType = z.infer<typeof dispensaryTypeDbSchema>;


// Schema for the main Dispensary document in Firestore
export const dispensaryDbSchema = baseDispensarySchema.extend({
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


// Schema for Product (as stored in Firestore, includes ID and denormalized fields)
export const productDbSchema = productSchema.extend({
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
export type Product = z.infer<typeof productDbSchema>;

// Schema for ProductRequest (as stored in Firestore, includes ID)
export const productRequestDbSchema = productRequestSchema.extend({
  id: z.string().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
  productDetails: z.object({
    name: z.string(),
    category: z.string(),
    unit: z.string(),
    price: z.number(),
    currency: z.string(),
    imageUrl: z.string().url().optional().nullable(),
  }).optional().nullable(),
});
export type ProductRequest = z.infer<typeof productRequestDbSchema>;


// Schema for PoolIssue (as stored in Firestore, includes ID)
export const poolIssueDbSchema = poolIssueSchema.extend({
  id: z.string().optional(),
  createdAt: z.any(),
  updatedAt: z.any(),
});
export type PoolIssue = z.infer<typeof poolIssueDbSchema>;

// Schema for CreditPackage (as stored in Firestore, includes ID)
export const creditPackageDbSchema = creditPackageSchema.extend({
  id: z.string().optional(),
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
});
export type CreditPackage = z.infer<typeof creditPackageDbSchema>;

// Schema for AI Advisor content/configuration (if you plan to store this in Firestore)
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
