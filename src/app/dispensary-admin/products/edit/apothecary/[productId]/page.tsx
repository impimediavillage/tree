'use client';

import GenericProductEditPage from '@/components/products/GenericProductEditPage';

export default function ApothecaryProductEditPage({ params }: { params: { productId: string } }) {
  return (
    <GenericProductEditPage
      productId={params.productId}
      dispensaryTypeName="Apothecary"
      categoryPath={['homeopathicProducts', 'homeopathicProducts']}
      pageTitle="Edit Apothecary Product"
      pageDescription="Update your apothecary product details"
    />
  );
}
