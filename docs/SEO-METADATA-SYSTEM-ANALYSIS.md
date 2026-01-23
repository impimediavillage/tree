# SEO & Metadata System Analysis - Dynamic LD+JSON Generation

## Executive Summary

**Current State**: When super admin creates a dispensary type, the system saves:
1. **Navigation Structure** (`categoriesData`) - Categories/subcategories for menus
2. **Metadata Fields** - Already preserved but underutilized for SEO/AI

**Goal**: Enhance the system to generate dynamic LD+JSON, meta tags, and structured data using dispensary and product details for AI search optimization and professional SEO presentation.

---

## Current Architecture

### 1. Dispensary Type Document Structure

**Collection**: `dispensaryTypeProductCategories`
**Document ID**: `{dispensaryTypeName}` (e.g., "Apothecary")

#### Current Saved Structure
```typescript
{
  // ✅ REQUIRED: Navigation structure
  name: "Apothecary",
  categoriesData: {
    categories: [
      {
        name: "Herbal Remedies",
        value: "herbal-remedies",
        imageUrl: "...",
        subcategories: [...]
      },
      ...
    ]
  },
  
  // ✅ ALREADY PRESERVED: Metadata fields (underutilized)
  meta?: {
    domain: "apothecary",
    regionFocus: ["South Africa", "Africa", "Global"],
    primaryMarkets: {...},
    languages: ["en-ZA", "en-GB", "en-US"],
    taxonomyType: "Modern Apothecary...",
    aiPurpose: [...],
    searchIntent: [...],
    compliance: {...},
    seo: {
      siteTopic: "...",
      primaryKeywords: [...],
      secondaryKeywords: [...],
      geoTargetsZA: [...],
      geoTargetsAfrica: [...],
      contentPillars: [...]
    }
  },
  
  structuredData?: {...},
  recommendedStructuredData?: {
    Organization: true,
    LocalBusiness: true,
    Product: true,
    Offer: true,
    BreadcrumbList: true,
    FAQPage: true,
    Article: true,
    ItemList: true,
    WebSite: true,
    SearchAction: true
  },
  
  semanticRelationships?: {
    relatedDomains: [...],
    mapsTo: {...},
    entityRecognition: {
      ingredientsCore: [...],
      formatsCore: [...],
      useCasesCore: [...]
    }
  },
  
  aiSearchBoost?: {
    topKeywords: [...],
    excludeKeywords: [...],
    taxonomyNotes: "...",
    semanticWeights: {...},
    preferredTerminology: {
      use: [...],
      avoid: [...]
    },
    aiContentStyle: {...},
    searchSignals: {...}
  },
  
  pageBlueprint?: {...},
  
  // System fields
  updatedAt: Timestamp,
  updatedBy: "uid",
  createdAt: Timestamp,
  createdBy: "uid",
  createdFromTemplate: true
}
```

### 2. Current Save Flow

**File**: `functions/src/dispensary-type-management.ts` (Lines 302-390)

```typescript
export const createCategoryFromTemplate = onCall(
  { cors: true },
  async (request) => {
    const { dispensaryTypeName, templateData } = request.data;
    
    // ✅ NORMALIZE: Separate navigation from metadata
    const normalized = normalizeToStandardStructure(templateData);
    
    const docData: any = {
      name: dispensaryTypeName,
      categoriesData: normalized.categoriesData,  // ← Navigation
      ...normalized.metadata,                      // ← SEO/AI metadata
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
      createdFromTemplate: true
    };
    
    await db
      .collection('dispensaryTypeProductCategories')
      .doc(dispensaryTypeName)
      .set(docData, { merge: true });
  }
);
```

**Function**: `normalizeToStandardStructure()` (Lines 145-200)

```typescript
function normalizeToStandardStructure(inputData: any): { 
  categoriesData: any; 
  metadata: any;
} {
  // ✅ PRESERVE: Extract metadata fields
  const metadata: any = {};
  if (inputData.meta) metadata.meta = inputData.meta;
  if (inputData.structuredData) metadata.structuredData = inputData.structuredData;
  if (inputData.recommendedStructuredData) metadata.recommendedStructuredData = inputData.recommendedStructuredData;
  if (inputData.semanticRelationships) metadata.semanticRelationships = inputData.semanticRelationships;
  if (inputData.aiSearchBoost) metadata.aiSearchBoost = inputData.aiSearchBoost;
  if (inputData.pageBlueprint) metadata.pageBlueprint = inputData.pageBlueprint;
  
  // Extract navigation structure
  let categoriesArray = [...]; // normalize to array
  
  return {
    categoriesData: { categories: categoriesArray },
    metadata
  };
}
```

