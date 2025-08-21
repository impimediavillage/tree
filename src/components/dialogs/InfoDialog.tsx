
'use client';

import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ProductAttribute } from '@/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface InfoDialogProps {
  triggerText: string;
  title: string;
  icon: React.ElementType;
  children?: React.ReactNode;
  items?: (string | ProductAttribute)[];
  itemType?: 'flavor' | 'effect' | 'medical';
  className?: string;
}

export const InfoDialog = ({ triggerText, title, icon: Icon, children, items, itemType, className }: InfoDialogProps) => {
  if (!children && (!items || items.length === 0)) return null;

  const badgeColors = {
    flavor: [
      "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800",
      "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800",
      "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800"
    ],
    effect: [
      "bg-blue-100 text-blue-800", "bg-indigo-100 text-indigo-800",
      "bg-purple-100 text-purple-800", "bg-pink-100 text-pink-800",
      "bg-red-100 text-red-800", "bg-orange-100 text-orange-800"
    ],
    medical: [
      "bg-green-100 text-green-800", "bg-teal-100 text-teal-800",
      "bg-lime-100 text-lime-800", "bg-yellow-100 text-yellow-800",
      "bg-stone-200 text-stone-800", "bg-gray-200 text-gray-800"
    ]
  };
  
  const isDescription = triggerText === 'Full Description';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("text-xs h-7 px-2", className)}>
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(isDescription ? 'sm:max-w-xl' : 'sm:max-w-md')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {title}</DialogTitle>
          {isDescription && <DialogDescription>Full Product Details</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
            {typeof children === 'string' ? (
                <div className="py-2 whitespace-pre-wrap text-sm text-foreground">
                    {children}
                </div>
            ) : children}

            {children && items && items.length > 0 && <Separator className="my-4" />}
            {items && items.length > 0 && (
              <div className="flex flex-col items-start gap-2 py-4">
                <div className="flex flex-wrap gap-2">
                  {items.map((item, index) => {
                      const isAttribute = typeof item === 'object' && 'name' in item;
                      const name = isAttribute ? item.name : item;
                      const percentage = isAttribute ? (item as ProductAttribute).percentage : null;

                      return (
                      <Badge key={index} variant="secondary" className={cn("text-sm font-medium border-none py-1 px-3", itemType && badgeColors[itemType][index % badgeColors[itemType].length])}>
                          {name} {percentage && <span className="ml-1.5 font-semibold">({percentage})</span>}
                      </Badge>
                      );
                  })}
                </div>
                {(itemType === 'effect' || itemType === 'medical') && (
                    <div className="p-2 mt-4 rounded-md border border-dashed bg-muted/50 text-xs w-full">
                        <p className="font-semibold text-muted-foreground mb-1.5">Percentage Key:</p>
                        <p className="text-muted-foreground leading-snug">
                            Indicates the reported likelihood of an effect or its potential as a medical aid.
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="border-green-300 bg-green-50/50 text-green-800">Low (1-10%)</Badge>
                            <Badge variant="outline" className="border-yellow-400 bg-yellow-50/50 text-yellow-800">Medium (11-30%)</Badge>
                            <Badge variant="outline" className="border-red-400 bg-red-50/50 text-red-800">High (31% +)</Badge>
                        </div>
                    </div>
                )}
              </div>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
