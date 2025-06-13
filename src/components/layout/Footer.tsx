
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border py-6 text-muted-foreground">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Holistic AI Hub. All rights reserved.
        </p>
        <div className="mt-2 space-x-4">
          <Link href="/terms" className="hover:text-primary transition-colors text-xs">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors text-xs">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
