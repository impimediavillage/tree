# Dynamic Category Structure System

## Overview

This document outlines the dynamic category structure system that allows The Wellness Tree to support any dispensary type with unique product category hierarchies without hardcoding structures.

**IMPORTANT**: This system is **opt-in** and **non-disruptive**. Existing wellness types with custom pages continue working as-is. Only wellness types with `useGenericWorkflow: true` use the dynamic system.

## Problem Statement

Each wellness type (Homeopathy, Apothecary, Traditional Medicine, Mushroom, etc.) has a unique category structure in their `categoriesData` map:

- **Homeopathy**: 2-level nested object structure (`homeopathicProducts → homeopathicProducts → [categories]`)
- **Traditional Medicine**: 1-level array structure (`traditionalMedicineProducts → [categories]`)
- **Potential Future Types**: Could have 3-level structures with sub-subcategories

When adding new wellness types, the system needs to:
1. Understand the category structure automatically
2. Render add/edit forms dynamically
3. Work without creating new hardcoded pages

## Solution Architecture: Hybrid Approach

### Workflow Selection

Each `DispensaryType` document has a `useGenericWorkflow` boolean flag:

```typescript
interface DispensaryType {
  name: string;
  useGenericWorkflow?: boolean;  // ← Controls which workflow to use
  categoryStructure?: CategoryStructureMetadata;  // Only needed if useGenericWorkflow=true
  // ... other fields
}
```

**Routing Logic**:
```typescript
if (dispensaryType.useGenericWorkflow === true) {
  // Use GenericProductAddPage and GenericProductEditPage
  // Fetch categoryStructure metadata dynamically
} else {
  // Use existing custom pages
  // /products/add/homeopathy → EditHomeopathyProductPage
  // /products/add/mushroom → EditMushroomProductPage
}
```

### Current State (January 2026)

| Wellness Type | useGenericWorkflow | Workflow Used |
|--------------|-------------------|---------------|
| Homeopathic store | `false` (default) | Custom pages (existing) |
| Traditional Medicine | `false` (default) | Custom pages (existing) |
| Mushroom | `false` (default) | Custom pages (existing) |
| Permaculture | `false` (default) | Custom pages (existing) |
| THC | `false` (default) | Custom pages (existing) |
| **Apothecary** | `true` | **Generic workflow (new)** |

**Migration Strategy**: Existing types keep `useGenericWorkflow: false` (or undefined, which defaults to false) and continue using their battle-tested custom pages. New types like Apothecary set `useGenericWorkflow: true`.

### 1. Category Structure Analysis

**File**: [src/lib/categoryStructureAnalyzer.ts](src/lib/categoryStructureAnalyzer.ts)

The analyzer examines any `categoriesData` map and extracts:

```typescript
interface CategoryStructureMetadata {
  depth: number;                    // 1, 2, or 3 levels
  levels: CategoryLevel[];          // Details about each level
  navigationPath: string[];         // Keys to navigate the structure
  sampleCategories?: string[];      // Sample category names
  lastAnalyzed?: Date;
  analyzedBy?: string;
}

interface CategoryLevel {
  key: string;          // Field name in the structure
  label: string;        // Display name ("Category", "Subcategory")
  hasImage: boolean;    // Whether this level has images
  isArray: boolean;     // Whether it's an array or object
}
```

**Example Analysis Results**:

```typescript
// Homeopathy Structure
{
  depth: 2,
  levels: [
    { key: "homeopathicProducts", label: "Category Group", hasImage: false, isArray: false },
    { key: "homeopathicProducts", label: "Category", hasImage: true, isArray: true }
  ],
  navigationPath: ["homeopathicProducts", "homeopathicProducts"],
  sampleCategories: ["Skin & Beauty", "Digestive Health", "Pain Relief"]
}

// Traditional Medicine Structure (hypothetical)
{
  depth: 1,
  levels: [
    { key: "products", label: "Category", hasImage: true, isArray: true }
  ],
  navigationPath: ["products"],
  sampleCategories: ["Herbal Teas", "Tinctures", "Salves"]
}
```

