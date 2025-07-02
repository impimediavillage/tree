
'use client';

import type { Product, CartItem, PriceTier } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getTotalItems: () => number;
  isCartOpen: boolean;
  setIsCartOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'dispensaryTreeCart';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  // Load cart from localStorage on initial mount
  useEffect(() => {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart) as CartItem[];
        // Basic validation: Ensure items have necessary fields
        const validItems = parsedCart.filter(item => item.id && item.name && typeof item.price === 'number' && typeof item.quantity === 'number');
        setCartItems(validItems);
        if (validItems.length !== parsedCart.length) {
          console.warn("Some invalid cart items were removed from localStorage.");
        }
      } catch (error) {
        console.error("Error parsing cart from localStorage:", error);
        localStorage.removeItem(CART_STORAGE_KEY); // Clear corrupted cart
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    const priceTier = product.priceTiers?.[0]; // Assume we're adding the first tier
    if (!priceTier) {
        toast({ title: "Not Available", description: `${product.name} does not have a price set and cannot be added.`, variant: "destructive"});
        return;
    }

    const tierStock = priceTier.quantityInStock ?? product.quantityInStock ?? 0;
    if (tierStock <= 0) {
        toast({ title: "Out of Stock", description: `${product.name} is currently out of stock.`, variant: "destructive"});
        return;
    }
    
    setCartItems(prevItems => {
      // Since UI doesn't support adding different tiers, we find by product.id
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;
        if (newQuantity > existingItem.quantityInStock) {
            toast({ title: "Stock Limit Reached", description: `Cannot add more ${product.name}. Max ${existingItem.quantityInStock} in stock.`, variant: "destructive"});
            return prevItems.map(item =>
                item.id === product.id ? { ...item, quantity: existingItem.quantityInStock } : item
            );
        }
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: newQuantity } : item
        );
      } else {
        const stockForThisTier = priceTier.quantityInStock ?? product.quantityInStock;
        if (quantityToAdd > stockForThisTier) {
            toast({ title: "Stock Limit Reached", description: `Cannot add ${quantityToAdd} of ${product.name}. Only ${stockForThisTier} available. Added max to cart.`, variant: "destructive"});
             const newItem: CartItem = {
                ...product,
                price: priceTier.price,
                unit: priceTier.unit,
                quantity: stockForThisTier,
                imageUrl: product.imageUrls?.[0] ?? product.imageUrl ?? null,
                quantityInStock: stockForThisTier,
            };
            return [...prevItems, newItem];
        }
        const newItem: CartItem = {
            ...product,
            price: priceTier.price,
            unit: priceTier.unit,
            quantity: quantityToAdd,
            imageUrl: product.imageUrls?.[0] ?? product.imageUrl ?? null,
            quantityInStock: stockForThisTier,
        };
        toast({
          title: `Added to Cart!`,
          description: `${newItem.name} has been added to your cart.`,
          variant: "default",
        });
        return [...prevItems, newItem];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    toast({ title: "Item Removed", description: "Product removed from your cart.", variant: "default" });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCartItems(prevItems =>
      prevItems.map(item => {
        if (item.id === productId) {
          if (newQuantity <= 0) {
            // This case should ideally be handled by calling removeFromCart or ensuring input doesn't go below 1
            return null; 
          }
          if (newQuantity > item.quantityInStock) {
            toast({ title: "Stock Limit Reached", description: `Only ${item.quantityInStock} of ${item.name} available. Quantity set to max.`, variant: "destructive"});
            return { ...item, quantity: item.quantityInStock };
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item !== null) as CartItem[] // Filter out nulls if quantity became <= 0
    );
  };

  const clearCart = () => {
    setCartItems([]);
    toast({ title: "Cart Cleared", description: "All items have been removed from your cart.", variant: "default" });
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const toggleCart = () => {
    setIsCartOpen(prev => !prev);
  };

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
        isCartOpen,
        setIsCartOpen,
        toggleCart,
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
