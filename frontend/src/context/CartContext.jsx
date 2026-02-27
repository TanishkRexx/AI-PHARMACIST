import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { customerService } from '../api/customerService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState({ items: [], total_items: 0, total_amount: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'customer') {
      loadCart();
    } else {
      setCart({ items: [], total_items: 0, total_amount: 0 });
    }
  }, [isAuthenticated, user]);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerService.getCart();
      if (response.success) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (medicineId, quantity = 1) => {
    try {
      const response = await customerService.addToCart(medicineId, quantity);
      if (response.success) {
        await loadCart();
        toast.success(response.message || 'Added to cart!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to add to cart';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [loadCart]);

  const updateQuantity = useCallback(async (medicineId, quantity) => {
    try {
      const response = await customerService.updateCartItem(medicineId, quantity);
      if (response.success) {
        await loadCart();
        return { success: true };
      }
    } catch (error) {
      toast.error('Failed to update cart');
      return { success: false };
    }
  }, [loadCart]);

  const removeItem = useCallback(async (medicineId) => {
    try {
      const response = await customerService.removeFromCart(medicineId);
      if (response.success) {
        await loadCart();
        toast.success('Item removed');
        return { success: true };
      }
    } catch (error) {
      toast.error('Failed to remove item');
      return { success: false };
    }
  }, [loadCart]);

  const clearCart = useCallback(async () => {
    try {
      const response = await customerService.clearCart();
      if (response.success) {
        setCart({ items: [], total_items: 0, total_amount: 0 });
        toast.success('Cart cleared');
        return { success: true };
      }
    } catch (error) {
      toast.error('Failed to clear cart');
      return { success: false };
    }
  }, []);

  const value = {
    cart,
    loading,
    loadCart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount: cart.total_items,
    totalAmount: cart.total_amount
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}