/**
 * Product Workflow Router
 * 
 * Determines whether a dispensary type should use generic or custom product pages
 */

import type { DispensaryType } from '@/types';

export interface ProductRoutes {
  addRoute: string;
  editRoute: (productId: string) => string;
  useGenericWorkflow: boolean;
}

/**
 * Get product routes for a dispensary type
 * Returns either generic or custom routes based on useGenericWorkflow flag
 */
export function getProductRoutes(dispensaryType: DispensaryType): ProductRoutes {
  const sanitizedType = dispensaryType.name.toLowerCase().replace(/[\s-&]+/g, '_');
  
  // Default to false if not set (backwards compatibility)
  const useGeneric = dispensaryType.useGenericWorkflow === true;

  return {
    addRoute: `/dispensary-admin/products/add/${sanitizedType}`,
    editRoute: (productId: string) => `/dispensary-admin/products/edit/${sanitizedType}/${productId}`,
    useGenericWorkflow: useGeneric
  };
}

/**
 * Check if a dispensary type uses the generic workflow
 */
export function usesGenericWorkflow(dispensaryType: DispensaryType | null | undefined): boolean {
  if (!dispensaryType) return false;
  return dispensaryType.useGenericWorkflow === true;
}

/**
 * Get the product collection name for a dispensary type
 */
export function getProductCollectionName(dispensaryTypeName: string): string {
  const sanitized = dispensaryTypeName.toLowerCase().replace(/[\s-&]+/g, '_');
  return `${sanitized}_products`;
}

/**
 * Wellness types that should use custom pages (hardcoded list for safety)
 * Even if useGenericWorkflow is accidentally set to true, these will use custom pages
 */
const FORCE_CUSTOM_WORKFLOW: string[] = [
  'Homeopathic store',
  'Traditional Medicine',
  'Mushroom',
  'Permaculture',
  'THC'
];

/**
 * Check if a dispensary type should be forced to use custom workflow
 * This is a safety mechanism to prevent accidental migration of existing types
 */
export function shouldForceCustomWorkflow(dispensaryTypeName: string): boolean {
  return FORCE_CUSTOM_WORKFLOW.includes(dispensaryTypeName);
}

/**
 * Get workflow type with safety checks
 */
export function getWorkflowType(dispensaryType: DispensaryType): 'generic' | 'custom' {
  // Safety check: force existing types to use custom workflow
  if (shouldForceCustomWorkflow(dispensaryType.name)) {
    return 'custom';
  }

  // Otherwise, check the flag (default to custom for safety)
  return dispensaryType.useGenericWorkflow === true ? 'generic' : 'custom';
}

/**
 * Wellness types currently using generic workflow
 * This list should be updated as types are migrated
 */
export const GENERIC_WORKFLOW_TYPES = new Set<string>([
  'Apothecary'
]);

/**
 * Check if a type is in the approved generic workflow list
 */
export function isApprovedForGenericWorkflow(dispensaryTypeName: string): boolean {
  return GENERIC_WORKFLOW_TYPES.has(dispensaryTypeName);
}
