# Advertising System - Complete Deployment Guide

## 🎯 Overview

This is an innovative advertising system that allows dispensary owners to create ads with product bundles, and influencers to browse a marketplace and SELECT which ads they want to promote. Each selection generates a unique tracking code and URL, enabling real-time commission attribution and analytics.

**Innovation:** Better than TikTok's creator marketplace because it includes automatic tracking generation, real-time commission attribution, product bundle creation, multi-placement ads, performance scoring, and a game-style UI.

## 🏗️ System Architecture

### Collections Structure

```
advertisements/
  - {adId}/
    - title, description, type, status
    - dispensaryId, dispensaryName
    - products[], isBundle, bundleConfig
    - influencerCommission (rate, availableToInfluencers)
    - design (template, animation, placements)
    - analytics (impressions, clicks, conversions, revenue)
    - selectedByInfluencers[]

influencerAdSelections/
  - {selectionId}/
    - adId, influencerId, dispensaryId
    - uniqueTrackingCode, trackingUrl
    - commissionRate, status
    - performance (impressions, clicks, conversions, revenue, commission)

adImpressions/
  - {impressionId}/
    - adId, placement, timestamp
    - userId, influencerId, trackingCode
    - userAgent, ipAddress

adClicks/
  - {clickId}/
    - adId, destination, timestamp
    - userId, influencerId, trackingCode
    - userAgent, ipAddress

adConversions/
  - {conversionId}/
    - adId, orderId, timestamp
    - influencerId, trackingCode
    - orderTotal, commissionRate, commissionAmount

adDailyAnalytics/
  - {analyticsId}/
    - adId, date
    - impressions, clicks, conversions, revenue
    - ctr, conversionRate
```

## 📁 Files Created

### Type Definitions
- **`src/types/advertising.ts`** (656 lines)
  - Complete type system for ads, tracking, marketplace
  - Enums: AdType, AdStatus, AdPlacement, AdTemplate, AnimationType

### Utility Functions
- **`src/lib/advertising-utils.ts`** (400+ lines)
  - `generateTrackingCode()` - Unique code generation
  - `influencerSelectAd()` - KEY marketplace function
  - `trackAdImpression()`, `trackAdClick()` - Client-side tracking
  - Performance scoring and analytics

### React Hooks
- **`src/hooks/use-advertising.ts`** (350+ lines)
  - `useDispensaryAds()` - Fetch owner's ads
  - `useInfluencerAdMarketplace()` - Browse marketplace
  - `useInfluencerSelectedAds()` - Promoted ads
  - `useAdAnalytics()` - Performance metrics

### Pages & Components

#### Dispensary Owner
- **`src/app/dispensary-admin/advertising/page.tsx`** (350+ lines)
  - Main dashboard with animated metrics
  - Ad campaign cards with performance stats
  
- **`src/app/dispensary-admin/advertising/create/page.tsx`** (600+ lines)
  - 5-step wizard:
    1. Choose ad type (Special Deal, Featured Product, Bundle, etc.)
    2. Ad details (title, description, CTA)
    3. Product selection with bundle pricing calculator
    4. Design templates, animations, placements
    5. Influencer settings and publish
    
- **`src/app/dispensary-admin/advertising/[id]/page.tsx`** (500+ lines)
  - Ad detail view with real-time analytics
  - Charts showing performance trends
  - Influencer attribution breakdown

#### Influencer
- **`src/app/dashboard/influencer/ad-marketplace/page.tsx`** (600+ lines)
  - Browse available ads with filters
  - Commission rate sorting
  - "Promote This Ad" button generates tracking URL
  - QR code modal for sharing

#### Super Admin
- **`src/app/admin/advertising/page.tsx`** (400+ lines)
  - Platform-wide analytics dashboard
  - Ad zone management
  - Dispensary/influencer performance tracking

#### Display Components
- **`src/components/advertising/AdBanner.tsx`**
  - Full-width hero banner with auto-rotation
  - Impression/click tracking
  - Gradient backgrounds with animations
  
- **`src/components/advertising/FeaturedAdCard.tsx`**
  - Card grid ads for product listings
  - Bundle savings display
  
- **`src/components/advertising/SidebarAd.tsx`**
  - Sticky sidebar placement
  - Dismissible with rotation
  
- **`src/components/advertising/InlineAd.tsx`**
  - Between content sections
  - Horizontal layout with CTA

### Cloud Functions
- **`functions/src/advertising.ts`** (400+ lines)
  - `trackAdImpression` - Callable function for impression tracking
  - `trackAdClick` - Callable function for click tracking
  - `trackAdConversion` - Firestore trigger on order creation
  - `aggregateDailyAdAnalytics` - Daily cron job
  - `cleanupExpiredAds` - Daily cron job
  - `activateScheduledAds` - Hourly cron job

