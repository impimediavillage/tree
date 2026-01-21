'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GenericProductEditPage from '@/components/products/GenericProductEditPage';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DynamicEditProductPage() {
  const params = useParams();
  const router = useRouter();
  const dispensaryTypeParam = params?.dispensaryType as string;
  const productId = (params?.productId ?? '') as string;
  
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

      if (!productId) {
        setError('No product ID specified');
        setIsLoading(false);
        return;
      }

      try {
        // Convert URL slug to title case (e.g., "apothecary_store" -> "Apothecary Store")
        const decodedParam = decodeURIComponent(dispensaryTypeParam);
        const titleCaseName = decodedParam
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        console.log('[DynamicEditProduct] Looking up dispensary type:', {
          param: dispensaryTypeParam,
          decoded: decodedParam,
          titleCase: titleCaseName
        });

        // Fetch category structure using the title case name (this is how the document ID is stored)
        const categoriesRef = firestoreDoc(db, 'dispensaryTypeProductCategories', titleCaseName);
        const categoriesSnapshot = await getDoc(categoriesRef);

        if (!categoriesSnapshot.exists()) {
          setError(`Category structure not configured for "${titleCaseName}". Please configure it in the admin panel.`);
          setIsLoading(false);
          return;
        }

        const categoriesData = categoriesSnapshot.data()?.categoriesData;
        
        if (!categoriesData) {
          setError(`No category data found for "${titleCaseName}".`);
          setIsLoading(false);
          return;
        }

        // Auto-detect category path
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
          setError(`Could not detect category structure for "${titleCaseName}".`);
          setIsLoading(false);
          return;
        }

        categoryPath = detectedPath;

        console.log('[DynamicEditProduct] Successfully loaded category structure:', {
          typeName: titleCaseName,
          categoryPath,
          categoryGroups: Object.keys(categoriesData)
        });

        setTypeData({
          name: titleCaseName,
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
  }, [dispensaryTypeParam, productId, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#006B3E]" />
        <p className="text-lg font-semibold text-[#3D2E17]">Loading product editor...</p>
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
    <GenericProductEditPage
      productId={productId}
      dispensaryTypeName={typeData.name}
      categoryPath={typeData.categoryPath}
      pageTitle={`Edit ${typeData.name} Product`}
      pageDescription={`Update your ${typeData.name.toLowerCase()} product details`}
    />
  );
}
