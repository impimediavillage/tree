# 🚗 Driver System Evolution: Marketplace Model Proposal

## 📋 Executive Summary

Transform the current dispensary-owned driver model into a hybrid marketplace that supports:
1. **Private Drivers** - Dispensary-employed drivers (existing model)
2. **Public Drivers** - Independent drivers available to all dispensaries
3. **Priority Notification System** - Dispensary drivers get first dibs, then public pool
4. **Geo-based Matching** - Smart assignment based on location and availability

---

## 🎯 Current State Analysis

### Existing Features ✅
- Dispensaries create drivers as crew members
- Driver profiles stored in `driver_profiles` collection
- `isPublicDriver` boolean field (can toggle shared/private)
- Location fields (city, province, country)
- `deliveryRadius` field (default 10km)
- Notification system via `notifyAvailableDrivers()`
- First-come-first-served delivery claiming
- Driver verification and document management
- Earnings tracking and payout system
- Achievement/gamification system

### Current Limitations ❌
- No public driver signup flow
- Drivers must be created by dispensary admins
- No priority notification system (all drivers notified equally)
- Basic location data (city-level, no precise coordinates)
- No geolocation-based matching algorithm
- Single notification queue (no dispensary-owned vs public distinction)

---

## 🏗️ Proposed Architecture

### 1. Driver Types & Ownership Model

```typescript
export type DriverOwnershipType = 'private' | 'public' | 'shared';

export interface DriverProfile {
  // Existing fields...
  
  // NEW: Enhanced ownership model
  ownershipType: DriverOwnershipType;
  
  // For private/shared drivers
  primaryDispensaryId?: string;  // Their "home" dispensary
  
  // For shared drivers
  sharedWithDispensaries?: string[];  // Explicit list of dispensaries they serve
  
  // For public drivers (marketplace)
  isIndependent: boolean;  // True if self-registered, not created by dispensary
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedBy?: string;  // Super Admin who approved them
  approvedAt?: Timestamp;
  
  // Enhanced location
  homeLocation: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    province: string;
    country: string;
  };
  
  // Service area
  serviceRadius: number;  // km from home location
  serviceZones?: string[];  // Optional: specific city/suburb names
  
  // Availability settings
  availabilitySchedule: {
    monday: { available: boolean; startTime: string; endTime: string; };
    tuesday: { available: boolean; startTime: string; endTime: string; };
    wednesday: { available: boolean; startTime: string; endTime: string; };
    thursday: { available: boolean; startTime: string; endTime: string; };
    friday: { available: boolean; startTime: string; endTime: string; };
    saturday: { available: boolean; startTime: string; endTime: string; };
    sunday: { available: boolean; startTime: string; endTime: string; };
  };
  
  // Preferences
  preferredVehicleLoad: 'light' | 'medium' | 'heavy';  // Size of orders they prefer
  acceptsMultipleOrders: boolean;  // Can they handle multiple deliveries at once?
  
  // Financial
  commissionRate?: number;  // For public drivers (e.g., 15% of delivery fee)
  baseDeliveryFee?: number;  // Minimum fee per delivery
}
```

---

### 2. Public Driver Signup Flow

#### Step 1: Landing Page & Application
**Route:** `/driver/signup`

```typescript
// New public signup page - NO dispensary required
export default function DriverSignupPage() {
  return (
    <PublicDriverApplicationForm />
  );
}
```

**Application Form Fields:**
- Personal Information:
  - Full name
  - Email
  - Phone number with country code
  - Profile photo
  
- Location & Service Area:
  - Home address (with map picker)
  - City, Province, Country
  - Service radius (5-50km slider)
  - Preferred service zones (optional)
  
- Vehicle Information:
  - Vehicle type (dropdown)
  - Registration number
  - Color
  - Model/make
  - Upload vehicle photo
  
- Documents (Required):
  - Driver's license (front & back)
  - National ID / Passport
  - Vehicle registration papers
  - Proof of address (utility bill < 3 months old)
  - Insurance certificate (optional but recommended)
  
- Banking Information:
  - Bank name
  - Account number
  - Account holder name
  - Branch code
  
- Availability:
  - Weekly schedule (days & hours)
  - Immediate start or future date
  
- Background Check Consent:
  - Checkbox agreeing to background verification
  - Terms & conditions acceptance

