'use client';

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  MiniMap,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Network,
  RotateCcw,
  Play
} from 'lucide-react';
import { analyzeCategoryStructure, type CategoryStructureMetadata } from '@/lib/categoryStructureAnalyzer';
import CategoryNode from './CategoryNode';
import SubcategoryNode from './SubcategoryNode';

// Custom node types
const nodeTypes = {
  category: CategoryNode,
  subcategory: SubcategoryNode,
};

interface CategoryStructureBuilderProps {
  onStructureChange?: (json: any, metadata: CategoryStructureMetadata) => void;
  initialJSON?: string;
}

export default function CategoryStructureBuilder({
  onStructureChange,
  initialJSON = ''
}: CategoryStructureBuilderProps) {
  const [jsonInput, setJsonInput] = useState(initialJSON);
  const [parsedJSON, setParsedJSON] = useState<any>(null);
  const [metadata, setMetadata] = useState<CategoryStructureMetadata | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { toast } = useToast();

  // Parse JSON and convert to visual nodes
  const parseAndVisualize = useCallback(() => {
    try {
      setParseError(null);
      
      // Parse JSON
      const parsed = JSON.parse(jsonInput);
      setParsedJSON(parsed);

      // Analyze structure
      const structureMetadata = analyzeCategoryStructure(parsed);
      setMetadata(structureMetadata);

      // Convert to visual nodes
      const { nodes: visualNodes, edges: visualEdges } = convertJSONToNodes(parsed, structureMetadata);
      setNodes(visualNodes);
      setEdges(visualEdges);

      // Notify parent
      if (onStructureChange) {
        onStructureChange(parsed, structureMetadata);
      }

      toast({
        title: 'Structure Parsed!',
        description: `Found ${structureMetadata.depth} level(s) with ${visualNodes.length} categories.`,
        variant: 'default'
      });
    } catch (error: any) {
      setParseError(error.message || 'Invalid JSON format');
      toast({
        title: 'Parse Error',
        description: error.message || 'Invalid JSON format',
        variant: 'destructive'
      });
    }
  }, [jsonInput, onStructureChange, setNodes, setEdges, toast]);

  // Convert JSON to React Flow nodes
  const convertJSONToNodes = (json: any, meta: CategoryStructureMetadata): { nodes: Node[], edges: Edge[] } => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let nodeId = 0;
    let yPosition = 0;

    // Navigate to the category array using the navigation path
    let categories = json;
    for (const key of meta.navigationPath) {
      if (categories && typeof categories === 'object' && key in categories) {
        categories = categories[key];
      }
    }

    // Handle both array and object formats
    const categoryArray = Array.isArray(categories) ? categories : Object.values(categories);

    // Level 1: Top-level categories
    categoryArray.forEach((category: any, catIndex: number) => {
      const categoryNodeId = `cat-${nodeId++}`;
      
      newNodes.push({
        id: categoryNodeId,
        type: 'category',
        position: { x: 100, y: yPosition },
        data: {
          name: category.name || `Category ${catIndex + 1}`,
          image: category.image,
          level: 1,
          onEdit: () => handleEditNode(categoryNodeId),
          onDelete: () => handleDeleteNode(categoryNodeId),
        },
      });

      yPosition += 150;

      // Level 2: Subcategories
      if (category.subcategories && Array.isArray(category.subcategories)) {
        category.subcategories.forEach((subcategory: any, subIndex: number) => {
          const subcategoryNodeId = `sub-${nodeId++}`;
          
          newNodes.push({
            id: subcategoryNodeId,
            type: 'subcategory',
            position: { x: 450, y: yPosition - 150 + (subIndex * 100) },
            data: {
              name: subcategory.name || `Subcategory ${subIndex + 1}`,
              image: subcategory.image,
              level: 2,
              onEdit: () => handleEditNode(subcategoryNodeId),
              onDelete: () => handleDeleteNode(subcategoryNodeId),
            },
          });

          // Create edge from category to subcategory
          newEdges.push({
            id: `edge-${categoryNodeId}-${subcategoryNodeId}`,
            source: categoryNodeId,
            target: subcategoryNodeId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2 },
          });

          // Level 3: Sub-subcategories (if exists)
          if (subcategory.subcategories && Array.isArray(subcategory.subcategories)) {
            subcategory.subcategories.forEach((subSubcategory: any, subSubIndex: number) => {
              const subSubcategoryNodeId = `subsub-${nodeId++}`;
              
              newNodes.push({
                id: subSubcategoryNodeId,
                type: 'subcategory',
                position: { x: 800, y: yPosition - 150 + (subIndex * 100) + (subSubIndex * 60) },
                data: {
                  name: subSubcategory.name || `Sub-sub ${subSubIndex + 1}`,
                  image: subSubcategory.image,
                  level: 3,
                  onEdit: () => handleEditNode(subSubcategoryNodeId),
                  onDelete: () => handleDeleteNode(subSubcategoryNodeId),
                },
              });

              // Create edge from subcategory to sub-subcategory
              newEdges.push({
                id: `edge-${subcategoryNodeId}-${subSubcategoryNodeId}`,
                source: subcategoryNodeId,
                target: subSubcategoryNodeId,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#8b5cf6', strokeWidth: 2 },
              });
            });
          }
        });
      }
    });

    return { nodes: newNodes, edges: newEdges };
  };

  const handleEditNode = (nodeId: string) => {
    toast({
      title: 'Edit Node',
      description: `Editing ${nodeId} - Full edit modal coming soon!`,
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    
    toast({
      title: 'Node Deleted',
      description: 'Category removed from structure.',
    });
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const resetBuilder = () => {
    setJsonInput('');
    setParsedJSON(null);
    setMetadata(null);
    setParseError(null);
    setNodes([]);
    setEdges([]);
  };

  return (
    <div className="space-y-4">
      {/* JSON Input Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Category Structure JSON
          </CardTitle>
          <CardDescription>
            Paste your category structure JSON below, then click Parse to visualize
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`{\n  "products": [\n    {\n      "name": "Category Name",\n      "image": "https://...",\n      "subcategories": [...]\n    }\n  ]\n}`}
            rows={10}
            className="font-mono text-sm"
          />
          
          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{parseError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={parseAndVisualize} className="flex-1">
              <Play className="mr-2 h-4 w-4" />
              Parse & Visualize
            </Button>
            <Button onClick={resetBuilder} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Structure Analysis */}
      {metadata && (
        <Card className="border-2 border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Structure Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                Depth: {metadata.depth} Level{metadata.depth > 1 ? 's' : ''}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Network className="h-3 w-3" />
                Path: {metadata.navigationPath.join(' → ')}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Levels:</p>
              {metadata.levels.map((level, idx) => (
                <div key={idx} className="text-sm ml-4">
                  <span className="font-medium">Level {idx + 1}:</span> {level.label}
                  {level.hasImage && ' (with images)'}
                </div>
              ))}
            </div>

            {metadata.sampleCategories && metadata.sampleCategories.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Sample Categories:</p>
                <div className="flex flex-wrap gap-1">
                  {metadata.sampleCategories.map((cat, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visual Canvas */}
      {nodes.length > 0 && (
        <Card className="border-2 border-indigo-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Visual Structure Map
            </CardTitle>
            <CardDescription>
              Drag nodes to reposition. Connect nodes to create relationships.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ width: '100%', height: '600px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
                <Controls />
                <MiniMap 
                  nodeColor={(node) => {
                    if (node.type === 'category') return '#6366f1';
                    if (node.data.level === 2) return '#10b981';
                    return '#8b5cf6';
                  }}
                  className="bg-white/90 dark:bg-slate-800/90"
                />
                <Panel position="top-right" className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg shadow-lg">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-indigo-500" />
                      <span>Category</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Subcategory</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-purple-500" />
                      <span>Sub-sub</span>
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
