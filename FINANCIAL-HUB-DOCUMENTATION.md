# Super Admin Financial Reconciliation Hub 💰

## Overview

The Financial Hub is a comprehensive super admin dashboard for reconciling all platform financial data, tracking revenue streams, managing expenses, and maintaining financial health across The Wellness Tree ecosystem.

**Location**: `/admin/dashboard/financial-hub`

---

## Key Features

### 🎯 Core Capabilities

1. **Side Panel Navigation**
   - Easy switching between financial sections
   - Overview, Treehouse, Dispensaries, Shipping, Credits, Platform Fees
   - Visual indicators for active sections

2. **Rich Financial Analytics**
   - Real-time revenue tracking
   - Profit margin calculations
   - Payment success rates
   - Daily revenue trends
   - Financial health indicators

3. **Multi-Source Data Integration**
   - Treehouse commission tracking
   - Dispensary platform fees
   - Shipping cost reconciliation
   - Credit transaction management
   - Platform fee tracking

4. **CRUD Operations**
   - Add, edit, delete transactions
   - Update payment statuses
   - Mark items as paid/processed
   - Bulk operations support

5. **Advanced Filtering & Search**
   - Date range filtering (7d, 30d, 90d, month, year, all)
   - Search by creator, product, dispensary
   - Status filtering
   - Transaction type filtering

6. **Export Capabilities**
   - CSV export for all sections
   - Formatted with dates in filename
   - Ready for accounting software import

---

## Financial Sections

### 1. Overview Dashboard

**Metrics Displayed:**
- **Total Revenue**: All platform earnings combined
- **Total Expenses**: Shipping and operational costs
- **Net Profit**: Revenue minus expenses
- **Pending Payments**: Outstanding creator/dispensary payments

**Visual Components:**
- Revenue source breakdown with progress bars
- 30-day revenue trend chart
- Financial health indicators
- Profit margin percentage
- Average daily revenue
- Payment success rate

**Color Coding:**
- Green: Revenue/Income
- Red: Expenses
- Blue: Net Profit
- Purple: Pending Payments

---

### 2. Treehouse Transactions

**Tracks:**
- Creator commission earnings (25% of product sales)
- Order details and dates
- Payment statuses (pending, paid, disputed)
- Creator performance

**Features:**
- Search by creator name or product
- Filter by payment status
- Mark transactions as paid
- Export creator payment reports

**Data Fields:**
- Creator Name
- Product Name
- Order Date
- Order Amount
- Commission (25%)
- Payment Status
- Actions (Mark Paid, Edit)

**Use Cases:**
1. **Weekly Creator Payouts**
   - Filter by pending status
   - Review commission amounts
   - Mark as paid after processing
   - Export payment report

2. **Creator Performance Analysis**
   - Search specific creators
   - View total earnings
   - Identify top performers

---

### 3. Dispensary Revenues

**Tracks:**
- Monthly dispensary revenues
- Platform fees (5% of revenue)
- Order counts
- Net revenue to dispensaries
- Payment processing status

**Features:**
- Monthly aggregation by dispensary
- Automatic fee calculation
- Status workflow (pending → processed → paid)
- Revenue breakdown

**Data Fields:**
- Dispensary Name
- Month
- Gross Revenue
- Order Count
- Platform Fee (5%)
- Net Revenue (95%)
- Status
- Actions

**Status Workflow:**
1. **Pending**: Revenue calculated but not yet processed
2. **Processed**: Verified and ready for payment
3. **Paid**: Payment completed

**Use Cases:**
1. **Monthly Dispensary Billing**
   - Review monthly revenues
   - Verify platform fee calculations
   - Process payments
   - Export for accounting

2. **Dispensary Performance Tracking**
   - Compare month-over-month growth
   - Identify top-performing dispensaries
   - Monitor order volumes

---

### 4. Shipping Costs

**Integration:**
- Links to existing Shipping Reconciliation system
- Displays total shipping expenses
- Contributes to expense calculations

