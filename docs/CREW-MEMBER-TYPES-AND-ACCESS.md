# Crew Member Types & Dashboard Access

## Overview
When a Dispensary Owner adds crew members through the Dispensary Admin panel, they can assign one of three sub-types of crew members, each with different dashboard access and usage permissions.

---

## Crew Member Types

### 1. **Vendor** (`crewMemberType: 'Vendor'`)

#### Purpose
External product suppliers who sell through your dispensary but maintain their own inventory.

#### Dashboard Access
- ✅ **Products** - Can create, edit, and manage ONLY their own products
- ✅ **Orders** - Can view and manage ONLY orders containing their products
- ✅ **Analytics** - Can view analytics for their own products
- ✅ **Payouts** - Can view their commission/earnings
- ✅ **Profile** - Can update their own profile
- ✅ **Notifications** - Can receive notifications
- ❌ **Store Settings** - No access
- ❌ **Users/Crew Management** - No access
- ❌ **Dispensary Settings** - No access
- ❌ **Browse Pool** - No access
- ❌ **Advertising** - No access
- ❌ **Social Share** - No access

#### Special Features
- Products they create are tagged with their `vendorUserId`
- Can only manage products where `product.createdBy == user.uid` OR `product.vendorUserId == user.uid`
- Commission structure tracks their sales separately
- Welcome email sent with login credentials and vendor-specific instructions

#### Technical Implementation
```typescript
{
  role: 'DispensaryStaff',
  crewMemberType: 'Vendor',
  dispensaryId: '[dispensary-id]',
  isDriver: false
}
```

---

### 2. **Driver** (`crewMemberType: 'Driver'`)

#### Purpose
Delivery personnel who handle order fulfillment and transportation.

#### Dashboard Access
**Drivers are REDIRECTED to dedicated Driver Panel** (`/driver`)
- ❌ No access to Dispensary Admin panel
- ✅ Full access to Driver-specific dashboard with:
  - Delivery queue
  - Active deliveries
  - Delivery history
  - Earnings tracking
  - Profile/vehicle management
  - Real-time navigation
  - Failed delivery reporting

#### Required Information
When adding a driver, the following is collected:
- **Personal Info**: Display name, email, password
- **Contact**: Phone number with dial code (e.g., +27)
- **Location**: City, Province, Country
- **Vehicle Details**:
  - Type (bicycle, e-bike, motorcycle, car, bakkie, truck)
  - Registration number
  - Color
  - Description
- **Documents** (uploaded and stored):
  - Driver's License (image)
  - ID Document (image)
  - Vehicle Photo (image)
- **Delivery Settings**:
  - Delivery radius (default 10km)
  - Public/Private driver status

#### Driver Profile Structure
Stored in `driver_profiles` collection:
```typescript
{
  userId: string,
  dispensaryId: string,
  displayName: string,
  phoneNumber: string,
  dialCode: string,
  city: string,
  province: string,
  country: string,
  deliveryRadius: number, // km
  isPublicDriver: boolean,
  vehicle: {
    type: VehicleType,
    registrationNumber: string,
    color: string,
    description: string,
    imageUrl: string,
    verified: boolean
  },
  documents: {
    driverLicense: { url, uploadedAt, verified },
    idDocument: { url, uploadedAt, verified },
    vehiclePhoto: { url, uploadedAt, verified }
  },
  status: 'online' | 'offline',
  isActive: boolean,
  stats: {
    totalDeliveries: number,
    completedDeliveries: number,
    cancelledDeliveries: number,
    failedDeliveries: number,
    averageRating: number,
    totalRatings: number,
    totalEarnings: number,
    onTimeDeliveryRate: number,
    acceptanceRate: number,
    currentStreak: number,
    longestStreak: number
  },
  achievements: [],
  availableEarnings: number,
  pendingPayouts: number
}
```

#### Technical Implementation
```typescript
{
  role: 'DispensaryStaff',
  crewMemberType: 'Driver',
  dispensaryId: '[dispensary-id]',
  isDriver: true,
  driverProfile: { /* vehicle, documents, etc */ }
}
```

---

### 3. **In-House Staff** (`crewMemberType: 'In-house Staff'`)

#### Purpose
Internal team members who help manage the dispensary's day-to-day operations.

#### Dashboard Access
In-house staff have FULL ACCESS to almost everything except owner-only features:
- ✅ **Dashboard** - Full analytics overview
- ✅ **Products** - Can manage ALL products (not just their own)
- ✅ **Orders** - Can view and manage ALL orders
- ✅ **Customers** - Can view customer data
- ✅ **Analytics** - Full analytics access
- ✅ **Social Share** - Can share store links
- ✅ **Profile** - Can update their profile
- ✅ **Notifications** - Full notification access
- ❌ **Users/Crew Management** - Cannot add/remove crew (Owner only)
- ❌ **Dispensary Settings** - Cannot change store settings (Owner only)
- ❌ **Advertising** - Cannot create campaigns (Owner only)
- ❌ **Browse Pool** - Cannot access product pool (Owner only)
- ❌ **Payouts** - Cannot manage dispensary payouts (Owner only)

