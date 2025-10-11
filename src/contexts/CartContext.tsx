
'use client';

import type { Product, CartItem, PriceTier } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GroupedCart {
  [dispensaryId: string]: {
    dispensaryName: string;
    items: CartItem[];
  };
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, tier: PriceTier, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getTotalItems: () => number;
  getGroupedCart: () => GroupedCart;
  isCartOpen: boolean;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleCart: () => void;
  loadCart: (items: CartItem[]) => void;
  loading: boolean; // Added loading state
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'dispensaryTreeCart';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true); // Initialize loading state
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      try {
        setCartItems(JSON.parse(storedCart));
      } catch (error) {
        console.error("Error parsing cart from localStorage:", error);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    }
    setLoading(false); // Set loading to false after cart is loaded
  }, []);

  useEffect(() => {
    if (!loading) { // Only write to localStorage if not in initial loading phase
      if (cartItems.length > 0) {
          localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
    }
  }, [cartItems, loading]);

  const loadCart = useCallback((items: CartItem[]) => {
      if (Array.isArray(items)) {
        setCartItems(items);
      }
  }, []);

  const addToCart = (product: Product, tier: PriceTier, quantityToAdd: number = 1) => {
    if (!tier || typeof tier.price !== 'number') {
      toast({ title: "Not Available", description: "This product tier cannot be added to the cart.", variant: "destructive"});
      return;
    }

    const tierStock = tier.quantityInStock ?? 999;
    if (tierStock <= 0) {
      toast({ title: "Out of Stock", description: "This item is currently out of stock.", variant: "destructive"});
      return;
    }

    const cartItemId = `${product.id}-${tier.unit}`;

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.id === cartItemId);
      let newItems = [...prevItems];

      if (existingItemIndex > -1) {
        const existingItem = newItems[existingItemIndex];
        const newQuantity = existingItem.quantity + quantityToAdd;

        if (newQuantity > (existingItem.quantityInStock ?? 999)) {
          toast({ title: "Stock Limit Exceeded", description: `You can\'t add more of this item.`, variant: "destructive" });
          return newItems;
        }

        newItems[existingItemIndex] = { ...existingItem, quantity: newQuantity };
        toast({ title: "Cart Updated", description: `${product.name} quantity increased to ${newQuantity}.` });

      } else {
        const quantity = Math.min(quantityToAdd, tierStock);

        const newItem: CartItem = {
          id: cartItemId,
          productId: product.id as string,
          name: product.name,
          description: product.description,
          price: tier.price,
          unit: tier.unit,
          quantity: quantity,
          quantityInStock: tierStock,
          imageUrl: product.imageUrl ?? undefined,
          category: product.category, 
          dispensaryId: product.dispensaryId,
          dispensaryName: product.dispensaryName,
          dispensaryType: product.dispensaryType,
          productOwnerEmail: product.productOwnerEmail,
          weight: tier.weightKgs, 
          length: tier.lengthCm, 
          width: tier.widthCm,   
          height: tier.heightCm,  
        };

        newItems.push(newItem);
        toast({ title: "Added to Cart", description: `${product.name} (${tier.unit}) has been added.` });
      }
      
      return newItems;
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== cartItemId));
    toast({ title: "Item Removed", description: "The item has been removed from your cart." });
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    setCartItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === cartItemId) {
          if (newQuantity <= 0) {
            return null;
          }
          if (newQuantity > (item.quantityInStock ?? 999)){
            toast({ title: "Stock Limit Exceeded", variant: "destructive" });
            return { ...item, quantity: item.quantityInStock ?? 999 };
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const clearCart = () => {
    setCartItems([]);
    toast({ title: "Cart Cleared", description: "Your cart is now empty." });
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const getGroupedCart = (): GroupedCart => {
    return cartItems.reduce((acc, item) => {
      const { dispensaryId, dispensaryName } = item;
      if (!dispensaryId) return acc;

      if (!acc[dispensaryId]) {
        acc[dispensaryId] = {
          dispensaryName: dispensaryName || 'Unknown Dispensary',
          items: [],
        };
      }
      acc[dispensaryId].items.push(item);
      return acc;
    }, {} as GroupedCart);
  };

  const toggleCart = () => setIsCartOpen(prev => !prev);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getTotalItems,
        getGroupedCart,
        isCartOpen,
        setIsCartOpen,
        toggleCart,
        loadCart,
        loading, // Expose loading state
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
