# Multi-Vendor Order Processing - Quick Reference

## 🎯 Architecture Summary

**Vendor Tracking:** Per-item, not per-order
- ✅ `OrderItem.vendorUserId` (inherited from CartItem)
- ❌ NO `Order.vendorId` field

## 📊 Example Scenarios

### Scenario A: Single Vendor Order
```
Cart: 2 items from John
→ 1 Order created
→ 1 VendorSaleTransaction created (John)
```

### Scenario B: Multi-Vendor, Single Dispensary
```
Cart: 
├─ Product A (John) - R100
├─ Product B (Mike) - R50
└─ Product C (Owner) - R75

→ 1 Order created with 3 items
→ 2 VendorSaleTransactions created:
   ├─ Transaction 1: John (R100, commission R10, net R90)
   └─ Transaction 2: Mike (R50, commission R7.50, net R42.50)
→ Owner's product (R75) has no transaction (goes to dispensary)
```

### Scenario C: Multi-Vendor, Multi-Dispensary
```
Cart:
Dispensary 1:
├─ Product A (John) - R100
└─ Product B (Mike) - R50

Dispensary 2:
├─ Product D (Lisa) - R80
└─ Product E (Owner) - R60

→ 2 Orders created (split by dispensary)
→ Order 1: 2 VendorSaleTransactions (John, Mike)
→ Order 2: 1 VendorSaleTransaction (Lisa)
```

## 🔄 Processing Flow

### 1. Order Delivered
```typescript
// Cloud Function: recordVendorSale
onDocumentUpdated('orders/{orderId}')
```

### 2. Group Items by Vendor
```typescript
const itemsByVendor = new Map<string, OrderItem[]>();

for (const item of order.items) {
  if (item.vendorUserId) {
    itemsByVendor.set(item.vendorUserId, [...items]);
  }
}
// Items without vendorUserId are owner products (skipped)
```

### 3. Create Transaction Per Vendor
```typescript
for (const [vendorId, vendorItems] of itemsByVendor) {
  // Calculate this vendor's total
  const saleAmount = vendorItems.reduce((sum, item) => 
    sum + (item.basePrice * item.quantity), 0
  );
  
  // Get vendor's commission rate
  const commissionRate = vendorData.dispensaryCommissionRate; // e.g., 10%
  
  // Calculate split
  const dispensaryCommission = saleAmount * (commissionRate / 100);
  const vendorNetPayout = saleAmount - dispensaryCommission;
  
  // Create VendorSaleTransaction
  // Update VendorEarnings.currentBalance += vendorNetPayout
}
```

## 💰 Revenue Split Example

**Order with 3 items:**
```
Item A: R100 (John, 10% commission)
Item B: R50 (Mike, 15% commission)
Item C: R75 (Owner product)

Customer Pays:
├─ Item A: R125 (R100 + 25% platform)
├─ Item B: R62.50 (R50 + 25% platform)
└─ Item C: R93.75 (R75 + 25% platform)
Total: R281.25

Revenue Distribution:
├─ Platform: R56.25 (25% commission on R225 base)
├─ John: R90 (R100 - R10 dispensary commission)
├─ Mike: R42.50 (R50 - R7.50 dispensary commission)
└─ Dispensary: R92.50 (R10 + R7.50 + R75 owner product)
```

## 🏗️ Data Structures

### VendorSaleTransaction (Multiple per Order)
```typescript
{
  orderId: "order123",              // Same order
  vendorId: "john123",              // Different vendors
  saleAmount: 100.00,               // Only this vendor's items
  dispensaryCommission: 10.00,
  vendorEarnings: 90.00,
  status: "completed"
}
```

### VendorEarnings (Per Vendor)
```typescript
{
  vendorId: "john123",
  currentBalance: 450.00,           // Available for payout
  totalSales: 1000.00,              // Cumulative gross
  totalCommissionPaid: 100.00,      // Cumulative to dispensary
  totalEarnings: 900.00,            // Cumulative net
  totalSalesCount: 10               // Number of transactions
}
```

## ✅ Key Points

1. **One order can have MULTIPLE vendor transactions** - Each vendor gets their own VendorSaleTransaction
2. **Owner products have NO vendor transaction** - Only items with vendorUserId are tracked
3. **Each vendor has different commission rates** - Stored in User.dispensaryCommissionRate
4. **Vendor earnings are independent** - John's sales don't affect Mike's balance
5. **Order total ≠ vendor sale amount** - Order includes platform commission + all vendors + owner products
6. **Accurate per-item attribution** - Vendor credited only for items they created

## 🚀 Benefits

- **Fair revenue distribution** - Each vendor paid exactly for their items
- **Flexible commission rates** - Different rates per vendor
- **Clean separation** - Owner vs vendor products clearly distinguished
- **Scalable** - Supports unlimited vendors per dispensary
- **Transparent tracking** - Complete audit trail per vendor per item

## 📝 Notes

- Multi-dispensary carts already split into separate orders (existing functionality)
- Vendor commission calculated from vendor's base price (not customer's final price)
- Platform 25% commission is separate from vendor/dispensary split
- VendorSaleTransaction status tracks order lifecycle (completed/refunded)
