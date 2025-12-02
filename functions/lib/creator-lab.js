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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTreehouseProduct = exports.toggleProductStatus = exports.updateTreehouseProduct = exports.publishCreatorProduct = exports.generateModelShowcase = exports.finalizeDesignComposite = exports.generateCreatorDesign = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
const openaiApiKey = (0, params_1.defineSecret)('OPENAI_API_KEY');
// Map: apparelType-surface-badgeShape => position
// Cap & Beanie: Small sticker-sized badge on front/fold
// T-Shirts & Hoodies FRONT: Large centered chest design (25cm width equivalent ~240px at 1024px image width)
// T-Shirts & Hoodies BACK: Large centered upper back design
const LOGO_POSITIONS = {
    // Cap - Small sticker on front (center of cap front panel)
    'Cap-front-circular': { x: 425, y: 300, width: 150, height: 150 },
    'Cap-front-rectangular': { x: 400, y: 300, width: 200, height: 120 },
    // Beanie - Small sticker on fold (center of folded brim)
    'Beanie-front-circular': { x: 425, y: 400, width: 150, height: 150 },
    'Beanie-front-rectangular': { x: 400, y: 400, width: 200, height: 120 },
    // T-Shirt FRONT - Large centered chest design (25cm width = ~240px circular or 240x432px rectangular)
    'T-Shirt-front-circular': { x: 392, y: 300, width: 240, height: 240 },
    'T-Shirt-front-rectangular': { x: 392, y: 250, width: 240, height: 432 },
    // T-Shirt BACK - Large centered upper back
    'T-Shirt-back-circular': { x: 392, y: 250, width: 240, height: 240 },
    'T-Shirt-back-rectangular': { x: 392, y: 200, width: 240, height: 432 },
    // Long T-Shirt FRONT - Large centered chest design
    'Long T-Shirt-front-circular': { x: 392, y: 300, width: 240, height: 240 },
    'Long T-Shirt-front-rectangular': { x: 392, y: 250, width: 240, height: 432 },
    // Long T-Shirt BACK - Large centered upper back
    'Long T-Shirt-back-circular': { x: 392, y: 250, width: 240, height: 240 },
    'Long T-Shirt-back-rectangular': { x: 392, y: 200, width: 240, height: 432 },
    // Hoodie FRONT - Large centered chest design
    'Hoodie-front-circular': { x: 392, y: 350, width: 240, height: 240 },
    'Hoodie-front-rectangular': { x: 392, y: 300, width: 240, height: 432 },
    // Hoodie BACK - Large centered upper back
    'Hoodie-back-circular': { x: 392, y: 300, width: 240, height: 240 },
    'Hoodie-back-rectangular': { x: 392, y: 250, width: 240, height: 432 },
    // Backpack FRONT - Large centered panel
    'Backpack-front-circular': { x: 392, y: 300, width: 240, height: 240 },
    'Backpack-front-rectangular': { x: 392, y: 250, width: 240, height: 432 },
};
// Map apparel types to their template filenames
const APPAREL_TEMPLATES = {
    'Cap-front': 'black-cap.jpg',
    'Beanie-front': 'black-beannie.jpg',
    'T-Shirt-front': 'black-tshirt-front.jpg',
    'T-Shirt-back': 'black-tshirt-back.jpg',
    'Long T-Shirt-front': 'black-long-sleeve-sweatshirt-front.jpg',
    'Long T-Shirt-back': 'black-long-sleeve-sweatshirt-black.jpg',
    'Hoodie-front': 'black-hoodie-front.jpg',
    'Hoodie-back': 'black-hoodie-back.jpg',
    'Backpack-front': 'black-backpack.jpg',
};
/**
 * Generate a design using DALL-E 3
 */
