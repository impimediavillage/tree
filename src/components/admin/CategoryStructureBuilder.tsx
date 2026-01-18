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
import { buildJSONTree, extractCategoryNodes } from '@/lib/jsonTreeBuilder';
import { reconstructJSONFromGraph, isValidConnection, suggestFieldName } from '@/lib/jsonGraphReconstructor';
import CategoryNode from './CategoryNode';
import SubcategoryNode from './SubcategoryNode';
import JSONNode from './JSONNode';
import AnimatedWireEdge from './AnimatedWireEdge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Custom node types
const nodeTypes = {
  categoryNode: CategoryNode,
  subcategoryNode: SubcategoryNode,
  custom: JSONNode, // For full JSON visualization
};

// Custom edge types
const edgeTypes = {
  animated: AnimatedWireEdge,
};

interface CategoryStructureBuilderProps {
  onStructureChange?: (json: any, metadata: CategoryStructureMetadata) => void;
  initialJSON?: any; // Changed from string to any to accept objects
  showMetadataPanel?: boolean; // Optional metadata display
}

export default function CategoryStructureBuilder({
  onStructureChange,
  initialJSON = '',
  showMetadataPanel = true
}: CategoryStructureBuilderProps) {
  const [jsonInput, setJsonInput] = useState(
    typeof initialJSON === 'string' ? initialJSON : JSON.stringify(initialJSON, null, 2)
  );
  const [parsedJSON, setParsedJSON] = useState<any>(null);
  const [metadata, setMetadata] = useState<CategoryStructureMetadata | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'category' | 'fullJson'>('category');
  
  // Extract rich metadata from parsed JSON (SAFE - won't break if not present)
  const [richMetadata, setRichMetadata] = useState<{
    meta?: any;
    structuredData?: any;
    semantics?: any;
    searchBoost?: any;
    blueprint?: any;
  } | null>(null);
  
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

      // SAFE: Extract rich metadata if present (won't break if missing)
      if (parsed.meta || parsed.recommendedStructuredData || parsed.semanticRelationships) {
        setRichMetadata({
          meta: parsed.meta,
          structuredData: parsed.recommendedStructuredData,
          semantics: parsed.semanticRelationships,
          searchBoost: parsed.aiSearchBoost,
          blueprint: parsed.pageBlueprint
        });
      }

      // Analyze structure (existing logic - unchanged)
      const structureMetadata = analyzeCategoryStructure(parsed);
      setMetadata(structureMetadata);

      // Convert to visual nodes based on view mode
      let visualNodes: Node[];
      let visualEdges: Edge[];
      
      try {
        if (viewMode === 'fullJson') {
          // Full JSON tree visualization - ALL fields visible
          const result = buildJSONTree(parsed);
          visualNodes = result.nodes;
          visualEdges = result.edges;
          
          if (visualNodes.length === 0) {
            throw new Error('No nodes generated from JSON structure');
          }
        } else {
          // Category-only view (existing behavior)
          const result = extractCategoryNodes(parsed);
          visualNodes = result.nodes;
          visualEdges = result.edges;
        }
        
        setNodes(visualNodes);
        setEdges(visualEdges);
      } catch (vizError: any) {
        console.error('Visualization error:', vizError);
        toast({
          title: 'Visualization Error',
          description: vizError.message || 'Failed to create visual representation. Try Category view instead.',
          variant: 'destructive'
        });
        // Fallback to empty state instead of breaking
        setNodes([]);
        setEdges([]);
        throw vizError; // Re-throw to be caught by outer catch
      }

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
      const errorMessage = error.message || 'Invalid JSON format';
      setParseError(errorMessage);
      console.error('Parse and visualize error:', error);
      
      toast({
        title: 'Error Visualizing JSON',
        description: errorMessage.includes('JSON') 
          ? 'Check your JSON syntax - ensure quotes and commas are correct'
          : errorMessage,
        variant: 'destructive'
      });
      
      // Reset to safe state
      setNodes([]);
      setEdges([]);
      setParsedJSON(null);
    }
  }, [jsonInput, viewMode, onStructureChange, setNodes, setEdges, toast]);

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
    (params: Connection) => {
      // Validate connection before adding
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      const validation = isValidConnection(sourceNode, targetNode);
      
      if (!validation.valid) {
        toast({
          title: 'Invalid Connection',
          description: validation.reason,
          variant: 'destructive'
        });
        return;
      }

      // Add animated wire edge
      const newEdge = {
        ...params,
        type: 'animated',
        animated: true,
        data: {
          label: sourceNode && targetNode ? suggestFieldName(sourceNode, targetNode) : undefined,
          color: sourceNode?.data.color
        }
      };

      setEdges((eds) => addEdge(newEdge, eds));
      
      toast({
        title: 'Connection Created',
        description: 'Wire connected! Drag endpoints to reconnect.',
        variant: 'default'
      });
    },
    [nodes, setEdges, toast]
  );

  // Handle edge reconnection (dragging wire to new target)
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const sourceNode = nodes.find(n => n.id === newConnection.source);
      const targetNode = nodes.find(n => n.id === newConnection.target);
      
      const validation = isValidConnection(sourceNode, targetNode);
      
      if (!validation.valid) {
        toast({
          title: 'Invalid Connection',
          description: validation.reason,
          variant: 'destructive'
        });
        return;
      }

      setEdges((eds) => {
        // Remove old edge
        const filtered = eds.filter(e => e.id !== oldEdge.id);
        
        // Add new edge with animation
        const newEdge: Edge = {
          id: `reconnected-${Date.now()}`,
          source: newConnection.source || '',
          target: newConnection.target || '',
          type: 'animated',
          animated: true,
          data: {
            label: sourceNode && targetNode ? suggestFieldName(sourceNode, targetNode) : undefined,
            color: sourceNode?.data.color
          }
        };
        
        return [...filtered, newEdge];
      });

      toast({
        title: 'Wire Reconnected!',
        description: 'Connection moved to new target.',
        variant: 'default'
      });
    },
    [nodes, setEdges, toast]
  );

  // Export restructured JSON based on current wire connections
  const exportRestructuredJSON = useCallback(() => {
    try {
      const restructuredJSON = reconstructJSONFromGraph(nodes, edges);
      const jsonString = JSON.stringify(restructuredJSON, null, 2);
      
      setJsonInput(jsonString);
      setParsedJSON(restructuredJSON);
      
      toast({
        title: 'JSON Restructured!',
        description: 'Visual structure converted back to JSON.',
        variant: 'default'
      });

      // Update parent if provided
      if (onStructureChange && metadata) {
        onStructureChange(restructuredJSON, metadata);
      }
    } catch (error: any) {
      toast({
        title: 'Export Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  }, [nodes, edges, metadata, onStructureChange, toast]);

  const resetBuilder = () => {
    setJsonInput('');
    setParsedJSON(null);
    setMetadata(null);
    setParseError(null);
    setNodes([]);
    setEdges([]);
    setRichMetadata(null);
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

          <div className="space-y-3">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border">
              <div className="flex items-center gap-2">
                <Label htmlFor="view-mode" className="text-sm font-semibold">
                  Visualization Mode:
                </Label>
                <Badge variant={viewMode === 'category' ? 'default' : 'secondary'}>
                  {viewMode === 'category' ? 'Categories Only' : 'Full JSON Tree'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="view-mode" className="text-xs text-muted-foreground">
                  Categories
                </Label>
                <Switch
                  id="view-mode"
                  checked={viewMode === 'fullJson'}
                  onCheckedChange={(checked) => setViewMode(checked ? 'fullJson' : 'category')}
                />
                <Label htmlFor="view-mode" className="text-xs text-muted-foreground">
                  Full JSON
                </Label>
              </div>
            </div>

            {/* Description based on mode */}
            {viewMode === 'fullJson' && (
              <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-semibold">Full JSON Mode:</span> Visualizes ALL fields including metadata, structured data, and semantic relationships. Every field becomes a draggable node.
                </p>
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

      {/* Rich Metadata Panel (SAFE - only shows if metadata exists) */}
      {showMetadataPanel && richMetadata && (richMetadata.meta || richMetadata.structuredData || richMetadata.semantics) && (
        <Card className="border-2 border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Sparkles className="h-5 w-5" />
              Rich Metadata & SEO
            </CardTitle>
            <CardDescription>
              Advanced targeting, search optimization, and compliance data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meta Information */}
            {richMetadata.meta && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300">📍 Targeting & Compliance</h4>
                {richMetadata.meta.region && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{richMetadata.meta.region}</Badge>
                  </div>
                )}
                {richMetadata.meta.compliance && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">Compliance:</span> {richMetadata.meta.compliance}
                  </p>
                )}
                {richMetadata.meta.keywords && richMetadata.meta.keywords.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-1">Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {richMetadata.meta.keywords.map((keyword: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Structured Data */}
            {richMetadata.structuredData && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300">🔗 Schema.org</h4>
                <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                  {'@type'}: {richMetadata.structuredData['@type'] || 'Not specified'}
                </div>
              </div>
            )}

            {/* Semantic Relationships */}
            {richMetadata.semantics && (richMetadata.semantics.entities || richMetadata.semantics.synonyms) && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300">🧠 Semantic Network</h4>
                {richMetadata.semantics.entities && (
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(richMetadata.semantics.entities).length} entity mappings configured
                  </p>
                )}
              </div>
            )}

            {/* AI Search Boost */}
            {richMetadata.searchBoost && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300">⚡ AI Search Optimization</h4>
                {richMetadata.searchBoost.style && (
                  <Badge variant="secondary">{richMetadata.searchBoost.style}</Badge>
                )}
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
                onReconnect={onReconnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                reconnectRadius={30}
                defaultEdgeOptions={{
                  type: 'animated',
                  animated: true,
                }}
                connectionLineStyle={{
                  strokeWidth: 3,
                  stroke: '#f59e0b',
                  strokeDasharray: '5,5',
                }}
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
                <Panel position="top-right" className="bg-white/90 dark:bg-slate-800/90 p-2 rounded-lg shadow-lg space-y-2">
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
                  
                  {viewMode === 'fullJson' && (
                    <>
                      <div className="border-t pt-2">
                        <Button
                          size="sm"
                          onClick={exportRestructuredJSON}
                          className="w-full text-xs"
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Export Structure
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Drag wire endpoints to reconnect
                      </p>
                    </>
                  )}
                </Panel>
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
