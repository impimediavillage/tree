# Dispensary Review System Documentation

## Overview
A cutting-edge 10-star visual review system for The Wellness Tree marketplace. This system enables users to rate their dispensary experience through structured feedback (no text reviews), awards credits for participation, and ranks dispensaries based on a composite scoring algorithm.

## ⭐ Key Features

### 1. **10-Star Rating System** (Not 5-star)
- Interactive star rating from 1-10
- Visual feedback on hover and selection
- No text reviews - only structured dropdown feedback

### 2. **7 Category Dropdowns** (Optional)
Categories are shown when rating ≤ 8 to encourage structured feedback:
- **Product Quality**: Excellent / Good / Poor
- **Delivery Speed**: Fast / On Time / Slow / Very Late
- **Packaging**: Perfect / Good / Damaged
- **Order Accuracy**: Perfect / Minor Issues / Major Issues
- **Product Freshness**: Very Fresh / Fresh / Acceptable / Stale
- **Value for Money**: Excellent / Good / Fair / Poor
- **Communication**: Excellent / Good / Poor

### 3. **Credit Rewards System**
- **Base**: 5 credits for any review
- **+10 credits**: For filling 3+ categories
- **+5 credits**: For ratings ≥ 9/10
- **Maximum**: 20 credits per review

### 4. **Badge System** (7 Badges)
Dispensaries earn badges based on performance:
- 🏆 **Top Rated**: ≥9.0 average, 10+ reviews
- ⚡ **Fast Delivery**: avg delivery_speed ≥ 8.5
- 📦 **Perfect Packaging**: avg packaging ≥ 9.0
- 📈 **Consistent Quality**: variance < 1.0, 20+ reviews
- 💖 **Community Favorite**: 50+ reviews
- 💰 **Excellent Value**: avg value ≥ 8.5
- 🍃 **Fresh Products**: avg freshness ≥ 9.0

### 5. **Composite Scoring Algorithm**
```typescript
finalScore = (averageRating × 0.7) + credibilityBoost + (recentRating × 0.2) + (consistencyBonus × 0.3)

where:
  credibilityBoost = min(totalReviews / 100, 1) × 0.5
  recentRating = avg of last 30 days (if ≥5 reviews)
  consistencyBonus = (10 - variance) / 10 × 0.3
```

## 📂 File Structure

### Frontend Components
```
src/
├── components/
│   ├── reviews/
│   │   ├── ReviewSubmissionDialog.tsx      # Main review submission UI
│   │   └── DispensaryRatingDisplay.tsx     # Rating visualization (3 variants)
│   └── cards/
│       └── DispensaryListingCard.tsx       # Updated with rating display
├── app/
│   ├── dashboard/orders/page.tsx           # Triggers review prompt
│   └── dispensaries/by-type/[...]/page.tsx # Fetches & displays ratings
└── types.ts                                # Review type definitions (lines 562-660)
```

### Backend Functions
```
functions/
└── src/
    ├── dispensary-reviews.ts               # Review aggregation logic (284 lines)
    └── index.ts                            # Exports Cloud Functions
```

## 🔧 Components

### 1. ReviewSubmissionDialog
**Location**: `src/components/reviews/ReviewSubmissionDialog.tsx`

**Props**:
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispensaryId: string;
  dispensaryName: string;
  orderId: string;
  productIds: string[];
  userId: string;
}
```

**Features**:
- Interactive 10-star rating with hover effects
- Conditional category dropdowns (shown if rating ≤ 8)
- Real-time credit reward preview
- Success state with earned credits display
- Auto-closes after 3 seconds on success
- Modern UI with gradient backgrounds matching advisor pages

**Usage**:
```tsx
<ReviewSubmissionDialog
  open={reviewDialogOpen}
  onOpenChange={setReviewDialogOpen}
  dispensaryId="dispensary123"
  dispensaryName="Green Wellness Co."
  orderId="order456"
  productIds={["prod1", "prod2"]}
  userId={currentUser.uid}
