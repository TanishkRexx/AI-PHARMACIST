import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Search } from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import toast from 'react-hot-toast';

export default function CreateProcurement() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = location.state?.preselected || [];

  const [items, setItems] = useState(preselected.length > 0 ? preselected : [{ medicine_id: '', quantity: 0 }]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setSearchLoading(true);
      const response = await pharmacyService.getInventory({ limit: 100 });
      if (response.success) {
        setMedicines(response.data.medicines);
      }
    } catch (error) {
      toast.error('Failed to load medicines');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { medicine_id: '', quantity: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validItems = items.filter(item => item.medicine_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      const response = await pharmacyService.createProcurementOrder(validItems, notes);
      if (response.success) {
        toast.success('Procurement order created!');
        navigate('/pharmacy/procurement');
      }
    } catch (error) {
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const getMedicine = (id) => medicines.find(m => m.id === id);

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const med = getMedicine(item.medicine_id);
      if (med) {
        return sum + (med.unit_price * 0.7 * item.quantity);
      }
      return sum;
    }, 0);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/pharmacy/procurement')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Procurement
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Create Procurement Order</h1>
          
          {/* Items */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex-1">
                  <label className="text-sm text-gray-600 mb-1 block">Medicine</label>
                  <select
                    value={item.medicine_id}
                    onChange={(e) => handleItemChange(index, 'medicine_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    required
                  >
                    <option value="">Select Medicine</option>
                    {medicines.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.name} - {med.stock_quantity} in stock
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-32">
                  <label className="text-sm text-gray-600 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                    required
                  />
                </div>

                {item.medicine_id && (
                  <div className="w-32">
                    <label className="text-sm text-gray-600 mb-1 block">Cost</label>
                    <p className="px-4 py-3 bg-white border rounded-xl font-semibold">
                      ₹{(getMedicine(item.medicine_id)?.unit_price * 0.7 * item.quantity).toFixed(0)}
                    </p>
                  </div>
                )}

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-50 transition"
          >
            <Plus size={18} />
            Add Item
          </button>

          {/* Notes */}
          <div className="mt-6">
            <label className="text-sm text-gray-600 mb-1 block">Notes (Optional)</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
              placeholder="Any special instructions..."
            />
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Items</span>
              <span>{items.filter(i => i.medicine_id).length}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Tax (5%)</span>
              <span>₹{(calculateTotal() * 0.05).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{(calculateTotal() * 1.05).toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/pharmacy/procurement')}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Create Order
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}