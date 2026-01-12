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
 * Extract base price from dispensary-set price (remove tax)
 * Dispensary enters R115 with 15% tax → Base is R100
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
 * Calculate full price breakdown - Commission on BASE price, NO double taxation
 * @param dispensarySetPrice - Price entered by dispensary (INCLUDES their tax already)
 * @param taxRate - Tax rate percentage (e.g., 15 for 15%) - for extracting base only
 * @param isProductPool - Whether this is a product pool item (5% vs 25% commission)
 * 
 * CORRECT LOGIC: Dispensary price ALREADY includes tax
 * - Dispensary enters: R115 (R100 base + R15 tax already paid)
 * - Extract base: R115 / 1.15 = R100
 * - Commission: R100 × 0.25 = R25 (on base only)
 * - Customer pays: R115 + R25 = R140
 * 
 * NO additional tax charged - dispensary price already includes their tax!
 */
export function calculatePriceBreakdown(
  dispensarySetPrice: number,
  taxRate: number = 0,
  isProductPool: boolean = false
): PriceBreakdown {
  // Step 1: Extract base price (for commission calculation)
  const basePrice = extractBasePrice(dispensarySetPrice, taxRate);
  
  // Step 2: Calculate platform commission on BASE price only
  const commissionRate = isProductPool ? PRODUCT_POOL_COMMISSION_RATE : PLATFORM_COMMISSION_RATE;
  const commission = basePrice * commissionRate;
  
  // Step 3: Customer pays dispensary price + commission (NO additional tax)
  const subtotalBeforeTax = dispensarySetPrice + commission;
  
  // Step 4: Tax is 0 - dispensary price ALREADY includes their tax
  const tax = 0;
  
  // Step 5: Final customer price
  const finalPrice = subtotalBeforeTax;

  return {
    dispensarySetPrice,
    basePrice,
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
 * Shows subtotal (base + commission) without tax
 */
export function getDisplayPrice(dispensarySetPrice: number, taxRate: number, isProductPool: boolean = false): number {
  const breakdown = calculatePriceBreakdown(dispensarySetPrice, taxRate, isProductPool);
  return breakdown.subtotalBeforeTax;
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
