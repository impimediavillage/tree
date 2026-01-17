'use client';

import GenericProductAddPage from '@/components/products/GenericProductAddPage';

export default function ApothecaryProductAddPage() {
  return (
    <GenericProductAddPage
      dispensaryTypeName="Apothecary"
      categoryPath={['homeopathicProducts', 'homeopathicProducts']}
      pageTitle="Add Apothecary Product"
      pageDescription="Add a new product to your apothecary dispensary"
    />
  );
}
