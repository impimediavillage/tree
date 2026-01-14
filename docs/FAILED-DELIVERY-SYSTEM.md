# Failed Delivery System - Complete Documentation

## Overview

The Failed Delivery System provides a fair, transparent mechanism for tracking delivery failures and automatically determining driver compensation based on fault categorization.

## Core Principles

1. **Fair Compensation**: Drivers are paid when failures aren't their fault
2. **Transparency**: Clear categorization of failure reasons
3. **Accountability**: Detailed tracking and reporting
4. **Automation**: Payment logic automatically determined

---

## Failure Categories

### 1. Customer Issues (Driver Gets Paid ✅)
- **customer_no_show**: Customer didn't answer door/calls
- **customer_not_home**: Customer not present at delivery time
- **customer_refused**: Customer refused to accept delivery
- **customer_wrong_address**: Customer provided incorrect address
- **unsafe_location**: Location poses safety risk to driver

### 2. Location Issues (Driver Gets Paid ✅)
- **cannot_find_address**: Address not locatable on map/GPS
- **access_denied**: Security/gate denied driver access
- **location_inaccessible**: Road/property physically inaccessible

### 3. Driver Issues (Driver NOT Paid ❌)
- **driver_vehicle_issue**: Driver's vehicle broke down
- **driver_emergency**: Driver had personal emergency
- **driver_error**: Driver made a mistake

### 4. System Issues (Driver Gets Paid ✅)
- **system_error**: App/technical malfunction
- **other**: Other non-driver issues

---

## Type System

### DeliveryFailureReason

```typescript
export type DeliveryFailureReason =
  // Customer Issues (Driver Paid)
  | 'customer_no_show'
  | 'customer_not_home'
  | 'customer_refused'
  | 'customer_wrong_address'
  | 'unsafe_location'
  // Location Issues (Driver Paid)
  | 'cannot_find_address'
  | 'access_denied'
  | 'location_inaccessible'
  // Driver Issues (Not Paid)
  | 'driver_vehicle_issue'
  | 'driver_emergency'
  | 'driver_error'
  // Other Issues (Driver Paid)
  | 'system_error'
  | 'other';
```

### DriverDelivery Interface Updates

```typescript
interface DriverDelivery {
  // ... existing fields
  
  // Failed delivery fields
  failedAt?: Timestamp;
  failureReason?: DeliveryFailureReason;
  failureNote?: string;
  failurePhotos?: string[];
  driverPaidDespiteFailure?: boolean;
}
```

### DriverStats Updates

```typescript
interface DriverStats {
  // ... existing fields
  failedDeliveries: number; // NEW: Track total failures
}
```

---

## Payment Logic

### shouldPayDriverOnFailure()

Automatically determines if driver should be paid based on failure reason:

```typescript
export function shouldPayDriverOnFailure(reason: DeliveryFailureReason): boolean {
  const unpaidReasons: DeliveryFailureReason[] = [
    'driver_vehicle_issue',
    'driver_emergency',
    'driver_error'
  ];
  return !unpaidReasons.includes(reason);
}
```

**Result:**
- 9 reasons → Driver paid ✅
- 3 reasons → Driver not paid ❌

---

## Service Functions

### markDeliveryAsFailed()

Located in: `src/lib/driver-service.ts`

```typescript
export async function markDeliveryAsFailed(
  deliveryId: string,
  driverId: string,
  failureReason: DeliveryFailureReason,
  failureNote: string,
  failurePhotos: string[] = []
): Promise<{ success: boolean; message: string }>
```

**Automatic Actions:**

1. ✅ Sets delivery status to 'failed'
2. ✅ Records failedAt timestamp
3. ✅ Saves failure reason, note, and photos
4. ✅ Determines if driver should be paid
5. ✅ **Adds earnings to driver if paid**
6. ✅ Updates driver stats (failedDeliveries++)
7. ✅ Sets driverPaidDespiteFailure flag
8. ✅ Returns success/error message

**Example Usage:**

```typescript
const result = await markDeliveryAsFailed(
  'delivery123',
  'driver456',
  'customer_no_show',
  'Called 3 times, waited 15 minutes, no answer',
  ['photo1.jpg', 'photo2.jpg']
);

if (result.success) {
  // Payment automatically processed if applicable
  toast({ title: result.message }); 
}
```

