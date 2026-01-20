// Platform commission rates
export const PLATFORM_COMMISSION_RATE = 0.25; // 25% platform commission on all sales
export const PRODUCT_POOL_COMMISSION_RATE = 0.05; // 5% commission on product pool items

// Price calculation utilities - NEW LOGIC
// Dispensary enters price WITH tax included
// System extracts base (pre-tax), adds commission, re-applies tax

export interface PriceBreakdown {
  dispensarySetPrice: number; // Original price entered by dispensary (includes their tax)
  basePrice: number; // Price without tax (dispensary's actual earning)
  commission: number; // Platform commission (calculated on basePrice)
  commissionRate: number; // 0.25 or 0.05
  subtotalBeforeTax: number; // basePrice + commission
  tax: number; // Tax on the subtotal
  taxRate: number; // Tax percentage (e.g., 15 for 15%)
  finalPrice: number; // subtotalBeforeTax + tax (what customer pays)
}

export interface CheckoutLineItem {
  productId: string;
  productName: string;
  quantity: number;
  dispensarySetPrice: number;
  basePrice: number;
  commission: number;
  subtotalBeforeTax: number; // For this line item
  lineTotal: number; // subtotalBeforeTax * quantity (before tax)
}

export interface CheckoutSummary {
  items: CheckoutLineItem[];
  itemsTotal: number; // Sum of all line totals (before tax)
  shipping: number;
  subtotal: number; // itemsTotal + shipping
  tax: number; // Tax on subtotal
  taxRate: number;
  total: number; // subtotal + tax
  // Hidden from customer, for internal tracking:
  totalDispensaryEarnings: number;
  totalPlatformCommission: number;
}

/**
 * Extract base price from dispensary-set price
 * NOTE: In current simplified logic, dispensary price IS the base price (includes their tax)
 * This function kept for compatibility but not used in main calculation
 */
export function extractBasePrice(dispensarySetPrice: number, taxRate: number): number {
  if (taxRate === 0) return dispensarySetPrice;
  return dispensarySetPrice / (1 + taxRate / 100);
}

/**
 * Calculate platform commission for public store/treehouse products
 */
export function calculatePlatformCommission(basePrice: number): number {
  return basePrice * PLATFORM_COMMISSION_RATE;
}

/**
 * Calculate product pool commission
 */
export function calculatePoolCommission(basePrice: number): number {
  return basePrice * PRODUCT_POOL_COMMISSION_RATE;
}

/**
 * Calculate tax amount based on subtotal and tax rate
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  return subtotal * (taxRate / 100);
}

/**
 * Calculate full price breakdown - Simple markup on dispensary price
 * @param dispensarySetPrice - Price entered by dispensary (INCLUDES their tax)
 * @param taxRate - Tax rate percentage (for reference only, not used in calculation)
 * @param isProductPool - Whether this is a product pool item (5% vs 25% commission)
 * 
 * SIMPLE LOGIC (Updated):
 * - Dispensary enters: R115 (this is their payout, tax already included)
 * - Public store commission: R115 × 0.25 = R28.75
 * - Product pool commission: R115 × 0.05 = R5.75
 * - Customer pays: R115 + R28.75 = R143.75 (public) or R115 + R5.75 = R120.75 (pool)
 * 
 * Revenue split:
 * - Dispensary gets: R115 (exactly what they entered)
 * - Platform gets: R28.75 (the commission markup)
 * - Tax: Already included in dispensary's R115
 */
export function calculatePriceBreakdown(
  dispensarySetPrice: number,
  taxRate: number = 0,
  isProductPool: boolean = false
): PriceBreakdown {
  // Dispensary price is the base (includes their tax already)
  const basePrice = dispensarySetPrice;
  
  // Calculate platform commission as percentage of dispensary price
  const commissionRate = isProductPool ? PRODUCT_POOL_COMMISSION_RATE : PLATFORM_COMMISSION_RATE;
  const commission = dispensarySetPrice * commissionRate;
  
  // Customer pays dispensary price + commission
  const subtotalBeforeTax = dispensarySetPrice + commission;
  
  // No additional tax - dispensary price already includes tax
  const tax = 0;
  
  // Final price customer pays
  const finalPrice = subtotalBeforeTax;

  return {
    dispensarySetPrice,
    basePrice, // Same as dispensarySetPrice
    commission,
    commissionRate,
    subtotalBeforeTax,
    tax, // 0 - tax already in dispensary price
    taxRate, // For reference only
    finalPrice
  };
}

/**
 * Get display price for product cards
 * Returns the price customers see = dispensary price + commission markup
 * - Public store: dispensary price × 1.25 (25% markup)
 * - Product pool: dispensary price × 1.05 (5% markup)
 */
export function getDisplayPrice(dispensarySetPrice: number, taxRate: number, isProductPool: boolean = false): number {
  const breakdown = calculatePriceBreakdown(dispensarySetPrice, taxRate, isProductPool);
  return breakdown.finalPrice;
}

/**
 * Calculate checkout summary for cart
 * @param items - Cart items with quantities
 * @param shippingCost - Shipping fee
 * @param taxRate - Tax rate percentage
 */
export function calculateCheckoutSummary(
  items: Array<{
    productId: string;
    productName: string;
    dispensarySetPrice: number;
    quantity: number;
    isProductPool?: boolean;
  }>,
  shippingCost: number,
  taxRate: number
): CheckoutSummary {
  const lineItems: CheckoutLineItem[] = items.map(item => {
    const breakdown = calculatePriceBreakdown(item.dispensarySetPrice, taxRate, item.isProductPool || false);
    
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      dispensarySetPrice: item.dispensarySetPrice,
      basePrice: breakdown.basePrice,
      commission: breakdown.commission,
      subtotalBeforeTax: breakdown.subtotalBeforeTax,
      lineTotal: breakdown.subtotalBeforeTax * item.quantity
    };
  });

  const itemsTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const subtotal = itemsTotal + shippingCost;
  const tax = calculateTax(subtotal, taxRate);
  const total = subtotal + tax;

  const totalDispensaryEarnings = lineItems.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
  const totalPlatformCommission = lineItems.reduce((sum, item) => sum + (item.commission * item.quantity), 0);

  return {
    items: lineItems,
    itemsTotal,
    shipping: shippingCost,
    subtotal,
    tax,
    taxRate,
    total,
    totalDispensaryEarnings,
    totalPlatformCommission
  };
}

/**
 * Format price for display with currency symbol
 */
export function formatPrice(price: number, currency: string = 'ZAR'): string {
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: 'R',
    EUR: 'R',
    GBP: 'R'
  };
  
  const symbol = symbols[currency] || 'R';
  return `${symbol}${price.toFixed(2)}`;
}

/**
 * Format tax rate for display
 */
export function formatTaxRate(taxRate: number): string {
  return `${taxRate}%`;
}
