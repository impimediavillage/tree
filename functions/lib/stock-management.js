"use strict";
/**
 * 📦 Stock Management Cloud Functions
 * Automatically deducts and restores product stock based on order lifecycle
 * Handles atomic updates with transaction safety to prevent overselling
 */
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
exports.lowStockAlert = exports.restoreStockOnOrderCancelled = exports.deductStockOnOrderCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ============================================================================
// STOCK DEDUCTION ON ORDER CREATION
// ============================================================================
/**
 * Automatically deduct stock when a new order is created
 * Triggered on orders collection document creation
 */
exports.deductStockOnOrderCreated = (0, firestore_1.onDocumentCreated)('orders/{orderId}', async (event) => {
    const order = event.data?.data();
    const orderId = event.params.orderId;
    if (!order) {
        v2_1.logger.warn(`No data found for order ${orderId}`);
        return;
    }
    // Skip if this is a Treehouse POD order (print-on-demand, no stock tracking)
    if (order.orderType === 'treehouse') {
        v2_1.logger.info(`Skipping stock deduction for Treehouse POD order ${orderId}`);
        return;
    }
    // Skip if stock was already deducted (safeguard against duplicate triggers)
    if (order.stockDeducted === true) {
        v2_1.logger.info(`Stock already deducted for order ${orderId}`);
        return;
    }
    try {
        v2_1.logger.info(`🔻 Deducting stock for order ${orderId} (${order.orderNumber})`);
        const items = order.items || [];
        const stockUpdates = [];
        // Use Firestore batch for atomic updates
        const batch = db.batch();
        let totalItemsProcessed = 0;
        for (const item of items) {
            const { productId, unit, quantity, dispensaryType } = item;
            if (!productId || !unit || !quantity) {
                v2_1.logger.warn(`Skipping item with missing data:`, { productId, unit, quantity });
                continue;
            }
            // Determine product collection based on dispensary type
            const isProductPool = dispensaryType === 'Product Pool';
            const collectionName = isProductPool ? 'productPoolProducts' : 'products';
            try {
                // Fetch product document
                const productRef = db.collection(collectionName).doc(productId);
                const productDoc = await productRef.get();
                if (!productDoc.exists) {
                    v2_1.logger.warn(`Product ${productId} not found in ${collectionName}`);
                    continue;
                }
                const productData = productDoc.data();
                if (!productData) {
                    v2_1.logger.warn(`No data found for product ${productId}`);
                    continue;
                }
                // Determine which tier array to update
                const tierArrayKey = isProductPool ? 'poolPriceTiers' : 'priceTiers';
                const priceTiers = productData[tierArrayKey] || [];
                if (!Array.isArray(priceTiers) || priceTiers.length === 0) {
                    v2_1.logger.warn(`No price tiers found for product ${productId}`);
                    continue;
                }
                // Find matching tier and deduct stock
                let tierFound = false;
                let totalStock = 0;
                const updatedTiers = priceTiers.map((tier) => {
                    const tierStock = tier.quantityInStock ?? 0;
                    // Match tier by unit (e.g., "1g", "3.5g", "28g")
                    if (tier.unit === unit) {
                        tierFound = true;
                        const newStock = Math.max(0, tierStock - quantity);
                        stockUpdates.push({
                            productId,
                            productName: productData.name || 'Unknown',
                            tierUnit: unit,
                            quantityOrdered: quantity,
                            stockBefore: tierStock,
                            stockAfter: newStock
                        });
                        totalStock += newStock;
                        return { ...tier, quantityInStock: newStock };
                    }
                    totalStock += tierStock;
                    return tier;
                });
                if (!tierFound) {
                    v2_1.logger.warn(`Tier unit "${unit}" not found for product ${productId}`);
                    continue;
                }
                // Update product with new stock levels
                const updateData = {
                    [tierArrayKey]: updatedTiers,
                    quantityInStock: totalStock,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                batch.update(productRef, updateData);
                totalItemsProcessed++;
            }
            catch (itemError) {
                v2_1.logger.error(`Error processing item ${productId}:`, itemError);
                // Continue processing other items even if one fails
            }
        }
        // Mark order as having stock deducted
        const orderRef = db.collection('orders').doc(orderId);
        batch.update(orderRef, {
            stockDeducted: true,
            stockDeductedAt: admin.firestore.FieldValue.serverTimestamp(),
            stockUpdates: stockUpdates
        });
        // Commit all updates atomically
        await batch.commit();
        v2_1.logger.info(`✅ Stock deduction complete for order ${order.orderNumber}:`, {
            orderId,
            itemsProcessed: totalItemsProcessed,
            updates: stockUpdates
        });
    }
    catch (error) {
        v2_1.logger.error(`❌ Failed to deduct stock for order ${orderId}:`, error);
        // Create error notification for dispensary owner
        try {
            const dispensaryIds = Object.keys(order.shipments || {});
            for (const dispensaryId of dispensaryIds) {
                await db.collection('notifications').add({
                    userId: dispensaryId,
                    type: 'error',
                    title: 'Stock Deduction Failed',
                    message: `Failed to deduct stock for order ${order.orderNumber}. Please verify inventory manually.`,
                    read: false,
                    orderId: orderId,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        catch (notifError) {
            v2_1.logger.error('Failed to create error notification:', notifError);
        }
    }
});
// ============================================================================
// STOCK RESTORATION ON ORDER CANCELLATION
// ============================================================================
/**
 * Automatically restore stock when an order is cancelled
 * Triggered on orders collection document update
 */
exports.restoreStockOnOrderCancelled = (0, firestore_1.onDocumentUpdated)('orders/{orderId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const orderId = event.params.orderId;
    if (!beforeData || !afterData) {
        return;
    }
    // Check if order status changed to cancelled
    const wasCancelled = beforeData.status !== 'cancelled' && afterData.status === 'cancelled';
    if (!wasCancelled) {
        return; // Not a cancellation event
    }
    // Skip if stock was never deducted
    if (!afterData.stockDeducted) {
        v2_1.logger.info(`No stock to restore for order ${orderId} (never deducted)`);
        return;
    }
    // Skip if stock was already restored
    if (afterData.stockRestored === true) {
        v2_1.logger.info(`Stock already restored for order ${orderId}`);
        return;
    }
    try {
        v2_1.logger.info(`🔼 Restoring stock for cancelled order ${orderId} (${afterData.orderNumber})`);
        const items = afterData.items || [];
        const restorationUpdates = [];
        const batch = db.batch();
        let totalItemsProcessed = 0;
        for (const item of items) {
            const { productId, unit, quantity, dispensaryType } = item;
            if (!productId || !unit || !quantity) {
                continue;
            }
            const isProductPool = dispensaryType === 'Product Pool';
            const collectionName = isProductPool ? 'productPoolProducts' : 'products';
            try {
                const productRef = db.collection(collectionName).doc(productId);
                const productDoc = await productRef.get();
                if (!productDoc.exists) {
                    v2_1.logger.warn(`Product ${productId} not found for restoration`);
                    continue;
                }
                const productData = productDoc.data();
                if (!productData) {
                    v2_1.logger.warn(`No data found for product ${productId} during restoration`);
                    continue;
                }
                const tierArrayKey = isProductPool ? 'poolPriceTiers' : 'priceTiers';
                const priceTiers = productData[tierArrayKey] || [];
                let tierFound = false;
                let totalStock = 0;
                const updatedTiers = priceTiers.map((tier) => {
                    const tierStock = tier.quantityInStock ?? 0;
                    if (tier.unit === unit) {
                        tierFound = true;
                        const newStock = tierStock + quantity; // Restore stock
                        restorationUpdates.push({
                            productId,
                            productName: productData.name || 'Unknown',
                            tierUnit: unit,
                            quantityRestored: quantity,
                            stockBefore: tierStock,
                            stockAfter: newStock
                        });
                        totalStock += newStock;
                        return { ...tier, quantityInStock: newStock };
                    }
                    totalStock += tierStock;
                    return tier;
                });
                if (!tierFound) {
                    v2_1.logger.warn(`Tier unit "${unit}" not found for restoration in product ${productId}`);
                    continue;
                }
                const updateData = {
                    [tierArrayKey]: updatedTiers,
                    quantityInStock: totalStock,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                batch.update(productRef, updateData);
                totalItemsProcessed++;
            }
            catch (itemError) {
                v2_1.logger.error(`Error restoring stock for item ${productId}:`, itemError);
            }
        }
        // Mark order as having stock restored
        const orderRef = db.collection('orders').doc(orderId);
        batch.update(orderRef, {
            stockRestored: true,
            stockRestoredAt: admin.firestore.FieldValue.serverTimestamp(),
            restorationUpdates: restorationUpdates
        });
        await batch.commit();
        v2_1.logger.info(`✅ Stock restoration complete for order ${afterData.orderNumber}:`, {
            orderId,
            itemsProcessed: totalItemsProcessed,
            restorations: restorationUpdates
        });
        // Notify dispensary owner
        try {
            const dispensaryIds = Object.keys(afterData.shipments || {});
            for (const dispensaryId of dispensaryIds) {
                await db.collection('notifications').add({
                    userId: dispensaryId,
                    type: 'info',
                    title: 'Stock Restored',
                    message: `Stock has been restored for cancelled order ${afterData.orderNumber}`,
                    read: false,
                    orderId: orderId,
                    sound: 'notification-pop',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        catch (notifError) {
            v2_1.logger.error('Failed to create restoration notification:', notifError);
        }
    }
    catch (error) {
        v2_1.logger.error(`❌ Failed to restore stock for order ${orderId}:`, error);
    }
});
// ============================================================================
// LOW STOCK ALERTS
// ============================================================================
/**
 * Monitor product updates and send alerts when stock is low
 * Triggered on products collection updates
 */
exports.lowStockAlert = (0, firestore_1.onDocumentUpdated)('{collection}/{productId}', async (event) => {
    const collection = event.params.collection;
    // Only monitor product collections
    if (!['products', 'productPoolProducts'].includes(collection)) {
        return;
    }
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const productId = event.params.productId;
    if (!beforeData || !afterData) {
        return;
    }
    const beforeStock = beforeData.quantityInStock ?? 0;
    const afterStock = afterData.quantityInStock ?? 0;
    // Only alert if stock decreased and is now below threshold
    if (afterStock >= beforeStock) {
        return;
    }
    const LOW_STOCK_THRESHOLD = 10; // Alert when stock drops below 10 units
    const CRITICAL_STOCK_THRESHOLD = 5; // Critical alert when below 5 units
    if (afterStock <= CRITICAL_STOCK_THRESHOLD && beforeStock > CRITICAL_STOCK_THRESHOLD) {
        // Critical low stock alert
        try {
            await db.collection('notifications').add({
                userId: afterData.dispensaryId,
                type: 'warning',
                title: '🚨 Critical Low Stock',
                message: `"${afterData.name}" has only ${afterStock} units remaining!`,
                read: false,
                productId: productId,
                sound: 'nearby',
                actionUrl: `/dispensary-admin/products`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            v2_1.logger.warn(`Critical low stock alert for product ${afterData.name}: ${afterStock} units`);
        }
        catch (error) {
            v2_1.logger.error('Failed to send critical stock alert:', error);
        }
    }
    else if (afterStock <= LOW_STOCK_THRESHOLD && beforeStock > LOW_STOCK_THRESHOLD) {
        // Low stock warning
        try {
            await db.collection('notifications').add({
                userId: afterData.dispensaryId,
                type: 'info',
                title: '⚠️ Low Stock Warning',
                message: `"${afterData.name}" is running low (${afterStock} units left)`,
                read: false,
                productId: productId,
                sound: 'notification-pop',
                actionUrl: `/dispensary-admin/products`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            v2_1.logger.info(`Low stock alert for product ${afterData.name}: ${afterStock} units`);
        }
        catch (error) {
            v2_1.logger.error('Failed to send low stock alert:', error);
        }
    }
});
//# sourceMappingURL=stock-management.js.map