#### Use Cases
- Store managers
- Customer service representatives
- Inventory managers
- Order processors
- General staff members

#### Technical Implementation
```typescript
{
  role: 'DispensaryStaff',
  crewMemberType: 'In-house Staff',
  dispensaryId: '[dispensary-id]',
  isDriver: false
}
```

---

## Navigation Filtering Logic

The system filters navigation items based on crew type in `src/app/dispensary-admin/layout.tsx`:

```typescript
const filterNavItems = (items: NavItem[]) => {
  return items.filter(item => {
    // Owners see everything
    if (isDispensaryOwner) return true;
    
    // Vendors: Only products, orders, analytics, payouts, profile
    if (isVendor) {
      const vendorAllowed = [
        '/dispensary-admin/products', 
        '/dispensary-admin/orders', 
        '/dispensary-admin/analytics', 
        '/dispensary-admin/payouts', 
        '/dispensary-admin/profile'
      ];
      return vendorAllowed.some(path => item.href.startsWith(path)) 
             || item.href === '#notifications';
    }
    
    // Drivers: Redirected to /driver panel
    if (isDriver) {
      return false;
    }
    
    // In-house staff: Everything except owner-only
    if (isInHouseStaff) {
      return !item.ownerOnly;
    }
    
    return !item.ownerOnly;
  });
};
```

---

## Permission Helpers in AuthContext

```typescript
const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
const isDispensaryStaff = currentUser?.role === 'DispensaryStaff';
const isVendor = isDispensaryStaff && currentUser?.crewMemberType === 'Vendor';
const isDriver = isDispensaryStaff && currentUser?.crewMemberType === 'Driver';
const isInHouseStaff = isDispensaryStaff && currentUser?.crewMemberType === 'In-house Staff';
```

---

## Adding Crew Members

### Location
`/dispensary-admin/users` → "Add Crew Member" button

### Process
1. Select crew member type: Vendor, Driver, or In-house Staff
2. Enter basic info: Name, Email, Password, Status
3. **If Driver selected**:
   - Enter phone number with country code
   - Select vehicle type
   - Enter vehicle details (registration, color, description)
   - Upload driver's license (required)
   - Upload ID document (required)
   - Upload vehicle photo (required)
   - Set delivery radius
   - Choose public/private driver status
4. Submit → User created in Firebase Auth
5. User document created in `users` collection
6. **If Driver**: Driver profile created in `driver_profiles` collection
7. Welcome email sent via Cloud Function (`sendCrewMemberEmail`)

### Welcome Email Contents
- Dispensary name
- Login credentials (email + temporary password)
- Role-specific instructions
- **For Drivers**: Phone number and vehicle info
- Encouragement to change password on first login

---

## Product Management Permissions

### Vendors
```typescript
function canManageProduct(productData) {
  return isDispensaryMember(productData.dispensaryId) && 
         (isDispensaryOwner() || 
          (isDispensaryStaff() && !isVendor()) || 
          (isVendor() && (
            productData.createdBy == request.auth.uid || 
            productData.vendorUserId == request.auth.uid
          )));
}
```

### In-House Staff
- Can manage ALL products in the dispensary
- No ownership restrictions

### Drivers
- No product management access

---

## Security Considerations

1. **Firestore Rules** enforce crew member permissions at database level
2. **UI Navigation** filters menu items based on crew type
3. **Route Guards** redirect unauthorized crew members
4. **Product Ownership** tracked via `vendorUserId` field
5. **Driver Documents** stored securely in Firebase Storage with path:
   ```
   drivers/{dispensaryId}/{userId}/{fileType}_{timestamp}.{ext}
   ```

---

## Summary Table

| Feature | Owner | Vendor | In-House Staff | Driver |
|---------|-------|--------|----------------|--------|
| Dashboard | ✅ Full | ✅ Limited | ✅ Full | ❌ (Own panel) |
| Products | ✅ All | ✅ Own only | ✅ All | ❌ |
| Orders | ✅ All | ✅ Own products | ✅ All | ✅ Deliveries only |
| Customers | ✅ | ❌ | ✅ | ❌ |
| Analytics | ✅ Full | ✅ Own data | ✅ Full | ✅ Own earnings |
| Users/Crew | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| Advertising | ✅ | ❌ | ❌ | ❌ |
| Browse Pool | ✅ | ❌ | ❌ | ❌ |
| Social Share | ✅ | ❌ | ✅ | ❌ |
| Payouts | ✅ All | ✅ Own | ❌ | ✅ Own |
| Notifications | ✅ | ✅ | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ | ✅ |

---

## Future Enhancements

1. **Vendor Analytics Dashboard** - Separate vendor-specific analytics page
2. **Driver App** - Dedicated mobile app for drivers
3. **Commission Tiers** - Different commission rates for different vendor tiers
4. **Driver Ratings** - Customer ratings and reviews for drivers
5. **Shift Management** - Schedule and track driver availability
6. **Multi-Dispensary Drivers** - Public drivers available to multiple dispensaries
7. **Vendor Storefronts** - Dedicated vendor pages within the platform
