# Dynamic Category Structure - Super Admin Quick Reference

## Overview

This guide explains how to add new wellness types with unique category structures without needing developers to write custom code.

## Quick Start: Adding a New Wellness Type

### Step 1: Create the Wellness Type

1. Go to **Admin Dashboard** → **Wellness Types**
2. Click **"Add New Wellness Type"**
3. Fill in details:
   - Name: `Ayurvedic Medicine`
   - Description: `Traditional Indian healing practices`
   - Upload icon and image
4. Save (this creates the `dispensaryTypes` document)

### Step 2: Create Category Structure

You need to create a JSON file with your category structure. The system supports 3 types of structures:

#### Structure Type 1: Simple Array (1 Level)
```json
{
  "products": [
    {
      "name": "Herbal Teas",
      "image": "https://..."
    },
    {
      "name": "Tinctures",
      "image": "https://..."
    },
    {
      "name": "Salves",
      "image": "https://..."
    }
  ]
}
```

#### Structure Type 2: Array with Subcategories (2 Levels)
```json
{
  "products": [
    {
      "name": "Herbal Teas",
      "image": "https://...",
      "subcategories": [
        { "name": "Relaxation Blends", "image": "https://..." },
        { "name": "Digestive Support", "image": "https://..." },
        { "name": "Immunity Boosters", "image": "https://..." }
      ]
    },
    {
      "name": "Tinctures",
      "image": "https://...",
      "subcategories": [
        { "name": "Alcohol-Based", "image": "https://..." },
        { "name": "Glycerin-Based", "image": "https://..." }
      ]
    }
  ]
}
```

#### Structure Type 3: Nested Objects (2 Levels) - Like Homeopathy
```json
{
  "ayurvedicProducts": {
    "ayurvedicProducts": [
      {
        "name": "Doshas & Constitution",
        "image": "https://...",
        "subcategories": [
          { "name": "Vata Balancing", "image": "https://..." },
          { "name": "Pitta Balancing", "image": "https://..." },
          { "name": "Kapha Balancing", "image": "https://..." }
        ]
      },
      {
        "name": "Body Systems",
        "image": "https://...",
        "subcategories": [
          { "name": "Digestive System", "image": "https://..." },
          { "name": "Respiratory System", "image": "https://..." }
        ]
      }
    ]
  }
}
```

#### Structure Type 4: Three Levels Deep
```json
{
  "products": [
    {
      "name": "Herbal Medicine",
      "image": "https://...",
      "subcategories": [
        {
          "name": "Teas",
          "image": "https://...",
          "subcategories": [
            { "name": "Loose Leaf" },
            { "name": "Tea Bags" },
            { "name": "Instant Blends" }
          ]
        }
      ]
    }
  ]
}
```

### Step 3: Upload Category Structure

**Using Admin Dashboard** (Coming Soon):
1. Go to **Admin Dashboard** → **Category Management**
2. Select wellness type: `Ayurvedic Medicine`
3. Click **"Upload Category Structure"**
4. Upload your JSON file
5. System automatically analyzes and validates

**Using Cloud Function** (Current Method):
```typescript
// In admin dashboard or developer tools
const createFn = httpsCallable(functions, 'createCategoryFromTemplate');

const result = await createFn({
  dispensaryTypeName: 'Ayurvedic Medicine',
  templateData: {
    // Paste your JSON structure here
    ayurvedicProducts: [
      {
        name: 'Doshas & Constitution',
        image: 'https://...',
        subcategories: [...]
      }
    ]
  }
});

console.log(result.data.message);
// "Successfully created Ayurvedic Medicine from template"
```

### Step 4: Analyze Structure

After uploading, analyze the structure to enable dynamic forms:

```typescript
const analyzeFn = httpsCallable(functions, 'analyzeCategoryStructureAndUpdate');

const result = await analyzeFn({
  dispensaryTypeName: 'Ayurvedic Medicine'
});

console.log(result.data.metadata);
// Shows:
// - depth: 2
// - navigationPath: ["ayurvedicProducts"]
// - levels: [{ key: "ayurvedicProducts", label: "Category", hasImage: true }]
// - sampleCategories: ["Doshas & Constitution", "Body Systems"]
```

**What This Does**:
1. Reads your category structure from Firestore
2. Determines how many levels (1, 2, or 3)
3. Identifies navigation path through the structure
4. Detects if categories have images
5. Stores metadata in `dispensaryTypes` document

### Step 5: Verify & Test

**Check Structure Analysis**:
```typescript
// Fetch the dispensary type
const typeDoc = await getDoc(doc(db, 'dispensaryTypes', dispensaryTypeId));
const typeData = typeDoc.data();

console.log('Category Structure:', typeData.categoryStructure);
// {
//   depth: 2,
//   navigationPath: ["ayurvedicProducts"],
//   levels: [
//     { key: "ayurvedicProducts", label: "Category", hasImage: true, isArray: true }
//   ],
//   sampleCategories: ["Doshas & Constitution", "Body Systems", ...]
// }
```

