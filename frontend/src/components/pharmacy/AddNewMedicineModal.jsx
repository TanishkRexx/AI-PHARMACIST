import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2, Package } from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import toast from 'react-hot-toast';

export default function AddNewMedicineModal({
  isOpen,
  onClose,
  onMedicineAdded,
  initialName = ''
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: initialName,
    generic_name: '',
    brand: '',
    category: 'other',
    dosage: '',
    unit_price: '',
    stock_quantity: 0,
    reorder_level: 50,
    prescription_required: false,
    manufacturer: '',
    description: ''
  });
  const [errors, setErrors] = useState({});

  const categories = [
    { value: 'painkiller', label: 'Painkiller' },
    { value: 'antibiotic', label: 'Antibiotic' },
    { value: 'antidiabetic', label: 'Antidiabetic' },
    { value: 'cardiovascular', label: 'Cardiovascular' },
    { value: 'respiratory', label: 'Respiratory' },
    { value: 'gastrointestinal', label: 'Gastrointestinal' },
    { value: 'vitamin', label: 'Vitamin' },
    { value: 'dermatological', label: 'Dermatological' },
    { value: 'other', label: 'Other' }
  ];

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.generic_name.trim()) newErrors.generic_name = 'Generic name is required';
    if (!form.brand.trim()) newErrors.brand = 'Brand is required';
    if (!form.dosage.trim()) newErrors.dosage = 'Dosage is required';
    if (!form.unit_price || parseFloat(form.unit_price) <= 0) newErrors.unit_price = 'Valid price required';
    if (!form.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...form,
        unit_price: parseFloat(form.unit_price),
        stock_quantity: parseInt(form.stock_quantity) || 0,
        reorder_level: parseInt(form.reorder_level) || 50,
        contraindications: [],
        drug_interactions: [],
        side_effects: []
      };

      const response = await pharmacyService.addMedicine(payload);
      
      if (response.success) {
        toast.success('Medicine added successfully!');
        
        // Return the new medicine data
        const newMedicine = {
          id: response.data.id,
          ...payload
        };
        
        onMedicineAdded && onMedicineAdded(newMedicine);
        onClose();
        
        // Reset form
        setForm({
          name: '',
          generic_name: '',
          brand: '',
          category: 'other',
          dosage: '',
          unit_price: '',
          stock_quantity: 0,
          reorder_level: 50,
          prescription_required: false,
          manufacturer: '',
          description: ''
        });
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to add medicine';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Add New Medicine</h3>
                <p className="text-sm text-gray-500">Add a medicine that's not in inventory</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Medicine Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g., Paracetamol 500mg"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Generic Name */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Generic Name *</label>
                <input
                  type="text"
                  value={form.generic_name}
                  onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                    errors.generic_name ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g., Paracetamol"
                />
                {errors.generic_name && <p className="text-red-500 text-xs mt-1">{errors.generic_name}</p>}
              </div>

              {/* Brand */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Brand *</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                    errors.brand ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g., Crocin"
                />
                {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Dosage */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Dosage *</label>
                <input
                  type="text"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                    errors.dosage ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g., 500mg"
                />
                {errors.dosage && <p className="text-red-500 text-xs mt-1">{errors.dosage}</p>}
              </div>

              {/* Manufacturer */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Manufacturer *</label>
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                    errors.manufacturer ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="e.g., GSK"
                />
                {errors.manufacturer && <p className="text-red-500 text-xs mt-1">{errors.manufacturer}</p>}
              </div>

              {/* Unit Price */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Unit Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 ${
                    errors.unit_price ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="0.00"
                />
                {errors.unit_price && <p className="text-red-500 text-xs mt-1">{errors.unit_price}</p>}
              </div>

              {/* Reorder Level */}
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Reorder Level</label>
                <input
                  type="number"
                  min="0"
                  value={form.reorder_level}
                  onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                  placeholder="50"
                />
              </div>
            </div>

            {/* Prescription Required */}
            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.prescription_required}
                  onChange={(e) => setForm({ ...form, prescription_required: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Prescription Required</span>
              </label>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-700">
                💡 <strong>Note:</strong> This medicine will be added to your inventory with 0 stock. 
                The procurement order will add the ordered quantity.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition"
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
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Add Medicine
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}