#### Step 2: Admin Approval Workflow
**Route:** `/super-admin/driver-applications`

**Features:**
- List of pending driver applications
- Detailed application review screen
- Document verification tools
- Background check integration (future)
- Approve/Reject with notes
- Send notifications to applicants

```typescript
interface DriverApplication {
  id: string;
  applicantData: Partial<DriverProfile>;
  applicationDate: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
  reviewDate?: Timestamp;
}
```

#### Step 3: Driver Activation
Once approved:
1. Create Firebase Auth account (email verification required)
2. Create user document with role: 'Driver' (NOT DispensaryStaff)
3. Create driver_profile with ownershipType: 'public'
4. Send welcome email with login credentials
5. Driver can access `/driver` dashboard immediately

---

### 3. Priority Notification System

#### Current Flow (Single Queue):
```
Order Ready → Notify ALL drivers → First to claim wins
```

#### NEW Flow (Priority Tiers):
```
Order Ready 
  ↓
[TIER 1] Notify Dispensary's Own Drivers (if any)
  ↓ (wait 2 minutes)
If unclaimed:
  ↓
[TIER 2] Notify Nearby Public Drivers (geo-based)
  ↓ (wait 5 minutes)
If unclaimed:
  ↓
[TIER 3] Expand radius, notify more public drivers
  ↓
[FALLBACK] Manual assignment or customer notification
```

#### Implementation:

```typescript
/**
 * NEW: Enhanced notification system with priority tiers
 */
export async function notifyDriversWithPriority(
  dispensaryId: string,
  deliveryId: string,
  orderNumber: string,
  pickupLocation: { latitude: number; longitude: number },
  deliveryLocation: { latitude: number; longitude: number }
): Promise<void> {
  
  // TIER 1: Notify dispensary's own drivers first
  const privateDrivers = await getPrivateDriversForDispensary(dispensaryId);
  
  if (privateDrivers.length > 0) {
    await notifyDriverTier(privateDrivers, deliveryId, orderNumber, 'priority');
    
    // Wait 2 minutes for dispensary drivers to respond
    await scheduleNextTierCheck(deliveryId, 120000); // 2 minutes
    return;
  }
  
  // TIER 2: No private drivers, notify public drivers immediately
  await notifyPublicDriversNearby(
    deliveryId,
    orderNumber,
    pickupLocation,
    deliveryLocation,
    10 // Initial radius: 10km
  );
  
  // Wait 5 minutes, then expand radius
  await scheduleRadiusExpansion(deliveryId, 300000); // 5 minutes
}

/**
 * Get private drivers for specific dispensary
 */
async function getPrivateDriversForDispensary(
  dispensaryId: string
): Promise<DriverProfile[]> {
  const q = query(
    collection(db, 'driver_profiles'),
    where('ownershipType', '==', 'private'),
    where('primaryDispensaryId', '==', dispensaryId),
    where('status', '==', 'available'),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverProfile));
}

/**
 * Notify public drivers based on geolocation
 */
async function notifyPublicDriversNearby(
  deliveryId: string,
  orderNumber: string,
  pickupLocation: { latitude: number; longitude: number },
  deliveryLocation: { latitude: number; longitude: number },
  radiusKm: number
): Promise<void> {
  
  // Get all available public drivers
  const q = query(
    collection(db, 'driver_profiles'),
    where('ownershipType', '==', 'public'),
    where('status', '==', 'available'),
    where('isActive', '==', true),
    where('approvalStatus', '==', 'approved')
  );
  
  const snapshot = await getDocs(q);
  
  // Filter by distance from pickup location
  const nearbyDrivers = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as DriverProfile))
    .filter(driver => {
      const distance = calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        driver.homeLocation.latitude,
        driver.homeLocation.longitude
      );
      return distance <= Math.min(radiusKm, driver.serviceRadius);
    })
    .sort((a, b) => {
      // Sort by: 1) Rating, 2) Distance
      const distA = calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        a.homeLocation.latitude,
        a.homeLocation.longitude
      );
      const distB = calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        b.homeLocation.latitude,
        b.homeLocation.longitude
      );
      
      return (b.stats.averageRating - a.stats.averageRating) || (distA - distB);
    });
  
  // Notify drivers
  const notifications = nearbyDrivers.map(driver => 
    sendDriverNotification(driver.id, {
      type: 'new_delivery',
      title: 'New Delivery Available Nearby! 🚗',
      message: `Order #${orderNumber} - ${calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        driver.homeLocation.latitude,
        driver.homeLocation.longitude
      ).toFixed(1)}km away`,
      priority: 'high',
      deliveryId,
      actionUrl: `/driver/dashboard`,
      sound: 'notification-pop',
      animation: 'pulse',
      expiresAt: Timestamp.fromMillis(Date.now() + 1800000) // 30 minutes
    })
  );
  
  await Promise.all(notifications);
}
```

