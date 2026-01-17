# Rich Metadata System - Visual Flow Reference

## 🎯 Quick Visual Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUPER ADMIN WORKFLOW                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Create Dispensary Type with Rich Metadata
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Admin Dashboard
   /admin/dashboard/dispensary-types
        │
        ├─► Click "Add New Type"
        │
        ├─► Fill Basic Info:
        │   • Name: "Herbal Medicine"  
        │   • Toggle: ✓ Use Generic Workflow
        │
        ├─► Switch to "Category Structure" tab
        │
        └─► Paste JSON with metadata:
            {
              "meta": {
                "region": "South Africa",
                "compliance": "SAHPRA regulations",
                "keywords": ["herbal", "natural"],
                ...
              },
              "recommendedStructuredData": {...},
              "semanticRelationships": {...},
              "aiSearchBoost": {...},
              "categoriesData": {...}
            }

              ↓ Visual Builder Displays

   ┌────────────────────────────────────────────────┐
   │  📦 Category Nodes (Drag & Drop)               │
   │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
   │  │ Tinctures│──│  Dried   │──│  Capsules│    │
   │  └──────────┘  └──────────┘  └──────────┘    │
   │                                                 │
   │  ✨ Rich Metadata Panel (NEW!)                │
   │  ┌────────────────────────────────────────┐   │
   │  │ 📍 Targeting & Compliance              │   │
   │  │    🌍 South Africa                      │   │
   │  │    🛡️ SAHPRA regulations apply          │   │
   │  │    🏷️ herbal | natural | wellness       │   │
   │  │                                         │   │
   │  │ 🔗 Schema.org: Product                 │   │
   │  │ 🧠 Semantic Network: 2 entity groups    │   │
   │  │ ⚡ AI Style: conversational             │   │
   │  └────────────────────────────────────────┘   │
   └────────────────────────────────────────────────┘

              ↓ Save Type

   Firestore Storage:
   dispensaryTypeProductCategories/Herbal Medicine
   ├── meta: {region, compliance, keywords...}
   ├── recommendedStructuredData: {...}
   ├── semanticRelationships: {...}
   ├── aiSearchBoost: {...}
   └── categoriesData: {...}


┌─────────────────────────────────────────────────────────────────┐
│                    DISPENSARY ADMIN WORKFLOW                     │
└─────────────────────────────────────────────────────────────────┘

Step 2: Add Product with Metadata Context
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Product Add Page
   /dispensary-admin/products/add/herbal-medicine
        │
        ├─► Page loads → GenericProductAddPage
        │
        ├─► fetchCategoryStructure() executes:
        │   • Fetches from dispensaryTypeProductCategories
        │   • SAFELY extracts metadata:
        │     if (data?.meta || data?.recommendedStructuredData) {
        │       setTypeMetadata({...}); ✓
        │     }
        │   • Console log:
        │     [GenericProductAddPage] Rich metadata loaded: {
        │       hasMeta: true,
        │       hasStructuredData: true,
        │       hasSemantics: true
        │     }
        │
        └─► Display Category Selection:

   ┌────────────────────────────────────────────────┐
   │  Step 1: Select Category                       │
   │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
   │  │[Tinctures]│  │  Dried   │  │ Capsules │    │
   │  │ (CLICKED) │  │   Herbs  │  │          │    │
   │  └──────────┘  └──────────┘  └──────────┘    │
   └────────────────────────────────────────────────┘

              ↓ User selects category

   ┌────────────────────────────────────────────────┐
   │  Step 2: Product Details                       │
   │  ┌──────────────────────────────────────────┐ │
   │  │ Category: Tinctures                      │ │
   │  │ Subcategory: (if applicable)             │ │
   │  └──────────────────────────────────────────┘ │
   │                                                 │
   │  🎨 MetadataViewer Card (NEW!)                 │
   │  ┌────────────────────────────────────────┐   │
   │  │ 🧠 Product Metadata                    │   │
   │  │ SEO, targeting, and compliance info     │   │
   │  │                                         │   │
   │  │ 🌍 Region: South Africa                 │   │
   │  │ 🛡️ Compliance: SAHPRA regulations       │   │
   │  │    apply - verify registration          │   │
   │  │                                         │   │
   │  │ 🏷️ Keywords:                             │   │
   │  │    [herbal] [natural] [wellness]        │   │
   │  │                                         │   │
   │  │ 👥 Target Audience:                      │   │
   │  │    [health enthusiasts] [practitioners] │   │
   │  │                                         │   │
   │  │ ⚡ Search Style: conversational          │   │
   │  │                                         │   │
   │  │ ⚠️ Regulatory Note:                      │   │
   │  │    All products must comply with        │   │
   │  │    SAHPRA Act 2017...                   │   │
   │  └────────────────────────────────────────┘   │
   │                                                 │
   │  [Product Name Field]                          │
   │  [Description Field]                           │
   │  [Pricing Tiers...]                            │
   │  [Submit Button]                               │
   └────────────────────────────────────────────────┘

              ↓ Product saved

   Enhanced Context Available For:
   ├─► AI Advisors (semantic relationships, user intent)
   ├─► Search Engines (Schema.org structured data)
   ├─► Compliance Systems (regulatory notes)
   └─► Analytics (metadata-driven insights)


┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING TYPES (PROTECTED)                    │
└─────────────────────────────────────────────────────────────────┘

Old Workflow - Still Works Perfectly!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Homeopathic Store / Traditional Medicine / Mushroom / etc.
        │
        ├─► useGenericWorkflow: false (or undefined)
        │
        ├─► Routes to CUSTOM add/edit pages
        │   (existing hardcoded pages)
        │
        ├─► No metadata extraction attempted
        │
        ├─► No MetadataViewer displays
        │
        └─► ✓ Everything works exactly as before

   ┌────────────────────────────────────────────────┐
   │  ✅ FORCE_CUSTOM_WORKFLOW Protection           │
   │                                                 │
   │  These types ALWAYS use custom pages:          │
   │  • Homeopathic store                           │
   │  • Traditional Medicine                        │
   │  • Mushroom                                    │
   │  • Permaculture                                │
   │  • THC                                         │
   │                                                 │
   │  Even if useGenericWorkflow accidentally       │
   │  set to true → forced to custom workflow       │
   └────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENT HIERARCHY                         │
└─────────────────────────────────────────────────────────────────┘

Admin Side (Type Creation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DispensaryTypeDialog
 ├── Tab 1: Basic Info
 │   ├── Name field
 │   ├── useGenericWorkflow toggle (🔒 locked when editing)
 │   └── Other fields
 │
 └── Tab 2: Category Structure
     └── CategoryStructureBuilder
         ├── JSON input area
         ├── Visual node editor (React Flow)
         │   ├── CategoryNode (draggable)
         │   └── SubcategoryNode (draggable)
         │
         ├── Structure Analysis Card
         │   ├── Total categories count
         │   ├── Max depth indicator
         │   └── Node type breakdown
         │
         └── 🆕 Rich Metadata Panel (purple card)
             ├── Targeting & Compliance section
             ├── Schema.org section
             ├── Semantic Network section
             └── AI Search Optimization section


Product Side (Product Creation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[dispensaryType]/page.tsx (Dynamic Route)
 └── GenericProductAddPage
     ├── State:
     │   ├── categoryStructure (categories array)
     │   └── 🆕 typeMetadata (rich metadata object)
     │
     ├── Effects:
     │   └── fetchCategoryStructure()
     │       ├── Fetch from Firestore
     │       ├── 🆕 Extract metadata (safe)
     │       └── Set state
     │
     └── Render:
         ├── Step 1: Category Selection
         │   └── Category cards (clickable)
         │
         └── Step 2: Product Details
             ├── Category display (locked)
             ├── 🆕 MetadataViewer (if metadata exists)
             ├── Product name field
             ├── Description field
             ├── Pricing tiers
             └── Submit button


┌─────────────────────────────────────────────────────────────────┐
│                       SAFETY MECHANISMS                          │
└─────────────────────────────────────────────────────────────────┘

Layer 1: TypeScript Optional Fields
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DispensaryTypeProductCategoriesDoc {
  categoriesData: any;          // Required
  meta?: CategoryMetadata;      // ✓ Optional
  recommendedStructuredData?: StructuredDataSchema; // ✓ Optional
  semanticRelationships?: SemanticRelationshipMap;  // ✓ Optional
  aiSearchBoost?: AISearchBoostConfig;  // ✓ Optional
  pageBlueprint?: PageBlueprint;        // ✓ Optional
}
→ Won't break if fields missing


Layer 2: Safe Extraction
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Only extracts if present
if (data?.meta || data?.recommendedStructuredData || data?.semanticRelationships) {
  setTypeMetadata({...});
}
→ Won't crash if undefined


Layer 3: Conditional Rendering
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{typeMetadata && selectedTopLevelCategory && (
  <MetadataViewer metadata={typeMetadata} />
)}
→ Only shows if both exist


Layer 4: Component Internal Safety
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function MetadataViewer({ metadata, compact }) {
  if (!metadata || !metadata.meta) return null; // ✓ Early return
  // ... rest of component
}
→ Returns null if no data


Layer 5: Helper Function Null Safety
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function generateCategoryStructuredData(...): string | null {
  if (!category?.structuredDataHints) return null; // ✓ Early return
  // ... generate data
}
→ Returns null instead of throwing errors


Layer 6: Workflow Protection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const FORCE_CUSTOM_WORKFLOW = [
  'Homeopathic store',
  'Traditional Medicine',
  'Mushroom',
  'Permaculture',
  'THC'
];

function shouldForceCustomWorkflow(typeName: string): boolean {
  return FORCE_CUSTOM_WORKFLOW.includes(typeName);
}
→ Critical types always use custom pages


┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                │
└─────────────────────────────────────────────────────────────────┘

JSON Input (Admin) → Firestore Storage → Extraction (Runtime) → Display
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{                          dispensaryTypeProductCategories/{type}
  "meta": {...},           ├─► meta: {region, compliance...}
  "structuredData": {...}, ├─► recommendedStructuredData: {...}
  "semantics": {...},      ├─► semanticRelationships: {...}
  "categoriesData": {...}  └─► categoriesData: {...}
}                                     │
      │                               │
      └────► Visual Builder           └────► GenericProductAddPage
             Shows metadata                  Extracts metadata
             in purple panel                 Shows MetadataViewer
                                             if present


┌─────────────────────────────────────────────────────────────────┐
│                    TESTING SCENARIOS                             │
└─────────────────────────────────────────────────────────────────┘

Scenario 1: Protected Type (e.g., Homeopathic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Navigate to: /dispensary-admin/products
Click: Add Homeopathic Product
Expected: ✓ Uses custom page (existing workflow)
          ✓ No metadata extraction
          ✓ No MetadataViewer shown
Result:   ✅ PASS - Everything works as before


Scenario 2: New Type Without Metadata
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create type with: {"categoriesData": {"products": [...]}}
Navigate to: /dispensary-admin/products/add/test-type
Expected: ✓ Page loads
          ✓ Categories show
          ✓ No metadata extraction (none present)
          ✓ No MetadataViewer shown
          ✓ Product can be added normally
Result:   ✅ PASS - Backward compatible


Scenario 3: New Type With Full Metadata
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create type with: Full metadata JSON
Navigate to: /dispensary-admin/products/add/herbal-medicine
Expected: ✓ Page loads
          ✓ Categories show
          ✓ Metadata extracted (console log confirms)
          ✓ MetadataViewer shows after category selection
          ✓ Region, compliance, keywords displayed
          ✓ Product can be added with metadata context
Result:   ✅ PASS - Enhanced experience


Scenario 4: Visual Builder with Metadata
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin Dashboard: Add new type
Paste JSON: Full metadata JSON
Expected: ✓ Visual nodes display
          ✓ Rich Metadata Panel shows (purple card)
          ✓ Displays region, compliance, Schema.org, semantics
          ✓ Can be saved successfully
Result:   ✅ PASS - Visual feedback works


┌─────────────────────────────────────────────────────────────────┐
│                    FUTURE ENHANCEMENTS                           │
└─────────────────────────────────────────────────────────────────┘

Phase 5: AI Advisor Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const aiContext = {
  semanticRelationships: typeMetadata.semanticRelationships,
  userIntent: category.userIntent,
  audience: category.audience,
  regionalRelevance: category.regionalRelevance
};

// Pass to AI advisor for contextual recommendations
advisorPrompt += `Context: User is looking for ${userIntent} products`;
advisorPrompt += `Target audience: ${audience}`;
advisorPrompt += `Regional context: ${regionalRelevance}`;


Phase 6: Enhanced Search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

searchScore = baseScore * aiSearchBoost.weights.category;
if (product.tags.some(tag => aiSearchBoost.boostSignals.includes(tag))) {
  searchScore *= 1.5; // Boost for matching signals
}

// Use semantic relationships for query expansion
if (query === "remedy") {
  expandedQuery = ["remedy", "treatment", "cure", "medicine"];
}


Phase 7: SEO Page Generation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<Head>
  <title>{seoPageIntent}</title>
  <meta name="keywords" content={keywords.join(', ')} />
  <script type="application/ld+json">
    {structuredData}
  </script>
</Head>

// FAQ section auto-generated from faqSeedQuestions
<FAQSection questions={category.faqSeedQuestions} />


Phase 8: Analytics Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Track:
- Metadata-driven conversions
- Compliance warning interactions
- Regional targeting effectiveness
- AI search boost impact
- Schema.org rich result clicks


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF VISUAL REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
