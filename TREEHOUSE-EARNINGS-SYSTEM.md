# Treehouse Earnings & Payout System

## Overview
Complete earnings and payout management system for The Wellness Tree Treehouse marketplace where creators sell AI-designed apparel via print-on-demand.

## System Architecture

### Collections Structure

#### 1. `creator_earnings/{userId}`
Tracks creator earnings and balance information.

**Fields:**
- `creatorId`: string (user ID)
- `creatorName`: string (optional)
- `creatorEmail`: string (optional)
- `currentBalance`: number (available to withdraw)
- `pendingBalance`: number (in pending payout requests)
- `totalEarned`: number (lifetime earnings)
- `totalWithdrawn`: number (total paid out)
- `lastPayoutDate`: Timestamp (last successful payout)
- `lastPayoutAmount`: number
- `accountDetails`: object (bank details)
  - `bankName`: string
  - `accountNumber`: string
  - `accountType`: string (Savings/Current/Transmission)
  - `branchCode`: string
  - `accountHolderName`: string
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### 2. `earnings_transactions/{transactionId}`
Records each earning transaction from completed orders.

**Fields:**
- `orderId`: string
- `creatorId`: string
- `creatorName`: string
- `productId`: string
- `productName`: string
- `orderAmount`: number (total order value)
- `quantity`: number
- `unitPrice`: number
- `commissionRate`: number (0.25 for 25%)
- `commissionAmount`: number (calculated earnings)
- `status`: string (pending/completed/refunded)
- `transactionDate`: Timestamp
- `createdAt`: Timestamp

#### 3. `payout_requests/{requestId}`
Manages payout request workflow.

