# Admin Review Management System Documentation

## 🎯 Overview

The Admin Review Management System provides super admins with comprehensive tools to monitor, analyze, and manage all dispensary reviews across The Wellness Tree platform. This modern, full-featured dashboard includes analytics, CRUD operations, leaderboards, and moderation workflows.

## 🚀 Features

### 1. **Real-Time Analytics Dashboard**
- Platform-wide review statistics
- Rating distribution visualization
- Category performance tracking
- Trend analysis (30-day comparison)
- Review velocity metrics
- Engagement quality indicators

### 2. **Full CRUD Review Management**
- **Create**: Reviews created by users (auto-processed)
- **Read**: View all reviews with detailed information
- **Update**: Flag/unflag reviews for moderation
- **Delete**: Permanently remove inappropriate reviews

### 3. **Dispensary Leaderboard**
- Top 20 performers ranked by composite score
- Badge display and achievement tracking
- Performance insights (most reviewed, most badges)
- Direct links to dispensary admin pages

### 4. **Flagged Reviews Moderation**
- Dedicated moderation queue
- Restore or permanently delete flagged reviews
- Visual alerts for reviews requiring attention
- Batch processing capabilities (future)

### 5. **Advanced Filtering & Search**
- Search by order ID, user ID, or dispensary ID
- Filter by status (active/flagged)
- Filter by rating (high/medium/low)
- Real-time results

## 📂 File Structure

```
src/
├── app/admin/dashboard/reviews/
│   └── page.tsx                           # Main dashboard page
└── components/admin/reviews/
    ├── ReviewAnalytics.tsx                # Analytics & charts
    ├── ReviewManagementTable.tsx          # CRUD table
    ├── DispensaryLeaderboard.tsx          # Rankings
    └── FlaggedReviewsSection.tsx          # Moderation queue
```

## 🎨 UI Components

### Main Dashboard (`page.tsx`)

**Route**: `/admin/dashboard/reviews`

**Stats Cards** (4 cards):
1. **Total Reviews** - Total count + last 7 days
2. **Platform Rating** - Average rating + avg categories filled
3. **Credits Awarded** - Total + average per review
4. **Flagged Reviews** - Count + alert status

**Secondary Stats** (3 cards):
1. **Recent Activity** - 7 day / 30 day breakdown
2. **Top Performers** - Count of top-rated dispensaries
3. **Engagement Quality** - Category fill rate + completion %

**Tabbed Sections** (4 tabs):
- **Analytics**: Visual charts and trends
- **All Reviews**: Comprehensive CRUD table
- **Leaderboard**: Top dispensary rankings
- **Flagged**: Moderation queue with alerts

### Review Analytics Component

**Features**:
- **Rating Distribution** - Horizontal bar chart (1-10 stars)
- **Category Performance** - Average scores with progress bars
- **30-Day Trend** - Comparison with previous period
- **Review Velocity** - Average reviews per day
- **Top Categories** - Most filled categories ranked

**Visual Design**:
- Color-coded bars (green/blue/yellow/red based on score)
- Gradient card backgrounds matching theme
- Icons for each category (Package, Truck, DollarSign, etc.)
- Responsive grid layout

### Review Management Table

**Features**:
- **Search Bar** - Full-text search across IDs
- **Status Filter** - All / Active / Flagged
- **Rating Filter** - All / High (8-10) / Medium (5-7) / Low (1-4)
- **Action Buttons**:
  - 👁️ **View**: Full review details dialog
  - 🏴 **Flag**: Mark for moderation
  - ✅ **Unflag**: Restore to active
  - 🗑️ **Delete**: Permanent removal

**Table Columns**:
1. Date (relative time)
2. Rating badge (color-coded)
3. Order ID (truncated)
4. Dispensary ID (truncated)
5. Categories filled (X/7)
6. Credits awarded
7. Status badge
8. Action buttons

**View Dialog** includes:
- Overall rating with star visualization
- Order/User/Dispensary IDs (full)
- All category feedback
- Credits awarded
- Timestamp

**Delete Dialog** includes:
- Warning message
- Review summary
- Confirmation required

### Dispensary Leaderboard

