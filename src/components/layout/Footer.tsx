
import Link from 'next/link';
import { FileText, Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-muted/50 border-t border-border py-6">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm font-semibold text-[#3D2E17]">
          &copy; {new Date().getFullYear()} The Wellness Tree. All rights reserved.
        </p>
        <div className="mt-3 flex items-center justify-center gap-6">
          <Link 
            href="/terms" 
            className="hover:text-[#006B3E] transition-colors text-sm font-medium text-[#3D2E17] flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Terms of Service
          </Link>
          <Link 
            href="/privacy" 
            className="hover:text-[#006B3E] transition-colors text-sm font-medium text-[#3D2E17] flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
