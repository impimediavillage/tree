import { Node, Edge } from 'reactflow';

export interface JsonTreeNode extends Node {
  id: string;
  type: 'jsonObject' | 'jsonArray' | 'jsonPrimitive' | 'jsonMetadata';
  position: { x: number; y: number };
  data: {
    label: string;
    value?: any;
    fieldCount?: number;
    itemCount?: number;
    path: string;
    jsonType?: 'string' | 'number' | 'boolean';
  };
}

const METADATA_FIELDS = ['meta', 'recommendedStructuredData', 'semanticRelationships', 'aiSearchBoost', 'pageBlueprint'];

/**
 * Parse entire JSON structure into visual nodes
 * Creates different node types for objects, arrays, and primitives
 */
export function parseJsonToNodes(json: any): { nodes: JsonTreeNode[]; edges: Edge[] } {
  const nodes: JsonTreeNode[] = [];
  const edges: Edge[] = [];
  let nodeIdCounter = 0;
  let yOffset = 0;

  function getNodeId(): string {
    return `node-${nodeIdCounter++}`;
  }

  function isMetadataField(key: string): boolean {
    return METADATA_FIELDS.includes(key);
  }

  function parseValue(
    value: any,
    key: string,
    path: string,
    parentId: string | null,
    xOffset: number,
    depth: number
  ): string {
    const nodeId = getNodeId();
    const y = yOffset;
    yOffset += 120; // Vertical spacing

    // Calculate x position based on depth
    const x = xOffset + (depth * 300);

    // Determine node type
    if (value === null || value === undefined) {
      // Null/undefined as primitive
      nodes.push({
        id: nodeId,
        type: 'jsonPrimitive',
        position: { x, y },
        data: {
          label: key,
          value: value === null ? 'null' : 'undefined',
          path,
          jsonType: 'string'
        }
      });
    } else if (Array.isArray(value)) {
      // Array node
      const isMetadata = isMetadataField(key);
      nodes.push({
        id: nodeId,
        type: isMetadata ? 'jsonMetadata' : 'jsonArray',
        position: { x, y },
        data: {
          label: key,
          itemCount: value.length,
          path,
          fieldCount: value.length
        }
      });

      // Parse array items
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const childId = parseValue(item, `[${index}]`, itemPath, nodeId, x, depth + 1);
        edges.push({
          id: `${nodeId}-${childId}`,
          source: nodeId,
          target: childId,
          type: 'smoothstep',
          animated: isMetadata
        });
      });
    } else if (typeof value === 'object') {
      // Object node
      const keys = Object.keys(value);
      const isMetadata = isMetadataField(key);
      
      nodes.push({
        id: nodeId,
        type: isMetadata ? 'jsonMetadata' : 'jsonObject',
        position: { x, y },
        data: {
          label: key,
          fieldCount: keys.length,
          path
        }
      });

      // Parse object fields
      keys.forEach((childKey) => {
        const childPath = `${path}.${childKey}`;
        const childId = parseValue(value[childKey], childKey, childPath, nodeId, x, depth + 1);
        edges.push({
          id: `${nodeId}-${childId}`,
          source: nodeId,
          target: childId,
          type: 'smoothstep',
          animated: isMetadata
        });
      });
    } else {
      // Primitive value (string, number, boolean)
      const jsonType = typeof value as 'string' | 'number' | 'boolean';
      nodes.push({
        id: nodeId,
        type: 'jsonPrimitive',
        position: { x, y },
        data: {
          label: key,
          value: value,
          path,
          jsonType
        }
      });
    }

    // Create edge from parent
    if (parentId) {
      edges.push({
        id: `${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'smoothstep'
      });
    }

    return nodeId;
  }

  // Start parsing from root
  if (typeof json === 'object' && json !== null) {
    const rootKeys = Object.keys(json);
    
    // Create root node
    const rootId = getNodeId();
    nodes.push({
      id: rootId,
      type: 'jsonObject',
      position: { x: 0, y: 0 },
      data: {
        label: 'root',
        fieldCount: rootKeys.length,
        path: 'root'
      }
    });
    yOffset += 120;

    // Parse each top-level field
    rootKeys.forEach((key) => {
      const childPath = `root.${key}`;
      parseValue(json[key], key, childPath, rootId, 0, 1);
    });
  }

  return { nodes, edges };
}

/**
 * Reconstruct JSON from visual node structure
 * Preserves the hierarchy and connections
 */
export function reconstructJsonFromNodes(nodes: JsonTreeNode[], edges: Edge[]): any {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const childrenMap = new Map<string, string[]>();

  // Build parent-child relationships
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });

  function reconstructNode(nodeId: string): any {
    const node = nodeMap.get(nodeId);
    if (!node) return null;

    const children = childrenMap.get(nodeId) || [];

    switch (node.type) {
      case 'jsonPrimitive':
        return node.data.value;

      case 'jsonArray':
      case 'jsonMetadata':
        return children.map(childId => reconstructNode(childId));

      case 'jsonObject':
        const obj: any = {};
        children.forEach(childId => {
          const childNode = nodeMap.get(childId);
          if (childNode) {
            const key = childNode.data.label;
            obj[key] = reconstructNode(childId);
          }
        });
        return obj;

      default:
        return null;
    }
  }

  // Find root node
  const rootNode = nodes.find(n => n.data.label === 'root');
  if (!rootNode) return {};

  const children = childrenMap.get(rootNode.id) || [];
  const result: any = {};
  
  children.forEach(childId => {
    const childNode = nodeMap.get(childId);
    if (childNode) {
      const key = childNode.data.label;
      result[key] = reconstructNode(childId);
    }
  });

  return result;
}

/**
 * Apply auto-layout to nodes using hierarchical layout
 */
export function applyAutoLayout(nodes: JsonTreeNode[], edges: Edge[]): JsonTreeNode[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const childrenMap = new Map<string, string[]>();
  const levelMap = new Map<string, number>();

  // Build relationships and determine levels
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });

  function assignLevels(nodeId: string, level: number) {
    levelMap.set(nodeId, level);
    const children = childrenMap.get(nodeId) || [];
    children.forEach(childId => assignLevels(childId, level + 1));
  }

  // Find root and assign levels
  const rootNode = nodes.find(n => n.data.label === 'root');
  if (rootNode) {
    assignLevels(rootNode.id, 0);
  }

  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  levelMap.forEach((level, nodeId) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(nodeId);
  });

  // Position nodes
  const HORIZONTAL_SPACING = 280;
  const VERTICAL_SPACING = 150;

  levelGroups.forEach((nodeIds, level) => {
    nodeIds.forEach((nodeId, index) => {
      const node = nodeMap.get(nodeId);
      if (node) {
        node.position = {
          x: level * HORIZONTAL_SPACING,
          y: index * VERTICAL_SPACING
        };
      }
    });
  });

  return Array.from(nodeMap.values());
}
