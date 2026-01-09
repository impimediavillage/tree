# Pricing, Commission & Tax System - Implementation Guide

## Overview
This document details the comprehensive pricing system that includes platform commissions and country-specific tax rates. The system ensures transparent pricing for customers while tracking revenue breakdown for dispensaries, the platform, and tax compliance.

## System Architecture

### 1. Core Components

#### **Pricing Utility** (`src/lib/pricing.ts`)
Handles all price calculations with platform commissions.

**Key Constants:**
- `PLATFORM_COMMISSION_RATE = 0.25` (25% commission on public stores & Treehouse)
- `PRODUCT_POOL_COMMISSION_RATE = 0.05` (5% commission on Product Pool items)

**Key Functions:**
```typescript
// Get display price with commission (but without tax)
getDisplayPrice(basePrice: number, isProductPool: boolean = false): number

// Full price breakdown including commission and tax
calculatePriceBreakdown(
  basePrice: number,
  taxRate: number = 0,
  isProductPool: boolean = false
): PriceBreakdown

// Individual calculation functions
calculatePlatformCommission(basePrice: number): number
calculatePoolCommission(basePrice: number): number
calculateTax(subtotal: number, taxRate: number): number
```

**PriceBreakdown Interface:**
```typescript
interface PriceBreakdown {
  basePrice: number;       // Original price set by dispensary
  commission: number;      // Commission amount (25% or 5%)
  commissionRate: number;  // 0.25 or 0.05
  subtotal: number;        // basePrice + commission
  tax: number;             // Tax amount based on subtotal
  taxRate: number;         // Tax percentage (e.g., 15 for 15%)
  finalPrice: number;      // subtotal + tax (final customer price)
}
```

#### **Tax Rate Utility** (`src/lib/taxRates.ts`)
Loads and queries country-specific tax rates from JSON reference data.

**Key Functions:**
```typescript
getTaxRateByCountry(countryName: string): number
getTaxDataByCountry(countryName: string): TaxRateData | null
getAllCountriesWithTax(): TaxRateData[]
searchCountries(searchTerm: string): TaxRateData[]
getCountriesSorted(): TaxRateData[]
```

**Data Source:** `public/data/countries_retail_consumption_tax_rates.json`
- 1923 lines covering global tax rates
- Structure: `{ country, standard_rate_percent, tax_type, last_reviewed, source }`
- Example: Slovenia 22%, South Africa 15%, United States 0% (varies by state)

### 2. Data Model Updates

#### **Dispensary Interface** (Updated in `src/types.ts` and `functions/src/types.ts`)
```typescript
export interface Dispensary {
  // ... existing fields
  taxRate?: number; // VAT/GST percentage (e.g., 15 for 15%)
  // Auto-populated from country during signup
  // Used for invoicing and tax compliance
}
```

### 3. User-Facing Changes

#### **Dispensary Signup Form** (`src/app/dispensary-signup/page.tsx`)

**New Features:**
1. **Automatic Tax Detection:**
   - When user selects address via Google Maps autocomplete
   - System extracts country name
   - Looks up tax rate from JSON reference
   - Displays toast notification: "Tax Rate Detected: VAT for [Country]: [Rate]%"

2. **Tax Rate Display Field:**
   - Appears after country is detected
   - Read-only, auto-populated field
   - Shows percentage (e.g., "15%")
   - Description: "This tax rate was automatically detected based on your country and will be applied to all product sales for tax compliance."

3. **Data Submission:**
   - Tax rate automatically included in form submission
   - Saved to Firestore dispensary document
   - Available for all future invoicing and calculations

**Code Implementation:**
```typescript
// State to track detected tax rate
const [detectedTaxRate, setDetectedTaxRate] = useState<number | null>(null);

// In address auto-fill logic:
const countryName = getAddressComponent(components, 'country');
if (countryName) {
  const taxRate = getTaxRateByCountry(countryName);
  if (taxRate > 0) {
    setDetectedTaxRate(taxRate);
    const taxData = getTaxDataByCountry(countryName);
    toast({
      title: "Tax Rate Detected",
      description: `${taxData?.tax_type || 'Tax'} for ${countryName}: ${taxRate}%`,
      duration: 4000,
    });
  }
}

// In form submission:
const submissionData = { 
  ...data, 
  autoApprove: true,
  taxRate: detectedTaxRate ?? 0
};
```