---

### 4. Geolocation & Smart Matching

#### Required Enhancements:

**A. Precise Location Capture**
```typescript
// NEW: Geolocation service
export async function updateDriverLocation(
  driverId: string,
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Timestamp;
  }
): Promise<void> {
  await updateDoc(doc(db, 'driver_profiles', driverId), {
    'currentLocation': location,
    'lastActiveAt': serverTimestamp()
  });
}

// Real-time location tracking (called every 30 seconds when driver is online)
useEffect(() => {
  if (driverStatus === 'available' && navigator.geolocation) {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateDriverLocation(driverId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Timestamp.now()
        });
      },
      (error) => console.error('Location error:', error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }
}, [driverStatus]);
```

**B. Distance-Based Filtering**
```typescript
/**
 * Enhanced distance calculation with multiple factors
 */
export function calculateDeliveryScore(
  driver: DriverProfile,
  pickupLocation: { latitude: number; longitude: number },
  deliveryLocation: { latitude: number; longitude: number },
  orderValue: number,
  urgency: 'low' | 'medium' | 'high'
): number {
  
  // Distance from driver to pickup
  const distanceToPickup = calculateDistance(
    driver.currentLocation?.latitude || driver.homeLocation.latitude,
    driver.currentLocation?.longitude || driver.homeLocation.longitude,
    pickupLocation.latitude,
    pickupLocation.longitude
  );
  
  // Driver rating (0-5)
  const rating = driver.stats.averageRating || 3.0;
  
  // Completion rate (0-1)
  const completionRate = driver.stats.completedDeliveries / 
    (driver.stats.totalDeliveries || 1);
  
  // On-time rate (0-1)
  const onTimeRate = driver.stats.onTimeDeliveryRate || 0.8;
  
  // Calculate weighted score (higher is better)
  const score = 
    (5 - distanceToPickup) * 30 +  // Distance weight (closer = better)
    rating * 20 +                   // Rating weight
    completionRate * 25 +           // Completion rate weight
    onTimeRate * 15 +               // On-time weight
    (urgency === 'high' ? 10 : 0);  // Urgency bonus
  
  return score;
}
```

**C. Service Zone Matching**
```typescript
/**
 * Check if driver services the delivery area
 */
export function isInServiceArea(
  driver: DriverProfile,
  deliveryLocation: { latitude: number; longitude: number; city: string }
): boolean {
  
  // Check distance-based radius
  const distance = calculateDistance(
    driver.homeLocation.latitude,
    driver.homeLocation.longitude,
    deliveryLocation.latitude,
    deliveryLocation.longitude
  );
  
  if (distance <= driver.serviceRadius) {
    return true;
  }
  
  // Check if delivery city is in driver's service zones
  if (driver.serviceZones && driver.serviceZones.length > 0) {
    return driver.serviceZones.some(zone => 
      deliveryLocation.city.toLowerCase().includes(zone.toLowerCase())
    );
  }
  
  return false;
}
```

---

### 5. Payment & Commission Structure

#### Private Drivers (Dispensary-Owned)
- **Salary-based or hourly**: Dispensary pays directly
- **Earnings tracked**: For transparency and performance reviews
- **No commission**: They're employees

#### Public Drivers (Marketplace)
- **Commission-based**: % of delivery fee
- **Flexible rates**: Can be configured per driver or globally
- **Instant earnings**: Added to driver wallet after completion
- **Weekly payouts**: Requested on Wednesdays (existing system)

