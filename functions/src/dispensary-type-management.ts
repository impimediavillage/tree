/**
 * Dispensary Type Management Cloud Functions
 * 
 * Functions for managing dispensary type category structures
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = admin.firestore();

interface CopyCategoryStructureRequest {
  sourceDocId: string;
  targetDocId: string;
  overrides?: Record<string, any>;
}

interface CreateFromTemplateRequest {
  dispensaryTypeName: string;
  templateData: Record<string, any>;
}

/**
 * Copy category structure from one dispensary type to another
 */
export const copyCategoryStructure = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string; documentId?: string }> => {
    // Verify user is Super Admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'Super Admin') {
      throw new HttpsError('permission-denied', 'Only Super Admins can copy category structures');
    }

    const { sourceDocId, targetDocId, overrides = {} } = request.data as CopyCategoryStructureRequest;

    if (!sourceDocId || !targetDocId) {
      throw new HttpsError('invalid-argument', 'sourceDocId and targetDocId are required');
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
        throw new HttpsError('not-found', `Source document "${sourceDocId}" not found`);
      }

      const sourceData = sourceDoc.data();

      if (!sourceData) {
        throw new HttpsError('internal', 'Source document has no data');
      }

      // Check if target already exists
      const targetDoc = await db
        .collection('dispensaryTypeProductCategories')
        .doc(targetDocId)
        .get();

      if (targetDoc.exists) {
        throw new HttpsError(
          'already-exists',
          `Target document "${targetDocId}" already exists. Delete it first or use a different name.`
        );
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
    } catch (error: any) {
      logger.error('Error copying category structure:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to copy category structure: ${error.message}`);
    }
  }
);

/**
 * Create category structure from JSON template
 */
export const createCategoryFromTemplate = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string; documentId?: string }> => {
    // Verify user is Super Admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'Super Admin') {
      throw new HttpsError('permission-denied', 'Only Super Admins can create category structures');
    }

    const { dispensaryTypeName, templateData } = request.data as CreateFromTemplateRequest;

    if (!dispensaryTypeName || !templateData) {
      throw new HttpsError('invalid-argument', 'dispensaryTypeName and templateData are required');
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
        throw new HttpsError(
          'already-exists',
          `Document "${dispensaryTypeName}" already exists`
        );
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
    } catch (error: any) {
      logger.error('Error creating from template:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to create from template: ${error.message}`);
    }
  }
);

/**
 * List all dispensary type category documents
 */
export const listCategoryDocuments = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; documents: any[] }> => {
    // Verify user is Super Admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'Super Admin') {
      throw new HttpsError('permission-denied', 'Only Super Admins can list category structures');
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
    } catch (error: any) {
      logger.error('Error listing category documents:', error);
      throw new HttpsError('internal', `Failed to list documents: ${error.message}`);
    }
  }
);

/**
 * Delete a category document (use with caution!)
 */
export const deleteCategoryDocument = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string }> => {
    // Verify user is Super Admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'Super Admin') {
      throw new HttpsError('permission-denied', 'Only Super Admins can delete category structures');
    }

    const { documentId } = request.data;

    if (!documentId) {
      throw new HttpsError('invalid-argument', 'documentId is required');
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
    } catch (error: any) {
      logger.error('Error deleting category document:', error);
      throw new HttpsError('internal', `Failed to delete document: ${error.message}`);
    }
  }
);
