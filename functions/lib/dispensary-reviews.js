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
exports.recalculateDispensaryReviewStats = exports.processDispensaryReview = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Cloud Function that processes dispensary reviews
 * Triggers when a new review is created in dispensaryReviews collection
 */
exports.processDispensaryReview = (0, firestore_1.onDocumentCreated)('dispensaryReviews/{reviewId}', async (event) => {
    const reviewId = event.params.reviewId;
    const reviewData = event.data?.data();
    if (!reviewData) {
        logger.warn(`No data found for review ${reviewId}`);
        return;
    }
    const db = admin.firestore();
    const { userId, dispensaryId, creditsAwarded, } = reviewData;
    try {
        // 1. Award credits to user
        if (creditsAwarded && userId) {
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                credits: admin.firestore.FieldValue.increment(creditsAwarded),
            });
            logger.info(`Awarded ${creditsAwarded} credits to user ${userId}`);
        }
        // 2. Get all reviews for this dispensary
        const reviewsSnapshot = await db
            .collection('dispensaryReviews')
            .where('dispensaryId', '==', dispensaryId)
            .where('status', '==', 'active')
            .get();
        const reviews = reviewsSnapshot.docs.map(doc => doc.data());
        const totalReviews = reviews.length;
        if (totalReviews === 0) {
            logger.warn(`No reviews found for dispensary ${dispensaryId}`);
            return;
        }
        // 3. Calculate average rating
        const averageRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews;
        // 4. Calculate rating breakdown
        const ratingBreakdown = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
            6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
        };
        reviews.forEach(r => {
            const rating = r.rating || 0;
            if (rating >= 1 && rating <= 10) {
                ratingBreakdown[rating]++;
            }
        });
        // 5. Calculate category averages
        const categoryAverages = {};
        const categoryMap = {
            productQuality: [],
            deliverySpeed: [],
            packaging: [],
            accuracy: [],
            freshness: [],
            value: [],
            communication: [],
        };
        reviews.forEach(r => {
            if (r.categories) {
                Object.entries(r.categories).forEach(([key, value]) => {
                    // Convert categorical values to numeric scores
                    const score = getCategoryScore(key, value);
                    const mappedKey = key.replace('_', '');
                    if (categoryMap[mappedKey]) {
                        categoryMap[mappedKey].push(score);
                    }
                });
            }
        });
        Object.entries(categoryMap).forEach(([key, scores]) => {
            if (scores.length > 0) {
                categoryAverages[key] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            }
        });
        // 6. Calculate recent rating (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentReviews = reviews.filter(r => {
            const createdAt = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
            return createdAt >= thirtyDaysAgo;
        });
        const recentRating = recentReviews.length > 0
            ? recentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / recentReviews.length
            : averageRating;
        // 7. Calculate consistency score (lower variance = higher consistency)
        const variance = reviews.reduce((sum, r) => {
            const diff = (r.rating || 0) - averageRating;
            return sum + (diff * diff);
        }, 0) / totalReviews;
        const consistencyScore = Math.max(0, 10 - Math.sqrt(variance));
        // 8. Calculate composite review score
        const credibilityBoost = Math.min(totalReviews / 100, 1) * 0.5;
        const recentWeight = recentReviews.length >= 5 ? 0.3 : 0;
        const consistencyBonus = variance < 2 ? 0.2 : 0;
        const reviewScore = Math.min(averageRating * 0.7 +
            credibilityBoost +
            recentRating * recentWeight +
            consistencyBonus, 10);
        // 9. Determine badges
        const badges = [];
        if (averageRating >= 9.0)
            badges.push('top_rated');
        if (categoryAverages.deliverySpeed >= 8)
            badges.push('fast_delivery');
        if (categoryAverages.packaging >= 9)
            badges.push('perfect_packaging');
        if (consistencyScore >= 8)
            badges.push('consistent_quality');
        if (totalReviews >= 100)
            badges.push('community_favorite');
        if (categoryAverages.value >= 8)
            badges.push('excellent_value');
        if (categoryAverages.freshness >= 9)
            badges.push('fresh_products');
        // 10. Update dispensary with review stats
        const dispensaryRef = db.collection('dispensaries').doc(dispensaryId);
        await dispensaryRef.update({
            totalReviews,
            averageRating: Math.round(averageRating * 10) / 10,
            reviewScore: Math.round(reviewScore * 10) / 10,
            ratingBreakdown,
            categoryAverages,
            badges,
            recentRating: Math.round(recentRating * 10) / 10,
            consistencyScore: Math.round(consistencyScore * 10) / 10,
            reviewsLastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info(`Updated review stats for dispensary ${dispensaryId}: ${averageRating}/10 (${totalReviews} reviews)`);
    }
    catch (error) {
        logger.error(`Error processing review ${reviewId}:`, error);
        throw error;
    }
});
/**
 * Helper function to convert categorical values to numeric scores (1-10)
 */
function getCategoryScore(category, value) {
    const scoreMap = {
        product_quality: {
            exceeded: 10,
            met: 7,
            below: 4,
        },
        delivery_speed: {
            very_fast: 10,
            on_time: 8,
            delayed: 4,
            never: 1,
        },
        packaging: {
            excellent: 10,
            good: 7,
            damaged: 4,
            poor: 2,
        },
        accuracy: {
            exact: 10,
            mostly: 7,
            different: 4,
            wrong: 1,
        },
        freshness: {
            fresh: 10,
            good: 7,
            acceptable: 5,
            poor: 2,
        },
        value: {
            excellent: 10,
            good: 7,
            overpriced: 3,
        },
        communication: {
            excellent: 10,
            good: 7,
            poor: 4,
            never: 1,
        },
    };
    return scoreMap[category]?.[value] || 5;
}
/**
 * Callable function to manually trigger review stats recalculation for a dispensary
 * Useful for admin tools or fixing data issues
 */
exports.recalculateDispensaryReviewStats = (0, https_1.onCall)(async (request) => {
    // Check authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    // Check if user is super admin
    if (request.auth?.token.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can recalculate review stats.');
    }
    const { dispensaryId } = request.data;
    if (!dispensaryId) {
        throw new https_1.HttpsError('invalid-argument', 'dispensaryId is required');
    }
    const db = admin.firestore();
    try {
        // Trigger recalculation by getting all reviews
        const reviewsSnapshot = await db
            .collection('dispensaryReviews')
            .where('dispensaryId', '==', dispensaryId)
            .where('status', '==', 'active')
            .get();
        const reviews = reviewsSnapshot.docs.map(doc => doc.data());
        const totalReviews = reviews.length;
        if (totalReviews === 0) {
            return { success: true, message: 'No reviews found for this dispensary' };
        }
        // Calculate and update (same logic as above)
        const averageRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews;
        const ratingBreakdown = {
            1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
            6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
        };
        reviews.forEach(r => {
            const rating = r.rating || 0;
            if (rating >= 1 && rating <= 10) {
                ratingBreakdown[rating]++;
            }
        });
        const dispensaryRef = db.collection('dispensaries').doc(dispensaryId);
        await dispensaryRef.update({
            totalReviews,
            averageRating: Math.round(averageRating * 10) / 10,
            ratingBreakdown,
            reviewsLastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            success: true,
            message: `Recalculated stats for ${totalReviews} reviews`,
            averageRating: Math.round(averageRating * 10) / 10,
        };
    }
    catch (error) {
        logger.error('Error recalculating review stats:', error);
        throw new https_1.HttpsError('internal', `Failed to recalculate: ${error.message}`);
    }
});
//# sourceMappingURL=dispensary-reviews.js.map