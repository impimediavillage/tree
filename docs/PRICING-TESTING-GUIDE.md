# Quick Testing Guide - Pricing Integration

## Pre-Flight Checklist

Before deploying, verify these items:

### 1. Build Successfully
```bash
npm run build
```
Expected: ✅ No TypeScript errors

### 2. Check Migration Page
- Navigate to: `/admin/dashboard/system/migrate`
- Button should be visible: "Run Migration"
- Don't click yet (will run after deployment)

### 3. Verify Pricing Utilities
```bash
# Check that pricing.ts exports are available
grep -n "export function calculatePriceBreakdown" src/lib/pricing.ts
```
Expected: Function found

## Testing Sequence (After Deployment)

### Step 1: Run Database Migration
1. Deploy to App Hosting
2. Navigate to: `https://your-app.web.app/admin/dashboard/system/migrate`
3. Login as Super Admin
4. Click "Run Migration"
5. Wait for success message
6. Verify: "Updated X dispensaries"

### Step 2: Test Order Creation - Public Store

1. **Find a Public Store**
   - Navigate to `/browse-stores`
   - Select any non-Product Pool dispensary
   
2. **Check Product Price Display**
   - Should show price WITH commission markup
   - Example: If dispensary set R100, you see ~R143 (with 15% tax + 25% commission)
   
3. **Add to Cart**
   - Add 2 units of any product
   
4. **Proceed to Checkout**
   - Select shipping method
   - Enter shipping address
   - Click "Confirm Order"
   
5. **Check Browser Console**
   - Look for: `📊 Pricing breakdown for "Product Name"`
   - Look for: `✅ Order totals calculated:`
   - Verify values are NOT 0
   
6. **Check Firestore Document**
   ```
   Firebase Console → Firestore → orders → (newest order)
   ```
   - Verify fields:
     - `tax` > 0
     - `taxRate` = 15
     - `totalDispensaryEarnings` > 0
     - `totalPlatformCommission` > 0
   
   - Check `items` array:
     - Each item has `basePrice` ≠ `price`
     - Each item has `platformCommission` > 0
     - Each item has `taxAmount` > 0

### Step 3: Test Order Creation - Product Pool

1. **Navigate to Product Pool**
   - `/store/product_pool` (or whatever the ID is)
   
2. **Check Product Price**
   - Should show price with 5% commission (lower markup)
   
3. **Create Order**
   - Add to cart, checkout
   
4. **Verify Commission Rate**
   - Console log should show: `commissionRate: 0.05`
   - Firestore item should have: `commissionRate: 0.05`

### Step 4: Test Treehouse Order

1. **Navigate to Treehouse Store**
   - `/treehouse` or Creator Lab marketplace
   
2. **Add Apparel Item**
   - Any t-shirt/hoodie/cap
   
3. **Create Order**
   
4. **Verify Treehouse Pricing**
   - Console shows simple pricing (no breakdown)
   - Order has: `orderType: "treehouse"`
   - Order has: `platformCommission` at order level (not item level)

### Step 5: Test Multi-Dispensary Order

1. **Add Products from 2+ Dispensaries**
   - 1 item from Public Store A
   - 1 item from Public Store B
   
2. **Checkout**
   - Should create 2 separate orders
   
3. **Verify Each Order**
   - Both have correct pricing breakdowns
   - Both fetched their respective dispensary taxRate

### Step 6: Verify Cloud Functions (After First Delivery)

1. **Mark Order as Delivered**
   - Dispensary admin panel
   - Change status to "delivered"
   
2. **Check Dispensary Earnings**
   - Navigate to Financial Hub
   - Should show earnings = `totalDispensaryEarnings` from order
   
3. **Check Cloud Function Logs**
   ```
   Firebase Console → Functions → Logs
   ```
   - Look for: `processDispensaryEarnings` execution
   - Verify: Used `totalDispensaryEarnings` field

### Step 7: Test Influencer Commission (If Applicable)

1. **Create Order with Referral Code**
   - Use influencer's referral code at checkout
   
2. **Mark as Delivered**
   
3. **Check Influencer Earnings**
   - Should calculate from `totalPlatformCommission`
   - Formula: `platformCommission × (tierRate / 100)`
   - Example: If platform earned R50, influencer "bloom" (15%) gets R7.50

## Expected Console Output

When creating an order, you should see:

```
📊 Pricing breakdown for "Cannabis Flower - Gelato":
{
  itemPrice: 115,
  quantity: 2,
  taxRate: 15,
  isProductPool: false,
  breakdown: {
    dispensarySetPrice: 115,
    basePrice: 100,
    commission: 25,
    commissionRate: 0.25,
    tax: 18.75,
    finalPrice: 143.75
  },
  calculated: {
    platformCommission: 50,
    taxAmount: 37.5,
    lineTotal: 287.5
  }
}

✅ Order totals calculated:
{
  itemsCount: 1,
  totalTax: "37.50",
  totalDispensaryEarnings: "200.00",
  totalPlatformCommission: "50.00",
  orderTotal: "287.50",
  taxRate: "15%"
}

=== Creating Order ===
Order data BEFORE cleaning: { ... }
Order data AFTER cleaning: { ... }
✅ Order saved successfully with ID: abc123
✅ Dispensary type order saved successfully
```

## Common Issues & Fixes

### Issue 1: Tax = 0 in Order
**Cause:** Dispensary doesn't have taxRate field  
**Fix:** Run migration again, or manually add taxRate: 15 to dispensary

### Issue 2: Commission = 0
**Cause:** calculatePriceBreakdown not being called  
**Fix:** Check order-service.ts imports, verify pricing.ts exists

### Issue 3: "Cannot read property 'taxRate' of undefined"
**Cause:** Dispensary document doesn't exist  
**Fix:** Verify dispensaryId is correct

### Issue 4: Product Pool showing 25% commission
**Cause:** Item's dispensaryType ≠ "Product Pool"  
**Fix:** Check cart item data, ensure dispensaryType field is set correctly

### Issue 5: Treehouse order fails
**Cause:** Missing creatorId or creatorName  
**Fix:** Verify Treehouse product has creator info

## Rollback Plan

If pricing integration causes issues:

1. **Revert order-service.ts**
   ```bash
   git checkout HEAD~1 -- src/lib/order-service.ts
   ```

2. **Redeploy**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

3. **Orders will use placeholder values**
   - Won't break functionality
   - But earnings won't be accurate

## Success Metrics

After 24 hours of live testing:

- [ ] All orders have `tax` > 0
- [ ] All orders have `totalPlatformCommission` > 0
- [ ] Dispensary earnings match order breakdown
- [ ] No console errors related to pricing
- [ ] Cloud functions executing successfully
- [ ] Financial Hub shows accurate numbers

## Support Commands

### Check Recent Orders
```javascript
// In Firebase Console
db.collection('orders')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get()
  .then(snap => {
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log({
        id: doc.id,
        tax: data.tax,
        taxRate: data.taxRate,
        totalPlatformCommission: data.totalPlatformCommission,
        totalDispensaryEarnings: data.totalDispensaryEarnings
      });
    });
  });
```

### Check Dispensary Tax Rates
```javascript
// In Firebase Console
db.collection('dispensaries')
  .limit(5)
  .get()
  .then(snap => {
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log({
        name: data.dispensaryName,
        taxRate: data.taxRate
      });
    });
  });
```

---

**Ready to Deploy:** ✅  
**Estimated Test Time:** 30 minutes  
**Risk Level:** Low (graceful fallbacks included)
