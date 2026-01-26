# Cloud Function Update - Payout Breakdown Calculation

## Changes Made

### File: `functions/src/dispensary-earnings.ts`

#### 1. Added Helper Functions

**`calculateSalesRevenue()`**
- Fetches the user's `dispensary_earnings` record
- Returns `currentBalance` which represents accumulated sales commission
- This is the amount the dispensary keeps (their net revenue)

```typescript
async function calculateSalesRevenue(
  db: admin.firestore.Firestore,
  dispensaryId: string,
  userId: string
): Promise<number>
```

**`calculateDriverFeesOwed()`**
- Queries `driver_payout_requests` collection
- Filters by dispensaryId and status ('pending' or 'approved')
- Sums up all amounts that haven't been paid yet
- This represents delivery fees owed to private drivers

```typescript
async function calculateDriverFeesOwed(
  db: admin.firestore.Firestore,
  dispensaryId: string
): Promise<number>
```

#### 2. Updated Individual Payout Creation

**Before:**
```typescript
const payoutRequest: any = {
  userId,
  dispensaryId,
  payoutType: 'individual',
  requestedAmount,
  status: 'pending',
  accountDetails,
  // ...
};
```

**After:**
```typescript
// Calculate breakdown
const salesRevenue = await calculateSalesRevenue(db, dispensaryId, userId);
const driverFees = await calculateDriverFeesOwed(db, dispensaryId);

const payoutRequest: any = {
  userId,
  dispensaryId,
  payoutType: 'individual',
  requestedAmount,
  salesRevenue,  // NEW: Product sales commission
  driverFees,    // NEW: Delivery fees owed to drivers
  status: 'pending',
  accountDetails,
  // ...
};
```

#### 3. Updated Combined Payout Creation

**Before:**
```typescript
const payoutRequest: any = {
  userId,
  dispensaryId,
  payoutType: 'combined',
  requestedAmount,
  staffIncluded,
  staffBreakdown,
  // ...
};
```

**After:**
```typescript
// Calculate breakdown
const salesRevenue = totalAvailable; // Combined staff earnings
const driverFees = await calculateDriverFeesOwed(db, dispensaryId);

const payoutRequest: any = {
  userId,
  dispensaryId,
  payoutType: 'combined',
  requestedAmount,
  salesRevenue,  // NEW: Combined staff revenue
  driverFees,    // NEW: Driver fees owed
  staffIncluded,
  staffBreakdown,
  // ...
};
```

## How It Works

### Flow Diagram

```
Dispensary Requests Payout
         ↓
Cloud Function Triggered
         ↓
    ┌────┴────┐
    ↓         ↓
Calculate   Calculate
Sales       Driver
Revenue     Fees
    ↓         ↓
    └────┬────┘
         ↓
   Store in Firestore
   (payout request doc)
         ↓
Frontend reads breakdown
         ↓
Display visual breakdown
```

### Calculation Logic

**Sales Revenue:**
- Represents: Product sales commission (dispensary's share)
- Source: `dispensary_earnings.currentBalance`
- Accumulated from: `recordDispensaryEarning` function on order delivery
- Formula: 75% of order subtotal (or configured commission rate)

**Driver Fees:**
- Represents: Delivery fees owed to private drivers
- Source: `driver_payout_requests` collection
- Query: `where dispensaryId == X AND status IN ['pending', 'approved']`
- Calculation: Sum of all unpaid driver payout amounts

### Example Calculation

**Scenario:**
- Dispensary has R1000 in `currentBalance` (from sales)
- Has 3 pending driver payouts: R100, R80, R40 = R220 total
- Requests full payout of R1000

**Result:**
```javascript
{
  requestedAmount: 1000,
  salesRevenue: 1000,    // From currentBalance
  driverFees: 220,       // Sum of pending driver payouts
}
```

**Frontend Display:**
- Total: R1000
- Sales (Keep): R1000 (but R220 must go to drivers)
- Driver Fees (Owe): R220
- Net After Drivers: R780

## Testing Steps

### 1. Create Test Data

```javascript
// In Firebase Console or Admin SDK

// 1. Create dispensary earnings
await db.collection('dispensary_earnings').doc(userId).set({
  userId: 'user123',
  dispensaryId: 'disp456',
  currentBalance: 1000,
  pendingBalance: 0,
  totalEarned: 5000,
  totalWithdrawn: 4000,
  role: 'dispensary-admin',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
});

// 2. Create pending driver payouts
await db.collection('driver_payout_requests').add({
  driverId: 'driver789',
  driverName: 'John Driver',
  dispensaryId: 'disp456',
  amount: 100,
  status: 'pending',
  requestedAt: Timestamp.now()
});

await db.collection('driver_payout_requests').add({
  driverId: 'driver790',
  driverName: 'Jane Driver',
  dispensaryId: 'disp456',
  amount: 120,
  status: 'approved',
  requestedAt: Timestamp.now()
});
```

### 2. Request Payout (Frontend)

Navigate to `/dispensary-admin/payouts` and request a payout.

### 3. Verify Breakdown

Check Firestore document:
```javascript
const payout = await db.collection('dispensary_payout_requests')
  .doc(payoutId)
  .get();

console.log(payout.data());
// Should include:
// {
//   requestedAmount: 1000,
//   salesRevenue: 1000,
//   driverFees: 220,
//   ...
// }
```

### 4. Verify Frontend Display

The `PayoutBreakdownCard` should automatically render with:
- Visual progress bar showing 78% sales / 22% drivers
- Two cards showing R1000 sales and R220 driver fees
- Educational text explaining the breakdown

## Deployment

### 1. Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions:createDispensaryPayoutRequest
```

### 2. Monitor Logs

```bash
firebase functions:log --only createDispensaryPayoutRequest
```

### 3. Test End-to-End

1. Create test dispensary with earnings
2. Create test driver payout requests
3. Request payout from frontend
4. Verify breakdown appears correctly
5. Check Firestore document has breakdown fields

## Error Handling

### If `salesRevenue` is 0:
- User has no earnings accumulated
- Check `recordDispensaryEarning` is triggering on order delivery
- Verify `dispensary_earnings` document exists

### If `driverFees` is 0:
- No pending driver payouts for this dispensary
- This is normal if no drivers have requested payouts
- Or all driver payouts are already marked as 'paid'

### If breakdown doesn't display:
- Check Firestore document has both fields
- Verify `PayoutBreakdownCard` is imported correctly
- Check console for React errors
- Ensure payout request has data (not loading state)

## Future Enhancements

### Phase 2: Historical Breakdown
- Store breakdown for each payout
- Show breakdown history over time
- Compare current vs previous payouts

### Phase 3: Predictive Breakdown
- Calculate projected breakdown before requesting
- Show "if you request now, you'll get..." preview
- Update in real-time as orders complete

### Phase 4: Detailed Itemization
- Break down sales by product category
- Show driver fees per driver
- Export detailed CSV reports

## Related Files

- **Frontend Types**: `src/types/dispensary-earnings.ts`
- **Backend Types**: `functions/src/types/dispensary-earnings.ts`
- **Component**: `src/components/dispensary-admin/PayoutBreakdownCard.tsx`
- **Page**: `src/app/dispensary-admin/payouts/page.tsx`
- **Driver Dashboard**: `src/app/dispensary-admin/driver-payouts/page.tsx`

---

**Status**: ✅ Complete
**Updated**: January 26, 2026