#### **Public Product Cards** (`src/components/cards/PublicProductCard.tsx`)

**Updated Pricing Display:**
- All displayed prices now include platform commission
- Public stores & Treehouse products: Base price × 1.25 (25% markup)
- Product Pool items: Base price × 1.05 (5% markup)

**New Props:**
```typescript
interface PublicProductCardProps {
  // ... existing props
  isProductPool?: boolean; // Indicates Product Pool (5% vs 25% commission)
}
```

**Implementation:**
```typescript
// Calculate display price with appropriate commission
const displayPrice = getDisplayPrice(tier.price, isProductPool);

// Use displayPrice in all price displays
<p className="text-2xl font-bold">
  <span className="text-sm">{product.currency} </span>
  {displayPrice.toFixed(2)}
</p>
```

#### **Product Pool Browse** (`src/app/dispensary-admin/browse-pool/page.tsx`)

**Updated Product Cards:**
- All Product Pool items now show 5% commission markup
- Pass `isProductPool={true}` to PublicProductCard component

```typescript
<PublicProductCard 
  key={item.key} 
  product={item.product} 
  tier={item.tier} 
  onRequestProduct={handleRequestClick} 
  requestStatus={item.requestStatus}
  requestCount={item.requestCount}
  totalRequestedByUser={item.totalRequestedByUser}
  isProductPool={true}  // ← 5% commission applied
/>
```

## Revenue Distribution Model

### Public Stores & Treehouse Products
**Displayed Price:** Base Price × 1.25 + Tax

**Revenue Split:**
- **Dispensary:** Base Price (100% of original price)
- **Platform:** Base Price × 0.25 (25% commission)
- **Tax Authority:** (Base Price × 1.25) × (Tax Rate / 100)

**Example (R100 base, 15% tax):**
- Base: R100.00
- Commission: R25.00
- Subtotal: R125.00
- Tax (15%): R18.75
- **Customer Pays:** R143.75
- **Dispensary Gets:** R100.00
- **Platform Gets:** R25.00
- **Tax Collected:** R18.75

### Product Pool Items
**Displayed Price:** Base Price × 1.05 + Tax

**Revenue Split:**
- **Seller Dispensary:** Base Price (100% of original price)
- **Platform:** Base Price × 0.05 (5% pool commission)
- **Tax Authority:** (Base Price × 1.05) × (Tax Rate / 100)

**Example (R100 base, 15% tax):**
- Base: R100.00
- Commission: R5.00
- Subtotal: R105.00
- Tax (15%): R15.75
- **Customer Pays:** R120.75
- **Seller Dispensary Gets:** R100.00
- **Platform Gets:** R5.00
- **Tax Collected:** R15.75

## Tax Rate Reference Data

### Source File
`public/data/countries_retail_consumption_tax_rates.json`

### Sample Data Structure
```json
{
  "country": "South Africa",
  "standard_rate_percent": 15.0,
  "tax_type": "VAT/GST or similar consumption tax",
  "last_reviewed": "30 June 2025",
  "source": {
    "name": "OECD Tax Database",
    "url": "https://www.oecd.org/tax/..."
  }
}
```

### Coverage
- **Global:** 150+ countries included
- **Tax Types:** VAT, GST, Sales Tax, Consumption Tax
- **Regular Updates:** Last reviewed dates included for verification
- **Zero Tax:** Countries with 0% listed explicitly

### Common Tax Rates by Region
- **Europe:** 17-27% (e.g., UK 20%, Germany 19%, Sweden 25%)
- **Africa:** 14-18% (e.g., South Africa 15%, Kenya 16%)
- **Asia Pacific:** 5-10% (e.g., Singapore 8%, Japan 10%)
- **Americas:** 0-20% (e.g., Canada 5%, Mexico 16%)
- **Middle East:** 0-15% (e.g., UAE 5%, Saudi Arabia 15%)

## Checkout & Order Processing

### Future Implementation (Not Yet Built)
When implementing checkout, use `calculatePriceBreakdown()` to:

1. **Display to Customer:**
```typescript
const breakdown = calculatePriceBreakdown(
  tier.price, 
  dispensary.taxRate || 0, 
  isProductPool
);

// Show:
// Subtotal: breakdown.subtotal (base + commission)
// Tax (15%): breakdown.tax
// Total: breakdown.finalPrice
```