### Security Rules
- **`firestore.rules`** - Updated with advertising collections
  - Dispensary owners: CRUD their own ads
  - Influencers: Create selections, read their data
  - Public: Read active ads, create impressions/clicks
  - Super Admin: Full access

## 🚀 Deployment Steps

### 1. Install Dependencies

```bash
# Client-side
npm install recharts qrcode.react

# Functions
cd functions
npm install
cd ..
```

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

**Note:** The following scheduled functions will be deployed:
- `aggregateDailyAdAnalytics` - Runs daily at midnight (Africa/Johannesburg)
- `cleanupExpiredAds` - Runs daily at 1 AM
- `activateScheduledAds` - Runs every hour

### 4. Create Firestore Indexes

Create composite indexes for optimal performance:

```bash
# Firebase Console > Firestore > Indexes

# advertisements
- Collection: advertisements
- Fields: dispensaryId (Ascending), status (Ascending), startDate (Descending)

# advertisements (influencer marketplace)
- Collection: advertisements
- Fields: influencerCommission.availableToInfluencers (Ascending), status (Ascending), analytics.impressions (Descending)

# influencerAdSelections
- Collection: influencerAdSelections
- Fields: influencerId (Ascending), status (Ascending), createdAt (Descending)

# influencerAdSelections (by tracking code)
- Collection: influencerAdSelections
- Fields: uniqueTrackingCode (Ascending), status (Ascending)

# adImpressions
- Collection: adImpressions
- Fields: adId (Ascending), timestamp (Descending)

# adClicks
- Collection: adClicks
- Fields: adId (Ascending), timestamp (Descending)

# adConversions
- Collection: adConversions
- Fields: adId (Ascending), timestamp (Descending)
- Collection: adConversions
- Fields: influencerId (Ascending), timestamp (Descending)
```

### 5. Update Navigation

Add advertising links to navigation components:

**Dispensary Owner Navigation:**
```tsx
<Link href="/dispensary-admin/advertising">
  📢 Advertising
</Link>
```

**Influencer Navigation:**
```tsx
<Link href="/dashboard/influencer/ad-marketplace">
  🌟 Ad Marketplace
</Link>
```

**Super Admin Navigation:**
```tsx
<Link href="/admin/advertising">
  👑 Platform Ads
</Link>
```

### 6. Add Ad Display Components

Place ad components in your public pages:

```tsx
// Homepage
import { AdBanner } from '@/components/advertising/AdBanner';

<AdBanner placement="hero_banner" />
```

```tsx
// Product listing pages
import { FeaturedAdCard } from '@/components/advertising/FeaturedAdCard';

<FeaturedAdCard placement="product_grid" limit={3} />
```

```tsx
// Sidebar
import { SidebarAd } from '@/components/advertising/SidebarAd';

<SidebarAd placement="sidebar" />
```

```tsx
// Between content
import { InlineAd } from '@/components/advertising/InlineAd';

<InlineAd placement="inline" />
```

## 🎮 User Workflows

### Dispensary Owner Creates Ad

1. Navigate to `/dispensary-admin/advertising`
2. Click "Create New Ad"
3. **Step 1:** Choose ad type (Special Deal, Bundle, etc.)
4. **Step 2:** Enter title, description, tagline, CTA button text
5. **Step 3:** Select products from inventory
   - Toggle "Bundle Deal" to enable bundle pricing
   - Enter bundle price (system calculates savings)
6. **Step 4:** Choose design template, animation, placements, priority
7. **Step 5:** Toggle "Make Available to Influencers", set commission rate
8. Click "Publish Ad"

### Influencer Selects Ad

1. Navigate to `/dashboard/influencer/ad-marketplace`
2. Browse available ads
3. Use filters: search, sort by commission, minimum commission rate
4. Click "Promote This Ad" on desired ad
5. System generates:
   - Unique tracking code (e.g., `AD-abc123-INF-xyz789`)
   - Tracking URL (e.g., `https://app.com/dispensary/123?tc=AD-abc123-INF-xyz789`)
   - QR code for easy sharing
6. Copy URL and share on social media
7. Track performance in "My Promotions" tab

### Customer Clicks Tracking Link

1. Customer clicks influencer's tracking URL
2. `trackAdImpression()` fires on page load
3. System records:
   - Ad impression with tracking code
   - Updates ad analytics
   - Updates influencer selection analytics
