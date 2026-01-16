# Product Creator Fields Migration Guide

## Problem
Existing products don't have `createdBy` and `vendorUserId` fields, which means:
- Vendors see ALL orders instead of just their own products
- Order filtering doesn't work correctly

## Solution

### ✅ Step 1: New Products (DONE)
All new products will automatically include these fields. Updated files:
- `src/app/dispensary-admin/products/add/thc/page.tsx`
- `src/app/dispensary-admin/products/add/mushroom/page.tsx`
- `src/app/dispensary-admin/products/add/traditional-medicine/page.tsx`
- `src/app/dispensary-admin/products/add/homeopathy/page.tsx`
- `src/app/dispensary-admin/products/add/permaculture/page.tsx`

### 📋 Step 2: Existing Products (MANUAL UPDATE REQUIRED)

You have **3 options** to update existing products:

---

## Option A: Firebase Console (Simplest - Manual)

**For small product counts (<50 products):**

1. Open Firebase Console → Firestore Database
2. For each collection (`cannabis_products`, `mushroom_products`, etc.):
   - Open each product document
   - Add two fields:
     ```
     createdBy: [copy the dispensaryOwner's userId]
     vendorUserId: [copy the dispensaryOwner's userId]
     ```
   - Save

**How to find userId:**
1. Go to `users` collection
2. Find user by `email` matching `productOwnerEmail` in product
3. Copy the document ID (that's the userId)
4. Paste into both `createdBy` and `vendorUserId` fields

---

## Option B: Node.js Script (Automated)

**For large product counts (50+ products):**

### Prerequisites:
1. Download service account key from Firebase Console:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in project root

### Run Migration:
```bash
cd c:\www\The-Wellness-Tree
npm install firebase-admin
node scripts/migrate-product-creator-fields.js
```

This will:
- ✅ Find all products in all collections
- ✅ Match `productOwnerEmail` to `users` collection
- ✅ Add `createdBy` and `vendorUserId` fields
- ✅ Skip products that already have these fields
- ✅ Provide detailed progress and summary

---

## Option C: Cloud Function (One-Time Admin Trigger)

**Run migration as a Firebase Cloud Function:**

1. Deploy the migration function (see instructions below)
2. Call it once via HTTP or Firebase Console
3. Function auto-deletes after completion

**Advantages:**
- No local setup needed
- Runs in Firebase environment
- Can be triggered by Super Admin

---

## Collections to Update

```
cannabis_products          (THC products)
cbd_products              (CBD products - if exists)
hemp_products             (Hemp products - if exists)
mushroom_products         (Mushroom products)
traditional_medicine_products  (Traditional Medicine)
homeopathy_products       (Homeopathy)
permaculture_products     (Permaculture)
apparel_products          (Apparel - if exists)
```

---

## Verification

After migration, verify:

1. **Check a product document:**
   ```javascript
   {
     "name": "Some Product",
     "dispensaryId": "abc123",
     "productOwnerEmail": "vendor@example.com",
     "createdBy": "userUid123",  // ← Should exist
     "vendorUserId": "userUid123",  // ← Should exist
     // ... other fields
   }
   ```

2. **Test vendor filtering:**
   - Login as Vendor
   - Go to Orders page
   - Should see ONLY orders containing their products

3. **Test cart → order flow:**
   - Add product to cart
   - Complete purchase
   - Check order items → should have `createdBy` and `vendorUserId`

---

## Rollback

If something goes wrong:

1. **Revert product creation files** (git checkout)
2. **Remove fields from products:**
   ```javascript
   // Firebase Console or script
   products.forEach(product => {
     delete product.createdBy;
     delete product.vendorUserId;
   });
   ```

---

## Timeline

**Recommended approach:**

1. ✅ **Today**: Deploy new product creation code (DONE)
2. 📅 **This week**: Run migration script for existing products
3. 🧪 **Test**: Verify vendor filtering works correctly
4. 🚀 **Deploy**: Push to production

---

## Notes

- **Existing orders** won't have these fields on items (expected)
- **New orders** will automatically include fields via CartItem
- **Vendors** will see all orders until products are migrated
- **No data loss** - only adding fields, not modifying existing ones