**Features**:
- **Top 20 Ranking** by composite reviewScore
- **Medal System**:
  - 🏆 1st place: Gold trophy + yellow gradient
  - 🥈 2nd place: Silver medal + gray gradient
  - 🥉 3rd place: Bronze medal + orange gradient
  - 4-20: Numbered ranks
- **Display Info**:
  - Dispensary name + type
  - Average rating with stars
  - Total review count
  - Composite score
  - Earned badges with icons
  - Link to dispensary admin page

**Insights Cards** (3 cards):
1. **Top Performer** - #1 dispensary details
2. **Most Reviewed** - Highest review count
3. **Most Badges** - Most achievements earned

### Flagged Reviews Section

**Features**:
- **Visual Alerts** - Red gradient cards with warning icons
- **Review Cards** display:
  - Alert triangle icon
  - Rating badge
  - Relative timestamp
  - Order/User/Dispensary IDs
  - Category feedback badges
  - Credits awarded
- **Action Buttons**:
  - ✅ **Restore**: Move back to active
  - 🗑️ **Delete**: Permanent removal
- **Empty State**: Green "All Clear" card when no flags

**Dialogs**:
- **Restore Confirmation**: Green theme, simple confirm
- **Delete Confirmation**: Red theme, warning message

## 🔧 Admin Workflows

### Workflow 1: Monitor Platform Health

1. Navigate to `/admin/dashboard/reviews`
2. View overview stats cards:
   - Check total reviews and recent activity
   - Monitor platform average rating
   - Review credits awarded
   - Check for flagged reviews (red alert)
3. Switch to **Analytics tab**:
   - Review rating distribution
   - Check category performance
   - Analyze 30-day trend
   - Monitor review velocity

**Use Case**: Daily/weekly health check

---

### Workflow 2: Identify Bad Reviews

1. Go to **All Reviews tab**
2. Apply filters:
   - **Rating Filter**: Select "Low (1-4)"
   - **Status Filter**: "Active"
3. Review low-rated reviews:
   - Click 👁️ **View** to see details
   - Check category feedback for patterns
   - Assess if review is legitimate or suspicious
4. **If suspicious**:
   - Click 🏴 **Flag** button
   - Review moves to Flagged queue
5. **If legitimate**:
   - Leave active
   - Consider reaching out to dispensary for improvement

**Use Case**: Quality control and fraud detection

---

### Workflow 3: Moderate Flagged Reviews

1. Navigate to **Flagged tab**
2. Review each flagged review:
   - Check rating and feedback
   - Verify order/user/dispensary IDs
   - Assess legitimacy
3. **Decision Tree**:
   - **If false flag** → Click ✅ **Restore**
   - **If spam/fraud** → Click 🗑️ **Delete**
   - **If uncertain** → Leave flagged for further investigation
4. Confirm action in dialog

**Use Case**: Regular moderation queue processing

---

### Workflow 4: Manage Dispensary Performance

1. Switch to **Leaderboard tab**
2. Review top performers:
   - Check top 3 for reward eligibility
   - Identify dispensaries with multiple badges
   - Note patterns in high performers
3. Click 🔗 **External Link** to:
   - View dispensary admin page
   - Send congratulations message
   - Feature in marketing materials
4. Review insights cards:
   - **Most Reviewed**: High engagement indicator
   - **Most Badges**: Quality achievement
   - **Top Performer**: Overall excellence

**Use Case**: Identify dispensaries for rewards/features

---

### Workflow 5: Investigate Anomalies

1. **Scenario**: Dispensary rating drops suddenly
2. Go to **All Reviews tab**
3. Search for dispensary ID:
   - Enter ID in search bar
   - Reviews filtered instantly
4. Sort by date (most recent first)
5. Review recent feedback:
   - Click 👁️ **View** on recent reviews
   - Check category feedback patterns
   - Identify common issues (e.g., delivery_speed = "Very Late")
6. **Action**:
   - Contact dispensary about identified issue
   - Monitor for improvement
   - Consider flagging reviews if fraudulent

**Use Case**: Respond to rating changes

---

### Workflow 6: Clean Up Review Database

1. **Monthly maintenance task**
2. Go to **All Reviews tab**
3. Filter by **Status**: "Flagged"
4. Review old flagged items:
   - Sort by date
   - Check reviews flagged >30 days ago
