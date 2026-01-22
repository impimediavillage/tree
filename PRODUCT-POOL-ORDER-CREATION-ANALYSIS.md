# Product Pool Order Creation Analysis

## Current State

### Where Orders Are Created
**File:** `src/components/dispensary-admin/ProductRequestCard.tsx`  
**Function:** `handleOwnerFinalAccept()` (lines 73-154)

**Current Collection:** `productPoolOrders` ❌  
**Desired Collection:** `orders` ✅

### Current Workflow

1. **Buyer Requests Product** → Creates document in `productRequests` collection
2. **Seller Reviews & Accepts** → Request status changes to `'accepted'`
3. **Buyer Confirms Order** → Sets `requesterConfirmed: true`
4. **Seller Finalizes** → **THIS IS WHERE THE ISSUE IS:**
   - Creates order in `productPoolOrders` collection
   - Deletes original request from `productRequests`

### Current Order Structure (Product Pool Orders)

```typescript
// Current implementation creates this:
const orderData = {
  ...request, // Spreads all ProductRequest fields
  orderDate: serverTimestamp(),
  requestStatus: 'ordered',
  
  // Shipping structure
  originLocker: sellerDispensary.originLocker || null,
  destinationLocker: request.destinationLocker || buyerDispensary.originLocker || null,
  
  // Seller address (shipping from)
  sellerDispensaryAddress: { /* full address object */ },
  
  // Buyer address (shipping to)
  buyerDispensaryAddress: { /* full address object */ },
  
  // Shipping tracking
  shippingStatus: 'pending',
  shippingProvider: null,
  trackingNumber: null,
  trackingUrl: null,
  labelUrl: null,
  accessCode: null,
};

// Saved to: productPoolOrders collection ❌
batch.set(newOrderRef, orderData);
```

---

## The Problem

### 1. **Wrong Collection**
Orders go to `productPoolOrders` instead of `orders` collection, so:
- Dispensaries can't see them in regular order management pages
- Shipping workflows don't apply
- Driver assignment doesn't work
- Order tracking is separate

### 2. **Wrong Data Structure**
`ProductRequest` structure ≠ `Order` structure

**ProductRequest has:**
```typescript
{
  productId: string;
  productName: string;
  quantityRequested: number;
  requestedTier: { unit, price, dimensions };
  requestStatus: 'pending_owner_approval' | 'accepted' | ...;
  // No pricing breakdown
  // No commission calculation
  // No OrderItem structure
}
```

**Order needs:**
```typescript
{
  orderNumber: string; // ❌ Missing
  userId: string; // ❌ Missing (buyer's userId)
  items: OrderItem[]; // ❌ Wrong structure
  status: OrderStatus; // ❌ Different enum
  total: number; // ❌ Not calculated
  
  // Pricing breakdown (for 5% commission)
  subtotal: number;
  tax: number;
  taxRate: number;
  shippingTotal: number;
  totalDispensaryEarnings: number; // Seller gets this
  totalPlatformCommission: number; // Platform gets 5%
  
  // Payment details
  paymentMethod: 'payfast';
  paymentStatus: 'pending' | 'completed' | 'failed';
  
  customerDetails: { name, email, phone };
  shippingAddress: { /* structured */ };
  shipments: { [dispensaryId]: OrderShipment };
}
```

### 3. **No 5% Commission Calculation**
The current code saves `request.requestedTier.price` directly without:
- Extracting base price
- Adding 5% commission
- Calculating platform earnings
- Creating proper `OrderItem` structure

---

## The Solution

### What Needs to Happen

#### 1. **Create Order in `orders` Collection**
```typescript
// Change from:
const newOrderRef = doc(collection(db, 'productPoolOrders'));

// To:
const newOrderRef = doc(collection(db, 'orders'));
```

#### 2. **Transform ProductRequest → Order Structure**

**Add these calculations:**
```typescript
import { calculatePriceBreakdown, PRODUCT_POOL_COMMISSION_RATE } from '@/lib/pricing';

// Calculate pricing with 5% commission
const tierPrice = request.requestedTier.price; // Seller's negotiated price
const priceBreakdown = calculatePriceBreakdown(
  tierPrice, 
  buyerDispensary.taxRate || 0, 
  true // isProductPool = true (5% commission)
);

// Create proper OrderItem
const orderItem: OrderItem = {
  productId: request.productId,
  productName: request.productName,
  dispensaryId: request.productOwnerDispensaryId,
  dispensaryName: sellerDispensary.name,
  dispensaryType: 'Product Pool',
  productType: request.productDetails?.productType || 'Other',
  quantity: request.quantityRequested,
  tier: request.requestedTier.unit,
  
  // Pricing breakdown
  price: priceBreakdown.subtotalBeforeTax, // Price customer sees (base + 5%)
  originalPrice: tierPrice,
  dispensarySetPrice: tierPrice,
  basePrice: tierPrice, // Seller receives this
  platformCommission: priceBreakdown.commission, // 5% commission
  commissionRate: PRODUCT_POOL_COMMISSION_RATE, // 0.05
  subtotalBeforeTax: priceBreakdown.subtotalBeforeTax * request.quantityRequested,
  taxAmount: priceBreakdown.tax * request.quantityRequested,
  lineTotal: priceBreakdown.finalPrice * request.quantityRequested,
  
  // Product details
  category: request.productDetails?.category || 'Unknown',
  imageUrl: request.productImage || null,
  taxRate: buyerDispensary.taxRate || 0,
};
```

