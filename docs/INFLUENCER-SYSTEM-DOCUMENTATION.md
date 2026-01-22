# 🌟 The Wellness Tree - Influencer & Affiliate System

## Overview
A revolutionary influencer program where wellness advocates earn commissions while building healing communities. Features tier-based rewards, automatic payouts, and gamification.

---

## 🎯 Key Features

### 1. **Tiered Commission Structure**
Influencers progress through 5 tiers based on monthly sales:

| Tier | Min Sales | Commission | Icon |
|------|-----------|------------|------|
| **Seed Planter** | 0 | 5% | 🌱 |
| **Sprout Grower** | 11 | 8% | 🌿 |
| **Growth Champion** | 51 | 12% | 🌾 |
| **Bloom Master** | 101 | 15% | 🌺 |
| **Forest Guardian** | 251 | 20% | 🌳 |

### 2. **Bonus Multipliers**
- **Video Content Bonus**: +2% for creating educational videos
- **Tribe Engagement Bonus**: +3% for active community management
- **Seasonal Campaigns**: Up to +5% during special promotions

### 3. **Automatic Monthly Payouts**
- Runs on the 1st of each month at midnight (SAST)
- Minimum payout: R500
- Methods: PayFast, Bank Transfer, or Wellness Credits
- Instant processing for approved influencers

### 4. **Digital Forest Visualization**
Real-time dashboard showing influencer growth as a tree:
- **Seed**: Just starting (1-10 sales)
- **Sprout**: Growing presence (11-50 sales)
- **Growth**: Established influence (51-100 sales)
- **Bloom**: Thriving community (101-250 sales)
- **Forest**: Wellness leader (251+ sales)

### 5. **Gamification & Achievements**
**Badges:**
- 🎉 First Sale
- 🎁 Bundle Master (10 bundles created)
- 🌍 Community Builder (100 tribe members)
- 🎬 Video Star (10 video posts)
- 📅 Consistent Creator (30-day streak)
- 💰 Top Earner (R10,000 in one month)
- 👑 Tribe Leader (500 tribe members)
- ⚡ Wellness Warrior (R100,000 lifetime)

**XP System:**
- 100 XP per sale
- 50 XP per tribe post
- 200 XP per video created
- Level up every 1,000 XP

---

## 📋 Application Process

### Requirements
- Active user account
- Bio & healing story
- Select wellness niches
- Optional: Social media profiles

### Approval Flow
1. User submits application
2. Super admin reviews
3. Approval creates influencer profile
4. User document updated with `isInfluencer: true`
5. Referral code activated

---

## 🔗 Referral Tracking System

### How It Works
1. **URL Detection**: ReferralContext detects `?ref=CODE` in URL
2. **localStorage Storage**: Code stored for 30 days
3. **Click Logging**: `/api/influencer/track-click` logs analytics
4. **Checkout Integration**: PaymentStep adds `referralCode` to orders
5. **Commission Calculation**: Cloud Function triggers on order delivery

### Referral Code Format
- Auto-generated from display name
- Format: `[NAME][3-DIGIT-RANDOM]`
- Example: `RASTAGUY420`, `HEALER123`
- All uppercase, alphanumeric only

### Referral Link
```
https://wellnesstree.co.za?ref=RASTAGUY420
```

---

## 💾 Firestore Collections

