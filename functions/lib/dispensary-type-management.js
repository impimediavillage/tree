"use strict";
/**
 * Dispensary Type Management Cloud Functions
 *
 * Functions for managing dispensary type category structures
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
exports.analyzeCategoryStructureAndUpdate = exports.deleteCategoryDocument = exports.listCategoryDocuments = exports.createCategoryFromTemplate = exports.copyCategoryStructure = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
/**
 * Analyzes a categoriesData object to determine its structure
 */
function analyzeCategoryStructure(categoriesData) {
    if (!categoriesData || typeof categoriesData !== 'object') {
        throw new Error('Invalid categoriesData: must be an object');
    }
    const levels = [];
    const navigationPath = [];
    const sampleCategories = [];
    // Level 1: Top-level categories
    const topLevelKeys = Object.keys(categoriesData);
    if (topLevelKeys.length === 0) {
        throw new Error('categoriesData is empty');
    }
    // Determine the primary navigation key
    const firstKey = topLevelKeys[0];
    const firstValue = categoriesData[firstKey];
    // Check if top level is an array of category objects
    if (Array.isArray(firstValue)) {
        // Structure: { key: [{name, image, subcategories?}, ...] }
        levels.push({
            key: firstKey,
            label: 'Category',
            hasImage: firstValue.length > 0 && 'image' in firstValue[0],
            isArray: true
        });
        navigationPath.push(firstKey);
        // Extract sample categories
        firstValue.slice(0, 3).forEach((cat) => {
            if (cat.name)
                sampleCategories.push(cat.name);
        });
        // Check for subcategories
        if (firstValue.length > 0 && firstValue[0].subcategories) {
            const subcategories = firstValue[0].subcategories;
            if (Array.isArray(subcategories)) {
                levels.push({
                    key: 'subcategories',
                    label: 'Subcategory',
                    hasImage: subcategories.length > 0 && 'image' in subcategories[0],
                    isArray: true
                });
                // Check for sub-subcategories (3rd level)
                if (subcategories.length > 0 && subcategories[0].subcategories) {
                    levels.push({
                        key: 'subcategories',
                        label: 'Sub-Subcategory',
                        hasImage: false,
                        isArray: true
                    });
                }
            }
        }
    }
    else if (typeof firstValue === 'object' && !Array.isArray(firstValue)) {
        // Structure: { key: { nestedKey: [...] } }
        levels.push({
            key: firstKey,
            label: 'Category Group',
            hasImage: false,
            isArray: false
        });
        navigationPath.push(firstKey);
        // Navigate deeper
        const nestedKeys = Object.keys(firstValue);
        if (nestedKeys.length > 0) {
            const nestedKey = nestedKeys[0];
            const nestedValue = firstValue[nestedKey];
            if (Array.isArray(nestedValue)) {
                levels.push({
                    key: nestedKey,
                    label: 'Category',
                    hasImage: nestedValue.length > 0 && 'image' in nestedValue[0],
                    isArray: true
                });
                navigationPath.push(nestedKey);
                // Extract sample categories
                nestedValue.slice(0, 3).forEach((cat) => {
                    if (cat.name)
                        sampleCategories.push(cat.name);
                });
                // Check for subcategories
                if (nestedValue.length > 0 && nestedValue[0].subcategories) {
                    levels.push({
                        key: 'subcategories',
                        label: 'Subcategory',
                        hasImage: Array.isArray(nestedValue[0].subcategories) &&
                            nestedValue[0].subcategories.length > 0 &&
                            'image' in nestedValue[0].subcategories[0],
                        isArray: true
                    });
                }
            }
        }
    }
    return {
        depth: levels.length,
        levels,
        navigationPath,
        sampleCategories
    };
}
/**
 * Normalizes the category navigation structure while PRESERVING all metadata
 * Ensures categoriesData.categories exists for navigation, keeps metadata intact
 */
function normalizeToStandardStructure(inputData) {
    if (!inputData || typeof inputData !== 'object') {
        return {
            categoriesData: { categories: [] },
            metadata: {}
        };
    }
    // ✅ PRESERVE: Extract metadata fields to keep them
    const metadata = {};
    if (inputData.meta)
        metadata.meta = inputData.meta;
    if (inputData.structuredData)
        metadata.structuredData = inputData.structuredData;
    if (inputData.recommendedStructuredData)
        metadata.recommendedStructuredData = inputData.recommendedStructuredData;
    if (inputData.semanticRelationships)
        metadata.semanticRelationships = inputData.semanticRelationships;
    if (inputData.aiSearchBoost)
        metadata.aiSearchBoost = inputData.aiSearchBoost;
    if (inputData.pageBlueprint)
        metadata.pageBlueprint = inputData.pageBlueprint;
    // Extract the category navigation structure
    let rawCategories = inputData;
    if (inputData.categoriesData) {
        // Already has categoriesData wrapper
        rawCategories = inputData.categoriesData;
    }
    else if (inputData.categories) {
        // Has direct categories array
        rawCategories = { categories: inputData.categories };
    }
    else {
        // Remove metadata keys to find the category structure
        const { meta, structuredData, recommendedStructuredData, semanticRelationships, aiSearchBoost, pageBlueprint, ...rest } = inputData;
        rawCategories = rest;
    }
    // Ensure we have a categories array
    let categoriesArray = [];
    if (Array.isArray(rawCategories)) {
        categoriesArray = rawCategories;
    }
    else if (rawCategories?.categories && Array.isArray(rawCategories.categories)) {
        categoriesArray = rawCategories.categories;
    }
    else if (typeof rawCategories === 'object' && rawCategories !== null) {
        // Convert object values to array
        categoriesArray = Object.values(rawCategories).filter(v => typeof v === 'object');
    }
    return {
        categoriesData: { categories: categoriesArray },
        metadata
    };
}
/**
 * Copy category structure from one dispensary type to another
 */
