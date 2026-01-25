# 🚗 Driver Marketplace Integration Strategy

## Current State Analysis

### ✅ What's Already Working

#### 1. **Dispensary Pricing Configuration**
Currently implemented in dispensary profile:
- `inHouseDeliveryPrice`: Flat rate delivery fee (optional)
- `pricePerKm`: Per-kilometer pricing (required if in-house delivery enabled)
- `deliveryRadius`: Maximum delivery distance (e.g., "5", "10", "20" km)
- `sameDayDeliveryCutoff`: Time cutoff for same-day delivery (e.g., "14:00")

**Location:** 
- `src/app/dispensary-admin/profile/page.tsx` (lines 671-775)
- `src/app/admin/dashboard/dispensaries/edit/[dispensaryId]/page.tsx`

#### 2. **Checkout Flow Integration**
Already calculates delivery fees at checkout:
- Uses dispensary coordinates + customer address
- Calculates distance with Haversine formula
- Applies flat rate OR per-km pricing
- Stores final fee in `order.shippingCost`

**Location:**
- `src/components/checkout/DispensaryShippingGroup.tsx` (lines 333-375)
- `src/hooks/use-product-pool-shipping.ts` (lines 278-295)

**Current Logic:**
```typescript
// Scenario 1: Flat fee (if set AND within radius)
if (dispensary.inHouseDeliveryPrice && distanceKm <= deliveryRadiusKm) {
  deliveryFee = dispensary.inHouseDeliveryPrice;
}
// Scenario 2: Per km pricing
else if (dispensary.pricePerKm) {
  const roundedDistance = Math.ceil(distanceKm);
  deliveryFee = dispensary.pricePerKm * roundedDistance;
}
```

#### 3. **Driver Payment Model**
Drivers receive **100% of delivery fee**:
- No platform commission on driver earnings
- Private drivers paid by dispensary
- Payment tracked in `driver_profiles.availableEarnings`

**Location:** `docs/DRIVER-PAYMENT-MODEL.md`

#### 4. **Financial Hub**
Comprehensive financial tracking:
- Revenue analytics
- Expense tracking
- Payout management
- Commission calculations

**Location:** `src/app/admin/dashboard/financial-hub/page.tsx`

---

## 🚨 Critical Gap: Public vs Private Driver Payment Split

### The Problem
Your new driver marketplace introduces **two ownership types**:

| Driver Type | Who Pays | Current Implementation | What's Needed |
|------------|----------|------------------------|---------------|
| **Private** | Dispensary | ✅ Works (dispensary manages directly) | ✅ No changes |
| **Public** | **Platform** | ❌ Not implemented | 🔧 Needs payout system |

### Why This Matters
When a **public driver** delivers an order:
1. Customer pays delivery fee to dispensary
2. Dispensary pays platform (for the order)
3. **Platform must pay public driver** (not happening yet!)

---

## 📋 Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CHECKOUT FLOW                         │
│  Customer pays R80 delivery fee → stored in order.shippingCost│
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORDER READY FOR PICKUP                    │
│              createDelivery() in driver-service.ts           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                  ┌────┴────┐
                  │ Driver? │
                  └────┬────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────┐                 ┌────▼────┐
    │ PRIVATE │                 │ PUBLIC  │
    │ DRIVER  │                 │ DRIVER  │
    └────┬────┘                 └────┬────┘
         │                           │
         │ Paid by dispensary        │ Paid by platform
         │ (existing flow)           │ (NEW FLOW)
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌──────────────────────┐
│ driver_profiles │       │ platform_driver_     │
│ .availableEar   │       │ payouts (NEW)        │
│ nings           │       │                      │
│                 │       │ - driverId           │
│ Dispensary pays │       │ - deliveryId         │
│ via manual      │       │ - orderId            │
│ transfer or     │       │ - amount             │
│ dispensary      │       │ - status: pending    │
│ payout system   │       │ - createdAt          │
└─────────────────┘       │                      │
                          │ Super Admin          │
                          │ processes via        │
                          │ Financial Hub        │
                          └──────────────────────┘
```

---

## 🔧 Implementation Plan

### Phase 1: Database Schema Enhancement

#### New Collection: `platform_driver_payouts`
```typescript
interface PlatformDriverPayout {
  id: string;
  driverId: string;
  driverName: string;
  deliveryId: string;
  orderId: string;
  dispensaryId: string; // For reference
  dispensaryName: string;
  
  // Financial details
  deliveryFee: number; // From order.shippingCost
  driverEarnings: number; // 100% of delivery fee
  currency: string; // 'ZAR'
  
  // Banking (from driver application)
  bankName: string;
  accountNumber: string;
  branchCode: string;
  