### 2. Storage Schema

**Files**: 
- [src/types.ts](src/types.ts)
- [functions/src/types.ts](functions/src/types.ts)

The `categoryStructure` metadata is stored in the `dispensaryTypes` document:

```typescript
interface DispensaryType {
  id?: string;
  name: string;
  description?: string;
  image?: string;
  categoryStructure?: CategoryStructureMetadata;  // ← NEW FIELD
  // ... other fields
}
```

This allows the frontend to fetch the structure metadata along with the dispensary type info.

### 3. Cloud Functions

**File**: [functions/src/dispensary-type-management.ts](functions/src/dispensary-type-management.ts)

#### New Function: `analyzeCategoryStructureAndUpdate`

Callable function that:
1. Fetches the `dispensaryTypeProductCategories` document
2. Analyzes the `categoriesData` structure
3. Stores metadata in the corresponding `dispensaryTypes` document

**Usage**:
```typescript
const analyzeFn = httpsCallable(functions, 'analyzeCategoryStructureAndUpdate');
const result = await analyzeFn({ dispensaryTypeName: 'Apothecary' });

console.log(result.data.metadata);
// {
//   depth: 2,
//   navigationPath: ["homeopathicProducts", "homeopathicProducts"],
//   levels: [...]
// }
```

**When to Call**:
- After uploading a new category JSON template
- When updating an existing category structure
- When onboarding a new wellness type

### 4. Dynamic Product Forms

**Files**:
- [src/components/products/GenericProductAddPage.tsx](src/components/products/GenericProductAddPage.tsx)
- [src/components/products/GenericProductEditPage.tsx](src/components/products/GenericProductEditPage.tsx)

**Current State**: Still uses hardcoded `categoryPath` prop

**Required Changes** (Next Phase):

```typescript
// BEFORE (Hardcoded)
<GenericProductAddPage
  dispensaryTypeName="Apothecary"
  categoryPath={['homeopathicProducts', 'homeopathicProducts']}  // ← Hardcoded
  pageTitle="Add Apothecary Product"
/>

// AFTER (Dynamic)
<GenericProductAddPage
  dispensaryTypeName="Apothecary"
  // categoryPath will be fetched from dispensaryType.categoryStructure
  pageTitle="Add Apothecary Product"
/>
```

The component will:
1. Fetch `dispensaryTypes` document by name
2. Read `categoryStructure.navigationPath`
3. Use `extractCategories()` utility to get category array
4. Dynamically render category selectors based on `depth` and `levels`

### 5. Super Admin Workflow

**Future Implementation**:

When creating a new wellness type, the super admin will:

1. **Create Dispensary Type** (in `dispensaryTypes` collection)
   - Enter name, description, icon, image
   - Upload category JSON structure

2. **Upload Category Structure** (creates `dispensaryTypeProductCategories` document)
   - Upload JSON file with `categoriesData` map
   - System automatically analyzes structure
   - Calls `analyzeCategoryStructureAndUpdate` function
   - Stores metadata in `dispensaryTypes` document

3. **Verify Structure** (UI shows analysis results)
   ```
   ✓ Structure Analyzed Successfully
   
   Depth: 2 levels
   Navigation Path: homeopathicProducts → homeopathicProducts
   
   Level 1: Category Group (no images)
   Level 2: Category (with images, 12 categories found)
   
   Sample Categories:
   - Skin & Beauty
   - Digestive Health
   - Pain Relief
   ```

4. **System Auto-Creates Routes**
   - Add page: `/dispensary-admin/products/add/[type]`
   - Edit page: `/dispensary-admin/products/edit/[type]/[productId]`

## Implementation Phases

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Create category structure analyzer utility
- [x] Add `categoryStructure` field to types
- [x] Create `analyzeCategoryStructureAndUpdate` Cloud Function
- [x] Export function in index.ts

### 🔄 Phase 2: Dynamic Forms (IN PROGRESS)
- [ ] Update `GenericProductAddPage` to fetch structure dynamically
- [ ] Update `GenericProductEditPage` to fetch structure dynamically
- [ ] Remove hardcoded `categoryPath` props
- [ ] Test with existing wellness types (Homeopathy, Traditional Medicine)