**Features:**
- Summary of shipping costs for date range
- Direct link to full reconciliation dashboard
- Cost impact on profit margins

**Quick Access:**
- "View Full Shipping Reconciliation" button
- Seamless navigation to detailed shipping dashboard

---

### 5. Credit Transactions

**Tracks:**
- Credit purchases (users buying credits)
- Credit usage (credits spent on platform)
- Refunds (credit reversals)
- Bonus credits (promotional)

**Features:**
- Transaction type breakdown
- User credit history
- Amount and credit conversions
- Status tracking

**Data Fields:**
- User Name
- Transaction Type (purchase, usage, refund, bonus)
- Amount (ZAR)
- Credits
- Date & Time
- Description
- Status

**Visual Summary Cards:**
- Total Purchases
- Total Usage
- Total Refunds
- Total Bonuses

**Use Cases:**
1. **Credit System Reconciliation**
   - Verify purchase amounts
   - Track credit redemptions
   - Monitor refund requests

2. **Revenue from Credits**
   - Calculate credit sales
   - Analyze purchase patterns
   - Identify power users

---

### 6. Platform Fees

**Tracks:**
- Fees from different sources (treehouse, dispensary, shipping)
- Monthly fee calculations
- Fee percentages and amounts
- Collection status

**Features:**
- Source-based categorization
- Custom fee percentages
- Collection tracking
- Notes and documentation

**Data Fields:**
- Source (Treehouse/Dispensary/Shipping)
- Month
- Base Amount
- Fee Percentage
- Fee Amount
- Collected (Yes/No)
- Notes
- Actions

**Use Cases:**
1. **Fee Collection Tracking**
   - Monitor outstanding fees
   - Mark fees as collected
   - Generate fee reports

2. **Revenue Attribution**
   - Break down revenue by source
   - Calculate effective fee rates
   - Plan pricing strategies

---

## Financial Metrics Explained

### Key Performance Indicators (KPIs)

1. **Profit Margin**
   ```
   Profit Margin = (Net Profit / Total Revenue) × 100
   ```
   - **Healthy**: > 20%
   - **Good**: 10-20%
   - **Needs Attention**: < 10%

2. **Average Daily Revenue**
   ```
   Avg Daily Revenue = Total Revenue / Days in Period
   ```
   - Measures consistent income
   - Helps forecast future revenue
   - Identifies growth trends

3. **Payment Success Rate**
   ```
   Success Rate = (Completed Payments / Total Payments) × 100
   ```
   - **Excellent**: > 95%
   - **Good**: 90-95%
   - **Needs Improvement**: < 90%

### Revenue Breakdown

**Sources:**
- **Treehouse Commissions**: 25% of creator product sales
- **Dispensary Fees**: 5% of dispensary revenues
- **Credit Sales**: Direct credit purchases
- **Platform Fees**: Various service fees

**Visual Representation:**
- Progress bars showing percentage of total
- Color-coded by source type
- Real-time calculations

---

## Date Range Filtering

### Available Ranges:

1. **Last 7 Days**: Quick weekly snapshot
2. **Last 30 Days**: Monthly performance (default)
3. **Last 90 Days**: Quarterly trends
4. **This Month**: Current month-to-date
5. **This Year**: Year-to-date performance
6. **All Time**: Complete historical data

### Impact on Data:
- Filters all transactions by date
- Recalculates all metrics
- Updates charts and trends
- Affects export data

---

## Export Functionality

### CSV Export Format:

**Filename Pattern**: `{section}-{date}.csv`
Example: `treehouse-2025-12-18.csv`

**Included Data:**
- All visible table columns
- Formatted dates
- Calculated values
- Status information

**Use Cases:**
1. **Accounting Integration**
   - Import into QuickBooks, Xero, etc.
   - Create financial statements
   - Tax preparation

2. **Reporting**
   - Share with stakeholders
   - Create custom reports
   - Archive historical data

---

