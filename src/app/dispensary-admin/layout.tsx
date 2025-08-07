
'use client';

import { DispensaryDataProvider } from '@/contexts/DispensaryDataContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { ReactNode } from 'react';

// This is a new root layout for the /dispensary-admin section.
// It ensures the DispensaryDataProvider wraps all child routes.
export default function DispensaryAdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <DispensaryDataProvider>
        {children}
      </DispensaryDataProvider>
    </AuthProvider>
  );
}