exports.generateCreatorDesign = (0, https_1.onCall)({ secrets: [openaiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { prompt, category, apparelType, surface, badgeShape, badgeDimensions } = request.data;
    const userId = request.auth.uid;
    if (!prompt || !category) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields: prompt, category');
    }
    if (prompt.length > 1000) {
        throw new https_1.HttpsError('invalid-argument', 'Prompt too long. Maximum 1000 characters.');
    }
    try {
        const db = admin.firestore();
        // Check credits
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const currentCredits = userData?.credits || 0;
        if (currentCredits < 10) {
            throw new https_1.HttpsError('failed-precondition', 'Insufficient credits. Need 10 credits for logo generation.');
        }
        // Build logo prompt - REQUEST TRANSPARENT BACKGROUND
        const shapeDescription = badgeShape === 'circular' ? 'circular' : 'rectangular';
        const surfaceText = surface === 'back' ? 'back' : 'front';
        // Generate LOGO ONLY with DALL-E 3 on TRANSPARENT background
        const logoPrompt = `A high resolution ${shapeDescription} logo design on a completely transparent background. The design: ${prompt}. Professional quality, clean, sharp details, vibrant colors. Perfect for apparel printing. IMPORTANT: Transparent background, no white background.`;
        const logoResponse = await axios_1.default.post('https://api.openai.com/v1/images/generations', {
            model: 'dall-e-3',
            prompt: logoPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
            style: 'vivid',
        }, {
            headers: {
                'Authorization': `Bearer ${openaiApiKey.value()}`,
                'Content-Type': 'application/json',
            },
        });
        const logoUrl = logoResponse.data.data[0].url;
        // Download and save logo
        const logoImageResponse = await axios_1.default.get(logoUrl, { responseType: 'arraybuffer' });
        const logoBuffer = Buffer.from(logoImageResponse.data);
        const bucket = admin.storage().bucket();
        const timestamp = Date.now();
        const logoFileName = `creator-designs/${userId}/${timestamp}-logo.png`;
        const logoFile = bucket.file(logoFileName);
        await logoFile.save(logoBuffer, {
            metadata: { contentType: 'image/png' },
            public: true,
        });
        const logoImageUrl = `https://storage.googleapis.com/${bucket.name}/${logoFileName}`;
        // Store position configuration for later use
        const positionKey = `${apparelType}-${surfaceText}-${badgeShape}`;
        const defaultPosition = LOGO_POSITIONS[positionKey];
        // Save design to Firestore (logo URL + default position data)
        const designRef = await db.collection('creatorDesigns').add({
            userId,
            prompt,
            category,
            apparelType: apparelType || null,
            surface: surface || null,
            badgeShape: badgeShape || null,
            badgeDimensions: badgeDimensions || null,
            logoImageUrl, // Transparent PNG logo
            designImageUrl: '', // Will be created after user positions logo
            logoPosition: defaultPosition || { x: 392, y: 300, width: 240, height: 240, scale: 0.5 }, // Default 50% centered
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isPublished: false,
        });
        // Deduct credits and log interaction
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(userId);
            const userSnapshot = await transaction.get(userRef);
            const currentCredits = userSnapshot.data()?.credits || 0;
            transaction.update(userRef, {
                credits: Math.max(0, currentCredits - 10),
            });
            // Log interaction
            const logRef = db.collection('aiInteractionsLog').doc();
            transaction.set(logRef, {
                userId,
                credits: 10,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                category: 'creator-lab',
                action: 'design-generation',
                metadata: {
                    designId: designRef.id,
                    category,
                    apparelType,
                    surface,
                },
            });
        });
        return {
            designId: designRef.id,
            logoImageUrl, // Transparent PNG logo only
            designImageUrl: '', // No composite yet
            creditsRemaining: Math.max(0, currentCredits - 10),
        };
    }
    catch (error) {
        console.error('Error generating design:', error);
        if (error.response?.data?.error) {
            const errorMessage = error.response.data.error.message || 'Unknown error';
            const errorCode = error.response.data.error.code;
            // Check for content policy violation
            if (errorCode === 'content_policy_violation' || errorMessage.toLowerCase().includes('content policy')) {
                throw new https_1.HttpsError('failed-precondition', 'Content Policy Violation: Your prompt may contain inappropriate content. Please revise and try again with different wording.');
            }
            throw new https_1.HttpsError('internal', `OpenAI Error: ${errorMessage}`);
        }
        throw new https_1.HttpsError('internal', 'Failed to generate design');
    }
});
/**
 * Finalize design by creating composite with user-positioned logo
 */
