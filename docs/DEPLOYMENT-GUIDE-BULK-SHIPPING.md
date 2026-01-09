# Quick Deployment Guide - Bulk Shipping

## 🚀 Deploy in 3 Steps

### Step 1: Build Functions
```powershell
cd functions
npm run build
```

### Step 2: Deploy to Firebase
```powershell
firebase deploy --only functions:createShiplogicShipment,functions:createPudoShipment
```

### Step 3: Verify Deployment
1. Open Firebase Console → Functions
2. Check both functions show "Active" ✅
3. Monitor logs for any errors

---

## 🧪 Quick Test

### Test Bulk Label Generation
1. Navigate to `/dispensary-admin/orders`
2. Select 2-3 orders with "pending" status
3. Click dropdown → "Generate Labels"
4. Watch progress bar complete
5. Verify tracking numbers appear in orders

### Expected Result
✅ Orders show tracking numbers  
✅ Status updates to "ready_for_pickup"  
✅ Toast notification shows success  

---

## 🔑 Required Secrets

If not already set:
```powershell
firebase functions:secrets:set SHIPLOGIC_API_KEY
firebase functions:secrets:set PUDO_API_KEY
```

---

## 📝 What Was Changed

### New Files
- ✅ `functions/src/shipping-label-generation.ts` - Cloud Functions

### Modified Files
- ✅ `functions/src/index.ts` - Added exports
- ✅ `src/hooks/use-bulk-shipping.ts` - Real API calls

### Unchanged (No Breaking Changes)
- ✅ All existing Cloud Functions
- ✅ All UI components
- ✅ All rate calculation functions
- ✅ Individual label generation

---

## 🎯 Ready to Use!

After deployment, dispensary admins can:
1. Select multiple orders
2. Generate all shipping labels at once
3. Print labels in bulk
4. Track all shipments

**Status:** Production Ready ✅
