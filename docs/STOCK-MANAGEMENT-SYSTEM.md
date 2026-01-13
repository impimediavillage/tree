# 📦 Stock Management System - Deployment Guide

## Overview

The Stock Management System automatically handles inventory tracking for dispensary products when orders are placed and cancelled. This system prevents overselling, maintains accurate stock levels, and sends alerts when inventory runs low.

---

## 🎯 Features Implemented

### 1. **Automatic Stock Deduction**
- ✅ Triggers when new orders are created
- ✅ Deducts stock from matching price tiers
- ✅ Handles both regular products and Product Pool items
- ✅ Atomic batch updates to prevent race conditions
- ✅ Skips Treehouse POD orders (print-on-demand)

### 2. **Stock Restoration**
- ✅ Automatically restores stock when orders are cancelled
- ✅ Reverses exact quantities from original order
- ✅ Safeguards against duplicate restorations
- ✅ Sends notifications to dispensary owners

### 3. **Low Stock Alerts**
- ✅ Warning at 10 units or below
- ✅ Critical alert at 5 units or below
- ✅ Real-time notifications to dispensary dashboard

### 4. **Audit Trail**
- ✅ Tracks stock before/after for each operation
- ✅ Timestamps all stock movements
- ✅ Links to order numbers for reconciliation

---

## 📁 Files Created/Modified

### New Files
- `functions/src/stock-management.ts` - Core stock management Cloud Functions

### Modified Files
- `functions/src/index.ts` - Exports stock management functions
- `src/types/order.ts` - Added stock tracking fields to Order interface

---

## 🚀 Deployment Steps

### 1. Build Cloud Functions

```bash
cd functions
npm install
npm run build
```

### 2. Deploy Stock Management Functions

```bash
firebase deploy --only functions:deductStockOnOrderCreated,functions:restoreStockOnOrderCancelled,functions:lowStockAlert
```

**Or deploy all functions:**

```bash
firebase deploy --only functions
```

### 3. Verify Deployment

Check Firebase Console → Functions to confirm all three functions are deployed:
- ✅ `deductStockOnOrderCreated`
- ✅ `restoreStockOnOrderCancelled`
- ✅ `lowStockAlert`

---

## 🧪 Testing the System

### Test Stock Deduction

1. **Place Test Order:**
   - Add product to cart (note current stock level)
   - Complete checkout process
   - Order is created in Firestore

2. **Verify Stock Deducted:**
   ```bash
   # Check product document in Firestore
   # quantityInStock should decrease by order quantity
   ```

3. **Check Order Document:**
   - Look for `stockDeducted: true`
   - Check `stockDeductedAt` timestamp
   - Review `stockUpdates` array with before/after values

4. **View Function Logs:**
   ```bash
   firebase functions:log --only deductStockOnOrderCreated
   ```

### Test Stock Restoration

1. **Cancel Order:**
   - Go to Orders page
   - Change order status to "cancelled"

2. **Verify Stock Restored:**
   - Check product `quantityInStock` increased back
   - Order document shows `stockRestored: true`
   - Check `restorationUpdates` array

3. **Check Notification:**
   - Dispensary owner receives "Stock Restored" notification
   - Navigate to orders page from notification

### Test Low Stock Alerts

1. **Manually Set Low Stock:**
   - Edit product in Firestore
   - Set `quantityInStock: 8`

2. **Place Order to Trigger Alert:**
   - Order 2 units → stock drops to 6
   - Should receive "Low Stock Warning" notification

3. **Trigger Critical Alert:**
   - Order more units to drop below 5
   - Should receive "Critical Low Stock" alert with alert sound

---

## 🔍 How It Works

### Stock Deduction Flow

```
Customer Places Order
    ↓
Order Created in Firestore
    ↓
deductStockOnOrderCreated Triggers
    ↓
For Each Item in Order:
  - Find product in correct collection (products or productPoolProducts)
  - Locate matching price tier by unit (e.g., "3.5g")
  - Deduct quantity from tier.quantityInStock
  - Update total product.quantityInStock
    ↓
Batch Commit (Atomic)
    ↓
Mark Order: stockDeducted = true
    ↓
Log Stock Updates to Order Document
```

