
'use client';

import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Trash2, Plus, Minus, Info, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CartItem } from '@/types';
import { getDisplayPrice } from '@/lib/pricing';

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
  
  const router = useRouter();

  const handleQuantityChange = (item: CartItem, change: number) => {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0) {
      updateQuantity(item.id, newQuantity);
    } else {
      removeFromCart(item.id);
    }
  };

  const handleDirectQuantityInput = (item: CartItem, value: string) => {
    if (value === "") {
      updateQuantity(item.id, 0); // Temporarily allow empty string
      return;
    }
    const newQuantity = parseInt(value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 1) {
      updateQuantity(item.id, newQuantity);
    }
  };
  
  const handleQuantityInputBlur = (item: CartItem) => {
    if (item.quantity === 0) {
      updateQuantity(item.id, 1); // Reset to 1 if left empty
    }
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    router.push('/checkout');
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
          </div>
        </SheetHeader>

        {cartItems.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
              <ShoppingCart className="h-24 w-24 text-muted-foreground/20 mb-6" />
              <p className="text-xl font-semibold text-foreground mb-2">Your cart is empty.</p>
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
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0">
                    <div className="relative h-24 w-24 rounded-md overflow-hidden bg-muted flex-shrink-0 border border-border">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" />
                      ) : (
                        <ShoppingCart className="h-10 w-10 text-muted-foreground/50 m-auto" />
                      )}
                    </div>
                    <div className="flex-grow flex flex-col space-y-2">
                      <div>
                        <h3 className="font-semibold text-md">{item.name}</h3>
                        <p className="text-md font-semibold text-accent mt-1">
                          ZAR {(getDisplayPrice(item.price, 0, item.dispensaryType === 'Product Pool') * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-input rounded-md">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, -1)}><Minus className="h-4 w-4" /></Button>
                          <Input
                            type="text"
                            value={item.quantity > 0 ? item.quantity : ''}
                            onChange={(e) => handleDirectQuantityInput(item, e.target.value)}
                            onBlur={() => handleQuantityInputBlur(item)}
                            className="h-8 w-12 text-center border-none focus-visible:ring-0"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleQuantityChange(item, 1)}><Plus className="h-4 w-4" /></Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>

                      {/* --- Corrected Tweak for THC Product Type --- */}
                      {item.productType === 'THC' && (
                        <div className="flex items-center text-xs text-green-500 pt-1">
                          <Gift className="h-4 w-4 mr-1.5 flex-shrink-0" />
                          <span className="font-medium">
                            {item.quantity} X FREE {item.unit} of {item.originalName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="p-4 sm:p-6 border-t border-border mt-auto bg-muted/30">
              <div className="space-y-4 w-full">
                  <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Subtotal:</span>
                      <span>ZAR {cartItems.reduce((total, item) => total + (getDisplayPrice(item.price, 0, item.dispensaryType === 'Product Pool') * item.quantity), 0).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Button onClick={handleCheckout} className="w-full text-lg py-3 bg-green-600 hover:bg-[#5D4E37] active:bg-green-800 text-white text-lg font-bold py-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">
                        Proceed to Checkout
                    </Button>
                    <Button variant="outline" onClick={clearCart} className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Clear Cart
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center pt-2">
                      <Info className="inline h-3 w-3 mr-1" /> Shipping will be calculated on the next page.
                  </p>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