---

## UI Components

### 1. Driver App: FailedDeliveryDialog

**Location**: `src/components/driver/FailedDeliveryDialog.tsx`

**Features:**
- Dropdown with all 13 failure reasons, grouped by category
- Color-coded groups (Customer/Location = Green, Driver = Red)
- Real-time payment preview
- Required detailed explanation textarea
- Photo upload placeholder (future feature)
- Calls markDeliveryAsFailed() service

**Usage in ActiveDeliveryCard:**

```tsx
import { FailedDeliveryDialog } from './FailedDeliveryDialog';

// Shows when status is 'en_route', 'nearby', or 'arrived'
<Button onClick={() => setShowFailedDialog(true)} variant="destructive">
  <XCircle className="w-4 h-4 mr-2" />
  Mark as Failed
</Button>

<FailedDeliveryDialog
  open={showFailedDialog}
  onOpenChange={setShowFailedDialog}
  deliveryId={currentDelivery.id}
  driverId={driverProfile.userId}
  driverEarnings={currentDelivery.driverEarnings}
  onSuccess={() => {
    onComplete();
    handleStopTracking();
  }}
/>
```

### 2. Dispensary Admin: FailedDeliveriesDashboard

**Location**: `src/components/dispensary-admin/FailedDeliveriesDashboard.tsx`

**Features:**

**Summary Cards:**
- Total failed deliveries count
- Total paid despite failure (R amount)
- Total not paid (R amount)

**Filters:**
- Failure reason dropdown (all 13 options)
- Driver filter (all drivers who had failures)
- Payment status filter (paid/not paid)

**Data Table:**
- Order number
- Driver name
- Customer name & phone
- Failure reason (color-coded badge)
- Time since failure
- Payment status badge
- Earnings amount
- View details button

**Details Dialog:**
Shows comprehensive failure info:
- Driver and customer details
- Failure timestamp
- Category-colored badge
- Payment status with explanation
- Full driver notes
- Delivery address
- Photo evidence (when available)

**Integration:**

Added as new tab in `/dispensary-admin/drivers` page:

```tsx
<TabsTrigger value="failed">
  <XCircle className="h-4 w-4 mr-1" />
  Failed
</TabsTrigger>

<TabsContent value="failed">
  <FailedDeliveriesDashboard dispensaryId={currentUser.dispensaryId} />
</TabsContent>
```

### 3. Driver Profile: Failure Stats

**Location**: `src/app/dispensary-admin/drivers/[driverId]/page.tsx`

**Display:**
- Total failed deliveries count
- Failure rate percentage calculation
- Only shows if driver has failures

```tsx
{driver.stats.failedDeliveries && driver.stats.failedDeliveries > 0 && (
  <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
    <CardHeader>
      <CardTitle>Failed Deliveries</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-red-700">
            {driver.stats.failedDeliveries}
          </p>
          <p className="text-xs text-red-600">Total failed</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-700">
            {((failedDeliveries / (completedDeliveries + failedDeliveries)) * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-orange-600">Failure rate</p>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

## Database Structure

### Firestore Collection: deliveries

```typescript
{
  id: string;
  status: 'failed';
  dispensaryId: string;
  driverId: string;
  driverName: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  driverEarnings: number;
  
  // Failure-specific fields
  failedAt: Timestamp;
  failureReason: DeliveryFailureReason;
  failureNote: string; // Required, minimum detail expected
  failurePhotos: string[]; // URLs to Firebase Storage
  driverPaidDespiteFailure: boolean; // Auto-calculated
  
  // Addresses for reference
  deliveryAddress: Address;
  pickupAddress: Address;
}
```

### Firestore Collection: drivers

```typescript
{
  userId: string;
  stats: {
    completedDeliveries: number;
    failedDeliveries: number; // NEW
    totalEarnings: number; // Includes failed-but-paid earnings
    availableEarnings: number; // Includes failed-but-paid earnings
    // ... other stats
  }
}
```

---

## Query Patterns

### Get All Failed Deliveries for Dispensary

```typescript
const q = query(
  collection(db, 'deliveries'),
  where('dispensaryId', '==', dispensaryId),
  where('status', '==', 'failed'),
  orderBy('failedAt', 'desc')
);
```

### Get Failed Deliveries by Driver

```typescript
const q = query(
  collection(db, 'deliveries'),
  where('driverId', '==', driverId),
  where('status', '==', 'failed')
);
```

### Get Paid vs Unpaid Failures

```typescript
// Paid despite failure
const paidQuery = query(
  collection(db, 'deliveries'),
  where('status', '==', 'failed'),
  where('driverPaidDespiteFailure', '==', true)
);