exports.finalizeDesignComposite = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { designId, logoPosition } = request.data;
    const userId = request.auth.uid;
    if (!designId || !logoPosition) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields: designId, logoPosition');
    }
    try {
        const db = admin.firestore();
        // Get design
        const designDoc = await db.collection('creatorDesigns').doc(designId).get();
        if (!designDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Design not found');
        }
        const designData = designDoc.data();
        if (designData?.userId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Not your design');
        }
        const { logoImageUrl, apparelType, surface, badgeShape } = designData;
        if (!logoImageUrl) {
            throw new https_1.HttpsError('failed-precondition', 'Logo image not found');
        }
        // Get apparel template
        const surfaceText = surface === 'back' ? 'back' : 'front';
        const templateKey = `${apparelType}-${surfaceText}`;
        const templateFileName = APPAREL_TEMPLATES[templateKey];
        if (!templateFileName) {
            throw new https_1.HttpsError('invalid-argument', `No template configured for ${templateKey}`);
        }
        const bucket = admin.storage().bucket();
        // Download logo
        const logoPath = logoImageUrl.split(`${bucket.name}/`)[1];
        const logoFile = bucket.file(logoPath);
        const [logoBuffer] = await logoFile.download();
        // Download apparel template
        const templatePath = `apparel-templates/${templateFileName}`;
        const templateFile = bucket.file(templatePath);
        const [templateBuffer] = await templateFile.download();
        // Get default position for sizing
        const positionKey = `${apparelType}-${surfaceText}-${badgeShape}`;
        const defaultPosition = LOGO_POSITIONS[positionKey] || { x: 392, y: 300, width: 240, height: 240 };
        // Calculate actual size based on user's scale
        const finalWidth = Math.round(defaultPosition.width * logoPosition.scale);
        const finalHeight = Math.round(defaultPosition.height * logoPosition.scale);
        // Create composite
        const compositeBuffer = await (0, sharp_1.default)(templateBuffer)
            .composite([{
                input: await (0, sharp_1.default)(logoBuffer)
                    .resize(finalWidth, finalHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toBuffer(),
                top: Math.round(logoPosition.y),
                left: Math.round(logoPosition.x),
            }])
            .jpeg({ quality: 90 })
            .toBuffer();
        // Save composite
        const timestamp = Date.now();
        const mockupFileName = `creator-designs/${userId}/${timestamp}-mockup.jpg`;
        const mockupFile = bucket.file(mockupFileName);
        await mockupFile.save(compositeBuffer, {
            metadata: { contentType: 'image/jpeg' },
            public: true,
        });
        const designImageUrl = `https://storage.googleapis.com/${bucket.name}/${mockupFileName}`;
        // Update design with composite URL and final position
        await db.collection('creatorDesigns').doc(designId).update({
            designImageUrl,
            logoPosition,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { designImageUrl };
    }
    catch (error) {
        console.error('Error finalizing composite:', error);
        throw new https_1.HttpsError('internal', 'Failed to create composite');
    }
});
/**
 * Generate a model showcase image using DALL-E 3
 */
exports.generateModelShowcase = (0, https_1.onCall)({ secrets: [openaiApiKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { designId, modelPrompt, apparelType } = request.data;
    const userId = request.auth.uid;
    if (!designId || !modelPrompt || !apparelType) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields: designId, modelPrompt, apparelType');
    }
    if (modelPrompt.length > 500) {
        throw new https_1.HttpsError('invalid-argument', 'Model prompt too long. Maximum 500 characters.');
    }
    try {
        const db = admin.firestore();
        // Check credits
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const currentCredits = userData?.credits || 0;
        if (currentCredits < 10) {
            throw new https_1.HttpsError('failed-precondition', 'Insufficient credits. Need 10 credits.');
        }
        // Get design details
        const designDoc = await db.collection('creatorDesigns').doc(designId).get();
        if (!designDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Design not found');
        }
        const designData = designDoc.data();
        if (designData?.userId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Not your design');
        }
        // Get the original design prompt and specifications to ensure consistency
        const originalPrompt = designData?.prompt || '';
        const surface = designData?.surface || 'front';
        // Build enhanced prompt that recreates the exact apparel from first image
        // We need to describe it in detail since DALL-E 3 API doesn't support image inputs
        const enhancedPrompt = `${modelPrompt}, wearing a black ${apparelType.toLowerCase()} with a custom design on the ${surface}. The ${apparelType.toLowerCase()}'s design features: ${originalPrompt}. The ${apparelType.toLowerCase()} should be clearly visible and match the exact style of a professional product photography mockup. Natural lifestyle photography, realistic setting, high quality, professional composition.`;
        // Call OpenAI DALL-E 3
        const response = await axios_1.default.post('https://api.openai.com/v1/images/generations', {
            model: 'dall-e-3',
            prompt: enhancedPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
            style: 'natural',
        }, {
            headers: {
                'Authorization': `Bearer ${openaiApiKey.value()}`,
                'Content-Type': 'application/json',
            },
        });
        const imageUrl = response.data.data[0].url;
        // Download image from OpenAI
        const imageResponse = await axios_1.default.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data);
        // Upload to Firebase Storage
        const bucket = admin.storage().bucket();
        const timestamp = Date.now();
        const fileName = `creator-models/${userId}/${timestamp}.png`;
        const file = bucket.file(fileName);
        await file.save(imageBuffer, {
            metadata: { contentType: 'image/png' },
            public: true,
        });
        const modelImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        // Update design with model info
        await db.collection('creatorDesigns').doc(designId).update({
            modelImageUrl,
            modelPrompt,
            modelGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Deduct credits and log interaction
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection('users').doc(userId);
            const userSnapshot = await transaction.get(userRef);
            const currentCredits = userSnapshot.data()?.credits || 0;
            transaction.update(userRef, {
                credits: Math.max(0, currentCredits - 10),
            });
            // Log interaction
            const logRef = db.collection('aiInteractionsLog').doc();
            transaction.set(logRef, {
                userId,
                credits: 10,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                category: 'creator-lab',
                action: 'model-generation',
                metadata: {
                    designId,
                    apparelType,
                },
            });
        });
        return {
            modelImageUrl,
            creditsRemaining: Math.max(0, currentCredits - 10),
        };
    }
    catch (error) {
        console.error('Error generating model:', error);
        if (error.response?.data?.error) {
            const errorMessage = error.response.data.error.message || 'Unknown error';
            const errorCode = error.response.data.error.code;
            // Check for content policy violation
            if (errorCode === 'content_policy_violation' || errorMessage.toLowerCase().includes('content policy')) {
                throw new https_1.HttpsError('failed-precondition', 'Content Policy Violation: Your model description may contain inappropriate content. Please use family-friendly language and try again.');
            }
            throw new https_1.HttpsError('internal', `OpenAI Error: ${errorMessage}`);
        }
        throw new https_1.HttpsError('internal', 'Failed to generate model showcase');
    }
});
/**
 * Publish a design as a Treehouse product
 */