## Workflow Examples

### 1. Monthly Financial Close

**Steps:**
1. Navigate to Overview
2. Set date range to "This Month"
3. Review all key metrics
4. Check profit margin and revenue trends
5. Navigate to each section:
   - **Treehouse**: Process pending creator payments
   - **Dispensaries**: Verify monthly revenues
   - **Credits**: Reconcile credit transactions
   - **Fees**: Mark collected fees
6. Export all sections to CSV
7. Generate financial reports

**Time Estimate**: 30-45 minutes

---

### 2. Creator Payout Processing

**Steps:**
1. Navigate to Treehouse section
2. Filter status to "Pending"
3. Review commission amounts
4. Verify order details
5. Mark transactions as "Paid"
6. Export payment report
7. Send payment notifications

**Time Estimate**: 15-20 minutes

---

### 3. Dispensary Billing

**Steps:**
1. Navigate to Dispensaries section
2. Set date range to "This Month"
3. Review monthly revenues
4. Verify order counts
5. Check platform fee calculations
6. Update status to "Processed"
7. Generate invoices
8. Mark as "Paid" after payment

**Time Estimate**: 20-30 minutes

---

### 4. Financial Health Check

**Steps:**
1. Navigate to Overview
2. Review financial health indicators:
   - Profit margin (target: > 20%)
   - Payment success rate (target: > 95%)
   - Revenue trends (target: consistent growth)
3. Check for anomalies:
   - Unusual expense spikes
   - Pending payment backlogs
   - Revenue drops
4. Investigate issues in specific sections
5. Take corrective actions

**Frequency**: Weekly or bi-weekly

---

## Integration with Existing Systems

### Shipping Reconciliation
- **Location**: `/admin/dashboard/shipping-reconciliation`
- **Integration**: Shipping costs feed into Financial Hub expenses
- **Data Flow**: Shipping reconciliation → Financial Hub overview
- **Access**: Direct navigation button from Shipping section

### Order Management
- **Source**: Orders collection in Firestore
- **Data Used**: 
  - Order amounts
  - Creator IDs
  - Dispensary IDs
  - Payment statuses
- **Updates**: Real-time via Firestore queries

### Credit System
- **Source**: creditTransactions collection
- **Tracking**: All credit purchases, usage, refunds, bonuses
- **Revenue Impact**: Credit purchases count as platform revenue

---

## Data Storage Structure

### Firestore Collections Used:

1. **orders**
   - Fields: creatorId, dispensaryId, totalAmount, createdAt, paymentStatus
   - Used for: Treehouse transactions, Dispensary revenues

2. **creditTransactions**
   - Fields: userId, type, amount, credits, createdAt, status
   - Used for: Credit transaction tracking

3. **platformFees**
   - Fields: source, month, baseAmount, feePercentage, feeAmount, collected
   - Used for: Platform fee management

4. **shippingReconciliation**
   - Fields: courierCost, createdAt
   - Used for: Shipping expense tracking

---

## Security & Access Control

### Super Admin Only
- All Financial Hub pages require super admin role
- Redirects non-admins to sign-in
- Authentication verified via AuthContext

### Sensitive Data Protection
- Financial data never cached locally
- All queries use secure Firestore rules
- Export files contain no sensitive user data (IDs hashed)

---

## Visual Design

### Color Scheme:
- **Primary Green**: #006B3E (The Wellness Tree brand)
- **Brown**: #3D2E17 (Text and accents)
- **Status Colors**:
  - Green: Success/Completed/Paid
  - Yellow: Pending/Processing
  - Red: Failed/Disputed
  - Blue: Processed/Active
  - Purple: Special/Bonus

### Layout:
- **Side Panel**: 256px fixed width, white background
- **Main Content**: Fluid width, gradient background
- **Cards**: Bordered with 2px, rounded corners
- **Responsive**: Full mobile support

---

## Performance Considerations