### `influencers`
```typescript
{
  id: string;
  userId: string;
  displayName: string;
  email: string;
  profileImage?: string;
  bio: string;
  healingStory?: string;
  referralCode: string;
  referralLink: string;
  primaryNiche: string[];
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    facebook?: string;
  };
  status: 'pending' | 'active' | 'suspended' | 'deactivated';
  tier: 'seed' | 'sprout' | 'growth' | 'bloom' | 'forest';
  commissionRate: number;
  stats: {
    totalClicks: number;
    totalConversions: number;
    totalSales: number;
    totalEarnings: number;
    pendingEarnings: number;
    lifetimeEarnings: number;
    currentMonthSales: number;
    currentMonthEarnings: number;
    tribeMembers: number;
    bundles: number;
    liveEvents: number;
    badges: string[];
    level: number;
    xp: number;
  };
  bonusMultipliers: {
    videoContent: boolean;
    tribeEngagement: boolean;
    seasonalBonus: number;
  };
  payoutInfo: {
    method: 'payfast' | 'bank_transfer' | 'wellness_credits';
    bankDetails?: {...};
    minimumPayout: number;
  };
  appliedAt: Timestamp;
  approvedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `referralClicks`
```typescript
{
  id: string;
  influencerId: string;
  referralCode: string;
  visitorId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string; // utm_source
  landingPage: string;
  timestamp: Timestamp;
  converted: boolean;
  conversionOrderId?: string;
}
```

### `influencerCommissions`
```typescript
{
  id: string;
  influencerId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderTotal: number;
  orderSubtotal: number;
  dispensaryId: string;
  dispensaryName: string;
  commissionRate: number;
  commissionAmount: number;
  bonusAmount: number;
  totalEarnings: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payoutId?: string;
  paidAt?: Timestamp;
  orderDate: Timestamp;
  approvedAt?: Timestamp;
  createdAt: Timestamp;
}
```

### `influencerPayouts`
```typescript
{
  id: string;
  influencerId: string;
  influencerName: string;
  influencerEmail: string;
  amount: number;
  commissionIds: string[];
  commissionCount: number;
  payoutMethod: 'payfast' | 'bank_transfer' | 'wellness_credits';
  bankDetails?: {...};
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentReference?: string;
  failureReason?: string;
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  processedBy?: string;
  adminNotes?: string;
}
```

---

## ⚙️ Cloud Functions

### `calculateCommissionOnOrderDelivered`
**Trigger**: Callable (manual or automated)
**Purpose**: Calculate and record commission when order status = 'delivered'

**Flow**:
1. Verify order has referral code
2. Find active influencer by code
3. Calculate base commission (orderSubtotal * rate)
4. Add bonus multipliers
5. Create `influencerCommissions` document
6. Update influencer stats
7. Mark referral click as converted

### `getInfluencerStats`
**Trigger**: Callable
**Purpose**: Fetch dashboard data for influencer

**Returns**:
```typescript
{
  profile: InfluencerProfile;
  commissions: InfluencerCommission[];
  monthlyEarnings: number;
  monthlySales: number;
}
```

### `processPayouts` (Scheduled)
**Trigger**: Every Friday at midnight
**Purpose**: Auto-process weekly payouts

**Flow**:
1. Query influencers with `pendingBalance >= minimumPayout`
2. Get all pending commissions
3. Create payout record
4. Update commissions to 'confirmed'
5. Move balance from pending to available

### `resetMonthlySales` (Scheduled)
**Trigger**: 1st of each month at midnight
**Purpose**: Reset monthly sales counters for tier recalculation

---

## 🎨 UI Components

### Influencer Dashboard (`/dashboard/influencer`)
- Digital Forest visualization
- Real-time earnings stats
- Referral link copy/share
- Tier progress bar
- Achievements display
- Commission history table
- Quick actions (create bundle, post video, schedule live)

### Admin Management (`/admin/dashboard/influencers`)
- List all influencers with filters
- Approve/reject applications
- Manual tier adjustments
- Suspend/activate accounts
- Payout processing
- Performance leaderboard

### Application Form (`/dashboard/influencer/apply`)
- Bio & healing story
- Wellness niche selection
- Social media links
- Terms agreement
- Auto-generates referral code

---

## 🔐 Security & Permissions

### User Document Updates
When approved, user document gets:
```typescript
{
  isInfluencer: true,
  influencerProfile: {
    id: string;
    referralCode: string;
    tier: string;
  }
}
```

### API Authentication
All influencer API routes require:
```typescript
Authorization: Bearer [Firebase ID Token]
```

Admin routes additionally check:
```typescript
user.role === 'superadmin'
```

---

## 📊 Analytics & Tracking

### Metrics Tracked
- Click-through rate (CTR)
- Conversion rate
- Average order value (AOV)
- Earnings per click (EPC)
- Monthly growth rate
- Tribe engagement rate

### Dashboard Graphs
- Earnings over time (line chart)
- Sales by dispensary type (pie chart)
- Commission breakdown (bar chart)
- Tier progression timeline

---

## 🚀 Deployment Steps

### 1. Deploy Cloud Functions
```bash
cd functions
npm run build
firebase deploy --only functions:calculateCommissionOnOrderDelivered,functions:getInfluencerStats,functions:processPayouts,functions:resetMonthlySales
```

### 2. Create Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

**Required Composite Indexes**:
- `influencers`: `userId` (ASC), `status` (ASC)
- `influencers`: `referralCode` (ASC), `status` (ASC)
- `referralClicks`: `influencerId` (ASC), `converted` (ASC), `timestamp` (DESC)
- `influencerCommissions`: `influencerId` (ASC), `status` (ASC), `createdAt` (DESC)
- `influencerPayouts`: `influencerId` (ASC), `status` (ASC), `requestedAt` (DESC)

### 3. Deploy Frontend
```bash
npm run build
firebase deploy --only hosting
```

---

## 🧪 Testing Checklist

- [ ] Apply as influencer (pending status)
- [ ] Admin approve influencer (status = active)
- [ ] Visit site with `?ref=CODE`
- [ ] Complete order with referral
- [ ] Mark order as delivered
- [ ] Verify commission created
- [ ] Check influencer dashboard stats
- [ ] Test payout threshold (R500)
- [ ] Verify weekly payout run
- [ ] Test tier progression

---

## 🎯 Future Enhancements

### Phase 2 (Q1 2026)
- [ ] Bundle creator tool
- [ ] Live shopping events
- [ ] Wellness tribes (communities)
- [ ] Collaborative commissions
- [ ] AI match-making (influencer to product)

### Phase 3 (Q2 2026)
- [ ] Mobile app integration
- [ ] Video content library
- [ ] Influencer marketplace
- [ ] Brand partnership program
- [ ] International expansion

---

## 📞 Support

**For Influencers:**
- Email: influencers@wellnesstree.co.za
- WhatsApp: +27 XX XXX XXXX
- Dashboard: `/dashboard/influencer`

**For Admins:**
- Management Panel: `/admin/dashboard/influencers`
- Payout Processing: Manual or automated

---

## 📝 Changelog

### v1.0.0 (December 2024)
- ✅ Core influencer system
- ✅ Referral tracking
- ✅ Commission calculation
- ✅ Tiered rewards (5-20%)
- ✅ Weekly auto-payouts
- ✅ Gamification (badges, XP, levels)
- ✅ Digital Forest visualization
- ✅ Admin management panel
- ✅ Application system

---

**Built with 🌿 by The Wellness Tree Team**