```typescript
export interface DeliveryEarnings {
  deliveryId: string;
  driverId: string;
  orderValue: number;
  deliveryFee: number;
  driverCommission: number;  // NEW: Percentage taken by driver
  platformFee: number;       // NEW: Wellness Tree fee
  driverEarnings: number;    // Final amount to driver
  dispensaryPays: number;    // What dispensary pays total
  calculatedAt: Timestamp;
}

/**
 * Calculate driver earnings based on ownership type
 */
export function calculateDriverEarnings(
  driver: DriverProfile,
  deliveryFee: number,
  orderValue: number
): DeliveryEarnings {
  
  if (driver.ownershipType === 'private') {
    // Private drivers: All earnings go to them
    return {
      deliveryFee,
      driverCommission: 100,
      platformFee: 0,
      driverEarnings: deliveryFee,
      dispensaryPays: deliveryFee
    };
  }
  
  // Public drivers: Commission split
  const commissionRate = driver.commissionRate || 15; // Default 15%
  const platformFeeRate = 5; // Platform takes 5%
  
  const platformFee = deliveryFee * (platformFeeRate / 100);
  const netDeliveryFee = deliveryFee - platformFee;
  const driverEarnings = netDeliveryFee; // Driver gets the rest
  
  return {
    deliveryFee,
    driverCommission: commissionRate,
    platformFee,
    driverEarnings,
    dispensaryPays: deliveryFee
  };
}
```

---

### 6. User Flows

#### Flow 1: Public Driver Signs Up

```
1. Visit /driver/signup (public page)
2. Fill application form (personal, vehicle, documents)
3. Submit application
   ↓
4. Super Admin receives notification
5. Admin reviews application at /super-admin/driver-applications
6. Admin verifies documents
7. Admin approves/rejects
   ↓ (if approved)
8. Driver receives email with login credentials
9. Driver logs in, completes profile
10. Driver goes online, starts accepting deliveries
```

#### Flow 2: Order Dispatch with Priority

```
1. Customer places order with in-house delivery
2. Dispensary marks order ready for pickup
   ↓
3. System creates delivery record
4. System checks: Does dispensary have private drivers?
   
   YES ↓
   5a. Notify dispensary's drivers (priority)
   6a. Wait 2 minutes
   7a. Driver claims? → Assign delivery
   8a. No claims? → Proceed to public pool
   
   NO ↓
   5b. Notify nearby public drivers (geolocation)
   6b. First to claim gets the delivery
   7b. No claims after 5 min? → Expand radius
   8b. Still no claims? → Manual intervention
   
9. Driver picks up order
10. Driver delivers order
11. Customer rates delivery
12. Driver earns money (added to wallet)
```

#### Flow 3: Dispensary Creates Private Driver

```
1. Dispensary admin → Crew Management
2. Add Staff → Select "Driver"
3. Fill driver details
4. Choose "Private Driver" (or "Shared" if they want to allow other dispensaries)
5. Upload documents
6. Create account
   ↓
7. Driver profile created with ownershipType: 'private'
8. Driver receives welcome email
9. Driver logs in to /driver panel
10. Admin verifies documents
11. Driver can start delivering for their dispensary
```

---

### 7. Database Schema Changes

#### New Collection: `driver_applications`
```typescript
{
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dialCode: string;
    profilePhotoUrl?: string;
  };
  location: {
    address: string;
    latitude: number;
    longitude: number;
    city: string;
    province: string;
    country: string;
    serviceRadius: number;
    serviceZones?: string[];
  };
  vehicle: {
    type: VehicleType;
    make: string;
    model: string;
    year: number;
    color: string;
    registrationNumber: string;
    photoUrl: string;
  };
  documents: {
    driverLicenseFront: string;
    driverLicenseBack: string;
    idDocument: string;
    vehicleRegistration: string;
    proofOfAddress: string;
    insuranceCertificate?: string;
  };
  banking: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    branchCode: string;
  };
  availability: {
    schedule: WeeklySchedule;
    startDate: Timestamp;
  };
  applicationStatus: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
}
```

#### Enhanced Collection: `driver_profiles`
```typescript
{
  // Existing fields...
  
  // NEW FIELDS:
  ownershipType: 'private' | 'public' | 'shared';
  primaryDispensaryId?: string;
  isIndependent: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  approvedBy?: string;
  approvedAt?: Timestamp;
  
  homeLocation: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    province: string;
    country: string;
  };
  
  serviceRadius: number;
  serviceZones?: string[];
  
  availabilitySchedule: {
    monday: { available: boolean; startTime: string; endTime: string; };
    // ... other days
  };
  
  preferredVehicleLoad: 'light' | 'medium' | 'heavy';
  acceptsMultipleOrders: boolean;
  commissionRate?: number;
  baseDeliveryFee?: number;
  
  // Enhanced stats
  stats: {
    // Existing...
    lastDeliveryDate?: Timestamp;
    averagePickupTime?: number; // minutes
    averageDeliveryTime?: number; // minutes
    customerSatisfactionScore?: number; // 0-100
  };
}
```

