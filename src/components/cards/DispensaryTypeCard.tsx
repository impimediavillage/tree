
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DispensaryType } from '@/types';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DispensaryTypeCardProps {
  dispensaryType: DispensaryType;
  basePath: string;
  delay?: number;
}

export function DispensaryTypeCard({ dispensaryType, basePath, delay = 0 }: DispensaryTypeCardProps) {
  const { name, description, storeCount } = dispensaryType;
  
  // To robustly handle potential inconsistencies in the Firestore data,
  // we intelligently search for the image URL across common property names.
  // This ensures the card displays an image if one is available, even if the field name varies.
  const imageUrl = dispensaryType.image || (dispensaryType as any).imageUrl || (dispensaryType as any).iconPath || null;

  const linkHref = `${basePath}/${encodeURIComponent(name)}`;

  return (
    <Card 
        className="group relative flex flex-col overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-[380px] bg-card/60 dark:bg-card/70 backdrop-blur-sm border-border/30 hover:border-primary/50 animate-fade-in-scale-up"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'backwards' }}
        data-ai-hint={`dispensary type ${name.toLowerCase()}`}
    >
        <div className="absolute inset-0 z-0">
            {imageUrl ? (
                <Image 
                    src={imageUrl}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
            ) : (
                <div className="w-full h-full bg-muted"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
        </div>

        <div className="relative z-10 flex flex-col h-full p-6 text-white">
            <CardHeader className="p-0">
                <CardTitle className="text-2xl font-bold tracking-tight text-white shadow-text leading-tight">
                    {name}
                </CardTitle>
                {storeCount !== undefined && (
                    <Badge variant="secondary" className="mt-2 w-fit bg-primary/20 text-primary-foreground backdrop-blur-sm border border-primary/30">
                        {storeCount} {storeCount === 1 ? 'Store' : 'Stores'}
                    </Badge>
                )}
            </CardHeader>

            <CardContent className="p-0 flex-grow mt-3">
                <p className="text-sm text-gray-200 line-clamp-4 shadow-text">
                    {description}
                </p>
            </CardContent>

            <CardFooter className="p-0 mt-auto">
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold group-hover:bg-primary/95 transition-colors">
                    <Link href={linkHref}>
                        View Stores <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </CardFooter>
        </div>
    </Card>
  );
}
