"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDispensaryPayoutRequest = exports.recordDispensaryEarning = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const dispensary_earnings_1 = require("./types/dispensary-earnings");
/**
 * Calculate sales revenue for a dispensary (from delivered orders)
 * This represents the product sales portion of their earnings
 */
async function calculateSalesRevenue(db, dispensaryId, userId) {
    try {
        // Get the dispensary earnings record which tracks accumulated revenue
        const earningsRef = db.collection('dispensary_earnings').doc(userId);
        const earningsSnap = await earningsRef.get();
        if (!earningsSnap.exists) {
            return 0;
        }
        const earnings = earningsSnap.data();
        // The currentBalance already represents sales revenue (commission from orders)
        // This is accumulated from recordDispensaryEarning function
        return earnings.currentBalance || 0;
    }
    catch (error) {
        console.error('Error calculating sales revenue:', error);
        return 0;
    }
}
/**
 * Calculate total pending/approved driver fees owed by dispensary
 * This represents delivery fees that must be paid to PRIVATE drivers only
 * Private drivers = DispensaryStaff role with crewMemberType 'Driver'
 */
async function calculateDriverFeesOwed(db, dispensaryId) {
    try {
        // Query driver payout requests for this dispensary
        // These should only be from private drivers (not public marketplace drivers)
        const driverPayoutsQuery = db
            .collection('driver_payout_requests')
            .where('dispensaryId', '==', dispensaryId)
            .where('status', 'in', ['pending', 'approved']);
        const driverPayoutsSnap = await driverPayoutsQuery.get();
        let totalDriverFees = 0;
        // Verify each payout is from a private driver (DispensaryStaff role)
        const verificationPromises = driverPayoutsSnap.docs.map(async (payoutDoc) => {
            const payoutData = payoutDoc.data();
            const driverId = payoutData.driverId;
            if (!driverId) {
                console.warn(`Payout ${payoutDoc.id} has no driverId`);
                return 0;
            }
            // Verify driver is private (DispensaryStaff role, not public Driver role)
            const userDoc = await db.collection('users').doc(driverId).get();
            if (!userDoc.exists) {
                console.warn(`Driver user ${driverId} not found`);
                return 0;
            }
            const userData = userDoc.data();
            const userRole = userData?.role;
            // Only count payouts for private drivers (DispensaryStaff)
            // Public drivers have role 'Driver' and go through platform_driver_payouts
            if (userRole === 'DispensaryStaff') {
                // Additional verification: Check driver profile has correct crewMemberType
                const driverProfileDoc = await db.collection('driver_profiles').doc(driverId).get();
                if (driverProfileDoc.exists) {
                    const driverProfile = driverProfileDoc.data();
                    const crewMemberType = driverProfile?.crewMemberType;
                    // Only count if they're actually a driver crew member
                    if (crewMemberType === 'Driver') {
                        return payoutData.amount || 0;
                    }
                    else {
                        console.warn(`User ${driverId} is DispensaryStaff but not a Driver crew member (type: ${crewMemberType})`);
                        return 0;
                    }
                }
                else {
                    // Has DispensaryStaff role but no driver profile - still count it
                    // (might be legacy data or profile not created yet)
                    console.warn(`Driver ${driverId} has no driver_profile document`);
                    return payoutData.amount || 0;
                }
            }
            else {
                console.warn(`Excluding payout for user ${driverId} with role ${userRole} (not DispensaryStaff)`);
                return 0;
            }
        });
        const amounts = await Promise.all(verificationPromises);
        totalDriverFees = amounts.reduce((sum, amount) => sum + amount, 0);
        console.log(`Total private driver fees for dispensary ${dispensaryId}: R${totalDriverFees}`);
        return totalDriverFees;
    }
    catch (error) {
        console.error('Error calculating driver fees:', error);
        return 0;
    }
}
/**
 * Calculate total pending/approved vendor commissions owed by dispensary
 * This represents commissions owed to Vendor crew members
 * Vendors = DispensaryStaff role with crewMemberType 'Vendor'
 */