#### New Collection: `delivery_tier_checks`
```typescript
{
  deliveryId: string;
  currentTier: 1 | 2 | 3;
  tierStartedAt: Timestamp;
  nextTierAt: Timestamp;
  notifiedDriverIds: string[];
  radius: number; // Current search radius
  status: 'pending' | 'claimed' | 'expired';
}
```

---

### 8. Firestore Security Rules

```javascript
// Public can read signup page and create applications
match /driver_applications/{applicationId} {
  allow read: if request.auth != null && 
    (request.auth.token.role == 'Super Admin' || 
     request.auth.uid == resource.data.applicantUid);
  
  allow create: if request.auth == null; // Public signup
  
  allow update: if request.auth != null && 
    request.auth.token.role == 'Super Admin';
}

// Driver profiles - enhanced permissions
match /driver_profiles/{driverId} {
  allow read: if request.auth != null && (
    request.auth.uid == driverId || // Driver themselves
    request.auth.token.role == 'Super Admin' ||
    request.auth.token.role == 'DispensaryOwner' || // Owners can see all drivers
    request.auth.token.role == 'Driver' // Drivers can see other drivers (for leaderboard)
  );
  
  allow write: if request.auth != null && (
    request.auth.uid == driverId || // Driver can update own profile
    request.auth.token.role == 'Super Admin' ||
    (request.auth.token.role == 'DispensaryOwner' && 
     resource.data.primaryDispensaryId == request.auth.token.dispensaryId)
  );
}
```

---

### 9. Cloud Functions

#### New Function: `processDriverApplication`
```typescript
/**
 * Triggered when driver application is approved
 */
export const processDriverApplication = functions.firestore
  .document('driver_applications/{applicationId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if status changed to approved
    if (before.applicationStatus !== 'approved' && after.applicationStatus === 'approved') {
      
      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email: after.personalInfo.email,
        password: generateSecurePassword(),
        displayName: `${after.personalInfo.firstName} ${after.personalInfo.lastName}`,
        emailVerified: false
      });
      
      // Create user document
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        email: after.personalInfo.email,
        displayName: userRecord.displayName,
        role: 'Driver',
        isDriver: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Create driver profile
      await admin.firestore().collection('driver_profiles').doc(userRecord.uid).set({
        userId: userRecord.uid,
        ownershipType: 'public',
        isIndependent: true,
        approvalStatus: 'approved',
        approvedBy: after.reviewedBy,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...after.personalInfo,
        ...after.location,
        ...after.vehicle,
        ...after.documents,
        ...after.banking,
        availabilitySchedule: after.availability.schedule,
        status: 'offline',
        isActive: true,
        stats: {
          totalDeliveries: 0,
          completedDeliveries: 0,
          // ... initialize stats
        }
      });
      
      // Send welcome email
      await sendDriverWelcomeEmail(after.personalInfo.email, userRecord.displayName);
      
      return;
    }
  });
```