---

## Answer to Your Question

### **What metadata is saved outside of categoriesData?**

✅ **YES** - The system ALREADY saves metadata fields separately from `categoriesData`:

| Field | Purpose | Current Usage | SEO/AI Potential |
|-------|---------|---------------|------------------|
| `meta` | Domain, region, markets, languages, SEO keywords | **Saved but unused** | 🚀 HIGH - Use for geo-targeting, language tags, keywords |
| `structuredData` | Custom structured data templates | **Saved but unused** | 🚀 HIGH - Base for LD+JSON generation |
| `recommendedStructuredData` | Schema.org types to implement | **Saved but unused** | 🚀 CRITICAL - Guides which schemas to generate |
| `semanticRelationships` | Related domains, entity recognition | **Saved but unused** | 🚀 HIGH - AI search signals, related content |
| `aiSearchBoost` | Keywords, terminology, weights | **Saved but unused** | 🚀 CRITICAL - AI search optimization |
| `pageBlueprint` | Page structure templates | **Saved but unused** | 🚀 MEDIUM - Dynamic page generation |

### **Current Problem**

The metadata IS being saved to Firestore, but:
- ❌ **NOT** fetched when displaying public store pages
- ❌ **NOT** used to generate LD+JSON structured data
- ❌ **NOT** used to populate meta tags
- ❌ **NOT** used for AI search optimization

---

## Public Store Display Flow (Current)

**File**: `src/app/store/[dispensaryId]/page.tsx`

### Current Rendering (Lines 1-407)

```tsx
export default function DispensaryStorePage() {
  const dispensaryId = params?.dispensaryId as string;
  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  useEffect(() => {
    const fetchDispensaryAndProducts = async () => {
      // 1. Fetch dispensary document
      const dispensaryDoc = await getDoc(doc(db, 'dispensaries', dispensaryId));
      const dispensaryData = { id: dispensaryDoc.id, ...dispensaryDoc.data() } as Dispensary;
      setDispensary(dispensaryData);
      
      // 2. Get product collection name based on dispensary type
      const collectionName = getCollectionName(dispensaryData.dispensaryType);
      
      // 3. Fetch products
      const productsQuery = query(
        collection(db, collectionName),
        where('dispensaryId', '==', dispensaryId)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const fetchedProducts = productsSnapshot.docs.map(...);
      
      setProducts(fetchedProducts);
    };
    
    fetchDispensaryAndProducts();
  }, [dispensaryId]);
  
  // ❌ MISSING: Fetch dispensaryTypeProductCategories metadata
  // ❌ MISSING: Generate LD+JSON from metadata
  // ❌ MISSING: Generate SEO meta tags
  
  return (
    <div>
      {/* Simple header, products grid */}
      {/* NO structured data */}
      {/* NO rich meta tags */}
    </div>
  );
}
```

### Basic Meta Tags (Lines 48-100)

```tsx
// Only basic meta tags - NO LD+JSON
useEffect(() => {
  if (!dispensary) return;
  
  const ogImage = dispensary.storeImage || dispensary.storeIcon;
  
  if (ogImage) {
    let ogImageTag = document.querySelector('meta[property="og:image"]');
    if (!ogImageTag) {
      ogImageTag = document.createElement('meta');
      ogImageTag.setAttribute('property', 'og:image');
      document.head.appendChild(ogImageTag);
    }
    ogImageTag.setAttribute('content', ogImage);
  }
}, [dispensary]);
```

---

## Proposed Enhancement System

### 1. Create SEO Metadata Service

**New File**: `src/lib/seo-metadata.ts`