5. Make final decisions:
   - Restore legitimate reviews
   - Delete confirmed spam/fraud
6. Document deleted reviews (if needed for audit trail)

**Use Case**: Database hygiene

---

### Workflow 7: Generate Performance Report

1. Go to **Analytics tab**
2. Note key metrics:
   - Platform average rating
   - Total reviews
   - Category averages
   - 30-day trend
   - Review velocity
3. Switch to **Leaderboard tab**
4. Export top 10 (future feature):
   - Screenshot or manual list
   - Include dispensary names, ratings, badges
5. Compile monthly report:
   - Platform health summary
   - Top performers
   - Areas for improvement
   - Engagement metrics

**Use Case**: Monthly reporting to stakeholders

## 📊 Metrics & KPIs

### Platform Health Metrics

1. **Total Reviews**: Growth indicator
2. **Platform Average Rating**: Overall quality (target: ≥8.0)
3. **Review Velocity**: Engagement rate (reviews/day)
4. **Category Fill Rate**: Quality of feedback (target: ≥50%)
5. **Flagged Rate**: Moderation workload (target: <5%)

### Dispensary Performance Metrics

1. **Average Rating**: Individual quality (0-10 scale)
2. **Total Reviews**: Engagement level
3. **Review Score**: Composite ranking metric
4. **Badges Earned**: Achievement count (0-7 badges)
5. **Recent Rating**: 30-day performance

### User Engagement Metrics

1. **Credits per Review**: Incentive effectiveness (avg: 5-20)
2. **Categories Filled**: Feedback depth (avg per review)
3. **Completion Rate**: Category fill % (target: ≥50%)
4. **Review Submission Rate**: % of orders reviewed

## 🎨 Design System

### Color Palette

