# Review System Deployment Checklist

## 🚀 Pre-Deployment

### 1. Code Review
- [x] ReviewSubmissionDialog.tsx - Complete with 10-star rating
- [x] DispensaryRatingDisplay.tsx - 3 variants (minimal, compact, detailed)
- [x] OrderCard.tsx - Added "Rate Experience" button
- [x] Orders page.tsx - Review dialog integration
- [x] Dispensary listing page - Review stats fetching
- [x] DispensaryListingCard.tsx - Rating display integration
- [x] Type definitions in types.ts (lines 562-660)
- [x] Cloud Functions (dispensary-reviews.ts) - Already deployed

### 2. TypeScript Compilation
- [x] No TypeScript errors found
- [x] All imports resolved correctly
- [x] Types properly exported

### 3. Testing Requirements

#### Frontend Tests
```bash
# Start dev server
npm run dev

# Test in browser:
# 1. Navigate to /dashboard/orders
# 2. Find a delivered order
# 3. Click "Rate Experience" button
# 4. Test star rating (hover + click)
# 5. Test category dropdowns (rate ≤ 8)
# 6. Submit review
# 7. Verify success message
# 8. Check credit balance increased
```

#### Backend Tests
```bash
# Check Cloud Function logs
firebase functions:log --only processDispensaryReview

# Manual test review creation
# (Use Firebase Console → Firestore → Create document in dispensaryReviews)
# Document structure:
{
  userId: "test-user-id",
  dispensaryId: "test-dispensary-id",
  orderId: "test-order-id",
  productIds: ["prod1"],
  rating: 9,
  categories: {
    product_quality: "Excellent",
    delivery_speed: "Fast"
  },
  creditsAwarded: 20,
  createdAt: [timestamp],
  status: "active"
}

# Verify Cloud Function triggers and creates:
# 1. dispensaryReviewStats/{dispensaryId} document
# 2. Updates dispensary document with averageRating, reviewCount, reviewScore
# 3. User credits incremented
```

## 🔥 Cloud Functions Deployment

### Option 1: Deploy Review Functions Only
```bash
cd c:\www\The-Wellness-Tree
firebase deploy --only functions:processDispensaryReview,functions:recalculateDispensaryReviewStats
```

### Option 2: Deploy All Functions
```bash
cd c:\www\The-Wellness-Tree
firebase deploy --only functions
```

### Verify Deployment
```bash
# Check function status
firebase functions:list

# Expected output:
# processDispensaryReview (us-central1)
# recalculateDispensaryReviewStats (us-central1)
```

## 🔒 Firestore Security Rules

### Update firestore.rules
Add these rules to allow review creation and public reading of stats:

```javascript
// Add to firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // Dispensary Reviews
    match /dispensaryReviews/{reviewId} {
      // Users can create reviews for their own orders
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid
                    && request.resource.data.rating >= 1 
                    && request.resource.data.rating <= 10;
      
      // Users can read their own reviews
      allow read: if request.auth != null 
                  && (resource.data.userId == request.auth.uid 
                      || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin');
      
      // No updates or deletes (immutable reviews)
      allow update, delete: if false;
    }
    
    // Dispensary Review Stats
    match /dispensaryReviewStats/{dispensaryId} {
      // Public read for displaying in listings
      allow read: if true;
      
      // Only Cloud Functions can write
      allow write: if false;
    }
    
    // Update dispensaries collection to allow Cloud Function updates
    match /dispensaries/{dispensaryId} {
      // ... existing read rules ...
      
      // Allow Cloud Functions to update review fields
      // (write from Cloud Functions bypasses rules, but good to document)
    }
  }
}
```

### Deploy Rules
```bash
firebase deploy --only firestore:rules
```

## 🌐 Frontend Deployment

### Build and Deploy
```bash
cd c:\www\The-Wellness-Tree

# Build Next.js app
npm run build

# Deploy to Firebase Hosting (if using)
firebase deploy --only hosting

# OR deploy to your hosting provider
# (Vercel, Netlify, etc.)
```

## ✅ Post-Deployment Verification

### 1. Smoke Tests
- [ ] Visit deployed site
- [ ] Login as test user
- [ ] Navigate to /dashboard/orders
- [ ] Verify "Rate Experience" button appears on delivered orders
- [ ] Click button and verify dialog opens
- [ ] Submit test review (rating 9, 2 categories)
- [ ] Verify success message and credit reward
- [ ] Check Firestore Console for new review document
- [ ] Verify dispensaryReviewStats document created/updated
- [ ] Visit dispensary listing page
- [ ] Verify rating display appears on cards
- [ ] Check badge rendering (if thresholds met)