async function calculateVendorCommissionsOwed(db, dispensaryId) {
    try {
        // Query vendor payout requests for this dispensary
        // Assuming vendor payout requests are stored in 'vendor_payout_requests' collection
        // If they don't exist yet, this will return 0
        const vendorPayoutsQuery = db
            .collection('vendor_payout_requests')
            .where('dispensaryId', '==', dispensaryId)
            .where('status', 'in', ['pending', 'approved']);
        const vendorPayoutsSnap = await vendorPayoutsQuery.get();
        let totalVendorCommissions = 0;
        // Verify each payout is from a vendor crew member (DispensaryStaff role)
        const verificationPromises = vendorPayoutsSnap.docs.map(async (payoutDoc) => {
            const payoutData = payoutDoc.data();
            const vendorId = payoutData.vendorId || payoutData.userId;
            if (!vendorId) {
                console.warn(`Vendor payout ${payoutDoc.id} has no vendorId/userId`);
                return 0;
            }
            // Verify vendor is dispensary staff member
            const userDoc = await db.collection('users').doc(vendorId).get();
            if (!userDoc.exists) {
                console.warn(`Vendor user ${vendorId} not found`);
                return 0;
            }
            const userData = userDoc.data();
            const userRole = userData?.role;
            // Only count payouts for DispensaryStaff vendors
            if (userRole === 'DispensaryStaff') {
                // Verify they have Vendor as crewMemberType
                const crewMemberType = userData?.crewMemberType;
                if (crewMemberType === 'Vendor') {
                    return payoutData.amount || 0;
                }
                else {
                    console.warn(`User ${vendorId} is DispensaryStaff but not a Vendor crew member (type: ${crewMemberType})`);
                    return 0;
                }
            }
            else {
                console.warn(`Excluding vendor payout for user ${vendorId} with role ${userRole} (not DispensaryStaff)`);
                return 0;
            }
        });
        const amounts = await Promise.all(verificationPromises);
        totalVendorCommissions = amounts.reduce((sum, amount) => sum + amount, 0);
        console.log(`Total vendor commissions for dispensary ${dispensaryId}: R${totalVendorCommissions}`);
        return totalVendorCommissions;
    }
    catch (error) {
        console.error('Error calculating vendor commissions:', error);
        // Return 0 if collection doesn't exist yet (feature not implemented)
        return 0;
    }
}
/**
 * Record dispensary earnings when an order is delivered
 * Triggered on order status change to 'delivered'
 */
