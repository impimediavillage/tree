"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_COMMISSION_RATE = exports.MAX_COMMISSION_RATE = exports.DEFAULT_COMMISSION_RATE = exports.VENDOR_MINIMUM_PAYOUT_AMOUNT = void 0;
exports.calculateVendorPayout = calculateVendorPayout;
/**
 * Helper function to calculate vendor payout breakdown
 */
function calculateVendorPayout(grossSales, commissionRate) {
    const dispensaryCommission = (grossSales * commissionRate) / 100;
    const vendorNetPayout = grossSales - dispensaryCommission;
    const vendorReceivesPercentage = commissionRate > 100 ? 0 : 100 - commissionRate;
    return {
        dispensaryCommission,
        vendorNetPayout: vendorNetPayout < 0 ? 0 : vendorNetPayout,
        vendorReceivesPercentage
    };
}
exports.VENDOR_MINIMUM_PAYOUT_AMOUNT = 100; // R100 minimum
exports.DEFAULT_COMMISSION_RATE = 10; // 10% default
exports.MAX_COMMISSION_RATE = 1000; // 1000% max
exports.MIN_COMMISSION_RATE = 5; // 5% min
//# sourceMappingURL=vendor-earnings.js.map