4. Customer browses and adds items to cart
5. Customer checks out
6. `trackAdConversion()` Cloud Function triggers
7. System calculates commission and attributes to influencer

## 📊 Analytics & Tracking

### Dispensary Owner Analytics

**Dashboard (`/dispensary-admin/advertising`):**
- Total impressions, clicks, conversions, revenue
- Active ads list with performance
- Campaign status (Active, Scheduled, Drafts, Ended)

**Ad Detail Page (`/dispensary-admin/advertising/[id]`):**
- Real-time metrics cards
- Performance trend chart (impressions, clicks over time)
- Placement breakdown (pie chart)
- Influencer attribution table
- Top performing influencers
- ROI calculator

### Influencer Analytics

**Marketplace (`/dashboard/influencer/ad-marketplace`):**
- Browse ads with commission rates
- Filter by minimum commission
- Sort by commission, popularity, revenue

**My Promotions Tab:**
- Selected ads list
- Per-ad performance: impressions, clicks, sales, commission earned
- Tracking URLs with copy/share buttons
- Total earnings across all promoted ads

### Super Admin Analytics

**Platform Dashboard (`/admin/advertising`):**
- Platform-wide metrics
- Active ads, dispensaries, influencers
- Platform CTR, conversion rate
- Top performing ad types
- Dispensary leaderboard
- Influencer leaderboard
- Ad zone management

## 🔧 Configuration

### Commission Structure

Set in each ad when creating:
```typescript
influencerCommission: {
  availableToInfluencers: true,
  rate: 20, // 20% commission
  minInfluencerTier: 'growth' // Optional: restrict to tier
}
```

### Ad Placements

Available placements:
- `hero_banner` - Full-width top banner
- `product_grid` - Among product listings
- `sidebar` - Sticky sidebar
- `inline` - Between content sections

### Ad Types

- `special_deal` - Limited time offers (🔥 icon)
- `featured_product` - Highlighted products (⭐ icon)
- `product_bundle` - Bundle deals (📦 icon)
- `social_campaign` - Social media campaigns (🚀 icon)
- `custom` - Custom ad types (🎨 icon)

### Design Templates

1. **Gradient Hero** - Purple to pink gradient
2. **Product Showcase** - Blue to cyan gradient
3. **Bundle Deal** - Orange to red gradient

### Animations

- `fade` - Fade in
- `slide` - Slide in from left
- `pulse` - Pulsing effect
- `bounce` - Bounce in
- `zoom` - Zoom in
- `none` - No animation

## 🧪 Testing Checklist

### Dispensary Owner Tests
- [ ] Create ad with single product
- [ ] Create bundle ad with multiple products
- [ ] Set bundle price and verify savings calculation
- [ ] Enable influencer availability
- [ ] Publish ad and verify it appears in marketplace
- [ ] View ad detail page
- [ ] Pause/resume ad
- [ ] Export analytics CSV

### Influencer Tests
- [ ] Browse ad marketplace
- [ ] Filter ads by commission rate
- [ ] Sort ads by popularity/revenue
- [ ] Select an ad to promote
- [ ] Verify tracking URL generation
- [ ] View QR code
- [ ] Copy tracking URL
- [ ] View "My Promotions" tab
- [ ] Verify performance metrics update

### Tracking Tests
- [ ] Visit page with `AdBanner` component
- [ ] Verify impression is recorded in Firestore
- [ ] Click ad and verify click is recorded
- [ ] Place order with tracking code
- [ ] Verify conversion is recorded
- [ ] Verify commission is calculated
- [ ] Verify influencer earnings update

### Super Admin Tests
- [ ] View platform dashboard
- [ ] Export platform analytics
- [ ] View ad zones
- [ ] Review dispensary performance
- [ ] Review influencer performance

## 🐛 Troubleshooting

### Ads not showing in marketplace

**Check:**
1. Ad status is `active`
2. `influencerCommission.availableToInfluencers` is `true`
3. Current date is between `startDate` and `endDate`
4. Firestore indexes are created

**Fix:**
```bash
firebase firestore:indexes
```

### Tracking not working

**Check:**
1. Cloud Functions are deployed
2. `trackAdImpression` and `trackAdClick` functions are callable
3. Firestore rules allow creating impressions/clicks
4. Tracking code format is correct

**Debug:**
```typescript
// Add console logs in advertising-utils.ts
console.log('Tracking code:', trackingCode);
console.log('Ad ID:', adId);
```

### Commission not calculated

**Check:**
1. `trackAdConversion` Cloud Function is deployed
2. Order has `trackingCode` field
3. InfluencerAdSelection exists with matching tracking code
4. Selection status is `active`