/>
```

### 2. DispensaryRatingDisplay
**Location**: `src/components/reviews/DispensaryRatingDisplay.tsx`

**Props**:
```typescript
{
  reviewStats: DispensaryReviewStats;
  variant?: 'minimal' | 'compact' | 'detailed';
  className?: string;
}
```

**Variants**:
- **minimal**: Small stars + count (for tight spaces)
- **compact**: Rating, stars, count, badges (for listing cards) ← Default
- **detailed**: Full breakdown + rating distribution + category performance (for profile pages)

**Usage**:
```tsx
// In listing card
<DispensaryRatingDisplay 
  reviewStats={reviewStats} 
  variant="compact" 
/>

// In profile page
<DispensaryRatingDisplay 
  reviewStats={reviewStats} 
  variant="detailed" 
/>
```

### 3. OrderCard (Updated)
**Location**: `src/components/orders/OrderCard.tsx`

**New Props**:
```typescript
{
  onRateExperience?: (order: Order) => void;
}
```

**Features**:
- Shows "Rate Experience" button for delivered orders
- Button has yellow gradient background with star icon
- Click triggers review dialog with order details

## 🔥 Cloud Functions

### processDispensaryReview
**Type**: `onDocumentCreated` trigger  
**Path**: `dispensaryReviews/{reviewId}`

**Flow**:
1. Award credits to user (Firestore increment)
2. Fetch all active reviews for dispensary
3. Calculate aggregate statistics:
   - Average rating (1-10 scale)
   - Rating breakdown (count per rating)
   - Category averages (convert dropdown values to numeric)
   - Recent rating (last 30 days)
   - Calculate variance and standard deviation
4. Determine badges based on thresholds
5. Calculate composite reviewScore
6. Update `dispensaryReviewStats` collection
7. Update dispensary document with quick-access fields:
   - `averageRating`
   - `reviewCount`
   - `reviewScore`

**Category Value Mapping**:
```typescript
product_quality: { Excellent: 10, Good: 7, Poor: 3 }
delivery_speed: { Fast: 10, 'On Time': 8, Slow: 5, 'Very Late': 2 }
packaging: { Perfect: 10, Good: 7, Damaged: 2 }
accuracy: { Perfect: 10, 'Minor Issues': 6, 'Major Issues': 2 }
freshness: { 'Very Fresh': 10, Fresh: 8, Acceptable: 5, Stale: 2 }
value: { Excellent: 10, Good: 7, Fair: 5, Poor: 2 }
communication: { Excellent: 10, Good: 7, Poor: 3 }
```

### recalculateDispensaryReviewStats
**Type**: Callable function

**Purpose**: Manually recalculate stats for a dispensary (admin use)

**Usage**:
```typescript
const recalculate = httpsCallable(functions, 'recalculateDispensaryReviewStats');
await recalculate({ dispensaryId: 'disp123' });
```

## 📊 Firestore Collections

### dispensaryReviews
**Path**: `dispensaryReviews/{reviewId}`

**Document Structure**:
```typescript
{
  userId: string;              // Reviewer
  dispensaryId: string;        // Target dispensary
  orderId: string;             // Associated order
  productIds: string[];        // Products reviewed
  rating: number;              // 1-10
  categories: {                // Optional structured feedback
    [categoryName]: string     // Dropdown value
  };
  creditsAwarded: number;      // Credits earned
  createdAt: Timestamp;
  status: 'active' | 'flagged'; // Admin moderation
}
```

### dispensaryReviewStats
**Path**: `dispensaryReviewStats/{dispensaryId}`

**Document Structure**:
```typescript
{
  dispensaryId: string;
  totalReviews: number;
  averageRating: number;       // 0-10
  reviewScore: number;         // Composite score
  ratingBreakdown: {           // Count per rating
    1: number, 2: number, ... 10: number
  };
  categoryAverages: {          // Average per category
    product_quality: number,
    delivery_speed: number,
    // ... etc
  };
  recentRating: number;        // Last 30 days average
  variance: number;            // Rating variance
  badges: DispensaryBadge[];   // Earned badges
  lastUpdated: Timestamp;
}
```

### dispensaries (Updated)
**New Fields**:
```typescript
{
  // ... existing fields
  averageRating: number;       // Quick access (denormalized)
  reviewCount: number;         // Quick access (denormalized)
  reviewScore: number;         // For sorting
}
```

## 🎨 UI/UX Design

### Color Palette
- **Primary Green**: #006B3E
- **Brown**: #3D2E17
- **Dark Green**: #004D2C
- **Gradient Backgrounds**: `from-white via-green-50/30 to-emerald-50/30`

### Badge Colors
```typescript
top_rated:         yellow-400  (gradient from-yellow-50 to-amber-50)
fast_delivery:     blue-400    (gradient from-blue-50 to-sky-50)
perfect_packaging: green-400   (gradient from-green-50 to-emerald-50)
consistent:        purple-400  (gradient from-purple-50 to-violet-50)
community_favorite: pink-400   (gradient from-pink-50 to-rose-50)
excellent_value:   teal-400    (gradient from-teal-50 to-cyan-50)
fresh_products:    lime-400    (gradient from-lime-50 to-green-50)
```

### Star Rating Display
- **Filled Stars**: text-yellow-400 fill-yellow-400
- **Empty Stars**: text-gray-300
- **Size**: 5 (w-5 h-5) in most contexts

## 🚀 Integration Guide

### Step 1: Trigger Review from Orders Page
```tsx
// Already implemented in src/app/dashboard/orders/page.tsx

