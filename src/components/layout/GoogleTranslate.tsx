'use client';

import { useEffect, useState } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Extend Window interface for Google Translate
declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            layout: number;
            autoDisplay: boolean;
          },
          elementId: string
        ) => void;
        Element: {
          InlineLayout: {
            SIMPLE: number;
          };
        };
      };
    };
  }
}

// South African languages + common international languages
const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'zu', name: 'Zulu', flag: '🇿🇦' },
  { code: 'xh', name: 'Xhosa', flag: '🇿🇦' },
  { code: 'st', name: 'Sesotho', flag: '🇿🇦' },
  { code: 'tn', name: 'Setswana', flag: '🇿🇦' },
  { code: 'nso', name: 'Sepedi', flag: '🇿🇦' },
  { code: 'ts', name: 'Xitsonga', flag: '🇿🇦' },
  { code: 'ss', name: 'Siswati', flag: '🇿🇦' },
  { code: 've', name: 'Tshivenda', flag: '🇿🇦' },
  { code: 'nr', name: 'isiNdebele', flag: '🇿🇦' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function GoogleTranslate() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLang, setCurrentLang] = useState('English');

  useEffect(() => {
    // Define the callback function
    window.googleTranslateElementInit = () => {
      try {
        if (window.google?.translate?.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: languages.map((l) => l.code).join(','),
              layout: 0, // 0 = SIMPLE layout (InlineLayout.SIMPLE)
              autoDisplay: false,
            },
            'google_translate_element'
          );
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Google Translate initialization error:', error);
        setIsLoading(false);
      }
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="translate.google.com"]');
    if (existingScript) {
      setIsLoading(false);
      return;
    }

    // Load the Google Translate script
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => {
      console.error('Failed to load Google Translate script');
      setIsLoading(false);
    };
    document.body.appendChild(script);

    // Detect current language changes
    const observer = new MutationObserver(() => {
      const frame = document.querySelector('.goog-te-menu-frame') as HTMLIFrameElement;
      if (frame?.contentWindow?.document) {
        const selected = frame.contentWindow.document.querySelector('.goog-te-menu2-item-selected');
        if (selected?.textContent) {
          const langName = languages.find((l) => 
            selected.textContent?.toLowerCase().includes(l.name.toLowerCase())
          )?.name || 'English';
          setCurrentLang(langName);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      // Cleanup
      const existingScript = document.querySelector('script[src*="translate.google.com"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const changeLanguage = (langCode: string, langName: string) => {
    // Find the Google Translate select element
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event('change'));
      setCurrentLang(langName);
    }
  };

  return (
    <>
      {/* Hidden Google Translate element */}
      <div id="google_translate_element" className="hidden" />

      {/* Custom UI */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-[#006B3E] hover:bg-[#006B3E]/10 gap-1.5 px-2 sm:px-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            <span className="hidden lg:inline text-xs">{currentLang}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 max-h-96 overflow-y-auto">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            South African Languages
          </DropdownMenuLabel>
          {languages.slice(0, 11).map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code, lang.name)}
              className={currentLang === lang.name ? 'bg-[#006B3E]/10 text-[#006B3E]' : ''}
            >
              <span className="mr-2 text-base">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Other Languages
          </DropdownMenuLabel>
          {languages.slice(11).map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code, lang.name)}
              className={currentLang === lang.name ? 'bg-[#006B3E]/10 text-[#006B3E]' : ''}
            >
              <span className="mr-2 text-base">{lang.flag}</span>
              <span className="flex-1">{lang.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hide Google's default UI with CSS */}
      <style jsx global>{`
        .goog-te-banner-frame,
        .goog-te-balloon-frame,
        .goog-logo-link,
        .goog-te-gadget {
          display: none !important;
        }
        body {
          top: 0 !important;
        }
        .skiptranslate {
          display: none !important;
        }
        #google_translate_element .goog-te-gadget-simple {
          display: none !important;
        }
      `}</style>
    </>
  );
}