**Debug:**
```typescript
// Check Cloud Functions logs
firebase functions:log --only trackAdConversion
```

### Charts not displaying

**Check:**
1. `recharts` is installed
2. Analytics data exists
3. Browser console for errors

**Fix:**
```bash
npm install recharts
```

### QR Code not showing

**Check:**
1. `qrcode.react` is installed
2. QRCodeSVG is imported correctly

**Fix:**
```bash
npm install qrcode.react
npm install --save-dev @types/qrcode.react
```

## 🎨 Customization

### Change Color Scheme

Update gradient classes in components:

```typescript
// Current: Purple-Pink
className="bg-gradient-to-r from-purple-600 to-pink-600"

// Change to: Green-Blue
className="bg-gradient-to-r from-green-600 to-blue-600"
```

### Add New Ad Type

1. Add to enum in `types/advertising.ts`:
```typescript
export type AdType = 
  | 'special_deal'
  | 'featured_product'
  | 'product_bundle'
  | 'social_campaign'
  | 'custom'
  | 'flash_sale'; // NEW
```

2. Add to wizard in `create/page.tsx`:
```typescript
{
  type: 'flash_sale',
  label: 'Flash Sale',
  description: 'Ultra-limited time offer',
  icon: <Zap />,
  gradient: 'from-yellow-500 to-orange-500',
  emoji: '⚡'
}
```

### Modify Commission Rates

Update in ad creation wizard or directly in Firestore:

```typescript
influencerCommission: {
  availableToInfluencers: true,
  rate: 25, // Change commission percentage
  minInfluencerTier: 'elite' // Restrict to tier
}
```

## 📈 Performance Optimization

### Caching Strategy

Implement caching for frequently accessed ads:

```typescript
// In hooks/use-advertising.ts
const [cache, setCache] = useState<Map<string, Advertisement>>(new Map());

// Check cache before Firestore query
if (cache.has(adId)) {
  return cache.get(adId);
}
```

### Pagination

Add pagination to marketplace:

```typescript
const [lastVisible, setLastVisible] = useState<any>(null);
const pageSize = 20;

const query = adsQuery
  .limit(pageSize)
  .startAfter(lastVisible);
```

### Image Optimization

Use Next.js Image component:

```tsx
import Image from 'next/image';

<Image
  src={product.imageUrl}
  alt={product.name}
  width={200}
  height={200}
  quality={85}
/>
```

## 🔒 Security Best Practices

1. **Never expose tracking codes** in client-side code without validation
2. **Validate all inputs** before creating ads
3. **Rate limit** impression/click tracking to prevent abuse
4. **Verify commission calculations** server-side only
5. **Audit ad data** regularly for suspicious activity

## 📞 Support

For issues or questions:
- Check Firestore rules: `firestore.rules`
- Review Cloud Functions logs: `firebase functions:log`
- Inspect browser console for client-side errors
- Test with Firebase Emulator Suite for development

## 🎉 Success Metrics

Track these KPIs to measure success:

### Platform Metrics
- Total ads created
- Active ads
- Total impressions/clicks/conversions
- Platform-wide CTR and conversion rate
- Total revenue attributed to ads

### Dispensary Metrics
- Ads per dispensary
- Average CTR per dispensary
- ROI (revenue vs ad investment)
- Top performing ad types

### Influencer Metrics
- Ads selected per influencer
- Average commission earned
- Top performing influencers
- Conversion rate by influencer tier

## 🚀 Future Enhancements

1. **A/B Testing** - Test different ad variations
2. **Smart Bidding** - Automated commission optimization
3. **Geo-Targeting** - Show ads based on user location
4. **Time-Based Scheduling** - Show ads at specific times
5. **Advanced Analytics** - ML-powered insights
6. **Video Ads** - Support video content
7. **Interactive Ads** - Gamified ad experiences
8. **Influencer Leaderboards** - Public rankings
9. **Ad Templates** - Pre-built designs
10. **Bulk Ad Creation** - Create multiple ads at once

---

## ✅ Deployment Complete!

Your innovative advertising system is now live! 🎉

**What makes it special:**
- ✨ Influencers SELECT which ads to promote (marketplace concept)
- 🔗 Automatic tracking URL generation
- 💰 Real-time commission attribution
- 📦 Product bundle creation
- 📊 Advanced analytics for all parties
- 🎮 Game-style UI making it fun and engaging
- 🚀 Better than TikTok's creator marketplace!

**Next steps:**
1. Create your first ad as a dispensary owner
2. Share the marketplace with influencers
3. Monitor analytics as tracking data flows in
4. Optimize commission rates based on performance
5. Scale to more dispensaries and influencers!