exports.publishCreatorProduct = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { designId, productName, productDescription, category, apparelType, surface, modelImageUrl, modelPrompt, } = request.data;
    const userId = request.auth.uid;
    if (!designId || !productName || !category) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields: designId, productName, category');
    }
    if (category === 'Apparel' && !apparelType) {
        throw new https_1.HttpsError('invalid-argument', 'Apparel products must have an apparelType');
    }
    try {
        const db = admin.firestore();
        // Get design
        const designDoc = await db.collection('creatorDesigns').doc(designId).get();
        if (!designDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Design not found');
        }
        const designData = designDoc.data();
        if (designData?.userId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Not your design');
        }
        if (designData?.isPublished) {
            throw new https_1.HttpsError('failed-precondition', 'Design already published');
        }
        // Get user info
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const userRole = userData?.role;
        // Calculate price for apparel products
        const APPAREL_PRICES = {
            'T-Shirt': 625,
            'Long T-Shirt': 937.50,
            'Hoodie': 1250,
            'Cap': 437.50,
            'Beanie': 437.50,
            'Backpack': 750,
        };
        const productPrice = category === 'Apparel' && apparelType
            ? (APPAREL_PRICES[apparelType] || 0)
            : 0;
        // Prepare product data
        const productData = {
            creatorId: userId,
            creatorName: userData?.displayName || 'Anonymous Creator',
            creatorEmail: userData?.email || request.auth?.token?.email || '',
            designId,
            productName,
            productDescription: productDescription || '',
            category,
            apparelType: apparelType || null,
            apparelTypes: category === 'Apparel' && apparelType ? [apparelType] : [],
            surface: surface || null,
            logoImageUrl: designData.logoImageUrl || null,
            designImageUrl: designData.designImageUrl,
            designThumbnailUrl: modelImageUrl || designData.designImageUrl,
            modelImageUrl: modelImageUrl || null,
            modelPrompt: modelPrompt || null,
            price: productPrice,
            currency: 'ZAR',
            isActive: true,
            salesCount: 0,
            totalRevenue: 0,
            viewCount: 0,
            addToCartCount: 0,
            publishedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Add dispensary fields only if user is dispensary owner/staff AND has dispensary data
        if ((userRole === 'DispensaryOwner' || userRole === 'DispensaryStaff') && userData?.dispensaryId) {
            productData.dispensaryId = userData.dispensaryId;
            productData.dispensaryName = userData.dispensaryName || null;
            productData.dispensaryType = userData.dispensaryType || null;
        }
        // Create product
        const productRef = await db.collection('treehouseProducts').add(productData);
        // Mark design as published
        await db.collection('creatorDesigns').doc(designId).update({
            isPublished: true,
            productId: productRef.id,
            publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            productId: productRef.id,
            success: true,
        };
    }
    catch (error) {
        console.error('Error publishing product:', error);
        throw new https_1.HttpsError('internal', 'Failed to publish product');
    }
});
/**
 * Update Treehouse product details
 */