### Query Optimization:
- Date-filtered queries reduce data load
- Indexed Firestore collections
- Lazy loading for large datasets
- Pagination ready (currently loads last 100)

### Caching:
- Data refreshed on date range change
- Manual refresh via reload
- Real-time updates not implemented (batch processing)

---

## Future Enhancements

### Planned Features:
1. **Real-Time Updates**
   - WebSocket connections for live data
   - Push notifications for new transactions

2. **Advanced Analytics**
   - Predictive revenue forecasting
   - Trend analysis with ML
   - Anomaly detection

3. **Automated Reporting**
   - Scheduled email reports
   - Custom report builder
   - PDF export

4. **Payment Gateway Integration**
   - Direct creator payouts
   - Automated dispensary billing
   - Stripe/PayFast integration

5. **Tax Management**
   - VAT calculations
   - Tax reporting
   - SARS integration

6. **Multi-Currency Support**
   - USD, EUR, GBP
   - Automatic conversion
   - Exchange rate tracking

---

## Troubleshooting

### Common Issues:

1. **"No data loading"**
   - Check date range (try "All Time")
   - Verify Firestore permissions
   - Check browser console for errors

2. **"Export not working"**
   - Ensure data is loaded (wait for loading to complete)
   - Check browser download settings
   - Verify CSV permissions

3. **"Metrics don't match"**
   - Verify date range matches across sections
   - Check for duplicate transactions
   - Review calculation logic in code

4. **"Status not updating"**
   - Check Firestore write permissions
   - Verify document IDs are correct
   - Reload page after update

---

## Developer Notes

### Code Location:
- **Main Component**: `src/app/admin/dashboard/financial-hub/page.tsx`
- **Layout**: `src/app/admin/dashboard/layout.tsx`
- **Navigation**: Side panel with icon indicators

### Key Functions:

1. **loadFinancialData()**
   - Loads all financial data from Firestore
   - Calculates metrics
   - Updates state

2. **calculateMetrics()**
   - Processes raw data into KPIs
   - Handles aggregations
   - Returns FinancialMetrics object

3. **exportToCSV()**
   - Converts data to CSV format
   - Triggers browser download
   - Includes date in filename

4. **handleUpdateStatus()**
   - Updates transaction status
   - Shows success/error toast
   - Refreshes data

### TypeScript Interfaces:

```typescript
interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  treehouseEarnings: number;
  dispensaryRevenue: number;
  shippingCosts: number;
  creditTransactions: number;
  platformFees: number;
  pendingPayments: number;
  completedPayments: number;
}
```

---

## Best Practices

### Financial Management:
1. **Regular Reconciliation**: Weekly or bi-weekly
2. **Prompt Payments**: Process creator/dispensary payments within 7 days
3. **Expense Monitoring**: Review shipping costs monthly
4. **Revenue Tracking**: Monitor trends for early issue detection

### Data Integrity:
1. **Verify Before Marking Paid**: Always double-check amounts
2. **Document Large Transactions**: Add notes for unusual items
3. **Archive Exports**: Save monthly CSV exports for records
4. **Audit Trail**: Keep logs of status changes

### Performance:
1. **Use Date Filters**: Avoid loading "All Time" unless necessary
2. **Regular Exports**: Don't rely on real-time data for reports
3. **Scheduled Reviews**: Set calendar reminders for financial tasks

---

## Support & Contact

For issues, questions, or feature requests related to the Financial Hub:

1. **Technical Issues**: Check browser console for errors
2. **Data Discrepancies**: Review Firestore collections directly
3. **Feature Requests**: Document use case and expected behavior
4. **Bug Reports**: Include date range, section, and steps to reproduce

---

## Changelog

### Version 1.0.0 (December 2025)
- Initial release
- Side panel navigation
- 6 financial sections
- Rich analytics dashboard
- CSV export functionality
- Date range filtering
- CRUD operations for all sections
- Integration with shipping reconciliation
- Financial health indicators
- Visual charts and trends

---

**Last Updated**: December 18, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