```typescript
import type { Dispensary, Product } from '@/types';

interface DispensaryTypeMetadata {
  meta?: {
    domain: string;
    regionFocus: string[];
    primaryMarkets: Record<string, any>;
    languages: string[];
    taxonomyType: string;
    aiPurpose: string[];
    searchIntent: string[];
    compliance: {
      disclaimer: string;
      claimsPolicy: {
        preferredLanguage: string[];
        avoidLanguage: string[];
      };
    };
    seo: {
      siteTopic: string;
      primaryKeywords: string[];
      secondaryKeywords: string[];
      geoTargetsZA: string[];
      geoTargetsAfrica: string[];
      contentPillars: string[];
    };
  };
  recommendedStructuredData?: {
    Organization: boolean;
    LocalBusiness: boolean;
    Product: boolean;
    Offer: boolean;
    BreadcrumbList: boolean;
    FAQPage: boolean;
    Article: boolean;
    ItemList: boolean;
    WebSite: boolean;
    SearchAction: boolean;
  };
  semanticRelationships?: {
    relatedDomains: string[];
    mapsTo: Record<string, string>;
    entityRecognition: {
      ingredientsCore: string[];
      formatsCore: string[];
      useCasesCore: string[];
    };
  };
  aiSearchBoost?: {
    topKeywords: string[];
    excludeKeywords: string[];
    taxonomyNotes: string;
    semanticWeights: {
      localSARelevance: number;
      panAfricanRelevance: number;
      globalRelevance: number;
    };
    preferredTerminology: {
      use: string[];
      avoid: string[];
    };
    aiContentStyle: {
      tone: string;
      formatting: string[];
      citationPreference: string;
    };
    searchSignals: {
      boostFields: string[];
      deboostFields: string[];
    };
  };
}

/**
 * Generates Schema.org Organization structured data
 */
export function generateOrganizationLD(
  dispensary: Dispensary,
  metadata?: DispensaryTypeMetadata
): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `https://thewellnesstree.co.za/store/${dispensary.id}#organization`,
    name: dispensary.dispensaryName,
    url: `https://thewellnesstree.co.za/store/${dispensary.id}`,
    logo: dispensary.storeIcon || dispensary.storeImage,
    image: dispensary.storeImage,
    description: dispensary.message || metadata?.meta?.seo?.siteTopic || `${dispensary.dispensaryName} - Quality wellness products`,
    address: dispensary.showLocation ? {
      "@type": "PostalAddress",
      addressLocality: dispensary.city,
      addressRegion: dispensary.province,
      addressCountry: "ZA"
    } : undefined,
    areaServed: metadata?.meta?.regionFocus || ["South Africa"],
    knowsAbout: metadata?.meta?.seo?.primaryKeywords || [],
    keywords: [
      ...(metadata?.meta?.seo?.primaryKeywords || []),
      ...(metadata?.meta?.seo?.secondaryKeywords || [])
    ].join(', ')
  };
}

/**
 * Generates Schema.org LocalBusiness structured data
 */
export function generateLocalBusinessLD(
  dispensary: Dispensary,
  metadata?: DispensaryTypeMetadata
): object {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://thewellnesstree.co.za/store/${dispensary.id}#business`,
    name: dispensary.dispensaryName,
    image: dispensary.storeImage,
    description: dispensary.message || `${dispensary.dispensaryName} - ${metadata?.meta?.taxonomyType || 'Wellness Products'}`,
    url: `https://thewellnesstree.co.za/store/${dispensary.id}`,
    telephone: dispensary.phone || undefined,
    email: dispensary.email || undefined,
    address: dispensary.showLocation ? {
      "@type": "PostalAddress",
      streetAddress: dispensary.streetAddress,
      addressLocality: dispensary.city,
      addressRegion: dispensary.province,
      postalCode: dispensary.postalCode,
      addressCountry: "ZA"
    } : undefined,
    geo: dispensary.coordinates ? {
      "@type": "GeoCoordinates",
      latitude: dispensary.coordinates.lat,
      longitude: dispensary.coordinates.lng
    } : undefined,
    priceRange: "$$",
    currenciesAccepted: "ZAR",
    paymentAccepted: "Cash, Card, Online",
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: dispensary.coordinates ? {
        "@type": "GeoCoordinates",
        latitude: dispensary.coordinates.lat,
        longitude: dispensary.coordinates.lng
      } : undefined,
      geoRadius: "50km"
    }
  };
}

/**
 * Generates Schema.org Product structured data for a specific product
 */
export function generateProductLD(
  product: Product,
  dispensary: Dispensary,
  metadata?: DispensaryTypeMetadata
): object {
  const tier = product.priceTiers?.[0]; // Use first tier as default
  
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `https://thewellnesstree.co.za/store/${dispensary.id}/product/${product.id}`,
    name: product.name,
    description: product.description,
    image: product.images?.[0] || product.imageUrl,
    brand: {
      "@type": "Brand",
      name: dispensary.dispensaryName
    },
    category: product.category,
    offers: tier ? {
      "@type": "Offer",
      url: `https://thewellnesstree.co.za/store/${dispensary.id}`,
      priceCurrency: "ZAR",
      price: tier.price,
      availability: product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: dispensary.dispensaryName
      },
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    } : undefined,
    sku: product.id,
    gtin: product.barcode || undefined,
    additionalProperty: metadata?.semanticRelationships?.entityRecognition ? [
      {
        "@type": "PropertyValue",
        name: "Ingredients",
        value: metadata.semanticRelationships.entityRecognition.ingredientsCore.join(', ')
      },
      {
        "@type": "PropertyValue",
        name: "Format",
        value: metadata.semanticRelationships.entityRecognition.formatsCore.join(', ')
      }
    ] : undefined
  };
}

