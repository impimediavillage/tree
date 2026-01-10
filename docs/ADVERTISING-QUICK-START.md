# Advertising System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will get you up and running with the advertising system immediately.

## For Dispensary Owners

### Create Your First Ad (2 minutes)

1. **Navigate to Advertising Dashboard**
   ```
   /dispensary-admin/advertising
   ```

2. **Click "Create New Ad"** button

3. **Choose Ad Type:**
   - 🔥 **Special Deal** - Limited time offer
   - ⭐ **Featured Product** - Highlight a product
   - 📦 **Product Bundle** - Multiple products together
   - 🚀 **Social Campaign** - Social media push
   - 🎨 **Custom** - Your own design

4. **Fill in Details:**
   ```
   Title: "Summer Sale - 25% Off All Flower"
   Subtitle: "Limited Time Only"
   Description: "Get 25% off our entire flower collection..."
   Tagline: "While stocks last"
   CTA Button: "Shop Now"
   ```

5. **Select Products:**
   - Check products to include
   - Toggle "Bundle Deal" if multiple products
   - Enter bundle price (system shows savings)

6. **Choose Design:**
   - Template: Gradient Hero (purple-pink)
   - Animation: Fade in
   - Placements: ✅ Hero Banner, ✅ Product Grid
   - Priority: 80

7. **Influencer Settings:**
   - Toggle "Make Available to Influencers": ✅ ON
   - Commission Rate: 20%

8. **Click "Publish Ad"** 🎉

### View Performance

```
/dispensary-admin/advertising/[your-ad-id]
```

See real-time:
- 👁️ Impressions
- 🖱️ Clicks
- 🛒 Conversions
- 💵 Revenue

---

## For Influencers

### Promote Your First Ad (1 minute)

1. **Navigate to Ad Marketplace**
   ```
   /dashboard/influencer/ad-marketplace
   ```

2. **Browse Available Ads**
   - Filter by commission rate
   - Sort by highest commission first

3. **Select an Ad to Promote**
   - Click "Promote This Ad" button
   - System generates your unique tracking URL

4. **Get Your Tracking Link**
   ```
   https://app.com/dispensary/abc?tc=AD-123-INF-xyz
   ```
   - Copy link
   - Scan QR code
   - Share on social media

5. **Track Your Earnings**
   - Go to "My Promotions" tab
   - See impressions, clicks, sales
   - Watch your commission grow! 💰

---

## Display Ads on Your Site

### Homepage Hero Banner

```tsx
// app/page.tsx
import { AdBanner } from '@/components/advertising/AdBanner';

export default function HomePage() {
  return (
    <div>
      <AdBanner placement="hero_banner" />
      {/* Rest of your homepage */}
    </div>
  );
}
```

### Product Grid Ads

```tsx
// app/shop/page.tsx
import { FeaturedAdCard } from '@/components/advertising/FeaturedAdCard';

export default function ShopPage() {
  return (
    <div>
      <h1>Products</h1>
      
      {/* Show 3 featured ad cards */}
      <FeaturedAdCard placement="product_grid" limit={3} />
      
      {/* Your product grid */}
    </div>
  );
}
```

### Sidebar Ads

```tsx
// components/Layout.tsx
import { SidebarAd } from '@/components/advertising/SidebarAd';

export default function Layout() {
  return (
    <div className="grid grid-cols-4">
      <main className="col-span-3">
        {/* Main content */}
      </main>
      <aside>
        <SidebarAd placement="sidebar" />
      </aside>
    </div>
  );
}
```

### Inline Ads

```tsx
// app/blog/[slug]/page.tsx
import { InlineAd } from '@/components/advertising/InlineAd';

export default function BlogPost() {
  return (
    <article>
      <p>First paragraph...</p>
      <p>Second paragraph...</p>
      
      {/* Ad between content */}
      <InlineAd placement="inline" />
      
      <p>Third paragraph...</p>
    </article>
  );
}
```

---

## Test the Full Flow

### End-to-End Test (5 minutes)

1. **As Dispensary Owner:**
   - Create a bundle ad with 3 products
   - Set 20% commission
   - Publish ad

2. **As Influencer:**
   - Go to marketplace
   - Select the ad
   - Copy tracking URL

