import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Loader2, Package, AlertTriangle } from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import SearchableSelect from '../../components/common/SearchableSelect';
import AddNewMedicineModal from '../../components/pharmacy/AddNewMedicineModal';
import toast from 'react-hot-toast';

export default function CreateProcurement() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = location.state?.preselected || [];

  const [items, setItems] = useState(
    preselected.length > 0 
      ? preselected.map(p => ({ 
          medicine_id: p.medicine_id, 
          quantity: p.quantity,
          medicine: null // Will be populated when medicines load
        })) 
      : [{ medicine_id: '', quantity: 0, medicine: null }]
  );
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMedicines, setLoadingMedicines] = useState(true);
  const [notes, setNotes] = useState('');
  
  // Add New Medicine Modal
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState('');
  const [addToItemIndex, setAddToItemIndex] = useState(null);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoadingMedicines(true);
      // Load ALL medicines (increase limit)
      const response = await pharmacyService.getInventory({ limit: 500, page: 1 });
      if (response.success) {
        setMedicines(response.data.medicines);
        
        // Populate preselected items with medicine data
        if (preselected.length > 0) {
          setItems(prev => prev.map(item => {
            const medicine = response.data.medicines.find(m => m.id === item.medicine_id);
            return { ...item, medicine };
          }));
        }
      }
    } catch (error) {
      toast.error('Failed to load medicines');
    } finally {
      setLoadingMedicines(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { medicine_id: '', quantity: 0, medicine: null }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleMedicineSelect = (index, medicineId, medicineData) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      medicine_id: medicineId,
      medicine: medicineData,
      // Auto-suggest quantity based on reorder level
      quantity: updated[index].quantity || (medicineData?.reorder_level * 2 || 50)
    };
    setItems(updated);
  };

  const handleQuantityChange = (index, quantity) => {
    const updated = [...items];
    updated[index].quantity = Math.max(1, parseInt(quantity) || 0);
    setItems(updated);
  };

  const handleAddNewMedicine = (searchTerm, itemIndex) => {
    setNewMedicineName(searchTerm);
    setAddToItemIndex(itemIndex);
    setShowAddMedicineModal(true);
  };

  const handleMedicineAdded = (newMedicine) => {
    // Add to medicines list
    setMedicines(prev => [...prev, newMedicine]);
    
    // Auto-select in the item
    if (addToItemIndex !== null) {
      handleMedicineSelect(addToItemIndex, newMedicine.id, newMedicine);
    }
    
    setAddToItemIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const validItems = items.filter(item => item.medicine_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item with valid quantity');
      return;
    }

    // Check for duplicates
    const medicineIds = validItems.map(item => item.medicine_id);
    if (new Set(medicineIds).size !== medicineIds.length) {
      toast.error('Duplicate medicines found. Please remove duplicates.');
      return;
    }

    setLoading(true);
    try {
      const orderItems = validItems.map(item => ({
        medicine_id: item.medicine_id,
        quantity: item.quantity
      }));

      const response = await pharmacyService.createProcurementOrder(orderItems, notes);
      if (response.success) {
        toast.success('Procurement order created!');
        navigate('/pharmacy/procurement');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const getItemCost = (item) => {
    if (!item.medicine || !item.quantity) return 0;
    // Wholesale cost (70% of retail)
    return item.medicine.unit_price * 0.7 * item.quantity;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + getItemCost(item), 0);
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  // Check if any selected medicine is not in stock
  const hasNewMedicines = items.some(item => item.medicine && item.medicine.stock_quantity === 0);

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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Create Procurement Order</h1>
              <p className="text-sm text-gray-500">Order medicines from your distributor</p>
            </div>
            {hasNewMedicines && (
              <span className="px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full flex items-center gap-1">
                <Package size={14} />
                New medicines will be added
              </span>
            )}
          </div>
          
          {/* Items */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                <div className="flex gap-4 items-start">
                  {/* Medicine Select */}
                  <div className="flex-1">
                    <label className="text-sm text-gray-600 mb-2 block">Medicine *</label>
                    {loadingMedicines ? (
                      <div className="h-12 bg-gray-200 animate-pulse rounded-xl" />
                    ) : (
                      <SearchableSelect
                        options={medicines}
                        value={item.medicine_id}
                        onChange={(id, medicine) => handleMedicineSelect(index, id, medicine)}
                        placeholder="Search or select medicine..."
                        displayKey="name"
                        valueKey="id"
                        onAddNew={(searchTerm) => handleAddNewMedicine(searchTerm, index)}
                        addNewLabel="Add New Medicine"
                      />
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-32">
                    <label className="text-sm text-gray-600 mb-2 block">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Cost */}
                  <div className="w-32">
                    <label className="text-sm text-gray-600 mb-2 block">Cost</label>
                    <div className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800">
                      ₹{getItemCost(item).toFixed(2)}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="pt-8">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {/* Stock Info */}
                {item.medicine && (
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.medicine.stock_quantity === 0 
                        ? 'bg-red-100 text-red-600' 
                        : item.medicine.stock_quantity <= item.medicine.reorder_level
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      Current Stock: {item.medicine.stock_quantity}
                    </span>
                    <span className="text-gray-500">
                      Reorder Level: {item.medicine.reorder_level}
                    </span>
                    <span className="text-gray-500">
                      Retail Price: ₹{item.medicine.unit_price}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="mt-4 flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-50 transition"
          >
            <Plus size={18} />
            Add Another Item
          </button>

          {/* Notes */}
          <div className="mt-6">
            <label className="text-sm text-gray-600 mb-2 block">Notes (Optional)</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Any special instructions for this order..."
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-md border">
          <h2 className="font-bold text-gray-800 mb-4">Order Summary</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Items</span>
              <span className="font-medium">{items.filter(i => i.medicine_id).length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Units</span>
              <span className="font-medium">
                {items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal (Wholesale)</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (5%)</span>
              <span className="font-medium">₹{tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-purple-600">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Warning for low items */}
          {items.some(i => i.medicine && i.quantity < i.medicine.reorder_level) && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
              <AlertTriangle size={18} className="text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-700">
                Some items have order quantity below reorder level. Consider ordering more.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/pharmacy/procurement')}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || items.filter(i => i.medicine_id && i.quantity > 0).length === 0}
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
      </form>

      {/* Add New Medicine Modal */}
      <AddNewMedicineModal
        isOpen={showAddMedicineModal}
        onClose={() => {
          setShowAddMedicineModal(false);
          setNewMedicineName('');
          setAddToItemIndex(null);
        }}
        onMedicineAdded={handleMedicineAdded}
        initialName={newMedicineName}
      />
    </div>
  );
}