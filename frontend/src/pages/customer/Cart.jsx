import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/common/EmptyState';
import toast from 'react-hot-toast';

export default function Cart() {
  const navigate = useNavigate();
  const { cart, loading, updateQuantity, removeItem } = useCart();

  const handleUpdateQuantity = async (medicineId, newQty) => {
    if (newQty < 1) {
      await removeItem(medicineId);
    } else {
      await updateQuantity(medicineId, newQty);
    }
  };

  const handleRemove = async (medicineId) => {
    if (window.confirm('Remove this item from cart?')) {
      await removeItem(medicineId);
    }
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/customer/checkout');
  };

  if (loading) return <Loading fullScreen text="Loading cart..." />;

  const requiresPrescription = cart.items?.some(item => item.prescription_required);

  return (
    <div className="space-y-8 p-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Shopping Cart</h1>
        <p className="text-sm text-gray-500">
          {cart.total_items} {cart.total_items === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      {cart.items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={64} />}
          title="Your cart is empty"
          description="Start adding medicines to your cart"
          action={() => navigate('/customer/medicines')}
          actionLabel="Browse Medicines"
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item, index) => (
              <motion.div
                key={item.medicine_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-5 rounded-2xl shadow-md border"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <div className="text-3xl">💊</div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-800">{item.name}</h3>
                        <p className="text-sm text-gray-600">{item.brand}</p>
                        <p className="text-xs text-gray-500">{item.dosage}</p>
                        {item.prescription_required && (
                          <span className="inline-block mt-1 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                            Prescription Required
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(item.medicine_id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.medicine_id, item.quantity - 1)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-semibold text-gray-800 min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.medicine_id, item.quantity + 1)}
                          disabled={item.quantity >= item.available_stock}
                          className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          ₹{item.unit_price} × {item.quantity}
                        </p>
                        <p className="text-lg font-bold text-gray-800">
                          ₹{item.subtotal}
                        </p>
                      </div>
                    </div>

                    {item.quantity > item.available_stock && (
                      <p className="mt-2 text-xs text-red-600">
                        Only {item.available_stock} available in stock
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

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
                  <span className="font-semibold">₹{cart.total_amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Charges</span>
                  <span className="font-semibold text-green-600">
                    {cart.total_amount >= 500 ? 'FREE' : '₹40'}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-xl font-bold text-gray-800">
                    ₹{cart.total_amount >= 500 ? cart.total_amount : cart.total_amount + 40}
                  </span>
                </div>
              </div>

              {requiresPrescription && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
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
                  Add ₹{500 - cart.total_amount} more for free delivery
                </p>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}