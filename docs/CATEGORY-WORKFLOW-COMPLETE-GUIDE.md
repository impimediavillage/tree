# Complete Category Workflow Guide
## From Super Admin to Dispensary Add/Edit Pages

This document explains the **end-to-end workflow** for how category structures configured by super admins translate into working dispensary-admin product add/edit pages.

---

## 🎯 Overview: The Complete Flow

```
Super Admin Adds Type
        ↓
System Analyzes Categories
        ↓
Routes Created Automatically
        ↓
Dispensary Uses Add/Edit Pages
        ↓
Products Stored in Collection
        ↓
Products Display on Storefront
```

---

## 📋 Step-by-Step Workflow

### **Step 1: Super Admin Adds New Wellness Type**

**Location:** `/admin/dashboard/dispensary-types`

**Actions:**
1. Click "Add New Type" button
2. Fill in Basic Details (name, description, icon, image)
3. Configure AI Advisor Settings
4. **Enable Generic Workflow** - Toggle ON ✅
5. Add Category Structure JSON in **Category Structure Tab**

**Example Category Structure JSON:**
```json
{
  "ayurvedicProducts": [
    {
      "name": "Doshas & Constitution",
      "value": "doshas",
      "imageUrl": "https://...",
      "description": "Products for balancing Vata, Pitta, Kapha"
    },
    {
      "name": "Body Systems",
      "value": "body_systems",
      "imageUrl": "https://...",
      "description": "Products targeting specific body systems"
    }
  ]
}
```

**What Happens:**
- ✅ Type saved to `dispensaryTypes` collection with `useGenericWorkflow: true`
- ✅ Cloud Function `analyzeCategoryStructureAndUpdate` triggered
- ✅ Category metadata extracted and stored in `categoryStructure` field

---

### **Step 2: System Analyzes & Stores Category Structure**

**Cloud Function:** `analyzeCategoryStructureAndUpdate`

**Analysis Process:**
```typescript
// Detects structure automatically
{
  depth: 2,                          // How many levels deep
  navigationPath: ["ayurvedicProducts"],  // Path to categories
  levels: [
    {
      key: "ayurvedicProducts",
      label: "Category",
      hasImage: true,
      isArray: true
    }
  ],
  sampleCategories: ["Doshas & Constitution", "Body Systems", ...]
}
```

**Storage Locations:**
1. **`dispensaryTypes/[typeId]`** - Stores `categoryStructure` metadata
2. **`dispensaryTypeProductCategories/[typeName]`** - Stores full JSON structure

---

### **Step 3: Route Generation (Automatic)**

**Router:** `src/lib/productWorkflowRouter.ts`

**For Wellness Type:** "Ayurvedic Medicine"

**Generated Routes:**
```typescript
{
  addRoute: "/dispensary-admin/products/add/ayurvedic_medicine",
  editRoute: (id) => `/dispensary-admin/products/edit/ayurvedic_medicine/${id}`,
  collectionName: "ayurvedic_medicine_products"
}
```

**Sanitization Rules:**
- Lowercase conversion
- Spaces → underscores
- Special chars removed

---

### **Step 4: Create Route Pages**

**You must manually create these files:**

#### **Add Page**
**File:** `src/app/dispensary-admin/products/add/ayurvedic_medicine/page.tsx`

```tsx
'use client';

import GenericProductAddPage from '@/components/products/GenericProductAddPage';

export default function AyurvedicProductAddPage() {
  return (
    <GenericProductAddPage
      dispensaryTypeName="Ayurvedic Medicine"
      categoryPath={['ayurvedicProducts']}  // Path to categories in JSON
      pageTitle="Add Ayurvedic Product"
      pageDescription="Add a new product to your ayurvedic dispensary"
    />
  );
}
```

#### **Edit Page**
**File:** `src/app/dispensary-admin/products/edit/ayurvedic_medicine/[productId]/page.tsx`

```tsx
'use client';

import GenericProductEditPage from '@/components/products/GenericProductEditPage';

export default function AyurvedicProductEditPage() {
  return (
    <GenericProductEditPage
      dispensaryTypeName="Ayurvedic Medicine"
      categoryPath={['ayurvedicProducts']}
      pageTitle="Edit Ayurvedic Product"
      pageDescription="Update product details for your ayurvedic dispensary"
    />
  );
}
```

---

### **Step 5: Dispensary Owner Uses Add Page**

**User Journey:**

1. **Navigate to Products**
   - Go to `/dispensary-admin/products`
   - Click "Add New Product" button

2. **Add Page Loads**
   - Route: `/dispensary-admin/products/add/ayurvedic_medicine`
   - Component: `GenericProductAddPage`