#### Enhanced Function: `onDeliveryCreated`
```typescript
/**
 * Enhanced with priority tier system
 */
export const onDeliveryCreated = functions.firestore
  .document('driver_deliveries/{deliveryId}')
  .onCreate(async (snap, context) => {
    const delivery = snap.data();
    const deliveryId = context.params.deliveryId;
    
    // Check if dispensary has private drivers
    const privateDriversQuery = await admin.firestore()
      .collection('driver_profiles')
      .where('ownershipType', '==', 'private')
      .where('primaryDispensaryId', '==', delivery.dispensaryId)
      .where('status', '==', 'available')
      .where('isActive', '==', true)
      .get();
    
    if (!privateDriversQuery.empty) {
      // TIER 1: Notify private drivers
      await notifyPrivateDrivers(privateDriversQuery.docs, deliveryId, delivery);
      
      // Schedule tier 2 check in 2 minutes
      await admin.firestore().collection('delivery_tier_checks').doc(deliveryId).set({
        deliveryId,
        currentTier: 1,
        tierStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        nextTierAt: admin.firestore.Timestamp.fromMillis(Date.now() + 120000),
        notifiedDriverIds: privateDriversQuery.docs.map(d => d.id),
        radius: 10,
        status: 'pending'
      });
      
    } else {
      // TIER 2: Notify public drivers immediately
      await notifyPublicDriversNearby(deliveryId, delivery, 10);
      
      // Schedule radius expansion in 5 minutes
      await scheduleRadiusExpansion(deliveryId, 5);
    }
  });

/**
 * Scheduled function to check tier progression
 */
export const checkDeliveryTierProgression = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    // Get all pending tier checks that are ready for next tier
    const tierChecksQuery = await admin.firestore()
      .collection('delivery_tier_checks')
      .where('status', '==', 'pending')
      .where('nextTierAt', '<=', now)
      .get();
    
    for (const doc of tierChecksQuery.docs) {
      const tierCheck = doc.data();
      
      // Check if delivery is still unclaimed
      const deliveryDoc = await admin.firestore()
        .collection('driver_deliveries')
        .doc(tierCheck.deliveryId)
        .get();
      
      if (!deliveryDoc.exists || deliveryDoc.data().status !== 'pending') {
        // Delivery was claimed or cancelled
        await doc.ref.update({ status: 'claimed' });
        continue;
      }
      
      // Progress to next tier
      if (tierCheck.currentTier === 1) {
        // Tier 1 expired, move to tier 2 (public drivers)
        const delivery = deliveryDoc.data();
        await notifyPublicDriversNearby(tierCheck.deliveryId, delivery, 10);
        
        await doc.ref.update({
          currentTier: 2,
          tierStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          nextTierAt: admin.firestore.Timestamp.fromMillis(Date.now() + 300000), // 5 min
          radius: 10
        });
        
      } else if (tierCheck.currentTier === 2) {
        // Tier 2 expired, expand radius
        const newRadius = tierCheck.radius + 10; // Expand by 10km
        const delivery = deliveryDoc.data();
        await notifyPublicDriversNearby(tierCheck.deliveryId, delivery, newRadius);
        
        await doc.ref.update({
          currentTier: 3,
          tierStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          nextTierAt: admin.firestore.Timestamp.fromMillis(Date.now() + 600000), // 10 min
          radius: newRadius
        });
        
      } else {
        // Tier 3 expired, manual intervention needed
        await doc.ref.update({ status: 'expired' });
        
        // Send alert to dispensary and super admin
        await sendUnclaimedDeliveryAlert(tierCheck.deliveryId);
      }
    }
  });
```

---

### 10. UI Components

#### A. Public Driver Signup Form
**Route:** `/driver/signup`

Features:
- Multi-step wizard (Personal Info → Location → Vehicle → Documents → Banking)
- Map picker for home location (Google Maps / Mapbox integration)
- Real-time form validation
- Document upload with preview
- Progress indicator
- Application tracking (check status later)

#### B. Super Admin: Driver Applications Dashboard
**Route:** `/super-admin/driver-applications`

Features:
- Table view of all applications (pending/approved/rejected)
- Filter by status, date, location
- Quick actions: Approve/Reject
- Detailed review modal with document viewer
- Background check integration (future)
- Bulk actions
- Export to CSV

#### C. Dispensary Admin: Enhanced Driver Management
**Route:** `/dispensary-admin/drivers`

Features:
- Tabs: "My Drivers" | "Public Drivers" | "Shared Drivers"
- "My Drivers": Private drivers employed by dispensary
- "Public Drivers": Browse marketplace, see ratings, invite to shared pool
- "Shared Drivers": Drivers they've added to shared pool
- Driver detail view with stats, ratings, delivery history
- Toggle driver availability
- Performance analytics

#### D. Driver: Enhanced Dashboard
**Route:** `/driver/dashboard`

Features:
- **Status Toggle**: Online/Offline with location permissions
- **Delivery Queue**: Available deliveries (sorted by distance/earnings)
- **Active Delivery**: Current delivery with navigation
- **Earnings Overview**: Today/Week/Month earnings
- **Performance Stats**: Rating, on-time %, completion rate
- **Availability Calendar**: Set weekly schedule
- **Service Area Settings**: Adjust radius, add/remove zones

---

### 11. Implementation Phases

