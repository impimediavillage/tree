# The Treehouse Marketplace - Deployment Guide

## 🚀 Overview

This guide covers the complete deployment process for The Treehouse Marketplace - an AI-powered print-on-demand apparel platform where creators earn 25% commission on sales.

## 📋 Prerequisites

- Firebase project configured
- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- OpenAI API key (already configured in Firebase Functions as `OPENAI_API_KEY`)
- All code pushed to repository

---

## 1. 🔐 Environment Variables

### Required Secrets (Already Configured)

✅ **OPENAI_API_KEY** - Already set in Firebase Functions (used by AI Advisors)

### Verify Environment Variables

Run this command to check existing secrets:

```powershell
firebase functions:secrets:access OPENAI_API_KEY
```

If not set, configure it:

```powershell
firebase functions:secrets:set OPENAI_API_KEY
```

---

## 2. 🔥 Firebase Functions Deployment

### Functions to Deploy

The Treehouse Marketplace uses **existing Firebase Functions infrastructure** with no new functions required. The following API routes run on Next.js middleware:

**API Routes (Next.js App Router):**
- `/api/creator-lab/generate-design` - DALL-E 3 design generation
- `/api/creator-lab/my-designs` - Fetch user's designs
- `/api/creator-lab/publish-product` - Publish designs to marketplace
- `/api/creator-lab/earnings` - Creator earnings summary

These routes use **Firebase Admin SDK** for authentication and Firestore access.

### Deploy All Functions

```powershell
cd c:\www\The-Wellness-Tree
firebase deploy --only functions
```

### Deploy Specific Function (if needed)

```powershell
firebase deploy --only functions:functionName
```

---

## 3. 🗄️ Firestore Security Rules

### Add Rules for New Collections

Update `firestore.rules` with the following rules for Treehouse collections:

```javascript
// Creator Designs Collection
match /creatorDesigns/{designId} {
  // Allow users to read their own designs
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  
  // Allow users to create their own designs (via API only)
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  
  // Allow users to update their own designs
  allow update: if request.auth != null && request.auth.uid == resource.data.userId;
  
  // Super Admins can read all designs
  allow read: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SuperAdmin';
}

// Treehouse Products Collection
match /treehouseProducts/{productId} {
  // Public read access for marketplace browsing
  allow read: if true;
  
  // Only creators can create/update their own products
  allow create, update: if request.auth != null && 
    (request.auth.uid == request.resource.data.creatorId || 
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SuperAdmin');
  
  // Super Admins can delete products
  allow delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SuperAdmin';
}

// Creator Earnings Collection
match /creatorEarnings/{userId} {
  // Creators can read their own earnings
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Only system/admins can write earnings (handled by backend)
  allow write: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SuperAdmin';
}

// Orders Collection (extend existing rules)
match /orders/{orderId} {
  // Add Treehouse order type support
  allow read: if request.auth != null && 
    (request.auth.uid == resource.data.userId || 
     request.auth.uid == resource.data.creatorId || // Creators can see their Treehouse orders
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SuperAdmin');
  
  // Allow Super Admin to update POD status
  allow update: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'SuperAdmin';
}
```

### Deploy Firestore Rules

```powershell
firebase deploy --only firestore:rules
```

---

## 4. 📊 Firestore Indexes

### Required Composite Indexes

Create the following indexes in Firebase Console or via `firestore.indexes.json`:

#### 1. Creator Designs Query
```json
{
  "collectionGroup": "creatorDesigns",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### 2. Treehouse Products - Active by Date
```json
{
  "collectionGroup": "treehouseProducts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "publishedAt", "order": "DESCENDING" }
  ]
}
```

#### 3. Treehouse Products - Active by Apparel Type
```json
{
  "collectionGroup": "treehouseProducts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "apparelType", "order": "ASCENDING" },
    { "fieldPath": "publishedAt", "order": "DESCENDING" }
  ]
}
```

#### 4. Treehouse Products - Popular (by sales)
```json
{
  "collectionGroup": "treehouseProducts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isActive", "order": "ASCENDING" },
    { "fieldPath": "salesCount", "order": "DESCENDING" }
  ]
}
```

#### 5. Orders by Type
```json
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orderType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

