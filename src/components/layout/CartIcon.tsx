
'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

export function CartIcon() {
  const { getTotalItems, toggleCart } = useCart();
  const totalItems = getTotalItems();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-muted-foreground hover:text-primary hover:bg-primary/10"
      onClick={toggleCart}
      aria-label={`Shopping Cart with ${totalItems} items`}
    >
      <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
      {totalItems > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1.5 -right-1.5 h-5 w-5 text-xs p-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
        >
          {totalItems > 99 ? '99+' : totalItems}
        </Badge>
      )}
    </Button>
  );
}
