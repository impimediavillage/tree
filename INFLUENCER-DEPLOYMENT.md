# 🚀 Influencer System - Deployment Checklist

## Pre-Deployment

### 1. Code Verification
- [x] TypeScript types created (`src/types/influencer.ts`)
- [x] ReferralContext integrated (`src/contexts/ReferralContext.tsx`)
- [x] Layout updated with ReferralProvider
- [x] Cloud Functions expanded (`functions/src/influencer-commissions.ts`)
- [x] API routes created (track-click, profile, apply, admin)
- [x] Influencer dashboard created
- [x] Admin management panel created
- [x] Application form created
- [x] Order tracking integrated (referralCode in PaymentStep)

### 2. Build Test
```bash
npm run build
```
**Expected**: No TypeScript errors, successful build

### 3. Function Build Test
```bash
cd functions
npm run build
```
**Expected**: No TypeScript errors in Cloud Functions

---

## Deployment Steps

### Step 1: Deploy Cloud Functions
```bash
cd functions
npm run build
firebase deploy --only functions
```

**Functions Deployed:**
- `processInfluencerCommission` (Firestore trigger - not used currently)
- `calculateCommissionOnOrderDelivered` (Callable - main commission calculator)
- `getInfluencerStats` (Callable - dashboard data)
- `processPayouts` (Scheduled - Fridays midnight)
- `resetMonthlySales` (Scheduled - 1st of month)

**Verify**:
```bash
firebase functions:log
```

### Step 2: Create Firestore Collections
Manually create these collections (will auto-populate):
- `influencers`
- `referralClicks`
- `influencerCommissions`
- `influencerPayouts`

### Step 3: Add Composite Indexes
**Option A - Manual:**
Go to Firebase Console → Firestore → Indexes → Create Index

**Option B - Auto:**
Let Firebase suggest indexes when you get errors, then:
```bash
firebase deploy --only firestore:indexes
```

**Required Indexes:**
1. Collection: `influencers`
   - Fields: `userId` (ASC), `status` (ASC)
   
2. Collection: `influencers`
   - Fields: `referralCode` (ASC), `status` (ASC)
   
3. Collection: `referralClicks`
   - Fields: `influencerId` (ASC), `converted` (ASC), `timestamp` (DESC)
   
4. Collection: `influencerCommissions`
   - Fields: `influencerId` (ASC), `createdAt` (DESC)
   
5. Collection: `influencerCommissions`
   - Fields: `influencerId` (ASC), `status` (ASC)

### Step 4: Deploy Frontend
```bash
npm run build
firebase deploy --only hosting
```

**Or full deployment:**
```bash
firebase deploy
```

---

## Post-Deployment Testing

### Test 1: Application Flow
1. Go to `/dashboard/influencer/apply`
2. Fill out form
3. Submit application
4. Verify document created in `influencers` collection
5. Status should be `pending`

### Test 2: Admin Approval
1. Login as super admin
2. Go to `/admin/dashboard/influencers`
3. Find pending application
4. Click "Approve"
5. Verify:
   - Status changed to `active`
   - User document updated with `isInfluencer: true`
   - Referral code visible

### Test 3: Referral Tracking
1. Copy influencer referral link (e.g., `?ref=RASTA420`)
2. Open in incognito window
3. Complete a purchase
4. Verify:
   - Click logged in `referralClicks`
   - Order has `referralCode` field
   - `visitorId` and `timestamp` recorded

### Test 4: Commission Calculation
**Manual Trigger:**
1. Create test order with referral code
2. Mark order as `delivered`
3. Call Cloud Function manually:
```javascript
const functions = getFunctions();
const calculateCommission = httpsCallable(functions, 'calculateCommissionOnOrderDelivered');
await calculateCommission({ orderId: 'ORDER_ID' });
```
4. Verify:
   - Commission created in `influencerCommissions`
   - Influencer stats updated
   - Referral click marked as converted

**Automatic (Future):**
When order status webhook is set up, commissions will calculate automatically.

### Test 5: Dashboard Access
1. Login as approved influencer
2. Go to `/dashboard/influencer`
3. Verify:
   - Profile loads
   - Stats display correctly
   - Referral link shows
   - Digital Forest visualization renders
   - Commission history (if any) displays

### Test 6: Payout Processing
**Option A - Wait for Friday:**
The `processPayouts` function runs automatically every Friday at midnight.