  // Status tracking
  status: 'pending' | 'processing' | 'paid' | 'failed';
  createdAt: Timestamp;
  processedAt?: Timestamp;
  paidAt?: Timestamp;
  
  // Proof & notes
  paymentReference?: string;
  proofOfPayment?: string; // Storage URL
  adminNotes?: string;
  processedBy?: string; // Super Admin userId
}
```

#### Update Existing: `driver_deliveries`
Add field to track payout:
```typescript
interface DriverDelivery {
  // ... existing fields
  ownershipType: 'private' | 'public'; // NEW
  platformPayoutId?: string; // NEW - link to platform_driver_payouts
  platformPayoutStatus?: 'pending' | 'paid'; // NEW
}
```

---

### Phase 2: Update `driver-service.ts`

#### Modify `createDelivery()` function

**File:** `src/lib/driver-service.ts`

```typescript
export async function createDelivery(
  orderId: string,
  orderData: any,
  dispensaryId: string,
  dispensaryData: any
): Promise<string> {
  try {
    // Get driver details to determine ownership type
    const driverRef = doc(db, 'driver_profiles', orderData.assignedDriverId);
    const driverSnap = await getDoc(driverRef);
    const driverData = driverSnap.data();
    
    const ownershipType = driverData?.ownershipType || 'private';

    const delivery = {
      orderId,
      dispensaryId,
      dispensaryName: dispensaryData.dispensaryName,
      driverId: orderData.assignedDriverId || null,
      driverName: orderData.assignedDriverName || '',
      ownershipType, // NEW: Track driver type
      
      // ... existing fields
      deliveryFee: orderData.shippingCost || 50,
      driverEarnings: orderData.shippingCost || 50, // 100%
      
      // Payment tracking
      platformPayoutStatus: ownershipType === 'public' ? 'pending' : undefined, // NEW
      
      // ... rest of fields
    };

    const deliveryRef = await addDoc(collection(db, 'deliveries'), delivery);
    const deliveryId = deliveryRef.id;

    // NEW: Create platform payout record for public drivers
    if (ownershipType === 'public') {
      await createPlatformDriverPayout({
        driverId: orderData.assignedDriverId,
        driverName: driverData.displayName,
        driverBanking: {
          bankName: driverData.banking?.bankName,
          accountNumber: driverData.banking?.accountNumber,
          branchCode: driverData.banking?.branchCode,
        },
        deliveryId,
        orderId,
        dispensaryId,
        dispensaryName: dispensaryData.dispensaryName,
        deliveryFee: orderData.shippingCost || 50,
        currency: dispensaryData.currency || 'ZAR',
      });
    }

    return deliveryId;
  } catch (error) {
    console.error('Error creating delivery:', error);
    throw error;
  }
}

// NEW FUNCTION
async function createPlatformDriverPayout(data: {
  driverId: string;
  driverName: string;
  driverBanking: { bankName: string; accountNumber: string; branchCode: string };
  deliveryId: string;
  orderId: string;
  dispensaryId: string;
  dispensaryName: string;
  deliveryFee: number;
  currency: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, 'platform_driver_payouts'), {
      driverId: data.driverId,
      driverName: data.driverName,
      deliveryId: data.deliveryId,
      orderId: data.orderId,
      dispensaryId: data.dispensaryId,
      dispensaryName: data.dispensaryName,
      
      deliveryFee: data.deliveryFee,
      driverEarnings: data.deliveryFee, // 100%
      currency: data.currency,
      
      bankName: data.driverBanking.bankName,
      accountNumber: data.driverBanking.accountNumber,
      branchCode: data.driverBanking.branchCode,
      
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Platform driver payout created:', data.deliveryId);
  } catch (error) {
    console.error('❌ Error creating platform payout:', error);
    throw error;
  }
}
```

---

### Phase 3: Financial Hub Enhancement

#### Add "Public Driver Payouts" Tab

**File:** `src/app/admin/dashboard/financial-hub/page.tsx`

Add new tab alongside existing ones:
- Revenue
- Expenses
- Transactions
- **→ Driver Payouts (NEW)**
- Influencer Commissions

**New Component:** `src/components/financial-hub/PublicDriverPayouts.tsx`

Features:
- List all pending public driver payouts
- Batch export for bank payment file
- Mark as paid with proof of payment upload
- Search & filter by date, driver, status
- Weekly/monthly payout cycles

```tsx
interface PublicDriverPayoutsProps {
  dateRange: { from: Date; to: Date };
}