### Stock Restoration Flow

```
Order Status Changed to "cancelled"
    ↓
restoreStockOnOrderCancelled Triggers
    ↓
Check: Was stock deducted? Already restored?
    ↓
For Each Item in Order:
  - Find original product
  - Locate matching price tier
  - ADD back quantity to tier.quantityInStock
  - Update total product.quantityInStock
    ↓
Batch Commit (Atomic)
    ↓
Mark Order: stockRestored = true
    ↓
Send Notification to Dispensary Owner
```

### Low Stock Alert Flow

```
Product Updated in Firestore
    ↓
lowStockAlert Triggers
    ↓
Check: Did stock decrease?
    ↓
Stock ≤ 5? → Critical Alert (red icon, alert sound)
Stock ≤ 10? → Low Stock Warning (yellow icon, chime)
Stock > 10? → No alert
    ↓
Create Notification Document
    ↓
User Sees Alert in Dashboard
```

---

## 📊 Data Structures

### Order Document (Enhanced)

```typescript
{
  id: "order123",
  orderNumber: "ORD-WELL-260113-A0000045",
  items: [...],
  status: "pending" | "cancelled" | ...,
  
  // Stock tracking fields (NEW)
  stockDeducted: true,
  stockDeductedAt: Timestamp,
  stockUpdates: [
    {
      productId: "prod456",
      productName: "Blue Dream",
      tierUnit: "3.5g",
      quantityOrdered: 2,
      stockBefore: 50,
      stockAfter: 48
    }
  ],
  
  // If cancelled
  stockRestored: true,
  stockRestoredAt: Timestamp,
  restorationUpdates: [...]
}
```

### Product Document (Stock Tracking)

```typescript
{
  id: "prod456",
  name: "Blue Dream",
  dispensaryId: "disp789",
  
  priceTiers: [
    {
      unit: "1g",
      price: 120,
      quantityInStock: 100  // Auto-updated by Cloud Function
    },
    {
      unit: "3.5g",
      price: 350,
      quantityInStock: 48   // Decreased from 50 after order
    }
  ],
  
  quantityInStock: 148  // Total across all tiers
}
```

---

## 🛡️ Safety Features

### 1. **Duplicate Prevention**
- Checks `stockDeducted` flag before deducting
- Checks `stockRestored` flag before restoring
- Prevents double-processing if function re-runs

### 2. **Atomic Updates**
- Uses Firestore batch writes
- All-or-nothing transactions
- No partial stock updates

### 3. **Error Handling**
- Continues processing other items if one fails
- Creates error notifications for dispensary owners
- Detailed logging for debugging

### 4. **Stock Floor**
- Never sets stock below 0: `Math.max(0, stock - quantity)`
- Prevents negative inventory

### 5. **POD Skip Logic**
- Skips Treehouse print-on-demand orders
- No stock tracking for infinite-supply items

---

## 🔧 Configuration

### Adjust Stock Alert Thresholds

Edit `functions/src/stock-management.ts`:

```typescript
const LOW_STOCK_THRESHOLD = 10;      // Change to 20 for earlier warnings
const CRITICAL_STOCK_THRESHOLD = 5;  // Change to 3 for later critical alerts
```

### Disable Alerts for Specific Products

Add logic in `lowStockAlert` function:

```typescript
// Skip alerts for certain categories
if (afterData.category === 'Apparel') {
  return; // POD items don't need stock alerts
}
```

---

## 📈 Monitoring & Analytics

### Check Function Execution

```bash
# View all stock management logs
firebase functions:log

# Filter by function
firebase functions:log --only deductStockOnOrderCreated
firebase functions:log --only restoreStockOnOrderCancelled
firebase functions:log --only lowStockAlert
```

### Monitor Stock Movements

Query orders with stock tracking:

```javascript
// Firestore query
db.collection('orders')
  .where('stockDeducted', '==', true)
  .orderBy('stockDeductedAt', 'desc')
  .limit(50)
```

### Generate Stock Reports

