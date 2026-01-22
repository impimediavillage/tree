# 🎮 Tutorial System - Quick Reference

## 🚀 Fast Start

```bash
# 1. Install packages
npm install driver.js framer-motion

# 2. Add to root layout (src/app/layout.tsx)
import { TutorialProvider } from '@/contexts/TutorialContext';

<TutorialProvider>
  {children}
</TutorialProvider>

# 3. Add to dispensary layout
import { TutorialLauncher } from '@/components/tutorial/TutorialLauncher';
import { TutorialManager } from '@/components/tutorial/TutorialManager';
import { TutorialTriggerButton } from '@/components/tutorial/TutorialTriggerButton';

<>
  {children}
  <TutorialLauncher />
  <TutorialManager />
  <TutorialTriggerButton />
</>

# 4. Add data-tour attributes to your pages
<button data-tour="add-product-btn">Add Product</button>
```

## 📦 System Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `TutorialProvider` | State management | Wrap app root |
| `TutorialLauncher` | Game menu | Add to dashboard |
| `TutorialManager` | Tour orchestrator | Add to dashboard |
| `TutorialTriggerButton` | Floating button | Add to dashboard |
| `ChatBubble` | AI assistant | Auto-displayed |
| `AnimatedPointer` | Arrow guides | Auto-displayed |
| `ConfettiExplosion` | Celebrations | Auto-triggered |

## 🎯 Required Data Tour Attributes

### Products Page
```tsx
data-tour="products-nav"       // Navigation
data-tour="add-product-btn"    // Add button
data-tour="product-filters"    // Filters section
data-tour="product-list"       // Product grid
data-tour="product-card"       // Individual product
data-tour="stock-indicator"    // Stock badge
data-tour="bulk-actions"       // Bulk toolbar
data-tour="product-categories" // Category tabs
data-tour="pricing-tools"      // Pricing section
data-tour="product-analytics"  // Metrics
```

### Orders Page
```tsx
data-tour="orders-nav"           // Navigation
data-tour="order-tabs"           // Status tabs
data-tour="order-card"           // Order item
data-tour="order-actions"        // Quick actions
data-tour="order-details"        // Full details
data-tour="customer-info"        // Customer section
data-tour="shipping-label"       // Shipping area
data-tour="order-filters"        // Filters
data-tour="bulk-update"          // Bulk actions
data-tour="order-notifications"  // Notifications
```

### Analytics Page
```tsx
data-tour="analytics-nav"      // Navigation
data-tour="key-metrics"        // KPI cards
data-tour="revenue-chart"      // Revenue graph
data-tour="top-products"       // Top sellers
data-tour="order-status"       // Status chart
data-tour="customer-insights"  // Customer data
data-tour="time-selector"      // Date picker
data-tour="export-data"        // Export button
data-tour="influencer-section" // Commission breakdown
data-tour="recommendations"    // AI tips
```

### Advertising Page
```tsx
data-tour="advertising-nav"    // Navigation
data-tour="create-campaign"    // Create button
data-tour="product-bundle"     // Product selector
data-tour="ad-bonus-rate"      // Bonus input ⭐
data-tour="bonus-calculator"   // Cost calculator
data-tour="campaign-details"   // Campaign form
data-tour="targeting"          // Targeting options
data-tour="active-campaigns"   // Campaign list
data-tour="campaign-analytics" // Metrics
data-tour="influencer-list"    // Promoters list
```

### Settings Page
```tsx
data-tour="settings-nav"         // Navigation
data-tour="profile-section"      // Profile form
data-tour="operating-hours"      // Business hours
data-tour="payment-methods"      // Payment setup
data-tour="notification-settings"// Notifications
data-tour="shipping-zones"       // Shipping config
data-tour="tax-settings"         // Tax/compliance
data-tour="branding"             // Branding section
data-tour="integrations"         // Third-party apps
data-tour="security"             // Security settings
```

## 🎮 Gamification System

### Points
- **10 pts** = Complete a step
- **100 pts** = Complete a tutorial
- **50 pts** = Unlock achievement

### Achievements
- 🎓 Tutorial Rookie (first tutorial)
- 📦 Product Master (products tutorial)
- 📋 Order Wizard (orders tutorial)
- 📊 Analytics Pro (analytics tutorial)
- 📢 Ad Champion (advertising tutorial)
- ⚙️ Settings Expert (settings tutorial)
- ⚡ Speed Learner (3 in one session)
- 👑 Master Completionist (all tutorials)