3. **Categories Load Automatically**
   ```typescript
   // Component fetches categories from Firestore
   const docRef = firestoreDoc(db, 'dispensaryTypeProductCategories', 'Ayurvedic Medicine');
   const docSnap = await getDoc(docRef);
   
   // Navigates through categoryPath
   let categories = data?.categoriesData;
   for (const path of categoryPath) {
     categories = categories?.[path];  // Goes to ['ayurvedicProducts']
   }
   ```

4. **Category Selection UI**
   - Top-level categories displayed as cards with images
   - Click category → expands to show subcategories (if any)
   - Select subcategory → form fields appear

5. **Fill Product Details**
   - Name, description
   - Price tiers (with units, price, stock)
   - Pool availability (optional)
   - Tags, lab testing info
   - Upload images

6. **Submit Product**
   - Validates form data
   - Uploads images to Storage
   - Saves to collection: `ayurvedic_medicine_products`

---

### **Step 6: Product Storage in Firestore**

**Collection Name:** `ayurvedic_medicine_products`

**Document Structure:**
```typescript
{
  id: "abc123",
  name: "Ashwagandha Root Powder",
  description: "Organic ashwagandha for stress relief",
  category: "doshas",                    // From top-level selection
  subcategory: "vata_balancing",         // From sub-level selection
  subSubcategory: null,                  // If 3+ levels exist
  productType: "Ayurvedic Medicine",
  dispensaryId: "disp_xyz",
  dispensaryName: "Holistic Wellness Co.",
  priceTiers: [
    { unit: "100 grams", price: 150, quantityInStock: 50 }
  ],
  imageUrls: ["https://storage.googleapis.com/..."],
  tags: ["adaptogen", "stress", "immune"],
  currency: "ZAR",
  createdBy: "user_123",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### **Step 7: Edit Product Workflow**

**User Journey:**

1. **Navigate to Product**
   - Go to `/dispensary-admin/products`
   - Click "Edit" on existing product

2. **Edit Page Loads**
   - Route: `/dispensary-admin/products/edit/ayurvedic_medicine/abc123`
   - Component: `GenericProductEditPage`

3. **Data Loads**
   - Fetches product from `ayurvedic_medicine_products/abc123`
   - Fetches categories from `dispensaryTypeProductCategories`
   - Pre-fills all form fields with existing data

4. **Modify & Save**
   - Change any fields
   - Upload new images or remove existing
   - Click "Update Product"
   - Updates document in Firestore

---

## 🔐 Safety Mechanisms

### **1. Force Custom Workflow (Backward Compatibility)**
**File:** `src/lib/productWorkflowRouter.ts`

```typescript
const FORCE_CUSTOM_WORKFLOW: string[] = [
  'Homeopathic store',
  'Traditional Medicine',
  'Mushroom',
  'Permaculture',
  'THC'
];
```

**Protection:** Even if `useGenericWorkflow` accidentally set to `true`, these types **always use custom pages**.

### **2. Default Behavior**
```typescript
// If useGenericWorkflow is undefined or false → custom pages
const useGeneric = dispensaryType.useGenericWorkflow === true;
```

### **3. Approved Generic List**
```typescript
export const GENERIC_WORKFLOW_TYPES = new Set<string>([
  'Apothecary',
  'Ayurvedic Medicine'  // Add new types here
]);
```

---

## 🗂️ File Structure Summary

```
src/
├── app/
│   ├── dispensary-admin/
│   │   └── products/
│   │       ├── add/
│   │       │   ├── ayurvedic_medicine/
│   │       │   │   └── page.tsx          ← Create this for new type
│   │       │   └── apothecary/
│   │       │       └── page.tsx          ← Existing example
│   │       └── edit/
│   │           ├── ayurvedic_medicine/
│   │           │   └── [productId]/
│   │           │       └── page.tsx      ← Create this for new type
│   │           └── apothecary/
│   │               └── [productId]/
│   │                   └── page.tsx      ← Existing example
│   └── admin/
│       └── dashboard/
│           └── dispensary-types/
│               └── page.tsx              ← Super admin adds types here
├── components/
│   ├── admin/
│   │   ├── DispensaryTypeDialog.tsx      ← Form with category builder
│   │   └── CategoryStructureBuilder.tsx  ← Visual node editor
│   └── products/
│       ├── GenericProductAddPage.tsx     ← Reusable add component
│       └── GenericProductEditPage.tsx    ← Reusable edit component
├── lib/
│   ├── productWorkflowRouter.ts          ← Route determination & safety
│   └── categoryStructureAnalyzer.ts      ← Structure analysis
└── types.ts                               ← TypeScript interfaces