### 📋 Phase 3: Super Admin UI (PLANNED)
- [ ] Add "Analyze Structure" button to admin dashboard
- [ ] Create structure visualization component
- [ ] Add JSON template upload with validation
- [ ] Auto-call `analyzeCategoryStructureAndUpdate` after upload
- [ ] Show analysis results in UI

### 📋 Phase 4: Route Generation (PLANNED)
- [ ] Create dynamic route handler `/products/add/[type]/page.tsx`
- [ ] Create dynamic route handler `/products/edit/[type]/[productId]/page.tsx`
- [ ] Fetch `dispensaryType` and pass to generic components
- [ ] Remove hardcoded type-specific page files

## Usage Examples

### Example 1: Analyzing Homeopathy Structure

```typescript
// In super admin dashboard
const analyzeFn = httpsCallable(functions, 'analyzeCategoryStructureAndUpdate');

const result = await analyzeFn({
  dispensaryTypeName: 'Homeopathic store'
});

console.log(result.data.metadata);
// {
//   depth: 2,
//   navigationPath: ["homeopathicProducts", "homeopathicProducts"],
//   levels: [
//     { key: "homeopathicProducts", label: "Category Group", hasImage: false, isArray: false },
//     { key: "homeopathicProducts", label: "Category", hasImage: true, isArray: true }
//   ],
//   sampleCategories: ["Skin & Beauty", "Digestive Health", "Pain Relief"]
// }
```

### Example 2: Creating New Wellness Type

```typescript
// 1. Create dispensaryTypes document
await addDoc(collection(db, 'dispensaryTypes'), {
  name: 'Ayurvedic Medicine',
  description: 'Traditional Indian healing system',
  image: '...',
  isActive: true,
  createdAt: serverTimestamp()
});

// 2. Upload category structure
const createFn = httpsCallable(functions, 'createCategoryFromTemplate');
await createFn({
  dispensaryTypeName: 'Ayurvedic Medicine',
  templateData: {
    ayurvedicProducts: [
      {
        name: 'Doshas & Constitution',
        image: '...',
        subcategories: [
          { name: 'Vata Balancing', image: '...' },
          { name: 'Pitta Balancing', image: '...' },
          { name: 'Kapha Balancing', image: '...' }
        ]
      },
      // ... more categories
    ]
  }
});

// 3. Analyze structure (auto-called after upload in future)
const analyzeFn = httpsCallable(functions, 'analyzeCategoryStructureAndUpdate');
await analyzeFn({ dispensaryTypeName: 'Ayurvedic Medicine' });

// 4. System now supports Ayurvedic Medicine products without code changes!
```

### Example 3: Dynamic Form Rendering (Future)

```typescript
// Generic component fetches structure dynamically
function GenericProductAddPage({ dispensaryTypeName }: Props) {
  const [structure, setStructure] = useState<CategoryStructureMetadata | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // Fetch dispensary type with structure metadata
    const typeDoc = await getDoc(doc(db, 'dispensaryTypes', dispensaryTypeName));
    const typeData = typeDoc.data();
    
    setStructure(typeData.categoryStructure);

    // Fetch categories using navigation path
    const categoryDoc = await getDoc(doc(db, 'dispensaryTypeProductCategories', dispensaryTypeName));
    const categoriesData = categoryDoc.data().categoriesData;
    
    const extractedCategories = extractCategories(categoriesData, typeData.categoryStructure);
    setCategories(extractedCategories);
  }, [dispensaryTypeName]);

  // Render category selectors based on structure.depth
  return (
    <Form>
      {structure?.depth >= 1 && (
        <CategorySelector 
          categories={categories}
          hasImages={structure.levels[0].hasImage}
          label={structure.levels[0].label}
        />
      )}
      
      {structure?.depth >= 2 && selectedCategory && (
        <SubcategorySelector 
          subcategories={selectedCategory.subcategories}
          hasImages={structure.levels[1].hasImage}
          label={structure.levels[1].label}
        />
      )}
      
      {structure?.depth >= 3 && selectedSubcategory && (
        <SubSubcategorySelector 
          subSubcategories={selectedSubcategory.subcategories}
          label={structure.levels[2].label}
        />
      )}
      
      {/* Rest of form fields... */}
    </Form>
  );
}
```