/**
 * Generates Schema.org ItemList for product catalog
 */
export function generateItemListLD(
  products: Product[],
  dispensary: Dispensary
): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `https://thewellnesstree.co.za/store/${dispensary.id}#productlist`,
    name: `${dispensary.dispensaryName} Products`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        "@id": `https://thewellnesstree.co.za/store/${dispensary.id}/product/${product.id}`,
        name: product.name,
        image: product.images?.[0] || product.imageUrl,
        url: `https://thewellnesstree.co.za/store/${dispensary.id}`
      }
    }))
  };
}

/**
 * Generates Schema.org BreadcrumbList for navigation
 */
export function generateBreadcrumbLD(
  dispensary: Dispensary,
  product?: Product
): object {
  const items: any[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://thewellnesstree.co.za"
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Stores",
      item: "https://thewellnesstree.co.za/dispensaries/near-me"
    },
    {
      "@type": "ListItem",
      position: 3,
      name: dispensary.dispensaryName,
      item: `https://thewellnesstree.co.za/store/${dispensary.id}`
    }
  ];
  
  if (product) {
    items.push({
      "@type": "ListItem",
      position: 4,
      name: product.category,
      item: `https://thewellnesstree.co.za/store/${dispensary.id}?category=${encodeURIComponent(product.category)}`
    });
    items.push({
      "@type": "ListItem",
      position: 5,
      name: product.name,
      item: `https://thewellnesstree.co.za/store/${dispensary.id}/product/${product.id}`
    });
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}

/**
 * Generates Schema.org WebSite with SearchAction
 */
export function generateWebSiteLD(dispensary: Dispensary): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `https://thewellnesstree.co.za/store/${dispensary.id}#website`,
    url: `https://thewellnesstree.co.za/store/${dispensary.id}`,
    name: dispensary.dispensaryName,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `https://thewellnesstree.co.za/store/${dispensary.id}?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * Generates complete LD+JSON array for a store page
 */
export function generateStoreLDJSON(
  dispensary: Dispensary,
  products: Product[],
  metadata?: DispensaryTypeMetadata
): object[] {
  const ldJsonArray: object[] = [];
  
  // Always include Organization
  ldJsonArray.push(generateOrganizationLD(dispensary, metadata));
  
  // Add based on recommendedStructuredData
  if (metadata?.recommendedStructuredData?.LocalBusiness !== false) {
    ldJsonArray.push(generateLocalBusinessLD(dispensary, metadata));
  }
  
  if (metadata?.recommendedStructuredData?.WebSite !== false) {
    ldJsonArray.push(generateWebSiteLD(dispensary));
  }
  
  if (metadata?.recommendedStructuredData?.BreadcrumbList !== false) {
    ldJsonArray.push(generateBreadcrumbLD(dispensary));
  }
  
  if (products.length > 0 && metadata?.recommendedStructuredData?.ItemList !== false) {
    ldJsonArray.push(generateItemListLD(products, dispensary));
  }
  
  return ldJsonArray;
}

/**
 * Generates meta tags object for Next.js metadata
 */
export function generateMetaTags(
  dispensary: Dispensary,
  products: Product[],
  metadata?: DispensaryTypeMetadata
): Record<string, any> {
  const keywords = [
    dispensary.dispensaryName,
    dispensary.dispensaryType,
    ...(metadata?.meta?.seo?.primaryKeywords || []),
    ...(metadata?.aiSearchBoost?.topKeywords || [])
  ].filter(Boolean).join(', ');
  
  const description = dispensary.message || 
    `${dispensary.dispensaryName} - ${metadata?.meta?.seo?.siteTopic || 'Quality wellness products'}. ${metadata?.meta?.seo?.contentPillars?.[0] || ''}`;
  
  return {
    title: `${dispensary.dispensaryName} | The Wellness Tree`,
    description,
    keywords,
    robots: "index, follow",
    canonical: `https://thewellnesstree.co.za/store/${dispensary.id}`,
    openGraph: {
      type: 'website',
      url: `https://thewellnesstree.co.za/store/${dispensary.id}`,
      title: dispensary.dispensaryName,
      description,
      images: [
        {
          url: dispensary.storeImage || dispensary.storeIcon || '/icons/icon-512x512.png',
          width: 1200,
          height: 630,
          alt: dispensary.dispensaryName
        }
      ],
      locale: metadata?.meta?.languages?.[0] || 'en_ZA',
      site_name: 'The Wellness Tree'
    },
    twitter: {
      card: 'summary_large_image',
      title: dispensary.dispensaryName,
      description,
      images: [dispensary.storeImage || dispensary.storeIcon || '/icons/icon-512x512.png']
    },
    alternates: {
      canonical: `https://thewellnesstree.co.za/store/${dispensary.id}`,
      languages: metadata?.meta?.languages?.reduce((acc, lang) => {
        acc[lang] = `https://thewellnesstree.co.za/${lang}/store/${dispensary.id}`;
        return acc;
      }, {} as Record<string, string>) || {}
    },
    geo: {
      region: metadata?.meta?.regionFocus?.[0] || 'ZA',
      placename: dispensary.city,
      position: dispensary.coordinates ? 
        `${dispensary.coordinates.lat};${dispensary.coordinates.lng}` : undefined
    }
  };
}
```

### 2. Create Metadata Hook

**New File**: `src/hooks/use-dispensary-metadata.ts`

```typescript
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface DispensaryTypeMetadata {
  meta?: any;
  recommendedStructuredData?: any;
  semanticRelationships?: any;
  aiSearchBoost?: any;
  structuredData?: any;
  pageBlueprint?: any;
}

