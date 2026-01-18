import type { Node, Edge } from 'reactflow';

export type JSONNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JSONNodeData {
  label: string;
  value?: any;
  fieldName?: string;
  type: JSONNodeType;
  isExpandable: boolean;
  depth: number;
  fullPath: string;
}

/**
 * Converts entire JSON structure into React Flow nodes
 * Every field becomes a visual node that can be dragged and connected
 */
export function buildJSONTree(json: any): { nodes: Node[]; edges: Edge[] } {
  // Safety checks
  if (!json || (typeof json !== 'object' && !Array.isArray(json))) {
    console.warn('buildJSONTree: Invalid input, expected object or array');
    return { nodes: [], edges: [] };
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeId = 0;
  let yOffset = 0;

  const NODE_HEIGHT = 80;
  const NODE_WIDTH = 250;
  const INDENT = 100;

  function getNodeType(value: any): JSONNodeType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value as JSONNodeType;
  }

  function getNodeColor(type: JSONNodeType): string {
    switch (type) {
      case 'object': return '#9333ea'; // Purple
      case 'array': return '#3b82f6'; // Blue
      case 'string': return '#10b981'; // Green
      case 'number': return '#f59e0b'; // Orange
      case 'boolean': return '#ef4444'; // Red
      case 'null': return '#6b7280'; // Gray
      default: return '#8b5cf6';
    }
  }

  function formatValue(value: any, type: JSONNodeType): string {
    try {
      // Ensure we NEVER return an object or array
      if (value === null || value === undefined) return 'null';
      if (type === 'string') return `"${String(value).substring(0, 100)}"`;
      if (type === 'boolean') return value ? 'true' : 'false';
      if (type === 'null') return 'null';
      if (type === 'number') return String(value);
      if (type === 'array') {
        const len = Array.isArray(value) ? value.length : 0;
        return `Array[${len} items]`;
      }
      if (type === 'object') {
        try {
          const keys = Object.keys(value || {});
          return `Object{${keys.length} fields}`;
        } catch {
          return '{Object}';
        }
      }
      // Fallback: force to string
      return String(value).substring(0, 100);
    } catch (error) {
      console.error('Error formatting value:', error);
      return '[Format Error]';
    }
  }

  function traverse(
    obj: any,
    fieldName: string,
    parentId: string | null,
    depth: number,
    path: string[]
  ): string {
    // Prevent infinite loops from circular references or too deep nesting
    if (depth > 50) {
      console.warn('buildJSONTree: Max depth reached, stopping traversal');
      return `node-max-depth-${nodeId++}`;
    }

    const currentId = `node-${nodeId++}`;
    const type = getNodeType(obj);
    const isExpandable = type === 'object' || type === 'array';
    const fullPath = path.join('.');

    // Create node
    // CRITICAL: Ensure displayValue is ALWAYS a string
    let safeDisplayValue: string;
    try {
      safeDisplayValue = formatValue(obj, type);
      // Double-check it's actually a string
      if (typeof safeDisplayValue !== 'string') {
        safeDisplayValue = '[Invalid Display Value]';
      }
    } catch (error) {
      console.error('Error creating display value:', error);
      safeDisplayValue = '[Error]';
    }

    const node: Node = {
      id: currentId,
      type: 'custom',
      position: { x: depth * INDENT, y: yOffset },
      data: {
        label: String(fieldName), // Ensure string
        value: undefined, // Don't store the actual value to avoid React rendering issues
        fieldName: String(fieldName),
        type,
        isExpandable,
        depth,
        fullPath,
        color: getNodeColor(type),
        displayValue: safeDisplayValue // Guaranteed to be a string
      } as JSONNodeData & { color: string; displayValue: string }
    };

    nodes.push(node);
    yOffset += NODE_HEIGHT + 20;

    // Create edge from parent
    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${currentId}`,
        source: parentId,
        target: currentId,
        type: 'smoothstep',
        animated: false,
        style: { stroke: getNodeColor(type), strokeWidth: 2 }
      });
    }

    // Recursively traverse children
    try {
      if (type === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          traverse(value, key, currentId, depth + 1, [...path, key]);
        });
      } else if (type === 'array' && Array.isArray(obj)) {
        obj.forEach((item, index) => {
          traverse(item, `[${index}]`, currentId, depth + 1, [...path, `[${index}]`]);
        });
      }
    } catch (error) {
      console.error('Error traversing node:', fieldName, error);
    }

    return currentId;
  }

  // Start traversal from root
  try {
    traverse(json, 'root', null, 0, ['root']);
  } catch (error) {
    console.error('Error building JSON tree:', error);
    // Return partial results if any nodes were created
    if (nodes.length === 0) {
      // Create a single error node
      nodes.push({
        id: 'error-node',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          label: 'Error',
          value: 'Failed to parse JSON structure',
          fieldName: 'error',
          type: 'string' as JSONNodeType,
          isExpandable: false,
          depth: 0,
          fullPath: 'error',
          color: '#ef4444',
          displayValue: 'Error parsing JSON'
        }
      });
    }
  }

  return { nodes, edges };
}

/**
 * Extract only category nodes for simplified view
 * (Original behavior - for backward compatibility)
 */
export function extractCategoryNodes(json: any): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeId = 0;
  let yOffset = 0;

  const categoriesData = json?.categoriesData;
  if (!categoriesData) return { nodes, edges };

  function findCategoryArray(obj: any, path: string[] = []): any[] | null {
    for (const key in obj) {
      if (Array.isArray(obj[key]) && obj[key].length > 0 && obj[key][0].name) {
        return obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        const result = findCategoryArray(obj[key], [...path, key]);
        if (result) return result;
      }
    }
    return null;
  }

  const categories = findCategoryArray(categoriesData);
  if (!categories) return { nodes, edges };

  categories.forEach((category, index) => {
    const categoryId = `category-${nodeId++}`;
    nodes.push({
      id: categoryId,
      type: 'categoryNode',
      position: { x: 50, y: yOffset },
      data: {
        label: category.name || category.type || 'Unnamed',
        type: category.type,
        description: category.description,
        imageUrl: category.imageUrl
      }
    });

    // Add subcategories if they exist
    if (category.subcategories && Array.isArray(category.subcategories)) {
      category.subcategories.forEach((sub: any, subIndex: number) => {
        const subId = `sub-${nodeId++}`;
        nodes.push({
          id: subId,
          type: 'subcategoryNode',
          position: { x: 350, y: yOffset + (subIndex * 100) },
          data: {
            label: sub.name || sub.type,
            type: sub.type
          }
        });

        edges.push({
          id: `edge-${categoryId}-${subId}`,
          source: categoryId,
          target: subId,
          type: 'smoothstep'
        });
      });
    }

    yOffset += 120 + (category.subcategories?.length || 0) * 100;
  });

  return { nodes, edges };
}
