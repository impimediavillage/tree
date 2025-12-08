'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { CustomerFriendlyTrackingUpdate } from '@/lib/order-tracking-service';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ShippingTimelineProps {
  updates: CustomerFriendlyTrackingUpdate[];
  className?: string;
}

export function ShippingTimeline({ updates, className }: ShippingTimelineProps) {
  if (!updates || updates.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No tracking information available yet</p>
          <p className="text-sm mt-2">Tracking updates will appear here once your order is processed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="py-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-border" />

          {/* Timeline items */}
          <div className="space-y-6">
            {updates.map((update, index) => {
              const IconComponent = update.icon;
              const isLast = index === updates.length - 1;

              return (
                <div key={index} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2',
                      update.isError
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : update.isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : update.isCurrent
                        ? 'border-primary bg-background text-primary animate-pulse'
                        : 'border-muted bg-background text-muted-foreground'
                    )}
                  >
                    {IconComponent && React.createElement(IconComponent as unknown as React.ComponentType<{ className: string }>, { className: 'h-5 w-5' })}
                  </div>

                  {/* Content */}
                  <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4
                            className={cn(
                              'font-semibold leading-none',
                              update.isCurrent && 'text-primary',
                              update.isError && 'text-destructive'
                            )}
                          >
                            {update.title}
                          </h4>
                          {update.isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {update.isError && (
                            <Badge variant="destructive" className="text-xs">
                              Issue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {update.description}
                        </p>
                        {update.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <span className="font-medium">Location:</span>
                            <span>{update.location}</span>
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(update.timestamp, { addSuffix: true })}
                      </time>
                    </div>
                    <time className="text-xs text-muted-foreground block mt-1">
                      {update.timestamp.toLocaleString('en-ZA', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ShippingTimeline;