#### 3. **Generate Order Number**
```typescript
// Generate unique order number
const orderNumber = `POOL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
```

#### 4. **Create Complete Order Object**
```typescript
const orderData: Order = {
  id: newOrderRef.id,
  userId: buyerDispensary.ownerId || request.requesterEmail, // Buyer's user ID
  orderNumber: orderNumber,
  items: [orderItem],
  
  // Pricing totals
  subtotal: orderItem.subtotalBeforeTax,
  tax: orderItem.taxAmount,
  taxRate: buyerDispensary.taxRate || 0,
  shippingCost: 0, // Will be calculated later with shipping selection
  shippingTotal: 0,
  total: orderItem.lineTotal,
  currency: 'ZAR',
  
  // Revenue tracking (for platform commission reports)
  totalDispensaryEarnings: tierPrice * request.quantityRequested, // Seller earns full negotiated price
  totalPlatformCommission: priceBreakdown.commission * request.quantityRequested, // Platform earns 5%
  
  // Order status
  status: 'pending', // Start as pending (not paid yet)
  orderType: 'dispensary', // Mark as dispensary order
  
  // Payment details
  paymentMethod: 'payfast',
  paymentStatus: 'pending', // Pool orders might be invoice-based
  
  // Customer details (buyer dispensary)
  customerDetails: {
    name: request.contactPerson || buyerDispensary.contactPerson || '',
    email: buyerDispensary.email || request.requesterEmail,
    phone: request.contactPhone || buyerDispensary.phone || '',
  },
  
  // Shipping address (delivery location)
  shippingAddress: {
    streetAddress: typeof request.deliveryAddress === 'object' 
      ? request.deliveryAddress.streetAddress 
      : request.deliveryAddress,
    suburb: typeof request.deliveryAddress === 'object' 
      ? request.deliveryAddress.suburb 
      : '',
    city: typeof request.deliveryAddress === 'object' 
      ? request.deliveryAddress.city 
      : buyerDispensary.city || '',
    province: typeof request.deliveryAddress === 'object' 
      ? request.deliveryAddress.province 
      : buyerDispensary.province || '',
    postalCode: typeof request.deliveryAddress === 'object' 
      ? request.deliveryAddress.postalCode 
      : buyerDispensary.postalCode || '',
    country: 'South Africa',
    latitude: typeof request.deliveryAddress === 'object' 
      ? request.deliveryAddress.latitude 
      : buyerDispensary.latitude,
    longitude: typeof request.deliveryAddress === 'object' 
      ? request.deliveryAddress.longitude 
      : buyerDispensary.longitude,
  },
  
  // Shipments (one shipment from seller to buyer)
  shipments: {
    [request.productOwnerDispensaryId]: {
      dispensaryId: request.productOwnerDispensaryId,
      items: [orderItem],
      shippingMethod: {
        provider: 'pudo', // Default, can be changed
        service: 'standard',
        rate: 0, // To be calculated
        estimatedDays: 3,
      },
      status: 'pending',
      shippingProvider: 'pudo',
      originLocker: sellerDispensary.originLocker || null,
      destinationLocker: request.destinationLocker || buyerDispensary.originLocker || null,
      statusHistory: [{
        status: 'pending',
        timestamp: serverTimestamp(),
        message: 'Order created from product pool negotiation',
      }],
    }
  },
  
  // Timestamps
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  
  // Status history
  statusHistory: [{
    status: 'pending',
    timestamp: serverTimestamp(),
    message: 'Product pool order created - awaiting payment/confirmation',
  }],
  
  // Stock tracking
  stockDeducted: false, // Will be deducted when order is paid/confirmed
};
```

---

## Key Points About 5% Commission

### How It Works

1. **Seller Sets Price:** R100 per unit (their negotiated price, tax included)
2. **Platform Adds 5%:** R100 × 0.05 = R5
3. **Buyer Pays:** R105 per unit
4. **Revenue Split:**
   - Seller receives: R100 ✅
   - Platform receives: R5 ✅

### Where It's Calculated

**File:** `src/lib/pricing.ts`

```typescript
// Line 2
export const PRODUCT_POOL_COMMISSION_RATE = 0.05; // 5%