exports.updateTreehouseProduct = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { productId, updates } = request.data;
    const userId = request.auth.uid;
    if (!productId || !updates) {
        throw new https_1.HttpsError('invalid-argument', 'Missing productId or updates');
    }
    try {
        const db = admin.firestore();
        const productDoc = await db.collection('treehouseProducts').doc(productId).get();
        if (!productDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Product not found');
        }
        const productData = productDoc.data();
        if (productData?.creatorId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Not your product');
        }
        // Only allow specific fields to be updated
        const allowedUpdates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (updates.productName)
            allowedUpdates.productName = updates.productName;
        if (updates.productDescription !== undefined)
            allowedUpdates.productDescription = updates.productDescription;
        if (updates.logoImageUrl)
            allowedUpdates.logoImageUrl = updates.logoImageUrl;
        if (updates.designImageUrl)
            allowedUpdates.designImageUrl = updates.designImageUrl;
        if (updates.modelImageUrl !== undefined)
            allowedUpdates.modelImageUrl = updates.modelImageUrl;
        await db.collection('treehouseProducts').doc(productId).update(allowedUpdates);
        return { success: true };
    }
    catch (error) {
        console.error('Error updating product:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to update product');
    }
});
/**
 * Toggle product active status
 */
exports.toggleProductStatus = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { productId } = request.data;
    const userId = request.auth.uid;
    if (!productId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing productId');
    }
    try {
        const db = admin.firestore();
        const productDoc = await db.collection('treehouseProducts').doc(productId).get();
        if (!productDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Product not found');
        }
        const productData = productDoc.data();
        if (productData?.creatorId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Not your product');
        }
        const newStatus = !productData.isActive;
        await db.collection('treehouseProducts').doc(productId).update({
            isActive: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, isActive: newStatus };
    }
    catch (error) {
        console.error('Error toggling product status:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to toggle product status');
    }
});
/**
 * Delete Treehouse product
 */
exports.deleteTreehouseProduct = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in.');
    }
    const { productId } = request.data;
    const userId = request.auth.uid;
    if (!productId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing productId');
    }
    try {
        const db = admin.firestore();
        const productDoc = await db.collection('treehouseProducts').doc(productId).get();
        if (!productDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Product not found');
        }
        const productData = productDoc.data();
        if (productData?.creatorId !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Not your product');
        }
        // Check if product has sales
        if (productData.salesCount && productData.salesCount > 0) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot delete products that have been sold. Set to inactive instead.');
        }
        // Mark design as unpublished
        if (productData.designId) {
            await db.collection('creatorDesigns').doc(productData.designId).update({
                isPublished: false,
                productId: null,
            });
        }
        // Delete product
        await db.collection('treehouseProducts').doc(productId).delete();
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting product:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to delete product');
    }
});
//# sourceMappingURL=creator-lab.js.map