# Vendor Commission System - Complete Implementation Guide

## 📋 Overview

The Vendor Commission System allows dispensaries to add Vendor crew members with configurable commission rates (5-1000%). When vendors make sales, the dispensary automatically keeps their commission percentage, and vendors receive the remainder when requesting payouts.

## 🎯 Key Features

### 1. Commission Rate Configuration
- Set when adding a Vendor crew member
- Range: 5% to 1000% (slider interface)
- Increments: 5% from 5-100%, then 10% from 100-1000%
- Stored on user document: `user.dispensaryCommissionRate`

### 2. Financial Flow

**Scenario Example:**
```
Vendor makes R1,000 sale
Commission rate: 10%

Dispensary receives: R100 (10% commission - KEEPS THIS)
Vendor receives: R900 (90% - when they request payout)
```

**For Dispensary Payout:**
```
Total Payout Request = Direct Sales + Vendor Commission Earned + Driver Fees

Example:
- Direct sales: R5,000 (dispensary's own product sales)
- Vendor commission: R200 (earned from R2,000 vendor sales @ 10%)
- Driver fees: R500 (owed to private drivers)
Total: R5,700

Breakdown shown:
✅ Keep: R5,200 (direct sales + vendor commission)
❌ Pay: R500 (driver fees)
```

**For Vendor Payout:**
```
Vendor Sales: R1,000
Dispensary Commission (10%): -R100
Net to Vendor: R900
```

## 🏗️ Architecture

### Data Models

**User Document (Vendor Crew Member):**
```typescript
{
  uid: string;
  email: string;
  role: 'DispensaryStaff';
  crewMemberType: 'Vendor';
  dispensaryId: string;
  dispensaryCommissionRate: number; // 5-1000%
  // ... other fields
}
```

**VendorPayoutRequest Document:**
```typescript
{
  id: string;
  vendorId: string;
  dispensaryId: string;
  
  // Breakdown (KEY FEATURE)
  grossSales: number; // Total vendor sales
  dispensaryCommissionRate: number; // e.g., 10%
  dispensaryCommission: number; // Amount deducted
  netPayout: number; // Amount vendor receives
  
  // Bank details
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
    accountType: 'Savings' | 'Cheque';
  };
  
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  requestedAt: Timestamp;
  // ... other fields
}
```

**Dispensary Payout Breakdown:**
```typescript
{
  // ... other payout fields
  salesRevenue: number; // Direct dispensary sales
  driverFees: number; // Owed to drivers
  vendorCommissions: number; // EARNED from vendors (dispensary keeps this)
}
```

## 📁 File Structure

### Frontend

1. **Types:**
   - `src/types/vendor-earnings.ts` - Vendor payout types
   - `src/types.ts` - Updated User interface with `dispensaryCommissionRate`

2. **Components:**
   - `src/components/dispensary-admin/DispensaryCommissionSlider.tsx` - Commission slider (5-1000%)
   - `src/components/dispensary-admin/DispensaryAddStaffDialog.tsx` - Updated to include commission field
   - `src/components/vendor/VendorPayoutRequestForm.tsx` - Vendor payout form with breakdown
   - `src/components/dispensary-admin/PayoutBreakdownCard.tsx` - 3-way breakdown visualization

3. **Pages:**
   - `src/app/dispensary-admin/users/page.tsx` - Add vendor with commission
   - `src/app/dispensary-admin/payouts/page.tsx` - Shows payout breakdown
   - TODO: `src/app/dispensary-admin/vendor-payouts/page.tsx` - Manage vendor payouts
   - TODO: `src/app/dispensary-admin/vendors/[vendorId]/page.tsx` - Vendor dashboard

### Backend

1. **Types:**
   - `functions/src/types/vendor-earnings.ts` - Cloud Functions types
   - `functions/src/types.ts` - Updated User interface

2. **Functions:**
   - `functions/src/dispensary-earnings.ts` - Updated with vendor commission logic
   - TODO: `functions/src/vendor-earnings.ts` - Vendor-specific functions

## 🔧 Implementation Status

### ✅ Completed

1. **Type System**
   - ✅ Added `dispensaryCommissionRate` to User interface (frontend & backend)
   - ✅ Created VendorPayoutRequest types with breakdown fields
   - ✅ Created VendorEarnings tracking types
   - ✅ Helper functions for commission calculation

2. **UI Components**
   - ✅ DispensaryCommissionSlider component (5-1000% with visual breakdown)
   - ✅ Updated crew member form to include commission slider for Vendors
   - ✅ VendorPayoutRequestForm with commission deduction visualization
   - ✅ Updated PayoutBreakdownCard to show 3-way split (Sales/Drivers/Vendors)