const handleRateExperience = (order: Order) => {
  const dispensaryIds = Object.keys(order.shipments || {});
  const dispensaryId = dispensaryIds[0];
  const productIds = order.items?.map(item => item.productId).filter(Boolean) || [];

  setReviewOrderData({
    orderId: order.id,
    dispensaryId,
    dispensaryName: order.dispensaryName || 'Dispensary',
    productIds
  });
  setReviewDialogOpen(true);
};

// Pass handler to OrderCard
<OrderCard 
  order={order}
  onRateExperience={order.status === 'delivered' ? handleRateExperience : undefined}
/>
```

### Step 2: Fetch Review Stats in Listing Pages
```tsx
// Already implemented in src/app/dispensaries/by-type/[...]/page.tsx

const [reviewStatsMap, setReviewStatsMap] = useState<Record<string, DispensaryReviewStats>>({});

// After fetching dispensaries
const statsPromises = dispensaries.map(async (dispensary) => {
  const statsDoc = await getDoc(doc(db, 'dispensaryReviewStats', dispensary.id));
  if (statsDoc.exists()) {
    return { id: dispensary.id, stats: statsDoc.data() as DispensaryReviewStats };
  }
  return { id: dispensary.id, stats: null };
});

const statsResults = await Promise.all(statsPromises);
const statsMap: Record<string, DispensaryReviewStats> = {};
statsResults.forEach(result => {
  if (result.stats) {
    statsMap[result.id] = result.stats;
  }
});
setReviewStatsMap(statsMap);

// Pass to cards
<DispensaryListingCard 
  dispensary={dispensary}
  reviewStats={reviewStatsMap[dispensary.id] || null}
