# 📦 Stock Management - Quick Start Guide

## 🚀 Deploy in 3 Steps

### Step 1: Build Functions
```bash
cd functions
npm install
npm run build
```

### Step 2: Deploy to Firebase
```bash
firebase deploy --only functions:deductStockOnOrderCreated,functions:restoreStockOnOrderCancelled,functions:lowStockAlert
```

### Step 3: Test It Works
1. Place a test order
2. Check product stock decreased
3. Cancel order
4. Check stock restored

---

## ✨ What It Does

### Automatic Stock Deduction
- ✅ When customer places order → stock decreases automatically
- ✅ Works for all product types (THC, CBD, Mushrooms, etc.)
- ✅ Handles Product Pool inter-dispensary orders
- ✅ Skips Treehouse POD orders (print-on-demand)

### Automatic Stock Restoration  
- ✅ When order cancelled → stock increases back
- ✅ Sends notification to dispensary owner
- ✅ Prevents duplicate restorations

### Low Stock Alerts
- ✅ Warning at ≤ 10 units
- ✅ Critical alert at ≤ 5 units
- ✅ Shows in notification center with sound

---

## 🎯 How to Use

### For Dispensary Owners

**Normal Operation:**
- Stock updates automatically, nothing to do! 🎉
- Watch for low stock notifications
- Reorder when you get alerts

**When Order Cancelled:**
- Stock restores automatically
- You'll get notification confirming restoration
- No manual adjustment needed

### For Customers

**Before Checkout:**
- See real-time stock availability
- "Out of Stock" button if item unavailable
- Can't order more than available

**After Order Placed:**
- Stock reserved for your order
- If you cancel, stock becomes available again

---

## 📊 Stock Tracking Fields

Every order now includes:

```javascript
{
  stockDeducted: true,           // Flag: stock was removed
  stockDeductedAt: Timestamp,    // When it happened
  stockUpdates: [{               // What changed
    productId: "prod123",
    productName: "Blue Dream",
    tierUnit: "3.5g",
    quantityOrdered: 2,
    stockBefore: 50,
    stockAfter: 48
  }]
}
```

---

## 🔍 View Function Logs

```bash
# See all stock operations
firebase functions:log

# See only stock deductions
firebase functions:log --only deductStockOnOrderCreated

# See only restorations
firebase functions:log --only restoreStockOnOrderCancelled

# See only alerts
firebase functions:log --only lowStockAlert
```

---

## 🐛 Quick Troubleshooting

### Stock Not Deducting?
1. Check function deployed: `firebase functions:list`
2. View logs: `firebase functions:log --only deductStockOnOrderCreated`
3. Verify product has `priceTiers` array
4. Check tier `unit` matches exactly (e.g., "3.5g" not "3.5 g")

### Stock Not Restoring?
1. Check order status is "cancelled"
2. Verify `stockDeducted: true` on order
3. Check `stockRestored` field (should be missing or false)
4. View logs for errors

### No Low Stock Alerts?
1. Check stock actually decreased below 10
2. Verify dispensaryId on product matches user
3. Check notifications collection for documents

---

## 🎓 Configuration Options

### Change Alert Thresholds

Edit `functions/src/stock-management.ts`:

```typescript
const LOW_STOCK_THRESHOLD = 10;      // Default: warn at 10 units
const CRITICAL_STOCK_THRESHOLD = 5;  // Default: critical at 5 units
```

Deploy after changes:
```bash
cd functions && npm run build && firebase deploy --only functions:lowStockAlert
```

---

## ✅ Verify Deployment

Run these checks:

1. **Functions Deployed:**
   ```bash
   firebase functions:list | grep stock
   ```
   Should show:
   - deductStockOnOrderCreated
   - restoreStockOnOrderCancelled
   - lowStockAlert

2. **Test Stock Deduction:**
   - Place order for 2x "3.5g" of product with stock: 50
   - Check product in Firestore: stock should be 48
   - Check order document: `stockDeducted: true`

3. **Test Stock Restoration:**
   - Cancel the order above
   - Check product stock: should be back to 50
   - Check order: `stockRestored: true`

4. **Test Low Stock Alert:**
   - Manually set product stock to 8
   - Place order for 2 units (stock → 6)
   - Check notifications: "Low Stock Warning" should appear

---

## 📈 Success Metrics

You'll know it's working when:

- ✅ Order placed → product stock decreases
- ✅ Order cancelled → product stock increases
- ✅ Low stock → notification sent
- ✅ No overselling (can't buy more than available)
- ✅ Function logs show "✅ Stock deduction complete"
- ✅ Dispensary owners see accurate inventory

---

## 🎉 You're Done!

Stock management is now **fully automated**. No manual inventory adjustments needed. The system handles everything! 🚀

For detailed documentation, see: [STOCK-MANAGEMENT-SYSTEM.md](./STOCK-MANAGEMENT-SYSTEM.md)
