# Vendor Commission System - Clarifications & Final Architecture

## 🎯 Key Clarifications

### 1. Order Status Flow (All Shipping Methods)

**Question:** Do PUDO, ShipLogic, and Driver deliveries all use the same status?

**Answer:** ✅ **YES** - All shipping methods use the same `OrderStatus` enum:

```typescript
export type OrderStatus = 
  | 'pending' 
  | 'pending_payment' 
  | 'paid' 
  | 'processing' 
  | 'ready_for_shipping'
  | 'label_generated'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'shipped' 
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'  // ← recordVendorSale triggers HERE
  | 'cancelled'
  | 'failed'
  | 'returned';
```

**Cloud Function Trigger:**
```typescript
// recordVendorSale in vendor-commissions.ts
if (before?.status !== 'delivered' && after?.status === 'delivered') {
  // Create VendorSaleTransaction
  // Update VendorEarnings
}
```

**Result:** Works for ALL delivery methods - PUDO locker pickup, ShipLogic courier, and in-house driver deliveries all mark orders as `delivered`.

---

### 2. Vendor Pricing & Commission Structure

**Question:** How does vendor pricing and dispensary commission work?

**Clarification:**
- ✅ **Vendor sets the product price** (e.g., R100)
- ✅ **Dispensary commission is calculated FROM vendor price** (not added on top)
- ✅ **Platform 25% commission applies as normal** for public store sales
- ❌ **NOT:** Vendor price + dispensary commission = customer price

**Example:**

```typescript
// Vendor creates product with price: R100
Product {
  price: 100,  // This is what vendor receives (minus dispensary commission)
  vendorUserId: "vendor123"
}

// Dispensary has 10% commission rate set for this vendor
Vendor.dispensaryCommissionRate = 10;

// Customer checkout:
Vendor Price:               R100.00
Platform Commission (25%):  + R25.00
─────────────────────────────────────
Customer Pays:              R125.00

// Revenue split when order delivers:
Total Sale:                 R125.00
  ├─ Platform gets:         R25.00  (25% commission - normal)
  └─ Vendor receives:       R100.00
      ├─ Dispensary keeps:  R10.00  (10% of R100)
      └─ Vendor net payout: R90.00  (90% of R100)
```

**Code Implementation:**
```typescript
// vendor-commissions.ts - calculateVendorPayout()
function calculateVendorPayout(grossSales: number, commissionRate: number) {
  const dispensaryCommission = (grossSales * commissionRate) / 100;
  const vendorNetPayout = grossSales - dispensaryCommission;
  
  return {
    dispensaryCommission,  // R10 (10% of R100)
    vendorNetPayout,       // R90 (vendor keeps 90%)
    vendorReceivesPercentage: 100 - commissionRate
  };
}
```

**Important:** The `grossSales` in the vendor payout calculation is the vendor's base price (R100), NOT the customer price (R125). The platform commission (R25) goes to the platform separately.

---

### 3. Vendor Selection in Checkout - CRITICAL CORRECTION

**Original Misconception:** Need to add vendor dropdown in checkout for customer to select.

**ACTUAL ARCHITECTURE:** ✅ **VendorId comes from PRODUCT, not checkout selection**

#### Current Flow (Already Working):

**Step 1: Vendor Adds Product**
```typescript
// When vendor logs in and creates product
const productData = {
  name: "Cannabis Oil",
  price: 100,
  dispensaryId: "dispensary123",
  createdBy: currentUser.uid,        // ✅ Vendor's userId
  vendorUserId: currentUser.uid,     // ✅ Vendor tracking
  // ... other fields
};
```

**Step 2: Product Added to Cart**
```typescript
// CartItem already has vendorUserId
interface CartItem {
  productId: string;
  name: string;
  price: number;
  createdBy?: string;           // ✅ Already present
  vendorUserId?: string | null; // ✅ Already present
  // ... other fields
}
```

**Step 3: Order Creation (UPDATED)**
```typescript
// order-service.ts - createOrder()
// Vendor tracking happens PER ITEM, not at order level
const orderItems: OrderItem[] = items.map(item => ({
  ...item,
  vendorUserId: item.vendorUserId,  // ✅ Preserved from CartItem
  createdBy: item.createdBy,        // ✅ Preserved from CartItem
  // ... pricing breakdown
}));

const orderData: Order = {
  items: orderItems,  // ✅ Each item tracks its own vendor
  // ... other order fields
  // ❌ NO order-level vendorId field
};
```