exports.copyCategoryStructure = (0, https_1.onCall)({ cors: true }, async (request) => {
    // Verify user is Super Admin
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can copy category structures');
    }
    const { sourceDocId, targetDocId, overrides = {} } = request.data;
    if (!sourceDocId || !targetDocId) {
        throw new https_1.HttpsError('invalid-argument', 'sourceDocId and targetDocId are required');
    }
    try {
        logger.info(`Copying category structure from "${sourceDocId}" to "${targetDocId}"`, {
            userId: request.auth.uid,
            sourceDocId,
            targetDocId
        });
        // Fetch source document
        const sourceDoc = await db
            .collection('dispensaryTypeProductCategories')
            .doc(sourceDocId)
            .get();
        if (!sourceDoc.exists) {
            throw new https_1.HttpsError('not-found', `Source document "${sourceDocId}" not found`);
        }
        const sourceData = sourceDoc.data();
        if (!sourceData) {
            throw new https_1.HttpsError('internal', 'Source document has no data');
        }
        // Check if target already exists
        const targetDoc = await db
            .collection('dispensaryTypeProductCategories')
            .doc(targetDocId)
            .get();
        if (targetDoc.exists) {
            throw new https_1.HttpsError('already-exists', `Target document "${targetDocId}" already exists. Delete it first or use a different name.`);
        }
        // Prepare new document data
        const newDocData = {
            ...sourceData,
            name: targetDocId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            copiedFrom: sourceDocId,
            copiedAt: admin.firestore.FieldValue.serverTimestamp(),
            copiedBy: request.auth.uid,
            ...overrides
        };
        // Write to Firestore
        await db
            .collection('dispensaryTypeProductCategories')
            .doc(targetDocId)
            .set(newDocData);
        logger.info(`Successfully created "${targetDocId}" document`, {
            userId: request.auth.uid,
            targetDocId,
            categoryGroups: Object.keys(sourceData.categoriesData || {}).length
        });
        return {
            success: true,
            message: `Successfully copied "${sourceDocId}" to "${targetDocId}"`,
            documentId: targetDocId
        };
    }
    catch (error) {
        logger.error('Error copying category structure:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to copy category structure: ${error.message}`);
    }
});
/**
 * Create category structure from JSON template
 */
exports.createCategoryFromTemplate = (0, https_1.onCall)({ cors: true }, async (request) => {
    // Verify user is Super Admin
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can create category structures');
    }
    const { dispensaryTypeName, templateData } = request.data;
    if (!dispensaryTypeName || !templateData) {
        throw new https_1.HttpsError('invalid-argument', 'dispensaryTypeName and templateData are required');
    }
    try {
        logger.info(`Creating/updating category structure for "${dispensaryTypeName}" from template`, {
            userId: request.auth.uid,
            dispensaryTypeName
        });
        // Check if document already exists
        const existingDoc = await db
            .collection('dispensaryTypeProductCategories')
            .doc(dispensaryTypeName)
            .get();
        const isUpdate = existingDoc.exists;
        // ✅ NORMALIZE: Ensure standard navigation structure while PRESERVING metadata
        const normalized = normalizeToStandardStructure(templateData);
        logger.info(`Normalized category structure for "${dispensaryTypeName}"`, {
            inputKeys: Object.keys(templateData),
            outputStructure: {
                hasCategoriesData: true,
                hasCategories: !!normalized.categoriesData.categories,
                categoryCount: Array.isArray(normalized.categoriesData.categories) ? normalized.categoriesData.categories.length : 0,
                metadataFields: Object.keys(normalized.metadata)
            }
        });
        // Create or update document with CLEAN navigation + PRESERVED metadata
        const docData = {
            name: dispensaryTypeName,
            categoriesData: normalized.categoriesData, // ← Standardized navigation structure
            ...normalized.metadata, // ← PRESERVED: meta, structuredData, semanticRelationships, etc.
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid,
            createdFromTemplate: true
        };
        // Only set createdAt and createdBy for new documents
        if (!isUpdate) {
            docData.createdAt = admin.firestore.FieldValue.serverTimestamp();
            docData.createdBy = request.auth.uid;
        }
        await db
            .collection('dispensaryTypeProductCategories')
            .doc(dispensaryTypeName)
            .set(docData, { merge: true });
        logger.info(`Successfully ${isUpdate ? 'updated' : 'created'} "${dispensaryTypeName}" with normalized structure`, {
            userId: request.auth.uid,
            dispensaryTypeName,
            topLevelCategories: Array.isArray(normalized.categoriesData.categories) ? normalized.categoriesData.categories.length : 0
        });
        return {
            success: true,
            message: `Successfully ${isUpdate ? 'updated' : 'created'} "${dispensaryTypeName}" from template`,
            documentId: dispensaryTypeName
        };
    }
    catch (error) {
        logger.error('Error creating from template:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to create from template: ${error.message}`);
    }
});
/**
 * List all dispensary type category documents
 */
