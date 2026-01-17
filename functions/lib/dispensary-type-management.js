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
exports.deleteCategoryDocument = exports.listCategoryDocuments = exports.createCategoryFromTemplate = exports.copyCategoryStructure = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
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
        logger.info(`Creating category structure for "${dispensaryTypeName}" from template`, {
            userId: request.auth.uid,
            dispensaryTypeName
        });
        // Check if document already exists
        const existingDoc = await db
            .collection('dispensaryTypeProductCategories')
            .doc(dispensaryTypeName)
            .get();
        if (existingDoc.exists) {
            throw new https_1.HttpsError('already-exists', `Document "${dispensaryTypeName}" already exists`);
        }
        // Create document with template data
        const docData = {
            name: dispensaryTypeName,
            categoriesData: templateData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: request.auth.uid,
            createdFromTemplate: true
        };
        await db
            .collection('dispensaryTypeProductCategories')
            .doc(dispensaryTypeName)
            .set(docData);
        logger.info(`Successfully created "${dispensaryTypeName}" from template`, {
            userId: request.auth.uid,
            dispensaryTypeName,
            categoryGroups: Object.keys(templateData).length
        });
        return {
            success: true,
            message: `Successfully created "${dispensaryTypeName}" from template`,
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
//# sourceMappingURL=dispensary-type-management.js.map