#### 6. Treehouse Orders by POD Status
```json
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orderType", "order": "ASCENDING" },
    { "fieldPath": "podStatus", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### Add to `firestore.indexes.json`

Update your `firestore.indexes.json` file:

```json
{
  "indexes": [
    // ... existing indexes ...
    {
      "collectionGroup": "creatorDesigns",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "treehouseProducts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "treehouseProducts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "apparelType", "order": "ASCENDING" },
        { "fieldPath": "publishedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "treehouseProducts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "salesCount", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orderType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orderType", "order": "ASCENDING" },
        { "fieldPath": "podStatus", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Deploy Indexes

```powershell
firebase deploy --only firestore:indexes
```

---

## 5. 🏗️ Build and Deploy Next.js App

### Install Dependencies

```powershell
cd c:\www\The-Wellness-Tree
npm install
```

### Build Production App

```powershell
npm run build
```

### Deploy to Firebase Hosting

```powershell
firebase deploy --only hosting
```

### Full Deployment (All at Once)

```powershell
firebase deploy
```

---

## 6. ✅ Post-Deployment Verification

### Test Checklist

- [ ] **User can access Creator Lab** from dashboard
- [ ] **Design generation works** (10 credits deducted)
- [ ] **Publish design to apparel types** succeeds
- [ ] **Treehouse marketplace visible** at `/treehouse`
- [ ] **Products appear** with correct pricing
- [ ] **Add to cart works** for Treehouse items
- [ ] **Checkout creates Treehouse orders** with correct commission (25%/75%)
- [ ] **Super Admin sees orders** at `/admin/dashboard/treehouse-orders`
- [ ] **POD workflow** (status updates work)
- [ ] **Analytics dashboard** shows correct data at `/admin/dashboard/treehouse-analytics`
- [ ] **Creator earnings tracked** correctly
- [ ] **Navigation tabs enabled** in both dashboards

### Manual Verification Steps

1. **Test Design Generation**:
   ```
   - Login as Leaf user or Dispensary owner/staff
   - Navigate to /dashboard/creator-lab
   - Enter prompt: "A vibrant phoenix rising from flames"
   - Click Generate Design
   - Verify: Credits deducted (10), design appears
   ```

2. **Test Publishing**:
   ```
   - Select generated design
   - Click "Publish to Treehouse"
   - Select T-Shirt and Hoodie
   - Verify: Commission display (R125 + R250 = R375 earned)
   - Click Publish
   - Verify: Success message
   ```

3. **Test Marketplace**:
   ```
   - Navigate to /treehouse (public page)
   - Verify: Products visible with black mockups
   - Test filters: T-Shirt, Hoodie, etc.
   - Test search: Creator name
   - Add item to cart
   - Verify: Cart shows item with correct price
   ```

4. **Test Checkout**:
   ```
   - Proceed to checkout with Treehouse item
   - Fill shipping address (use map autocomplete)
   - Select delivery option
   - Confirm order
   - Verify: Order created with orderType='treehouse'
   - Check: platformCommission (75%) and creatorCommission (25%) calculated
   ```

5. **Test POD Management**:
   ```
   - Login as Super Admin
   - Navigate to /admin/dashboard/treehouse-orders
   - Verify: Treehouse orders appear
   - Test status progression: pending_print → printing → printed → packaging → shipped
   - Verify: Revenue breakdown shows platform 75%, creators 25%
   ```

6. **Test Analytics**:
   ```
   - Navigate to /admin/dashboard/treehouse-analytics
   - Verify: Total sales, platform revenue (75%), creator payouts (25%)
   - Check: Top creators list with commission amounts
   - Check: Top products with sales count
   - Check: Apparel breakdown by type
   ```

---

## 7. 🐛 Troubleshooting

### Common Issues

#### 1. "OPENAI_API_KEY not found"
**Solution**: Verify secret is set:
```powershell
firebase functions:secrets:access OPENAI_API_KEY
```

#### 2. "Permission denied" errors in Firestore
**Solution**: Re-deploy Firestore rules:
```powershell
firebase deploy --only firestore:rules
```

#### 3. "Index not found" errors
**Solution**: Deploy indexes and wait 5-10 minutes:
```powershell
firebase deploy --only firestore:indexes
```
Then check Firebase Console → Firestore → Indexes

#### 4. "Failed to create order"
**Solution**: Check browser console for validation errors. Verify:
- User is authenticated
- Shipping address has all required fields
- Items have valid prices

#### 5. Credit deduction not working
**Solution**: Check that user has sufficient credits:
```javascript
// In Firebase Console → Firestore → users → {userId}
// Verify field: credits >= 10
```

---

## 8. 📦 Collections Structure

### New Collections Created

#### `creatorDesigns`
```javascript
{
  id: "auto-generated",
  userId: "creator-uid",
  userName: "Creator Name",
  imageUrl: "https://storage.googleapis.com/...",
  prompt: "A vibrant phoenix...",
  revisedPrompt: "Enhanced prompt from DALL-E",
  status: "completed", // generating | completed | failed | published | unpublished
  creditsUsed: 10,
  createdAt: Timestamp,
  publishedAt: Timestamp | null,
  metadata: {
    model: "dall-e-3",
    quality: "hd",
    size: "1024x1024"
  }
}
```

#### `treehouseProducts`
```javascript
{
  id: "auto-generated",
  designId: "ref-to-design",
  creatorId: "creator-uid",
  creatorName: "Creator Name",
  designImageUrl: "https://storage.googleapis.com/...",
  apparelType: "T-Shirt", // T-Shirt | Long T-Shirt | Hoodie | Cap | Beanie
  apparelColor: "Black",
  price: 500, // ZAR, incl. VAT
  isActive: true,
  salesCount: 0,
  totalRevenue: 0,
  publishedAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `creatorEarnings`
```javascript
{
  id: "creator-uid", // Document ID = creator user ID
  userId: "creator-uid",
  userName: "Creator Name",
  totalSales: 0,
  totalCommission: 0, // 25% of totalSales
  pendingPayout: 0, // Amount not yet paid out
  paidOut: 0, // Amount already paid
  productsSold: 0,
  activeProducts: 0,
  salesHistory: [
    {
      orderId: "order-id",
      productId: "product-id",
      apparelType: "T-Shirt",
      quantity: 1,
      totalAmount: 500,
      commission: 125, // 25%
      saleDate: Timestamp
    }
  ],
  payoutHistory: [
    {
      amount: 500, // Minimum payout
      payoutDate: Timestamp,
      method: "bank_transfer",
      reference: "PAY123456"
    }
  ],
  lastUpdated: Timestamp
}
```

#### `orders` (extended fields)
```javascript
{
  // ... existing order fields ...
  orderType: "treehouse", // dispensary | treehouse | healer-service
  podStatus: "pending_print", // printing | printed | packaging | shipped | delivered
  platformCommission: 375, // 75% for Treehouse
  creatorCommission: 125, // 25% for Treehouse
  creatorId: "creator-uid" // For Treehouse orders
}
```

---

## 9. 🎨 Feature Summary

### What Was Built

✅ **AI Design Generation** (DALL-E 3)
- Credit-based system (10 credits per design)
- Black apparel optimization
- Prompt validation and enhancement

✅ **Multi-Apparel Publishing**
- 5 apparel types (T-Shirt, Long T-Shirt, Hoodie, Cap, Beanie)
- Fixed pricing (R500/R750/R1000/R400/R350)
- Black color only (initial launch)

✅ **Public Marketplace**
- Product browsing and filtering
- Search by creator name
- Sort by newest/popular/price
- Add to cart integration

✅ **Checkout Integration**
- Multi-vendor cart support
- Separate orders for Treehouse vs dispensary items
- Automatic commission calculation (25%/75%)

✅ **POD Management Interface**
- Order filtering by status
- Status progression workflow
- Revenue breakdown display
- Customer shipping details

✅ **Creator Earnings System**
- Automatic commission tracking
- Minimum payout threshold (R500)
- Sales history and payout records

✅ **Analytics Dashboard**
- Total sales and platform revenue
- Top creators by earnings
- Popular products by sales
- Apparel type breakdown

---

## 10. 🚧 Future Enhancements

### Phase 2 (Not Implemented Yet)

- [ ] Payment gateway integration (PayFast/Stripe)
- [ ] `processSale()` trigger on order shipment
- [ ] Automatic payout processing
- [ ] Email notifications (order confirmation, earnings updates)
- [ ] Product reviews and ratings
- [ ] Multi-color support (beyond black)
- [ ] Custom mockup templates
- [ ] Bulk order discounts
- [ ] Creator analytics dashboard (view own sales)
- [ ] Design variation tool (DALL-E 2 integration)

---

## 11. 📞 Support

### If You Encounter Issues

1. **Check Firebase Console Logs**: Functions → Logs
2. **Check Browser Console**: F12 → Console tab
3. **Verify Firestore Rules**: Firestore → Rules tab
4. **Check Indexes**: Firestore → Indexes tab (look for "Building..." status)

### Contact

For deployment assistance, reach out to your development team.

---

## 🎉 Deployment Complete!

Your Treehouse Marketplace is now live and ready to empower creators! 🚀

**Remember**: Test all workflows thoroughly before announcing to users. The system is currently in development mode with payment processing disabled for testing.