// Lines 93-108
export function calculatePriceBreakdown(
  dispensarySetPrice: number,
  taxRate: number = 0,
  isProductPool: boolean = false
): PriceBreakdown {
  const basePrice = dispensarySetPrice;
  
  // Use 5% for pool, 25% for regular
  const commissionRate = isProductPool 
    ? PRODUCT_POOL_COMMISSION_RATE  // 0.05
    : PLATFORM_COMMISSION_RATE;      // 0.25
  
  const commission = dispensarySetPrice * commissionRate;
  const finalPrice = dispensarySetPrice + commission;
  
  return { basePrice, commission, commissionRate, finalPrice, ...};
}
```

### Already Applied In Browse Pool
The 5% is **already being shown** to buyers when browsing:

**File:** `src/app/dispensary-admin/browse-pool/page.tsx` (line 238)
```typescript
<PublicProductCard 
  product={item.product}
  tier={item.tier}
  isProductPool={true} // ✅ Triggers 5% commission
/>
```

**File:** `src/components/cards/PublicProductCard.tsx` (line 45)
```typescript
const displayPrice = getDisplayPrice(
  tier.price,         // Seller's negotiated price
  productTaxRate,
  isProductPool       // true = 5% commission
);
```

### What's Missing
The 5% calculation is **NOT applied when creating the order**. The order creation needs to:
1. Call `calculatePriceBreakdown()` with `isProductPool: true`
2. Store the breakdown in `OrderItem` structure
3. Track `totalPlatformCommission` for reporting

---

## Implementation Checklist

- [ ] **Update `handleOwnerFinalAccept()` function**
  - [ ] Change collection from `productPoolOrders` to `orders`
  - [ ] Generate unique order number
  - [ ] Calculate 5% commission using `calculatePriceBreakdown()`
  - [ ] Create proper `OrderItem` structure
  - [ ] Build complete `Order` object matching Order interface
  - [ ] Include revenue tracking fields

- [ ] **Test Order Creation**
  - [ ] Verify order appears in `orders` collection
  - [ ] Verify 5% commission is calculated correctly
  - [ ] Verify seller price is preserved
  - [ ] Verify platform commission is tracked

- [ ] **Test Order Management**
  - [ ] Seller can see order in dispensary-admin orders page
  - [ ] Seller can select shipping provider
  - [ ] Seller can assign driver (if in-house delivery)
  - [ ] Shipping status updates work
  - [ ] Buyer can track order

- [ ] **Test Stock Integration**
  - [ ] Stock is deducted when order is confirmed
  - [ ] Stock is restored if order is cancelled

---

## Files to Modify

### Primary File
- `src/components/dispensary-admin/ProductRequestCard.tsx` (lines 73-154)
  - Update `handleOwnerFinalAccept()` function

### Additional Changes Needed
- **Order Management Page:** May need to add filter/badge for pool orders
- **Shipping Selection:** Ensure pool orders can select shipping methods
- **Stock Functions:** Verify they handle Product Pool products correctly
- **Reports/Analytics:** Track 5% commission separately from 25% commission

---

## Questions to Consider

1. **Payment Status:** Should pool orders start as 'pending' or 'paid'?
   - If B2B, they might be invoice-based (pending)
   - If paid upfront, they should be 'paid'

2. **Order Numbering:** Should pool orders have different prefix?
   - Currently suggested: `POOL-{timestamp}-{random}`
   - Alternative: Regular numbering with `orderType: 'pool'` field

3. **Stock Deduction:** When should stock be deducted?
   - Option A: Immediately when order created
   - Option B: When payment confirmed
   - Option C: When seller marks as fulfilled

4. **Buyer User ID:** ProductRequest doesn't store buyer's userId
   - Need to fetch from `dispensaries` collection using `requesterDispensaryId`
   - Or use email as fallback

---

## Summary

**Problem:** Product Pool orders are created in wrong collection (`productPoolOrders`) with wrong structure (ProductRequest) and missing 5% commission calculation.

**Solution:** Transform ProductRequest → Order when seller finalizes, including:
1. Proper Order structure with OrderItem array
2. 5% commission calculation using existing `calculatePriceBreakdown()`
3. Save to `orders` collection
4. Track revenue split (seller vs platform)

**Key Files:**
- Fix: `src/components/dispensary-admin/ProductRequestCard.tsx`
- Pricing logic: `src/lib/pricing.ts` (already working)
- Order interface: `src/types/order.ts`

**Commission:** 5% already calculated in browse flow, just needs to be applied during order creation.