2. **Store in Order Document:**
```typescript
{
  orderId: string;
  items: [{
    productId: string;
    basePrice: number;        // Original dispensary price
    commission: number;       // Platform commission amount
    commissionRate: number;   // 0.25 or 0.05
    tax: number;              // Tax amount
    taxRate: number;          // Tax percentage
    finalPrice: number;       // Total customer paid
  }];
  dispensaryEarnings: number; // Sum of all basePrices
  platformRevenue: number;    // Sum of all commissions
  taxCollected: number;       // Sum of all taxes
  totalCharged: number;       // Sum of all finalPrices
}
```

3. **Payout Calculations:**
```typescript
// Dispensary payout (after commission deducted)
dispensaryPayout = orderTotal - platformCommission - taxAmount;

// Platform revenue
platformRevenue = sum(all commissions);

// Tax remittance
taxToRemit = sum(all tax amounts);
```

## Influencer Tracking System

### Current Status
**NOT YET IMPLEMENTED** - User mentioned this might exist but search confirmed it does not.

### Planned Implementation

#### Data Structure
```typescript
interface InfluencerReferral {
  id: string;
  influencerId: string;      // User ID of influencer
  dispensaryId: string;      // Store where sale occurred
  orderId: string;           // Associated order
  productId: string;         // Product sold
  referralCode?: string;     // Optional tracking code
  basePrice: number;         // Original product price
  commission: number;        // Platform commission
  influencerEarnings: number; // Influencer share (TBD %)
  timestamp: Date;
  status: 'pending' | 'approved' | 'paid';
}
```

#### Integration Points
1. **Add to Cart:** Capture influencer referral code
2. **Checkout:** Link order to influencer
3. **Order Completion:** Create InfluencerReferral record
4. **Payout:** Calculate and distribute influencer earnings

#### Revenue Split (To Be Determined)
- Option 1: Split platform commission (e.g., 15% platform / 10% influencer)
- Option 2: Additional markup for referred sales
- Option 3: Fixed fee per referred sale

## Migration & Deployment

### Existing Dispensaries
**Important:** Dispensaries created before this system won't have `taxRate` set.

**Migration Options:**

1. **Manual Admin Update:**
   - Add tax rate field to admin dispensary edit form
   - Admin reviews each dispensary's country
   - Manually sets appropriate tax rate

2. **Automated Script:**
```typescript
// Migration script (to be run once)
const dispensaries = await getDocs(collection(db, 'dispensaries'));
dispensaries.forEach(async (doc) => {
  const dispensary = doc.data();
  if (!dispensary.taxRate && dispensary.country) {
    const taxRate = getTaxRateByCountry(dispensary.country);
    await updateDoc(doc.ref, { taxRate });
  }
});
```

3. **Default Behavior:**
   - If `taxRate` is undefined or 0, use 0% (no tax)
   - Display warning in dispensary dashboard: "Please update your tax rate for compliance"

### Deployment Checklist

- [x] Create pricing utility with commission calculations
- [x] Create tax rate utility with country lookup
- [x] Update Dispensary interface with taxRate field
- [x] Update dispensary signup form with auto tax detection
- [x] Update PublicProductCard to show commission markup
- [x] Update Product Pool browse to use 5% commission
- [ ] Update checkout flow to use calculatePriceBreakdown()
- [ ] Update order documents to store price breakdown
- [ ] Add tax rate field to admin dispensary management
- [ ] Implement influencer referral tracking system
- [ ] Add payout calculations with commission splits
- [ ] Create financial reporting dashboard
- [ ] Add tax remittance reporting

## Testing Scenarios

### Test 1: New Dispensary Signup
1. Start signup form
2. Use Google Maps to select address in South Africa
3. Verify toast: "Tax Rate Detected: VAT for South Africa: 15%"
4. Verify tax rate field shows "15%"
5. Complete signup
6. Check Firestore: `dispensaries/[id]` should have `taxRate: 15`

### Test 2: Public Store Product Display
1. Navigate to public dispensary storefront
2. Find product with base price R100
3. Verify displayed price: R125.00 (R100 × 1.25)
4. Check multiple products to confirm consistent markup

### Test 3: Product Pool Display
1. Login as dispensary admin
2. Navigate to Browse Product Pool
3. Find product with base price R100
4. Verify displayed price: R105.00 (R100 × 1.05)

