import type { Node, Edge } from 'reactflow';

/**
 * Reconstructs the JSON structure from the visual node graph
 * This allows users to drag wires and restructure the entire JSON visually
 */
export function reconstructJSONFromGraph(nodes: Node[], edges: Edge[]): any {
  // Build a map of node relationships from edges
  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string>();
  
  edges.forEach(edge => {
    // Add child relationship
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
    
    // Add parent relationship
    parentMap.set(edge.target, edge.source);
  });

  // Find root nodes (nodes without parents)
  const rootNodes = nodes.filter(node => !parentMap.has(node.id));

  // Build JSON recursively from roots
  function buildNode(nodeId: string): any {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const nodeData = node.data as any;
    const children = childrenMap.get(nodeId) || [];

    // Reconstruct based on node type
    switch (nodeData.type) {
      case 'object': {
        const obj: any = {};
        children.forEach(childId => {
          const childNode = nodes.find(n => n.id === childId);
          if (childNode) {
            const childData = childNode.data as any;
            const fieldName = childData.fieldName || childData.label;
            obj[fieldName] = buildNode(childId);
          }
        });
        return obj;
      }

      case 'array': {
        const arr: any[] = [];
        children.forEach(childId => {
          arr.push(buildNode(childId));
        });
        return arr;
      }

      case 'string':
        return nodeData.value || '';
      
      case 'number':
        return Number(nodeData.value) || 0;
      
      case 'boolean':
        return Boolean(nodeData.value);
      
      case 'null':
        return null;

      default:
        return nodeData.value;
    }
  }

  // If single root, return its structure
  if (rootNodes.length === 1) {
    return buildNode(rootNodes[0].id);
  }

  // If multiple roots, return as object with root keys
  const result: any = {};
  rootNodes.forEach(rootNode => {
    const rootData = rootNode.data as any;
    const fieldName = rootData.fieldName || rootData.label || 'root';
    result[fieldName] = buildNode(rootNode.id);
  });

  return result;
}

/**
 * Validates if a new connection is allowed (type checking)
 */
export function isValidConnection(
  sourceNode: Node | undefined,
  targetNode: Node | undefined
): { valid: boolean; reason?: string } {
  if (!sourceNode || !targetNode) {
    return { valid: false, reason: 'Node not found' };
  }

  const sourceData = sourceNode.data as any;
  const targetData = targetNode.data as any;

  // Objects can contain anything
  if (sourceData.type === 'object') {
    return { valid: true };
  }

  // Arrays can contain anything
  if (sourceData.type === 'array') {
    return { valid: true };
  }

  // Primitives cannot have children
  if (['string', 'number', 'boolean', 'null'].includes(sourceData.type)) {
    return { valid: false, reason: 'Primitive values cannot have children' };
  }

  return { valid: true };
}

/**
 * Suggests field name for a connection (helpful when dragging)
 */
export function suggestFieldName(
  sourceNode: Node,
  targetNode: Node
): string {
  const sourceData = sourceNode.data as any;
  const targetData = targetNode.data as any;

  // If target already has a field name, use it
  if (targetData.fieldName) {
    return targetData.fieldName;
  }

  // Suggest based on target type
  if (targetData.type === 'array') {
    return 'items';
  }

  if (targetData.type === 'object') {
    return 'data';
  }

  // Use target label as fallback
  return targetData.label || 'value';
}