## 🎨 Customization Shortcuts

### Change Colors
**File**: `TutorialLauncher.tsx` line 132
```tsx
// Background
from-purple-900 via-indigo-900 to-blue-900

// Change to your brand:
from-[#006B3E] via-[#3D2E17] to-[#5D4E37]
```

### Add Tutorial
**File**: `tutorials/tutorialContent.ts`
```tsx
export const myTutorialSteps = [
  {
    element: '[data-tour="my-element"]',
    popover: {
      title: 'Title',
      description: 'Description',
      side: 'bottom' as const,
    },
    chatMessage: 'Chat message',
    showPointer: true,
  },
];

// Add to exports
export const tutorialContent = {
  // ... existing
  'my-tutorial': myTutorialSteps,
};
```

**File**: `TutorialLauncher.tsx` line 50
```tsx
const TUTORIALS: Tutorial[] = [
  // ... existing
  {
    id: 'my-tutorial',
    title: 'My Tutorial',
    description: 'Learn this!',
    icon: <Star className="h-6 w-6" />,
    duration: '5 min',
    difficulty: 'Beginner',
    points: 100,
    category: 'Core',
  },
];
```

### Change Point Values
**File**: `TutorialContext.tsx`
```tsx
// Tutorial completion (line 107)
setTotalPoints(prev => prev + 100); // Change 100

// Step completion (line 145)
setTotalPoints(prev => prev + 10); // Change 10

// Achievement unlock (line 194)
setTotalPoints(p => p + 50); // Change 50
```

## 🔧 Debug Commands

```tsx
// Reset all progress (browser console)
localStorage.clear();

// Check current progress
localStorage.getItem('tutorial-progress-{userId}');

// Check achievements
localStorage.getItem('tutorial-achievements-{userId}');

// Check points
localStorage.getItem('tutorial-points-{userId}');

// Force show launcher
import { useTutorial } from '@/contexts/TutorialContext';
const { openLauncher } = useTutorial();
openLauncher();

// Start specific tutorial
const { startTutorial } = useTutorial();
startTutorial('product-management');
```

## 📱 Responsive Breakpoints

- **Mobile**: Single column layout
- **Tablet**: 2 columns in grid
- **Desktop**: 3 columns in grid
- **Launcher**: Full screen on mobile, centered modal on desktop

## 🎯 Best Practices

1. **Keep steps concise** - 5-10 steps per tutorial
2. **Use chat bubbles** - Add personality with friendly messages
3. **Pointer on first step** - Guide attention immediately
4. **Highlight key features** - Focus on what's new/important
5. **End with celebration** - Confetti + achievement unlock
6. **Test on all devices** - Ensure responsive
7. **Update regularly** - Add tutorials for new features

## 🚨 Common Issues

| Issue | Solution |
|-------|----------|
| Tutorial not starting | Add `data-tour` attributes |
| Element not highlighting | Ensure element is visible |
| Progress not saving | Check if user is logged in |
| Styles look wrong | Verify Tailwind config |
| Animations laggy | Reduce blur/shadow effects |

## ✅ Pre-Launch Checklist

- [ ] Packages installed
- [ ] Provider added to layout
- [ ] Components added to dashboard
- [ ] All data-tour attributes added
- [ ] Tested each tutorial (5 total)
- [ ] Mobile responsive tested
- [ ] Colors match brand
- [ ] Content proofread
- [ ] Achievement system working
- [ ] Points system working

## 📊 Expected User Flow

1. User logs into dispensary dashboard
2. Sees floating graduation cap button (bottom right)
3. Clicks button → Game-style launcher opens
4. Browses tutorials with preview info
5. Clicks "Start Tutorial" on one
6. Follows interactive steps with chat bubbles
7. Completes tutorial → Confetti explosion!
8. Earns points + achievement badge
9. Returns to launcher to try more

## 🎉 Success Metrics

- **Engagement**: % of users who start a tutorial
- **Completion**: % who finish tutorials
- **Time to complete**: Average duration
- **Most popular**: Which tutorial is started most
- **Retention**: Do users complete multiple tutorials?

---

**Quick Links**:
- [Full Implementation Guide](./TUTORIAL-SYSTEM-IMPLEMENTATION.md)
- [Commission Structure Docs](./COMMISSION-STRUCTURE-EXPLAINED.md)

**Support**: Add to GitHub issues or contact support

---

✨ **Ready to launch!** Your tutorial system is production-ready! 🚀
