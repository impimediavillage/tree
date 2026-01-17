import type { EnhancedCategoryItem } from '@/types';

/**
 * Generate Schema.org JSON-LD structured data for product categories
 * Safe to use - returns null if insufficient data
 */
export function generateCategoryStructuredData(
  category: EnhancedCategoryItem | undefined,
  categoryName: string,
  dispensaryType: string
): string | null {
  if (!category?.structuredDataHints) return null;

  const hints = category.structuredDataHints;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': hints['@type'] || 'Product',
    name: categoryName,
    category: hints.category || dispensaryType,
    ...(hints.additionalType && { additionalType: hints.additionalType }),
    ...(category.useCases && category.useCases.length > 0 && {
      description: `Used for: ${category.useCases.join(', ')}`
    }),
    ...(category.audience && {
      audience: {
        '@type': 'Audience',
        audienceType: category.audience
      }
    }),
    ...(category.regionalRelevance && {
      areaServed: category.regionalRelevance
    })
  };

  return JSON.stringify(structuredData, null, 2);
}

/**
 * Generate FAQ structured data from category FAQ seed questions
 */
export function generateFAQStructuredData(
  faqQuestions: string[] | undefined
): string | null {
  if (!faqQuestions || faqQuestions.length === 0) return null;

  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqQuestions.map((question) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Answer will be provided by experts' // Placeholder
      }
    }))
  };

  return JSON.stringify(faqData, null, 2);
}

/**
 * Generate comprehensive SEO meta tags from category metadata
 */
export function generateSEOMetaTags(
  category: EnhancedCategoryItem | undefined,
  categoryName: string,
  typeMetadata?: any
): {
  title?: string;
  description?: string;
  keywords?: string;
  robots?: string;
} {
  if (!category) return {};

  const tags: any = {};

  // Title from SEO page intent or category name
  if (category.seoPageIntent) {
    tags.title = `${categoryName} - ${category.seoPageIntent}`;
  } else {
    tags.title = categoryName;
  }

  // Description from use cases
  if (category.useCases && category.useCases.length > 0) {
    tags.description = `Explore ${categoryName.toLowerCase()} products: ${category.useCases.join(', ')}`;
  }

  // Keywords from category + type metadata
  const keywordSet = new Set<string>();
  if (category.searchTags) {
    category.searchTags.forEach(tag => keywordSet.add(tag));
  }
  if (typeMetadata?.meta?.keywords) {
    typeMetadata.meta.keywords.forEach((kw: string) => keywordSet.add(kw));
  }
  if (keywordSet.size > 0) {
    tags.keywords = Array.from(keywordSet).join(', ');
  }

  return tags;
}
