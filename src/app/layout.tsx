
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; 
import { GeistMono } from 'geist/font/mono'; 
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import Script from 'next/script';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext'; // Import CartProvider
import { CartDrawer } from '@/components/cart/CartDrawer'; // Import CartDrawer

export const metadata: Metadata = {
  title: 'The Dispensary Tree - AI-Powered Wellness & Cannabis Hub',
  description: 'Explore cannabis products and get AI-powered advice on cannabinoids, gardening, homeopathy, mushrooms, and traditional medicine at The Dispensary Tree.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <AuthProvider>
          <CartProvider> {/* Wrap with CartProvider */}
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <CartDrawer /> {/* Add CartDrawer here to be accessible globally */}
            <Toaster />
            {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <Script
                src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
                strategy="afterInteractive"
                async
                defer
              />
            )}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