**Status Colors**:
- **Active/Success**: Green (#10B981, #DCFCE7)
- **Warning/Flagged**: Red/Yellow (#EF4444, #FEE2E2)
- **Info**: Blue (#3B82F6, #DBEAFE)
- **Neutral**: Gray (#6B7280, #F3F4F6)

**Brand Colors**:
- **Primary Green**: #006B3E
- **Brown**: #3D2E17
- **Dark Green**: #004D2C
- **Muted**: #5D4E37

**Rating Colors**:
- **9-10**: Green (excellent)
- **7-8**: Blue (good)
- **5-6**: Yellow (average)
- **1-4**: Red (poor)

### Typography

- **Headings**: Font-bold, text-[#3D2E17]
- **Body**: Text-[#5D4E37]
- **Monospace**: IDs and codes
- **Numbers**: Font-extrabold for stats

### Card Styles

- **Shadow**: shadow-lg for primary cards
- **Border**: border-2 for emphasis
- **Gradient Backgrounds**: from-X-50 to-X-100 patterns
- **Hover**: hover:shadow-xl transitions

## 🔐 Access Control

**Required Role**: `super_admin`

**Route Protection**: Admin layout wraps all admin routes

**Firestore Rules** (should be configured):
```javascript
// Super admin can read all reviews
match /dispensaryReviews/{reviewId} {
  allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
  allow update, delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
}

// Super admin can read all review stats
match /dispensaryReviewStats/{dispensaryId} {
  allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super_admin';
}
```

## 🚀 Future Enhancements

### Phase 2 Features

1. **Bulk Operations**
   - Select multiple reviews
   - Bulk flag/unflag/delete
   - Export selected reviews to CSV

2. **Advanced Analytics**
   - Time-series charts (Chart.js or Recharts)
   - Category correlation analysis
   - Dispensary comparison tool
   - User engagement trends

3. **Automated Moderation**
   - AI-powered spam detection
   - Auto-flag reviews with profanity
   - Pattern recognition for fraud
   - Auto-restore false positives

4. **Notification System**
   - Email alerts for flagged reviews
   - Weekly performance digest
   - Achievement notifications for dispensaries
   - Threshold alerts (rating drops >1.0)

5. **Export & Reporting**
   - PDF report generation
   - CSV export with filters
   - Scheduled email reports
   - Custom date range analysis

6. **Review Response System**
   - Allow dispensaries to respond to reviews
   - Admin approval workflow for responses
   - Public display of responses
   - Response templates

7. **User Review History**
   - View all reviews by user ID
   - Identify serial reviewers
   - Review legitimacy scoring
   - Reward top reviewers

8. **Mobile Admin App**
   - React Native companion app
   - Push notifications for flags
   - Quick moderate actions
   - Performance dashboard

## 🧪 Testing Checklist

### UI Testing
- [ ] All tabs load without errors
- [ ] Stats cards display correctly
- [ ] Filters work in review table
- [ ] Search returns accurate results
- [ ] View dialog shows full review details
- [ ] Flag/unflag buttons work
- [ ] Delete confirmation prevents accidental deletion
- [ ] Leaderboard ranks correctly
- [ ] Badges display with proper icons
- [ ] Flagged queue shows alerts
- [ ] Restore/delete buttons work
- [ ] Responsive design on mobile/tablet

### Data Testing
- [ ] Stats accurately reflect Firestore data
- [ ] Rating distribution percentages add to 100%
- [ ] Category averages calculated correctly
- [ ] 30-day trend comparison accurate
- [ ] Review velocity matches actual rate
- [ ] Leaderboard sorted by reviewScore
- [ ] Flagged reviews filter correctly
- [ ] Search finds all matching reviews

### Edge Cases
- [ ] Empty states display when no reviews
- [ ] Zero flagged reviews shows "All Clear"
- [ ] Very long dispensary names truncate
- [ ] Large review counts format with commas
- [ ] Deleted reviews trigger recalculation
- [ ] Concurrent admin actions don't conflict

## 📝 Maintenance

### Daily Tasks
- Check flagged reviews queue
- Monitor platform rating
- Review recent activity stats

### Weekly Tasks
- Process all flagged reviews
- Review rating distribution
- Check for anomalies in trends
- Update leaderboard insights

### Monthly Tasks
- Generate performance report
- Clean up old flagged reviews
- Analyze category trends
- Identify top performers for rewards
- Review metrics vs. targets

## 🆘 Troubleshooting

### Issue: Stats Not Loading
**Symptoms**: Dashboard shows "Loading..." indefinitely
**Causes**: Firestore connection issues, missing collections
**Solutions**:
1. Check browser console for errors
2. Verify Firestore rules allow super_admin read
3. Ensure dispensaryReviews collection exists
4. Check network tab for failed requests

### Issue: Filters Not Working
**Symptoms**: Filters don't change displayed reviews
**Causes**: State management issues, filter logic errors
**Solutions**:
1. Refresh page
2. Clear browser cache
3. Check console for JavaScript errors
4. Verify filter state updates in React DevTools

### Issue: Delete Not Triggering Recalculation
**Symptoms**: Stats don't update after deleting review
**Causes**: Cloud Function not triggering, Firestore rules
**Solutions**:
1. Check Cloud Function logs
2. Manually trigger recalculateDispensaryReviewStats
3. Refresh dashboard after 10 seconds
4. Verify Cloud Function has write permissions

### Issue: Leaderboard Shows Wrong Rankings
**Symptoms**: Dispensaries ranked incorrectly
**Causes**: reviewScore not calculated, old data cached
**Solutions**:
1. Trigger manual recalculation for all dispensaries
2. Check reviewScore field exists in dispensary docs
3. Verify composite score algorithm
4. Clear browser cache

## 🎓 Best Practices

1. **Regular Monitoring**
   - Check dashboard daily for flagged reviews
   - Process flags within 24 hours
   - Monitor platform rating weekly

2. **Fair Moderation**
   - Only flag reviews with clear violations
   - Always investigate before deleting
   - Document reasons for deletions
   - Consider restoration for borderline cases

3. **Data Integrity**
   - Verify stats match expectations
   - Cross-reference with Firestore Console
   - Test filters before making decisions
   - Export data before bulk operations

4. **Performance**
   - Limit queries to recent data when possible
   - Use pagination for large datasets (future)
   - Cache frequently accessed data
   - Optimize images and assets

5. **Communication**
   - Notify dispensaries of performance changes
   - Congratulate top performers
   - Address concerns from flagged reviews
   - Share insights with stakeholders

---

**Documentation Version**: 1.0  
**Last Updated**: December 2025  
**System Status**: ✅ Production Ready