3. **Pages & Dashboards**
   - ✅ `/dispensary-admin/vendor-earnings` - Vendor-facing earnings page
     - View available/pending/paid balances
     - Commission breakdown display
     - Request payout with breakdown preview
     - Payout history with status tracking
     - Dispensary payment check (can only request when dispensary is paid)
   - ✅ `/dispensary-admin/vendor-payouts` - Owner dashboard for managing vendor payouts
     - View all vendor payout requests
     - Approve/Reject/Mark Paid workflows
     - Commission breakdown visualization
     - Filter by status (pending/approved/paid/rejected)
     - Stats cards (pending, approved, paid, active vendors)

4. **Navigation**
   - ✅ Added "My Earnings" link for Vendor crew members (vendorOnly flag)
   - ✅ Added "Vendor Payouts" link for Dispensary Owners
   - ✅ Updated filterNavItems logic to show crew-specific links
   - ✅ Driver Payouts link added for owners

5. **Security & Validation**
   - ✅ Dispensary payment check - Vendors can only request payouts after dispensary receives payment from platform
   - ✅ Same logic applies to drivers (check dispensary payout status)
   - ✅ Minimum payout validation (R100 for vendors)
   - ✅ Commission rate validation (5-1000%)
   - ✅ Role-based access control (vendorOnly, ownerOnly flags)

6. **Database**
   - ✅ Commission rate stored on user creation
   - ✅ Dispensary payout breakdown includes vendor commissions
   - ✅ Collections: `vendor_payout_requests`, `vendor_earnings`, `vendor_sale_transactions`

### 🔄 In Progress

1. **Cloud Functions**
   - Need to clarify vendor commission calculation logic:
     - Current: `calculateVendorCommissionsOwed()` sums vendor payout requests
     - Should calculate: Commission EARNED by dispensary from vendor sales
   - Need to create vendor payout request handler
   - Need to track vendor sales attribution

2. **Sales Attribution**
   - Need to track which vendor made which sale
   - Store vendorId on orders/products
   - Calculate gross sales per vendor

### ❌ TODO

1. **Sales Attribution System** (High Priority)
   - Add `vendorId` field to Order documents
   - Create `VendorSaleTransaction` collection
   - Cloud Function: Track sales when order is delivered
   - Aggregate to VendorEarnings document
   - Update vendor's currentBalance on sale completion

2. **Cloud Functions** (High Priority)
   - `createVendorPayoutRequest()` - Creates payout with breakdown
   - `approveVendorPayout()` - Admin approval (move to pendingBalance)
   - `markVendorPayoutPaid()` - Mark complete with reference (move to paidBalance)
   - `recordVendorSale()` - Track sales attribution on order delivery
   - `calculateVendorEarnings()` - Aggregate sales & commission
   - Update `calculateVendorCommissionsOwed()` - Calculate from VendorSaleTransaction, not requests

3. **Firestore Rules** (Medium Priority)
```javascript
// Vendor payout requests
match /vendor_payout_requests/{payoutId} {
  allow read: if isAuthenticated() && 
    (request.auth.uid == resource.data.vendorId || isRole('DispensaryOwner'));
  allow create: if isAuthenticated() && 
    request.auth.uid == request.resource.data.vendorId &&
    isRole('DispensaryStaff') &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.crewMemberType == 'Vendor';
  allow update: if isRole('DispensaryOwner') && 
    resource.data.dispensaryId == getUserDispensaryId();
}

// Vendor earnings
match /vendor_earnings/{vendorId} {
  allow read: if isAuthenticated() && 
    (request.auth.uid == vendorId || isRole('DispensaryOwner'));
  allow write: if false; // Only Cloud Functions can write
}

// Vendor sale transactions
match /vendor_sale_transactions/{transactionId} {
  allow read: if isAuthenticated() && 
    (request.auth.uid == resource.data.vendorId || isRole('DispensaryOwner'));
  allow write: if false; // Only Cloud Functions can write
}
```

4. **Testing & Polish** (Low Priority)
   - Test complete vendor payout flow end-to-end
   - Test commission calculations with various rates
   - Test dispensary payment check logic
   - Add loading states and error handling
   - Mobile responsive testing

## 📊 Logic Clarification

### Dispensary Commission Calculation

**Current Issue:** The `calculateVendorCommissionsOwed()` function calculates what vendors are OWED (their net payout). But for dispensary payout breakdown, we need to show commission EARNED by dispensary.

**Solution:**

