# Database Migration Guide

## Scripts Created

Two migration scripts have been created in the `scripts/` folder:

1. **migrate-dispensary-fields.js** - Adds new fields to all dispensaries
2. **init-order-counter.js** - Initializes the order numbering system

---

## Option 1: Run via Firebase Console (Easiest)

### Step 1: Migrate Dispensaries

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Click the **three dots** menu → **Open in Cloud Shell** or use the Console tab
5. Copy and paste this code:

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

(async () => {
  const snapshot = await db.collection('dispensaries').get();
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.taxRate === undefined) {
      batch.update(doc.ref, {
        taxRate: 15,
        inHouseDeliveryPrice: null,
        sameDayDeliveryCutoff: null,
        inHouseDeliveryCutoffTime: null
      });
      count++;
    }
  });
  
  await batch.commit();
  console.log(`✅ Updated ${count} dispensaries`);
})();
```

### Step 2: Initialize Order Counter

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

(async () => {
  await db.collection('order_counters').doc('global').set({
    letter: 'A',
    number: 0,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('✅ Order counter initialized');
})();
```

---

## Option 2: Run via Cloud Functions

### Deploy and Run

1. Copy the scripts to your functions folder:
```bash
cp scripts/migrate-dispensary-fields.js functions/
cp scripts/init-order-counter.js functions/
```

2. Add to `functions/package.json` scripts:
```json
{
  "scripts": {
    "migrate": "node migrate-dispensary-fields.js",
    "init-counter": "node init-order-counter.js"
  }
}
```

3. Run migrations:
```bash
cd functions
npm run migrate
npm run init-counter
```

---

## Option 3: Run Locally with Firebase Admin SDK

### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

### Run Scripts

1. **Set up credentials:**
   - Download service account key from Firebase Console
   - Set environment variable:
   ```bash
   $env:GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
   ```

2. **Update scripts to use credentials:**
   Add to top of each script:
   ```javascript
   const serviceAccount = require('./path/to/serviceAccountKey.json');
   admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
   });
   ```

3. **Run:**
   ```bash
   node scripts/migrate-dispensary-fields.js
   node scripts/init-order-counter.js
   ```

---

## Verification

### Check Dispensaries Updated:
```javascript
db.collection('dispensaries').where('taxRate', '==', 15).get()
```

### Check Order Counter:
```javascript
db.collection('order_counters').doc('global').get()
```

### Expected Results:
- All dispensaries have `taxRate: 15`
- Order counter shows `letter: "A"`, `number: 0`

---

## What Gets Updated

### Dispensaries Collection
Each dispensary document gets:
```javascript
{
  taxRate: 15,                    // South Africa VAT (15%)
  inHouseDeliveryPrice: null,     // Can be set per dispensary later
  sameDayDeliveryCutoff: null,    // Can be set per dispensary later
  inHouseDeliveryCutoffTime: null // Can be set per dispensary later
}
```

### Order Counters Collection (New)
```javascript
order_counters/global {
  letter: "A",
  number: 0,
  lastUpdated: timestamp
}
```

---

## Troubleshooting

**Error: "Permission denied"**
- Ensure you have Firestore admin permissions
- Check Firebase rules

**Error: "Module not found"**
- Run `npm install` in the directory
- Ensure firebase-admin is installed

**Script runs but no updates**
- Check if documents already have the fields
- Look for "Skipped" messages in console

---

## Next Steps After Migration

1. ✅ All dispensaries will have tax rates
2. ✅ New orders will use format: ORD-WELL-2412291345-A0000001
3. ✅ Pricing system will calculate commissions correctly
4. ✅ Dispensaries can edit their in-house delivery settings in their profile

**No product updates needed** - products inherit taxRate dynamically when displayed!
