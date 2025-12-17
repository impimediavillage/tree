"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISPENSARY_COMMISSION_RATE = exports.DISPENSARY_MINIMUM_PAYOUT_AMOUNT = void 0;
exports.calculateDispensaryCommission = calculateDispensaryCommission;
exports.DISPENSARY_MINIMUM_PAYOUT_AMOUNT = 500;
exports.DISPENSARY_COMMISSION_RATE = 0.15;
function calculateDispensaryCommission(orderTotal, commissionRate = exports.DISPENSARY_COMMISSION_RATE) {
    return Math.round(orderTotal * commissionRate * 100) / 100;
}
//# sourceMappingURL=dispensary-earnings.js.map