**Test Product Forms**:
1. Go to `/dispensary-admin/products/add/ayurvedic_medicine`
2. Verify categories load correctly
3. Add a test product
4. Edit the test product
5. Delete the test product

### Step 6: Done!

The wellness type is now fully operational. Dispensary admins of this type can:
- View categories dynamically
- Add products with proper category selection
- Edit existing products
- Manage inventory

## Common Patterns

### Pattern 1: Simple Categories (No Subcategories)

**Best for**: Simple product catalogs, small inventories

```json
{
  "products": [
    { "name": "Category 1", "image": "..." },
    { "name": "Category 2", "image": "..." }
  ]
}
```

### Pattern 2: Categories with Subcategories

**Best for**: Organized product hierarchies, medium inventories

```json
{
  "products": [
    {
      "name": "Main Category",
      "image": "...",
      "subcategories": [
        { "name": "Subcategory 1", "image": "..." },
        { "name": "Subcategory 2", "image": "..." }
      ]
    }
  ]
}
```

### Pattern 3: Grouped Categories (Like Homeopathy)

**Best for**: Complex taxonomies, multiple classification systems

```json
{
  "groupName": {
    "categoryArrayName": [
      {
        "name": "Category",
        "image": "...",
        "subcategories": [...]
      }
    ]
  }
}
```

## Troubleshooting

### Error: "categoriesData is empty"

**Cause**: JSON structure is invalid or empty

**Fix**: Ensure your JSON has at least one top-level key with categories:
```json
{
  "products": [  // ← Must have this array
    { "name": "Category", "image": "..." }
  ]
}
```

### Error: "No dispensaryTypes document found"

**Cause**: Wellness type wasn't created in Step 1

**Fix**: 
1. Go to Admin Dashboard → Wellness Types
2. Create the wellness type first
3. Then upload category structure

### Error: "Navigation failed at key: X"

**Cause**: Structure doesn't match expected pattern

**Fix**: Check your JSON structure:
- Arrays should use `[]`
- Objects should use `{}`
- Each category needs `name` field
- Images are optional but recommended

### Categories Not Showing in Add Product Form

**Possible Causes**:
1. Structure wasn't analyzed (run `analyzeCategoryStructureAndUpdate`)
2. Navigation path is incorrect
3. Array is nested too deep

**Fix**: Re-analyze structure and check console logs

## Advanced: Understanding Navigation Paths

The **navigation path** tells the system how to reach your category array.

### Example 1: Direct Array
```json
{
  "products": [...]  // ← Array is here
}
```
**Navigation Path**: `["products"]`  
**Depth**: 1

### Example 2: Nested Array
```json
{
  "homeopathicProducts": {
    "homeopathicProducts": [...]  // ← Array is nested here
  }
}
```
**Navigation Path**: `["homeopathicProducts", "homeopathicProducts"]`  
**Depth**: 2 (but only 1 category level, 1 grouping level)

### Example 3: Array with Subcategories
```json
{
  "products": [
    {
      "name": "Category",
      "subcategories": [...]  // ← Subcategories add a level
    }
  ]
}
```
**Navigation Path**: `["products"]`  
**Depth**: 2 (category + subcategory)

## Best Practices

### ✅ DO:
- Use descriptive category names
- Provide images for better UX (min 300x300px)
- Keep structure simple (prefer 2 levels over 3)
- Test with a few categories before uploading hundreds
- Keep a backup of your JSON file

### ❌ DON'T:
- Use special characters in category names (except &, -)
- Create more than 3 levels of nesting
- Upload without testing JSON validity
- Delete the source wellness type document
- Modify `categoriesData` directly in Firestore (use admin functions)

## Analyzing Existing Structures

To understand how an existing wellness type is structured:

```typescript
const analyzeFn = httpsCallable(functions, 'analyzeCategoryStructureAndUpdate');

const result = await analyzeFn({
  dispensaryTypeName: 'Homeopathic store'  // ← Existing type
});

console.log(result.data.metadata);
// Shows exact structure details
```

**Use this to**:
- Learn from existing structures
- Verify migration success
- Debug category issues
- Copy patterns for new types

## Need Help?

**Can't figure out the right structure?**
- Copy an existing wellness type's structure as a starting point
- Use `copyCategoryStructure` function to duplicate a working structure
- Contact development team for complex taxonomies

**Form not rendering correctly?**
- Check browser console for errors
- Verify `categoryStructure` exists in `dispensaryTypes` document
- Re-run `analyzeCategoryStructureAndUpdate`

**Want to change existing structure?**
- Update the `dispensaryTypeProductCategories` document
- Re-run `analyzeCategoryStructureAndUpdate`
- Note: Existing products keep their old categories (migration needed)

## Summary Workflow

```
1. Create Wellness Type → dispensaryTypes document
2. Upload JSON Structure → dispensaryTypeProductCategories document
3. Analyze Structure → Updates dispensaryTypes with metadata
4. Test Forms → Verify add/edit pages work
5. Go Live → Dispensary admins can use it
```

**Total Time**: 5-10 minutes per wellness type

**No Code Required**: Entire process is configuration-based!
