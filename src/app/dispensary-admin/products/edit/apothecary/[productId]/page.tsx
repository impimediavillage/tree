'use client';

import { useParams } from 'next/navigation';
import GenericProductEditPage from '@/components/products/GenericProductEditPage';

export default function ApothecaryProductEditPage() {
  const params = useParams();
  const productId = (params?.productId ?? '') as string;

  return (
    <GenericProductEditPage
      productId={productId}
      dispensaryTypeName="Apothecary"
      categoryPath={['homeopathicProducts', 'homeopathicProducts']}
      pageTitle="Edit Apothecary Product"
      pageDescription="Update your apothecary product details"
    />
  );
}