export function PublicDriverPayouts({ dateRange }: PublicDriverPayoutsProps) {
  const [payouts, setPayouts] = useState<PlatformDriverPayout[]>([]);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  
  // Real-time listener for pending payouts
  useEffect(() => {
    const q = query(
      collection(db, 'platform_driver_payouts'),
      where('status', 'in', ['pending', 'processing']),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PlatformDriverPayout[];
      setPayouts(data);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Batch export for bank payment
  const handleExportForPayment = () => {
    const csv = generatePaymentCSV(selectedPayouts, payouts);
    downloadCSV(csv, `driver-payouts-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };
  
  // Mark as paid
  const handleMarkAsPaid = async (payoutId: string, reference: string, proofUrl: string) => {
    await updateDoc(doc(db, 'platform_driver_payouts', payoutId), {
      status: 'paid',
      paidAt: serverTimestamp(),
      paymentReference: reference,
      proofOfPayment: proofUrl,
      processedBy: currentUser.uid,
    });
    
    // Update delivery record
    const payout = payouts.find(p => p.id === payoutId);
    if (payout) {
      await updateDoc(doc(db, 'deliveries', payout.deliveryId), {
        platformPayoutStatus: 'paid',
        platformPayoutDate: serverTimestamp(),
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {payouts.filter(p => p.status === 'pending').length}
            </div>
            <p className="text-muted-foreground text-sm">
              Total: R{calculateTotal(payouts.filter(p => p.status === 'pending'))}
            </p>
          </CardContent>
        </Card>
        {/* More stats... */}
      </div>
      
      {/* Payouts table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Public Driver Payouts</CardTitle>
            <Button onClick={handleExportForPayment} disabled={selectedPayouts.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export {selectedPayouts.length} for Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Checkbox /></TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map(payout => (
                <TableRow key={payout.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedPayouts.includes(payout.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPayouts([...selectedPayouts, payout.id]);
                        } else {
                          setSelectedPayouts(selectedPayouts.filter(id => id !== payout.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>{payout.driverName}</TableCell>
                  <TableCell>#{payout.orderId.slice(-6)}</TableCell>
                  <TableCell>{format(payout.createdAt.toDate(), 'PP')}</TableCell>
                  <TableCell>R{payout.driverEarnings.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{payout.bankName}</div>
                      <div className="text-muted-foreground">
                        {payout.accountNumber} • {payout.branchCode}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      payout.status === 'pending' ? 'secondary' :
                      payout.status === 'processing' ? 'default' :
                      payout.status === 'paid' ? 'success' : 'destructive'
                    }>
                      {payout.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payout.status === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => openMarkAsPaidDialog(payout)}
                      >
                        Mark as Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Phase 4: Firestore Security Rules

**File:** `firestore.rules`

```javascript
// Platform driver payouts (Super Admin only)
match /platform_driver_payouts/{payoutId} {
  allow read: if isRole('Super Admin') || 
                (isAuthenticated() && request.auth.uid == resource.data.driverId);
  allow create: if false; // Only created programmatically
  allow update: if isRole('Super Admin');
  allow delete: if false; // Never delete, only mark as cancelled
}
```

---

### Phase 5: Driver Profile Enhancement

#### Update `driver_applications` to capture banking

Already captured in application form:
- `banking.bankName`
- `banking.accountHolderName`
- `banking.accountNumber`
- `banking.branchCode`

#### Update `driver_profiles` on approval

**File:** `src/components/super-admin/DriverApplicationsManager.tsx`

Already creating driver profile on approval, but add banking:

```typescript
await setDoc(doc(db, 'driver_profiles', userId), {
  // ... existing fields
  
  // Banking information (for public driver payouts)
  banking: {
    bankName: app.banking.bankName,
    accountHolderName: app.banking.accountHolderName,
    accountNumber: app.banking.accountNumber,
    branchCode: app.banking.branchCode,
  },
  
  // ... rest of fields
});
```

---

## 🎯 Key Benefits of This Approach

### 1. **Clear Separation of Concerns**
- Private drivers → Dispensary handles payment
- Public drivers → Platform handles payment via Financial Hub

### 2. **No Breaking Changes**
- Existing checkout flow unchanged
- Existing driver service logic enhanced (not replaced)
- Private driver workflow unaffected

### 3. **Full Audit Trail**
- Every public driver payout tracked in `platform_driver_payouts`
- Links back to delivery and order
- Proof of payment storage
- Admin notes for disputes

### 4. **Scalable Payment Processing**
- Batch export for bank transfers
- Weekly/monthly payout cycles
- Status tracking (pending → processing → paid)
- Failed payment handling

### 5. **Financial Hub Integration**
- Driver payouts appear in expense reports
- Track platform costs vs revenue
- Analytics on delivery economics
- Export for accounting

---

## 📊 Data Flow Comparison

### Current (Private Drivers)
```
Order → Delivery Created → Driver Assigned → Delivery Completed
  ↓
Dispensary manually pays driver
  ↓
Driver earnings tracked in driver_profiles.availableEarnings
```

### New (Public Drivers)
```
Order → Delivery Created → Driver Assigned → Delivery Completed
  ↓                           ↓
  ↓                    platform_driver_payouts created
  ↓                    (status: pending)
  ↓
Super Admin views Financial Hub → Driver Payouts tab
  ↓
Exports payment file or processes manually
  ↓
Marks as paid (with proof of payment)
  ↓
Driver notified, delivery.platformPayoutStatus = 'paid'
```

---

## 🚀 Rollout Strategy

### Week 1: Database & Backend
1. ✅ Create `platform_driver_payouts` collection
2. ✅ Update `driver-service.ts` with payout creation logic
3. ✅ Add banking to driver profile schema
4. ✅ Test with sample data

### Week 2: Financial Hub UI
1. ✅ Create `PublicDriverPayouts` component
2. ✅ Add tab to Financial Hub
3. ✅ Implement batch export
4. ✅ Add mark-as-paid dialog

### Week 3: Testing & Refinement
1. ✅ Test public driver signup → approval → delivery → payout
2. ✅ Verify banking details captured correctly
3. ✅ Test batch payment export
4. ✅ Verify audit trail completeness

### Week 4: Production Deployment
1. ✅ Deploy Firestore rules
2. ✅ Deploy functions (if any)
3. ✅ Deploy frontend
4. ✅ Monitor first week of payouts

---

## ⚠️ Important Considerations

### 1. **Payment Timing**
- Don't pay driver until delivery is **completed** and **confirmed**
- Consider holding period for dispute resolution (e.g., 3 days)
- Weekly batch payouts vs real-time

### 2. **Failed Delivery Handling**
- If delivery fails/cancels, don't create payout
- If payout created but delivery cancelled, mark as "cancelled"
- Add cancellation reason to payout record

### 3. **Driver Verification**
- Ensure banking details verified before first payout
- Request proof of bank account (bank statement, deposit slip)
- Store verification documents in driver profile

### 4. **Tax Compliance**
- Track annual earnings per driver
- Generate annual statements for tax purposes
- Consider contractor vs employee status

### 5. **Dispute Resolution**
- If customer disputes delivery, hold payout
- Add dispute status to payout record
- Resolution workflow in Financial Hub

---

## 💰 Financial Hub Analytics

### New Metrics to Track

1. **Driver Payout Costs**
   - Total paid to public drivers this month
   - Average payout per delivery
   - Trend analysis (growing/shrinking)

2. **Public vs Private Delivery Split**
   - % of deliveries by public drivers
   - % of deliveries by private drivers
   - Cost comparison

3. **Delivery Economics**
   - Revenue from delivery fees (kept by dispensary)
   - Cost of public driver payouts (platform expense)
   - Net delivery contribution

4. **Driver Retention**
   - Average earnings per public driver
   - Active public drivers count
   - Churn rate

---

## ✅ Checklist for Implementation

### Backend
- [ ] Create `platform_driver_payouts` collection
- [ ] Update `createDelivery()` in `driver-service.ts`
- [ ] Add `createPlatformDriverPayout()` function
- [ ] Update driver profile schema with banking
- [ ] Add banking to driver approval flow
- [ ] Update Firestore rules for payouts

### Frontend
- [ ] Create `PublicDriverPayouts.tsx` component
- [ ] Add "Driver Payouts" tab to Financial Hub
- [ ] Implement payout table with filters
- [ ] Add batch export functionality
- [ ] Create mark-as-paid dialog
- [ ] Add proof of payment upload
- [ ] Show driver banking securely (masked)

### Testing
- [ ] Test public driver signup with banking
- [ ] Test driver approval creates profile with banking
- [ ] Test order completion creates payout record
- [ ] Test Financial Hub displays payouts
- [ ] Test batch export generates correct CSV
- [ ] Test mark-as-paid updates status
- [ ] Test delivery links to payout correctly

### Documentation
- [ ] Update driver onboarding docs
- [ ] Create Super Admin payout guide
- [ ] Document payment cycles
- [ ] Add troubleshooting guide

---

## 🎬 Summary

### The Solution in One Sentence
**When a public driver completes a delivery, automatically create a payout record in `platform_driver_payouts` that Super Admins process weekly via the Financial Hub.**

### Why This Works
1. ✅ No breaking changes to existing code
2. ✅ Clear separation: private (dispensary pays) vs public (platform pays)
3. ✅ Full audit trail for compliance
4. ✅ Scales to thousands of drivers
5. ✅ Integrates with existing Financial Hub
6. ✅ Supports batch payments
7. ✅ Tracks banking securely

### Next Steps
1. Review this document
2. Approve architecture
3. Implement Phase 1 (database)
4. Build Financial Hub component
5. Test end-to-end
6. Deploy to production

---

**Ready to implement? Let's start with Phase 1! 🚀**
