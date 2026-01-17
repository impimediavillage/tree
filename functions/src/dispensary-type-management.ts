/**
 * Dispensary Type Management Cloud Functions
 * 
 * Functions for managing dispensary type category structures
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { CategoryStructureMetadata, CategoryLevel } from './types';

const db = admin.firestore();

/**
 * Analyzes a categoriesData object to determine its structure
 */
function analyzeCategoryStructure(categoriesData: any): CategoryStructureMetadata {
  if (!categoriesData || typeof categoriesData !== 'object') {
    throw new Error('Invalid categoriesData: must be an object');
  }

  const levels: CategoryLevel[] = [];
  const navigationPath: string[] = [];
  const sampleCategories: string[] = [];
  
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
    firstValue.slice(0, 3).forEach((cat: any) => {
      if (cat.name) sampleCategories.push(cat.name);
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
  } else if (typeof firstValue === 'object' && !Array.isArray(firstValue)) {
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
        nestedValue.slice(0, 3).forEach((cat: any) => {
          if (cat.name) sampleCategories.push(cat.name);
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

/**
 * Analyze category structure and update the dispensaryTypes document
 * This function analyzes the categoriesData structure and stores metadata
 * in the corresponding dispensaryTypes document for dynamic rendering
 */
export const analyzeCategoryStructureAndUpdate = onCall(
  { cors: true },
  async (request): Promise<{ success: boolean; message: string; metadata?: CategoryStructureMetadata }> => {
    // Verify user is Super Admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'Super Admin') {
      throw new HttpsError('permission-denied', 'Only Super Admins can analyze category structures');
    }

    const { dispensaryTypeName } = request.data;

    if (!dispensaryTypeName) {
      throw new HttpsError('invalid-argument', 'dispensaryTypeName is required');
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
        throw new HttpsError('not-found', `Category document "${dispensaryTypeName}" not found`);
      }

      const categoryData = categoryDoc.data();
      if (!categoryData || !categoryData.categoriesData) {
        throw new HttpsError('invalid-argument', 'categoriesData not found in document');
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
    } catch (error: any) {
      logger.error('Error analyzing category structure:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError('internal', `Failed to analyze structure: ${error.message}`);
    }
  }
);