// Not paid
const unpaidQuery = query(
  collection(db, 'deliveries'),
  where('status', '==', 'failed'),
  where('driverPaidDespiteFailure', '==', false)
);
```

---

## User Flows

### Driver Marking Delivery as Failed

1. Driver arrives at location or attempts delivery
2. Encounters issue preventing successful delivery
3. Clicks "Mark as Failed" button (red, bottom of ActiveDeliveryCard)
4. Dialog opens with dropdown of 13 failure reasons
5. Driver selects appropriate reason
6. **Payment preview appears:**
   - Green box: "You will still be paid R60.00 - This issue was not your fault"
   - OR Red box: "Payment will not be processed - Driver-side issue"
7. Driver types detailed explanation (required)
8. Optionally adds photos (future feature)
9. Clicks "Mark as Failed" button
10. **System automatically:**
    - Records failure with all details
    - Calculates if driver should be paid
    - Adds earnings to driver if paid
    - Stops location tracking
    - Updates driver stats
11. Driver sees success toast with payment info
12. Returns to dashboard to claim new delivery

### Dispensary Admin Reviewing Failures

1. Navigate to `/dispensary-admin/drivers`
2. Click "Failed" tab (red tab with XCircle icon)
3. See summary cards:
   - Total failed deliveries
   - R amount paid despite failure
   - R amount not paid (driver issues)
4. Use filters to narrow down:
   - By failure reason
   - By driver
   - By payment status
5. Click "View Details" on any failure
6. Dialog shows:
   - Full delivery information
   - Driver's detailed explanation
   - Payment status with reason
   - Delivery address for verification
   - Photo evidence (when available)
7. Admin can contact customer if needed
8. Admin sees which drivers have high failure rates
9. Can navigate to driver profile for more stats

---

## Payment Reconciliation

### For Drivers

**Earnings Calculation:**
```
availableEarnings = completedDeliveriesEarnings + failedButPaidEarnings
```

**Payout Request:**
- Must reach R50 minimum
- Includes earnings from failed deliveries where driver was paid
- Payout history shows breakdown

### For Dispensary

**Cost Tracking:**
```
totalDriverCosts = completedDeliveriesPayments + failedButPaidPayments
```

**Failed Delivery Costs:**
- Customer issues: Dispensary absorbs cost (paid driver, refund customer)
- Location issues: Dispensary absorbs cost (paid driver, customer may retry)
- Driver issues: No cost (driver not paid)

---

## Analytics & Reporting

### Driver Performance Metrics

**Failure Rate:**
```
failureRate = (failedDeliveries / (completedDeliveries + failedDeliveries)) * 100
```

**Success Rate:**
```
successRate = (completedDeliveries / (completedDeliveries + failedDeliveries)) * 100
```

**Driver-Fault Failures:**
```typescript
const driverFaultReasons = ['driver_vehicle_issue', 'driver_emergency', 'driver_error'];
// Count failures matching these reasons
```

### Dispensary Analytics

**Most Common Failure Reasons:**
- Aggregate across all failures
- Identify patterns (e.g., many "cannot_find_address" = GPS data quality issue)

**Cost of Failed Deliveries:**
```
totalFailureCost = SUM(deliveries WHERE status='failed' AND driverPaidDespiteFailure=true)
```

**Driver Comparison:**
- Failure rate by driver
- Identify training needs
- Recognize high-performing drivers

---

## Testing Scenarios

### Test Case 1: Customer No-Show (Driver Paid)

1. Create test delivery
2. Driver claims and picks up
3. Mark as "en_route"
4. Mark as "arrived"
5. Click "Mark as Failed"
6. Select "Customer No Show"
7. See green payment preview
8. Enter note: "Rang bell 5 times, called 3 times over 10 minutes"
9. Submit
10. **Verify:**
    - Delivery status = 'failed'
    - driverPaidDespiteFailure = true
    - Driver availableEarnings increased
    - Driver failedDeliveries = 1

### Test Case 2: Driver Vehicle Issue (Not Paid)

1. Create test delivery
2. Driver claims and picks up
3. Mark as "en_route"
4. Click "Mark as Failed"
5. Select "Driver Vehicle Issue"
6. See red "Payment will not be processed" preview
7. Enter note: "Flat tire on highway"
8. Submit
9. **Verify:**
    - Delivery status = 'failed'
    - driverPaidDespiteFailure = false
    - Driver availableEarnings unchanged
    - Driver failedDeliveries = 1

### Test Case 3: Dashboard Filters

1. Create 3 failed deliveries:
   - 1 customer_no_show (paid)
   - 1 cannot_find_address (paid)
   - 1 driver_error (not paid)
2. Navigate to Failed tab
3. **Verify:**
   - Total failed = 3
   - Paid despite failure = 2 deliveries worth R amount
   - Not paid = 1 delivery worth R amount
4. Filter by "Customer No Show"
   - **Verify:** Only 1 delivery shown
5. Filter by "Driver Paid"
   - **Verify:** 2 deliveries shown

---

## Future Enhancements

### 1. Photo Upload

**Implementation Plan:**
- Firebase Storage integration
- Camera capture on mobile
- Multiple photo support
- Compression before upload

**Use Cases:**
- Closed gate/access denied
- Wrong address proof
- Safety concern documentation
- Delivery attempt evidence

### 2. Customer Dispute Resolution

**Features:**
- Customer can dispute failure reason
- Dispensary admin reviews both sides
- Adjust payment if needed
- Track dispute outcomes

### 3. Automatic Retry Logic

**Smart Retry:**
- If customer_no_show < 3pm, offer evening retry
- If access_denied, contact customer for gate code
- If cannot_find_address, GPS coordinates correction

### 4. Machine Learning Insights

**Pattern Detection:**
- Addresses with high failure rates
- Times of day with more failures
- Drivers who need training
- Customer behavior patterns

### 5. Real-time Failure Prevention

**Proactive Alerts:**
- GPS detects driver at wrong location
- Delivery time exceeded (suggest contact customer)
- Customer not responding to calls (offer SMS)

---

## Security & Privacy

### Data Access

**Drivers:**
- Can only mark their own deliveries as failed
- Can view their own failure history
- Cannot edit past failures

**Dispensary Admins:**
- View all failures for their dispensary
- Cannot modify failure records
- Can export for accounting

**System:**
- Firestore security rules enforce ownership
- Failure records are immutable after creation
- Audit trail maintained

### Personal Data

**Protected Information:**
- Customer phone numbers (encrypted)
- Driver notes (internal only)
- Delivery addresses (need-to-know)

---

## Firestore Security Rules

```javascript
match /deliveries/{deliveryId} {
  // Allow driver to create failed delivery
  allow update: if request.auth != null 
    && request.resource.data.driverId == request.auth.uid
    && request.resource.data.status == 'failed'
    && !resource.data.keys().hasAny(['failedAt']); // Prevent re-failing
    
  // Allow dispensary admin to read their failures
  allow read: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.dispensaryId == resource.data.dispensaryId
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'DispensaryOwner';
}
```

---

## Summary

The Failed Delivery System provides:

✅ **Fair Payment Logic**: Automatic determination based on fault
✅ **Transparency**: Clear categorization and tracking
✅ **Driver Protection**: Paid when not at fault
✅ **Dispensary Insights**: Analytics on failure patterns
✅ **Accountability**: Detailed records with notes and photos
✅ **Automation**: No manual payment calculations
✅ **Scalability**: Ready for thousands of deliveries
✅ **User-Friendly**: Intuitive UI for drivers and admins

**Result**: Drivers feel fairly compensated, dispensaries have data-driven insights, customers receive better service through process improvements.
