# 💰 Driver Payment Model - Correct Implementation

## Overview

Drivers receive **100% of the delivery fee** charged to customers. There is NO platform commission split on driver earnings.

---

## Payment Calculation

### Option 1: Fixed Delivery Fee

If dispensary sets `inHouseDeliveryFee` > 0:

```typescript
deliveryFee = dispensary.inHouseDeliveryFee
driverEarnings = deliveryFee // 100%
```

**Example:**
- Dispensary sets: `inHouseDeliveryFee = R60`
- Customer pays: R60 for delivery
- Driver receives: **R60** (100%)
- Platform commission: R0

---

### Option 2: Per Kilometer Pricing

If dispensary sets `pricePerKm`:

```typescript
distance = calculateDistance(dispensaryCoords, customerCoords) // in km
deliveryFee = Math.ceil(distance) * dispensary.pricePerKm
driverEarnings = deliveryFee // 100%
```

**Example:**
- Dispensary sets: `pricePerKm = R8`
- Distance: 7.3 km → rounds up to 8 km
- Delivery fee: 8 × R8 = R64
- Customer pays: R64 for delivery
- Driver receives: **R64** (100%)
- Platform commission: R0

---

## Implementation Details

### 1. Checkout Flow

**File:** `src/components/checkout/DispensaryShippingGroup.tsx`

The delivery fee is calculated during checkout based on:
1. Customer's shipping address coordinates
2. Dispensary location coordinates
3. Dispensary's pricing settings (`inHouseDeliveryFee` or `pricePerKm`)

This calculated fee is stored in the order's `shippingCost` field.

---

### 2. Delivery Creation

**File:** `src/lib/driver-service.ts` → `createDelivery()`

When order status changes to "ready_for_pickup":

```typescript
const delivery = {
  deliveryFee: orderData.shippingCost || 50,
  driverEarnings: orderData.shippingCost || 50, // 100% of delivery fee
  // No platformCommission field
};
```

---

### 3. Driver View

**File:** `src/components/driver/AvailableDeliveriesCard.tsx`

When driver views available deliveries, they see:
- Customer location
- Pickup location
- Distance
- **Driver earnings** (the full delivery fee)

```tsx
<Badge variant="default" className="bg-green-600">
  <DollarSign className="w-3 h-3 mr-1" />
  R{delivery.driverEarnings.toFixed(2)}
</Badge>
```

---

## Business Model

### Who Pays the Driver?

The **dispensary** is responsible for paying the driver their earnings.

### Payment Flow:

1. **Customer checkout:**
   - Pays order total + delivery fee
   - Money goes to dispensary

2. **Driver completes delivery:**
   - Earnings tracked in `driver_profiles.availableEarnings`
   - Accumulates over multiple deliveries

3. **Driver requests payout (Wednesdays only):**
   - Creates payout request via app
   - Includes delivery IDs and bank details

4. **Dispensary admin approves:**
   - Reviews payout request
   - Processes payment (3-5 business days)
   - Updates payout status to "paid"

---

## Payout Rules

- **Minimum payout:** R50
- **Request day:** Wednesday only
- **Processing time:** 3-5 business days
- **Transaction fee:** None (driver gets 100%)
- **Payment method:** Direct bank transfer (EFT)

---

## Key Files Updated

### Code:
1. ✅ `src/lib/driver-service.ts` - Removed 80/20 split, driver gets 100%
2. ✅ `src/types/driver.ts` - `platformCommission` is optional field

### Documentation:
1. ✅ `docs/DRIVER-DEPLOYMENT-GUIDE.md` - Updated earnings model section
2. ✅ `docs/DRIVER-PAYMENT-MODEL.md` - This file (NEW)

---

## Data Structure

### Firestore: `deliveries` collection

```typescript
{
  id: string;
  orderId: string;
  dispensaryId: string;
  driverId?: string;
  
  deliveryFee: number;          // What customer paid
  driverEarnings: number;        // = deliveryFee (100%)
  platformCommission?: number;   // Not used (can be removed)
  
  status: 'available' | 'claimed' | 'picked_up' | 'en_route' | 'delivered';
  // ... other fields
}
```

### Firestore: `driver_profiles` collection

```typescript
{
  stats: {
    totalEarnings: number;       // Lifetime earnings
    completedDeliveries: number;
  };
  availableEarnings: number;     // Can be withdrawn
  pendingPayouts: number;        // In payout requests
}
```

---

## Examples

### Scenario 1: Fixed Fee Dispensary

**Dispensary:** Green Leaf Wellness
- `inHouseDeliveryFee = R50`
- `pricePerKm = null`

**All deliveries:**
- Customer pays: R50
- Driver earns: R50
- No matter the distance (within delivery radius)

---

### Scenario 2: Per Km Dispensary

**Dispensary:** City Cannabis
- `inHouseDeliveryFee = null`
- `pricePerKm = R10`

**Delivery 1:** 3.2 km away
- Rounds to: 4 km
- Customer pays: R40
- Driver earns: R40

**Delivery 2:** 9.8 km away
- Rounds to: 10 km
- Customer pays: R100
- Driver earns: R100

---

## Summary

✅ **Driver receives 100% of delivery fee**
✅ **No platform commission on deliveries**
✅ **Dispensary pays driver directly**
✅ **Driver sees exact earnings when claiming**
✅ **Transparent pricing for all parties**

This model ensures drivers are fairly compensated for their work while keeping the payment structure simple and transparent.
