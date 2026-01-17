'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GenericProductAddPage from '@/components/products/GenericProductAddPage';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DynamicAddProductPage() {
  const params = useParams();
  const router = useRouter();
  const dispensaryTypeParam = params?.dispensaryType as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeData, setTypeData] = useState<{
    name: string;
    categoryPath: string[];
  } | null>(null);

  useEffect(() => {
    const loadTypeConfiguration = async () => {
      if (!dispensaryTypeParam) {
        setError('No dispensary type specified');
        setIsLoading(false);
        return;
      }

      try {
        // Convert URL slug back to proper name (e.g., "apothecary" -> "Apothecary")
        // First, try to find the exact match in dispensaryTypes
        const typesRef = firestoreDoc(db, 'dispensaryTypes', dispensaryTypeParam);
        let typeSnapshot = await getDoc(typesRef);

        let actualTypeName = dispensaryTypeParam;
        
        // If not found by ID, we need to search by sanitized name
        if (!typeSnapshot.exists()) {
          // For now, use the param and capitalize it
          // In production, you might want to query the collection
          actualTypeName = dispensaryTypeParam
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else {
          actualTypeName = typeSnapshot.data()?.name || dispensaryTypeParam;
        }

        // Check if type uses generic workflow
        if (typeSnapshot.exists() && typeSnapshot.data()?.useGenericWorkflow !== true) {
          setError(`"${actualTypeName}" does not use the generic workflow system. Please use its custom add page.`);
          setIsLoading(false);
          return;
        }

        // Fetch category structure to determine path
        const categoriesRef = firestoreDoc(db, 'dispensaryTypeProductCategories', actualTypeName);
        const categoriesSnapshot = await getDoc(categoriesRef);

        if (!categoriesSnapshot.exists()) {
          setError(`Category structure not configured for "${actualTypeName}". Please configure it in the admin panel.`);
          setIsLoading(false);
          return;
        }

        const categoriesData = categoriesSnapshot.data()?.categoriesData;
        
        if (!categoriesData) {
          setError(`No category data found for "${actualTypeName}".`);
          setIsLoading(false);
          return;
        }

        // Auto-detect category path (find first array in the structure)
        let categoryPath: string[] = [];
        
        const findCategoryArray = (obj: any, path: string[] = []): string[] | null => {
          for (const key in obj) {
            if (Array.isArray(obj[key]) && obj[key].length > 0 && obj[key][0].name) {
              return [...path, key];
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              const result = findCategoryArray(obj[key], [...path, key]);
              if (result) return result;
            }
          }
          return null;
        };

        const detectedPath = findCategoryArray(categoriesData);
        
        if (!detectedPath) {
          setError(`Could not detect category structure for "${actualTypeName}".`);
          setIsLoading(false);
          return;
        }

        categoryPath = detectedPath;

        setTypeData({
          name: actualTypeName,
          categoryPath
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading type configuration:', error);
        setError('Failed to load dispensary type configuration');
        setIsLoading(false);
      }
    };

    loadTypeConfiguration();
  }, [dispensaryTypeParam, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
        <p className="text-lg font-semibold text-[#3D2E17]">Loading product form...</p>
      </div>
    );
  }

  if (error || !typeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
        <AlertTriangle className="h-16 w-16 text-orange-500" />
        <h2 className="text-2xl font-bold text-[#3D2E17]">Configuration Error</h2>
        <p className="text-center text-muted-foreground max-w-md">{error}</p>
        <Link href="/dispensary-admin/products">
          <Button variant="outline">
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <GenericProductAddPage
      dispensaryTypeName={typeData.name}
      categoryPath={typeData.categoryPath}
      pageTitle={`Add ${typeData.name} Product`}
      pageDescription={`Add a new product to your ${typeData.name.toLowerCase()} dispensary`}
    />
  );
}