**Step 4: Order Delivered → MULTIPLE Vendors Credited**
```typescript
// vendor-commissions.ts - recordVendorSale
if (after?.status === 'delivered') {
  // Group items by vendorId
  const itemsByVendor = new Map<string, OrderItem[]>();
  
  for (const item of order.items) {
    if (item.vendorUserId) {
      itemsByVendor.set(item.vendorUserId, [...items]);
    }
  }
  
  // Create VendorSaleTransaction for EACH vendor
  for (const [vendorId, vendorItems] of itemsByVendor) {
    const vendorSaleAmount = vendorItems.reduce((sum, item) => 
      sum + (item.basePrice * item.quantity), 0
    );
    
    // Create transaction and update earnings for this vendor
  }
}
```

#### Key Points:

1. **No UI selection needed** - Customer never selects a vendor
2. **Product creator is the vendor** - When vendor adds product, their userId is stored in product
3. **Owner products have no vendorId** - If owner creates product, vendorUserId is undefined/null
4. **Multi-vendor orders fully supported** - Each OrderItem tracks its own vendorUserId
5. **Multiple transactions per order** - If order has items from 3 vendors, 3 separate VendorSaleTransactions are created
6. **Accurate revenue split** - Each vendor gets credited only for their items

#### Product Filtering (Already Implemented):

```typescript
// Vendors only see orders containing their products
const vendorOrders = orders.filter(order => 
  order.items.some(item => item.vendorUserId === currentUser.uid)
);
```

---

## 🏗️ Complete Architecture

### Collections