export function useDispensaryMetadata(dispensaryType: string | undefined) {
  const [metadata, setMetadata] = useState<DispensaryTypeMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!dispensaryType) {
      setLoading(false);
      return;
    }
    
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'dispensaryTypeProductCategories', dispensaryType);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Extract only metadata fields (not categoriesData)
          const metadata: DispensaryTypeMetadata = {
            meta: data.meta,
            recommendedStructuredData: data.recommendedStructuredData,
            semanticRelationships: data.semanticRelationships,
            aiSearchBoost: data.aiSearchBoost,
            structuredData: data.structuredData,
            pageBlueprint: data.pageBlueprint
          };
          
          setMetadata(metadata);
        } else {
          console.warn(`No metadata found for dispensary type: ${dispensaryType}`);
          setMetadata(null);
        }
      } catch (err) {
        console.error('Error fetching dispensary metadata:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetadata();
  }, [dispensaryType]);
  
  return { metadata, loading, error };
}
```

### 3. Update Public Store Page

**File**: `src/app/store/[dispensaryId]/page.tsx` (Enhanced)

```tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Head from 'next/head';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { Dispensary, Product } from '@/types';
import { useDispensaryMetadata } from '@/hooks/use-dispensary-metadata';
import { 
  generateStoreLDJSON, 
  generateMetaTags, 
  generateProductLD 
} from '@/lib/seo-metadata';
// ... existing imports