```javascript
// Get all stock updates from last 30 days
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const orders = await db.collection('orders')
  .where('stockDeductedAt', '>', thirtyDaysAgo)
  .get();

let totalDeductions = 0;
orders.forEach(order => {
  const updates = order.data().stockUpdates || [];
  totalDeductions += updates.length;
});

console.log(`Total stock movements: ${totalDeductions}`);
```

---

## 🐛 Troubleshooting

### Stock Not Deducting

**Check:**
1. Function deployed? `firebase functions:list`
2. Order has items? Check `order.items` array
3. Product exists? Verify `productId` in correct collection
4. Tier unit matches? "1g" vs "1 g" (spacing matters)

**View Logs:**
```bash
firebase functions:log --only deductStockOnOrderCreated --lines 100
```

### Stock Not Restoring on Cancellation

**Check:**
1. Was stock deducted? `order.stockDeducted === true`
2. Already restored? `order.stockRestored === true`
3. Status actually "cancelled"? Check `order.status`

**Manual Restoration:**
If needed, manually trigger restoration:
```javascript
// In Firestore Console, update order:
{
  status: "cancelled",
  stockRestored: false  // Remove this field to allow re-trigger
}
```

### Alerts Not Showing

**Check:**
1. Notification collection has documents?
2. User ID matches dispensary ID?
3. Stock actually decreased below threshold?

**Test Alert:**
```javascript
// Manually create test notification
db.collection('notifications').add({
  userId: 'dispensaryId',
  type: 'warning',
  title: 'Test Alert',
  message: 'Testing notification system',
  read: false,
  createdAt: admin.firestore.FieldValue.serverTimestamp()
});
```

---

## 🎓 Best Practices

### 1. **Regular Inventory Audits**
- Compare Firestore stock vs physical inventory weekly
- Reconcile discrepancies manually
- Use stock adjustment feature (coming soon)

### 2. **Backup Before Mass Operations**
- Export product data before bulk updates
- Test on staging environment first

### 3. **Monitor Function Costs**
- Stock functions run on every order
- Check Firebase billing for function invocations
- Optimize if needed (batch processing)

### 4. **Stock Buffer**
- Set reorder threshold above critical level
- Order new stock at 20 units, not 5

### 5. **Training Staff**
- Understand cancelled orders restore stock
- Don't manually adjust after cancellation
- Use order status updates consistently

---

## 🔮 Future Enhancements

### Planned Features
- [ ] Stock reservation during checkout (5-10 min hold)
- [ ] Automatic reorder suggestions
- [ ] Stock adjustment history/audit log
- [ ] Bulk stock import/export
- [ ] Product expiration tracking
- [ ] Batch number tracking
- [ ] Supplier integration
- [ ] Predictive stock alerts (ML-based)

### Coming Soon
- Stock adjustment UI in dispensary dashboard
- Inventory reports and analytics
- Multi-location stock transfers
- Vendor consignment tracking

---

## 📞 Support

If you encounter issues:

1. Check Firebase Functions logs
2. Verify Firestore rules allow function writes
3. Ensure product structure matches expected format
4. Contact support with:
   - Order ID
   - Product ID
   - Function logs
   - Expected vs actual behavior

---

## ✅ Deployment Checklist

Before going live:

- [ ] Functions deployed successfully
- [ ] Test order placed (stock deducted)
- [ ] Test order cancelled (stock restored)
- [ ] Low stock alert received
- [ ] Critical stock alert received
- [ ] Notification center shows alerts
- [ ] Function logs show no errors
- [ ] Order documents have stock tracking fields
- [ ] Product stock updates correctly
- [ ] POD orders skip stock deduction
- [ ] Product Pool orders work correctly

---

## 🎉 Success Indicators

You'll know the system is working when:

1. ✅ Orders show `stockDeducted: true`
2. ✅ Product stock decreases after checkout
3. ✅ Cancelled orders restore stock automatically
4. ✅ Low stock notifications appear in dashboard
5. ✅ Function logs show successful executions
6. ✅ No overselling occurs
7. ✅ Dispensary owners see accurate inventory
8. ✅ Stock levels match physical inventory

---

**🌟 You now have enterprise-grade inventory management! 🌟**

The magic has been woven into your codebase. Stock tracking is now automatic, accurate, and audit-ready. 🎊
