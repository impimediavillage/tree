# Quick Add Apothecary Type - Scripts

## Overview

Two methods to quickly add the Apothecary dispensary type to your Firestore database:

1. **🖱️ Dashboard Button** - One-click from Super Admin UI
2. **⌨️ Node.js Script** - Run from terminal

---

## Method 1: Dashboard Button (Recommended) ⭐

### How to Use:

1. Navigate to `/admin/dashboard/dispensary-types` as Super Admin
2. Look for the purple **"Quick Add Apothecary"** button next to "Add New Type"
3. Click the button
4. Done! ✅

### What It Does:

- Checks if Apothecary already exists
- Adds complete type structure with:
  - `useGenericWorkflow: true` ✓
  - AI advisor prompt ✓
  - Proper timestamps ✓
  - Active status ✓
- Shows success toast notification
- Refreshes the types list automatically

### Next Steps After Adding:

1. **Edit the Apothecary Type:**
   - Click "Edit" on the Apothecary card
   - Upload actual icon and cover image
   - Switch to "Category Structure" tab

2. **Add Category Structure:**
   - Paste your category JSON (example below)
   - Use visual builder to verify
   - Save

3. **Create Route Pages:**
   - See [CATEGORY-WORKFLOW-COMPLETE-GUIDE.md](../docs/CATEGORY-WORKFLOW-COMPLETE-GUIDE.md)
   - Files needed:
     - `src/app/dispensary-admin/products/add/apothecary/page.tsx` (already exists ✓)
     - `src/app/dispensary-admin/products/edit/apothecary/[productId]/page.tsx` (already exists ✓)

---

## Method 2: Node.js Script

### Prerequisites:

- Node.js installed
- Firebase Admin SDK configured
- `serviceAccountKey.json` in project root

### How to Run:

```bash
# From project root
node scripts/add-apothecary-type.js
```

### Output:

```
🚀 Starting Apothecary Type Addition...

✅ SUCCESS! Apothecary type added to Firestore

📄 Document ID: abc123xyz
📦 Collection: dispensaryTypes
🔧 Generic Workflow: ENABLED

📋 Next Steps:
   1. Upload actual icon and image to Firebase Storage
   2. Update iconPath and image URLs in the document
   3. Add category structure via admin dashboard
   4. Create route pages...
   
🎉 Script completed successfully!
```

### Safety Features:

- ✅ Checks for existing Apothecary type
- ✅ Won't create duplicates
- ✅ Provides clear error messages
- ✅ Shows next steps after completion

---

## Data Structure Added

```typescript
{
  name: 'Apothecary',
  description: 'Traditional herbal pharmacy offering natural remedies, tinctures, salves, and holistic health products',
  
  // Images (update these URLs after uploading actual images)
  iconPath: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Ficons%2Fapothecary-icon.png?alt=media',
  image: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Fimages%2Fapothecary-image.png?alt=media',
  
  // Configuration
  isActive: true,
  useGenericWorkflow: true,  // 🔑 Enables generic product workflow
  
  // AI Advisor
  advisorFocusPrompt: 'You are a knowledgeable apothecary advisor specializing in herbal remedies, natural medicine, and holistic wellness. Guide users on selecting traditional remedies, understanding herb properties, and safe usage.',
  recommendedAdvisorIds: [],  // Add AI advisor IDs here
  
  // Stats
  storeCount: 0,
  
  // Timestamps
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

---

## Example Category Structure

After adding the type, configure categories with this structure:

```json
{
  "apothecaryProducts": [
    {
      "name": "Herbal Remedies",
      "value": "herbal_remedies",
      "description": "Traditional plant-based medicines",
      "type": "herbal_remedies",
      "imageUrl": "https://..."
    },
    {
      "name": "Tinctures & Extracts",
      "value": "tinctures",
      "description": "Concentrated herbal preparations",
      "type": "tinctures",
      "imageUrl": "https://..."
    },
    {
      "name": "Salves & Balms",
      "value": "salves",
      "description": "Topical herbal applications",
      "type": "salves",
      "imageUrl": "https://..."
    },
    {
      "name": "Dried Herbs & Botanicals",
      "value": "dried_herbs",
      "description": "Loose herbs for teas and preparations",
      "type": "dried_herbs",
      "imageUrl": "https://..."
    },
    {
      "name": "Essential Oils",
      "value": "essential_oils",
      "description": "Pure aromatic plant oils",
      "type": "essential_oils",
      "imageUrl": "https://..."
    }
  ]
}
```

---

## Verification Checklist

After adding Apothecary type:

- [ ] Type appears in `/admin/dashboard/dispensary-types`
- [ ] Can edit the type
- [ ] Upload and save icon image
- [ ] Upload and save cover image
- [ ] Add category structure JSON
- [ ] Visual builder shows categories correctly
- [ ] Route pages exist (`add/apothecary` and `edit/apothecary/[id]`)
- [ ] Create test dispensary of type "Apothecary"
- [ ] Test add product workflow
- [ ] Verify categories load correctly
- [ ] Add test product successfully
- [ ] Test edit product workflow
- [ ] Verify product saved to `apothecary_products` collection

---

## Troubleshooting

### "Apothecary already exists" message
- ✅ Good! Type was added previously
- Use the Edit button to update icon/image/categories

### Route pages not found (404)
- Create the page files:
  - `src/app/dispensary-admin/products/add/apothecary/page.tsx`
  - `src/app/dispensary-admin/products/edit/apothecary/[productId]/page.tsx`
- Copy from existing examples (see guide)

### Categories not loading
- Check: `dispensaryTypeProductCategories/Apothecary` document exists
- Verify JSON structure matches expected format
- Check browser console for errors

### Images showing placeholder
- Upload actual images via Firebase Storage
- Update `iconPath` and `image` fields in the document

---

## Related Documentation

- [CATEGORY-WORKFLOW-COMPLETE-GUIDE.md](../docs/CATEGORY-WORKFLOW-COMPLETE-GUIDE.md) - Complete workflow explanation
- [CATEGORY-STRUCTURE-SUPER-ADMIN-GUIDE.md](../docs/CATEGORY-STRUCTURE-SUPER-ADMIN-GUIDE.md) - Detailed category configuration

---

**Last Updated:** January 17, 2026
