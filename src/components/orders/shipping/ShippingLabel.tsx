import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Order } from "@/types/order";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";

interface ShippingLabelProps {
  order: Order;
}

export function ShippingLabel({ order }: ShippingLabelProps) {
  const [labels, setLabels] = useState<Array<{ url: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLabels = async () => {
      try {
        setLoading(true);
        // TODO: Implement shipping label API integration
        // This would typically make an API call to your shipping provider
        // For now, we'll simulate a delay and show a placeholder
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLabels([
          { url: 'https://placeholder.com/shipping-label-1' },
          { url: 'https://placeholder.com/shipping-label-2' },
        ]);
      } catch (error) {
        console.error('Error loading shipping labels:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLabels();
  }, [order.id]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-pulse">Loading shipping labels...</div>
        </CardContent>
      </Card>
    );
  }

  if (!labels.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">
            No shipping labels available for this order.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-4">
        {labels.map((label, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-base">Shipping Label #{index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* TODO: Replace with actual shipping label component when API is integrated */}
              <div className="aspect-[8.5/11] border border-dashed rounded-lg flex items-center justify-center">
                <div className="text-muted-foreground text-sm text-center">
                  <p>Shipping Label Preview</p>
                  <p className="text-xs mt-1">{label.url}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}