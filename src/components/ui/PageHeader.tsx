'use client';

import * as React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, children }) => {
  return (
    <div className="bg-card/70 dark:bg-card/80 backdrop-blur-md border border-border/50 rounded-lg p-8 shadow-lg mb-12 text-center animate-fade-in-scale-up">
      <h1 className="text-5xl font-extrabold tracking-tight text-foreground">
        {title}
      </h1>
      <div className="text-xl text-foreground/80 mt-4 max-w-3xl mx-auto">
        {description}
      </div>
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  );
};
