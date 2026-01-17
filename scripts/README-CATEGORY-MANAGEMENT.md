# Dispensary Type Category Management

## Overview

This system allows you to manage product category structures for different dispensary types in your wellness marketplace.

## Quick Start - Fix Your App Now

### Immediate Fix: Copy Homeopathic store → Apothecary

```bash
cd C:\www\The-Wellness-Tree
node scripts/copy-dispensary-categories.js
```

This will:
- Copy all category data from "Homeopathic store"
- Create new "Apothecary" document with identical structure
- Keep original "Homeopathic store" intact (both will exist)

### Verify the Copy

```bash
node scripts/copy-dispensary-categories.js list
```

## Commands Reference

### 1. Copy Existing Structure
```bash
# Copy Homeopathic store → Apothecary (default)
node scripts/copy-dispensary-categories.js

# Copy any structure to another
node scripts/copy-dispensary-categories.js copy "Source Name" "Target Name"
```

### 2. Preview Before Copying
```bash
node scripts/copy-dispensary-categories.js preview "Homeopathic store"
```

### 3. List All Category Documents
```bash
node scripts/copy-dispensary-categories.js list
```

### 4. Create from Template (Future Use)
```bash
node scripts/copy-dispensary-categories.js create "Ayurvedic Pharmacy" ./templates/ayurveda-categories.json
```

## Future-Proof System Architecture

### How It Will Work

When you add a new dispensary type in your Super Admin panel:

```
1. Admin uploads JSON template for categories
   ↓
2. System validates JSON structure
   ↓
3. Creates dispensaryTypeProductCategories document
   ↓
4. Auto-generates product add/edit pages
   ↓
5. Updates routing
```

### JSON Template Structure

Create a JSON file like `templates/ayurveda-categories.json`:

```json
{
  "ayurvedicProducts": {
    "ayurvedicProducts": [
      {
        "name": "Herbal Powders",
        "value": "herbalPowders",
        "description": "Churnas and herbal powders"
      },
      {
        "name": "Oils & Ghee",
        "value": "oilsGhee",
        "description": "Medicated oils and ghee"
      },
      {
        "name": "Tablets & Capsules",
        "value": "tabletsCapules",
        "description": "Ayurvedic tablets"
      }
    ]
  },
  "doshaBalancing": {
    "doshas": [
      {
        "name": "Vata",
        "value": "vata",
        "description": "Products for Vata dosha"
      },
      {
        "name": "Pitta",
        "value": "pitta",
        "description": "Products for Pitta dosha"
      },
      {
        "name": "Kapha",
        "value": "kapha",
        "description": "Products for Kapha dosha"
      }
    ]
  }
}
```

## Integration with Super Admin

### Recommended UI Flow

```tsx
// In your Super Admin panel
<AddDispensaryType>
  <FormField name="typeName">
    <Input placeholder="e.g., Ayurvedic Pharmacy" />
  </FormField>
  
  <FormField name="categoryTemplate">
    <FileUpload
      accept=".json"
      onUpload={handleTemplateUpload}
      label="Upload Category Structure (JSON)"
    />
  </FormField>
  
  <Button onClick={handleCreateDispensaryType}>
    Create Dispensary Type
  </Button>
</AddDispensaryType>
```

### Backend Handler (Cloud Function)

```typescript
// functions/src/dispensary-types.ts
export const createDispensaryType = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || !isAdmin(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  
  const { typeName, categoryTemplate } = data;
  
  // Validate JSON structure
  if (!validateCategoryTemplate(categoryTemplate)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid template');
  }
  
  // Create dispensaryTypeProductCategories document
  await admin.firestore()
    .collection('dispensaryTypeProductCategories')
    .doc(typeName)
    .set({
      name: typeName,
      categoriesData: categoryTemplate,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid
    });
  
  // Optional: Create dispensaryTypes metadata document
  await admin.firestore()
    .collection('dispensaryTypes')
    .add({
      name: typeName,
      slug: slugify(typeName),
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  return { success: true, documentId: typeName };
});
```