3. **As Customer:**
   - Open tracking URL in incognito
   - Browse products
   - Add to cart and checkout

4. **Verify Tracking:**
   - Check `adImpressions` collection in Firestore
   - Check `adClicks` collection
   - Check `adConversions` collection after order
   - Verify influencer `performance.commission` increased

---

## Quick Tips

### 💡 Best Practices

**For Dispensary Owners:**
- Use high-quality product images
- Keep titles short and punchy (under 10 words)
- Set competitive commission rates (15-25%)
- Enable multiple placements for max visibility
- Test different ad types to see what performs best

**For Influencers:**
- Promote ads that align with your audience
- Share tracking links across multiple platforms
- Update your bio with your best-performing ads
- Monitor analytics daily
- Request higher commission for exclusive deals

### 🎯 High-Converting Ad Formula

```
Title: [Action Word] + [Product] + [Benefit]
Example: "Save Big on Premium Flower This Week"

Subtitle: [Urgency or Value]
Example: "25% OFF - Limited Stock"

CTA: [Clear Action]
Example: "Shop Now" or "Grab Deal"
```

### 📊 Analytics to Watch

**Dispensary Owners:**
- CTR > 2% = Good performance
- Conversion Rate > 3% = Excellent
- ROI > 200% = Highly profitable

**Influencers:**
- 100+ clicks = Viral potential
- 10+ conversions = Strong audience match
- Commission > R500/week = Scale up!

---

## Common Issues & Fixes

### ❌ Ad not showing in marketplace

**Check:**
- Status is "Active"
- "Available to Influencers" is ON
- Current date is between start/end dates

**Fix:**
```typescript
// In Firestore, update ad document:
{
  status: 'active',
  influencerCommission: {
    availableToInfluencers: true,
    rate: 20
  }
}
```

### ❌ Tracking not working

**Check:**
- Tracking code in URL: `?tc=AD-xxx-INF-yyy`
- Cloud Functions deployed: `firebase deploy --only functions`
- Browser console for errors

**Fix:**
```bash
# Redeploy functions
cd functions
npm install
cd ..
firebase deploy --only functions
```

### ❌ Commission not calculated

**Check:**
- Order has `trackingCode` field
- InfluencerAdSelection exists
- Selection status is "active"

**Fix:**
```typescript
// When placing order, include:
{
  ...order,
  trackingCode: 'AD-xxx-INF-yyy',
  metadata: {
    trackingCode: 'AD-xxx-INF-yyy'
  }
}
```

---

## Quick Command Reference

### Deploy Everything

```bash
# Install dependencies
npm install recharts qrcode.react

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions

# Build and deploy app
npm run build
firebase deploy --only hosting
```

### Create Firestore Indexes

```bash
# Run this command and follow the link
firebase firestore:indexes

# Or create manually in Firebase Console
# Firestore > Indexes > Create Index
```

### Check Logs

```bash
# View all function logs
firebase functions:log

# View specific function
firebase functions:log --only trackAdConversion

# Follow logs in real-time
firebase functions:log --limit 50
```

---

## 🎉 You're Ready!

**What you can do now:**
- ✅ Create ads with product bundles
- ✅ Enable influencer marketplace
- ✅ Generate tracking URLs
- ✅ Display ads on your site
- ✅ Track performance in real-time
- ✅ Earn and pay commissions

**Next Level:**
- Set up automated email notifications
- Create ad performance leaderboards
- A/B test different ad variations
- Scale to multiple dispensaries
- Build influencer tiering system

---

## 📞 Need Help?

**Documentation:**
- Full Guide: `docs/ADVERTISING-SYSTEM-DEPLOYMENT.md`
- Type Definitions: `src/types/advertising.ts`
- Utility Functions: `src/lib/advertising-utils.ts`

**Debugging:**
1. Check browser console
2. Check Firebase Functions logs
3. Check Firestore security rules
4. Verify data in Firestore collections

**Testing:**
- Use Firebase Emulator Suite for local testing
- Test with incognito windows
- Use different user accounts

---

**Happy Advertising! 🚀**

Remember: This isn't just an ad system - it's an innovative marketplace where influencers and dispensaries collaborate to drive sales. Better than TikTok because every click is tracked, every commission is calculated, and everyone wins! 🎯💰
