# 💰 Dispensary Payout Breakdown System

## Overview
Enhanced dispensary payout system that provides full transparency on payout composition, showing dispensary owners exactly how much is sales revenue vs. driver fees they need to pay.

## Financial Flow

```
Customer Purchase (R1000) → Platform
                               ↓
            Dispensary Requests Payout (R1000 total)
                               ↓
                    ┌──────────┴──────────┐
                    ↓                     ↓
         Sales Revenue (R780)    Driver Fees (R220)
         ├─ Keep for business    ├─ Owe to private drivers
         └─ Net profit           └─ Must pay out
```

## Key Features

### 1. **Payout Breakdown Visualization** (`PayoutBreakdownCard`)
- **Total Payout Display**: Large, prominent display of total amount
- **Visual Progress Bar**: Color-coded breakdown (Green for sales, Orange for driver fees)
- **Detailed Cards**: Side-by-side comparison with percentages
- **Action Guidance**: Clear labels ("Keep this" vs "Pay your drivers")
- **How It Works**: Educational info box explaining the flow

### 2. **Enhanced Type System**

#### Frontend (`src/types/dispensary-earnings.ts`):
```typescript
export interface DispensaryPayoutRequest {
  id: string;
  userId: string;
  dispensaryId: string;
  payoutType: 'individual' | 'combined';
  requestedAmount: number;
  
  // NEW: Payout Breakdown
  salesRevenue?: number;  // Revenue from product sales
  driverFees?: number;    // Delivery fees owed to drivers
  
  // ... rest of fields
}
```

#### Backend (`functions/src/types/dispensary-earnings.ts`):
- Same fields added for consistency

### 3. **Integration Points**

#### Dispensary Payouts Page (`/dispensary-admin/payouts`)
- Automatically shows breakdown for latest payout request
- Only displays if `salesRevenue` and `driverFees` are present
- Positioned prominently between stats and request button

#### Driver Payouts Dashboard (`/dispensary-admin/driver-payouts`)
- Shows pending driver payout requests
- Dispensary owner can see what they owe drivers
- Cross-reference with their own payout breakdown

## Usage Example

### Scenario: Dispensary receives R1000 payout

**Breakdown:**
- **Total Payout**: R1000
- **Sales Revenue**: R780 (78%)
  - ✅ Keep for business operations
  - Net profit after all costs
- **Driver Fees**: R220 (22%)
  - ⚠️ Must pay private drivers
  - Covers completed deliveries

**Visual Display:**
```
┌─────────────────────────────────────┐
│      TOTAL PAYOUT: R1000.00         │
├─────────────────────────────────────┤
│ [████████████░░░░] 78% | 22%        │
│   Green: Sales  | Orange: Drivers   │
├──────────────┬──────────────────────┤
│ Your Revenue │ Driver Fees          │
│ R780.00      │ R220.00              │
│ ✓ Keep       │ ⚠️ Pay Drivers       │
└──────────────┴──────────────────────┘
```

## Data Population

### When Creating Payout Request:
```typescript
// Cloud Function: createDispensaryPayoutRequest
const payoutData = {
  requestedAmount: total,
  salesRevenue: calculateSalesRevenue(dispensaryId, dateRange),
  driverFees: calculateDriverFeesOwed(dispensaryId, dateRange),
  // ... other fields
};
```

### Calculation Logic:
```typescript
// Sales Revenue: 75% of order totals (after platform commission)
salesRevenue = orders.reduce((sum, order) => {
  return sum + (order.subtotal * 0.75); // 75% to dispensary
}, 0);

// Driver Fees: Sum of pending/unpaid driver payouts
driverFees = driverPayoutRequests
  .filter(r => r.status === 'pending' || r.status === 'approved')
  .reduce((sum, r) => sum + r.amount, 0);
```

## Components Created

### 1. `PayoutBreakdownCard.tsx`
**Location**: `src/components/dispensary-admin/`

**Props:**
- `totalAmount: number` - Total payout amount
- `salesRevenue?: number` - Sales revenue portion
- `driverFees?: number` - Driver fees portion
- `showPercentages?: boolean` - Show percentage breakdown

