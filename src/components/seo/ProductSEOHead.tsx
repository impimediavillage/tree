'use client';

import Head from 'next/head';
import { generateSEOMetaTags, generateCategoryStructuredData, generateFAQStructuredData } from '@/lib/structuredDataHelper';
import type { EnhancedCategoryItem } from '@/types';

interface ProductSEOHeadProps {
  dispensaryTypeName: string;
  categoryName?: string;
  category?: EnhancedCategoryItem;
  typeMetadata?: {
    meta?: any;
    structuredData?: any;
    semanticRelationships?: any;
  };
}

/**
 * SAFE Component: Only renders SEO tags if metadata is present
 * Won't break existing pages without metadata
 */
export default function ProductSEOHead({
  dispensaryTypeName,
  categoryName,
  category,
  typeMetadata
}: ProductSEOHeadProps) {
  // Return null if no metadata (safe for existing types)
  if (!category && !typeMetadata) return null;

  const seoTags = category ? generateSEOMetaTags(category, categoryName || '', typeMetadata) : {};
  const structuredData = category && categoryName 
    ? generateCategoryStructuredData(category, categoryName, dispensaryTypeName)
    : null;
  const faqData = category?.faqSeedQuestions 
    ? generateFAQStructuredData(category.faqSeedQuestions)
    : null;

  // If no SEO data generated, don't render anything
  if (!seoTags.title && !structuredData && !faqData) return null;

  return (
    <Head>
      {seoTags.title && <title>{seoTags.title}</title>}
      {seoTags.description && <meta name="description" content={seoTags.description} />}
      {seoTags.keywords && <meta name="keywords" content={seoTags.keywords} />}
      
      {/* Schema.org Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredData }}
        />
      )}
      
      {/* FAQ Structured Data */}
      {faqData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqData }}
        />
      )}
    </Head>
  );
}
