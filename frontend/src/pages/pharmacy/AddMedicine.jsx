import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { pharmacyService } from '../../api/pharmacyService';
import toast from 'react-hot-toast';

export default function AddMedicine() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    generic_name: '',
    brand: '',
    category: 'painkiller',
    dosage: '',
    unit_price: '',
    stock_quantity: '',
    reorder_level: 50,
    prescription_required: false,
    description: '',
    manufacturer: '',
    contraindications: '',
    drug_interactions: '',
    side_effects: ''
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
    if (!form.stock_quantity || parseInt(form.stock_quantity) < 0) newErrors.stock_quantity = 'Valid stock required';
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
        stock_quantity: parseInt(form.stock_quantity),
        reorder_level: parseInt(form.reorder_level),
        contraindications: form.contraindications.split(',').map(s => s.trim()).filter(Boolean),
        drug_interactions: form.drug_interactions.split(',').map(s => s.trim()).filter(Boolean),
        side_effects: form.side_effects.split(',').map(s => s.trim()).filter(Boolean)
      };

      const response = await pharmacyService.addMedicine(payload);
      if (response.success) {
        toast.success('Medicine added successfully!');
        navigate('/pharmacy/inventory');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to add medicine';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/pharmacy/inventory')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Inventory
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Add New Medicine</h1>
        <p className="text-sm text-gray-500">Fill in the details to add a new medicine to inventory</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Medicine Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., Paracetamol 500mg"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Generic Name *</label>
              <input
                type="text"
                value={form.generic_name}
                onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl ${errors.generic_name ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., Paracetamol"
              />
              {errors.generic_name && <p className="text-red-500 text-xs mt-1">{errors.generic_name}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Brand *</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl ${errors.brand ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., Crocin"
              />
              {errors.brand && <p className="text-red-500 text-xs mt-1">{errors.brand}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Dosage *</label>
              <input
                type="text"
                value={form.dosage}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl ${errors.dosage ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., 500mg"
              />
              {errors.dosage && <p className="text-red-500 text-xs mt-1">{errors.dosage}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Manufacturer *</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl ${errors.manufacturer ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="e.g., GSK"
              />
              {errors.manufacturer && <p className="text-red-500 text-xs mt-1">{errors.manufacturer}</p>}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4">Pricing & Stock</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Unit Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl ${errors.unit_price ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="0.00"
              />
              {errors.unit_price && <p className="text-red-500 text-xs mt-1">{errors.unit_price}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Initial Stock *</label>
              <input
                type="number"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                className={`w-full px-4 py-3 border rounded-xl ${errors.stock_quantity ? 'border-red-300' : 'border-gray-200'}`}
                placeholder="0"
              />
              {errors.stock_quantity && <p className="text-red-500 text-xs mt-1">{errors.stock_quantity}</p>}
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Reorder Level</label>
              <input
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                placeholder="50"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.prescription_required}
                onChange={(e) => setForm({ ...form, prescription_required: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <span className="text-sm text-gray-700">Prescription Required</span>
            </label>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-md border"
        >
          <h2 className="font-bold text-gray-800 mb-4">Safety Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Description</label>
              <textarea
                rows="2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                placeholder="Medicine description..."
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Contraindications (comma separated)</label>
              <input
                type="text"
                value={form.contraindications}
                onChange={(e) => setForm({ ...form, contraindications: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                placeholder="e.g., Liver disease, Pregnancy"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Drug Interactions (comma separated)</label>
              <input
                type="text"
                value={form.drug_interactions}
                onChange={(e) => setForm({ ...form, drug_interactions: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                placeholder="e.g., Warfarin, Alcohol"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1 block">Side Effects (comma separated)</label>
              <input
                type="text"
                value={form.side_effects}
                onChange={(e) => setForm({ ...form, side_effects: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                placeholder="e.g., Nausea, Drowsiness"
              />
            </div>
          </div>
        </motion.div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/pharmacy/inventory')}
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
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Add Medicine
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}