## Testing Plan

### Test Case 1: Existing Structures

Analyze all existing wellness types and verify metadata is correct:

```bash
# Homeopathic store
depth: 2, navigationPath: ["homeopathicProducts", "homeopathicProducts"]

# Traditional Medicine (if exists)
depth: ?, navigationPath: [?]

# Mushroom (if exists)
depth: ?, navigationPath: [?]
```

### Test Case 2: New Structure Upload

1. Create test JSON with 3-level structure
2. Upload via `createCategoryFromTemplate`
3. Analyze via `analyzeCategoryStructureAndUpdate`
4. Verify metadata shows depth: 3 with correct navigation path

### Test Case 3: Dynamic Form Rendering

1. Update `GenericProductAddPage` to use dynamic structure
2. Test with Homeopathy (depth: 2)
3. Test with new 1-level structure
4. Test with new 3-level structure
5. Verify category selectors render correctly

## Benefits

1. **Scalability**: Add new wellness types without code changes
2. **Flexibility**: Support any category structure (1-3 levels)
3. **Maintainability**: Single generic form instead of 10+ hardcoded pages
4. **Self-Documenting**: Structure metadata explains how to navigate categories
5. **Validation**: Can validate uploaded JSON against expected structure

## Migration Path

### Immediate (Week 1)
1. Deploy new Cloud Functions
2. Run `analyzeCategoryStructureAndUpdate` for all existing types
3. Verify metadata is stored correctly

### Short-term (Week 2-3)
1. Update `GenericProductAddPage` to use dynamic structure
2. Update `GenericProductEditPage` to use dynamic structure
3. Test with existing Apothecary pages
4. Gradually migrate other types

### Long-term (Month 2+)
1. Build super admin structure management UI
2. Create dynamic route handlers
3. Remove hardcoded type-specific pages
4. Enable self-service wellness type creation

## Security Considerations

- ✅ Only Super Admins can call `analyzeCategoryStructureAndUpdate`
- ✅ Structure analysis validates categoriesData exists
- ✅ Metadata stored in Firestore (not exposed to public)
- ⚠️ Frontend must verify dispensary ownership before showing forms
- ⚠️ Product creation still requires dispensary admin authentication

## Files Changed

### New Files
- `src/lib/categoryStructureAnalyzer.ts` - Analysis utilities
- `docs/DYNAMIC-CATEGORY-STRUCTURE-SYSTEM.md` - This documentation

### Modified Files
- `src/types.ts` - Added `CategoryStructureMetadata` interface
- `functions/src/types.ts` - Added `CategoryStructureMetadata` interface
- `functions/src/dispensary-type-management.ts` - Added analysis function
- `functions/src/index.ts` - Export new function

### Future Modifications
- `src/components/products/GenericProductAddPage.tsx` - Dynamic structure fetching
- `src/components/products/GenericProductEditPage.tsx` - Dynamic structure fetching
- `src/app/dispensary-admin/products/add/[type]/page.tsx` - Dynamic route handler
- `src/app/dispensary-admin/products/edit/[type]/[productId]/page.tsx` - Dynamic route handler

## Questions & Answers

**Q: What if the structure analysis fails?**
A: The function returns an error with details. Super admin must fix the JSON and re-upload.

**Q: Can we support 4+ levels?**
A: Yes, the analyzer can be extended. Current design supports up to 3 levels based on common patterns.

**Q: What happens to existing hardcoded pages?**
A: They continue working. Migration is gradual. Once all types use dynamic system, hardcoded pages can be removed.

**Q: How does this affect product queries?**
A: No change. Products are still stored in type-specific collections (`apothecary_products`). Only the form rendering is dynamic.

**Q: Can we validate user-uploaded JSON?**
A: Yes, using `validateCategoryStructure()` utility before creating the document.