## Code Changes Needed

### 1. Update Product Add Pages

Instead of hardcoding `"Homeopathic store"`, make it dynamic:

**Before:**
```typescript
const q = firestoreQuery(
  collection(db, 'dispensaryTypeProductCategories'),
  where('name', '==', "Homeopathic store"),
  limit(1)
);
```

**After:**
```typescript
// Get type from route or context
const dispensaryTypeName = "Apothecary"; // or from route params

// Direct fetch (much faster than query)
const docRef = doc(db, 'dispensaryTypeProductCategories', dispensaryTypeName);
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  const data = docSnap.data();
  const categories = data?.categoriesData?.homeopathicProducts?.homeopathicProducts || [];
  setCategoryStructure(categories);
}
```

### 2. Create Generic Product Add Component

```typescript
// src/components/products/GenericProductAddForm.tsx
interface GenericProductAddFormProps {
  dispensaryType: string;
  categoryPath: string[]; // e.g., ['homeopathicProducts', 'homeopathicProducts']
}

export function GenericProductAddForm({ dispensaryType, categoryPath }: GenericProductAddFormProps) {
  const fetchCategories = async () => {
    const docRef = doc(db, 'dispensaryTypeProductCategories', dispensaryType);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      let categories = docSnap.data()?.categoriesData;
      
      // Navigate to nested path
      for (const path of categoryPath) {
        categories = categories?.[path];
      }
      
      return categories || [];
    }
    return [];
  };
  
  // Rest of form logic...
}
```

## Migration Steps

### Step 1: Run the Copy Script (NOW)
```bash
node scripts/copy-dispensary-categories.js
```

### Step 2: Update Code References (PRIORITY)

Find all hardcoded references:
```bash
# Search for hardcoded "Homeopathic store"
grep -r "Homeopathic store" src/

# Update to "Apothecary" or make dynamic
```

Files to update:
- `src/app/dispensary-admin/products/add/homeopathy/page.tsx`
- Any other product add/edit pages
- Browse pool pages
- Video library pages

### Step 3: Test New "Apothecary" Category
1. Go to product add page
2. Verify categories load
3. Add a test product
4. Confirm it saves correctly

### Step 4: Implement Generic System (LATER)

This can be done incrementally:
1. Create generic product form component
2. Update super admin to support JSON uploads
3. Create Cloud Function for auto-creation
4. Update routing to be dynamic

## Troubleshooting

### Script Errors

**Error: Service account key not found**
```bash
# Create serviceAccountKey.json in root
# Download from Firebase Console → Project Settings → Service Accounts
```

**Error: Document already exists**
```bash
# The script will prompt you to overwrite
# Or delete manually in Firebase Console first
```

### Category Not Loading

```typescript
// Add debugging
console.log('Fetching categories for:', dispensaryTypeName);
const docRef = doc(db, 'dispensaryTypeProductCategories', dispensaryTypeName);
const docSnap = await getDoc(docRef);
console.log('Document exists:', docSnap.exists());
console.log('Data:', docSnap.data());
```

## Benefits of This System

✅ **Immediate**: Fixes your app without breaking existing data  
✅ **Scalable**: Add new dispensary types without code changes  
✅ **Flexible**: Each type can have completely different categories  
✅ **Maintainable**: Categories managed in Firestore, not hardcoded  
✅ **Future-proof**: Foundation for full CRUD admin panel  

## Next Steps

1. **Run the script now** to copy Homeopathic store → Apothecary
2. **Update your code** to use "Apothecary" or make it dynamic
3. **Test thoroughly** to ensure categories load
4. **Plan the super admin UI** for adding new types
5. **Implement generic components** gradually

## Questions?

- Script not working? Check Firebase Admin SDK setup
- Need custom template? Copy `category-template-example.json` and modify
- Want to add validation? Update `validateCategoryTemplate()` function
- Need to rename instead of copy? Can add a rename command