### Test 4: Price Breakdown Calculation
```typescript
// Base: R100, Tax: 15%, Public Store
const breakdown = calculatePriceBreakdown(100, 15, false);
assert(breakdown.basePrice === 100);
assert(breakdown.commission === 25);
assert(breakdown.subtotal === 125);
assert(breakdown.tax === 18.75);
assert(breakdown.finalPrice === 143.75);

// Base: R100, Tax: 15%, Product Pool
const poolBreakdown = calculatePriceBreakdown(100, 15, true);
assert(poolBreakdown.commission === 5);
assert(poolBreakdown.subtotal === 105);
assert(poolBreakdown.tax === 15.75);
assert(poolBreakdown.finalPrice === 120.75);
```

### Test 5: Country Without Tax Data
1. Signup with address in country not in JSON (rare)
2. Verify tax rate shows "0%"
3. Verify note: "(No tax data available for this country)"
4. Product prices should still show commission markup

## Future Enhancements

### 1. Variable Tax Rates
**Use Case:** Countries with multiple tax rates (reduced, standard, luxury)
```typescript
interface ProductCategory {
  name: string;
  taxCategory: 'standard' | 'reduced' | 'exempt';
}

// Lookup:
const categoryTaxRate = dispensary.taxRates[product.taxCategory];
```

### 2. State/Province Tax
**Use Case:** USA, Canada where tax varies by state
```typescript
interface Dispensary {
  taxRate?: number;          // Federal/national
  stateTaxRate?: number;     // State/provincial
  cityTaxRate?: number;      // Municipal
}

const totalTax = (taxRate + stateTaxRate + cityTaxRate) / 100;
```

### 3. Tax-Inclusive vs Tax-Exclusive
**Use Case:** Some regions require tax-inclusive pricing
```typescript
interface Dispensary {
  taxDisplayMode: 'exclusive' | 'inclusive';
}

// Exclusive: "R125.00 + R18.75 tax = R143.75"
// Inclusive: "R143.75 (includes R18.75 tax)"
```

### 4. Commission Tiers
**Use Case:** Reward high-volume sellers with lower commission
```typescript
interface CommissionTier {
  salesThreshold: number;    // Monthly sales volume
  commissionRate: number;    // e.g., 0.20 for 20%
}

const tiers: CommissionTier[] = [
  { salesThreshold: 0, commissionRate: 0.25 },      // Default: 25%
  { salesThreshold: 10000, commissionRate: 0.22 },  // R10k+: 22%
  { salesThreshold: 50000, commissionRate: 0.20 },  // R50k+: 20%
];
```

### 5. Promotional Pricing
**Use Case:** Temporary discounts without affecting base price
```typescript
interface PriceTier {
  price: number;             // Base price
  promoPrice?: number;       // Promotional price (if active)
  promoEndDate?: Date;
}

// Commission still based on original price
const baseForCommission = tier.promoPrice ?? tier.price;
const displayPrice = getDisplayPrice(baseForCommission, isProductPool);
```

## Support & Troubleshooting

### Common Issues

**Issue 1: Tax Rate Not Detected**
- **Cause:** Country name mismatch between Google Maps and JSON
- **Solution:** Update JSON to include alternate country names, or normalize input

**Issue 2: Prices Not Updating**
- **Cause:** Browser cache showing old prices
- **Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

**Issue 3: Incorrect Commission Applied**
- **Cause:** `isProductPool` flag not passed correctly
- **Solution:** Verify PublicProductCard receives correct prop

**Issue 4: Tax Calculation Rounding**
- **Cause:** JavaScript floating point precision
- **Solution:** All calculations use `.toFixed(2)` for currency display

### Contact & Updates

For questions about this system, contact the development team or refer to:
- Pricing logic: `src/lib/pricing.ts`
- Tax rates: `src/lib/taxRates.ts`
- Signup form: `src/app/dispensary-signup/page.tsx`
- Product cards: `src/components/cards/PublicProductCard.tsx`

## Version History

**v1.0 - Initial Implementation**
- Platform commission system (25% public, 5% pool)
- Country-specific tax rate detection
- Auto-population during dispensary signup
- Updated product card displays
- Tax rate saved to dispensary documents

**Future Versions:**
- v1.1: Checkout integration with full price breakdown
- v1.2: Influencer referral tracking
- v1.3: Financial reporting dashboard
- v1.4: Variable commission tiers
- v2.0: Multi-region tax support
