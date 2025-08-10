
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; 
import { GeistMono } from 'geist/font/mono'; 
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext'; // Import CartProvider
import { CartDrawer } from '@/components/cart/CartDrawer'; // Import CartDrawer

export const metadata: Metadata = {
  title: 'The Wellness Tree - AI-Powered Wellness & Cannabis Hub',
  description: 'Explore cannabis products and get AI-powered advice on cannabinoids, gardening, homeopathy, mushrooms, and traditional medicine at The Wellness Tree.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`antialiased flex flex-col min-h-screen bg-background text-foreground`}>
        <video
          id="background-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="https://firebasestorage.googleapis.com/v0/b/dispensary-tree.appspot.com/o/site-assets%2Fbackground-video.mp4?alt=media&token=59e60658-9650-427a-8113-a75d1e4e203c" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
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
