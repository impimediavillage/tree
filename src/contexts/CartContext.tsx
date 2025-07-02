'use client';

import type { Product, CartItem, PriceTier } from '@/types';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, tier: PriceTier, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
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
        const validItems = parsedCart.filter(item => item.id && item.productId && item.name && typeof item.price === 'number' && typeof item.quantity === 'number');
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

  const addToCart = (product: Product, tier: PriceTier, quantityToAdd: number = 1) => {
    if (!tier || tier.price === undefined) {
      setTimeout(() => toast({ title: "Not Available", description: `${product.name} does not have a price set and cannot be added.`, variant: "destructive"}), 0);
      return;
    }

    const tierStock = tier.quantityInStock ?? 0;
    if (tierStock <= 0) {
      setTimeout(() => toast({ title: "Out of Stock", description: `${product.name} (${tier.unit}) is currently out of stock.`, variant: "destructive"}), 0);
      return;
    }

    const cartItemId = `${product.id}-${tier.unit}`;
    
    setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === cartItemId);

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantityToAdd;
          if (newQuantity > existingItem.quantityInStock) {
            setTimeout(() => toast({ title: "Stock Limit Reached", description: `Cannot add more ${product.name} (${tier.unit}). Max ${existingItem.quantityInStock} in stock.`, variant: "destructive"}), 0);
            return prevItems.map(item =>
              item.id === cartItemId ? { ...item, quantity: existingItem.quantityInStock } : item
            );
          } else {
            setTimeout(() => toast({ title: "Cart Updated", description: `${product.name} quantity increased to ${newQuantity}.`, variant: "default" }), 0);
            return prevItems.map(item =>
              item.id === cartItemId ? { ...item, quantity: newQuantity } : item
            );
          }
        } else {
          let finalQuantityToAdd = quantityToAdd;
          let toastMessage: { title: string; description: string; variant: 'default' | 'destructive' } | null = null;
          if (quantityToAdd > tierStock) {
            finalQuantityToAdd = tierStock;
            toastMessage = { title: "Stock Limit Reached", description: `Cannot add ${quantityToAdd} of ${product.name} (${tier.unit}). Only ${tierStock} available. Added max to cart.`, variant: "destructive"};
          }

          const newItem: CartItem = {
            id: cartItemId,
            productId: product.id!,
            name: product.name,
            description: product.description,
            category: product.category,
            strain: product.strain,
            dispensaryId: product.dispensaryId,
            dispensaryName: product.dispensaryName,
            currency: product.currency,
            price: tier.price,
            unit: tier.unit,
            quantity: finalQuantityToAdd,
            quantityInStock: tierStock,
            imageUrl: product.imageUrls?.[0] ?? product.imageUrl ?? null,
          };
          if (!toastMessage) {
              toastMessage = { title: `Added to Cart!`, description: `${newItem.name} (${newItem.unit}) has been added to your cart.`, variant: "default" };
          }
          setTimeout(() => toast(toastMessage!), 0);
          return [...prevItems, newItem];
        }
    });
  };
  
  const removeFromCart = (cartItemId: string) => {
    let itemToRemoveName = '';

    setCartItems(prevItems => {
        const itemToRemove = prevItems.find(item => item.id === cartItemId);
        if (itemToRemove) {
          itemToRemoveName = `${itemToRemove.name} (${itemToRemove.unit})`;
        }
        return prevItems.filter(item => item.id !== cartItemId);
    });

    if(itemToRemoveName) {
      setTimeout(() => toast({ title: "Item Removed", description: `${itemToRemoveName} removed from your cart.`, variant: "default" }), 0);
    }
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    setCartItems(prevItems => {
        const itemToUpdate = prevItems.find(item => item.id === cartItemId);
        if (!itemToUpdate) {
            console.warn(`Item with id ${cartItemId} not found in cart to update.`);
            return prevItems;
        }

        if (newQuantity <= 0) {
            setTimeout(() => toast({ title: "Item Removed", description: `${itemToUpdate.name} (${itemToUpdate.unit}) removed from cart.`, variant: "default"}), 0);
            return prevItems.filter(item => item.id !== cartItemId);
        }
        
        if (newQuantity > itemToUpdate.quantityInStock) {
            setTimeout(() => toast({ title: "Stock Limit Reached", description: `Only ${itemToUpdate.quantityInStock} of ${itemToUpdate.name} (${itemToUpdate.unit}) available.`, variant: "destructive" }), 0);
            return prevItems.map(item =>
                item.id === cartItemId ? { ...item, quantity: itemToUpdate.quantityInStock } : item
            );
        }
        
        return prevItems.map(item =>
            item.id === cartItemId ? { ...item, quantity: newQuantity } : item
        );
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setTimeout(() => toast({ title: "Cart Cleared", description: "All items have been removed from your cart.", variant: "default" }), 0);
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