#### Phase 1: Foundation (Week 1-2)
- [ ] Update driver_profiles schema with new fields
- [ ] Create driver_applications collection
- [ ] Build public signup form (/driver/signup)
- [ ] Create application submission logic
- [ ] Build super admin approval dashboard

#### Phase 2: Notification System (Week 3-4)
- [ ] Implement priority tier logic
- [ ] Create delivery_tier_checks collection
- [ ] Build tier progression scheduler (Cloud Function)
- [ ] Enhance notification service with tiers
- [ ] Add geolocation filtering

#### Phase 3: Geolocation & Matching (Week 5-6)
- [ ] Integrate map picker for driver signup
- [ ] Implement real-time location tracking for drivers
- [ ] Build distance-based matching algorithm
- [ ] Create service area management UI
- [ ] Add radius expansion logic

#### Phase 4: Payment & Commissions (Week 7-8)
- [ ] Define commission structure
- [ ] Update earnings calculation logic
- [ ] Build commission tracking system
- [ ] Enhance payout request UI with ownership type
- [ ] Add platform fee calculations

#### Phase 5: Testing & Refinement (Week 9-10)
- [ ] End-to-end testing of priority system
- [ ] Test geolocation accuracy
- [ ] Load testing with multiple simultaneous deliveries
- [ ] UI/UX refinement
- [ ] Documentation updates

#### Phase 6: Launch & Monitoring (Week 11-12)
- [ ] Soft launch with limited public drivers
- [ ] Monitor performance metrics
- [ ] Gather feedback from drivers and dispensaries
- [ ] Bug fixes and optimizations
- [ ] Full public launch

---

### 12. Key Metrics to Track

#### Driver Metrics:
- Public vs Private driver ratio
- Average response time per tier
- Claim rate (% of deliveries claimed)
- Average distance traveled
- Earnings per driver (public vs private)
- Driver satisfaction score

#### Dispensary Metrics:
- Orders with in-house delivery
- % orders fulfilled by private drivers
- % orders fulfilled by public drivers
- Average time to driver assignment
- Customer satisfaction with delivery
- Cost per delivery (private vs public)

#### Platform Metrics:
- Total deliveries
- Average delivery time
- On-time delivery rate
- Unclaimed deliveries (needs intervention)
- Driver churn rate
- Application approval rate

---

### 13. Future Enhancements

#### A. Advanced Matching Algorithm
- Machine learning-based driver assignment
- Predictive analytics for demand forecasting
- Dynamic pricing based on demand/supply
- Multi-stop route optimization

#### B. Driver Features
- Driver referral program (earn bonus for referring drivers)
- Driver leagues (bronze/silver/gold/platinum)
- Enhanced gamification with badges
- Driver community forum
- In-app chat with customers

#### C. Dispensary Features
- Preferred driver list
- Block/favorite drivers
- Custom commission rates per driver
- Delivery insurance options
- Driver performance dashboard

#### D. Customer Features
- Track driver in real-time (live map)
- In-app chat with driver
- Tip the driver
- Favorite drivers (request specific driver)
- Delivery ETA predictions

#### E. Safety & Compliance
- Background checks integration (Checkr, Onfido)
- Real-time incident reporting
- Emergency SOS button for drivers
- Insurance verification
- Age verification for cannabis deliveries

---

## ✅ Actionable Next Steps

1. **Review & Approve Architecture**: Get stakeholder sign-off on proposed system
2. **Create Technical Spec**: Detailed implementation document for developers
3. **Design UI/UX**: Mockups for all new screens (Figma/Sketch)
4. **Set Up Project Board**: Break down tasks in Jira/GitHub Projects
5. **Assign Resources**: Allocate developers to each phase
6. **Start Phase 1**: Begin with database schema and signup form

---

## 🎯 Success Criteria

- ✅ Public drivers can sign up independently
- ✅ Dispensary drivers receive priority notifications
- ✅ Geolocation-based matching works within 1km accuracy
- ✅ 90%+ of deliveries claimed within 5 minutes
- ✅ Driver satisfaction score > 4.0/5.0
- ✅ Average delivery time reduced by 20%
- ✅ Platform can handle 1000+ concurrent drivers
- ✅ Commission tracking accurate to the cent

---

**Document Version:** 1.0  
**Created:** January 25, 2026  
**Last Updated:** January 25, 2026  
**Status:** Proposal / Awaiting Approval