### 2. Cloud Function Monitoring
```bash
# Watch logs in real-time
firebase functions:log --only processDispensaryReview

# Check for errors
firebase functions:log --only processDispensaryReview --limit 50
```

### 3. Firestore Data Verification
Check Firebase Console:
- **dispensaryReviews**: New review documents
- **dispensaryReviewStats**: Aggregated stats per dispensary
- **dispensaries**: Updated averageRating, reviewCount, reviewScore fields
- **users**: Credit balance incremented

### 4. Performance Check
- [ ] Review submission completes < 2 seconds
- [ ] Cloud Function executes < 10 seconds
- [ ] Listing page loads with ratings < 3 seconds
- [ ] No console errors in browser
- [ ] No function timeout errors

## 🐛 Troubleshooting

### Review Dialog Not Opening
- Check browser console for errors
- Verify ReviewSubmissionDialog import
- Check reviewDialogOpen state
- Verify onRateExperience prop passed to OrderCard

### Cloud Function Not Triggering
```bash
# Check function deployment
firebase functions:list

# Check function logs
firebase functions:log --only processDispensaryReview

# Verify trigger path matches collection
# Should be: dispensaryReviews/{reviewId}
```

### Review Stats Not Displaying
- Check reviewStatsMap state in listing page
- Verify parallel fetch completes
- Check DispensaryReviewStats type import
- Verify reviewStats prop passed to DispensaryListingCard
- Check browser console for errors

### Credits Not Awarded
- Check Cloud Function logs for errors
- Verify user document exists
- Check Firestore permissions for user collection
- Verify creditsAwarded field in review document

### Badges Not Showing
- Check badge threshold logic in Cloud Function
- Verify reviewStatsMap has stats data
- Check badge array in DispensaryReviewStats
- Verify badge rendering in DispensaryRatingDisplay

## 📊 Monitoring & Analytics

### Key Metrics to Track
1. **Review Submission Rate**
   - Reviews per day/week
   - % of delivered orders with reviews
   - Average time between delivery and review

2. **Credit Economics**
   - Total credits awarded
   - Average credits per review
   - % of reviews with 3+ categories

3. **Dispensary Performance**
   - Average rating distribution
   - Badge distribution
   - Top/bottom performers

4. **User Engagement**
   - Unique reviewers
   - Repeat reviewers
   - Review completion rate (started vs submitted)

### Analytics Implementation (Future)
```typescript
// Add to ReviewSubmissionDialog onSuccess
analytics.logEvent('review_submitted', {
  dispensary_id: dispensaryId,
  rating: rating,
  categories_filled: Object.keys(categories).length,
  credits_awarded: totalCredits
});

// Add to listing page
analytics.logEvent('view_dispensary_ratings', {
  dispensary_id: dispensary.id,
  average_rating: reviewStats.averageRating,
  badge_count: reviewStats.badges.length
});
```

## 🔄 Rollback Plan

### If Issues Arise

1. **Revert Cloud Functions**
```bash
# Deploy previous version
firebase functions:rollback processDispensaryReview
firebase functions:rollback recalculateDispensaryReviewStats
```

2. **Hide Review UI**
```typescript
// Quick disable in orders page
const REVIEWS_ENABLED = false; // Toggle flag

{REVIEWS_ENABLED && (
  <ReviewSubmissionDialog ... />
)}
```

3. **Pause Review Processing**
```typescript
// Add to Cloud Function start
if (new Date() < new Date('2025-02-01')) {
  console.log('Reviews paused for maintenance');
  return;
}
```

## 📝 Documentation Updates

After successful deployment:
- [ ] Update README.md with review system overview
- [ ] Add screenshots to documentation
- [ ] Update API documentation (if applicable)
- [ ] Create user guide for review submission
- [ ] Create dispensary guide for responding to reviews (future)

## 🎉 Success Criteria

Deployment considered successful when:
- [x] All TypeScript compiles without errors
- [ ] Cloud Functions deploy successfully
- [ ] Review submission works end-to-end
- [ ] Credits awarded correctly
- [ ] Stats calculated and displayed
- [ ] No critical errors in logs
- [ ] Performance meets targets
- [ ] User feedback positive

## 📅 Timeline

Estimated deployment time: **30-60 minutes**

1. Code review: 10 min
2. Local testing: 15 min
3. Cloud Functions deployment: 5 min
4. Firestore rules update: 5 min
5. Frontend deployment: 10 min
6. Post-deployment verification: 15 min

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Status**: ⏳ Pending / ✅ Success / ❌ Rollback  
**Notes**: 

---

Good luck with the deployment! 🚀