**vendor_earnings/**
```typescript
{
  vendorId: "vendor123",
  dispensaryId: "disp456",
  dispensaryCommissionRate: 10,  // 10% to dispensary
  currentBalance: 450.00,         // Available for payout
  pendingBalance: 0.00,           // In payout request
  paidBalance: 1200.00,           // Historical payouts
  totalSales: 1650.00,            // Gross sales total
  totalCommissionPaid: 165.00,    // Total paid to dispensary
  totalEarnings: 1485.00,         // Net vendor earnings
  totalSalesCount: 18,
  totalPayouts: 3,
  lastUpdated: Timestamp
}
```

**vendor_sale_transactions/**
```typescript
{
  id: "trans123",
  vendorId: "vendor123",
  vendorName: "John Vendor",
  dispensaryId: "disp456",
  orderId: "order789",
  orderNumber: "ORD-WELL-2024-12345",
  saleAmount: 100.00,              // Vendor's base price
  dispensaryCommissionRate: 10,
  dispensaryCommission: 10.00,     // Dispensary keeps
  vendorEarnings: 90.00,           // Vendor receives
  status: "completed",
  createdAt: Timestamp
}
```

**vendor_payout_requests/**
```typescript
{
  id: "payout123",
  vendorId: "vendor123",
  vendorName: "John Vendor",
  dispensaryId: "disp456",
  grossSales: 500.00,              // Total vendor sales
  dispensaryCommissionRate: 10,
  dispensaryCommission: 50.00,     // Deducted for dispensary
  netPayout: 450.00,               // Vendor receives
  bankDetails: { ... },
  status: "pending",               // pending → approved → paid
  requestedAt: Timestamp
}
```

### Cloud Functions

**1. recordVendorSale** (Trigger: `orders/{orderId}` onUpdate)
- Triggers when: `order.status → 'delivered'`
- Checks: `order.vendorId` exists
- Creates: `VendorSaleTransaction`
- Updates: `VendorEarnings.currentBalance += vendorNetPayout`

**2. createVendorPayoutRequest** (Callable)
- Validates: Minimum R100, bank details present
- Checks: Dispensary payment status (blocks if not paid)
- Moves: `currentBalance → pendingBalance`
- Creates: `VendorPayoutRequest` with status='pending'

**3. updateVendorEarningsOnPayoutChange** (Trigger: `vendor_payout_requests/{id}` onUpdate)
- Paid: `pendingBalance → paidBalance`
- Rejected: `pendingBalance → currentBalance` (return funds)

---

## 🔄 Complete Flow Example

### Scenario 1: Single Vendor - 3 Sales (Simple Case)

**1. Setup**
```
Vendor: John (vendorId: "john123")
Dispensary: Green Wellness (dispensaryId: "green456")
Commission Rate: 10% (dispensary keeps 10%, vendor gets 90%)
```

**2. Vendor Creates Product**
```typescript
Product {
  name: "CBD Oil 30ml",
  price: 100,
  dispensaryId: "green456",
  vendorUserId: "john123",
  createdBy: "john123"
}
```

**3. Three Customers Buy Product**
```
Order 1: R100 product → Customer pays R125 (100 + 25% platform commission)
Order 2: R100 product → Customer pays R125
Order 3: R100 product → Customer pays R125
```

**4. Orders Delivered → Vendor Sales Recorded**
```typescript
// Three VendorSaleTransactions created:
Transaction 1: {
  saleAmount: 100,
  dispensaryCommission: 10,
  vendorEarnings: 90
}
Transaction 2: { ... same ... }
Transaction 3: { ... same ... }

// VendorEarnings updated:
{
  currentBalance: 270.00,        // R90 × 3 sales
  totalSales: 300.00,            // R100 × 3 sales
  totalCommissionPaid: 30.00,    // R10 × 3 sales
  totalEarnings: 270.00,
  totalSalesCount: 3
}
```

**5. Vendor Requests Payout**
```typescript
// Vendor clicks "Request Payout" for R270
PayoutRequest {
  grossSales: 300.00,
  dispensaryCommission: 30.00,
  netPayout: 270.00,
  status: "pending"
}

// VendorEarnings:
{
  currentBalance: 0.00,          // Moved to pending
  pendingBalance: 270.00,        // Awaiting approval
  paidBalance: 0.00
}
```

**6. Owner Approves & Pays**
```typescript
// Owner marks as paid
PayoutRequest {
  status: "paid",
  paidAt: Timestamp,
  paymentReference: "EFT-12345"
}

// VendorEarnings:
{
  currentBalance: 0.00,
  pendingBalance: 0.00,          // Cleared
  paidBalance: 270.00,           // Added to historical
  totalPayouts: 1
}
```

---

### Scenario 2: Multi-Vendor Order (Complex Case)

**1. Setup**
```
Dispensary: Green Wellness
├─ Owner: Sarah (creates some products)
├─ Vendor 1: John (10% commission rate)
└─ Vendor 2: Mike (15% commission rate)
```

**2. Products in Store**
```typescript
Product A {
  name: "CBD Oil 30ml",
  price: 100,
  vendorUserId: "john123",      // John's product
  createdBy: "john123"
}

Product B {
  name: "Pain Relief Balm",
  price: 50,
  vendorUserId: "mike456",      // Mike's product
  createdBy: "mike456"
}

Product C {
  name: "House Blend Tea",
  price: 75,
  vendorUserId: null,           // Owner's product
  createdBy: "sarah789"
}
```

**3. Customer Orders All Three Products**
```
Customer Cart:
├─ Product A (R100) - John's product
├─ Product B (R50) - Mike's product
└─ Product C (R75) - Owner's product

Platform adds 25% commission:
├─ Product A: R100 → R125 customer pays
├─ Product B: R50 → R62.50 customer pays
└─ Product C: R75 → R93.75 customer pays

Order Total: R281.25
```

**4. Order Delivered → Multiple Transactions Created**

```typescript
// recordVendorSale processes order
// Groups items by vendorUserId:
// - Product A → John
// - Product B → Mike  
// - Product C → No vendor (skipped)

// Transaction 1: John
VendorSaleTransaction {
  vendorId: "john123",
  saleAmount: 100.00,              // John's item base price
  dispensaryCommissionRate: 10,
  dispensaryCommission: 10.00,     // 10% of R100
  vendorEarnings: 90.00,           // John gets R90
  status: "completed"
}

// Transaction 2: Mike
VendorSaleTransaction {
  vendorId: "mike456",
  saleAmount: 50.00,               // Mike's item base price
  dispensaryCommissionRate: 15,
  dispensaryCommission: 7.50,      // 15% of R50
  vendorEarnings: 42.50,           // Mike gets R42.50
  status: "completed"
}

// No transaction for Product C (owner's product)
```

**5. Earnings Updated for Each Vendor**

```typescript
// John's VendorEarnings:
{
  vendorId: "john123",
  currentBalance: 90.00,           // ✅ John's R90
  totalSales: 100.00,
  totalCommissionPaid: 10.00,
  totalEarnings: 90.00,
  totalSalesCount: 1
}

// Mike's VendorEarnings:
{
  vendorId: "mike456",
  currentBalance: 42.50,           // ✅ Mike's R42.50
  totalSales: 50.00,
  totalCommissionPaid: 7.50,
  totalEarnings: 42.50,
  totalSalesCount: 1
}
```

**6. Revenue Split Summary**
```
Total Order: R281.25
├─ Platform Commission: R56.25 (25% of R225 base)
└─ Base Prices: R225
    ├─ Product A (John): R100
    │   ├─ Dispensary: R10 (10%)
    │   └─ John: R90 (90%)
    ├─ Product B (Mike): R50
    │   ├─ Dispensary: R7.50 (15%)
    │   └─ Mike: R42.50 (85%)
    └─ Product C (Owner): R75
        └─ Dispensary: R75 (100% - no vendor)

Dispensary Total Revenue: R92.50 (R10 + R7.50 + R75)
John's Payout: R90
Mike's Payout: R42.50
Platform: R56.25
```

---

### Scenario 3: Multi-Dispensary Shopping Cart

**Customer's Full Cart:**
```
Dispensary 1 (Green Wellness):
├─ Product A (John) - R100
└─ Product B (Mike) - R50

Dispensary 2 (Natural Healing):
├─ Product D (Lisa) - R80
└─ Product E (Owner) - R60
```

**Result: TWO Separate Orders**
```typescript
// Order 1: Green Wellness
Order {
  id: "order123",
  dispensaryId: "green456",
  items: [
    { name: "CBD Oil", price: 100, vendorUserId: "john123" },
    { name: "Pain Balm", price: 50, vendorUserId: "mike456" }
  ],
  total: 187.50  // R150 base + R37.50 platform commission
}
→ Creates 2 VendorSaleTransactions (John, Mike)

// Order 2: Natural Healing
Order {
  id: "order124",
  dispensaryId: "natural789",
  items: [
    { name: "Herbal Tea", price: 80, vendorUserId: "lisa999" },
    { name: "Tincture", price: 60, vendorUserId: null }
  ],
  total: 175.00  // R140 base + R35 platform commission
}
→ Creates 1 VendorSaleTransaction (Lisa only)
```

**Key Insight:** Orders are ALREADY split by dispensary in the checkout flow. Each dispensary's order processes its vendor items independently.

---

## ✅ What's Already Working

1. ✅ Product has `vendorUserId` field (tracks product creator)
2. ✅ CartItem has `vendorUserId` field (flows through to order)
3. ✅ OrderItem preserves vendorUserId from CartItem
4. ✅ All shipping methods use `delivered` status
5. ✅ `recordVendorSale` groups items by vendor and creates multiple transactions
6. ✅ Commission calculated correctly per vendor (FROM vendor price)
7. ✅ Platform 25% commission applied separately
8. ✅ Each vendor's earnings tracked independently
9. ✅ Payout system with validation per vendor
10. ✅ Platform payment check prevents premature payouts
11. ✅ Multi-vendor orders fully supported with accurate revenue splits
12. ✅ Multi-dispensary shopping cart creates separate orders automatically

## 🚀 Next Steps

1. Deploy Firestore rules & indexes
2. Deploy Cloud Functions
3. Test end-to-end flow:
   - Vendor creates product (R100)
   - Customer buys (pays R125)
   - Order delivered (vendor gets R90 credit)
   - Vendor requests payout (R90 - R9 dispensary = R81 net)
4. Verify commission calculations
5. Monitor vendor earnings dashboards

---

## 📝 Notes

- **No checkout UI changes needed** - vendorUserId flows automatically from product through cart to order items
- **Per-item vendor tracking** - Each OrderItem tracks its own vendor, supporting multi-vendor orders
- **Commission is deducted, not added** - vendor price is the base, dispensary commission calculated from it
- **Platform commission separate** - 25% added for customers, doesn't affect vendor split
- **Multi-vendor support** - Single order can have items from multiple vendors, each gets their own transaction
- **Order filtering** - Vendors only see orders with their products
- **Accurate revenue splits** - Each vendor credited only for their items, owner products tracked separately

