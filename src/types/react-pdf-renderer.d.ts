declare module '@react-pdf/renderer' {
  import * as React from 'react';

  export interface Style {
    [key: string]: any;
  }

  export interface DocumentProps {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    keywords?: string;
    producer?: string;
    language?: string;
    style?: Style;
    children?: React.ReactNode;
  }

  export interface PageProps {
    size?: string | { width: number; height: number };
    orientation?: 'portrait' | 'landscape';
    style?: Style;
    wrap?: boolean;
    children?: React.ReactNode;
  }

  export interface ViewProps {
    style?: Style;
    wrap?: boolean;
    break?: boolean;
    fixed?: boolean;
    children?: React.ReactNode;
  }

  export interface TextProps {
    style?: Style;
    wrap?: boolean;
    break?: boolean;
    fixed?: boolean;
    children?: React.ReactNode;
  }

  export interface ImageProps {
    src: string | { uri: string; method?: string; headers?: Record<string, string>; body?: any };
    style?: Style;
    fixed?: boolean;
  }

  export interface LinkProps {
    src: string;
    style?: Style;
    children?: React.ReactNode;
  }

  export const Document: React.FC<DocumentProps>;
  export const Page: React.FC<PageProps>;
  export const View: React.FC<ViewProps>;
  export const Text: React.FC<TextProps>;
  export const Image: React.FC<ImageProps>;
  export const Link: React.FC<LinkProps>;
  export const StyleSheet: {
    create: <T extends { [key: string]: Style }>(styles: T) => T;
  };

  export function pdf(element: React.ReactElement): {
    toBlob(): Promise<Blob>;
    toBuffer(): Promise<Buffer>;
    toString(): Promise<string>;
  };
}
