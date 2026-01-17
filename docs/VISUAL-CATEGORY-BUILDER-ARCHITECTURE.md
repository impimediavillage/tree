# Visual Category Structure Builder - Architecture

## Overview

A drag-and-drop visual interface for creating and configuring category structures when adding new wellness types. Think "flowchart editor meets game skill tree."

## User Flow

### Step 1: Input JSON
```typescript
// User uploads or pastes JSON
{
  "ayurvedicProducts": [
    {
      "name": "Doshas & Constitution",
      "image": "https://...",
      "subcategories": [
        { "name": "Vata Balancing", "image": "https://..." },
        { "name": "Pitta Balancing", "image": "https://..." }
      ]
    }
  ]
}
```

### Step 2: Parse & Visualize
System converts JSON to visual nodes:
- Each category = Draggable card with image preview
- Subcategories = Connected child nodes
- Lines show parent → child relationships
- Color-coded by depth level

### Step 3: Interactive Editing
User can:
- ✅ Drag nodes to reposition (visual only, doesn't change structure)
- ✅ Click to edit category name/image
- ✅ Drag subcategory to different parent
- ✅ Add new categories/subcategories
- ✅ Delete nodes (with confirmation)
- ✅ See real-time structure analysis

### Step 4: Validation
System shows:
- ✅ Depth level (1, 2, or 3)
- ✅ Navigation path
- ✅ Sample categories
- ⚠️ Warnings (missing images, empty names, etc.)

### Step 5: Save
On save:
1. Generate final JSON from visual structure
2. Create `dispensaryTypeProductCategories` document
3. Call `analyzeCategoryStructureAndUpdate`
4. Update `dispensaryTypes` with metadata
5. Navigate to success page

## Technology Stack

### Recommended: React Flow
**Library**: `reactflow` (https://reactflow.dev/)

**Why React Flow?**
- ✅ Built for React + TypeScript
- ✅ Drag-and-drop out of the box
- ✅ Custom node components
- ✅ Connection lines with bezier curves
- ✅ Minimap and controls
- ✅ Works with Tailwind CSS
- ✅ Production-ready, well-maintained

**Alternative**: `react-dnd` (more manual setup) or `dnd-kit` (modern, flexible)

### Component Architecture

```
<CategoryStructureBuilder>
├── <JSONInputPanel>
│   ├── <FileUpload />
│   ├── <JSONTextarea />
│   └── <ParseButton />
│
├── <VisualCanvas>  (React Flow)
│   ├── <CategoryNode />  (Custom node type)
│   │   ├── Image preview
│   │   ├── Category name
│   │   ├── Edit button
│   │   └── Delete button
│   │
│   ├── <SubcategoryNode />  (Different style)
│   ├── <ConnectionLines />  (Auto-generated)
│   └── <Minimap />
│
├── <StructureAnalysisPanel>
│   ├── Depth indicator
│   ├── Navigation path
│   ├── Sample categories
│   └── Validation warnings
│
└── <ActionBar>
    ├── [Add Category]
    ├── [Auto-Layout]
    ├── [Reset]
    └── [Save & Create]
```

## Data Models

### Visual Node
```typescript
interface CategoryNode {
  id: string;
  type: 'category' | 'subcategory' | 'subsubcategory';
  data: {
    name: string;
    image?: string;
    level: number;  // 1, 2, or 3
    parentId?: string;
  };
  position: { x: number; y: number };  // For React Flow
}

interface CategoryEdge {
  id: string;
  source: string;  // Parent node ID
  target: string;  // Child node ID
  type: 'default' | 'smoothstep';
  animated: boolean;
}
```

### Conversion Functions
```typescript
// JSON → Visual Nodes
function parseJSONToNodes(json: any): { nodes: CategoryNode[], edges: CategoryEdge[] }

// Visual Nodes → JSON
function nodesToJSON(nodes: CategoryNode[], edges: CategoryEdge[]): any

// JSON → Structure Metadata (uses existing analyzer)
function analyzeStructure(json: any): CategoryStructureMetadata
```

## Visual Design Patterns

### Category Node (Level 1)
```
┌───────────────────────┐
│ 🖼️                    │  ← Image preview
│                       │
│  Doshas & Constitution│  ← Category name
│                       │
│ [Edit] [Delete]       │  ← Actions
└───────────────────────┘
         │
         └──────┐  ← Connection point
```

### Subcategory Node (Level 2)
```
     ┌──────────────────┐
     │ 🖼️ Vata Balancing│  ← Smaller, different color
     │ [Edit] [Delete]  │
     └──────────────────┘
```

### Color Coding
- **Level 1 (Category)**: Blue border, larger size
- **Level 2 (Subcategory)**: Green border, medium size
- **Level 3 (Sub-subcategory)**: Purple border, smaller size

### Connection Lines
- **Solid line**: Direct parent → child
- **Animated**: When dragging/editing
- **Bezier curves**: Smooth, game-like appearance

## Layout Algorithms

### Auto-Layout Options

**Option 1: Hierarchical (Top to Bottom)**
```
    Category 1       Category 2
    /    |    \         |
 Sub1  Sub2  Sub3     Sub4
```

**Option 2: Radial (Circular)**
```
        Sub1
         /
  Category 1 ─── Sub2
         \
        Sub3
```

**Option 3: Tree (Left to Right)**
```
         ┌─ Sub1
Category ┼─ Sub2
         └─ Sub3
```

**Implementation**: Use `dagre` library for auto-layout

## Interactive Features

### Drag & Drop
1. **Drag to Reposition**: Move nodes visually (doesn't change JSON structure)
2. **Drag to Reconnect**: Drag subcategory to new parent (updates JSON)
3. **Drag to Reorder**: Change order within same parent

### Editing
1. **Inline Edit**: Click name to edit directly
2. **Modal Edit**: Click [Edit] for full form (name, image URL, description)
3. **Bulk Edit**: Select multiple nodes, edit properties

### Validation
1. **Real-time**: Check as user edits
2. **Visual Indicators**: ✅ Green checkmark, ⚠️ Yellow warning, ❌ Red error
3. **Hover Tooltips**: Show what's wrong

### Preview
1. **Split View**: JSON on left, visual on right
2. **Sync Changes**: Edit either side, both update
3. **Structure Summary**: Show analyzed metadata

## Game-Style UI Elements

### Animations
- **Slide in**: When adding new nodes
- **Fade out**: When deleting nodes
- **Pulse**: When hovering over connections
- **Glow**: When node is selected
- **Trail effect**: When dragging

### Sound Effects (Optional)
- **Click**: Soft click when selecting
- **Connect**: Satisfying "snap" when connecting nodes
- **Success**: Chime when validation passes
- **Error**: Subtle buzz when validation fails

### Visual Effects
- **Gradient backgrounds**: Modern glassmorphism
- **Drop shadows**: Depth perception
- **Border animations**: Glowing borders on hover
- **Particle effects**: When saving successfully

### Theme
```css
/* Game-style color palette */
--primary: #6366f1;      /* Indigo - main actions */
--success: #10b981;      /* Green - validation */
--warning: #f59e0b;      /* Amber - warnings */
--error: #ef4444;        /* Red - errors */
--bg-dark: #1e293b;      /* Slate - dark mode */
--bg-light: #f8fafc;     /* White - light mode */
--accent: #8b5cf6;       /* Purple - highlights */
```

## Integration with Existing System

### Form Integration
```typescript
<form onSubmit={handleSubmit}>
  {/* Step 1: Basic Info */}
  <DispensaryTypeBasicInfo />
  
  {/* Step 2: Category Structure (NEW) */}
  <CategoryStructureBuilder
    onStructureChange={(json, metadata) => {
      setCategoriesData(json);
      setCategoryStructure(metadata);
    }}
  />
  
  {/* Save Button */}
  <Button type="submit">Create Wellness Type</Button>
</form>
```

### Save Handler
```typescript
async function handleSubmit(data) {
  // 1. Create dispensaryTypes document
  const typeDoc = await addDoc(collection(db, 'dispensaryTypes'), {
    name: data.name,
    description: data.description,
    image: data.image,
    useGenericWorkflow: true,  // Enable generic workflow
    categoryStructure: data.categoryStructure,  // From builder
    createdAt: serverTimestamp()
  });

  // 2. Create dispensaryTypeProductCategories document
  await createFn({
    dispensaryTypeName: data.name,
    templateData: data.categoriesData  // From builder
  });

  // 3. Analyze structure (auto-called in future)
  await analyzeFn({
    dispensaryTypeName: data.name
  });

  // 4. Navigate to success
  router.push('/admin/wellness-types');
  toast({ title: 'Wellness Type Created!', description: '...' });
}
```

## Implementation Phases

### Phase 1: Basic Parsing (Week 1)
- [ ] Install React Flow
- [ ] Create CategoryStructureBuilder component
- [ ] Parse JSON to nodes/edges
- [ ] Render basic visual nodes
- [ ] Show connections

### Phase 2: Interactivity (Week 2)
- [ ] Drag to reposition nodes
- [ ] Click to edit node data
- [ ] Add/remove nodes
- [ ] Auto-layout algorithm
- [ ] Real-time validation

### Phase 3: Visual Polish (Week 3)
- [ ] Game-style UI design
- [ ] Animations and transitions
- [ ] Color coding by level
- [ ] Image previews in nodes
- [ ] Minimap and controls

### Phase 4: Integration (Week 4)
- [ ] Integrate into wellness type form
- [ ] Connect to Cloud Functions
- [ ] Test with various JSON structures
- [ ] Add error handling
- [ ] User testing and refinement

## Example Structures to Support

### Simple (1 Level)
```json
{
  "products": [
    { "name": "Tea", "image": "..." },
    { "name": "Tinctures", "image": "..." }
  ]
}
```
**Visual**: 2 nodes, no connections

### Medium (2 Levels)
```json
{
  "products": [
    {
      "name": "Tea",
      "image": "...",
      "subcategories": [
        { "name": "Green Tea", "image": "..." },
        { "name": "Black Tea", "image": "..." }
      ]
    }
  ]
}
```
**Visual**: 1 parent → 2 children

### Complex (3 Levels)
```json
{
  "products": [
    {
      "name": "Tea",
      "subcategories": [
        {
          "name": "Green Tea",
          "subcategories": [
            { "name": "Sencha" },
            { "name": "Matcha" }
          ]
        }
      ]
    }
  ]
}
```
**Visual**: 1 parent → 1 child → 2 grandchildren

### Nested Objects (Like Homeopathy)
```json
{
  "homeopathicProducts": {
    "homeopathicProducts": [...]
  }
}
```
**Visual**: Show grouping node (non-editable wrapper)

## Benefits

### For Super Admin
- ✅ Visual understanding of structure
- ✅ Easy reorganization (drag & drop)
- ✅ Immediate validation feedback
- ✅ No JSON syntax errors
- ✅ Fun, engaging UX

### For System
- ✅ Structured data from start
- ✅ Validated before saving
- ✅ Automatic metadata generation
- ✅ Fewer support requests
- ✅ Scalable to complex structures

### For Future
- ✅ Can edit existing structures
- ✅ Can clone and modify
- ✅ Can import from competitors
- ✅ Can export as templates
- ✅ Can version control structures

## Next Steps

1. **Install React Flow**: `npm install reactflow`
2. **Create prototype**: Basic visual builder
3. **Test with Apothecary JSON**: Validate existing structure
4. **Build full component**: All features
5. **Integrate into admin dashboard**: Wellness type form
6. **Deploy & test**: With real users

## Resources

- **React Flow Docs**: https://reactflow.dev/docs
- **Example Implementations**: Node-based editors, flowchart tools
- **Design Inspiration**: Game skill trees, mind mapping tools
- **Color Palette**: https://tailwindcss.com/docs/customizing-colors
