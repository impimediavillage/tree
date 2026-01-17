'use client';

import { useState } from 'react';
import CategoryStructureBuilder from '@/components/admin/CategoryStructureBuilder';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Code2 } from 'lucide-react';
import type { CategoryStructureMetadata } from '@/lib/categoryStructureAnalyzer';

const exampleJSON = `{
  "ayurvedicProducts": [
    {
      "name": "Doshas & Constitution",
      "image": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400",
      "subcategories": [
        {
          "name": "Vata Balancing",
          "image": "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400"
        },
        {
          "name": "Pitta Balancing",
          "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400"
        },
        {
          "name": "Kapha Balancing",
          "image": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400"
        }
      ]
    },
    {
      "name": "Body Systems",
      "image": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400",
      "subcategories": [
        {
          "name": "Digestive System",
          "image": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400"
        },
        {
          "name": "Respiratory System",
          "image": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400"
        },
        {
          "name": "Circulatory System",
          "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400"
        }
      ]
    },
    {
      "name": "Herbal Remedies",
      "image": "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400",
      "subcategories": [
        {
          "name": "Powders",
          "image": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400"
        },
        {
          "name": "Oils",
          "image": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400"
        }
      ]
    }
  ]
}`;

export default function CategoryBuilderDemo() {
  const [finalJSON, setFinalJSON] = useState<any>(null);
  const [finalMetadata, setFinalMetadata] = useState<CategoryStructureMetadata | null>(null);

  const handleStructureChange = (json: any, metadata: CategoryStructureMetadata) => {
    setFinalJSON(json);
    setFinalMetadata(metadata);
    console.log('Structure updated:', { json, metadata });
  };

  const loadExample = () => {
    // This will be set as the initial value when the component remounts
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="border-2 border-primary/30 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            Visual Category Structure Builder
          </CardTitle>
          <CardDescription className="text-base">
            Create and visualize wellness type category structures with drag-and-drop interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                const exampleArea = document.querySelector('textarea');
                if (exampleArea) {
                  (exampleArea as HTMLTextAreaElement).value = exampleJSON;
                  exampleArea.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Code2 className="h-4 w-4" />
              Load Example (Ayurvedic Medicine)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Builder Component */}
      <CategoryStructureBuilder 
        onStructureChange={handleStructureChange}
        initialJSON={exampleJSON}
      />

      {/* Output Preview */}
      {finalJSON && finalMetadata && (
        <Card className="border-2 border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-purple-600" />
              Final Structure Output
            </CardTitle>
            <CardDescription>
              This is what will be saved to Firestore
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Metadata:</h4>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-40">
                {JSON.stringify(finalMetadata, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Categories Data:</h4>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-60">
                {JSON.stringify(finalJSON, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