**Fields:**
- `creatorId`: string
- `creatorName`: string
- `creatorEmail`: string (optional)
- `requestedAmount`: number
- `status`: string (pending/approved/rejected/processing/completed/failed)
- `requestDate`: Timestamp
- `processedDate`: Timestamp (when admin took action)
- `completedDate`: Timestamp (when payout completed)
- `processedBy`: string (Super Admin UID)
- `processedByName`: string
- `rejectionReason`: string (if rejected)
- `paymentMethod`: string (bank_transfer/eft/payfast)
- `paymentReference`: string (bank transaction reference)
- `accountDetails`: object (bank details)
- `creatorNotes`: string (creator's notes)
- `adminNotes`: string (admin's notes)

#### 4. `treehouse_orders/{orderId}`
Orders for Treehouse products (labeled as "TREE" in admin interface).

**Fields:**
- `orderId`: string
- `orderType`: "treehouse" (label)
- `userId`: string
- `userEmail`: string
- `userName`: string
- `creatorId`: string
- `creatorName`: string
- `productId`: string
- `productName`: string
- `productImage`: string
- `quantity`: number
- `unitPrice`: number
- `totalAmount`: number
- `creatorEarnings`: number (25% commission)
- `status`: string (pending/sent_to_print/in_production/shipped/delivered/cancelled)
- `podStatus`: string (POD-specific status)
- `shippingAddress`: object
- `trackingNumber`: string
- `estimatedDelivery`: Timestamp
- `orderDate`: Timestamp
- `updatedAt`: Timestamp
- `notes`: string (admin notes)
- `earningsRecorded`: boolean
- `earningsRecordedAt`: Timestamp

## Components

### Admin Components

#### 1. TreehouseStoresTab
**Location:** `src/components/admin/treehouse/TreehouseStoresTab.tsx`

**Features:**
- 6 stats cards: Total Stores, Active, Inactive, Total Products, Total Sales, Total Revenue
- Search & filter (all/active/inactive)
- Table with store details, creator info, stats, creation date
- View Details dialog (full store info with stats)
- Edit Store dialog (update name, nickname, description)
- Toggle active/inactive with confirmation
- Soft delete with confirmation
- View storefront (opens in new tab)
- Color-coded badges and icons
- Responsive design

#### 2. TreehouseOrdersTab
**Location:** `src/components/admin/treehouse/TreehouseOrdersTab.tsx`

**Features:**
- 7 stats cards: Total Orders, Pending, Production, Shipped, Delivered, Total Revenue, Creator Earnings
- Search & filter by status
- Labeled orders with "TREE" badge (blue)
- Table with product images, creator info, customer info, status, quantities, amounts, earnings
- View Details dialog:
  - Order type badge (TREEHOUSE ORDER)
  - Product details with image
  - Creator information (green background)
  - Customer information (blue background)
  - Shipping address (indigo background)
  - Tracking info (purple background)
  - POD status (yellow background)
  - Admin notes (amber background)
  - Timeline with dates
- Update Status dialog:
  - Status selector (6 statuses)
  - Tracking number input
  - Admin notes textarea
  - Updates order and POD status
- Color-coded status badges with icons
- POD workflow: Sent to Print → In Production → Shipped

#### 3. TreehousePayoutsTab
**Location:** `src/components/admin/treehouse/TreehousePayoutsTab.tsx`

**Features:**
- 4 stats cards: Total Requests, Pending (count + amount), Completed, Total Amount
- Filter by status (7 options)
- Table with creator info, amount, status, date, payment method, actions
- View Details dialog:
  - Bank details in grid (6 fields)
  - Creator notes
  - Rejection reason (red background)
  - Payment reference (green background)
  - Admin notes
  - Processed by info with timestamp
- Process Payout dialog:
  - Action selector (approve/reject/complete/fail)
  - Conditional inputs (rejection reason, payment reference)
  - Admin notes
  - Validation (requires rejection reason for reject, payment reference for complete)
  - Updates both payout_requests and creator_earnings on completion
- 6 status badges with color-coded icons

#### 4. TreehouseEarningsTab
**Location:** `src/components/admin/treehouse/TreehouseEarningsTab.tsx`

**Features:**
- Time range filter (7d/30d/90d/1y/all)
- 4 primary stats cards (gradient backgrounds):
  - Total Earnings Paid (emerald green)
  - Pending Earnings (yellow)
  - Active Creators (blue)
  - Average Earnings per Creator (purple)
- 3 secondary stats cards:
  - Total Revenue (teal)
  - Total Orders (orange)
  - Avg Order Value (green)
- Growth rate card with trending indicator (up/down/neutral arrow, color-coded)
- Earnings timeline chart:
  - Monthly breakdown
  - Visual bar charts (proportional to max earnings)
  - Shows orders count, creators count, earnings amount
  - Gradient green bars
- Top 10 Creators table:
  - Ranked (1st = gold, 2nd = silver, 3rd = bronze)
  - Shows creator name, products, orders, total earnings
  - Sortable by earnings

### Creator Components

#### CreatorEarningsWidget
**Location:** `src/components/dashboard/CreatorEarningsWidget.tsx`

**Features:**
- Gradient green card design
- Large balance display (R amount)
- 3 stats tiles:
  - Pending balance (yellow icon)
  - Total earned (green icon)
  - Total withdrawn (green icon)
- Last payout info card (green background)
- Request Payout button:
  - Enabled when balance >= R500
  - Disabled with tooltip when < R500
- Request Payout dialog:
  - Payout amount display
  - Bank details form (6 fields with validation)
  - Account type dropdown (Savings/Current/Transmission)
  - Optional notes field
  - Warning message about processing time
  - Pre-fills bank details if previously saved
- Payout History dialog:
  - Shows recent 5 payout requests
  - Status badges
  - Completion/rejection info
  - Payment references
- Info cards for minimum payout threshold
- History button to view all requests

## Firebase Functions

### 1. recordTreehouseEarning
**Trigger:** `onDocumentUpdated('treehouse_orders/{orderId}')`

**Flow:**
1. Triggers when order status changes to 'delivered'
2. Calculates 25% commission from order total
3. Creates earnings_transaction record
4. Updates or creates creator_earnings document
5. Increments currentBalance and totalEarned
6. Updates order with earningsRecorded flag

**Fields Updated:**
- `earnings_transactions`: Creates new document
- `creator_earnings`: Updates currentBalance, totalEarned
- `treehouse_orders`: Adds creatorEarnings, earningsRecorded fields

### 2. createPayoutRequest
**Trigger:** Callable function (called from creator dashboard)

**Validation:**
- User must be authenticated
- Minimum payout: R500
- Requires complete bank details (5 fields)
- Validates sufficient balance

**Flow:**
1. Fetches creator earnings
2. Validates balance >= R500
3. Creates payout_request with status 'pending'
4. Updates creator_earnings:
   - Sets currentBalance to 0
   - Adds requestedAmount to pendingBalance
   - Saves bank details
5. Returns success with request ID

**Parameters:**
```typescript
{
  requestedAmount: number,
  accountDetails: {
    bankName: string,
    accountNumber: string,
    accountType: string,
    branchCode: string,
    accountHolderName: string
  },
  creatorNotes?: string
}
```

### 3. processPayoutCompletion (Helper)
**Usage:** Called from TreehousePayoutsTab when admin completes payout

**Flow:**
1. Updates payout_request to 'completed'
2. Adds payment reference and processed info
3. Updates creator_earnings:
   - Reduces pendingBalance by requestedAmount
   - Adds requestedAmount to totalWithdrawn
   - Sets lastPayoutDate and lastPayoutAmount

## Firestore Security Rules

```javascript
// Creator Earnings
match /creator_earnings/{userId} {
  // Creators read own, admins read all
  allow read: if request.auth.uid == userId || isSuperAdmin();
  allow write: if isSuperAdmin();
}

// Earnings Transactions
match /earnings_transactions/{transactionId} {
  // Creators read own, admins read all
  allow read: if request.auth.uid == resource.data.creatorId || isSuperAdmin();
  allow write: if false; // Only Cloud Functions
}

// Payout Requests
match /payout_requests/{requestId} {
  // Creators read own, admins read all
  allow read: if request.auth.uid == resource.data.creatorId || isSuperAdmin();
  // Creators create own requests
  allow create: if request.auth.uid == request.resource.data.creatorId;
  // Admins update requests
  allow update: if isSuperAdmin();
  allow delete: if false;
}

// Treehouse Orders
match /treehouse_orders/{orderId} {
  // Users/creators read own, admins read all
  allow read: if request.auth.uid == resource.data.userId || 
                 request.auth.uid == resource.data.creatorId || 
                 isSuperAdmin();
  // Users create orders
  allow create: if request.auth.uid == request.resource.data.userId;
  // Admins update orders
  allow update: if isSuperAdmin();
  allow delete: if false;
}
```

## Constants

```typescript
export const MINIMUM_PAYOUT_AMOUNT = 500; // R500
export const CREATOR_COMMISSION_RATE = 0.25; // 25%
```

## Workflow Diagrams

### Order to Earnings Flow
```
1. Customer places order → treehouse_orders created (status: pending)
2. Admin updates to sent_to_print → POD starts production
3. Admin updates to in_production → Item being made
4. Admin updates to shipped → Tracking added
5. Admin updates to delivered → recordTreehouseEarning triggered
   - Creates earnings_transaction (R100 for R400 order)
   - Updates creator_earnings.currentBalance (+R100)
   - Updates creator_earnings.totalEarned (+R100)
   - Order marked with earningsRecorded: true
```

### Payout Request Flow
```
1. Creator views CreatorEarningsWidget
   - Sees currentBalance: R500+
   - Clicks "Request Payout"
   
2. Creator fills bank details
   - Bank name, account number, type, branch code, holder name
   - Optional notes
   - Submits
   
3. createPayoutRequest function executes
   - Validates balance >= R500
   - Creates payout_request (status: pending)
   - Moves R500 from currentBalance to pendingBalance
   
4. Admin views TreehousePayoutsTab
   - Sees pending request in yellow
   - Clicks "Process"
   - Selects action: approve/reject/complete
   
5. If approved → status: approved (blue)
6. If processing → status: processing (purple)
7. If completed:
   - Admin adds payment reference
   - Status: completed (green)
   - pendingBalance reduced by R500
   - totalWithdrawn increased by R500
   - lastPayoutDate set to now
   
8. Creator sees in history
   - Green badge: Completed
   - Payment reference visible
```

## Integration Points

### Admin Dashboard
Add Treehouse card to `/admin/dashboard`:
```tsx
<Card onClick={() => router.push('/admin/treehouse')}>
  <Store className="h-8 w-8 text-[#006B3E]" />
  <h3>Treehouse Management</h3>
  <p>Manage creator stores, orders, and payouts</p>
</Card>
```

### Creator Dashboard
Add earnings widget to `/dashboard/leaf`:
```tsx
import CreatorEarningsWidget from '@/components/dashboard/CreatorEarningsWidget';

<CreatorEarningsWidget userId={user.uid} userName={user.displayName} />
```

## Deployment Checklist

### 1. Deploy Firebase Functions
```bash
cd functions
npm install
firebase deploy --only functions:recordTreehouseEarning,functions:createPayoutRequest
```

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 3. Create Firestore Indexes (if needed)
- `creator_earnings` by `creatorId`
- `earnings_transactions` by `creatorId`, `transactionDate`
- `payout_requests` by `creatorId`, `status`, `requestDate`
- `treehouse_orders` by `creatorId`, `orderDate`

### 4. Test Workflow
1. Create test order in treehouse_orders
2. Update status to 'delivered'
3. Verify earnings recorded
4. Request payout as creator
5. Process payout as admin
6. Verify balance updates

## API Endpoints

### Callable Functions
```typescript
// Request payout (creator)
const createPayoutRequest = httpsCallable(functions, 'createPayoutRequest');
await createPayoutRequest({
  requestedAmount: 500,
  accountDetails: { ... },
  creatorNotes: "..."
});
```

## Error Handling

All components include:
- Try-catch blocks around Firestore operations
- Toast notifications for success/error
- Loading states during async operations
- Validation before submission
- Graceful fallbacks for missing data

## UI/UX Features

### Color Scheme
- **Green (#006B3E)**: Primary actions, positive states, earnings
- **Yellow**: Pending states, warnings
- **Blue**: Approved states, informational
- **Purple**: Processing states
- **Red**: Rejected states, errors
- **Gray**: Inactive states

### Icons
- Store: Creator stores
- Package: Products, orders
- DollarSign: Payouts, money
- TrendingUp: Earnings, growth
- Wallet: Balance, wallet
- Clock: Pending
- CheckCircle: Completed, success
- XCircle: Rejected, cancelled
- Printer: Sent to print
- Factory: In production
- Truck: Shipped

### Responsive Design
- Mobile-first approach
- Grid layouts adapt: 1 col mobile → 4 cols desktop
- Tab navigation collapses on mobile
- Tables scroll horizontally on mobile
- Dialogs use max-height with scroll

## Future Enhancements

1. **Email Notifications**
   - Order delivered (earnings added)
   - Payout approved/rejected
   - Payout completed

2. **Analytics Dashboard**
   - Earnings trends over time
   - Best-selling products
   - Creator leaderboard
   - Monthly reports

3. **Automated Payouts**
   - Scheduled payout runs (e.g., every Friday)
   - Batch processing
   - Integration with PayFast API

4. **Tax Documents**
   - Generate tax certificates
   - Annual earnings statements
   - Export to PDF

5. **Enhanced Tracking**
   - Real-time POD updates
   - SMS notifications
   - WhatsApp integration

## Support

For issues or questions:
1. Check Firestore console for data integrity
2. Review Cloud Functions logs in Firebase Console
3. Check browser console for client-side errors
4. Verify Firestore rules are deployed
5. Ensure functions are deployed and active

## Changelog

### Version 1.0.0 (Current)
- ✅ Complete earnings tracking system
- ✅ Payout request workflow
- ✅ Admin management interface (4 tabs)
- ✅ Creator dashboard widget
- ✅ Firebase Functions (recordTreehouseEarning, createPayoutRequest)
- ✅ Firestore security rules
- ✅ Labeled Treehouse orders
- ✅ POD status tracking
- ✅ Bank transfer support
- ✅ R500 minimum payout
- ✅ 25% commission rate
