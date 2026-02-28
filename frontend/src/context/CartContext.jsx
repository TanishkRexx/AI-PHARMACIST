import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { customerService } from '../api/customerService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [cart, setCart] = useState({ 
    items: [], 
    total_items: 0, 
    total_amount: 0,
    has_savings_available: false,
    potential_savings: 0,
    items_with_alternatives: 0
  });
  const [loading, setLoading] = useState(false);
  
  // Track if we have swapped items
  const [hasSwappedItems, setHasSwappedItems] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'customer') {
      loadCart();
    } else {
      setCart({ 
        items: [], 
        total_items: 0, 
        total_amount: 0,
        has_savings_available: false,
        potential_savings: 0,
        items_with_alternatives: 0
      });
      setHasSwappedItems(false);
    }
  }, [isAuthenticated, user]);

  // Update hasSwappedItems when cart changes
  useEffect(() => {
    const swapped = cart.items?.some(item => item.swapped_from);
    setHasSwappedItems(swapped);
  }, [cart.items]);

  const loadCart = useCallback(async (includeAlternatives = false) => {
    try {
      setLoading(true);
      const response = await customerService.getCart(includeAlternatives);
      if (response.success) {
        setCart(response.data);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Alias for loadCart - used by price optimization components
  const refreshCart = useCallback(async () => {
    await loadCart();
  }, [loadCart]);

  const addToCart = useCallback(async (medicineId, quantity = 1) => {
    try {
      const response = await customerService.addToCart(medicineId, quantity);
      if (response.success) {
        await loadCart();
        
        // Check if cheaper alternative is available and show hint
        const cheaperAlt = response.data?.cheaper_alternative;
        if (cheaperAlt?.available) {
          toast.success(
            <div>
              <p className="font-medium">Added to cart!</p>
              <p className="text-sm text-green-600 mt-1">
                💡 {cheaperAlt.message}
              </p>
            </div>,
            { 
              duration: 4000,
              style: {
                maxWidth: '400px'
              }
            }
          );
        } else {
          toast.success(response.message || 'Added to cart!');
        }
        
        return { 
          success: true, 
          data: response.data,
          hasCheaperAlternative: cheaperAlt?.available || false
        };
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
        setCart({ 
          items: [], 
          total_items: 0, 
          total_amount: 0,
          has_savings_available: false,
          potential_savings: 0,
          items_with_alternatives: 0
        });
        toast.success('Cart cleared');
        return { success: true };
      }
    } catch (error) {
      toast.error('Failed to clear cart');
      return { success: false };
    }
  }, []);

  // ============================================
  // PRICE OPTIMIZATION FUNCTIONS
  // ============================================

  /**
   * Swap a medicine in cart with a cheaper alternative
   */
  const swapMedicine = useCallback(async (originalMedicineId, alternativeMedicineId) => {
    try {
      const response = await customerService.swapMedicine(originalMedicineId, alternativeMedicineId);
      if (response.success) {
        await loadCart();
        toast.success(
          <div>
            <p className="font-medium">💰 Switched to cheaper option!</p>
            <p className="text-sm text-green-600">
              Saved ₹{response.data?.savings?.toFixed(2) || '0'}
            </p>
          </div>,
          { duration: 3000 }
        );
        return { success: true, data: response.data };
      }
      return { success: false };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to swap medicine';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [loadCart]);

  /**
   * Undo a medicine swap - restore original medicine
   */
  const undoSwap = useCallback(async (medicineId) => {
    try {
      const response = await customerService.undoSwap(medicineId);
      if (response.success) {
        await loadCart();
        toast.success(response.message || 'Restored original medicine');
        return { success: true, data: response.data };
      }
      return { success: false };
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to undo swap';
      toast.error(message);
      return { success: false, error: message };
    }
  }, [loadCart]);

  /**
   * Apply all best alternatives at once
   */
  const applyAllAlternatives = useCallback(async (genericOnly = false) => {
    try {
      const response = await customerService.applyAllAlternatives(genericOnly);
      if (response.success) {
        await loadCart();
        const { swaps_applied, total_savings } = response.data || {};
        if (swaps_applied > 0) {
          toast.success(
            <div>
              <p className="font-medium">🎉 Optimized your cart!</p>
              <p className="text-sm text-green-600">
                {swaps_applied} item(s) swapped, saved ₹{total_savings?.toFixed(2) || '0'}
              </p>
            </div>,
            { duration: 4000 }
          );
        } else {
          toast.success('Your cart is already optimized!');
        }
        return { success: true, data: response.data };
      }
      return { success: false };
    } catch (error) {
      toast.error('Failed to apply alternatives');
      return { success: false };
    }
  }, [loadCart]);

  /**
   * Undo all swaps - restore all original medicines
   */
  const undoAllSwaps = useCallback(async () => {
    try {
      const response = await customerService.undoAllSwaps();
      if (response.success) {
        await loadCart();
        const { restored_count } = response.data || {};
        toast.success(`Restored ${restored_count || 'all'} original item(s)`);
        return { success: true, data: response.data };
      }
      return { success: false };
    } catch (error) {
      toast.error('Failed to undo swaps');
      return { success: false };
    }
  }, [loadCart]);

  /**
   * Get quick savings summary (lightweight)
   */
  const getSavingsSummary = useCallback(async () => {
    try {
      const response = await customerService.getSavingsSummary();
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to get savings summary:', error);
      return { success: false };
    }
  }, []);

  /**
   * Get full cart optimization
   */
  const getOptimization = useCallback(async (options = {}) => {
    try {
      const response = await customerService.optimizeCart(options);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to get optimization:', error);
      return { success: false };
    }
  }, []);

  // ============================================
  // COMPUTED VALUES
  // ============================================
  
  const getItemQuantity = useCallback((medicineId) => {
    const item = cart.items?.find(i => i.medicine_id === medicineId);
    return item?.quantity || 0;
  }, [cart.items]);

  const isInCart = useCallback((medicineId) => {
    return cart.items?.some(i => i.medicine_id === medicineId);
  }, [cart.items]);

  const value = {
    // Cart state
    cart,
    loading,
    hasSwappedItems,
    
    // Basic cart operations
    loadCart,
    refreshCart,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    
    // Price optimization operations
    swapMedicine,
    undoSwap,
    applyAllAlternatives,
    undoAllSwaps,
    getSavingsSummary,
    getOptimization,
    
    // Computed values
    itemCount: cart.total_items,
    totalAmount: cart.total_amount,
    hasSavings: cart.has_savings_available || false,
    potentialSavings: cart.potential_savings || 0,
    itemsWithAlternatives: cart.items_with_alternatives || 0,
    
    // Helper functions
    getItemQuantity,
    isInCart
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