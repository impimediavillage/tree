
'use client';

import type { Product, CartItem, PriceTier } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface GroupedCart {
  [dispensaryId: string]: {
    dispensaryName: string;
    items: CartItem[];
  };
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, tier: PriceTier, quantity?: number, overrideImageUrl?: string) => void;
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
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage", error);
      setCartItems([]);
    }
    setLoading(false);
  }, []);

  const saveCart = useCallback((items: CartItem[]) => {
    try {
      const filteredItems = items.filter(item => item.quantity > 0);
      setCartItems(filteredItems);
      localStorage.setItem('cart', JSON.stringify(filteredItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage", error);
    }
  }, []);

  const addToCart = (product: Product, tier: PriceTier, quantity = 1, overrideImageUrl?: string) => {
    const isThcProduct = product.productType === 'THC';
    const cartItemId = `${product.id}-${tier.unit}`;
    const existingItemIndex = cartItems.findIndex(item => item.id === cartItemId);

    let newCartItems = [...cartItems];

    if (existingItemIndex > -1) {
      newCartItems[existingItemIndex].quantity += quantity;
      if (isThcProduct && overrideImageUrl) {
          newCartItems[existingItemIndex].imageUrl = overrideImageUrl;
      }
    } else {
      const newItem: CartItem = {
        id: cartItemId,
        productId: product.id || '',
        name: isThcProduct ? 'Triple S Design Pack with free gift.' : product.name,
        originalName: isThcProduct ? product.name : undefined,
        description: product.description || '',
        category: product.category,
        strain: product.strain,
        price: tier.price,
        quantity: quantity,
        dispensaryId: product.dispensaryId,
        dispensaryName: product.dispensaryName,
        dispensaryType: product.dispensaryType,
        productOwnerEmail: product.productOwnerEmail,
        currency: product.currency,
        unit: tier.unit,
        quantityInStock: tier.quantityInStock ?? 0,
        imageUrl: isThcProduct && overrideImageUrl ? overrideImageUrl : (product.imageUrls?.[0] || '/placeholder.svg'),
        productType: product.productType, 
        // Default dimensions for shipping if not provided: small package (10cm x 10cm x 5cm, 0.1kg)
        weight: tier.weightKgs ?? 0.1,
        length: tier.lengthCm ?? 10,
        width: tier.widthCm ?? 10,
        height: tier.heightCm ?? 5,
      };
      newCartItems.push(newItem);
    }

    saveCart(newCartItems);
    toast({
      title: isThcProduct ? 'Design Pack Added' : 'Item Added',
      description: isThcProduct
        ? `${product.name} (${tier.unit}) design pack added to cart.`
        : `${product.name} has been added to your cart.`,
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId: string) => {
    const newCart = cartItems.filter(item => item.id !== cartItemId);
    saveCart(newCart);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    const newCart = cartItems.map(item =>
      item.id === cartItemId ? { ...item, quantity: newQuantity } : item
    );
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getGroupedCart = (): GroupedCart => {
    return cartItems.reduce((acc, item) => {
      const { dispensaryId, dispensaryName } = item;
      if (!acc[dispensaryId]) {
        acc[dispensaryId] = { dispensaryName, items: [] };
      }
      acc[dispensaryId].items.push(item);
      return acc;
    }, {} as GroupedCart);
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const loadCart = (items: CartItem[]) => {
    saveCart(items);
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getTotalItems, getGroupedCart, isCartOpen, setIsCartOpen, toggleCart, loadCart, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
