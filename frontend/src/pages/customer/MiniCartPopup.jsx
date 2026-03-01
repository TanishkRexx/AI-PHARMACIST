import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";

export default function MiniCartPopup({ isOpen, onClose }) {
  const { cart } = useCart();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute right-24 top-32 w-80 bg-white border rounded-xl shadow-xl z-50 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={16} />
              Cart Items
            </h3>
            <button
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>

          {cart?.items?.length === 0 ? (
            <p className="text-sm text-gray-500">Your cart is empty</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {cart.items.map((item) => (
                <div
                  key={item.medicine_id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity}
                    </p>
                  </div>

                  <p className="text-sm font-bold text-blue-600">
                    ₹{item.subtotal}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate("/customer/cart")}
            className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            View Full Cart
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}