exports.listCategoryDocuments = (0, https_1.onCall)({ cors: true }, async (request) => {
    // Verify user is Super Admin
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can list category structures');
    }
    try {
        const snapshot = await db.collection('dispensaryTypeProductCategories').get();
        const documents = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                categoryGroups: Object.keys(data.categoriesData || {}).length,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                copiedFrom: data.copiedFrom,
                createdFromTemplate: data.createdFromTemplate
            };
        });
        return {
            success: true,
            documents
        };
    }
    catch (error) {
        logger.error('Error listing category documents:', error);
        throw new https_1.HttpsError('internal', `Failed to list documents: ${error.message}`);
    }
});
/**
 * Delete a category document (use with caution!)
 */
exports.deleteCategoryDocument = (0, https_1.onCall)({ cors: true }, async (request) => {
    // Verify user is Super Admin
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can delete category structures');
    }
    const { documentId } = request.data;
    if (!documentId) {
        throw new https_1.HttpsError('invalid-argument', 'documentId is required');
    }
    try {
        logger.warn(`Deleting category document "${documentId}"`, {
            userId: request.auth.uid,
            documentId
        });
        await db
            .collection('dispensaryTypeProductCategories')
            .doc(documentId)
            .delete();
        return {
            success: true,
            message: `Successfully deleted "${documentId}"`
        };
    }
    catch (error) {
        logger.error('Error deleting category document:', error);
        throw new https_1.HttpsError('internal', `Failed to delete document: ${error.message}`);
    }
});
/**
 * Analyze category structure and update the dispensaryTypes document
 * This function analyzes the categoriesData structure and stores metadata
 * in the corresponding dispensaryTypes document for dynamic rendering
 */
exports.analyzeCategoryStructureAndUpdate = (0, https_1.onCall)({ cors: true }, async (request) => {
    // Verify user is Super Admin
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can analyze category structures');
    }
    const { dispensaryTypeName } = request.data;
    if (!dispensaryTypeName) {
        throw new https_1.HttpsError('invalid-argument', 'dispensaryTypeName is required');
    }
    try {
        logger.info(`Analyzing category structure for "${dispensaryTypeName}"`, {
            userId: request.auth.uid,
            dispensaryTypeName
        });
        // Fetch categoriesData document
        const categoryDoc = await db
            .collection('dispensaryTypeProductCategories')
            .doc(dispensaryTypeName)
            .get();
        if (!categoryDoc.exists) {
            throw new https_1.HttpsError('not-found', `Category document "${dispensaryTypeName}" not found`);
        }
        const categoryData = categoryDoc.data();
        if (!categoryData || !categoryData.categoriesData) {
            throw new https_1.HttpsError('invalid-argument', 'categoriesData not found in document');
        }
        // Analyze the structure
        const metadata = analyzeCategoryStructure(categoryData.categoriesData);
        metadata.lastAnalyzed = new Date().toISOString();
        metadata.analyzedBy = request.auth.uid;
        logger.info(`Analyzed structure for "${dispensaryTypeName}"`, {
            depth: metadata.depth,
            navigationPath: metadata.navigationPath,
            sampleCategories: metadata.sampleCategories
        });
        // Find and update the corresponding dispensaryTypes document
        const typesQuery = await db
            .collection('dispensaryTypes')
            .where('name', '==', dispensaryTypeName)
            .limit(1)
            .get();
        if (typesQuery.empty) {
            logger.warn(`No dispensaryTypes document found for "${dispensaryTypeName}"`, {
                dispensaryTypeName
            });
            return {
                success: true,
                message: `Structure analyzed successfully, but no dispensaryTypes document found for "${dispensaryTypeName}". Metadata returned but not saved.`,
                metadata
            };
        }
        // Update the dispensaryTypes document with category structure metadata
        const typeDocId = typesQuery.docs[0].id;
        await db
            .collection('dispensaryTypes')
            .doc(typeDocId)
            .update({
            categoryStructure: metadata,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        logger.info(`Updated dispensaryTypes document with category structure`, {
            typeDocId,
            dispensaryTypeName,
            metadata
        });
        return {
            success: true,
            message: `Successfully analyzed and updated category structure for "${dispensaryTypeName}"`,
            metadata
        };
    }
    catch (error) {
        logger.error('Error analyzing category structure:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', `Failed to analyze structure: ${error.message}`);
    }
});
//# sourceMappingURL=dispensary-type-management.js.map