export default function DispensaryStorePage() {
  const params = useParams();
  const dispensaryId = params?.dispensaryId as string;
  
  const [dispensary, setDispensary] = useState<Dispensary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ NEW: Fetch dispensary type metadata for SEO
  const { metadata, loading: metadataLoading } = useDispensaryMetadata(dispensary?.dispensaryType);
  
  // Existing fetch logic...
  useEffect(() => {
    const fetchDispensaryAndProducts = async () => {
      // ... existing code
    };
    
    fetchDispensaryAndProducts();
  }, [dispensaryId]);
  
  // ✅ NEW: Generate LD+JSON structured data
  const ldJsonData = useMemo(() => {
    if (!dispensary || products.length === 0 || metadataLoading) return null;
    
    try {
      const ldArray = generateStoreLDJSON(dispensary, products, metadata || undefined);
      return ldArray;
    } catch (error) {
      console.error('Error generating LD+JSON:', error);
      return null;
    }
  }, [dispensary, products, metadata, metadataLoading]);
  
  // ✅ NEW: Generate meta tags
  const metaTags = useMemo(() => {
    if (!dispensary || metadataLoading) return null;
    
    try {
      return generateMetaTags(dispensary, products, metadata || undefined);
    } catch (error) {
      console.error('Error generating meta tags:', error);
      return null;
    }
  }, [dispensary, products, metadata, metadataLoading]);
  
  // ✅ NEW: Inject LD+JSON into page
  useEffect(() => {
    if (!ldJsonData) return;
    
    // Remove existing LD+JSON scripts
    document.querySelectorAll('script[type="application/ld+json"][data-wellness-tree]').forEach(el => el.remove());
    
    // Inject new LD+JSON
    ldJsonData.forEach((ldObject, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-wellness-tree', `ld-json-${index}`);
      script.textContent = JSON.stringify(ldObject, null, 2);
      document.head.appendChild(script);
    });
    
    return () => {
      document.querySelectorAll('script[type="application/ld+json"][data-wellness-tree]').forEach(el => el.remove());
    };
  }, [ldJsonData]);
  
  // ✅ NEW: Inject comprehensive meta tags
  useEffect(() => {
    if (!metaTags) return;
    
    // Update title
    document.title = metaTags.title;
    
    // Update meta description
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', metaTags.description);
    
    // Update keywords
    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta');
      keywordsMeta.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute('content', metaTags.keywords);
    
    // Update robots
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', metaTags.robots);
    
    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', metaTags.canonical);
    
    // Update Open Graph tags
    const updateOGTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    
    updateOGTag('og:type', metaTags.openGraph.type);
    updateOGTag('og:url', metaTags.openGraph.url);
    updateOGTag('og:title', metaTags.openGraph.title);
    updateOGTag('og:description', metaTags.openGraph.description);
    updateOGTag('og:image', metaTags.openGraph.images[0].url);
    updateOGTag('og:locale', metaTags.openGraph.locale);
    updateOGTag('og:site_name', metaTags.openGraph.site_name);
    
    // Update Twitter tags
    const updateTwitterTag = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    
    updateTwitterTag('twitter:card', metaTags.twitter.card);
    updateTwitterTag('twitter:title', metaTags.twitter.title);
    updateTwitterTag('twitter:description', metaTags.twitter.description);
    updateTwitterTag('twitter:image', metaTags.twitter.images[0]);
    
    // Update geo tags
    if (metaTags.geo) {
      const updateGeoTag = (name: string, content: string) => {
        if (!content) return;
        let tag = document.querySelector(`meta[name="${name}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('name', name);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };
      
      updateGeoTag('geo.region', metaTags.geo.region);
      updateGeoTag('geo.placename', metaTags.geo.placename);
      if (metaTags.geo.position) {
        updateGeoTag('geo.position', metaTags.geo.position);
        updateGeoTag('ICBM', metaTags.geo.position);
      }
    }
  }, [metaTags]);
  
  // ... rest of component (existing render logic)
  
  return (
    <div className="min-h-screen">
      {/* ✅ NEW: Debug panel in development */}
      {process.env.NODE_ENV === 'development' && metadata && (
        <details className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md">
          <summary className="cursor-pointer font-bold text-sm">SEO Debug Panel</summary>
          <div className="mt-2 text-xs space-y-2">
            <div>
              <strong>Metadata Loaded:</strong> ✅
            </div>
            <div>
              <strong>Primary Keywords:</strong>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
                {metadata.meta?.seo?.primaryKeywords?.join(', ') || 'None'}
              </div>
            </div>
            <div>
              <strong>LD+JSON Schemas:</strong>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
                {ldJsonData?.map((ld: any, i: number) => (
                  <div key={i}>• {ld['@type']}</div>
                ))}
              </div>
            </div>
            <div>
              <strong>AI Search Boost:</strong>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1">
                {metadata.aiSearchBoost?.topKeywords?.slice(0, 5).join(', ') || 'None'}
              </div>
            </div>
          </div>
        </details>
      )}
      
      {/* Existing content */}
      {/* ... */}
    </div>
  );
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [x] Metadata fields already saved in Firestore ✅
- [ ] Create `src/lib/seo-metadata.ts` utility
- [ ] Create `src/hooks/use-dispensary-metadata.ts` hook
- [ ] Add TypeScript interfaces for metadata

### Phase 2: Store Page Enhancement (Week 2)
- [ ] Update `src/app/store/[dispensaryId]/page.tsx` to fetch metadata
- [ ] Inject LD+JSON structured data dynamically
- [ ] Generate comprehensive meta tags
- [ ] Test with Google Rich Results Test
- [ ] Test with Facebook Sharing Debugger

### Phase 3: Product Detail Pages (Week 3)
- [ ] Create individual product detail pages (currently missing)
- [ ] Generate product-specific LD+JSON
- [ ] Add product-specific meta tags
- [ ] Implement breadcrumb navigation with structured data

### Phase 4: Search Optimization (Week 4)
- [ ] Use `aiSearchBoost` data for search ranking
- [ ] Implement semantic search using `semanticRelationships`
- [ ] Add entity recognition for ingredients/formats
- [ ] Create AI-friendly content structure

### Phase 5: Advanced Features (Week 5+)
- [ ] Dynamic sitemap generation using metadata
- [ ] Automatic FAQ schema generation
- [ ] Review schema for dispensaries
- [ ] Event schema for promotions
- [ ] Offer schema for special deals

---

## Testing & Validation

### Tools to Use

1. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Test: Organization, LocalBusiness, Product schemas

2. **Schema.org Validator**
   - URL: https://validator.schema.org/
   - Test: All LD+JSON output

3. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Test: Open Graph tags

4. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Test: Twitter meta tags

5. **Google Search Console**
   - Monitor: Rich results, structured data errors
   - Track: Search performance improvements

---

## Example: Complete HTML Output

### Before Enhancement
```html
<!DOCTYPE html>
<html>
<head>
  <title>The Wellness Tree</title>
  <meta name="description" content="The Wellness Tree">
  <meta property="og:image" content="/store-image.jpg">
</head>
<body>
  <!-- Store content -->
</body>
</html>
```

### After Enhancement
```html
<!DOCTYPE html>
<html lang="en-ZA">
<head>
  <title>Herbal Healing Apothecary | The Wellness Tree</title>
  
  <!-- Basic Meta Tags -->
  <meta name="description" content="Herbal Healing Apothecary - Modern Apothecary specializing in herbal remedies, tinctures, and traditional African botanicals. Serving Johannesburg, Cape Town, and across South Africa.">
  <meta name="keywords" content="Herbal Healing Apothecary, apothecary, herbal remedies, tinctures, essential oils, natural skincare, rooibos, wellness, apothecary South Africa, herbal remedies South Africa">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://thewellnesstree.co.za/store/abc123">
  
  <!-- Geo Tags -->
  <meta name="geo.region" content="ZA">
  <meta name="geo.placename" content="Johannesburg">
  <meta name="geo.position" content="-26.2041;28.0473">
  <meta name="ICBM" content="-26.2041, 28.0473">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://thewellnesstree.co.za/store/abc123">
  <meta property="og:title" content="Herbal Healing Apothecary">
  <meta property="og:description" content="Modern Apothecary specializing in herbal remedies...">
  <meta property="og:image" content="https://storage.googleapis.com/store-image.jpg">
  <meta property="og:locale" content="en_ZA">
  <meta property="og:site_name" content="The Wellness Tree">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Herbal Healing Apothecary">
  <meta name="twitter:description" content="Modern Apothecary specializing in herbal remedies...">
  <meta name="twitter:image" content="https://storage.googleapis.com/store-image.jpg">
  
  <!-- LD+JSON: Organization -->
  <script type="application/ld+json" data-wellness-tree="ld-json-0">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://thewellnesstree.co.za/store/abc123#organization",
    "name": "Herbal Healing Apothecary",
    "url": "https://thewellnesstree.co.za/store/abc123",
    "logo": "https://storage.googleapis.com/store-icon.png",
    "image": "https://storage.googleapis.com/store-image.jpg",
    "description": "Modern Apothecary specializing in herbal remedies...",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Johannesburg",
      "addressRegion": "Gauteng",
      "addressCountry": "ZA"
    },
    "areaServed": ["South Africa", "Africa", "Global"],
    "knowsAbout": [
      "apothecary South Africa",
      "herbal remedies South Africa",
      "natural remedies Africa"
    ],
    "keywords": "apothecary South Africa, herbal remedies South Africa, natural remedies Africa, holistic wellness shop, traditional African botanicals"
  }
  </script>
  
  <!-- LD+JSON: LocalBusiness -->
  <script type="application/ld+json" data-wellness-tree="ld-json-1">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": "https://thewellnesstree.co.za/store/abc123#business",
    "name": "Herbal Healing Apothecary",
    "image": "https://storage.googleapis.com/store-image.jpg",
    "description": "Modern Apothecary specializing in herbal remedies...",
    "url": "https://thewellnesstree.co.za/store/abc123",
    "telephone": "+27-11-123-4567",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Main Street",
      "addressLocality": "Johannesburg",
      "addressRegion": "Gauteng",
      "postalCode": "2000",
      "addressCountry": "ZA"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -26.2041,
      "longitude": 28.0473
    },
    "priceRange": "$$",
    "currenciesAccepted": "ZAR",
    "paymentAccepted": "Cash, Card, Online",
    "areaServed": {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": -26.2041,
        "longitude": 28.0473
      },
      "geoRadius": "50km"
    }
  }
  </script>
  
  <!-- LD+JSON: WebSite with SearchAction -->
  <script type="application/ld+json" data-wellness-tree="ld-json-2">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://thewellnesstree.co.za/store/abc123#website",
    "url": "https://thewellnesstree.co.za/store/abc123",
    "name": "Herbal Healing Apothecary",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://thewellnesstree.co.za/store/abc123?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
  </script>
  
  <!-- LD+JSON: BreadcrumbList -->
  <script type="application/ld+json" data-wellness-tree="ld-json-3">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://thewellnesstree.co.za"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Stores",
        "item": "https://thewellnesstree.co.za/dispensaries/near-me"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Herbal Healing Apothecary",
        "item": "https://thewellnesstree.co.za/store/abc123"
      }
    ]
  }
  </script>
  
  <!-- LD+JSON: ItemList (Product Catalog) -->
  <script type="application/ld+json" data-wellness-tree="ld-json-4">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://thewellnesstree.co.za/store/abc123#productlist",
    "name": "Herbal Healing Apothecary Products",
    "numberOfItems": 25,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "Product",
          "@id": "https://thewellnesstree.co.za/store/abc123/product/prod1",
          "name": "Rooibos Stress Relief Tincture",
          "image": "https://storage.googleapis.com/product1.jpg",
          "url": "https://thewellnesstree.co.za/store/abc123"
        }
      }
      // ... more products
    ]
  }
  </script>
