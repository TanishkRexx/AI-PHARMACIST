import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Loader2, Package } from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import toast from 'react-hot-toast';

export default function StockUpdateModal({ 
  isOpen, 
  onClose, 
  medicine, 
  onUpdate,
  defaultOperation = 'add' 
}) {
  const [quantity, setQuantity] = useState(10);
  const [operation, setOperation] = useState(defaultOperation);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (operation === 'subtract' && quantity > medicine.stock_quantity) {
      toast.error(`Cannot remove more than current stock (${medicine.stock_quantity})`);
      return;
    }

    setLoading(true);
    try {
      const response = await pharmacyService.updateStock(
        medicine.id,
        quantity,
        operation,
        reason || `Manual ${operation === 'add' ? 'addition' : 'removal'}`
      );
      
      if (response.success) {
        const newStock = operation === 'add' 
          ? medicine.stock_quantity + quantity 
          : medicine.stock_quantity - quantity;
        
        toast.success(
          `Stock ${operation === 'add' ? 'added' : 'removed'}! New stock: ${newStock}`
        );
        
        onUpdate && onUpdate();
        onClose();
      }
    } catch (error) {
      toast.error('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  const quickQuantities = [5, 10, 25, 50, 100];

  const newStock = operation === 'add' 
    ? medicine?.stock_quantity + quantity 
    : Math.max(0, medicine?.stock_quantity - quantity);

  if (!isOpen || !medicine) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Update Stock</h3>
                <p className="text-sm text-gray-500">{medicine.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Current Stock Info */}
          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Current Stock</span>
              <span className="text-2xl font-bold text-gray-800">
                {medicine.stock_quantity}
              </span>
            </div>
            <div className="mt-2 flex justify-between items-center text-sm">
              <span className="text-gray-500">Reorder Level</span>
              <span className="text-gray-600">{medicine.reorder_level}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Operation Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setOperation('add')}
                className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                  operation === 'add'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Plus size={18} />
                Add Stock
              </button>
              <button
                type="button"
                onClick={() => setOperation('subtract')}
                className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                  operation === 'subtract'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Minus size={18} />
                Remove Stock
              </button>
            </div>

            {/* Quantity Input */}
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-2 block">Quantity</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition"
                >
                  <Minus size={20} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-center text-xl font-bold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Quick Select */}
            <div className="flex gap-2 mb-4">
              {quickQuantities.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    quantity === qty
                      ? 'bg-purple-100 text-purple-600 border border-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>

            {/* Reason Input */}
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-2 block">Reason (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={operation === 'add' ? 'e.g., New shipment received' : 'e.g., Damaged items'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Preview */}
            <div className={`p-4 rounded-xl mb-6 ${
              operation === 'add' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={operation === 'add' ? 'text-green-700' : 'text-red-700'}>
                  New Stock Level
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 line-through text-sm">
                    {medicine.stock_quantity}
                  </span>
                  <span className="text-xl font-bold">→</span>
                  <span className={`text-2xl font-bold ${
                    operation === 'add' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {newStock}
                  </span>
                </div>
              </div>
              {operation === 'subtract' && newStock < medicine.reorder_level && (
                <p className="text-yellow-600 text-sm mt-2">
                  ⚠️ Stock will be below reorder level ({medicine.reorder_level})
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || quantity <= 0}
              className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                operation === 'add'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  {operation === 'add' ? <Plus size={20} /> : <Minus size={20} />}
                  {operation === 'add' ? 'Add' : 'Remove'} {quantity} Units
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}