
'use client';

import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Trash2, Plus, Minus, X, Info, Gift } from 'lucide-react';

export function CartDrawer() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getTotalItems,
    isCartOpen,
    setIsCartOpen,
  } = useCart();
  const { toast } = useToast();

  const handleQuantityChange = (productId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity > 0) {
      updateQuantity(productId, newQuantity);
    } else {
      removeFromCart(productId); 
    }
  };

  const handleDirectQuantityInput = (productId: string, value: string) => {
    const newQuantity = parseInt(value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      updateQuantity(productId, newQuantity);
    } else if (value === "") {
      // Allow clearing the input, but on blur, it might default to 1
      // Or handle this more gracefully, maybe by setting a temp state
    }
  };
  
  const handleQuantityInputBlur = (productId: string, currentDisplayQuantity: string | number) => {
    let newQuantity = typeof currentDisplayQuantity === 'string' ? parseInt(currentDisplayQuantity, 10) : currentDisplayQuantity;
    if (isNaN(newQuantity) || newQuantity < 1) {
      updateQuantity(productId, 1); // Default to 1 if invalid or less than 1
    }
  };


  const handleCheckout = () => {
    toast({
      title: "Checkout Initiated (Demo)",
      description: "This is a demo. In a real app, you'd proceed to a payment page. Your cart has not been cleared.",
      duration: 5000,
    });
    // In a real app, you might navigate to a checkout page or trigger payment modals.
    // setIsCartOpen(false); // Keep cart open for demo, or close if navigating
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 bg-card text-card-foreground">
        <SheetHeader className="p-4 sm:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold flex items-center">
              <ShoppingCart className="mr-3 h-6 w-6 text-primary" /> Your Shopping Cart 
              <span className="ml-2 text-muted-foreground text-base">({getTotalItems()} items)</span>
            </SheetTitle>
            {/* The SheetClose component with the X icon has been removed from here */}
          </div>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
            <ShoppingCart className="h-24 w-24 text-muted-foreground/20 mb-6" />
            <p className="text-xl font-semibold text-foreground mb-2">Your cart is empty.</p>
            <p className="text-md text-muted-foreground">Looks like you haven't added anything yet.</p>
            <SheetClose asChild>
                <Button variant="outline" className="mt-8 text-primary border-primary hover:bg-primary/10">
                    Continue Shopping
                </Button>
            </SheetClose>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-grow overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-5">
                {cartItems.map(item => {
                  const isDesignPack = item.description?.startsWith('PROMO_DESIGN_PACK|');
                  let freeSampleName: string | undefined;
                  let freeSampleUnit: string | undefined;
                  
                  if (isDesignPack) {
                    try {
                      const parts = item.description.split('|');
                      if (parts.length === 3) {
                        freeSampleName = parts[1];
                        freeSampleUnit = parts[2];
                      }
                    } catch(e) {
                      console.error("Error parsing design pack description:", e);
                    }
                  }

                  return (
                  <div key={item.id} className="flex gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
                    <div className="relative h-24 w-24 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          layout="fill"
                          objectFit="cover"
                          data-ai-hint={`cart item ${item.name.split(" ")[0] || ""}`}
                        />
                      ) : isDesignPack ? (
                        <Gift className="h-10 w-10 text-primary m-auto" />
                      ) : (
                        <ShoppingCart className="h-10 w-10 text-muted-foreground/50 m-auto" />
                      )}
                    </div>
                    <div className="flex-grow flex flex-col">
                      <div>
                        <h3 className="font-semibold text-md text-foreground hover:text-primary transition-colors cursor-default" title={item.name}>
                          {item.name}
                        </h3>
                         {!isDesignPack && (
                            <p className="text-xs text-muted-foreground">{item.category}</p>
                         )}
                        <p className="text-md font-semibold text-accent mt-1">
                          {item.currency} {(item.price * item.quantity).toFixed(2)}
                          {item.quantity > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">({item.currency} {item.price.toFixed(2)} each)</span>
                          )}
                        </p>
                      </div>
                       <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-input rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id!, item.quantity, -1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleDirectQuantityInput(item.id!, e.target.value)}
                            onBlur={(e) => handleQuantityInputBlur(item.id!, e.target.value)}
                            className="h-8 w-12 text-center border-none focus-visible:ring-0 px-1 text-sm"
                            aria-label={`Quantity for ${item.name}`}
                            min="1"
                            max={item.quantityInStock}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id!, item.quantity, 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                            disabled={item.quantity >= item.quantityInStock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                         {item.quantity >= item.quantityInStock && <span className="text-xs text-amber-600 ml-2">Max stock</span>}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeFromCart(item.id!)}
                            aria-label={`Remove ${item.name} from cart`}
                            >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                       {isDesignPack && freeSampleName && freeSampleUnit && (
                          <div className="flex items-start gap-2 mt-3 pt-3 text-sm text-green-600 dark:text-green-400 border-t border-border">
                            <Gift className="h-8 w-8 flex-shrink-0" />
                            <p className="font-medium">
                              Includes {item.quantity} of Free samples of {freeSampleName} - {freeSampleUnit}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )})}
              </div>
            </ScrollArea>

            <SheetFooter className="p-4 sm:p-6 border-t border-border mt-auto bg-muted/30">
              <div className="space-y-4 w-full">
                  <div className="flex justify-between items-center text-lg font-semibold">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="text-primary">
                          {cartItems[0]?.currency || 'ZAR'} {getCartTotal().toFixed(2)}
                      </span>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                      <Button onClick={handleCheckout} className="w-full text-lg py-3 bg-primary hover:bg-primary/90 text-primary-foreground">
                          Proceed to Checkout
                      </Button>
                      <Button variant="outline" onClick={clearCart} className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Clear Cart
                      </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                      <Info className="inline h-3 w-3 mr-1" /> Shipping & taxes will be calculated at checkout (Demo).
                  </p>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
