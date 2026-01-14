# Treehouse Shipping Methods Troubleshooting Guide

## Issue: Shipping Methods Not Displaying in Checkout

### Problem
When customers try to checkout with Treehouse products (Step 2 of 3), no shipping methods are displayed.

### Root Causes

1. **Missing Treehouse Configuration**
   - The `treehouse_config/origin_locker` Firestore document doesn't exist
   - Solution: Configure the origin locker in Super Admin

2. **No Shipping Methods Configured**
   - The configuration exists but `shippingMethods` array is empty or not set
   - Solution: Select at least one shipping method in the configuration

3. **Locker-Based Methods Without Locker**
   - LTL (Locker-to-Locker) or LTD (Locker-to-Door) are selected but no Pudo locker is configured
   - Solution: Either remove these methods or configure a Pudo locker

### How to Configure Treehouse Shipping

#### Step 1: Access Treehouse Management
1. Log in as Super Admin
2. Navigate to **Super Admin** → **Treehouse Management**
3. Click on the **Origin Locker** tab

#### Step 2: Configure Origin Address
1. Use the address search to find the Treehouse location
2. Enter a contact email for shipping notifications
3. Select the shipping methods you want to offer:
   - **DTD** (Door-to-Door): Standard courier delivery
   - **DTL** (Door-to-Locker): Delivery to customer's chosen locker
   - **LTD** (Locker-to-Door): From Treehouse locker to customer door
   - **LTL** (Locker-to-Locker): From Treehouse locker to customer locker
   - **Collection**: Customer picks up from location
   - **In-house**: Treehouse's own delivery service

4. Click **Save Address & Shipping Config**

#### Step 3: Configure Pudo Locker (Optional - Required for LTL/LTD)
If you selected LTL or LTD shipping methods:

1. In the same Origin Locker tab, scroll down
2. Click **Load Pudo Lockers**
3. Search for a locker near your origin address
4. Select a locker from the list
5. Click **Save Pudo Locker**

### Firestore Document Structure

The configuration is stored in `treehouse_config/origin_locker`:

```typescript
{
  // Origin address
  address: string,
  streetAddress: string,
  suburb: string,
  city: string,
  province: string,
  postalCode: string,
  country: string,
  latitude: number,
  longitude: number,
  email: string,
  
  // Shipping configuration (REQUIRED)
  shippingMethods: string[], // e.g., ["dtd", "dtl", "ltd"]
  
  // Optional: For locker-based methods
  lockerCode?: string,
  lockerId?: string,
  lockerName?: string,
  isPudoLocker?: boolean,
  
  // Timestamps
  updatedAt: Timestamp
}
```

### How Treehouse Checkout Works

1. **Cart Detection**: When items are added to cart from Treehouse stores, they have:
   - `dispensaryId: "treehouse"`
   - `dispensaryType: "Treehouse"`
   - `creatorId` and `creatorName` for earnings tracking

2. **Checkout Routing**: In Step 2 of checkout, the system:
   - Groups cart items by `dispensaryId`
   - Detects Treehouse items by checking `dispensaryType === "Treehouse"`
   - Routes Treehouse groups to `TreehouseShippingGroup` component
   - Routes normal dispensary groups to `DispensaryShippingGroup` component

3. **Shipping Method Fetch**: `TreehouseShippingGroup` component:
   - Fetches config from `treehouse_config/origin_locker`
   - Displays available shipping methods from `config.shippingMethods`
   - Filters out LTL/LTD if no locker is configured
   - Shows error messages if config is incomplete

### Debugging

Check the browser console for these debug logs:
```
[CheckoutFlow] Dispensary: treehouse, Type: Treehouse, isTreehouse: true
[TreehouseShippingGroup] Fetched config: {...}
[TreehouseShippingGroup] Shipping methods: ["dtd", "dtl"]
[TreehouseShippingGroup] Available shipping methods: ["dtd", "dtl"]
```

If you see:
- `No shipping methods in config` → The `shippingMethods` field is missing or empty
- `Checking ltd, hasLocker: false` → LTD/LTL are selected but no locker configured
- `Config document does not exist` → The Firestore document wasn't created

### Important Notes

⚠️ **Do NOT modify dispensary shipping settings** when troubleshooting Treehouse shipping. They are completely separate systems:

- **Dispensary Orders**: Use dispensary profile settings + Shiplogic API
- **Treehouse Orders**: Use centralized `treehouse_config/origin_locker`

Each uses its own component (`DispensaryShippingGroup` vs `TreehouseShippingGroup`) and they should not interfere with each other.

### Testing Checklist

- [ ] Treehouse config document exists in Firestore
- [ ] `shippingMethods` array has at least one method
- [ ] If LTL/LTD selected, locker is configured
- [ ] Email address is set in config
- [ ] Origin address has coordinates
- [ ] Treehouse products in cart show `dispensaryType: "Treehouse"`
- [ ] Console logs show config was fetched successfully
- [ ] Shipping method selection appears in Step 2 of checkout
- [ ] Selected shipping method persists to Step 3 (Payment)
- [ ] Order creation includes correct shipping info

### Related Files

- **Component**: `src/components/checkout/TreehouseShippingGroup.tsx`
- **Checkout Flow**: `src/components/checkout/CheckoutFlow.tsx`
- **Config UI**: `src/components/admin/treehouse/OriginLockerTab.tsx`
- **Types**: `src/types.ts` (CartItem, TreehouseConfig)
- **Cart Context**: `src/contexts/CartContext.tsx`

---

**Last Updated**: January 2026  
**Status**: Enhanced error messaging and debug logging added
