'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, Shield, Tag, Brain, Zap } from 'lucide-react';

interface MetadataViewerProps {
  metadata?: {
    meta?: {
      region?: string;
      compliance?: string;
      keywords?: string[];
      targetAudience?: string[];
      regulatoryNotes?: string;
    };
    structuredData?: {
      '@type'?: string;
      category?: string;
    };
    semanticRelationships?: {
      entities?: { [key: string]: string[] };
      synonyms?: { [key: string]: string[] };
    };
    aiSearchBoost?: {
      style?: string;
      boostSignals?: string[];
    };
  };
  compact?: boolean;
}

export default function MetadataViewer({ metadata, compact = false }: MetadataViewerProps) {
  if (!metadata || !metadata.meta) return null;

  const { meta, structuredData, semanticRelationships, aiSearchBoost } = metadata;

  if (compact) {
    // Compact inline display
    return (
      <div className="flex flex-wrap gap-2 items-center">
        {meta.region && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {meta.region}
          </Badge>
        )}
        {meta.compliance && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {meta.compliance}
          </Badge>
        )}
        {meta.keywords && meta.keywords.length > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {meta.keywords.length} keywords
          </Badge>
        )}
      </div>
    );
  }

  // Full card display
  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600" />
          Product Metadata
        </CardTitle>
        <CardDescription>SEO, targeting, and compliance information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Region & Compliance */}
        {(meta.region || meta.compliance) && (
          <div className="space-y-2">
            {meta.region && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Region:</span>
                <Badge variant="secondary">{meta.region}</Badge>
              </div>
            )}
            {meta.compliance && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Compliance:</span>
                <span className="text-sm">{meta.compliance}</span>
              </div>
            )}
          </div>
        )}

        {/* Keywords */}
        {meta.keywords && meta.keywords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Keywords:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {meta.keywords.map((keyword, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Target Audience */}
        {meta.targetAudience && meta.targetAudience.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-semibold">Target Audience:</span>
            <div className="flex flex-wrap gap-1">
              {meta.targetAudience.map((audience, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {audience}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Search Optimization */}
        {aiSearchBoost?.style && (
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-600" />
            <span className="font-semibold">Search Style:</span>
            <Badge variant="secondary">{aiSearchBoost.style}</Badge>
          </div>
        )}

        {/* Regulatory Notes */}
        {meta.regulatoryNotes && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-xs text-yellow-900 dark:text-yellow-200">
              <span className="font-semibold">⚠️ Regulatory Note:</span> {meta.regulatoryNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
