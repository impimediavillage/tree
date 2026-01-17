/**
 * Category Structure Analyzer
 * 
 * Analyzes the categoriesData map structure from dispensaryTypeProductCategories
 * to dynamically understand the hierarchy depth and navigation paths.
 */

export interface CategoryLevel {
  key: string;
  label: string;
  hasImage: boolean;
  isArray: boolean;
}

export interface CategoryStructureMetadata {
  depth: number; // 1, 2, or 3 levels deep
  levels: CategoryLevel[]; // Array of level definitions
  navigationPath: string[]; // Path to navigate through the structure
  sampleCategories?: string[]; // Sample category names for validation
}

/**
 * Analyzes a categoriesData object to determine its structure
 * @param categoriesData - The categoriesData map from Firestore
 * @returns Metadata about the category structure
 */
export function analyzeCategoryStructure(categoriesData: any): CategoryStructureMetadata {
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

  // Determine the primary navigation key (usually the first or most common structure)
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
        // Level 2: Subcategories
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
    // This is like the homeopathy structure with nested objects
    
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

/**
 * Retrieves categories from categoriesData using the analyzed structure
 * @param categoriesData - The categoriesData map
 * @param metadata - Structure metadata from analyzeCategoryStructure
 * @returns Array of categories at the appropriate level
 */
export function extractCategories(
  categoriesData: any, 
  metadata: CategoryStructureMetadata
): any[] {
  let current = categoriesData;
  
  // Navigate through the path
  for (const key of metadata.navigationPath) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`Navigation failed at key: ${key}`);
      return [];
    }
  }

  // Handle both array and object values
  if (Array.isArray(current)) {
    return current;
  } else if (typeof current === 'object') {
    return Object.values(current);
  }

  return [];
}

/**
 * Validates if a category structure matches expected metadata
 * @param categoriesData - The categoriesData to validate
 * @param expectedMetadata - The expected structure metadata
 * @returns true if valid, error message if invalid
 */
export function validateCategoryStructure(
  categoriesData: any,
  expectedMetadata: CategoryStructureMetadata
): { valid: boolean; error?: string } {
  try {
    const analyzedMetadata = analyzeCategoryStructure(categoriesData);
    
    if (analyzedMetadata.depth !== expectedMetadata.depth) {
      return {
        valid: false,
        error: `Structure depth mismatch: expected ${expectedMetadata.depth}, got ${analyzedMetadata.depth}`
      };
    }

    // Check if navigation path matches
    const pathMatch = expectedMetadata.navigationPath.every((key, idx) => 
      analyzedMetadata.navigationPath[idx] === key
    );

    if (!pathMatch) {
      return {
        valid: false,
        error: `Navigation path mismatch: expected [${expectedMetadata.navigationPath.join(', ')}], got [${analyzedMetadata.navigationPath.join(', ')}]`
      };
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Unknown validation error'
    };
  }
}

/**
 * Generates a human-readable description of the category structure
 * @param metadata - Structure metadata
 * @returns Description string
 */
export function describeCategoryStructure(metadata: CategoryStructureMetadata): string {
  const levelDescriptions = metadata.levels.map((level, idx) => 
    `Level ${idx + 1}: ${level.label}${level.hasImage ? ' (with images)' : ''}`
  );
  
  return [
    `Structure Depth: ${metadata.depth} level${metadata.depth > 1 ? 's' : ''}`,
    `Navigation Path: ${metadata.navigationPath.join(' → ')}`,
    ...levelDescriptions,
    metadata.sampleCategories?.length ? `Sample Categories: ${metadata.sampleCategories.join(', ')}` : ''
  ].filter(Boolean).join('\n');
}

/**
 * Stores category structure metadata in Firestore dispensaryTypes document
 */
export interface StoredCategoryStructure {
  metadata: CategoryStructureMetadata;
  lastAnalyzed: Date;
  analyzedBy: string;
}

/**
 * Helper to create route paths for add/edit pages
 */
export function generateProductRoutes(dispensaryTypeName: string): {
  addRoute: string;
  editRoute: (productId: string) => string;
  collectionName: string;
} {
  const sanitizedType = dispensaryTypeName.toLowerCase().replace(/[\s-&]+/g, '_');
  
  return {
    addRoute: `/dispensary-admin/products/add/${sanitizedType}`,
    editRoute: (productId: string) => `/dispensary-admin/products/edit/${sanitizedType}/${productId}`,
    collectionName: `${sanitizedType}_products`
  };
}
