import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Check,
  Loader2,
  AlertTriangle,
  Package
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { customerService } from '../../api/customerService';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

// ============================================
// ALTERNATIVE CARD COMPONENT
// ============================================
function AlternativeCard({ alternative, quantity, onSwap, loading }) {
  const totalSavings = alternative.savings_per_unit * quantity;

  const getMatchTypeBadge = () => {
    switch (alternative.match_type) {
      case 'generic_equivalent':
        return (
          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
            <Shield size={12} />
            Generic
          </span>
        );
      case 'same_category':
        return (
          <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
            <Package size={12} />
            Similar
          </span>
        );
      case 'ai_similar':
        return (
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
            <Sparkles size={12} />
            AI Match
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-gray-200 rounded-xl p-4 hover:border-green-300 hover:bg-green-50/30 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-semibold text-gray-800 text-sm">{alternative.name}</h4>
            {getMatchTypeBadge()}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-bold text-green-600">₹{alternative.unit_price}</span>
            <span className="text-sm text-gray-400 line-through">₹{alternative.original_price}</span>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
              -{alternative.savings_percentage}%
            </span>
          </div>

          {alternative.why_suggested && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              💡 {alternative.why_suggested}
            </p>
          )}
        </div>

        <button
          onClick={onSwap}
          disabled={loading}
          className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Switch'}
        </button>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
        <span className="text-gray-500">Save ₹{totalSavings.toFixed(2)} total</span>
        <span className="text-green-600 font-medium">₹{(alternative.unit_price * quantity).toFixed(2)}</span>
      </div>
    </motion.div>
  );
}

// ============================================
// CART ITEM COMPONENT
// ============================================
function CartItem({ item, optimization, showOptimization }) {
  const { updateQuantity, removeItem, swapMedicine, undoSwap } = useCart();
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const alternatives = optimization?.alternatives || [];
  const hasAlternatives = alternatives.length > 0;
  const potentialSavings = optimization?.potential_savings || 0;
  const isSwapped = !!item.swapped_from;

  const handleSwap = async (alternativeId) => {
    setSwapping(true);
    await swapMedicine(item.medicine_id, alternativeId);
    setSwapping(false);
    setShowAlternatives(false);
  };

  const handleUndoSwap = async () => {
    await undoSwap(item.medicine_id);
  };

  const handleUpdateQuantity = async (newQty) => {
    if (newQty < 1) {
      await removeItem(item.medicine_id);
    } else {
      await updateQuantity(item.medicine_id, newQty);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-white rounded-2xl shadow-md border overflow-hidden ${
        isSwapped ? 'ring-2 ring-green-400' : ''
      }`}
    >
      {/* Swapped Badge */}
      {isSwapped && (
        <div className="bg-green-50 px-4 py-2 flex items-center justify-between border-b border-green-100">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <Check size={16} />
            <span>Swapped to cheaper alternative!</span>
          </div>
          <button
            onClick={handleUndoSwap}
            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Undo
          </button>
        </div>
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* Medicine Image */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-contain rounded-xl" />
            ) : (
              <span className="text-3xl">💊</span>
            )}
          </div>

          {/* Medicine Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-800">{item.name}</h3>
                <p className="text-sm text-gray-500">{item.brand}</p>
                <p className="text-xs text-gray-400">{item.dosage}</p>
                {item.prescription_required && (
                  <span className="inline-block mt-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                    Rx Required
                  </span>
                )}
              </div>
              <button
                onClick={() => removeItem(item.medicine_id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Quantity & Price */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
                <button
                  onClick={() => handleUpdateQuantity(item.quantity - 1)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Minus size={16} />
                </button>
                <span className="font-semibold text-gray-800 min-w-[1.5rem] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => handleUpdateQuantity(item.quantity + 1)}
                  disabled={item.quantity >= item.available_stock}
                  className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">₹{item.unit_price} × {item.quantity}</p>
                <p className="text-lg font-bold text-gray-800">₹{item.subtotal?.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alternatives Toggle */}
        {hasAlternatives && showOptimization && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:from-green-100 hover:to-emerald-100 transition"
            >
              <div className="flex items-center gap-2">
                <Zap className="text-green-600" size={18} />
                <span className="font-medium text-green-800">
                  Save ₹{potentialSavings.toFixed(2)}
                </span>
                <span className="text-sm text-green-600">
                  ({alternatives.length} option{alternatives.length > 1 ? 's' : ''})
                </span>
              </div>
              {showAlternatives ? (
                <ChevronUp className="text-green-600" size={20} />
              ) : (
                <ChevronDown className="text-green-600" size={20} />
              )}
            </button>

            <AnimatePresence>
              {showAlternatives && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  {alternatives.map((alt) => (
                    <AlternativeCard
                      key={alt.id}
                      alternative={alt}
                      quantity={item.quantity}
                      onSwap={() => handleSwap(alt.id)}
                      loading={swapping}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN CART COMPONENT
// ============================================
export default function Cart() {
  const navigate = useNavigate();
  const { 
    cart, 
    loading: cartLoading, 
    hasSwappedItems,
    applyAllAlternatives,
    undoAllSwaps 
  } = useCart();

  const [optimization, setOptimization] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);

  // Fetch optimization
  const fetchOptimization = async () => {
    try {
      setOptimizing(true);
      const response = await customerService.optimizeCart();
      if (response.success) {
        setOptimization(response.data);
        setShowOptimization(true);
      }
    } catch (error) {
      toast.error('Failed to analyze cart');
    } finally {
      setOptimizing(false);
    }
  };

  // Apply all alternatives
  const handleApplyAll = async (genericOnly = false) => {
    setApplyingAll(true);
    await applyAllAlternatives(genericOnly);
    await fetchOptimization();
    setApplyingAll(false);
  };

  // Undo all swaps
  const handleUndoAll = async () => {
    await undoAllSwaps();
    if (showOptimization) {
      await fetchOptimization();
    }
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/customer/checkout');
  };

  if (cartLoading) return <Loading fullScreen text="Loading cart..." />;

  const requiresPrescription = cart.items?.some(item => item.prescription_required);
  const potentialSavings = optimization?.cart_analysis?.total_potential_savings || 0;
  const itemsWithAlternatives = optimization?.cart_analysis?.items_with_alternatives || 0;

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Shopping Cart</h1>
          <p className="text-sm text-gray-500">
            {cart.total_items} {cart.total_items === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {cart.items?.length > 0 && (
          <button
            onClick={fetchOptimization}
            disabled={optimizing}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {optimizing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            {optimizing ? 'Analyzing...' : 'Find Savings'}
          </button>
        )}
      </div>

      {cart.items?.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={64} />}
          title="Your cart is empty"
          description="Start adding medicines to your cart"
          action={() => navigate('/customer/medicines')}
          actionLabel="Browse Medicines"
        />
      ) : (
        <>
          {/* Savings Banner */}
          {potentialSavings > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <TrendingDown size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Save ₹{potentialSavings.toFixed(2)}!</h3>
                    <p className="text-green-100 text-sm">
                      {itemsWithAlternatives} item{itemsWithAlternatives > 1 ? 's have' : ' has'} cheaper alternatives
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyAll(false)}
                  disabled={applyingAll}
                  className="flex items-center gap-2 px-5 py-2 bg-white text-green-600 rounded-xl font-semibold hover:bg-green-50 transition disabled:opacity-50"
                >
                  {applyingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap size={18} />}
                  {applyingAll ? 'Applying...' : 'Apply All Savings'}
                </button>
              </div>
            </motion.div>
          )}

          {/* Swapped Items Info */}
          {hasSwappedItems && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <Check size={18} />
                <span className="text-sm">
                  {cart.items.filter(i => i.swapped_from).length} item(s) swapped with cheaper alternatives
                </span>
              </div>
              <button
                onClick={handleUndoAll}
                className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
              >
                <RefreshCw size={14} />
                Undo All
              </button>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item, index) => (
                <CartItem
                  key={item.medicine_id}
                  item={item}
                  optimization={optimization?.items?.find(o => o.medicine_id === item.medicine_id)}
                  showOptimization={showOptimization}
                />
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-6 rounded-2xl shadow-md border sticky top-6"
              >
                <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cart.total_items} items)</span>
                    <span className="font-semibold">₹{cart.total_amount?.toFixed(2)}</span>
                  </div>

                  {potentialSavings > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <TrendingDown size={14} />
                        Potential Savings
                      </span>
                      <span>-₹{potentialSavings.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-semibold text-green-600">
                      {cart.total_amount >= 500 ? 'FREE' : '₹40'}
                    </span>
                  </div>

                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="text-xl font-bold text-gray-800">
                      ₹{(cart.total_amount >= 500 ? cart.total_amount : cart.total_amount + 40).toFixed(2)}
                    </span>
                  </div>

                  {potentialSavings > 0 && (
                    <div className="flex justify-between text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                      <span>After optimization</span>
                      <span className="font-semibold">
                        ₹{((cart.total_amount - potentialSavings) + 
                          (cart.total_amount - potentialSavings >= 500 ? 0 : 40)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {requiresPrescription && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                    <p className="text-xs text-orange-700">
                      ⚠️ Some items require prescription upload during checkout
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => navigate('/customer/medicines')}
                  className="w-full mt-3 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Continue Shopping
                </button>

                {cart.total_amount < 500 && (
                  <p className="mt-4 text-xs text-gray-500 text-center">
                    Add ₹{(500 - cart.total_amount).toFixed(2)} more for free delivery
                  </p>
                )}

                {/* Optimization Actions */}
                {showOptimization && optimization && (
                  <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                      <Sparkles size={12} className="text-purple-500" />
                      AI Optimization
                    </p>
                    
                    {optimization.cart_analysis?.items_with_generic_alternatives > 0 && (
                      <button
                        onClick={() => handleApplyAll(true)}
                        disabled={applyingAll}
                        className="w-full py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Shield size={16} />
                        Switch to Generics Only
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}