**Features:**
- Animated progress bar
- Hover effects on breakdown cards
- Responsive grid layout
- Educational info box
- Color-coded sections (green/orange)

### 2. `DriverPayoutsPage.tsx`
**Location**: `src/app/dispensary-admin/driver-payouts/`

**Features:**
- Full CRUD for driver payout requests
- Approve/Reject/Mark Paid workflows
- Colorful stat cards matching advertising/analytics
- Filterable tabs (Pending/Approved/Paid/Rejected)
- Real-time Firestore data
- No placeholder data

## User Journey

### 1. Dispensary Owner Views Payouts
- Navigate to `/dispensary-admin/payouts`
- See available balance (R780 + R220 = R1000)
- Click "Request Payout"

### 2. Payout Request Created
- Platform receives request
- Calculates breakdown automatically
- Stores `salesRevenue` and `driverFees`

### 3. Owner Views Breakdown
- Sees visual breakdown card
- Understands R780 is theirs to keep
- Knows R220 must go to drivers

### 4. Owner Pays Drivers
- Navigate to `/dispensary-admin/driver-payouts`
- See pending requests totaling R220
- Approve each driver's payout
- Mark as paid after bank transfer

## Benefits

### ✅ For Dispensary Owners:
- **Transparency**: Clear understanding of cash flow
- **Planning**: Know exactly what's owed to drivers
- **Education**: Visual breakdown explains the system
- **Trust**: See where every Rand is allocated

### ✅ For Platform:
- **Fewer Support Tickets**: Self-explanatory breakdown
- **Financial Clarity**: Owners understand commission structure
- **Compliance**: Clear audit trail of payouts
- **Scalability**: Automated calculation system

### ✅ For Drivers:
- **Faster Payments**: Owners know what they owe
- **Transparency**: Owners see delivery fees collected
- **Trust**: Clear connection between payout and breakdown

## Future Enhancements

### Phase 2: Vendor Payout Analytics
- Add vendor commission tracking
- Filter sales by vendor crew member
- Vendor leaderboard and performance metrics
- Separate `vendor_payout_requests` collection

### Phase 3: Unified Financial Hub
- Single dashboard combining:
  - Driver payouts
  - Vendor payouts
  - Own earnings
  - Cash flow projections
- Visual charts and graphs
- Export to CSV/PDF

### Phase 4: Real-time Calculations
- Live breakdown updates as orders complete
- Projected payout calculations
- "What-if" scenarios for planning

## Technical Notes

### Database Collections:
- `dispensary_earnings` - Dispensary financial records
- `dispensary_payout_requests` - Payout requests with breakdown
- `driver_payout_requests` - Driver payout requests
- Orders feed into earnings calculations

### Firestore Indexes Required:
```javascript
// Already exist from previous implementation
dispensary_payout_requests: {
  userId + createdAt (descending)
}
driver_payout_requests: {
  dispensaryId + createdAt (descending)
}
```

### Security Rules:
```javascript
match /dispensary_payout_requests/{payoutId} {
  allow read: if request.auth.uid == resource.data.userId 
              || isRole('Super Admin');
  // Breakdown fields are automatically protected
}
```

## Testing Checklist

- [ ] Create payout request with breakdown
- [ ] Verify percentages add to 100%
- [ ] Check visual progress bar accuracy
- [ ] Test responsive layout on mobile
- [ ] Verify color coding (green/orange)
- [ ] Test with missing breakdown (fallback)
- [ ] Cross-check with driver payouts page
- [ ] Verify calculations match reality

## Deployment Steps

1. Deploy updated types (frontend + backend)
2. Deploy PayoutBreakdownCard component
3. Update dispensary payouts page
4. Update Cloud Function to calculate breakdown
5. Test with real data
6. Monitor for calculation errors
7. Train support team on new feature

---

**Status**: ✅ Complete and Ready for Testing
**Last Updated**: January 26, 2026
**Documentation**: This file