```typescript
// Option 1: Calculate from vendor payout requests (CURRENT)
// Shows: What vendors are requesting (their net after commission)
async function calculateVendorPayoutsOwed(dispensaryId: string): Promise<number> {
  // Sum netPayout from all pending/approved vendor_payout_requests
  // This is what dispensary will PAY to vendors
}

// Option 2: Calculate from sales attribution (CORRECT FOR COMMISSION EARNED)
async function calculateVendorCommissionEarned(dispensaryId: string): Promise<number> {
  // Sum all vendor sales and calculate commission
  // Example: R10,000 vendor sales @ 10% = R1,000 commission earned
  
  const vendorSales = await getVendorSalesTotal(dispensaryId);
  const commissionEarned = vendorSales.reduce((total, sale) => {
    return total + (sale.amount * sale.vendorCommissionRate / 100);
  }, 0);
  
  return commissionEarned;
}
```

**Recommendation:** Use sales attribution for accurate tracking:
1. Track vendorId on every order/sale
2. Store commission rate at time of sale
3. Calculate commission earned by dispensary
4. Show in dispensary payout breakdown
5. When vendor requests payout, deduct commission from their gross sales

## 🚀 Next Steps

### Priority 1: Sales Attribution System
1. Add `vendorId` field to Order documents
2. Create `VendorSaleTransaction` collection
3. Cloud Function: Track sales when order is delivered
4. Aggregate to `VendorEarnings` document

### Priority 2: Vendor Earnings Tracking
1. Create `vendor_earnings` collection
2. Update balances on sale completion
3. Move to pending on payout request
4. Move to paid on payout completion

### Priority 3: Vendor Payout Dashboard
1. Create `/dispensary-admin/vendor-payouts/page.tsx`
2. Show all vendor payout requests with breakdown
3. Approve/Reject/Mark Paid workflows
4. Display commission deduction clearly

### Priority 4: Vendor Dashboard
1. Create `/dispensary-admin/vendors/[vendorId]/page.tsx`
2. Sales history with commission breakdown
3. Earnings tracking (available/pending/paid)
4. Payout request form integration

### Priority 5: Testing & Documentation
1. Test commission calculation accuracy
2. Test payout flow end-to-end
3. Update user documentation
4. Create admin training guide

## 📝 Example Flows

### Flow 1: Adding a Vendor
```
1. Dispensary admin goes to /dispensary-admin/users
2. Clicks "Add Crew Member"
3. Selects "Vendor" as crew type
4. Commission slider appears (defaults to 10%)
5. Adjusts to 15%
6. Fills in other details
7. Submits
8. User created with dispensaryCommissionRate: 15
9. Vendor can now login and create products
```

### Flow 2: Vendor Makes Sales
```
1. Customer buys vendor's product (R1,000)
2. Order delivered
3. VendorSaleTransaction created:
   - grossSales: R1,000
   - commissionRate: 15%
   - dispensaryCommission: R150
   - vendorEarnings: R850
4. VendorEarnings updated:
   - currentBalance += R850
5. DispensaryEarnings updated:
   - currentBalance += R150
```

### Flow 3: Dispensary Requests Payout
```
1. Dispensary has:
   - Direct sales: R5,000
   - Vendor commission earned: R150
   - Driver fees owed: R300
2. Requests payout for R5,150 available
3. Breakdown shown:
   - Sales: R5,150 (Keep: R5,000 direct + R150 vendor commission)
   - Drivers: R300 (Pay to drivers)
4. Total payout: R5,450 (must pay drivers R300 out of this)
```

### Flow 4: Vendor Requests Payout
```
1. Vendor has R850 available balance
2. Clicks "Request Payout"
3. Sees breakdown:
   - Gross Sales: R850 (this is net, already deducted)
   - Commission (15%): Already deducted
   - Net Payout: R850
4. Fills bank details
5. Submits
6. Dispensary admin reviews and approves
7. Vendor receives R850
```

## 🔐 Security Considerations

1. **Commission Rate Validation**
   - Min: 5%
   - Max: 1000%
   - Only dispensary owners can set/change rates
   - Rate stored at sale time (immutable)

2. **Payout Request Validation**
   - Vendor can only request up to currentBalance
   - Must be DispensaryStaff with crewMemberType='Vendor'
   - Cannot modify commission rate in request
   - Commission calculated server-side

3. **Sales Attribution**
   - VendorId verified against user document
   - Commission rate pulled from user at sale time
   - Cannot retroactively change commission

## 📈 Analytics & Reporting

**Metrics to Track:**
- Total vendor sales (gross)
- Total commission earned by dispensary
- Total commission paid to vendors
- Average commission rate
- Top earning vendors
- Commission trends over time

**Dashboard Views:**
- Dispensary: Commission earned from all vendors
- Vendor: Sales & earnings with commission breakdown
- Super Admin: Platform-wide commission statistics

---

**Status:** In Progress
**Last Updated:** January 2026
**Next Review:** After sales attribution implementation