</head>
<body>
  <!-- Store content with structured data -->
</body>
</html>
```

---

## Benefits of This System

### For Dispensaries
- 🎯 **Better Search Rankings**: Rich snippets in Google search results
- 📍 **Local SEO**: Geo-targeting for local customers
- 🔍 **AI Discoverability**: Optimized for ChatGPT, Bard, Perplexity
- 📱 **Social Sharing**: Beautiful preview cards on Facebook/Twitter/WhatsApp

### For Platform
- 🚀 **Professional Presentation**: Enterprise-level SEO implementation
- 🤖 **AI-First Architecture**: Ready for future AI search engines
- 📊 **Analytics**: Track which keywords/schemas perform best
- 🌍 **Multi-Region Support**: Language and geo targeting built-in

### For Users
- ⚡ **Faster Discovery**: Better search results = easier to find products
- ✅ **Trust Signals**: Rich snippets increase click-through rates
- 📍 **Location Awareness**: Find nearby dispensaries easily
- 🔗 **Better Sharing**: Professional-looking shared links

---

## Next Steps

1. **Confirm Approach**: Review proposed architecture
2. **Test JSON Structure**: Provide example Apothecary JSON with all metadata fields
3. **Implement Services**: Create seo-metadata.ts utility
4. **Update Store Page**: Integrate metadata fetching and LD+JSON injection
5. **Test & Validate**: Use Google Rich Results Test
6. **Deploy & Monitor**: Track performance in Google Search Console

---

## Questions to Answer

1. **Do you want ALL dispensary types to have this metadata?**
   - Or only certain types like Apothecary?

2. **Should we create individual product detail pages?**
   - Currently, products only display in store lists
   - Need `/store/[dispensaryId]/product/[productId]` route

3. **What about user reviews in structured data?**
   - Do you have a review system we should integrate?

4. **Language support priority?**
   - Start with en-ZA only, or implement multi-language from the beginning?

5. **Should we generate LD+JSON server-side or client-side?**
   - Current: Client-side (useEffect)
   - Better: Server-side (Next.js 13+ app router metadata)

---

## Conclusion

✅ **Your metadata IS already being saved** - The system correctly preserves `meta`, `aiSearchBoost`, `semanticRelationships`, etc. outside of `categoriesData`.

❌ **It's just not being USED yet** - The public store pages don't fetch or render this metadata.

🚀 **Solution is straightforward**:
1. Create SEO utility library
2. Add metadata fetching hook
3. Update store page to inject LD+JSON and meta tags
4. Test with Google Rich Results
5. Monitor performance improvements

The infrastructure is READY - we just need to connect the dots between the saved metadata and the public-facing pages.
