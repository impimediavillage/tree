
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; 
import { GeistMono } from 'geist/font/mono'; 
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext'; // Import CartProvider
import { CartDrawer } from '@/components/cart/CartDrawer'; // Import CartDrawer
import BackgroundVideo from '@/components/layout/BackgroundVideo';

export const metadata: Metadata = {
  title: 'The Wellness Tree - AI-Powered Wellness Hub - ',
  description: 'Explore cannabis products and get AI-powered advice on cannabinoids, gardening, homeopathy, mushrooms, and traditional medicine at The Wellness Tree.',
  manifest: '/api/manifest',
  themeColor: '#221503',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'THE TREE',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="manifest" href="/api/manifest" />
        <link rel="apple-touch-icon" href="/api/icons/512.png" />
        <meta name="theme-color" content="#221503" />
      </head>
      <body className={`antialiased flex flex-col min-h-screen bg-transparent text-foreground`}>
       <BackgroundVideo />
        <AuthProvider>
          <CartProvider> {/* Wrap with CartProvider */}
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
            <CartDrawer /> {/* Add CartDrawer here to be accessible globally */}
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