functions/src/
└── dispensary-type-management.ts         ← analyzeCategoryStructureAndUpdate
```

---

## 📝 Checklist: Adding New Wellness Type

### **Super Admin Tasks:**
- [ ] Navigate to `/admin/dashboard/dispensary-types`
- [ ] Click "Add New Type"
- [ ] Fill Basic Details tab
- [ ] Enable "Use Generic Workflow" toggle
- [ ] Switch to "Category Structure" tab
- [ ] Paste JSON structure
- [ ] Use visual builder to verify structure
- [ ] Save type

### **Developer Tasks:**
- [ ] Note the sanitized route name (e.g., "Ayurvedic Medicine" → `ayurvedic_medicine`)
- [ ] Create add page: `src/app/dispensary-admin/products/add/[sanitized_name]/page.tsx`
- [ ] Create edit page: `src/app/dispensary-admin/products/edit/[sanitized_name]/[productId]/page.tsx`
- [ ] Copy from `apothecary` examples
- [ ] Update `dispensaryTypeName` and `categoryPath` props
- [ ] Test add workflow
- [ ] Test edit workflow
- [ ] Add to `GENERIC_WORKFLOW_TYPES` in `productWorkflowRouter.ts`

### **Testing:**
- [ ] Create test dispensary of new type
- [ ] Navigate to add product page
- [ ] Verify categories load correctly
- [ ] Add test product with images
- [ ] Verify product saved to correct collection
- [ ] Edit test product
- [ ] Verify changes persist
- [ ] Delete test product
- [ ] Verify product removed

---

## 🚀 Real-World Example: Apothecary

### **Configuration:**
```typescript
// dispensaryTypes document
{
  name: "Apothecary",
  useGenericWorkflow: true,
  categoryStructure: {
    depth: 2,
    navigationPath: ["homeopathicProducts", "homeopathicProducts"],
    levels: [...]
  }
}
```

### **Routes:**
- Add: `/dispensary-admin/products/add/apothecary`
- Edit: `/dispensary-admin/products/edit/apothecary/[productId]`
- Collection: `apothecary_products`

### **Category Path:**
```typescript
categoryPath={['homeopathicProducts', 'homeopathicProducts']}
```

This means: `data.categoriesData.homeopathicProducts.homeopathicProducts` contains the category array.

---

## 🎨 Category Structure Best Practices

### **Level 1: Top-Level Categories**
```json
{
  "name": "Body Systems",
  "value": "body_systems",
  "imageUrl": "https://...",
  "description": "Products targeting specific body systems",
  "type": "body_systems"
}
```

**Requirements:**
- `name`: Display text
- `value`: URL-safe identifier
- `imageUrl`: Category image (optional but recommended)
- `type`: Used for product `category` field

### **Level 2: Subcategories**
```json
{
  "name": "Digestive System",
  "value": "digestive",
  "description": "Products for digestion and gut health"
}
```

### **Level 3: Sub-Subcategories** (if needed)
```json
{
  "name": "Acid Reflux",
  "value": "acid_reflux",
  "examples": ["Antacids", "H2 Blockers"]
}
```

---

## 🔍 Debugging Tips

### **Categories Not Loading?**
1. Check Firestore: `dispensaryTypeProductCategories/[TypeName]`
2. Verify `categoryPath` matches JSON structure
3. Check browser console for errors

### **Wrong Collection Name?**
```typescript
// Should be: ayurvedic_medicine_products
// Not: Ayurvedic Medicine_products

// Check sanitization:
const sanitized = typeName.toLowerCase().replace(/[\s-&]+/g, '_');
```

### **Add Button Points to Wrong Page?**
```typescript
// In products page:
const addProductPath = getProductCollectionName(
  currentDispensary?.dispensaryType, 
  true  // forAddPage = true
);
```

Check `src/lib/utils.ts` - update switch statement for new types.

---

## 🎯 Key Takeaways

1. **Super Admin configures once** → System works for all dispensaries of that type
2. **Generic workflow = reusable components** → No duplicate code per type
3. **Safety mechanisms protect existing types** → No accidental breakage
4. **Visual builder helps verify** → See structure before saving
5. **Automatic analysis** → No manual metadata entry
6. **Consistent patterns** → Easy to add new types

---

## 📚 Related Documentation

- [CATEGORY-STRUCTURE-SUPER-ADMIN-GUIDE.md](./CATEGORY-STRUCTURE-SUPER-ADMIN-GUIDE.md) - Detailed super admin guide
- [PRODUCT-POOL-FIX-DOCUMENTATION.md](./PRODUCT-POOL-FIX-DOCUMENTATION.md) - Product pool system
- [PRICING-SYSTEM-COMPLETE.md](./PRICING-SYSTEM-COMPLETE.md) - Pricing and tiers

---

**Last Updated:** January 17, 2026