exports.recordDispensaryEarning = (0, firestore_1.onDocumentUpdated)('orders/{orderId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const orderId = event.params.orderId;
    if (!beforeData || !afterData) {
        console.log('Missing before/after data');
        return;
    }
    // Only trigger when status changes to 'delivered'
    if (beforeData.orderStatus !== 'delivered' && afterData.orderStatus === 'delivered') {
        // Check if this is a dispensary order (not Treehouse)
        if (afterData.orderType === 'treehouse') {
            console.log('Treehouse order, skipping dispensary earnings');
            return;
        }
        const dispensaryId = afterData.dispensaryId;
        const orderTotal = afterData.totalAmount || 0;
        if (!dispensaryId || orderTotal <= 0) {
            console.log('Missing dispensaryId or invalid order total');
            return;
        }
        try {
            const db = admin.firestore();
            // Get dispensary info to find staff
            const dispensaryRef = db.collection('dispensaries').doc(dispensaryId);
            const dispensarySnap = await dispensaryRef.get();
            if (!dispensarySnap.exists) {
                console.error('Dispensary not found:', dispensaryId);
                return;
            }
            const dispensaryData = dispensarySnap.data();
            const ownerId = dispensaryData?.ownerUid;
            if (!ownerId) {
                console.error('Dispensary owner not found');
                return;
            }
            // Use new pricing system field if available, fallback to legacy calculation
            let commission;
            if (afterData.totalDispensaryEarnings !== undefined) {
                // New pricing system - use the pre-calculated dispensary earnings
                commission = afterData.totalDispensaryEarnings;
                console.log('Using new pricing system totalDispensaryEarnings:', commission);
            }
            else {
                // Legacy system - calculate commission (default 15%)
                const commissionRate = dispensaryData?.commissionRate || dispensary_earnings_1.DISPENSARY_COMMISSION_RATE;
                commission = (0, dispensary_earnings_1.calculateDispensaryCommission)(orderTotal, commissionRate);
                console.log('Using legacy commission calculation:', commission);
            }
            // For now, assign all commission to the dispensary owner
            // In the future, this could be split among staff who worked on the order
            const earningsRef = db.collection('dispensary_earnings').doc(ownerId);
            const earningsSnap = await earningsRef.get();
            if (earningsSnap.exists) {
                // Update existing earnings
                await earningsRef.update({
                    currentBalance: admin.firestore.FieldValue.increment(commission),
                    totalEarned: admin.firestore.FieldValue.increment(commission),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                // Create new earnings record
                const newEarnings = {
                    userId: ownerId,
                    dispensaryId,
                    currentBalance: commission,
                    pendingBalance: 0,
                    totalEarned: commission,
                    totalWithdrawn: 0,
                    role: 'dispensary-admin',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                await earningsRef.set(newEarnings);
            }
            // Create transaction record
            const transactionRef = db.collection('dispensary_transactions').doc();
            const transaction = {
                userId: ownerId,
                dispensaryId,
                orderId,
                type: 'order_commission',
                amount: commission,
                description: `Commission from order #${afterData.orderNumber || orderId}`,
                balanceAfter: (earningsSnap.exists ? earningsSnap.data().currentBalance : 0) + commission,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await transactionRef.set(transaction);
            console.log(`Recorded R${commission} earnings for dispensary ${dispensaryId}`);
        }
        catch (error) {
            console.error('Error recording dispensary earnings:', error);
        }
    }
});
/**
 * Create a dispensary payout request
 * Supports individual (staff only) and combined (admin + all staff) payouts
 */
exports.createDispensaryPayoutRequest = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { userId, dispensaryId, requestedAmount, accountDetails, payoutType, staffIncluded, staffBreakdown, } = request.data;
    // Validate required fields
    if (!userId || !dispensaryId || !requestedAmount || !accountDetails || !payoutType) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
    }
    // Validate minimum payout amount
    if (requestedAmount < dispensary_earnings_1.DISPENSARY_MINIMUM_PAYOUT_AMOUNT) {
        throw new https_1.HttpsError('invalid-argument', `Minimum payout amount is R${dispensary_earnings_1.DISPENSARY_MINIMUM_PAYOUT_AMOUNT}`);
    }
    // Validate bank account details
    if (!accountDetails.accountHolder ||
        !accountDetails.bankName ||
        !accountDetails.accountNumber ||
        !accountDetails.branchCode) {
        throw new https_1.HttpsError('invalid-argument', 'Incomplete bank account details');
    }
    try {
        const db = admin.firestore();
        if (payoutType === 'individual') {
            // Individual payout - single staff member
            const earningsRef = db.collection('dispensary_earnings').doc(userId);
            const earningsSnap = await earningsRef.get();
            if (!earningsSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Earnings record not found');
            }
            const earnings = earningsSnap.data();
            if (earnings.currentBalance < requestedAmount) {
                throw new https_1.HttpsError('invalid-argument', `Insufficient balance. Available: R${earnings.currentBalance}`);
            }
            // Calculate payout breakdown
            const salesRevenue = await calculateSalesRevenue(db, dispensaryId, userId);
            const driverFees = await calculateDriverFeesOwed(db, dispensaryId);
            const vendorCommissions = await calculateVendorCommissionsOwed(db, dispensaryId);
            // Create payout request with breakdown
            const payoutRef = db.collection('dispensary_payout_requests').doc();
            const payoutRequest = {
                userId,
                dispensaryId,
                payoutType: 'individual',
                requestedAmount,
                salesRevenue, // What they keep (product sales commission)
                driverFees, // What they owe to drivers
                vendorCommissions, // What they owe to vendors
                status: 'pending',
                accountDetails,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await payoutRef.set(payoutRequest);
            // Move balance from current to pending
            await earningsRef.update({
                currentBalance: admin.firestore.FieldValue.increment(-requestedAmount),
                pendingBalance: admin.firestore.FieldValue.increment(requestedAmount),
                accountDetails, // Save account details
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Create transaction
            const transactionRef = db.collection('dispensary_transactions').doc();
            const transaction = {
                userId,
                dispensaryId,
                orderId: payoutRef.id,
                type: 'payout',
                amount: -requestedAmount,
                description: `Payout request #${payoutRef.id.slice(-6)}`,
                balanceAfter: earnings.currentBalance - requestedAmount,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await transactionRef.set(transaction);
            return { success: true, requestId: payoutRef.id };
        }
        else {
            // Combined payout - admin + all staff
            // Verify user is dispensary admin
            const userEarningsRef = db.collection('dispensary_earnings').doc(userId);
            const userEarningsSnap = await userEarningsRef.get();
            if (!userEarningsSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Your earnings record not found');
            }
            const userEarnings = userEarningsSnap.data();
            if (userEarnings.role !== 'dispensary-admin') {
                throw new https_1.HttpsError('permission-denied', 'Only dispensary admins can request combined payouts');
            }
            if (!staffIncluded || staffIncluded.length === 0) {
                throw new https_1.HttpsError('invalid-argument', 'No staff members included in combined payout');
            }
            // Fetch all staff earnings and validate balances
            const staffEarningsPromises = staffIncluded.map((staffId) => db.collection('dispensary_earnings').doc(staffId).get());
            const staffEarningsSnaps = await Promise.all(staffEarningsPromises);
            let totalAvailable = 0;
            const validStaffBreakdown = [];
            for (let i = 0; i < staffEarningsSnaps.length; i++) {
                const snap = staffEarningsSnaps[i];
                if (snap.exists) {
                    const staffEarnings = snap.data();
                    totalAvailable += staffEarnings.currentBalance;
                    // Build staff breakdown
                    const userRef = db.collection('users').doc(staffEarnings.userId);
                    const userSnap = await userRef.get();
                    const userName = userSnap.exists
                        ? userSnap.data()?.displayName || userSnap.data()?.email || 'Unknown'
                        : 'Unknown';
                    validStaffBreakdown.push({
                        userId: staffEarnings.userId,
                        userName,
                        role: staffEarnings.role,
                        amount: staffEarnings.currentBalance,
                        currentBalance: staffEarnings.currentBalance,
                    });
                }
            }
            if (totalAvailable < requestedAmount) {
                throw new https_1.HttpsError('invalid-argument', `Insufficient combined balance. Available: R${totalAvailable}, Requested: R${requestedAmount}`);
            }
            // Calculate payout breakdown
            const salesRevenue = totalAvailable; // Combined staff earnings (from sales)
            const driverFees = await calculateDriverFeesOwed(db, dispensaryId);
            const vendorCommissions = await calculateVendorCommissionsOwed(db, dispensaryId);
            // Create combined payout request with breakdown
            const payoutRef = db.collection('dispensary_payout_requests').doc();
            const payoutRequest = {
                userId,
                dispensaryId,
                payoutType: 'combined',
                requestedAmount,
                salesRevenue, // Combined staff sales revenue
                driverFees, // Driver fees owed by dispensary
                vendorCommissions, // Vendor commissions owed by dispensary
                staffIncluded,
                staffBreakdown: staffBreakdown || validStaffBreakdown,
                status: 'pending',
                accountDetails,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            await payoutRef.set(payoutRequest);
            // Update all staff earnings (move to pending)
            const updatePromises = staffIncluded.map((staffId) => {
                const earningsRef = db.collection('dispensary_earnings').doc(staffId);
                return earningsRef.get().then((snap) => {
                    if (snap.exists) {
                        const earnings = snap.data();
                        const amount = earnings.currentBalance;
                        return earningsRef.update({
                            currentBalance: 0,
                            pendingBalance: admin.firestore.FieldValue.increment(amount),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                    return undefined;
                });
            });
            await Promise.all(updatePromises);
            // Create transactions for all staff
            const transactionPromises = validStaffBreakdown.map((staff) => {
                const transactionRef = db.collection('dispensary_transactions').doc();
                const transaction = {
                    userId: staff.userId,
                    dispensaryId,
                    orderId: payoutRef.id,
                    type: 'payout',
                    amount: -staff.amount,
                    description: `Combined payout request #${payoutRef.id.slice(-6)}`,
                    balanceAfter: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                return transactionRef.set(transaction);
            });
            await Promise.all(transactionPromises);
            return { success: true, requestId: payoutRef.id };
        }
    }
    catch (error) {
        console.error('Error creating dispensary payout request:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to create payout request');
    }
});
//# sourceMappingURL=dispensary-earnings.js.map