**Option B - Manual Test:**
1. Ensure influencer has `pendingEarnings >= 500`
2. Manually trigger function:
```bash
firebase functions:shell
```
```javascript
processPayouts()
```
3. Verify:
   - Payout created in `influencerPayouts`
   - Commissions updated to `confirmed`
   - Balance moved to available

---

## Monitoring

### Check Function Logs
```bash
firebase functions:log --only calculateCommissionOnOrderDelivered
```

### Check Function Errors
Go to Firebase Console → Functions → Logs

### Monitor Firestore Reads/Writes
Go to Firebase Console → Firestore → Usage

**Expected Usage:**
- Referral click: 2 reads, 1 write
- Commission calculation: 5 reads, 3 writes
- Dashboard load: 3-5 reads
- Payout processing: N * 5 reads + writes (N = influencer count)

---

## Troubleshooting

### Issue: "Influencer not found"
**Solution**: Verify `referralCode` is uppercase in both order and influencer profile

### Issue: "Commission already calculated"
**Solution**: Check if commission exists for orderId. Function prevents duplicates.

### Issue: "Authorization failed"
**Solution**: 
1. Check if user is authenticated
2. Verify Firebase ID token is being sent
3. Check token expiry (tokens expire after 1 hour)

### Issue: Dashboard shows no data
**Solution**:
1. Check if influencer profile exists
2. Verify userId matches currentUser.uid
3. Check if status is 'active'

### Issue: Payout not processing
**Solution**:
1. Verify pendingBalance >= minimumPayout (default R500)
2. Check Cloud Scheduler is enabled
3. Verify timezone (should be Africa/Johannesburg)
4. Check function logs for errors

---

## Performance Optimization

### Caching Strategy
- Dashboard stats: Cache for 5 minutes (reduce reads)
- Commission history: Limit to 20 most recent
- Referral clicks: No caching (real-time tracking)

### Firestore Best Practices
- Use `limit()` on queries
- Index all queried fields
- Batch write operations where possible
- Use `FieldValue.increment()` for counters

---

## Security Rules (Future)

Add to `firestore.rules`:
```javascript
match /influencers/{influencerId} {
  // Anyone can read active influencer public profiles
  allow read: if resource.data.status == 'active';
  
  // Only the influencer can read their own full profile
  allow read: if request.auth != null && 
                 resource.data.userId == request.auth.uid;
  
  // Only super admins can write
  allow write: if request.auth != null && 
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
}

match /influencerCommissions/{commissionId} {
  // Only the influencer can read their own commissions
  allow read: if request.auth != null && 
                 resource.data.influencerId in get(/databases/$(database)/documents/influencers).where('userId', '==', request.auth.uid);
  
  // No client writes (Cloud Functions only)
  allow write: if false;
}
```

---

## Success Metrics

After 1 week, check:
- [ ] Total influencer applications
- [ ] Active influencers
- [ ] Total referral clicks
- [ ] Conversion rate
- [ ] Total commissions earned
- [ ] Average earnings per influencer
- [ ] Dashboard engagement

After 1 month, review:
- [ ] Tier distribution (how many in each tier)
- [ ] Payout success rate
- [ ] Top performing influencers
- [ ] Most referred product categories

---

## Next Steps

### Immediate (After Deployment)
1. Create first test influencer account
2. Share with beta testers
3. Monitor function logs daily
4. Collect user feedback

### Short-Term (1-2 weeks)
1. Add error reporting (Sentry integration)
2. Create influencer onboarding guide
3. Design promotional materials
4. Set up email notifications

### Long-Term (1-3 months)
1. Implement bundle creator
2. Add video content features
3. Launch wellness tribes
4. Introduce collaborative commissions

---

## Emergency Rollback

If critical issues arise:

### Rollback Functions
```bash
firebase functions:list
firebase functions:delete calculateCommissionOnOrderDelivered
# Then redeploy previous version
```

### Disable Referral Tracking
Comment out ReferralProvider in `src/app/layout.tsx`:
```tsx
{/* <ReferralProvider> */}
  <Header />
  {/* ... */}
{/* </ReferralProvider> */}
```

### Pause Payouts
Disable Cloud Scheduler:
```bash
gcloud scheduler jobs pause processPayouts
```

---

## Support Contacts

**Development Team:**
- Lead Developer: [Your Name]
- Email: dev@wellnesstree.co.za

**Firebase Support:**
- Console: https://console.firebase.google.com
- Support: https://firebase.google.com/support

---

**Deployment Date**: December 22, 2024  
**Version**: 1.0.0  
**Status**: ✅ READY FOR DEPLOYMENT