/>
```

### Step 3: Sort by Review Score
```typescript
// In query (future enhancement)
const dispensaryQuery = query(
  collection(db, 'dispensaries'),
  where('dispensaryType', '==', typeName),
  where('status', '==', 'Approved'),
  orderBy('reviewScore', 'desc'),  // Primary sort
  orderBy('reviewCount', 'desc')   // Secondary sort
);
```

## 🧪 Testing Checklist

### Frontend Testing
- [ ] Submit review from delivered order
- [ ] Verify star rating selection (1-10)
- [ ] Test category dropdown visibility (≤8 rating)
- [ ] Confirm credit reward calculation
- [ ] Check success state display
- [ ] Test review button on OrderCard
- [ ] Verify rating display variants (minimal, compact, detailed)
- [ ] Check badge rendering
- [ ] Test responsive design on mobile

### Backend Testing
- [ ] Verify Cloud Function triggers on review creation
- [ ] Confirm credits awarded to user
- [ ] Check aggregation calculations (average, breakdown, categories)
- [ ] Test badge assignment logic
- [ ] Verify composite score calculation
- [ ] Test recalculate function (manual trigger)
- [ ] Check Firestore updates (stats + dispensary docs)

### Integration Testing
- [ ] End-to-end flow: Order → Delivery → Review → Stats Update
- [ ] Multiple reviews for same dispensary
- [ ] Review stats display in listing cards
- [ ] Badge threshold testing (edge cases)
- [ ] Concurrent review submissions

## 📈 Future Enhancements

### Phase 2 (Not Yet Implemented)
1. **Admin Dashboard**
   - Review monitoring interface
   - Flag management
   - Dispensary performance leaderboard
   - Analytics charts
   - Manual recalculation triggers

2. **Advanced Features**
   - Multi-dispensary order reviews (separate rating per dispensary)
   - Review history page for users
   - Dispensary response to reviews (optional)
   - Photo uploads with reviews
   - Review verification (confirmed purchase badge)

3. **Sorting & Filtering**
   - Update all listing pages with reviewScore sorting
   - Filter by minimum rating
   - Filter by badges
   - "Top Rated" section on homepage

4. **Notifications**
   - Email/push notification after delivery to remind review
   - Credit reward notifications
   - Badge achievement notifications for dispensaries

## 🛠️ Maintenance

### Redeployment
```bash
# Deploy Cloud Functions
firebase deploy --only functions:processDispensaryReview,functions:recalculateDispensaryReviewStats

# Full deployment
firebase deploy
```

### Monitoring
- Check Cloud Function logs: Firebase Console → Functions → Logs
- Monitor Firestore reads/writes: Firebase Console → Firestore → Usage
- Track review submission rate: Analytics dashboard

### Data Cleanup
```typescript
// Remove spam/test reviews (admin script)
const reviewsRef = collection(db, 'dispensaryReviews');
const q = query(reviewsRef, where('status', '==', 'flagged'));
const snapshot = await getDocs(q);
snapshot.forEach(async (doc) => {
  await deleteDoc(doc.ref);
});
```

## 📝 Notes

### Design Decisions
1. **10-star system**: More granular feedback than 5-star, allows better differentiation
2. **No text reviews**: Prevents negative long-winded reviews, keeps focus on visual ratings
3. **Structured dropdowns**: Provides actionable feedback to dispensaries
4. **Credit rewards**: Incentivizes quality reviews
5. **Composite scoring**: Balances rating average with review volume and consistency
6. **Badge system**: Gamification + trust signals for high performers

### Performance Considerations
- Review stats are cached in separate collection (denormalized)
- Quick-access fields in dispensary docs avoid extra reads
- Parallel fetching of review stats in listing pages
- Consider pagination for large dispensary lists

### Security Rules
Ensure Firestore rules allow:
- Authenticated users can create reviews
- Users can only review orders they placed
- Cloud Functions can update stats and dispensary docs
- Public read access to review stats (for listings)

```javascript
// firestore.rules (example)
match /dispensaryReviews/{reviewId} {
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow read: if request.auth != null;
}

match /dispensaryReviewStats/{dispensaryId} {
  allow read: if true; // Public for listings
  allow write: if false; // Only Cloud Functions
}
```

## 🎯 Current Status

### ✅ Completed
- ReviewSubmissionDialog component (10-star + categories + credits)
- DispensaryRatingDisplay component (3 variants)
- OrderCard integration (Rate Experience button)
- Orders page integration (review dialog trigger)
- DispensaryListingCard integration (rating display)
- Cloud Function: processDispensaryReview
- Cloud Function: recalculateDispensaryReviewStats
- Type definitions (DispensaryReview, DispensaryReviewStats, etc.)
- Badge system configuration
- Composite scoring algorithm
- Listing page review stats fetching

### 🔄 In Progress
- Testing end-to-end flow

### ⏳ Pending
- Admin dashboard for review monitoring
- Update all listing pages with reviewScore sorting
- Deploy/redeploy Cloud Functions
- Firestore security rules update
- Notification system
- Analytics integration

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Author**: GitHub Copilot + User Collaboration
